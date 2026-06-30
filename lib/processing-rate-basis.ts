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
