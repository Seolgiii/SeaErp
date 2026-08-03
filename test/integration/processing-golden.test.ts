import { describe, expect, test } from "vitest";
import type { AirtableRecord } from "./airtable-store";
import { store } from "./airtable-store";
import {
  ALL_MASTERS,
  STORAGE_HANRIM,
  STORAGE_OWN,
  STORAGE_PROCESSING,
  WORKER_ADMIN,
  makeApprovedInboundRecord,
  makeInStockLot,
} from "./fixtures";

/**
 * 가공(변환) 거래 골든패스 — N개 원물 LOT → 가공품 1종, 2단계 WIP.
 *
 * 시나리오:
 *   원물 고등어 2 LOT(박스당 50,000 ×40 / 52,000 ×20, 비용필드 0)을 가공공장A로
 *   ㉠투입(30 + 20박스) → 상태=가공 중, 원물 차감.
 *   ㉡완료(산출 35박스 = 350kg, 수율) → 가공품 LOT 생성, 가공원가 롤업.
 *
 *   임가공비: ONE-Frozen 투입kg당 1,000원. 투입 550kg(50박스×11kg).
 *   투입원물원가합 = 50,000×30 + 52,000×20 = 2,540,000
 *   임가공비총액   = 1,000 × 550 = 550,000
 *   가공원가총액   = 3,090,000 → 박스당 round(3,090,000/35) = 88,286
 */

const PRODUCT_FILLET: AirtableRecord = {
  id: "recPRODUCTFILLET1",
  fields: { 품목명: "고등어살", 품목코드: "MA3", 품목구분: "필렛", 원산지: "국내산" },
};

const RATE: AirtableRecord = {
  id: "recRATEPROC00001",
  fields: {
    가공공장명: "가공공장A",
    가공공장: [STORAGE_PROCESSING.id],
    가공품: [PRODUCT_FILLET.id],
    단가: 1000,
    기준: "투입kg당",
    적용시작일: "2026-01-01",
    적용종료일: "",
  },
};

function seedBase() {
  store.seed("사용자", ALL_MASTERS.workers);
  store.seed("품목마스터", [...ALL_MASTERS.products, PRODUCT_FILLET]);
  store.seed("보관처 마스터", [...ALL_MASTERS.storages, STORAGE_PROCESSING, STORAGE_OWN]);
  store.seed("보관처 비용 이력", [
    ...ALL_MASTERS.storageCosts,
    {
      id: "recSTGCOSTOWNA001",
      fields: {
        보관처명: "자사제1냉동",
        적용시작일: "2026-01-01",
        적용종료일: "",
        냉장료: 1500,
        입출고비: 500,
        노조비: 200,
        동결비: 300,
      },
    },
  ]);
  store.seed("가공비 단가", [RATE]);

  const inboundA = makeApprovedInboundRecord({
    id: "recINBPROCA0001",
    lotNumber: "260415-MC1-11-26-0001",
    qty: 40,
    remaining: 40,
    storageId: STORAGE_HANRIM.id,
  });
  const inboundB = makeApprovedInboundRecord({
    id: "recINBPROCB0001",
    lotNumber: "260415-MC1-11-26-0002",
    qty: 20,
    remaining: 20,
    storageId: STORAGE_HANRIM.id,
  });
  // 비용필드 0 → 박스당 재고원가 = 수매가 (테스트 단순화)
  const lotA = makeInStockLot({
    id: "recLOTPROCA0001",
    lotNumber: "260415-MC1-11-26-0001",
    stockQty: 40,
    inboundRecordId: inboundA.id,
    storageId: STORAGE_HANRIM.id,
    purchasePrice: 50000,
    refrigerationFeePerUnit: 0,
    inOutFee: 0,
    unionFee: 0,
    freezeFee: 0,
  });
  const lotB = makeInStockLot({
    id: "recLOTPROCB0001",
    lotNumber: "260415-MC1-11-26-0002",
    stockQty: 20,
    inboundRecordId: inboundB.id,
    storageId: STORAGE_HANRIM.id,
    purchasePrice: 52000,
    refrigerationFeePerUnit: 0,
    inOutFee: 0,
    unionFee: 0,
    freezeFee: 0,
  });
  store.seed("입고 관리", [inboundA, inboundB]);
  store.seed("LOT별 재고", [lotA, lotB]);
  return { inboundA, inboundB, lotA, lotB };
}

const batchInput = (lotA: AirtableRecord, lotB: AirtableRecord) => ({
  date: "2026-04-15",
  factoryId: STORAGE_PROCESSING.id,
  factoryName: "가공공장A",
  productId: PRODUCT_FILLET.id,
  freezeType: "ONE-Frozen" as const,
  inputs: [
    { lotRecordId: lotA.id, boxes: 30 },
    { lotRecordId: lotB.id, boxes: 20 },
  ],
});

