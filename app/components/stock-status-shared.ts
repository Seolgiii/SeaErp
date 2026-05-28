/**
 * 재고조회(StockStatus) 3단계 분리용 공유 타입·헬퍼.
 * page.tsx + StockStatusForm/Results/Summary 4파일이 함께 사용.
 */

export type Stage = 'form' | 'results' | 'summary';

export type LotRecord = {
  id: string;
  lotNumber: string;
  productName: string;
  spec: string;      // e.g. "11" (kg per box)
  misu: string;      // e.g. "42/44"
  stockQty: number;  // boxes
  salePrice: number; // 원/kg
  origin: string;
  inboundRecordId: string;
};

export type Filters = { q: string; spec: string; misu: string; from: string; to: string };

export function parseLot(r: { id: string; fields: Record<string, unknown> }): LotRecord {
  const f = r.fields;
  const str = (v: unknown) =>
    Array.isArray(v) ? String(v[0] ?? '').trim() : String(v ?? '').trim();
  const firstLink = (v: unknown): string => {
    if (Array.isArray(v) && v.length > 0) {
      const s = String(v[0] ?? '').trim();
      return /^rec[a-zA-Z0-9]+$/.test(s) ? s : '';
    }
    return '';
  };
  return {
    id: r.id,
    lotNumber: str(f['LOT번호']),
    productName: str(f['품목명']),
    spec: str(f['규격표시']) || str(f['규격']),
    misu: str(f['상세규격_표기']) || str(f['미수']),
    stockQty: Number(Array.isArray(f['재고수량']) ? f['재고수량'][0] : f['재고수량']) || 0,
    salePrice: Number(f['판매원가']) || 0,
    origin: str(f['원산지']),
    inboundRecordId: firstLink(f['입고관리링크']),
  };
}

/** 출고 수량 × 박스 kg × 판매원가(원/kg) → 예상 금액(원, 정수). */
export function calcAmount(lot: LotRecord, boxes: number): number {
  const kg = parseFloat(lot.spec);
  if (!Number.isFinite(kg) || kg <= 0 || !lot.salePrice) return 0;
  return Math.round(boxes * kg * lot.salePrice);
}
