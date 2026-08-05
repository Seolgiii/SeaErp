// ─────────────────────────────────────────────────────────────────────────────
// 상태 문자열 단일 정의 — DESIGN.md §8-3
//
// **화면에서 '승인 완료' 같은 리터럴을 직접 비교하지 않는다.**
// 근거: 공백 한 칸 차이(`'승인완료'` vs `'승인 완료'`)가 조용한 오작동을 만든 사례가
// 실제로 2건 있었다(2026-07-28 ApprovalButtons·expense/list — 승인된 지출이 파란 '대기'
// 배지로 표시되고 완료건 가드가 작동하지 않았다. 서버 멱등 가드 덕에 데이터 손상은 없었음).
// 리터럴을 상수로 바꾸면 같은 오타가 **런타임 오작동이 아니라 컴파일 오류**가 된다.
//
// ⚠ 값은 Airtable 옵션 문자열과 **정확히** 일치해야 한다(공백 포함).
//   Airtable에서 옵션명을 바꾸면 여기도 바꾼다. 반대로 여기만 바꾸면 조용히 어긋난다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 결재 워크플로우 상태 (승인상태) — 입고관리·출고관리·지출결의·재고이동·LOT의 `승인상태` 필드.
 *
 * ⚠ **5개 테이블이 같은 어휘를 쓰지 않는다.** 2026-08-05 Airtable 실물 전수 조회 결과,
 *   입고관리·출고관리·재고이동·LOT은 아래 4종이 전부지만 **지출결의만 `최종 승인 대기`가
 *   하나 더 있다**(2단계 결재). 그래서 이 상수만으로는 지출결의를 다 덮지 못한다.
 *   `["승인 대기", "최종 승인 대기"]` 배열이 코드 4곳에 복제돼 있는 이유가 이것이다
 *   (dashboard.ts · admin.ts · approval-card-shared.ts · my-requests/page.tsx).
 *   그 복제를 단일 출처로 합치는 작업은 아직 안 했다 — docs/RISKS.md 12번.
 */
export const APPROVAL_STATUS = {
  PENDING: '승인 대기',
  /** 지출결의 전용 — 2단계 결재의 1차 통과 상태. 다른 4개 테이블에는 이 옵션이 없다. */
  FINAL_PENDING: '최종 승인 대기',
  APPROVED: '승인 완료',
  REJECTED: '반려',
  CANCELED: '취소',
} as const;

/**
 * LOT 라이프사이클 상태 (LOT별 재고.상태).
 * 결재 상태(위)와 축이 다르다 — 이쪽은 재고 그 자체의 생애주기라 '소진'이 있다.
 */
export const LOT_STATUS = {
  PENDING: '승인 대기',
  APPROVED: '승인 완료',
  DEPLETED: '소진',
  REJECTED: '반려',
  CANCELED: '취소',
} as const;

/** LOT 상태사유 (LOT별 재고.상태사유) — 왜 그 상태가 됐는지. */
export const LOT_STATUS_REASON = {
  NEW_INBOUND: '신규 입고',
  TRANSFER_INBOUND: '이동 입고',
  OUTBOUND_DONE: '출고 완료',
  TRANSFER_OUTBOUND: '이동 출고',
  INBOUND_REJECTED: '입고 반려',
  TRANSFER_REJECTED: '이동 반려',
  INBOUND_CANCELED: '입고 취소',
  MANUAL_CANCELED: '수동 취소',
  /** 원물이 가공에 투입돼 소진됨 (상태=소진). master-processing.ts */
  PROCESSING_IN: '가공 투입',
  /** 가공 결과물로 새 LOT이 들어옴 (상태=승인 완료). master-processing.ts */
  PROCESSING_IN_STOCK: '가공 입고',
} as const;

/**
 * 가공 배치 상태 (가공 거래.상태) — 2단계 WIP.
 * 결재 상태가 아니라 가공 작업 자체의 진행 상태다.
 */
export const PROCESSING_STATUS = {
  WIP: '가공 중',
  DONE: '완료',
  CANCELED: '취소',
} as const;

/**
 * 작업 정산 상태 (작업 정산.상태).
 * 임시저장=LOT 미생성 초안 / 확정=입고관리·LOT 생성됨 / 취소.
 */
export const SETTLEMENT_STATUS = {
  DRAFT: '임시저장',
  CONFIRMED: '확정',
  CANCELED: '취소',
} as const;

export type ApprovalStatus = (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];
export type LotStatus = (typeof LOT_STATUS)[keyof typeof LOT_STATUS];
export type LotStatusReason = (typeof LOT_STATUS_REASON)[keyof typeof LOT_STATUS_REASON];
export type ProcessingStatus = (typeof PROCESSING_STATUS)[keyof typeof PROCESSING_STATUS];
export type SettlementStatus = (typeof SETTLEMENT_STATUS)[keyof typeof SETTLEMENT_STATUS];

/**
 * 재고 조회·재고장에서 "정상"으로 취급하는 LOT 상태.
 *
 * 이 판정이 중요한 이유: 재고 조회 표는 **인쇄해서 재고장으로 쓰인다.**
 * 정상이 아닌 LOT이 재고장에 들어가는 것 자체가 오류이므로, 이 컬럼은 상태를
 * 알리는 장치가 아니라 **오류를 잡아내는 장치**다 (DESIGN.md §6-2).
 */
export function isNormalLotStatus(status: string): boolean {
  return status === LOT_STATUS.APPROVED;
}

/**
 * 소진 LOT 화면에서 "정상"으로 취급하는 상태.
 *
 * **화면마다 정상의 뜻이 다르다.** 재고 조회에서는 '승인 완료'가 정상이지만, 소진 LOT
 * 화면에서는 '소진'이 정상이고 반려·취소가 예외다(반려·취소도 soft delete로 재고수량이
 * 0이 되어 같은 목록에 떨어진다). 정상 판정을 화면이 주입하는 이유다.
 *
 * '승인 완료'인데 재고 0인 경우도 정상으로 본다 — 출고 직후 상태 갱신이 아직 안 된 과도기다.
 */
export function isNormalDepletedStatus(status: string): boolean {
  return status === LOT_STATUS.DEPLETED || status === LOT_STATUS.APPROVED;
}
