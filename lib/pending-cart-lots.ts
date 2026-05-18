/**
 * 재고 조회 → 재고 이동/물품 출고 카트형 페이지로 LOT을 핸드오프할 때 사용.
 * sessionStorage 기반 — 페이지 navigation 후 1회 읽고 비우는 단방향 채널.
 *
 * status 페이지의 BulkSubmitSheet(동일 보관처/판매처로 일괄 처리) 제거 결정
 * 이후 도입. 카트 페이지에서 LOT마다 다른 보관처/판매처를 줄 수 있게 함.
 */

export const PENDING_TRANSFER_LOTS_KEY = 'seaerp:pending-transfer-lots';
export const PENDING_OUTBOUND_LOTS_KEY = 'seaerp:pending-outbound-lots';

export type PendingCartLot = {
  lotRecordId: string;
  lotNumber: string;
  productName: string;
  spec: string;
  misu: string;
  stockQty: number;
  /** 재고 조회에서 사용자가 입력한 박스 수량 (이동/출고 수량의 기본값) */
  quantity: number;
  /** 출고 페이지에서 사용 (transfer는 무시) */
  origin?: string;
  /** 향후 사용 가능성 대비 */
  inboundRecordId?: string;
};

export function readPendingCartLots(key: string): PendingCartLot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return [];
    window.sessionStorage.removeItem(key);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is PendingCartLot => {
      return (
        typeof p === 'object' &&
        p !== null &&
        typeof p.lotRecordId === 'string' &&
        typeof p.lotNumber === 'string' &&
        typeof p.quantity === 'number' &&
        Number.isFinite(p.quantity) &&
        p.quantity > 0
      );
    });
  } catch {
    return [];
  }
}

export function writePendingCartLots(key: string, lots: PendingCartLot[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(lots));
  } catch {
    /* quota 초과 등은 무시 — fallback은 사용자가 카트 페이지에서 수동 검색 */
  }
}
