"use server";

import { revalidatePath } from "next/cache";
import { logError, logWarn } from "@/lib/logger";
import {
  fetchAirtable,
  getAirtableRecord,
  createAirtableRecord,
  patchAirtableRecord,
} from "@/lib/airtable";
import { AIRTABLE_TABLE, STORAGE_COST_FIELDS } from "@/lib/airtable-schema";
import { getStorageCostForLot } from "@/lib/storage-cost";
import { generateUniqueLotNumber } from "@/lib/lot-sequence";
import { calculateWorkSettlementCost } from "@/lib/cost-calc";
import { seoulDateString } from "@/lib/date";
import { ensureAdmin, type Result } from "./_master-helpers";

/**
 * 작업 정산 등록 서버 액션 — 원물 동결 정산서형 매입·원가 폼.
 *
 *   saveWorkSettlement    : 헤더+생산내역+작업비 초안 저장(상태=임시저장). LOT·입고관리 미생성.
 *   confirmWorkSettlement : 확정 — 작업단가·실단가 롤업 → 생산내역 1줄마다 입고관리 1행+LOT 1개 생성.
 *   cancelWorkSettlement  : 취소 — 생성된 LOT·입고관리 soft delete(미출고 가드), 상태=취소.
 *   listWorkSettlements / getWorkSettlement : 조회.
 *
 * 구조적으로 가공 거래(master-processing.ts)의 2단계 WIP + 입고(inbound.ts) LOT 생성을 합친 것.
 * 원가 배선(설계 docs/작업정산등록-설계.md §2·§4):
 *   - 입고관리.수매가 = 수매단가(순수 매입 → 매입통계 원천)
 *   - LOT.수매가 = 실단가 = 수매단가 + 작업단가(재고원가)
 *   - 작업정산 LOT은 동결비/입출고비/노조비/이월=0 (작업단가에 이미 흡수 → 이중계상 방지),
 *     냉장료단가만 행선지 보관처 비용 이력에서 읽어 앞으로 적산.
 */

const HEADER = AIRTABLE_TABLE.workSettlement; // 작업 정산
const LINE = AIRTABLE_TABLE.workSettlementLine; // 작업 정산 생산내역
const COST = AIRTABLE_TABLE.workSettlementCost; // 작업 정산 작업비
const LOT = "LOT별 재고";
const INBOUND = "입고 관리";
const PRODUCT = "품목마스터";
const STORAGE = "보관처 마스터";
const SHIP = "선박 정보 마스터";
const TAG = "master-work-settlement";
const PATH = "/admin/master/work-settlement";

const num = (v: unknown) => Number(Array.isArray(v) ? v[0] : v) || 0;
const str = (v: unknown) => String(Array.isArray(v) ? (v[0] ?? "") : (v ?? "")).trim();

/** 어떤 날짜 입력이든 YYYY-MM-DD로 정규화(방어적). Airtable date 필드 파싱 실패(422) 차단. */
function toIsoDate(raw: unknown): string {
  const s = String(raw ?? "").trim().replace(/[.\s]/g, "-").replace(/\//g, "-");
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(s.replace(/-/g, ""));
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return String(raw ?? "").trim();
}
const isRec = (s: string) => /^rec[a-zA-Z0-9]+$/.test(s ?? "");
function firstLink(v: unknown): string {
  return Array.isArray(v) && v.length > 0 && isRec(String(v[0])) ? String(v[0]) : "";
}
function selectName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) {
    return String((v as { name: unknown }).name ?? "").trim();
  }
  return String(v ?? "").trim();
}

async function fetchRecord(table: string, id: string): Promise<Record<string, unknown> | null> {
  try {
    const { fields } = await getAirtableRecord(encodeURIComponent(table), id);
    return fields ?? {};
  } catch (e) {
    logError(`[${TAG}] ${table}/${id} 조회 실패:`, e instanceof Error ? e.message : e);
    return null;
  }
}
async function createRecord(table: string, fields: Record<string, unknown>) {
  return createAirtableRecord(encodeURIComponent(table), fields);
}
async function patchRecord(table: string, id: string, fields: Record<string, unknown>) {
  return patchAirtableRecord(encodeURIComponent(table), id, fields);
}
async function deleteRecord(table: string, id: string) {
  return fetchAirtable(`${encodeURIComponent(table)}/${id}`, { method: "DELETE" });
}

