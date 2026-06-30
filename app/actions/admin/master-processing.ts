"use server";

import { revalidatePath } from "next/cache";
import { logError, logWarn } from "@/lib/logger";
import {
  fetchAirtable,
  getAirtableRecord,
  createAirtableRecord,
  patchAirtableRecord,
} from "@/lib/airtable";
import { AIRTABLE_TABLE } from "@/lib/airtable-schema";
import { getStorageCostForLot } from "@/lib/storage-cost";
import { generateUniqueLotNumber } from "@/lib/lot-sequence";
import { calculateLotCostBasis, calculateProcessingCost } from "@/lib/cost-calc";
import { parseSpecKg } from "@/lib/spec-display";
import { seoulDateString } from "@/lib/date";
import { RATE_BASES, type RateBasis } from "@/lib/processing-rate-basis";
import { ensureAdmin, type Result } from "./_master-helpers";

/**
 * 가공(변환) 거래 서버 액션 — N개 원물 LOT → 가공품 1종. 2단계 WIP.
 *
 *   ㉠ createProcessingBatch  : 원물 차감(부분 투입) → 상태=가공 중. 투입원가·단가 스냅샷.
 *   ㉡ completeProcessingBatch: 산출 실측 입력 → 가공품 LOT 생성 + 가공원가 롤업 → 상태=완료.
 *   ⑤ cancelProcessingBatch  : 가공 중=원물 복구 / 완료=가공품 무효화+원물 복구(미판매 가드).
 *
 * 구조적으로 approveTransfer(transfer.ts)의 확장 — 새 LOT 필드맵·원가 이월·차감 패턴 재사용.
 * 차이: 품목 변경(원물→가공품) · N입력 · 수율(산출<투입) · 임가공비. 가공원가가 원물
 * 재고원가(수매+보관비)를 흡수하므로 가공품 LOT의 이월비용=0(보관비 이중계상 방지).
 *
 * 매입 이중계상 방지: 가공품 입고관리 행의 수매가=0 (가공품 재입고는 '매입'이 아님 — 원물은
 * 자기 입고 시점에 이미 매입 계상됨). 매입 집계(Σ 수매가×수량)에 0 기여라 손익·매입통계 무영향.
 * 가공품 실제 원가는 LOT.수매가(=가공원가)가 보유. 비고="가공 입고"로 식별(원장 표시·향후 필터용).
 */

const BATCH = encodeURIComponent(AIRTABLE_TABLE.processingBatch); // 가공 거래
const INPUT = encodeURIComponent(AIRTABLE_TABLE.processingInput); // 가공 투입
const RATES = encodeURIComponent(AIRTABLE_TABLE.processingRates); // 가공비 단가
const LOT = "LOT별 재고";
const INBOUND = "입고 관리";
const PRODUCT = "품목마스터";
const STORAGE = "보관처 마스터";
const TAG = "master-processing";
const PATH = "/admin/master/processing";

const num = (v: unknown) => Number(Array.isArray(v) ? v[0] : v) || 0;
const str = (v: unknown) => String(Array.isArray(v) ? (v[0] ?? "") : (v ?? "")).trim();
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

// ── 입력 타입 ────────────────────────────────────────────────────────────────
export type ProcessingInputLine = { lotRecordId: string; boxes: number };

export type CreateProcessingBatchInput = {
  date: string; // 가공일 YYYY-MM-DD
  factoryId: string; // 가공공장(보관처 마스터)
  factoryName: string;
  productId: string; // 가공품(품목마스터, 필렛)
  freezeType: "ONE-Frozen" | "TWO-Frozen";
  inputs: ProcessingInputLine[];
  memo?: string;
};

export type CompleteProcessingBatchInput = {
  batchId: string;
  outputBoxes: number; // 산출 박스
  outputTotalKg: number; // 산출 실측 총중량
  restorageId: string; // 재입고 보관처(자사)
  spec?: string; // 가공품 규격(미입력 시 산출총중량/박스 자동)
  misu?: string; // 가공품 미수(피스)
  completedDate?: string; // 완료일(미입력 시 오늘)
  feeUnitOverride?: number; // 임가공단가 수동 보정
};

export type ProcessingBatchSummary = {
  id: string;
  date: string;
  factoryId: string;
  factoryName: string;
  productId: string;
  freezeType: string;
  basis: string;
  status: string; // 가공 중 / 완료 / 취소
  outputBoxes: number;
  outputTotalKg: number;
  processingCostTotal: number;
  costPerBox: number;
  completedDate: string;
  memo: string;
};

