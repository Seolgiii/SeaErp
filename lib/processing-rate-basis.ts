/**
 * 가공비 단가 '기준' 옵션 (임가공비 청구 단위).
 *
 * 'use server' 파일은 async function만 export 가능하므로, 상수/타입은 여기로 분리해
 * 서버 액션과 client 화면 양쪽에서 직접 쓴다. (STORAGE_KINDS / MATERIAL_SECTIONS 패턴)
 *
 * - 투입kg당 = ONE-Frozen(제주 가공) 청구 기준
 * - 산출kg당 = TWO-Frozen(부산·해외 가공) 청구 기준
 */
export const RATE_BASES = ["투입kg당", "산출kg당"] as const;
export type RateBasis = (typeof RATE_BASES)[number];

/**
 * 화면 표시 라벨 (2026-08-03).
 *
 * 위 배열은 **Airtable singleSelect 저장값**이라 못 바꾼다 — Update field API가
 * select choices 수정을 지원하지 않고, 기존 레코드가 전부 옛 값을 들고 있다.
 * 그래서 DESIGN.md §8-2 원칙대로 **저장값은 그대로 두고 라벨만** 여기서 갈아끼운다.
 *
 * ⚠ '산출kg당'은 아직 옛 표기 그대로다. 사용자가 '투입kg당'만 지목했다.
 *   같은 컬럼에 두 표기법이 섞여 있으니(원물 중량 기준 / 산출kg당) 짝을 맞추려면
 *   '가공품 중량 기준' 같은 대응어를 정해야 한다 — 확인 후 반영할 것.
 */
export const RATE_BASIS_LABEL: Record<RateBasis, string> = {
  투입kg당: "원물 중량 기준",
  산출kg당: "산출kg당",
};

/** 저장값 → 화면 라벨. 사전에 없는 값(옛 데이터·오타)은 그대로 통과시킨다. */
export function rateBasisLabel(basis: string): string {
  return RATE_BASIS_LABEL[basis as RateBasis] ?? basis;
}