/** {필드}="값" 텍스트 키로 자식 라인 조회(가공 투입 패턴). */
async function fetchLinesByField(
  table: string,
  field: string,
  value: string,
): Promise<{ id: string; fields: Record<string, unknown> }[]> {
  const items: { id: string; fields: Record<string, unknown> }[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    params.set("filterByFormula", `{${field}}="${value}"`);
    if (offset) params.set("offset", offset);
    const data = (await fetchAirtable(`${encodeURIComponent(table)}?${params}`)) as {
      records?: { id: string; fields?: Record<string, unknown> }[];
      offset?: string;
    };
    for (const r of data.records ?? []) items.push({ id: r.id, fields: r.fields ?? {} });
    offset = data.offset;
  } while (offset);
  return items;
}

/** LOT번호 빌더 (inbound.ts·transfer.ts와 동일 규약). */
function buildLotNumber(opts: {
  bizDate: string;
  productCode: string;
  spec: string;
  misu: string;
  seq: number;
}): string {
  const yymmdd = opts.bizDate.replace(/-/g, "").slice(2);
  const seqStr = String(opts.seq).padStart(4, "0");
  const misuClean = opts.misu.replace(/미$/, "").trim();
  const parts = [yymmdd, opts.productCode || "NOCODE", opts.spec || "-"];
  if (misuClean) parts.push(misuClean);
  parts.push(seqStr);
  return parts.join("-");
}

