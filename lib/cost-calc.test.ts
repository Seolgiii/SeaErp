import { describe, expect, test } from "vitest";
import {
  calculateLotCostBasis,
  calculateOutboundCost,
  calculateProcessingCost,
  calculateTransferPricing,
  daysBetween,
} from "./cost-calc";

// ─────────────────────────────────────────────────────────────────────────────
// 단위 규약 (C안 + 동결비 특례)
//
//   박스당:  수매가, 입출고비, 노조비, 동결비, 냉장료단가, 박스당누적냉장료
//   총액:    이월냉장료, 이월입출고비, 이월노조비, 이월동결비
//   원/kg:   단가(출고시점 단가)
//   총액(원): 출고시점 냉장료/입출고비/노조비/동결비/판매원가/판매금액/손익
//
// 이월 → 박스당 환산: 이월X / 입고박스수
// 박스당 → 총액 환산: 박스당X × 박스수
// ─────────────────────────────────────────────────────────────────────────────

describe("daysBetween", () => {
  test("같은 날 → 0일", () => {
    expect(daysBetween("2026-04-10", "2026-04-10")).toBe(0);
  });

  test("정상 케이스 — 출고일이 입고일보다 뒤", () => {
    expect(daysBetween("2026-04-10", "2026-04-15")).toBe(5);
    expect(daysBetween("2026-04-01", "2026-05-01")).toBe(30);
  });

  test("출고일이 입고일보다 앞 → 0으로 클램프 (음수 방지)", () => {
    expect(daysBetween("2026-04-15", "2026-04-10")).toBe(0);
  });

  test("빈 문자열 → 0", () => {
    expect(daysBetween("", "2026-04-15")).toBe(0);
    expect(daysBetween("2026-04-10", "")).toBe(0);
  });

  test("형식 오류 → 0", () => {
    expect(daysBetween("invalid", "2026-04-15")).toBe(0);
    expect(daysBetween("2026-04-10", "not-a-date")).toBe(0);
  });
});

