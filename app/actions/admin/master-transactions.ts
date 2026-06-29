"use server";

import { fetchAirtable } from "@/lib/airtable";
import { AIRTABLE_TABLE } from "@/lib/airtable-schema";
import { logError } from "@/lib/logger";
import { ensureAdmin, type Result } from "./_master-helpers";

/**
 * 거래 이력 챕터 server action — 입고 이력 (개별 거래 원장, read-only).
 *
 * 원가·손익(집계)과 달리 개별 입고 건을 그대로 나열한다(원장/감사 로그 성격).
 *  - 상태 무관 전체 조회(승인 완료/대기/반려) — 필터·검색·합계는 화면에서 처리.
 *  - 재고 이동/기존 재고로 생성된 입고도 포함(실제 일어난 거래이므로). 비고로 식별 가능.
 *
 * link 필드(매입처·품목·보관처·매입자)는 마스터 이름 map으로 resolve.
 * getMyRequests는 최근 14일치만 가져오므로 기간 조회엔 Airtable 직접 조회.
 */

const TAG = "master-transactions";

const num = (v: unknown) => Number(Array.isArray(v) ? v[0] : v) || 0;
const str = (v: unknown) =>
  Array.isArray(v) ? String(v[0] ?? "").trim() : String(v ?? "").trim();

/** link 필드(record id 배열)의 첫 id. */
const firstId = (v: unknown): string =>
  Array.isArray(v) && typeof v[0] === "string" ? v[0] : "";

/** YYYY-MM-DD를 deltaDays 만큼 이동(UTC 기준 — 날짜 산술만 필요). */
function shiftDate(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

/**
 * 한 테이블을 날짜 범위로 페이지네이션 조회 (상태 무관, 원장용).
 * filterByFormula로 날짜만 1차 거르고(payload 축소), 정확도는 코드에서 재필터.
 */
async function fetchInRange(
  table: string,
  dateField: string,
  from: string,
  to: string,
): Promise<{ id: string; fields: Record<string, unknown> }[]> {
  const path = encodeURIComponent(table);
  const fromMinus1 = shiftDate(from, -1);
  const toPlus1 = shiftDate(to, 1);
  const formula = `AND(IS_AFTER({${dateField}}, DATETIME_PARSE("${fromMinus1}", "YYYY-MM-DD")), IS_BEFORE({${dateField}}, DATETIME_PARSE("${toPlus1}", "YYYY-MM-DD")))`;

  const items: { id: string; fields: Record<string, unknown> }[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    params.set("filterByFormula", formula);
    if (offset) params.set("offset", offset);
    const data = (await fetchAirtable(`${path}?${params}`)) as {
      records?: { id: string; fields?: Record<string, unknown> }[];
      offset?: string;
    };
    for (const rec of data.records ?? [])
      items.push({ id: rec.id, fields: rec.fields ?? {} });
    offset = data.offset;
  } while (offset);
  return items;
}

/** 마스터 테이블 record id → 이름 map (매입처명·품목명·보관처명·작업자명 resolve용). */
async function fetchNameMap(
  table: string,
  nameField: string,
): Promise<Map<string, string>> {
  const path = encodeURIComponent(table);
  const map = new Map<string, string>();
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    params.append("fields[]", nameField);
    if (offset) params.set("offset", offset);
    const data = (await fetchAirtable(`${path}?${params}`)) as {
      records?: { id: string; fields?: Record<string, unknown> }[];
      offset?: string;
    };
    for (const rec of data.records ?? [])
      map.set(rec.id, String(rec.fields?.[nameField] ?? "").trim());
    offset = data.offset;
  } while (offset);
  return map;
}

export type InboundHistoryRow = {
  id: string;
  date: string; // YYYY-MM-DD
  lotNumber: string;
  product: string;
  spec: string;
  misu: string;
  origin: string;
  qty: number; // 입고수량 (박스)
  purchasePrice: number; // 박스당 수매가
  purchaseTotal: number; // 수매가 × 수량
  supplier: string;
  shipName: string;
  storage: string;
  purchaser: string; // 매입자
  worker: string; // 입고 작업자(입고 신청·등록한 작업자)
  approvalStatus: string;
  memo: string;
  pdfUrl: string;
};

