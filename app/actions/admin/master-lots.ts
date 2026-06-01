"use server";

import { logError } from "@/lib/logger";
import { fetchAirtable } from "@/lib/airtable";
import { AIRTABLE_TABLE } from "@/lib/airtable-schema";
import { calculateLotCostBasis, daysBetween } from "@/lib/cost-calc";
import { seoulDateString } from "@/lib/date";
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
  origin: string;
  stockQty: number;
  /** 현재 재고 총중량(kg) = 박스당 무게(총중량/입고박스) × 재고수량 */
  stockWeight: number;
  storageName: string;
  status: string;
  statusReason: string;
  firstInboundDate: string;
  /** 보관일수 (최초입고일~오늘) — 오래 묵은 재고(회전 느린 LOT) 식별용 */
  daysHeld: number;
  /** 박스당 수매가(매입가, 원). 판매원가에서 이걸 빼면 누적 보관비 */
  purchasePrice: number;
  /** 박스당 판매원가(오늘 기준 누적, 원). 비용 미입력이면 0 — admin 화면 전용 노출 */
  costPerBox: number;
  /** 현재 재고 평가액(원) = 박스당 판매원가 × 재고수량 */
  valuation: number;
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
  asOfDate: string,
): Lot {
  const f = rec.fields ?? {};
  const str = (v: unknown) =>
    Array.isArray(v) ? String(v[0] ?? "").trim() : String(v ?? "").trim();
  const num = (v: unknown) => Number(Array.isArray(v) ? v[0] : v) || 0;
  const storageId = firstLinkId(f["보관처"]);
  const stockQty = num(f["재고수량"]);
  const inboxQty = num(f["입고수량(BOX)"]);
  const totalWeight = num(f["총중량"]); // 입고 기준 총중량(규격 × 입고박스)
  // 현재 재고 총중량 = 박스당 무게 × 현재 재고수량 (입고박스/총중량 둘 다 있을 때)
  const stockWeight =
    inboxQty > 0 && totalWeight > 0
      ? Math.round((totalWeight / inboxQty) * Math.max(0, stockQty))
      : 0;

  // 박스당 판매원가(오늘 기준) — LOT 상세 비용 카드와 동일 로직(calculateLotCostBasis) 재사용.
  const basis = calculateLotCostBasis({
    purchasePrice: num(f["수매가"]),
    refrigerationFeePerUnit: num(f["냉장료단가"]),
    inOutFee: num(f["입출고비"]),
    unionFee: num(f["노조비"]),
    freezeFee: num(f["동결비"]),
    carriedRefrigeration: num(f["이월냉장료"]),
    carriedInOutFee: num(f["이월입출고비"]),
    carriedUnionFee: num(f["이월노조비"]),
    carriedFreezeFee: num(f["이월동결비"]),
    inboxQty,
    inboundDate: str(f["이동입고일"]) || str(f["최초입고일"]),
    asOfDate,
  });
  const costPerBox = basis.totalPerBox;

  return {
    id: rec.id,
    lotNumber: str(f["LOT번호"]),
    productName: str(f["품목명"]),
    spec: str(f["규격표시"]) || str(f["규격"]),
    misu: str(f["상세규격_표기"]) || str(f["미수"]),
    origin: str(f["원산지"]),
    stockQty,
    stockWeight,
    storageName: storageId ? (storageMap[storageId] ?? "") : "",
    status: str(f["상태"]),
    statusReason: str(f["상태사유"]),
    firstInboundDate: str(f["최초입고일"]),
    daysHeld: daysBetween(str(f["최초입고일"]), asOfDate),
    purchasePrice: basis.purchasePerBox,
    costPerBox,
    valuation: Math.round(costPerBox * Math.max(0, stockQty)),
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
    const asOfDate = seoulDateString();
    const lots: Lot[] = lotsRaw.map((rec) => parseLot(rec, storageMap, asOfDate));
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