describe("calculateOutboundCost", () => {
  /**
   * 시나리오: 한림 10박스 입고, 박스당 50000원 수매가, 박스당무게 10kg.
   * 한림 보관처 비용: 냉장료 1500/박스/일, 입출고비 400/박스, 노조비 300/박스, 동결비 200/박스.
   * 5일 보관 후 3박스 출고. 판매가 60000원/박스. 이월 비용 없음 (원본 LOT).
   */
  const baseInput = {
    purchasePrice: 50_000,        // 50000원/박스
    totalWeight: 100,             // 10박스 × 10kg
    inboxQty: 10,                 // 입고 10박스
    refrigerationFeePerUnit: 1_500, // 1500원/박스/일
    inOutFee: 400,                // 400원/박스
    unionFee: 300,
    freezeFee: 200,
    carriedRefrigeration: 0,
    carriedInOutFee: 0,
    carriedUnionFee: 0,
    carriedFreezeFee: 0,
    saleAmount: 180_000,          // 60000 × 3박스
    inboundDate: "2026-05-01",
    outboundDate: "2026-05-06",   // 5일 보관
    outQty: 3,                    // 3박스 출고
  };

  test("원본 LOT 정상 출고 — 박스당 비용에 출고박스수 곱해 총액으로 변환", () => {
    const r = calculateOutboundCost(baseInput);
    // 단가 = 50000원/박스 ÷ 10kg/박스 = 5000원/kg
    expect(r.unitCost).toBe(5_000);
    expect(r.daysHeld).toBe(5);
    // 박스당 누적냉장료 = 1500 × 5일 = 7500원/박스
    // 출고박스수(3) × 7500 + 이월냉장료(0) × ratio = 22500원
    expect(r.refrigerationCost).toBe(22_500);
    expect(r.inOutFee).toBe(1_200);   // 400 × 3
    expect(r.unionFee).toBe(900);     // 300 × 3
    expect(r.freezeFee).toBe(600);    // 200 × 3
    // 매입원가(50000×3=150000) + 22500 + 1200 + 900 + 600 = 175200
    expect(r.totalCost).toBe(175_200);
    expect(r.profit).toBe(180_000 - 175_200); // 4800원
  });

  test("이월 4개 포함 — 총액을 출고박스/입고박스 비율로 분할", () => {
    // 시나리오: 0180에서 5박스를 0181로 옮긴 LOT (입고박스수=5)에서 3박스 출고.
    // 이월 4개 (총액)는 입고박스수(5) 기준 → 출고박스수(3) 만큼 비례 차감.
    const r = calculateOutboundCost({
      ...baseInput,
      inboxQty: 5,                  // 이동된 LOT
      totalWeight: 50,              // 5박스 × 10kg
      saleAmount: 180_000,
      outQty: 3,                    // 5박스 중 3박스 출고
      // 이월 (0180에서 5박스 cost basis 옮겨옴)
      carriedRefrigeration: 22_500, // 0180에서 발생한 5박스 냉장료 총액
      carriedInOutFee: 2_000,       // 0180 입출고비 × 5박스 = 400×5
      carriedUnionFee: 1_500,
      carriedFreezeFee: 1_000,
    });
    // 출고박스/입고박스 = 3/5 = 0.6
    // 박스당 누적냉장료(현재) = 1500 × 5 = 7500. 3박스 × 7500 = 22500
    // 이월냉장료 분할 = 22500 × 0.6 = 13500
    // refrigerationCost = 22500 + 13500 = 36000
    expect(r.refrigerationCost).toBe(36_000);
    // 입출고비: (400 × 3) + (2000 × 0.6) = 1200 + 1200 = 2400
    expect(r.inOutFee).toBe(2_400);
    expect(r.unionFee).toBe(900 + 900);    // (300×3) + (1500×0.6)
    expect(r.freezeFee).toBe(600 + 600);   // (200×3) + (1000×0.6)
    // 매입원가(150000) + 36000 + 2400 + 1800 + 1200 = 191400
    expect(r.totalCost).toBe(191_400);
    expect(r.profit).toBe(180_000 - 191_400);
  });

  test("동결비 특례 LOT 출고 — 박스당 동결비=0, 이월동결비만 cost basis", () => {
    // 시나리오: 이동된 LOT (동결비=0), 이월동결비 1000원 (0180에서 5박스 cost basis)
    const r = calculateOutboundCost({
      ...baseInput,
      inboxQty: 5,
      totalWeight: 50,
      saleAmount: 180_000,
      outQty: 3,
      freezeFee: 0,                 // 동결비 특례
      carriedFreezeFee: 1_000,      // 0180 cost basis 보존
    });
    // 동결비: (0 × 3) + (1000 × 0.6) = 600 ← 이월동결비만 반영
    expect(r.freezeFee).toBe(600);
  });

  test("총중량 0 → 단가 0 (division-by-zero 방지)", () => {
    const r = calculateOutboundCost({ ...baseInput, totalWeight: 0 });
    expect(r.unitCost).toBe(0);
  });

  test("입고박스수 0 → 이월 분할 0 (division-by-zero 방지)", () => {
    const r = calculateOutboundCost({
      ...baseInput,
      inboxQty: 0,
      carriedInOutFee: 5_000,
    });
    // 이월 분할 시 분모 0이면 0 처리
    // 현재 보관처 비용(× outQty)은 그대로
    expect(r.inOutFee).toBe(400 * 3);   // 박스당 × 출고박스만 반영
  });

  test("냉장료단가 0 → 박스당 냉장료 0, 이월냉장료만 반영", () => {
    const r = calculateOutboundCost({
      ...baseInput,
      refrigerationFeePerUnit: 0,
      carriedRefrigeration: 6_000,
    });
    // 박스당 누적(0) × outQty(3) + 이월(6000) × 3/10 = 0 + 1800 = 1800
    expect(r.refrigerationCost).toBe(1_800);
  });

  test("출고일이 입고일보다 앞 → 보관일수 0", () => {
    const r = calculateOutboundCost({
      ...baseInput,
      inboundDate: "2026-05-15",
      outboundDate: "2026-05-10",
    });
    expect(r.daysHeld).toBe(0);
    expect(r.refrigerationCost).toBe(0); // 박스당 누적 0, 이월 0
  });

  test("판매금액 < 판매원가 → 손익 음수", () => {
    const r = calculateOutboundCost({ ...baseInput, saleAmount: 100_000 });
    expect(r.profit).toBeLessThan(0);
  });
});

