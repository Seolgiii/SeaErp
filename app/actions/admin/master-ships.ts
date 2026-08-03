"use server";

import { revalidatePath } from "next/cache";
import { logError } from "@/lib/logger";
import {
  fetchAirtable,
  createAirtableRecord,
  patchAirtableRecord,
} from "@/lib/airtable";
import { AIRTABLE_TABLE } from "@/lib/airtable-schema";
import { ensureAdmin, ensureWorker, type Result } from "./_master-helpers";

/**
 * 선박 정보 마스터 (Phase 3 PC 관리 화면용) 서버 액션.
 * 입고관리.선박명(자유 텍스트)의 참고용 마스터.
 *
 * 어업종류는 Airtable singleSelect로 정의되어 있으나 현재 옵션 0개라
 * 폼에서 일단 제외. dogfooding 후 옵션 정해지면 활성화.
 */

const TABLE_PATH = encodeURIComponent(AIRTABLE_TABLE.ships);
const TAG = "master-ships";

export type Ship = {
  id: string;
  name: string;
  company: string;
  captain: string;
  licenseNo: string;
  homePort: string;
  phone: string;
  email: string;
  memo: string;
};

export type ShipInput = {
  name: string;
  company?: string;
  captain?: string;
  licenseNo?: string;
  homePort?: string;
  phone?: string;
  email?: string;
  memo?: string;
};

function parseShip(rec: { id: string; fields?: Record<string, unknown> }): Ship {
  const f = rec.fields ?? {};
  const str = (v: unknown) => String(v ?? "").trim();
  return {
    id: rec.id,
    name: str(f["선박명"]),
    company: str(f["선박회사명"]),
    captain: str(f["선장명"]),
    licenseNo: str(f["어업허가번호"]),
    homePort: str(f["선적항"]),
    phone: str(f["연락처"]),
    email: str(f["이메일"]),
    memo: str(f["비고"]),
  };
}

function buildFields(input: ShipInput): Record<string, unknown> {
  const fields: Record<string, unknown> = { 선박명: input.name.trim() };
  if (input.company?.trim()) fields["선박회사명"] = input.company.trim();
  if (input.captain?.trim()) fields["선장명"] = input.captain.trim();
  if (input.licenseNo?.trim()) fields["어업허가번호"] = input.licenseNo.trim();
  if (input.homePort?.trim()) fields["선적항"] = input.homePort.trim();
  if (input.phone?.trim()) fields["연락처"] = input.phone.trim();
  if (input.email?.trim()) fields["이메일"] = input.email.trim();
  if (input.memo?.trim()) fields["비고"] = input.memo.trim();
  return fields;
}

/**
 * 선박 목록 — 읽기 전용이라 WORKER도 허용한다(2026-08-03).
 * 작업 정산 폼의 선박명 콤보가 쓴다. 생성·수정은 ADMIN 이상 유지.
 */
export async function listShips(adminWorkerId: string): Promise<Result<Ship[]>> {
  const auth = await ensureWorker(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    const items: Ship[] = [];
    let offset: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      const data = (await fetchAirtable(`${TABLE_PATH}?${params}`)) as {
        records?: { id: string; fields?: Record<string, unknown> }[];
        offset?: string;
      };
      for (const rec of data.records ?? []) items.push(parseShip(rec));
      offset = data.offset;
    } while (offset);
    return { success: true, data: items };
  } catch (e) {
    logError(`[${TAG}] 조회 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

export async function createShip(
  adminWorkerId: string,
  input: ShipInput,
): Promise<Result<{ id: string }>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  if (!input.name?.trim()) return { success: false, error: "선박명은 필수입니다." };

  try {
    const { id } = await createAirtableRecord(TABLE_PATH, buildFields(input));
    revalidatePath("/admin/master/ships");
    return { success: true, data: { id } };
  } catch (e) {
    logError(`[${TAG}] 생성 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "생성 실패" };
  }
}

export async function updateShip(
  adminWorkerId: string,
  id: string,
  input: ShipInput,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  if (!input.name?.trim()) return { success: false, error: "선박명은 필수입니다." };

  try {
    await patchAirtableRecord(TABLE_PATH, id, buildFields(input));
    revalidatePath("/admin/master/ships");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 수정 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "수정 실패" };
  }
}

export async function deleteShip(
  adminWorkerId: string,
  id: string,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    await fetchAirtable(`${TABLE_PATH}/${id}`, { method: "DELETE" });
    revalidatePath("/admin/master/ships");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 삭제 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "삭제 실패" };
  }
}