// ── 가공비 단가 적용분 조회 ───────────────────────────────────────────────────
async function findApplicableRate(
  factoryId: string,
  productId: string,
  date: string,
): Promise<{ unit: number; basis: RateBasis } | null> {
  const data = (await fetchAirtable(`${RATES}?pageSize=100`)) as {
    records?: { id: string; fields?: Record<string, unknown> }[];
  };
  const matches = (data.records ?? []).filter((r) => {
    const f = r.fields ?? {};
    if (firstLink(f["가공공장"]) !== factoryId) return false;
    if (firstLink(f["가공품"]) !== productId) return false;
    const start = str(f["적용시작일"]);
    const end = str(f["적용종료일"]);
    if (start && start > date) return false;
    if (end && end < date) return false;
    return true;
  });
  if (matches.length === 0) return null;
  matches.sort((a, b) =>
    str(b.fields?.["적용시작일"]).localeCompare(str(a.fields?.["적용시작일"])),
  );
  const top = matches[0].fields ?? {};
  const basis = selectName(top["기준"]);
  return {
    unit: num(top["단가"]),
    basis: (RATE_BASES as readonly string[]).includes(basis) ? (basis as RateBasis) : "투입kg당",
  };
}

// ── 투입 원물 LOT 스냅샷(검증 포함, mutation 전) ──────────────────────────────
type InputSnapshot = {
  lotId: string;
  lotNumber: string;
  inboundLinkId: string;
  boxes: number;
  perBoxCost: number;
  inputKg: number;
  currentStock: number;
  currentRemain: number;
};

async function snapshotInputLot(
  lotId: string,
  boxes: number,
  asOfDate: string,
): Promise<InputSnapshot | { error: string }> {
  const f = await fetchRecord(LOT, lotId);
  if (!f) return { error: "투입 원물 LOT을 찾을 수 없습니다." };
  if (!(boxes > 0)) return { error: "투입 박스 수가 올바르지 않습니다." };
  const currentStock = num(f["재고수량"]);
  if (boxes > currentStock) {
    return {
      error: `재고 부족 (LOT ${str(f["LOT번호"])}: 재고 ${currentStock}박스, 투입 ${boxes}박스)`,
    };
  }
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
    inboxQty: num(f["입고수량(BOX)"]),
    inboundDate: str(f["이동입고일"]) || str(f["최초입고일"]),
    asOfDate,
  });
  const specKg = parseSpecKg(str(f["규격"])) ?? 0;
  const inboundLinkId = firstLink(f["입고관리링크"]);
  let currentRemain = 0;
  if (inboundLinkId) {
    const inb = await fetchRecord(INBOUND, inboundLinkId);
    currentRemain = num(inb?.["잔여수량"]);
  }
  return {
    lotId,
    lotNumber: str(f["LOT번호"]),
    inboundLinkId,
    boxes,
    perBoxCost: basis.totalPerBox,
    inputKg: boxes * specKg,
    currentStock,
    currentRemain,
  };
}