describe("calculateTransferPricing (C안 + 동결비 특례)", () => {
  /**
   * 시나리오: 0180 (한림 10박스, 박스당 50000원) → 0181 (부산 5박스 이동)
   * 0180 보관처 비용: 입출고비 400, 노조비 300, 동결비 200 (모두 박스당)
   * 0180에서 5박스 이동, 당일 이동(누적냉장료 0)
   */
  const fromOriginalLot = {
    purchasePrice: 50_000,            // 박스당
    refrigerationCostAccum: 0,        // 박스당 누적냉장료 (당일 이동)
    inOutFee: 400,                    // 박스당
    unionFee: 300,
    freezeCost: 200,                  // 원본 LOT은 동결비 real
    carriedRefrigeration: 0,
    carriedInOutFee: 0,
    carriedUnionFee: 0,
    carriedFreezeFee: 0,
    sourceInboxQty: 10,               // 0180 입고박스수
    transferQty: 5,                   // 5박스 이동
  };

  test("수매가 박스당 보존 — 비례 분할 X (이전 버그 fix)", () => {
    const r = calculateTransferPricing(fromOriginalLot);
    // 0181 수매가도 50000원/박스 그대로 (이전엔 25000으로 절반화)
    expect(r.newPurchasePrice).toBe(50_000);
  });

  test("D1 — 원본 LOT에서 이동: 이월 4개 = 박스당 × 이동박스수", () => {
    const r = calculateTransferPricing(fromOriginalLot);
    expect(r.newCarriedRefrigeration).toBe(0);          // 당일 이동
    expect(r.newCarriedInOutFee).toBe(2_000);            // 400 × 5
    expect(r.newCarriedUnionFee).toBe(1_500);            // 300 × 5
    expect(r.newCarriedFreezeFee).toBe(1_000);           // 200 × 5 (원본 동결비 cost basis 보존)
  });

  test("D1 — 누적냉장료가 있는 LOT 이동 (3일 보관 후)", () => {
    // 0180에서 3일 보관, 박스당 누적냉장료 = 1500 × 3 = 4500원/박스
    const r = calculateTransferPricing({
      ...fromOriginalLot,
      refrigerationCostAccum: 4_500, // 박스당
    });
    // (4500 + 0/10) × 5 = 22500
    expect(r.newCarriedRefrigeration).toBe(22_500);
  });

  test("D2 — 이동된 LOT에서 재이동 (cost basis 누적)", () => {
    // 시나리오: 0181 (부산 5박스, D1 결과) → 0182 (인천 3박스 이동)
    // 0181: 부산 박스당 비용(350/250/0/1300), 이월(2000/1500/1000/0)
    // 0181이 5일 동안 부산에서 보관 → 박스당 누적냉장료 = 1300 × 5 = 6500
    // 0181 이동 시 transferQty = 3, sourceInboxQty = 5 (0181 입고박스수 = 5)
    const r = calculateTransferPricing({
      purchasePrice: 50_000,
      refrigerationCostAccum: 6_500,    // 박스당 5일치
      inOutFee: 350,                    // 부산 박스당
      unionFee: 250,
      freezeCost: 0,                    // 동결비 특례 (이동된 LOT)
      carriedRefrigeration: 0,          // 당일 이동이라 0
      carriedInOutFee: 2_000,           // 0180에서 끌고 온 cost basis
      carriedUnionFee: 1_500,
      carriedFreezeFee: 1_000,
      sourceInboxQty: 5,
      transferQty: 3,
    });
    // 수매가 보존
    expect(r.newPurchasePrice).toBe(50_000);
    // 입출고비: (350 + 2000/5) × 3 = (350 + 400) × 3 = 750 × 3 = 2250
    expect(r.newCarriedInOutFee).toBe(2_250);
    expect(r.newCarriedUnionFee).toBe(1_650);  // (250 + 1500/5) × 3 = 550 × 3
    // 동결비: (0 + 1000/5) × 3 = 200 × 3 = 600 (원본 동결비 박스당 cost basis 보존)
    expect(r.newCarriedFreezeFee).toBe(600);
    // 냉장료: (6500 + 0/5) × 3 = 6500 × 3 = 19500
    expect(r.newCarriedRefrigeration).toBe(19_500);
  });

  test("D3 — 3단계 이동도 박스당 cost basis 보존", () => {
    // 시나리오: 0182 (인천 3박스, D2 결과) → 0183 (서울 1박스 이동)
    // 0182: 인천 박스당(380/280/0), 이월(2250/1650/600/19500)
    // 당일 이동 가정
    const r = calculateTransferPricing({
      purchasePrice: 50_000,
      refrigerationCostAccum: 0,
      inOutFee: 380,                    // 인천 박스당
      unionFee: 280,
      freezeCost: 0,                    // 동결비 특례
      carriedRefrigeration: 19_500,     // D2에서 누적
      carriedInOutFee: 2_250,
      carriedUnionFee: 1_650,
      carriedFreezeFee: 600,
      sourceInboxQty: 3,
      transferQty: 1,
    });
    // 박스당 누적 입출고비 = 380 + 2250/3 = 380 + 750 = 1130
    // × 이동박스수(1) = 1130
    expect(r.newCarriedInOutFee).toBe(1_130);
    // 박스당 동결비 = 0 + 600/3 = 200 (원본 cost basis 보존 ✓)
    expect(r.newCarriedFreezeFee).toBe(200);
    // 박스당 노조비 = 280 + 1650/3 = 280 + 550 = 830 × 1 = 830
    expect(r.newCarriedUnionFee).toBe(830);
    // 박스당 냉장료 = 0 + 19500/3 = 6500 × 1 = 6500
    expect(r.newCarriedRefrigeration).toBe(6_500);
  });

  test("이동 사이에 출고 끼는 경우 — sourceInboxQty(입고박스수) 분모 사용으로 cost basis 정확", () => {
    // 시나리오: 0181 (5박스 입고) 중 1박스 출고 후 3박스 이동
    // sourceInboxQty = 5 (입고박스수 기준, 출고로 줄어든 재고와 무관)
    const r = calculateTransferPricing({
      purchasePrice: 50_000,
      refrigerationCostAccum: 6_500,
      inOutFee: 350,
      unionFee: 250,
      freezeCost: 0,
      carriedRefrigeration: 0,
      carriedInOutFee: 2_000,
      carriedUnionFee: 1_500,
      carriedFreezeFee: 1_000,
      sourceInboxQty: 5,    // 입고박스수 5 (재고 4박스와 무관)
      transferQty: 3,
    });
    // 분모로 입고박스수(5) 사용 → 박스당 cost basis는 출고와 무관
    expect(r.newCarriedInOutFee).toBe(2_250);   // 동일
    expect(r.newCarriedFreezeFee).toBe(600);    // 동일
  });

  test("전체 이동 (transferQty == sourceInboxQty) — 박스당 cost basis 전체 이전", () => {
    const r = calculateTransferPricing({
      ...fromOriginalLot,
      transferQty: 10,    // 10박스 전체 이동
    });
    expect(r.newPurchasePrice).toBe(50_000);
    expect(r.newCarriedInOutFee).toBe(4_000);   // 400 × 10
    expect(r.newCarriedFreezeFee).toBe(2_000);  // 200 × 10
  });

  test("sourceInboxQty 0 → 모든 결과 0 (division-by-zero 방지)", () => {
    const r = calculateTransferPricing({
      ...fromOriginalLot,
      sourceInboxQty: 0,
    });
    // 박스당 cost basis 계산 불가 (이월 분할 분모 = 0)
    // 박스당 부분(현재 보관처 비용)은 transferQty로 곱하지만 입고박스수 없으면 의미 없음
    expect(r.newCarriedRefrigeration).toBe(0);
    expect(r.newCarriedInOutFee).toBe(0);
    expect(r.newCarriedUnionFee).toBe(0);
    expect(r.newCarriedFreezeFee).toBe(0);
  });

  test("반올림 — 박스당 환산 시 소수 발생해도 정수로", () => {
    // 7박스 입고, 3박스 이동: 이월(1000원) / 7 ≈ 142.857원/박스 × 3 ≈ 428.57
    const r = calculateTransferPricing({
      purchasePrice: 50_000,
      refrigerationCostAccum: 0,
      inOutFee: 0,
      unionFee: 0,
      freezeCost: 0,
      carriedRefrigeration: 0,
      carriedInOutFee: 1_000,
      carriedUnionFee: 0,
      carriedFreezeFee: 0,
      sourceInboxQty: 7,
      transferQty: 3,
    });
    expect(Number.isInteger(r.newCarriedInOutFee)).toBe(true);
    // (0 + 1000/7) × 3 = 3000/7 ≈ 428.57 → 429
    expect(r.newCarriedInOutFee).toBe(429);
  });
});

