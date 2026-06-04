"use server";

import { fetchAirtable } from "@/lib/airtable";
import { AIRTABLE_TABLE } from "@/lib/airtable-schema";
import { logError } from "@/lib/logger";
import { ensureAdmin, type Result } from "./_master-helpers";

/**
 * 원가·손익 챕터 server action — 손익 추이 (집계·분석 전용, read-only).
 *
 * 손익을 두 층으로 제공:
 *  1. 매출총이익(매칭 COGS) — 출고 승인 시 스냅샷된 "출고시점 손익"(= 판매금액 − 출고시점 판매원가)을
 *     기간 집계. 매출과 원가가 LOT 단위로 매칭된 진짜 마진.
 *  2. 현금흐름 추정 — 출고 판매금액 − 입고 수매가 − 지출 (daily-report와 동일 공식, 기간 확장).
 *     매출·원가가 기간 매칭되진 않지만 현금 입출 흐름을 보여줌.
 *
 * getMyRequests는 최근 14일치만 가져오므로(기간 손익엔 부적합) Airtable을 날짜 범위로 직접 조회한다.
 * 일별 버킷으로 반환하고 주/월 집계·정렬은 화면에서 처리.
 */

const TAG = "master-cost";

const num = (v: unknown) => Number(Array.isArray(v) ? v[0] : v) || 0;
const str = (v: unknown) =>
  Array.isArray(v) ? String(v[0] ?? "").trim() : String(v ?? "").trim();

/** YYYY-MM-DD를 deltaDays 만큼 이동(UTC 기준 — 날짜 산술만 필요). */
function shiftDate(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

export type ProfitDayBucket = {
  date: string; // YYYY-MM-DD
  // ── 매출총이익(매칭 COGS) ──
  revenue: number; // Σ 판매금액 (승인 완료 출고 전체)
  cogs: number; // Σ 출고시점 판매원가 (원가 기록된 출고만)
  grossProfit: number; // Σ 출고시점 손익 (원가 기록된 출고만)
  marginRevenue: number; // 원가 기록된 출고의 매출 합 (마진율 분모)
  outboundQty: number; // Σ 출고요청수량
  outboundCount: number;
  costMissingCount: number; // 출고시점 판매원가 미기록 건수
  // ── 현금흐름 ──
  purchaseTotal: number; // Σ 수매가 × 입고수량 (재고 이동/기존 재고 제외)
  inboundQty: number;
  inboundCount: number;
  expenseTotal: number; // Σ 지출 금액
  expenseCount: number;
};

export type ProfitBreakdownRow = {
  name: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginRevenue: number;
  qty: number;
  count: number;
};

export type ProfitTrend = {
  from: string;
  to: string;
  days: ProfitDayBucket[];
  byProduct: ProfitBreakdownRow[];
  byBuyer: ProfitBreakdownRow[];
  totals: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    marginRevenue: number;
    outboundQty: number;
    outboundCount: number;
    costMissingCount: number;
    purchaseTotal: number;
    inboundQty: number;
    inboundCount: number;
    expenseTotal: number;
    expenseCount: number;
    cashFlow: number; // revenue − purchaseTotal − expenseTotal
  };
};

/**
 * 한 테이블을 날짜 범위로 페이지네이션 조회.
 * filterByFormula로 1차 거르고(payload 축소), 날짜는 화면 정확도를 위해 코드에서 재필터한다.
 * 경계는 DATETIME_PARSE로 안전하게 비교(텍스트/날짜 필드 모두 대응).
 */
