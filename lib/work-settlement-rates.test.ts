import { describe, expect, test } from "vitest";
import {
  COMMISSION_RATE,
  DEFAULT_WORK_COST_RATES,
  FREEZE_FEE_COLUMN,
  buildDefaultWorkCostLines,
  buildWorkCostLineDraft,
  resolveCount,
  type WorkCostContext,
  type WorkCostRate,
} from "./work-settlement-rates";

const ctx: WorkCostContext = {
  boxesByType: { 사료팬: 30, 베이트大: 20, 베이트小: 0 },
  totalBoxes: 50,
  catchAmount: 10_000_000,
  workHours: 6,
};

describe("resolveCount", () => {
  test("boxType — 구분별 박스수", () => {
    const rate = DEFAULT_WORK_COST_RATES.find((r) => r.itemName === "펜사용료")!;
    expect(resolveCount(rate, ctx)).toBe(30); // 사료팬
  });
  test("totalBoxes — 전체 박스수", () => {
    const rate = DEFAULT_WORK_COST_RATES.find((r) => r.itemName === "내피")!;
    expect(resolveCount(rate, ctx)).toBe(50);
  });
  test("workHours — 작업시간", () => {
    const rate = DEFAULT_WORK_COST_RATES.find((r) => r.itemName === "노임(여)")!;
    expect(resolveCount(rate, ctx)).toBe(6);
  });
  test("none — 수동은 0", () => {
    const rate = DEFAULT_WORK_COST_RATES.find((r) => r.itemName === "노임(남)")!;
    expect(resolveCount(rate, ctx)).toBe(0);
  });
});

describe("buildWorkCostLineDraft", () => {
  test("수수료 — 어대금 × 3.3%", () => {
    const rate = DEFAULT_WORK_COST_RATES.find((r) => r.group === "수수료")!;
    const line = buildWorkCostLineDraft(rate, ctx);
    expect(COMMISSION_RATE).toBe(0.033);
    expect(line.amount).toBe(330_000); // 10,000,000 × 0.033
  });
  test("박스(大) — 회수×단가 자동", () => {
    const rate = DEFAULT_WORK_COST_RATES.find((r) => r.itemName === "박스(大)")!;
    const line = buildWorkCostLineDraft(rate, ctx);
    expect(line.count).toBe(20); // 베이트大
    expect(line.amount).toBe(22_000); // 20 × 1,100
  });
  test("노임(남) — 수동, 회수 0 → 금액 0(관리자 채움)", () => {
    const rate = DEFAULT_WORK_COST_RATES.find((r) => r.itemName === "노임(남)")!;
    const line = buildWorkCostLineDraft(rate, ctx);
    expect(line.amountManual).toBe(true);
    expect(line.count).toBe(0);
    expect(line.amount).toBe(0);
  });
  test("작업장수수료 — 지급처 센터 기본", () => {
    const rate = DEFAULT_WORK_COST_RATES.find((r) => r.itemName === "작업장수수료")!;
    const line = buildWorkCostLineDraft(rate, ctx);
    expect(line.payee).toBe("센터");
    expect(line.amount).toBe(100_000); // 50 × 2,000
  });
});

describe("buildDefaultWorkCostLines", () => {
  test("자동회수 0인 라인은 생략, 수동·비율은 포함", () => {
    const lines = buildDefaultWorkCostLines(ctx);
    const names = lines.map((l) => l.itemName);
    // 베이트小 박스 0 → 박스(小)·탈펜료(小) 생략
    expect(names).not.toContain("박스(小)");
    expect(names).not.toContain("탈펜료(小)");
    // 사료팬/베이트大 있음 → 포함
    expect(names).toContain("펜사용료");
    expect(names).toContain("박스(大)");
    // 수동(노임)·비율(수수료)은 항상 포함
    expect(names).toContain("노임(남)");
    expect(names).toContain("수수료");
  });

  test("동결비는 하드코딩 rate에 없음 (보관처 비용 이력에서 읽음)", () => {
    const names = DEFAULT_WORK_COST_RATES.map((r) => r.group);
    expect(names).not.toContain("동결비");
    expect(names).not.toContain("입출고비");
  });

  test("모든 라인은 유효한 그룹", () => {
    const groups = new Set(DEFAULT_WORK_COST_RATES.map((r: WorkCostRate) => r.group));
    for (const g of groups) {
      expect([
        "수수료",
        "노임",
        "운임",
        "동결비",
        "입출고비",
        "박스",
        "내피",
        "탈펜료",
        "기타",
      ]).toContain(g);
    }
  });
});

describe("FREEZE_FEE_COLUMN — 박스종류별 동결비 컬럼 매핑", () => {
  test("구분 → 보관처 비용 이력 동결비 컬럼", () => {
    expect(FREEZE_FEE_COLUMN["사료팬"]).toBe("동결비 (팬)");
    expect(FREEZE_FEE_COLUMN["베이트大"]).toBe("동결비 (베이트大)");
    expect(FREEZE_FEE_COLUMN["베이트小"]).toBe("동결비 (베이트小)");
  });
});