describe("가공 거래 골든패스", () => {
  test("㉠투입 → 원물 차감 + 가공 중 / ㉡완료 → 가공품 LOT + 원가 롤업", async () => {
    const { inboundA, inboundB, lotA, lotB } = seedBase();
    const { createProcessingBatch, completeProcessingBatch } = await import(
      "@/app/actions/admin/master-processing"
    );

    // ── ㉠ 가공 투입 ──
    const r1 = await createProcessingBatch(WORKER_ADMIN.id, batchInput(lotA, lotB));
    expect(r1.success).toBe(true);
    if (!r1.success) return;
    const batchId = r1.data.id;

    const batches = store.list("가공 거래");
    expect(batches).toHaveLength(1);
    expect(batches[0].fields.상태).toBe("가공 중");
    expect(batches[0].fields.투입원물원가합).toBe(2_540_000);
    expect(batches[0].fields.투입총kg).toBe(550);

    expect(store.list("가공 투입")).toHaveLength(2);

    // 원물 차감: LOT-A 40→10(부분), LOT-B 20→0(소진)
    expect(store.get("LOT별 재고", lotA.id)!.fields.재고수량).toBe(10);
    const lotBAfter = store.get("LOT별 재고", lotB.id)!.fields;
    expect(lotBAfter.재고수량).toBe(0);
    expect(lotBAfter.상태).toBe("소진");
    expect(lotBAfter.상태사유).toBe("가공 투입");
    expect(store.get("입고 관리", inboundA.id)!.fields.잔여수량).toBe(10);
    expect(store.get("입고 관리", inboundB.id)!.fields.잔여수량).toBe(0);

    // ── ㉡ 가공 완료 ──
    const r2 = await completeProcessingBatch(WORKER_ADMIN.id, {
      batchId,
      outputBoxes: 35,
      outputTotalKg: 350,
      restorageId: STORAGE_OWN.id,
      completedDate: "2026-04-16",
    });
    expect(r2.success).toBe(true);
    if (!r2.success) return;
    expect(r2.data.costPerBox).toBe(88_286); // round(3,090,000 / 35)

    // 가공 거래 완료
    const batch = store.get("가공 거래", batchId)!.fields;
    expect(batch.상태).toBe("완료");
    expect(batch.임가공비총액).toBe(550_000);
    expect(batch.가공원가총액).toBe(3_090_000);
    expect(batch.산출박스).toBe(35);
    expect(batch.산출총중량kg).toBe(350);

    // 가공품 LOT 생성 (상태사유=가공 입고)
    const newLot = store
      .list("LOT별 재고")
      .find((r) => r.fields.상태사유 === "가공 입고");
    expect(newLot).toBeTruthy();
    expect(newLot!.fields.수매가).toBe(88_286); // 가공원가 박스당 = cost basis
    expect(newLot!.fields.재고수량).toBe(35);
    expect(newLot!.fields.보관처).toEqual([STORAGE_OWN.id]);
    expect(newLot!.fields.품목명).toBe("고등어살");
    // 이월비용 0 (보관비 이중계상 방지)
    expect(newLot!.fields.이월냉장료).toBe(0);

    // 가공품 입고관리 — 수매가=0(매입 이중계상 방지), 비고=가공 입고
    const newInbound = store
      .list("입고 관리")
      .find((r) => r.fields.비고 === "가공 입고");
    expect(newInbound).toBeTruthy();
    expect(newInbound!.fields.수매가).toBe(0);
    expect(newInbound!.fields.잔여수량).toBe(35);
  });

  test("⑤ 가공 중 취소 → 원물 복구 + 배치 취소", async () => {
    const { lotA, lotB, inboundA } = seedBase();
    const { createProcessingBatch, cancelProcessingBatch } = await import(
      "@/app/actions/admin/master-processing"
    );

    const r1 = await createProcessingBatch(WORKER_ADMIN.id, batchInput(lotA, lotB));
    expect(r1.success).toBe(true);
    if (!r1.success) return;

    // 투입 후 차감 확인
    expect(store.get("LOT별 재고", lotA.id)!.fields.재고수량).toBe(10);
    expect(store.get("LOT별 재고", lotB.id)!.fields.재고수량).toBe(0);

    const rc = await cancelProcessingBatch(WORKER_ADMIN.id, r1.data.id);
    expect(rc.success).toBe(true);

    // 원물 복구
    expect(store.get("LOT별 재고", lotA.id)!.fields.재고수량).toBe(40);
    const lotBRestored = store.get("LOT별 재고", lotB.id)!.fields;
    expect(lotBRestored.재고수량).toBe(20);
    expect(lotBRestored.상태).toBe("승인 완료"); // 소진→복원
    expect(store.get("입고 관리", inboundA.id)!.fields.잔여수량).toBe(40);
    // 배치 취소
    expect(store.get("가공 거래", r1.data.id)!.fields.상태).toBe("취소");
  });
});