async function fetchInRange(
  table: string,
  dateField: string,
  from: string,
  to: string,
  statusFormula: string,
  extraFormula?: string,
): Promise<{ id: string; fields: Record<string, unknown> }[]> {
  const path = encodeURIComponent(table);
  const fromMinus1 = shiftDate(from, -1);
  const toPlus1 = shiftDate(to, 1);
  const parts = [
    statusFormula,
    `IS_AFTER({${dateField}}, DATETIME_PARSE("${fromMinus1}", "YYYY-MM-DD"))`,
    `IS_BEFORE({${dateField}}, DATETIME_PARSE("${toPlus1}", "YYYY-MM-DD"))`,
  ];
  if (extraFormula) parts.push(extraFormula);
  const formula = `AND(${parts.join(", ")})`;

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

/** 마스터 테이블 record id → 이름 map (매입처명·품목명 resolve용, 페이지네이션). */
async function fetchNameMap(table: string, nameField: string): Promise<Map<string, string>> {
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

/** link 필드(record id 배열)의 첫 id. */
const firstId = (v: unknown): string =>
  Array.isArray(v) && typeof v[0] === "string" ? v[0] : "";

/**
 * 기간 손익 추이 집계.
 * @param from YYYY-MM-DD (포함)
 * @param to   YYYY-MM-DD (포함)
 */
export async function getProfitTrend(
  adminWorkerId: string,
  from: string,
  to: string,
): Promise<Result<ProfitTrend>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { success: false, error: "기간 형식이 올바르지 않습니다 (YYYY-MM-DD)." };
  }
  // from > to면 자동 swap
  if (from > to) [from, to] = [to, from];

  try {
    const APPROVED = `{승인상태} = "승인 완료"`;
    const [outbounds, inbounds, expenses] = await Promise.all([
      fetchInRange(AIRTABLE_TABLE.outbound, "출고일", from, to, APPROVED),
      // 재고 이동으로 자동 생성된 입고 / 기존 재고 마이그레이션은 실제 매입이 아니므로 제외.
      fetchInRange(
        AIRTABLE_TABLE.inbound,
        "입고일",
        from,
        to,
        APPROVED,
        `AND(NOT({비고} = "기존 재고"), NOT({비고} = "재고 이동"))`,
      ),
      // 지출 상태 필드는 베이스에 "승인상태"만 존재(결재상태 필드는 없음 → formula 참조 시 422).
      // 코드 레벨에서는 승인상태 ?? 결재상태로 읽어 변형 베이스도 대응(무해).
      fetchInRange(AIRTABLE_TABLE.expense, "지출일", from, to, `{승인상태} = "승인 완료"`),
    ]);

    const dayMap = new Map<string, ProfitDayBucket>();
    const bucket = (date: string): ProfitDayBucket => {
      let b = dayMap.get(date);
      if (!b) {
        b = {
          date,
          revenue: 0,
          cogs: 0,
          grossProfit: 0,
          marginRevenue: 0,
          outboundQty: 0,
          outboundCount: 0,
          costMissingCount: 0,
          purchaseTotal: 0,
          inboundQty: 0,
          inboundCount: 0,
          expenseTotal: 0,
          expenseCount: 0,
        };
        dayMap.set(date, b);
      }
      return b;
    };

    const productMap = new Map<string, ProfitBreakdownRow>();
    const buyerMap = new Map<string, ProfitBreakdownRow>();
    const addBreakdown = (
      map: Map<string, ProfitBreakdownRow>,
      name: string,
      revenue: number,
      cogs: number,
      grossProfit: number,
      marginRevenue: number,
      qty: number,
    ) => {
      let row = map.get(name);
      if (!row) {
        row = { name, revenue: 0, cogs: 0, grossProfit: 0, marginRevenue: 0, qty: 0, count: 0 };
        map.set(name, row);
      }
      row.revenue += revenue;
      row.cogs += cogs;
      row.grossProfit += grossProfit;
      row.marginRevenue += marginRevenue;
      row.qty += qty;
      row.count += 1;
    };

    // ── 출고 (매출 / 매출원가 / 매출총이익) ──
    for (const r of outbounds) {
      const f = r.fields;
      if (str(f["승인상태"]) !== "승인 완료") continue;
      const date = (str(f["출고일"]) || "").slice(0, 10);
      if (!date || date < from || date > to) continue;

      const qty = num(f["출고요청수량"]);
      const revenue = num(f["판매금액"]) || num(f["판매가"]) * qty;
      const rawCost = f["출고시점 판매원가"];
      const hasCost = rawCost !== null && rawCost !== undefined && num(rawCost) > 0;
      const cogs = hasCost ? num(rawCost) : 0;
      // 출고시점 손익이 있으면 그대로, 없으면 매출−원가로 계산.
      const gp = hasCost ? num(f["출고시점 손익"]) || revenue - cogs : 0;
      const marginRevenue = hasCost ? revenue : 0;

      const b = bucket(date);
      b.revenue += revenue;
      b.cogs += cogs;
      b.grossProfit += gp;
      b.marginRevenue += marginRevenue;
      b.outboundQty += qty;
      b.outboundCount += 1;
      if (!hasCost) b.costMissingCount += 1;

      const product = str(f["품목명"]) || str(f["LOT번호"]) || "(미상)";
      const buyer = str(f["판매처"]) || "(미상)";
      addBreakdown(productMap, product, revenue, cogs, gp, marginRevenue, qty);
      addBreakdown(buyerMap, buyer, revenue, cogs, gp, marginRevenue, qty);
    }

    // ── 입고 (현금흐름 매입) ──
    for (const r of inbounds) {
      const f = r.fields;
      if (str(f["승인상태"]) !== "승인 완료") continue;
      const memo = str(f["비고"]);
      if (memo === "기존 재고" || memo === "재고 이동") continue;
      const date = (str(f["입고일"]) || str(f["입고일자"]) || "").slice(0, 10);
      if (!date || date < from || date > to) continue;

      const qty = num(f["입고수량"]) || num(f["입고수량(BOX)"]);
      const b = bucket(date);
      b.purchaseTotal += num(f["수매가"]) * qty;
      b.inboundQty += qty;
      b.inboundCount += 1;
    }

    // ── 지출 (현금흐름 비용) ──
    for (const r of expenses) {
      const f = r.fields;
      const status = str(f["승인상태"]) || str(f["결재상태"]);
      if (status !== "승인 완료") continue;
      const date = (str(f["지출일"]) || str(f["작성일"]) || "").slice(0, 10);
      if (!date || date < from || date > to) continue;

      const b = bucket(date);
      b.expenseTotal += num(f["금액"]);
      b.expenseCount += 1;
    }

    const days = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    const totals = days.reduce(
      (t, d) => {
        t.revenue += d.revenue;
        t.cogs += d.cogs;
        t.grossProfit += d.grossProfit;
        t.marginRevenue += d.marginRevenue;
        t.outboundQty += d.outboundQty;
        t.outboundCount += d.outboundCount;
        t.costMissingCount += d.costMissingCount;
        t.purchaseTotal += d.purchaseTotal;
        t.inboundQty += d.inboundQty;
        t.inboundCount += d.inboundCount;
        t.expenseTotal += d.expenseTotal;
        t.expenseCount += d.expenseCount;
        return t;
      },
      {
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        marginRevenue: 0,
        outboundQty: 0,
        outboundCount: 0,
        costMissingCount: 0,
        purchaseTotal: 0,
        inboundQty: 0,
        inboundCount: 0,
        expenseTotal: 0,
        expenseCount: 0,
        cashFlow: 0,
      },
    );
    totals.cashFlow = totals.revenue - totals.purchaseTotal - totals.expenseTotal;

    const byGross = (a: ProfitBreakdownRow, b: ProfitBreakdownRow) =>
      b.grossProfit - a.grossProfit;

    return {
      success: true,
      data: {
        from,
        to,
        days,
        byProduct: [...productMap.values()].sort(byGross),
        byBuyer: [...buyerMap.values()].sort(byGross),
        totals,
      },
    };
  } catch (e) {
    logError(`[${TAG}] 손익 추이 조회 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

// ─────────────────────────────────────────────────────────────
// 매입 통계 — 원가·손익 챕터 2번 화면
// ─────────────────────────────────────────────────────────────

export type PurchaseDayBucket = {
  date: string; // YYYY-MM-DD
  purchaseTotal: number; // Σ 수매가 × 입고수량
  qty: number; // Σ 입고수량 (박스)
  count: number;
};

export type PurchaseBreakdownRow = {
  name: string;
  /** 품목별 분해에서만 채움 — 같은 품목도 규격·미수에 따라 단가가 크게 달라 분리 집계. */
  spec: string;
  misu: string;
  purchaseTotal: number;
  qty: number;
  count: number;
};

/** 일별 × 품목(규격·미수) 버킷 — 품목 검색 시 추이 표를 그 품목으로 좁히기 위한 분해. */
export type PurchaseProductDay = {
  date: string; // YYYY-MM-DD
  name: string;
  spec: string;
  misu: string;
  purchaseTotal: number;
  qty: number;
  count: number;
};

export type PurchaseStats = {
  from: string;
  to: string;
  days: PurchaseDayBucket[];
  productDays: PurchaseProductDay[];
  bySupplier: PurchaseBreakdownRow[];
  byProduct: PurchaseBreakdownRow[];
  byShip: PurchaseBreakdownRow[];
  totals: {
    purchaseTotal: number;
    qty: number;
    count: number;
    supplierCount: number; // 기간 내 거래 매입처 수
    productCount: number;
    priceMissingCount: number; // 수매가 미기록(0) 건수
  };
};

/**
 * 기간 매입 통계 집계 — 승인 완료 입고만, 재고 이동/기존 재고 제외(실제 매입 아님).
 * 매입처·품목은 link → 마스터 이름 map으로 resolve (입고관리.품목명 lookup 우선).
 */
export async function getPurchaseStats(
  adminWorkerId: string,
  from: string,
  to: string,
): Promise<Result<PurchaseStats>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { success: false, error: "기간 형식이 올바르지 않습니다 (YYYY-MM-DD)." };
  }
  if (from > to) [from, to] = [to, from];

  try {
    const [inbounds, supplierNames, productNames] = await Promise.all([
      fetchInRange(
        AIRTABLE_TABLE.inbound,
        "입고일",
        from,
        to,
        `{승인상태} = "승인 완료"`,
        `AND(NOT({비고} = "기존 재고"), NOT({비고} = "재고 이동"))`,
      ),
      fetchNameMap(AIRTABLE_TABLE.suppliers, "매입처명"),
      fetchNameMap(AIRTABLE_TABLE.products, "품목명"),
    ]);

    const dayMap = new Map<string, PurchaseDayBucket>();
    const productDayMap = new Map<string, PurchaseProductDay>();
    const supplierMap = new Map<string, PurchaseBreakdownRow>();
    const productMap = new Map<string, PurchaseBreakdownRow>();
    const shipMap = new Map<string, PurchaseBreakdownRow>();
    const addBreakdown = (
      map: Map<string, PurchaseBreakdownRow>,
      name: string,
      total: number,
      qty: number,
      spec = "",
      misu = "",
    ) => {
      // 품목별은 규격·미수까지 키에 포함 — 같은 품목도 규격·미수별 단가 차이가 커서 분리.
      const key = `${name} ${spec} ${misu}`;
      let row = map.get(key);
      if (!row) {
        row = { name, spec, misu, purchaseTotal: 0, qty: 0, count: 0 };
        map.set(key, row);
      }
      row.purchaseTotal += total;
      row.qty += qty;
      row.count += 1;
    };

    let priceMissingCount = 0;
    for (const r of inbounds) {
      const f = r.fields;
      if (str(f["승인상태"]) !== "승인 완료") continue;
      const memo = str(f["비고"]);
      if (memo === "기존 재고" || memo === "재고 이동") continue;
      const date = (str(f["입고일"]) || str(f["입고일자"]) || "").slice(0, 10);
      if (!date || date < from || date > to) continue;

      const qty = num(f["입고수량"]) || num(f["입고수량(BOX)"]);
      const unitPrice = num(f["수매가"]);
      const total = unitPrice * qty;
      if (unitPrice <= 0) priceMissingCount += 1;

      let b = dayMap.get(date);
      if (!b) {
        b = { date, purchaseTotal: 0, qty: 0, count: 0 };
        dayMap.set(date, b);
      }
      b.purchaseTotal += total;
      b.qty += qty;
      b.count += 1;

      const supplier = supplierNames.get(firstId(f["매입처"])) || "(미상)";
      // 품목명 lookup(배열) 우선, 없으면 품목마스터 link resolve.
      const product =
        str(f["품목명"]) || productNames.get(firstId(f["품목마스터"])) || "(미상)";
      const ship = str(f["선박명"]) || "(미상)";
      const spec = str(f["규격"]);
      const misu = str(f["미수"]);
      addBreakdown(supplierMap, supplier, total, qty);
      addBreakdown(productMap, product, total, qty, spec, misu);
      addBreakdown(shipMap, ship, total, qty);

      // 일별 × 품목(규격·미수) 버킷 — 품목 검색 시 추이 표 필터용.
      const pdKey = `${date} ${product} ${spec} ${misu}`;
      let pd = productDayMap.get(pdKey);
      if (!pd) {
        pd = { date, name: product, spec, misu, purchaseTotal: 0, qty: 0, count: 0 };
        productDayMap.set(pdKey, pd);
      }
      pd.purchaseTotal += total;
      pd.qty += qty;
      pd.count += 1;
    }

    const days = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
    const totals = days.reduce(
      (t, d) => {
        t.purchaseTotal += d.purchaseTotal;
        t.qty += d.qty;
        t.count += d.count;
        return t;
      },
      {
        purchaseTotal: 0,
        qty: 0,
        count: 0,
        supplierCount: supplierMap.size,
        productCount: productMap.size,
        priceMissingCount,
      },
    );

    const byTotal = (a: PurchaseBreakdownRow, b: PurchaseBreakdownRow) =>
      b.purchaseTotal - a.purchaseTotal;

    return {
      success: true,
      data: {
        from,
        to,
        days,
        productDays: [...productDayMap.values()].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
        bySupplier: [...supplierMap.values()].sort(byTotal),
        byProduct: [...productMap.values()].sort(byTotal),
        byShip: [...shipMap.values()].sort(byTotal),
        totals,
      },
    };
  } catch (e) {
    logError(`[${TAG}] 매입 통계 조회 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}