/** 정산번호 WS-YYMMDD-#### — 같은 날 기존 번호 최대+1 (단일 관리자, 낙관적). */
async function nextSettlementNo(date: string): Promise<string> {
  const yymmdd = (date || seoulDateString()).replace(/-/g, "").slice(2);
  const prefix = `WS-${yymmdd}-`;
  let maxSeq = 0;
  try {
    const data = (await fetchAirtable(
      `${encodeURIComponent(HEADER)}?filterByFormula=${encodeURIComponent(
        `FIND("${prefix}", {정산번호})=1`,
      )}&fields[]=${encodeURIComponent("정산번호")}&pageSize=100`,
    )) as { records?: { fields?: Record<string, unknown> }[] };
    for (const r of data.records ?? []) {
      const no = str(r.fields?.["정산번호"]);
      if (!no.startsWith(prefix)) continue; // FIND formula 미지원 환경 방어(다른 날 오집계 차단)
      const seq = Number(no.slice(prefix.length));
      if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
    }
  } catch (e) {
    logWarn(`[${TAG}] 정산번호 조회 실패(1로 시작):`, e instanceof Error ? e.message : e);
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

// ── 입력 타입 ────────────────────────────────────────────────────────────────
export type WorkSettlementHeaderInput = {
  /** 있으면 기존 임시저장 갱신, 없으면 신규 */
  settlementId?: string;
  date: string; // 작업일 YYYY-MM-DD
  workplaceId?: string; // 작업장(보관처 마스터)
  fishingArea?: string;
  hasFeed?: "O" | "X" | "";
  freshness?: string;
  shipId?: string; // 선박 정보 마스터
  supplierId?: string; // 매입처 마스터
  startTime?: string;
  endTime?: string;
  catchAmount?: number;
  memo?: string;
};

export type WorkSettlementProductLineInput = {
  productId: string;
  productName?: string;
  boxType?: string; // 사료팬/베이트大/베이트小
  fatRatio?: number;
  spec?: string;
  misu?: string;
  weightKg?: number;
  quantity: number; // 박스
  purchaseUnitPrice: number; // 수매단가
  usage?: string; // 원물동결/원프로즌 가공/생물
  destinationId?: string; // 행선지(보관처 마스터)
  memo?: string;
};

export type WorkSettlementCostLineInput = {
  group?: string;
  itemName?: string;
  count?: number;
  unitPrice?: number;
  amount: number;
  payee?: string;
  memo?: string;
};

export type SaveWorkSettlementInput = {
  header: WorkSettlementHeaderInput;
  lines: WorkSettlementProductLineInput[];
  costs: WorkSettlementCostLineInput[];
};

export type WorkSettlementSummary = {
  id: string;
  no: string;
  date: string;
  status: string;
  supplierId: string;
  shipId: string;
  catchAmount: number;
  lineCount: number;
  memo: string;
};

// ── 헤더 필드 빌드 ───────────────────────────────────────────────────────────
function headerFields(h: WorkSettlementHeaderInput, no?: string): Record<string, unknown> {
  const f: Record<string, unknown> = {
    작업일: toIsoDate(h.date) || seoulDateString(),
  };
  if (no) f["정산번호"] = no;
  if (h.fishingArea?.trim()) f["조업해구"] = h.fishingArea.trim();
  if (h.hasFeed === "O" || h.hasFeed === "X") f["먹이유무"] = h.hasFeed;
  if (h.freshness?.trim()) f["선도"] = h.freshness.trim();
  if (h.startTime?.trim()) f["시작시각"] = h.startTime.trim();
  if (h.endTime?.trim()) f["종료시각"] = h.endTime.trim();
  if (Number.isFinite(h.catchAmount) && (h.catchAmount ?? 0) > 0) f["어대금"] = h.catchAmount;
  if (h.memo?.trim()) f["비고"] = h.memo.trim();
  if (isRec(h.workplaceId ?? "")) f["작업장"] = [h.workplaceId];
  if (isRec(h.shipId ?? "")) f["선박명"] = [h.shipId];
  if (isRec(h.supplierId ?? "")) f["매입처"] = [h.supplierId];
  return f;
}

// ── 임시저장 (초안) ──────────────────────────────────────────────────────────
export async function saveWorkSettlement(
  adminWorkerId: string,
  input: SaveWorkSettlementInput,
): Promise<Result<{ settlementId: string; no: string }>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  const h = input.header;
  if (!h?.date) return { success: false, error: "작업일을 입력하세요." };

  try {
    let settlementId = h.settlementId ?? "";
    let no = "";

    if (isRec(settlementId)) {
      // 기존 임시저장 갱신 — 확정/취소된 건은 수정 불가
      const existing = await fetchRecord(HEADER, settlementId);
      if (!existing) return { success: false, error: "정산 건을 찾을 수 없습니다." };
      if (selectName(existing["상태"]) !== "임시저장") {
        return { success: false, error: "이미 확정·취소된 정산은 수정할 수 없습니다." };
      }
      no = str(existing["정산번호"]);
      await patchRecord(HEADER, settlementId, {
        ...headerFields(h),
        상태: "임시저장",
        ...(isRec(adminWorkerId) && { 작업자: [adminWorkerId] }),
      });
      // 기존 라인 전부 삭제 후 재생성(초안이라 단순 replace)
      const [oldLines, oldCosts] = await Promise.all([
        fetchLinesByField(LINE, "정산ID", settlementId),
        fetchLinesByField(COST, "정산ID", settlementId),
      ]);
      for (const r of oldLines) await deleteRecord(LINE, r.id);
      for (const r of oldCosts) await deleteRecord(COST, r.id);
    } else {
      no = await nextSettlementNo(h.date);
      const created = await createRecord(HEADER, {
        ...headerFields(h, no),
        상태: "임시저장",
        ...(isRec(adminWorkerId) && { 작업자: [adminWorkerId] }),
      });
      if (!created?.id) return { success: false, error: "정산 헤더 생성 실패" };
      settlementId = created.id;
    }

    await writeChildLines(settlementId, no, input.lines, input.costs);

    revalidatePath(PATH);
    return { success: true, data: { settlementId, no } };
  } catch (e) {
    logError(`[${TAG}] 임시저장 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "임시저장 실패" };
  }
}

/**
 * 헤더만 저장(1단계 사전기입 전용) — 자식 라인(생산내역·작업비)은 건드리지 않는다.
 * 신규면 임시저장 초안 생성, 기존 임시저장이면 헤더만 갱신(2단계 작업 보존).
 */
export async function saveWorkSettlementHeader(
  adminWorkerId: string,
  h: WorkSettlementHeaderInput,
): Promise<Result<{ settlementId: string; no: string }>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  if (!h?.date) return { success: false, error: "작업일을 입력하세요." };

  try {
    if (isRec(h.settlementId ?? "")) {
      const existing = await fetchRecord(HEADER, h.settlementId!);
      if (!existing) return { success: false, error: "정산 건을 찾을 수 없습니다." };
      if (selectName(existing["상태"]) !== "임시저장") {
        return { success: false, error: "이미 확정·취소된 정산은 수정할 수 없습니다." };
      }
      await patchRecord(HEADER, h.settlementId!, {
        ...headerFields(h),
        상태: "임시저장",
        ...(isRec(adminWorkerId) && { 작업자: [adminWorkerId] }),
      });
      revalidatePath(PATH);
      return { success: true, data: { settlementId: h.settlementId!, no: str(existing["정산번호"]) } };
    }
    const no = await nextSettlementNo(h.date);
    const created = await createRecord(HEADER, {
      ...headerFields(h, no),
      상태: "임시저장",
      ...(isRec(adminWorkerId) && { 작업자: [adminWorkerId] }),
    });
    if (!created?.id) return { success: false, error: "정산 헤더 생성 실패" };
    revalidatePath(PATH);
    return { success: true, data: { settlementId: created.id, no } };
  } catch (e) {
    logError(`[${TAG}] 헤더 저장 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "헤더 저장 실패" };
  }
}

/** 생산내역·작업비 라인 생성(임시저장·재저장 공용). */
async function writeChildLines(
  settlementId: string,
  no: string,
  lines: WorkSettlementProductLineInput[],
  costs: WorkSettlementCostLineInput[],
) {
  let i = 0;
  for (const ln of lines ?? []) {
    i += 1;
    await createRecord(LINE, {
      라인ID: `${no}-${i}`,
      "작업 정산": [settlementId],
      정산ID: settlementId,
      ...(isRec(ln.productId) && { 품목: [ln.productId] }),
      ...(ln.productName?.trim() && { 품목명: ln.productName.trim() }),
      ...(ln.boxType?.trim() && { 구분: ln.boxType.trim() }),
      ...(Number.isFinite(ln.fatRatio) && { 지방도: ln.fatRatio }),
      ...(ln.spec?.trim() && { 규격: ln.spec.trim() }),
      ...(ln.misu?.trim() && { 미수: ln.misu.trim() }),
      ...(Number.isFinite(ln.weightKg) && { 중량kg: ln.weightKg }),
      수량: num(ln.quantity),
      수매단가: num(ln.purchaseUnitPrice),
      금액: Math.round(num(ln.purchaseUnitPrice) * num(ln.quantity)),
      ...(ln.usage?.trim() && { 용도: ln.usage.trim() }),
      ...(isRec(ln.destinationId ?? "") && { 행선지: [ln.destinationId] }),
      ...(ln.memo?.trim() && { 비고: ln.memo.trim() }),
    });
  }
  let j = 0;
  for (const c of costs ?? []) {
    j += 1;
    await createRecord(COST, {
      항목ID: `${no}-C${j}`,
      "작업 정산": [settlementId],
      정산ID: settlementId,
      ...(c.group?.trim() && { 그룹: c.group.trim() }),
      ...(c.itemName?.trim() && { 항목명: c.itemName.trim() }),
      ...(Number.isFinite(c.count) && { 회수: c.count }),
      ...(Number.isFinite(c.unitPrice) && { 단가: c.unitPrice }),
      금액: num(c.amount),
      ...(c.payee?.trim() && { 지급처: c.payee.trim() }),
      ...(c.memo?.trim() && { 비고: c.memo.trim() }),
    });
  }
}

// ── 확정 ─────────────────────────────────────────────────────────────────────
export async function confirmWorkSettlement(
  adminWorkerId: string,
  settlementId: string,
): Promise<Result<{ lotCount: number }>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  if (!isRec(settlementId)) return { success: false, error: "정산 건이 지정되지 않았습니다." };

  const header = await fetchRecord(HEADER, settlementId);
  if (!header) return { success: false, error: "정산 건을 찾을 수 없습니다." };
  if (selectName(header["상태"]) === "확정") {
    return { success: false, error: "이미 확정된 정산입니다." };
  }
  if (selectName(header["상태"]) === "취소") {
    return { success: false, error: "취소된 정산은 확정할 수 없습니다." };
  }

  const [prodLines, costLines] = await Promise.all([
    fetchLinesByField(LINE, "정산ID", settlementId),
    fetchLinesByField(COST, "정산ID", settlementId),
  ]);
  const validLines = prodLines.filter((r) => num(r.fields["수량"]) > 0);
  if (validLines.length === 0) {
    return { success: false, error: "수량이 있는 생산내역이 없습니다." };
  }

  // 원가 롤업 — 작업단가 = Σ작업비금액 ÷ 총박스수 / 실단가 = 수매단가 + 작업단가
  const cost = calculateWorkSettlementCost({
    lines: validLines.map((r) => ({
      boxes: num(r.fields["수량"]),
      purchaseUnitPrice: num(r.fields["수매단가"]),
    })),
    workCostAmounts: costLines.map((r) => num(r.fields["금액"])),
  });

  const date = str(header["작업일"]) || seoulDateString();
  const supplierId = firstLink(header["매입처"]);
  const workerId = isRec(adminWorkerId) ? adminWorkerId : firstLink(header["작업자"]);

  // 선박명: 헤더 링크 → 선박 마스터 선박명 텍스트(입고관리.선박명은 텍스트 필드)
  let shipName = "";
  const shipId = firstLink(header["선박명"]);
  if (shipId) shipName = str((await fetchRecord(SHIP, shipId))?.["선박명"]);

  try {
    let created = 0;
    for (let idx = 0; idx < validLines.length; idx++) {
      const lineRec = validLines[idx];
      const lf = lineRec.fields;
      const lineCost = cost.lines[idx]; // validLines와 cost.lines 순서 동일
      const qty = num(lf["수량"]);
      const spec = str(lf["규격"]);
      const misu = str(lf["미수"]);
      const usage = str(lf["용도"]);
      const productId = firstLink(lf["품목"]);
      const destId = firstLink(lf["행선지"]);

      // 품목마스터 — 품목코드(LOT번호)·품목명·원산지
      const pm = productId ? await fetchRecord(PRODUCT, productId) : null;
      const productCode = str(pm?.["품목코드"]) || "NOCODE";
      const productName = str(lf["품목명"]) || str(pm?.["품목명"]);
      const productOrigin = str(pm?.["원산지"]);

      // 행선지 보관처 — 냉장료단가만(동결비·입출고비는 작업단가에 흡수 → 0)
      let refrigerationFee: number | null = null;
      let destName = "";
      if (destId) {
        destName = str((await fetchRecord(STORAGE, destId))?.["보관처명"]);
        if (destName) {
          try {
            const sc = await getStorageCostForLot(destName, date);
            refrigerationFee = sc?.refrigerationFee ?? null;
          } catch (e) {
            logWarn(`[${TAG}] 냉장료 조회 실패(계속):`, e instanceof Error ? e.message : e);
          }
        }
      }

      // 입고관리 — 수매가 = 수매단가(순수 매입), 비고 = 용도 태그(매입통계 세그먼트)
      const inbound = await createRecord(INBOUND, {
        입고일: date,
        규격: spec,
        미수: misu,
        입고수량: qty,
        잔여수량: qty,
        수매가: lineCost.purchaseUnitPrice,
        원산지: productOrigin,
        승인상태: "승인 완료",
        비고: usage || "원물동결",
        ...(productId && { 품목마스터: [productId] }),
        ...(destId && { 보관처: [destId] }),
        ...(isRec(supplierId) && { 매입처: [supplierId] }),
        ...(shipName && { 선박명: shipName }),
        ...(isRec(workerId) && { 작업자: [workerId], 매입자: [workerId] }),
      });
      if (!inbound?.id) throw new Error("입고관리 생성 실패");

      // LOT번호
      const lotNumber = await generateUniqueLotNumber((seq) =>
        buildLotNumber({ bizDate: date, productCode, spec, misu, seq }),
      );

      // LOT — 수매가 = 실단가(재고원가). 동결비/입출고비/노조비/이월=0, 냉장료단가만.
      const lotFields: Record<string, unknown> = {
        LOT번호: lotNumber,
        입고관리링크: [inbound.id],
        재고수량: qty,
        "입고수량(BOX)": qty,
        규격: spec,
        미수: misu,
        수매가: lineCost.actualUnitPrice,
        ...(productId && { 품목마스터: [productId] }),
        ...(productName && { 품목명: productName }),
        ...(productOrigin && { 원산지: productOrigin }),
        ...(destId && { 보관처: [destId] }),
        최초입고일: date,
        이동입고일: date,
        동결비: 0,
        입출고비: 0,
        노조비: 0,
        이월냉장료: 0,
        이월입출고비: 0,
        이월노조비: 0,
        이월동결비: 0,
        승인상태: "승인 완료",
        상태: "승인 완료",
        상태사유: "신규 입고",
        결정일시: new Date().toISOString(),
        ...(refrigerationFee != null && { 냉장료단가: refrigerationFee }),
        ...(isRec(supplierId) && { 매입처: [supplierId] }),
        ...(isRec(workerId) && { 결정자: [workerId], 입고자: [workerId], 매입자: [workerId] }),
      };
      const lot = await createRecord(LOT, lotFields);
      if (!lot?.id) throw new Error("LOT 생성 실패");

      // 생산내역 라인에 실단가·실금액·짝 링크 역기록
      await patchRecord(LINE, lineRec.id, {
        실단가: lineCost.actualUnitPrice,
        실금액: lineCost.actualAmount,
        입고관리: [inbound.id],
        LOT: [lot.id],
      });
      created += 1;
    }

    await patchRecord(HEADER, settlementId, { 상태: "확정" });
    revalidatePath(PATH);
    revalidatePath("/admin/master/lots");
    return { success: true, data: { lotCount: created } };
  } catch (e) {
    logError(`[${TAG}] [INTEGRITY-ALERT] 확정 실패 (정산 ${settlementId}):`, e);
    return {
      success: false,
      error:
        (e instanceof Error ? e.message : "확정 실패") +
        " — 일부 LOT/입고관리가 생성됐을 수 있어 정합성 확인 필요",
    };
  }
}