// ── ㉠ 가공 투입 ─────────────────────────────────────────────────────────────
export async function createProcessingBatch(
  adminWorkerId: string,
  input: CreateProcessingBatchInput,
): Promise<Result<{ id: string }>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  if (!input.date) return { success: false, error: "가공일을 입력하세요." };
  if (!input.factoryId) return { success: false, error: "가공공장을 선택하세요." };
  if (!input.productId) return { success: false, error: "가공품을 선택하세요." };
  if (input.freezeType !== "ONE-Frozen" && input.freezeType !== "TWO-Frozen") {
    return { success: false, error: "동결방식을 선택하세요." };
  }
  const lines = (input.inputs ?? []).filter((x) => x.lotRecordId && x.boxes > 0);
  if (lines.length === 0) return { success: false, error: "투입할 원물 LOT을 1개 이상 추가하세요." };

  const rate = await findApplicableRate(input.factoryId, input.productId, input.date);
  if (!rate) {
    return {
      success: false,
      error: "해당 가공공장·가공품의 적용 가공비 단가가 없습니다. '가공비 단가'에서 먼저 등록하세요.",
    };
  }

  // Pass 1: 모든 투입 LOT 스냅샷 + 재고 검증 (mutation 전)
  const snaps: InputSnapshot[] = [];
  for (const ln of lines) {
    const s = await snapshotInputLot(ln.lotRecordId, ln.boxes, input.date);
    if ("error" in s) return { success: false, error: s.error };
    snaps.push(s);
  }
  const inputMaterialTotal = Math.round(
    snaps.reduce((sum, s) => sum + s.perBoxCost * s.boxes, 0),
  );
  const inputTotalKg = Math.round(snaps.reduce((sum, s) => sum + s.inputKg, 0) * 10) / 10;

  try {
    const batch = await createRecord(AIRTABLE_TABLE.processingBatch, {
      가공일: input.date,
      가공공장: [input.factoryId],
      가공공장명: (input.factoryName ?? "").trim(),
      가공품: [input.productId],
      동결방식: input.freezeType,
      기준: rate.basis,
      임가공단가: rate.unit,
      상태: "가공 중",
      투입원물원가합: inputMaterialTotal,
      투입총kg: inputTotalKg,
      ...(isRec(adminWorkerId) && { 작업자: [adminWorkerId] }),
      ...(input.memo?.trim() && { 비고: input.memo.trim() }),
    });
    if (!batch?.id) return { success: false, error: "가공 거래 생성 실패" };

    for (const s of snaps) {
      await createRecord(AIRTABLE_TABLE.processingInput, {
        원물LOT번호: s.lotNumber,
        "가공 거래": [batch.id],
        가공거래ID: batch.id,
        원물LOT: [s.lotId],
        투입박스: s.boxes,
        원물박스당원가: Math.round(s.perBoxCost),
        투입원물원가: Math.round(s.perBoxCost * s.boxes),
      });
    }

    // 원물 차감
    for (const s of snaps) {
      const newStock = Math.max(0, s.currentStock - s.boxes);
      const lotPatch: Record<string, unknown> = { 재고수량: newStock };
      if (newStock === 0) {
        lotPatch["상태"] = "소진";
        lotPatch["상태사유"] = "가공 투입";
      }
      try {
        await patchRecord(LOT, s.lotId, lotPatch);
        if (s.inboundLinkId) {
          await patchRecord(INBOUND, s.inboundLinkId, {
            잔여수량: Math.max(0, s.currentRemain - s.boxes),
          });
        }
      } catch (e) {
        logError(
          `[${TAG}] [INTEGRITY-ALERT] 원물 차감 실패 (배치 ${batch.id}, LOT ${s.lotId}):`,
          e,
        );
        return { success: false, error: "원물 차감 중 오류 — 데이터 정합성 확인 필요" };
      }
    }

    revalidatePath(PATH);
    return { success: true, data: { id: batch.id } };
  } catch (e) {
    logError(`[${TAG}] 가공 투입 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "가공 투입 실패" };
  }
}

// ── ㉡ 가공 완료 ─────────────────────────────────────────────────────────────
export async function completeProcessingBatch(
  adminWorkerId: string,
  input: CompleteProcessingBatchInput,
): Promise<Result<{ lotId: string; lotNumber: string; costPerBox: number }>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  if (!input.batchId) return { success: false, error: "가공 거래가 지정되지 않았습니다." };
  if (!(input.outputBoxes > 0)) return { success: false, error: "산출 박스 수를 입력하세요." };
  if (!(input.outputTotalKg > 0)) return { success: false, error: "산출 총중량(kg)을 입력하세요." };
  if (!input.restorageId) return { success: false, error: "재입고 보관처를 선택하세요." };
  const completedDate = input.completedDate || seoulDateString();

  const b = await fetchRecord(AIRTABLE_TABLE.processingBatch, input.batchId);
  if (!b) return { success: false, error: "가공 거래를 찾을 수 없습니다." };
  if (selectName(b["상태"]) !== "가공 중") {
    return { success: false, error: "이미 완료되었거나 취소된 가공입니다." };
  }
  const productId = firstLink(b["가공품"]);
  if (!productId) return { success: false, error: "가공품 정보가 없습니다." };

  // 투입 라인 조회 (가공거래ID 텍스트 키)
  const lineData = (await fetchAirtable(
    `${INPUT}?filterByFormula=${encodeURIComponent(`{가공거래ID}="${input.batchId}"`)}&pageSize=100`,
  )) as { records?: { id: string; fields?: Record<string, unknown> }[] };
  const lines = lineData.records ?? [];
  if (lines.length === 0) return { success: false, error: "투입 라인이 없습니다." };
  const costInputs = lines.map((l) => ({
    perBoxCost: num(l.fields?.["원물박스당원가"]),
    boxes: num(l.fields?.["투입박스"]),
  }));

  const basis: RateBasis = selectName(b["기준"]) === "산출kg당" ? "산출kg당" : "투입kg당";
  const feeUnit =
    input.feeUnitOverride != null && input.feeUnitOverride >= 0
      ? input.feeUnitOverride
      : num(b["임가공단가"]);
  const cost = calculateProcessingCost({
    inputs: costInputs,
    processingFeeUnit: feeUnit,
    basis,
    inputTotalKg: num(b["투입총kg"]),
    outputTotalKg: input.outputTotalKg,
    outputBoxes: input.outputBoxes,
  });

  const pm = await fetchRecord(PRODUCT, productId);
  const productCode = str(pm?.["품목코드"]) || "NOCODE";
  const productName = str(pm?.["품목명"]);
  const productOrigin = str(pm?.["원산지"]);

  // 규격 = 산출 총중량 / 산출 박스 (실측 평균 박스당 kg)
  const specKg = Math.round((input.outputTotalKg / input.outputBoxes) * 10) / 10;
  const spec = (input.spec ?? "").trim() || String(specKg);
  const misu = (input.misu ?? "").trim();

  const lotNumber = await generateUniqueLotNumber((seq) =>
    buildLotNumber({ bizDate: completedDate, productCode, spec, misu, seq }),
  );

  const stRec = await fetchRecord(STORAGE, input.restorageId);
  const restorageName = str(stRec?.["보관처명"]);

  try {
    // 가공품 입고관리 행 — 비고="가공 입고"(매입 통계 제외)
    const inbound = await createRecord(INBOUND, {
      입고일: completedDate,
      규격: spec,
      미수: misu,
      입고수량: input.outputBoxes,
      잔여수량: input.outputBoxes,
      수매가: 0, // 가공품 재입고는 '매입' 아님 → 매입 집계 0 기여(이중계상 방지). 원가는 LOT.수매가 보유.
      원산지: productOrigin,
      승인상태: "승인 완료",
      비고: "가공 입고",
      품목마스터: [productId],
      보관처: [input.restorageId],
      ...(isRec(adminWorkerId) && { 작업자: [adminWorkerId] }),
    });
    if (!inbound?.id) return { success: false, error: "가공품 입고관리 생성 실패" };

    const lotFields: Record<string, unknown> = {
      LOT번호: lotNumber,
      입고관리링크: [inbound.id],
      재고수량: input.outputBoxes,
      "입고수량(BOX)": input.outputBoxes,
      규격: spec,
      미수: misu,
      수매가: cost.costPerBox, // 가공원가 박스당 = 새 cost basis
      품목마스터: [productId],
      ...(productName && { 품목명: productName }),
      ...(productOrigin && { 원산지: productOrigin }),
      보관처: [input.restorageId],
      최초입고일: completedDate,
      이동입고일: completedDate,
      이월냉장료: 0,
      이월입출고비: 0,
      이월노조비: 0,
      이월동결비: 0,
      승인상태: "승인 완료",
      상태: "승인 완료",
      상태사유: "가공 입고",
      결정일시: new Date().toISOString(),
      ...(isRec(adminWorkerId) && { 결정자: [adminWorkerId] }),
    };
    if (restorageName) {
      try {
        const sc = await getStorageCostForLot(restorageName, completedDate);
        if (sc?.refrigerationFee != null) lotFields["냉장료단가"] = sc.refrigerationFee;
        if (sc?.inOutFee != null) lotFields["입출고비"] = sc.inOutFee;
        if (sc?.unionFee != null) lotFields["노조비"] = sc.unionFee;
        // 동결비: 가공품은 가공공장에서 이미 동결돼 재입고 → 재입고처 동결비 미부과(이중 방지)
      } catch (e) {
        logWarn(`[${TAG}] 재입고 보관처 비용 조회 실패(계속):`, e);
      }
    }
    const lot = await createRecord(LOT, lotFields);
    if (!lot?.id) return { success: false, error: "가공품 LOT 생성 실패" };

    await patchRecord(AIRTABLE_TABLE.processingBatch, input.batchId, {
      상태: "완료",
      완료일: completedDate,
      산출총중량kg: input.outputTotalKg,
      산출박스: input.outputBoxes,
      가공품LOT: [lot.id],
      임가공비총액: cost.processingFeeTotal,
      가공원가총액: cost.processingCostTotal,
      ...(feeUnit !== num(b["임가공단가"]) && { 임가공단가: feeUnit }),
    });

    revalidatePath(PATH);
    return { success: true, data: { lotId: lot.id, lotNumber, costPerBox: cost.costPerBox } };
  } catch (e) {
    logError(`[${TAG}] 가공 완료 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "가공 완료 실패" };
  }
}

