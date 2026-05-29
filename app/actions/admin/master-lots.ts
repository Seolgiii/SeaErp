"use server";

import { logError } from "@/lib/logger";
import { fetchAirtable } from "@/lib/airtable";
import { AIRTABLE_TABLE } from "@/lib/airtable-schema";
import { ensureAdmin, type Result } from "./_master-helpers";

/**
 * LOT별 재고 마스터 (Phase 3 PC 관리 화면용) 서버 액션 — **read-only**.
 *
 * LOT은 입고 승인 시 자동 생성. Admin 직접 생성 거의 없음. 1차 dogfooding은 조회만.
 * 편집 필요성이 실 사용에서 확인되면 후속 추가 (사용자 결정).
 *
 * 보관처는 link 필드(record ID)라 보관처 마스터를 별도 fetch해 이름 join.
 */

const TABLE_PATH = encodeURIComponent(AIRTABLE_TABLE.lots);
const STORAGE_PATH = encodeURIComponent(AIRTABLE_TABLE.storageMaster);
const TAG = "master-lots";

export type Lot = {
  id: string;
  lotNumber: string;
  productName: string;
  spec: string;
  misu: string;
  stockQty: number;
  storageName: string;
  status: string;
  statusReason: string;
  firstInboundDate: string;
};

function firstLinkId(val: unknown): string | null {
  if (Array.isArray(val) && val.length > 0) {
    const s = String(val[0] ?? "").trim();
    if (/^rec[a-zA-Z0-9]+$/.test(s)) return s;
  }
  return null;
}

function parseLot(
  rec: { id: string; fields?: Record<string, unknown> },
  storageMap: Record<string, string>,
): Lot {
  const f = rec.fields ?? {};
  const str = (v: unknown) =>
    Array.isArray(v) ? String(v[0] ?? "").trim() : String(v ?? "").trim();
  const storageId = firstLinkId(f["보관처"]);
  return {
    id: rec.id,
    lotNumber: str(f["LOT번호"]),
    productName: str(f["품목명"]),
    spec: str(f["규격표시"]) || str(f["규격"]),
    misu: str(f["상세규격_표기"]) || str(f["미수"]),
    stockQty: Number(Array.isArray(f["재고수량"]) ? f["재고수량"][0] : f["재고수량"]) || 0,
    storageName: storageId ? (storageMap[storageId] ?? "") : "",
    status: str(f["상태"]),
    statusReason: str(f["상태사유"]),
    firstInboundDate: str(f["최초입고일"]),
  };
}

/** 보관처 record ID → 보관처명 맵 (5분 캐시). */
async function fetchStorageNameMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const data = (await fetchAirtable(
    `${STORAGE_PATH}?fields[]=${encodeURIComponent("보관처명")}&pageSize=100`,
    { next: { revalidate: 300 } },
  )) as { records?: { id: string; fields?: Record<string, unknown> }[] };
  for (const rec of data.records ?? []) {
    map[rec.id] = String(rec.fields?.["보관처명"] ?? "");
  }
  return map;
}

export async function listLots(adminWorkerId: string): Promise<Result<Lot[]>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    // LOT 페이지네이션 + 보관처명 맵을 병렬로
    const [lotsRaw, storageMap] = await Promise.all([
      fetchAllLots(),
      fetchStorageNameMap(),
    ]);
    const lots: Lot[] = lotsRaw.map((rec) => parseLot(rec, storageMap));
    return { success: true, data: lots };
  } catch (e) {
    logError(`[${TAG}] 조회 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

async function fetchAllLots(): Promise<
  { id: string; fields?: Record<string, unknown> }[]
> {
  const items: { id: string; fields?: Record<string, unknown> }[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    const data = (await fetchAirtable(`${TABLE_PATH}?${params}`)) as {
      records?: { id: string; fields?: Record<string, unknown> }[];
      offset?: string;
    };
    for (const rec of data.records ?? []) items.push(rec);
    offset = data.offset;
  } while (offset);
  return items;
}