// ── 취소 ─────────────────────────────────────────────────────────────────────
export async function cancelWorkSettlement(
  adminWorkerId: string,
  settlementId: string,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  if (!isRec(settlementId)) return { success: false, error: "정산 건이 지정되지 않았습니다." };

  const header = await fetchRecord(HEADER, settlementId);
  if (!header) return { success: false, error: "정산 건을 찾을 수 없습니다." };
  const status = selectName(header["상태"]);
  if (status === "취소") return { success: false, error: "이미 취소된 정산입니다." };

  const prodLines = await fetchLinesByField(LINE, "정산ID", settlementId);

  // 확정 취소 가드: 생성 LOT이 미출고·미이동·미가공(재고수량 == 입고수량)이어야 함
  if (status === "확정") {
    for (const r of prodLines) {
      const lotId = firstLink(r.fields["LOT"]);
      if (!lotId) continue;
      const lot = await fetchRecord(LOT, lotId);
      if (lot && num(lot["재고수량"]) !== num(lot["입고수량(BOX)"])) {
        logWarn(
          `[${TAG}] [INTEGRITY-ALERT] 확정 취소 차단 — LOT 일부 출고/이동/가공 (정산 ${settlementId})`,
        );
        return {
          success: false,
          error: "생성된 재고가 이미 출고·이동·가공돼 취소할 수 없습니다. 수동 보정이 필요합니다.",
        };
      }
    }
  }

  try {
    if (status === "확정") {
      for (const r of prodLines) {
        const lotId = firstLink(r.fields["LOT"]);
        const inbId = firstLink(r.fields["입고관리"]);
        if (lotId) {
          await patchRecord(LOT, lotId, {
            재고수량: 0,
            승인상태: "취소",
            상태: "취소",
            상태사유: "수동 취소",
          });
        }
        if (inbId) await patchRecord(INBOUND, inbId, { 잔여수량: 0, 승인상태: "취소" });
      }
    }
    await patchRecord(HEADER, settlementId, { 상태: "취소" });
    revalidatePath(PATH);
    revalidatePath("/admin/master/lots");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] [INTEGRITY-ALERT] 취소 실패 (정산 ${settlementId}):`, e);
    return { success: false, error: e instanceof Error ? e.message : "취소 실패" };
  }
}

// ── 조회 ─────────────────────────────────────────────────────────────────────
export async function listWorkSettlements(
  adminWorkerId: string,
): Promise<Result<WorkSettlementSummary[]>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  try {
    const items: WorkSettlementSummary[] = [];
    let offset: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      const data = (await fetchAirtable(`${encodeURIComponent(HEADER)}?${params}`)) as {
        records?: { id: string; fields?: Record<string, unknown> }[];
        offset?: string;
      };
      for (const r of data.records ?? []) {
        const f = r.fields ?? {};
        const lineLinks = f["작업 정산 생산내역"];
        items.push({
          id: r.id,
          no: str(f["정산번호"]),
          date: str(f["작업일"]),
          status: selectName(f["상태"]),
          supplierId: firstLink(f["매입처"]),
          shipId: firstLink(f["선박명"]),
          catchAmount: num(f["어대금"]),
          lineCount: Array.isArray(lineLinks) ? lineLinks.length : 0,
          memo: str(f["비고"]),
        });
      }
      offset = data.offset;
    } while (offset);
    items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return { success: true, data: items };
  } catch (e) {
    logError(`[${TAG}] 조회 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

// ── 상세 조회 (2단계 흐름: 초안 이어서 작성용) ────────────────────────────────
export type WorkSettlementDetail = {
  id: string;
  no: string;
  status: string;
  header: {
    date: string;
    workplaceId: string;
    fishingArea: string;
    hasFeed: string;
    freshness: string;
    shipId: string;
    supplierId: string;
    startTime: string;
    endTime: string;
    catchAmount: number;
    memo: string;
  };
  lines: {
    productId: string;
    productName: string;
    boxType: string;
    fatRatio: number;
    spec: string;
    misu: string;
    weightKg: number;
    quantity: number;
    purchaseUnitPrice: number;
    usage: string;
    destinationId: string;
    memo: string;
  }[];
  costs: {
    group: string;
    itemName: string;
    count: number;
    unitPrice: number;
    amount: number;
    payee: string;
    memo: string;
  }[];
};

/** 정산 1건의 헤더+생산내역+작업비 전체 조회. id 해석은 클라이언트가 마스터 목록으로. */
export async function getWorkSettlementDetail(
  adminWorkerId: string,
  settlementId: string,
): Promise<Result<WorkSettlementDetail>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  if (!isRec(settlementId)) return { success: false, error: "정산 건이 지정되지 않았습니다." };

  const h = await fetchRecord(HEADER, settlementId);
  if (!h) return { success: false, error: "정산 건을 찾을 수 없습니다." };

  const [lineRecs, costRecs] = await Promise.all([
    fetchLinesByField(LINE, "정산ID", settlementId),
    fetchLinesByField(COST, "정산ID", settlementId),
  ]);

  const lineIdx = (r: { fields: Record<string, unknown> }, key: string) => r.fields[key];
  const lines = lineRecs
    .map((r) => ({
      productId: firstLink(r.fields["품목"]),
      productName: str(r.fields["품목명"]),
      boxType: selectName(r.fields["구분"]),
      fatRatio: num(r.fields["지방도"]),
      spec: str(r.fields["규격"]),
      misu: str(r.fields["미수"]),
      weightKg: num(r.fields["중량kg"]),
      quantity: num(r.fields["수량"]),
      purchaseUnitPrice: num(r.fields["수매단가"]),
      usage: selectName(r.fields["용도"]),
      destinationId: firstLink(r.fields["행선지"]),
      memo: str(r.fields["비고"]),
      _line: str(lineIdx(r, "라인ID")),
    }))
    .sort((a, b) => a._line.localeCompare(b._line, undefined, { numeric: true }))
    .map(({ _line, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars

  const costs = costRecs
    .map((r) => ({
      group: selectName(r.fields["그룹"]),
      itemName: str(r.fields["항목명"]),
      count: num(r.fields["회수"]),
      unitPrice: num(r.fields["단가"]),
      amount: num(r.fields["금액"]),
      payee: str(r.fields["지급처"]),
      memo: str(r.fields["비고"]),
      _id: str(r.fields["항목ID"]),
    }))
    .sort((a, b) => a._id.localeCompare(b._id, undefined, { numeric: true }))
    .map(({ _id, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars

  return {
    success: true,
    data: {
      id: settlementId,
      no: str(h["정산번호"]),
      status: selectName(h["상태"]),
      header: {
        date: str(h["작업일"]),
        workplaceId: firstLink(h["작업장"]),
        fishingArea: str(h["조업해구"]),
        hasFeed: selectName(h["먹이유무"]),
        freshness: str(h["선도"]),
        shipId: firstLink(h["선박명"]),
        supplierId: firstLink(h["매입처"]),
        startTime: str(h["시작시각"]),
        endTime: str(h["종료시각"]),
        catchAmount: num(h["어대금"]),
        memo: str(h["비고"]),
      },
      lines,
      costs,
    },
  };
}

// ── 보관처 박스종류별 동결비 + 입출고비 조회 (작업비 자동 채우기용) ────────────
export type StorageBoxTypeFees = {
  storageName: string;
  inOutFee: number;
  /** 박스종류별 동결비 단가 (원/박스) */
  freeze: { 사료팬: number; 베이트大: number; 베이트小: number };
};

/**
 * 지급처(보관처)의 작업일 기준 박스종류별 동결비 + 입출고비 단가.
 * 폼에서 동결비·입출고비 작업비 라인 자동 채우기에 사용.
 * 동결비는 박스종류마다 단가가 달라 3열(FREEZE_FEE_COLUMN)로 분리 조회.
 */
export async function getStorageBoxTypeFees(
  adminWorkerId: string,
  storageId: string,
  date: string,
): Promise<Result<StorageBoxTypeFees>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  if (!isRec(storageId)) return { success: false, error: "보관처를 선택하세요." };

  const st = await fetchRecord(STORAGE, storageId);
  const storageName = str(st?.["보관처명"]);
  if (!storageName) return { success: false, error: "보관처를 찾을 수 없습니다." };

  const SC = STORAGE_COST_FIELDS;
  const d = (date || seoulDateString()).trim();
  const esc = storageName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const formula = `AND({${SC.storage}}="${esc}", NOT(IS_AFTER({${SC.startDate}}, "${d}")), OR({${SC.endDate}}="", NOT(IS_BEFORE({${SC.endDate}}, "${d}"))))`;

  let rows: { fields: Record<string, unknown> }[] = [];
  try {
    const data = (await fetchAirtable(
      `${encodeURIComponent(AIRTABLE_TABLE.storageCostHistory)}?filterByFormula=${encodeURIComponent(
        formula,
      )}&pageSize=20`,
    )) as { records?: { fields?: Record<string, unknown> }[] };
    rows = (data.records ?? [])
      .map((r) => ({ fields: r.fields ?? {} }))
      .filter((r) => str(r.fields[SC.storage]) === storageName); // formula 미적용 환경 방어
  } catch (e) {
    logWarn(`[${TAG}] 보관처 비용 이력 조회 실패:`, e instanceof Error ? e.message : e);
  }
  rows.sort((a, b) => str(b.fields[SC.startDate]).localeCompare(str(a.fields[SC.startDate])));
  const f = rows[0]?.fields ?? {};
  return {
    success: true,
    data: {
      storageName,
      inOutFee: num(f[SC.inOutFee]),
      freeze: {
        사료팬: num(f[SC.freezeFeePan]),
        베이트大: num(f[SC.freezeFeeBaitLarge]),
        베이트小: num(f[SC.freezeFeeBaitSmall]),
      },
    },
  };
}
