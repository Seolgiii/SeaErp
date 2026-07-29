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
  /** 박스당 수매가(매입가, 원). 재고원가에서 이걸 빼면 누적 보관비 */
  purchasePrice: number;
  /** 박스당 재고원가(오늘 기준 누적, 원). 비용 미입력이면 0 — admin 화면 전용 노출 */
  costPerBox: number;
  /** 현재 재고 평가액(원) = 박스당 재고원가 × 재고수량 */
  valuation: number;
  /** 비고(메모) — 운영 표기(라벨 색상·재포장·구물·상환 메모 등). admin 화면 노출용 */
  memo: string;
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

  // 박스당 재고원가(오늘 기준) — LOT 상세 비용 카드와 동일 로직(calculateLotCostBasis) 재사용.
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
    memo: str(f["비고"]),
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

/**
 * 조회 범위 — **서버에서 거른다.**
 *
 * 예전엔 전량을 받아 화면에서 걸렀다. 소진 LOT은 출고가 끝나도 영구히 남으므로 시간이
 * 갈수록 매 조회가 무거워진다(2026-07-29 시점 ~200건, 월 10~20건 증가).
 * 재고 조회는 활성만 필요하므로 애초에 활성만 받아온다.
 *
 * · active   재고수량 > 0 — 재고 조회(운영). 재고장 인쇄 대상.
 * · depleted 재고수량 = 0 — 소진 LOT(이력). **소진뿐 아니라 반려·취소도 여기 들어온다**
 *            (반려·취소는 soft delete로 재고수량 0이 된다). 어느 화면에도 안 나오는
 *            LOT이 생기지 않게 하려는 것 — 이상 상태는 그 화면의 경고 배너가 잡는다.
 * · all      전량 — 재고 집계는 소진 포함 토글이 있어 둘 다 필요하다.
 */
export type LotScope = "active" | "depleted" | "all";

/** Airtable formula. 빈 재고수량은 Airtable에서 0으로 비교되므로 depleted에 포함된다. */
const SCOPE_FORMULA: Record<LotScope, string | null> = {
  active: "{재고수량}>0",
  depleted: "{재고수량}=0",
  all: null,
};

export async function listLots(
  adminWorkerId: string,
  scope: LotScope = "all",
): Promise<Result<Lot[]>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    // LOT 페이지네이션 + 보관처명 맵을 병렬로
    const [lotsRaw, storageMap] = await Promise.all([
      fetchAllLots(SCOPE_FORMULA[scope]),
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

async function fetchAllLots(
  formula: string | null,
): Promise<{ id: string; fields?: Record<string, unknown> }[]> {
  const items: { id: string; fields?: Record<string, unknown> }[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (formula) params.set("filterByFormula", formula);
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
