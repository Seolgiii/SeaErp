/**
 * 보관처 마스터 `구분` singleSelect 값.
 *
 * lib/storage.ts(server-only)에도 동일 타입이 있지만, client component(보관처 마스터
 * 페이지·모달)에서도 import 필요해 별도 분리. 두 곳 모두 같은 3값을 참조한다.
 *
 * 입출고증 발행 분기는 lib/storage.ts:isOwnStorage 참조.
 *
 * 2026-07-28: '기타'를 없애고 **구분을 필수 입력**으로 바꿨다(Airtable 선택지에서도 제거).
 * 모든 보관처가 세 값 중 하나를 갖는다는 전제 위에 보관처 마스터 화면이 3덩어리로 나뉜다.
 */
export const STORAGE_KINDS = ["자사창고", "외부창고", "가공공장"] as const;

export type StorageKind = (typeof STORAGE_KINDS)[number];