// ── ⑤ 가공 취소/반려 ─────────────────────────────────────────────────────────
export async function cancelProcessingBatch(
  adminWorkerId: string,
  batchId: string,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  if (!batchId) return { success: false, error: "가공 거래가 지정되지 않았습니다." };

  const b = await fetchRecord(AIRTABLE_TABLE.processingBatch, batchId);
  if (!b) return { success: false, error: "가공 거래를 찾을 수 없습니다." };
  const status = selectName(b["상태"]);
  if (status === "취소") return { success: false, error: "이미 취소된 가공입니다." };

  const lineData = (await fetchAirtable(
    `${INPUT}?filterByFormula=${encodeURIComponent(`{가공거래ID}="${batchId}"`)}&pageSize=100`,
  )) as { records?: { id: string; fields?: Record<string, unknown> }[] };
  const lines = lineData.records ?? [];

  const outputLotId = firstLink(b["가공품LOT"]);
  // 완료 가공 취소 가드: 가공품 LOT이 미판매·미재가공이어야 함
  if (status === "완료" && outputLotId) {
    const outLot = await fetchRecord(LOT, outputLotId);
    if (num(outLot?.["재고수량"]) !== num(outLot?.["입고수량(BOX)"])) {
      logWarn(
        `[${TAG}] [INTEGRITY-ALERT] 완료 가공 취소 차단 — 가공품 일부 출고/재가공 (배치 ${batchId})`,
      );
      return {
        success: false,
        error: "가공품이 이미 출고·재가공돼 취소할 수 없습니다. 수동 보정이 필요합니다.",
      };
    }
  }

  try {
    // 원물 복구
    for (const l of lines) {
      const f = l.fields ?? {};
      const lotId = firstLink(f["원물LOT"]);
      const boxes = num(f["투입박스"]);
      if (!lotId || boxes <= 0) continue;
      const lotRec = await fetchRecord(LOT, lotId);
      if (!lotRec) continue;
      const patch: Record<string, unknown> = { 재고수량: num(lotRec["재고수량"]) + boxes };
      if (selectName(lotRec["상태"]) === "소진" && selectName(lotRec["상태사유"]) === "가공 투입") {
        patch["상태"] = "승인 완료";
        patch["상태사유"] = "신규 입고"; // 원래 사유 미보존 → 승인 완료로 환원
      }
      await patchRecord(LOT, lotId, patch);
      const inbId = firstLink(lotRec["입고관리링크"]);
      if (inbId) {
        const inb = await fetchRecord(INBOUND, inbId);
        await patchRecord(INBOUND, inbId, { 잔여수량: num(inb?.["잔여수량"]) + boxes });
      }
    }

    // 완료였으면 가공품 LOT·입고관리 soft delete
    if (status === "완료" && outputLotId) {
      const outLot = await fetchRecord(LOT, outputLotId);
      await patchRecord(LOT, outputLotId, {
        재고수량: 0,
        승인상태: "취소",
        상태: "취소",
        상태사유: "수동 취소",
      });
      const outInb = firstLink(outLot?.["입고관리링크"]);
      if (outInb) await patchRecord(INBOUND, outInb, { 잔여수량: 0, 승인상태: "취소" });
    }

    await patchRecord(AIRTABLE_TABLE.processingBatch, batchId, { 상태: "취소" });
    revalidatePath(PATH);
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] [INTEGRITY-ALERT] 가공 취소 실패 (배치 ${batchId}):`, e);
    return { success: false, error: e instanceof Error ? e.message : "가공 취소 실패" };
  }
}

// ── 조회 (재공품 뷰 + 이력) ──────────────────────────────────────────────────
export async function listProcessingBatches(
  adminWorkerId: string,
): Promise<Result<ProcessingBatchSummary[]>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  try {
    const items: ProcessingBatchSummary[] = [];
    let offset: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      const data = (await fetchAirtable(`${BATCH}?${params}`)) as {
        records?: { id: string; fields?: Record<string, unknown> }[];
        offset?: string;
      };
      for (const r of data.records ?? []) {
        const f = r.fields ?? {};
        const outBoxes = num(f["산출박스"]);
        const total = num(f["가공원가총액"]);
        items.push({
          id: r.id,
          date: str(f["가공일"]),
          factoryId: firstLink(f["가공공장"]),
          factoryName: str(f["가공공장명"]),
          productId: firstLink(f["가공품"]),
          freezeType: selectName(f["동결방식"]),
          basis: selectName(f["기준"]),
          status: selectName(f["상태"]),
          outputBoxes: outBoxes,
          outputTotalKg: num(f["산출총중량kg"]),
          processingCostTotal: total,
          costPerBox: outBoxes > 0 ? Math.round(total / outBoxes) : 0,
          completedDate: str(f["완료일"]),
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
