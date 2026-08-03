"use server";

import { revalidatePath } from "next/cache";
import { logError } from "@/lib/logger";
import {
  fetchAirtable,
  createAirtableRecord,
  patchAirtableRecord,
} from "@/lib/airtable";
import { AIRTABLE_TABLE } from "@/lib/airtable-schema";
import { STORAGE_KINDS, type StorageKind } from "@/lib/storage-kinds";
import { ensureAdmin, ensureWorker, type Result } from "./_master-helpers";

/**
 * 보관처 마스터 (Phase 3 PC 관리 화면용) 서버 액션.
 * 2필드: 보관처명 + 구분(자사창고/외부창고/가공공장) — 2026-07-28 '기타' 폐지·구분 필수.
 * 구분은 입출고증 발행 주체 분기(isOwnStorage) 기준 — 2026-05-19 신설.
 *
 * 주의: 'use server' 파일은 async function만 export 가능. STORAGE_KINDS·StorageKind는
 * 'use server' 아닌 lib/storage-kinds.ts에서 import해 client에서도 직접 쓸 수 있게.
 */

const TABLE_PATH = encodeURIComponent(AIRTABLE_TABLE.storageMaster);
const TAG = "master-storage";

export type Storage = {
  id: string;
  name: string;
  kind: StorageKind | "";
};

export type StorageInput = {
  name: string;
  kind?: StorageKind | "";
};

/**
 * 보관처의 **오늘 기준 적용 중인** 보관 경비 1행.
 *
 * `보관처 비용 이력`은 적용기간별로 쌓이는 이력이라 한 보관처에 여러 행이 있을 수 있다.
 * 화면(보관처 마스터)은 "지금 얼마짜리냐"만 보여주므로 유효 행 하나로 접어서 내려준다.
 *
 * ⚠ 동결비는 단일 필드가 없다. 라이브 테이블은 박스종류별 3열(팬/베이트大/베이트小)뿐이라
 *   합치지 않고 그대로 내려준다(합치면 어느 박스 단가인지 잃는다).
 */
export type StorageCost = {
  inOutFee: number | null;
  freezeFeePan: number | null;
  freezeFeeBaitLarge: number | null;
  freezeFeeBaitSmall: number | null;
  unionFee: number | null;
  refrigerationFee: number | null;
  startDate: string; // 빈값 = 시작일 미지정(항상 적용)
  endDate: string; // 빈값 = 현재 적용 중
};

function parseStorage(rec: { id: string; fields?: Record<string, unknown> }): Storage {
  const f = rec.fields ?? {};
  const rawKind = String(f["구분"] ?? "").trim();
  return {
    id: rec.id,
    name: String(f["보관처명"] ?? "").trim(),
    kind: (STORAGE_KINDS as readonly string[]).includes(rawKind)
      ? (rawKind as StorageKind)
      : "",
  };
}

function buildFields(input: StorageInput): Record<string, unknown> {
  const fields: Record<string, unknown> = { 보관처명: input.name.trim() };
  if (input.kind) fields["구분"] = input.kind;
  return fields;
}

/**
 * 보관처 목록 — 읽기 전용이라 WORKER도 허용한다(2026-08-03).
 * 작업 정산 폼의 작업장·행선지 콤보가 쓴다. 생성·수정·비용 이력은 ADMIN 이상 유지.
 */
export async function listStorages(
  adminWorkerId: string,
): Promise<Result<Storage[]>> {
  const auth = await ensureWorker(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    const items: Storage[] = [];
    let offset: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      const data = (await fetchAirtable(`${TABLE_PATH}?${params}`)) as {
        records?: { id: string; fields?: Record<string, unknown> }[];
        offset?: string;
      };
      for (const rec of data.records ?? []) items.push(parseStorage(rec));
      offset = data.offset;
    } while (offset);
    return { success: true, data: items };
  } catch (e) {
    logError(`[${TAG}] 조회 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** YYYY-MM-DD (KST 오늘). */
function seoulToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

/**
 * 보관처명 → 오늘 적용 중인 보관 경비.
 *
 * 유효 판정은 **lib/storage-cost.ts:getStorageCostForLot와 같은 규칙**을 쓴다.
 *   적용시작일이 비었거나 <= 오늘  AND  적용종료일이 비었거나 >= 오늘
 * 원가 계산 엔진과 화면이 다른 행을 고르면 "화면엔 있는데 원가엔 안 잡힌다"가 된다.
 *
 * ⚠ 이력 테이블은 보관처를 **이름 문자열**로만 참조한다(`보관처 링크` 필드는 83행 전부 비어 있음).
 *   이름이 어긋나면 조용히 못 찾는다 — 2026-07-28에 8건을 맞췄다. 링크 전환은 별도 과제.
 */
export async function listCurrentStorageCosts(
  adminWorkerId: string,
): Promise<Result<Record<string, StorageCost>>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  const today = seoulToday();
  try {
    const rows: { name: string; cost: StorageCost }[] = [];
    let offset: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      const data = (await fetchAirtable(
        `${encodeURIComponent(AIRTABLE_TABLE.storageCostHistory)}?${params}`,
      )) as {
        records?: { id: string; fields?: Record<string, unknown> }[];
        offset?: string;
      };
      for (const rec of data.records ?? []) {
        const f = rec.fields ?? {};
        const name = String(f["보관처명"] ?? "").trim();
        if (!name) continue;
        const startDate = String(f["적용시작일"] ?? "").trim();
        const endDate = String(f["적용종료일"] ?? "").trim();
        if (startDate && startDate > today) continue;
        if (endDate && endDate < today) continue;
        rows.push({
          name,
          cost: {
            inOutFee: num(f["입출고비"]),
            freezeFeePan: num(f["동결비 (팬)"]),
            freezeFeeBaitLarge: num(f["동결비 (베이트大)"]),
            freezeFeeBaitSmall: num(f["동결비 (베이트小)"]),
            unionFee: num(f["노조비"]),
            refrigerationFee: num(f["냉장료"]),
            startDate,
            endDate,
          },
        });
      }
      offset = data.offset;
    } while (offset);

    // 같은 보관처에 유효 행이 여럿이면 적용시작일이 가장 늦은 것(= 최신 단가)을 택한다.
    const byName: Record<string, StorageCost> = {};
    for (const { name, cost } of rows) {
      const prev = byName[name];
      if (!prev || (cost.startDate || "") > (prev.startDate || "")) byName[name] = cost;
    }
    return { success: true, data: byName };
  } catch (e) {
    logError(`[${TAG}] 보관 경비 조회 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

export async function createStorage(
  adminWorkerId: string,
  input: StorageInput,
): Promise<Result<{ id: string }>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  if (!input.name?.trim()) return { success: false, error: "보관처명은 필수입니다." };

  try {
    const { id } = await createAirtableRecord(TABLE_PATH, buildFields(input));
    revalidatePath("/admin/master/storage");
    return { success: true, data: { id } };
  } catch (e) {
    logError(`[${TAG}] 생성 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "생성 실패" };
  }
}

export async function updateStorage(
  adminWorkerId: string,
  id: string,
  input: StorageInput,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  if (!input.name?.trim()) return { success: false, error: "보관처명은 필수입니다." };

  try {
    await patchAirtableRecord(TABLE_PATH, id, buildFields(input));
    revalidatePath("/admin/master/storage");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 수정 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "수정 실패" };
  }
}

export async function deleteStorage(
  adminWorkerId: string,
  id: string,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    await fetchAirtable(`${TABLE_PATH}/${id}`, { method: "DELETE" });
    revalidatePath("/admin/master/storage");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 삭제 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "삭제 실패" };
  }
}
