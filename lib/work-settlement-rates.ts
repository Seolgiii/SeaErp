// ─────────────────────────────────────────────────────────────────────────────
// 작업 정산 — 작업비 기본 단가 (v1 하드코딩)
//
// 설계 docs/작업정산등록-설계.md §4-D. v17 목업에서 확정한 기본 단가를 코드 상수로 둔다.
// 폼이 이 값을 읽어 작업비 라인의 단가·회수·금액을 자동 채운다(매 정산 그 자리서 수정 가능).
//
// v1은 하드코딩, 차후 '작업 경비 단가' 마스터(가공비 단가 패턴)로 승격 예정.
// ※ 동결비·입출고비는 여기 없다 — 기존 '보관처 비용 이력'(동결비 팬/베이트大/베이트小 + 입출고비)에서
//    행선지 보관처 선택 시 자동 조회한다. 운임·기타는 그때그때 수동 추가(고정 단가 없음).
// ─────────────────────────────────────────────────────────────────────────────

import { STORAGE_COST_FIELDS } from "./airtable-schema";

export type WorkCostGroup =
  | "수수료"
  | "노임"
  | "운임"
  | "동결비"
  | "입출고비"
  | "박스"
  | "내피"
  | "탈펜료"
  | "기타";

/** 생산내역 '구분'(박스종류) — 동결비/박스/탈펜료 회수 자동연동 키 */
export type BoxType = "사료팬" | "베이트大" | "베이트小";

/** 회수(수량) 자동 연동 소스 */
export type AutoCountSource =
  | { kind: "boxType"; boxType: BoxType } // 생산내역 구분별 박스수 합
  | { kind: "totalBoxes" } // 전체 박스수 합
  | { kind: "workHours" } // 종료−시작(작업시간, 시간)
  | { kind: "none" }; // 수동 입력

export type WorkCostRate = {
  group: WorkCostGroup;
  itemName: string;
  /** 회수당 기본 단가(원). 수수료(percentOfCatch)는 0. */
  unitPrice: number;
  /** 회수 단위 표기 */
  basis: "박스" | "일" | "시간" | "건" | "%";
  /** 회수 자동 연동 */
  autoCount: AutoCountSource;
  /** 금액을 회수×단가로 확정하지 않고 관리자가 조정하는 항목(노임·교통비). UI 힌트. */
  amountManual?: boolean;
  /** 어대금 대비 비율. 있으면 금액 = 어대금 × percentOfCatch. */
  percentOfCatch?: number;
  /** 기본 지급처 */
  payee?: string;
  /** 기본 비고 */
  memo?: string;
};

/** 어대금 대비 수수료율(3.3%). */
export const COMMISSION_RATE = 0.033;

/**
 * 생산내역 구분(박스종류) → '보관처 비용 이력' 동결비 컬럼명.
 * 동결비는 박스재료비(위 하드코딩)와 달리 **보관처마다 단가가 달라** 하드코딩하지 않고,
 * 지급처(행선지) 보관처의 이 컬럼에서 읽는다. 예: 베이트大 라인 → '동결비 (베이트大)' × 베이트大 박스수.
 * 입출고비는 박스종류 무관 단일 단가(STORAGE_COST_FIELDS.inOutFee).
 * (Phase 3 서버 액션에서 지급처 보관처의 보관처 비용 이력을 조회해 동결비 라인 자동 생성)
 */
export const FREEZE_FEE_COLUMN: Record<BoxType, string> = {
  사료팬: STORAGE_COST_FIELDS.freezeFeePan,
  베이트大: STORAGE_COST_FIELDS.freezeFeeBaitLarge,
  베이트小: STORAGE_COST_FIELDS.freezeFeeBaitSmall,
};

/**
 * 작업비 기본 단가 표 (v17 확정). 폼 진입 시 이 목록으로 작업비 라인을 자동 구성.
 * 운임·동결비·입출고비·기타는 여기 없음(§ 위 주석).
 */