export type InboundHistory = {
  from: string;
  to: string;
  rows: InboundHistoryRow[]; // 입고일 내림차순
  totals: {
    count: number;
    qty: number;
    purchaseTotal: number;
    /** 승인상태별 건수 (화면 필터 칩 카운트용) */
    byStatus: Record<string, number>;
  };
};

/**
 * 기간 입고 이력 조회 — 상태 무관 전체, 개별 건 원장.
 * @param from YYYY-MM-DD (포함)
 * @param to   YYYY-MM-DD (포함)
 */
export async function getInboundHistory(
  adminWorkerId: string,
  from: string,
  to: string,
): Promise<Result<InboundHistory>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { success: false, error: "기간 형식이 올바르지 않습니다 (YYYY-MM-DD)." };
  }
  if (from > to) [from, to] = [to, from];

  try {
    const [inbounds, supplierNames, productNames, storageNames, workerNames] =
      await Promise.all([
        fetchInRange(AIRTABLE_TABLE.inbound, "입고일", from, to),
        fetchNameMap(AIRTABLE_TABLE.suppliers, "매입처명"),
        fetchNameMap(AIRTABLE_TABLE.products, "품목명"),
        fetchNameMap(AIRTABLE_TABLE.storageMaster, "보관처명"),
        fetchNameMap(AIRTABLE_TABLE.workers, "작업자명"),
      ]);

    const rows: InboundHistoryRow[] = [];
    const byStatus: Record<string, number> = {};
    let qtyTotal = 0;
    let purchaseTotalSum = 0;

    for (const r of inbounds) {
      const f = r.fields;
      const date = (str(f["입고일"]) || str(f["입고일자"]) || "").slice(0, 10);
      if (!date || date < from || date > to) continue;

      const qty = num(f["입고수량"]) || num(f["입고수량(BOX)"]);
      const purchasePrice = num(f["수매가"]);
      const purchaseTotal = purchasePrice * qty;
      // 품목명 lookup(배열) 우선, 없으면 품목마스터 link resolve.
      const product =
        str(f["품목명"]) || productNames.get(firstId(f["품목마스터"])) || "(미상)";
      const supplier = supplierNames.get(firstId(f["매입처"])) || "";
      const storage = storageNames.get(firstId(f["보관처"])) || str(f["보관처"]);
      const purchaser = workerNames.get(firstId(f["매입자"])) || "";
      const worker = workerNames.get(firstId(f["작업자"])) || "";
      const approvalStatus = str(f["승인상태"]) || "(미상)";

      byStatus[approvalStatus] = (byStatus[approvalStatus] ?? 0) + 1;
      qtyTotal += qty;
      purchaseTotalSum += purchaseTotal;

      rows.push({
        id: r.id,
        date,
        lotNumber: str(f["LOT번호"]),
        product,
        spec: str(f["규격"]),
        misu: str(f["미수"]),
        origin: str(f["원산지"]),
        qty,
        purchasePrice,
        purchaseTotal,
        supplier,
        shipName: str(f["선박명"]),
        storage,
        purchaser,
        worker,
        approvalStatus,
        memo: str(f["비고"]),
        pdfUrl: str(f["입고증URL"]),
      });
    }

    // 입고일 내림차순(최신 먼저), 같은 날짜는 LOT번호 보조 정렬.
    rows.sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.lotNumber.localeCompare(a.lotNumber),
    );

    return {
      success: true,
      data: {
        from,
        to,
        rows,
        totals: {
          count: rows.length,
          qty: qtyTotal,
          purchaseTotal: purchaseTotalSum,
          byStatus,
        },
      },
    };
  } catch (e) {
    logError(`[${TAG}] 입고 이력 조회 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}
