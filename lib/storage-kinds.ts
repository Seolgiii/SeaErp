/**
 * 보관처 마스터 `구분` singleSelect 값.
 *
 * lib/storage.ts(server-only)에도 동일 타입이 있지만, client component(보관처 마스터
 * 페이지·모달)에서도 import 필요해 별도 분리. 두 곳 모두 같은 4값을 참조한다.
 *
 * 입출고증 발행 분기는 lib/storage.ts:isOwnStorage 참조.
 */
export const STORAGE_KINDS = ["자사창고", "외부창고", "가공공장", "기타"] as const;

export type StorageKind = (typeof STORAGE_KINDS)[number];