export const DEFAULT_WORK_COST_RATES: readonly WorkCostRate[] = [
  // 수수료 — 어대금 × 3.3%
  { group: "수수료", itemName: "수수료", unitPrice: 0, basis: "%", autoCount: { kind: "none" }, percentOfCatch: COMMISSION_RATE, memo: "어대금의 3.3%" },
  // 노임 — 금액 수동(관리자 조정). 여는 회수=작업시간 자동.
  { group: "노임", itemName: "노임(남)", unitPrice: 150_000, basis: "일", autoCount: { kind: "none" }, amountManual: true },
  { group: "노임", itemName: "노임(여)", unitPrice: 15_000, basis: "시간", autoCount: { kind: "workHours" }, amountManual: true },
  { group: "노임", itemName: "노임(현장)", unitPrice: 150_000, basis: "일", autoCount: { kind: "none" }, amountManual: true },
  // 박스 — 구분별 박스수 자동
  { group: "박스", itemName: "펜사용료", unitPrice: 350, basis: "박스", autoCount: { kind: "boxType", boxType: "사료팬" } },
  { group: "박스", itemName: "박스(大)", unitPrice: 1_100, basis: "박스", autoCount: { kind: "boxType", boxType: "베이트大" } },
  { group: "박스", itemName: "박스(小)", unitPrice: 900, basis: "박스", autoCount: { kind: "boxType", boxType: "베이트小" } },
  // 탈펜료 — 구분별 박스수 자동
  { group: "탈펜료", itemName: "탈펜료(팬)", unitPrice: 350, basis: "박스", autoCount: { kind: "boxType", boxType: "사료팬" } },
  { group: "탈펜료", itemName: "탈펜료(大)", unitPrice: 350, basis: "박스", autoCount: { kind: "boxType", boxType: "베이트大" } },
  { group: "탈펜료", itemName: "탈펜료(小)", unitPrice: 200, basis: "박스", autoCount: { kind: "boxType", boxType: "베이트小" } },
  // 내피 — 전체 박스
  { group: "내피", itemName: "내피", unitPrice: 170, basis: "박스", autoCount: { kind: "totalBoxes" } },
  // 작업장수수료 — 전체 박스, 지급처 센터
  { group: "기타", itemName: "작업장수수료", unitPrice: 2_000, basis: "박스", autoCount: { kind: "totalBoxes" }, payee: "센터" },
];

/** 작업비 기본 라인 구성에 필요한 생산내역 맥락. */
export type WorkCostContext = {
  /** 구분별 박스수 합 */
  boxesByType: Record<BoxType, number>;
  /** 전체 박스수 합 */
  totalBoxes: number;
  /** 어대금(원) */
  catchAmount: number;
  /** 작업시간(시간) = 종료−시작 */
  workHours: number;
};

/** 자동 연동된 회수 값. 수동 소스는 0. */
export function resolveCount(rate: WorkCostRate, ctx: WorkCostContext): number {
  switch (rate.autoCount.kind) {
    case "boxType":
      return ctx.boxesByType[rate.autoCount.boxType] || 0;
    case "totalBoxes":
      return ctx.totalBoxes || 0;
    case "workHours":
      return ctx.workHours || 0;
    default:
      return 0;
  }
}

/** 폼에 채울 작업비 라인 초안(단가·회수·금액·지급처·비고 프리필). */
export type WorkCostLineDraft = {
  group: WorkCostGroup;
  itemName: string;
  count: number;
  unitPrice: number;
  amount: number;
  payee: string;
  memo: string;
  amountManual: boolean;
};

/** 단일 rate → 라인 초안. 금액 = 어대금×비율(수수료) 또는 회수×단가. */
export function buildWorkCostLineDraft(
  rate: WorkCostRate,
  ctx: WorkCostContext,
): WorkCostLineDraft {
  const count = resolveCount(rate, ctx);
  const amount =
    rate.percentOfCatch != null
      ? Math.round(ctx.catchAmount * rate.percentOfCatch)
      : Math.round(count * rate.unitPrice);
  return {
    group: rate.group,
    itemName: rate.itemName,
    count,
    unitPrice: rate.unitPrice,
    amount,
    payee: rate.payee ?? "",
    memo: rate.memo ?? "",
    amountManual: rate.amountManual ?? false,
  };
}

/**
 * 기본 작업비 라인 목록.
 * 자동 회수(박스/탈펜료 등)가 0인 라인은 생략(해당 구분 박스가 없음),
 * 단 수동(노임)·비율(수수료) 라인은 항상 포함(관리자가 금액 채움).
 */
export function buildDefaultWorkCostLines(ctx: WorkCostContext): WorkCostLineDraft[] {
  return DEFAULT_WORK_COST_RATES.map((r) => buildWorkCostLineDraft(r, ctx)).filter(
    (l) => l.amountManual || l.memo.includes("어대금") || l.count > 0,
  );
}