describe("calculateLotCostBasis", () => {
  const base = {
    purchasePrice: 10_000,
    refrigerationFeePerUnit: 40, // 원/박스/일
    inOutFee: 300,
    unionFee: 140,
    freezeFee: 100,
    carriedRefrigeration: 0,
    carriedInOutFee: 0,
    carriedUnionFee: 0,
    carriedFreezeFee: 0,
    inboxQty: 20,
    inboundDate: "2026-04-01",
    asOfDate: "2026-05-16", // 45일
  };

  test("이동 안 된 LOT — 이월 0, 박스당 분해 합 = 총원가", () => {
    const r = calculateLotCostBasis(base);
    expect(r.daysHeld).toBe(45);
    expect(r.purchasePerBox).toBe(10_000);
    expect(r.refrigerationPerBox).toBe(1_800); // 40 × 45
    expect(r.inOutPerBox).toBe(300);
    expect(r.unionPerBox).toBe(140);
    expect(r.freezePerBox).toBe(100);
    expect(r.carriedPerBox).toBe(0);
    expect(r.totalPerBox).toBe(12_340); // 10000+1800+300+140+100
  });

  test("이동 LOT — 이월(총액) 4종이 입고수량으로 박스당 환산되어 합산", () => {
    const r = calculateLotCostBasis({
      ...base,
      carriedRefrigeration: 2_000,
      carriedInOutFee: 1_000,
      carriedUnionFee: 600,
      carriedFreezeFee: 400, // 합 4000 / 20박스 = 200/박스
    });
    expect(r.carriedPerBox).toBe(200);
    expect(r.totalPerBox).toBe(12_540); // 12340 + 200
  });

  test("totalPerBox는 calculateOutboundCost(전량·오늘).totalCost / 입고수량과 일치", () => {
    const input = {
      ...base,
      carriedRefrigeration: 2_000,
      carriedInOutFee: 1_000,
      carriedUnionFee: 600,
      carriedFreezeFee: 400,
    };
    const basis = calculateLotCostBasis(input);
    const ob = calculateOutboundCost({
      purchasePrice: input.purchasePrice,
      totalWeight: 0, // unitCost는 비교 대상 아님
      inboxQty: input.inboxQty,
      refrigerationFeePerUnit: input.refrigerationFeePerUnit,
      inOutFee: input.inOutFee,
      unionFee: input.unionFee,
      freezeFee: input.freezeFee,
      carriedRefrigeration: input.carriedRefrigeration,
      carriedInOutFee: input.carriedInOutFee,
      carriedUnionFee: input.carriedUnionFee,
      carriedFreezeFee: input.carriedFreezeFee,
      saleAmount: 0,
      inboundDate: input.inboundDate,
      outboundDate: input.asOfDate,
      outQty: input.inboxQty, // 전량
    });
    expect(basis.totalPerBox).toBeCloseTo(ob.totalCost / input.inboxQty, 6);
  });

  test("입고수량 0 — 이월 박스당 환산 분모 0이면 carriedPerBox = 0", () => {
    const r = calculateLotCostBasis({
      ...base,
      inboxQty: 0,
      carriedRefrigeration: 5_000,
    });
    expect(r.carriedPerBox).toBe(0);
    // 박스당 기본 비용은 그대로 (수매가+냉장료+입출고+노조+동결)
    expect(r.totalPerBox).toBe(12_340);
  });

  test("입고일 빈 값 — 보관일수 0 → 냉장료 0", () => {
    const r = calculateLotCostBasis({ ...base, inboundDate: "" });
    expect(r.daysHeld).toBe(0);
    expect(r.refrigerationPerBox).toBe(0);
    expect(r.totalPerBox).toBe(10_540); // 10000+0+300+140+100
  });
});

describe("calculateProcessingCost (가공원가 롤업)", () => {
  // 투입: 고등어 원물 2 LOT (박스당 50,000 ×30 + 52,000 ×20) = 2,540,000원, 50박스=500kg
  // 산출: 고등어필렛 35박스 = 350kg (수율 70%)
  const baseInputs = [
    { perBoxCost: 50_000, boxes: 30 },
    { perBoxCost: 52_000, boxes: 20 },
  ];

  test("ONE-Frozen — 임가공비 투입kg당 (투입 500kg × 1,000원)", () => {
    const r = calculateProcessingCost({
      inputs: baseInputs,
      processingFeeUnit: 1_000,
      basis: "투입kg당",
      inputTotalKg: 500,
      outputTotalKg: 350,
      outputBoxes: 35,
    });
    expect(r.inputMaterialTotal).toBe(2_540_000);
    expect(r.processingFeeTotal).toBe(500_000); // 1000 × 500
    expect(r.processingCostTotal).toBe(3_040_000);
    expect(r.costPerBox).toBe(86_857); // round(3,040,000 / 35)
    expect(r.costPerKg).toBeCloseTo(8_685.71, 1);
  });

  test("TWO-Frozen — 임가공비 산출kg당 (산출 350kg × 1,000원) — ONE보다 저렴", () => {
    const r = calculateProcessingCost({
      inputs: baseInputs,
      processingFeeUnit: 1_000,
      basis: "산출kg당",
      inputTotalKg: 500,
      outputTotalKg: 350,
      outputBoxes: 35,
    });
    expect(r.processingFeeTotal).toBe(350_000); // 1000 × 350
    expect(r.processingCostTotal).toBe(2_890_000);
    expect(r.costPerBox).toBe(82_571); // round(2,890,000 / 35)
  });

  test("수율 손실 — 산출 박스가 투입보다 적어 박스당 원가가 투입 평균보다 높다", () => {
    const r = calculateProcessingCost({
      inputs: baseInputs, // 투입 50박스, 평균 박스당 50,800원
      processingFeeUnit: 0, // 가공비 0 → 순수 수율 효과
      basis: "투입kg당",
      inputTotalKg: 500,
      outputTotalKg: 350,
      outputBoxes: 35,
    });
    expect(r.costPerBox).toBe(72_571); // round(2,540,000 / 35)
    expect(r.costPerBox).toBeGreaterThan(2_540_000 / 50); // > 투입 평균 50,800
  });

  test("산출 박스 0 → 박스당 원가 0 (0 나눗셈 가드)", () => {
    const r = calculateProcessingCost({
      inputs: baseInputs,
      processingFeeUnit: 1_000,
      basis: "투입kg당",
      inputTotalKg: 500,
      outputTotalKg: 0,
      outputBoxes: 0,
    });
    expect(r.costPerBox).toBe(0);
    expect(r.costPerKg).toBe(0);
  });
});
