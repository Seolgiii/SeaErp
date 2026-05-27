import { formatSpecKgMisu } from '@/lib/spec-display';

export interface LotProductSpecProps {
  /** 품목명 */
  productName?: string | null;
  /** 규격 (예: "11") — formatSpecKgMisu가 "11kg"로 표기 */
  spec?: string;
  /** 미수/상세규격 (예: "42/44") */
  misu?: string;
  className?: string;
}

/**
 * LOT 표시용 "품목명 + 규격/미수" 블록 — 표시 전용 primitive.
 *
 * 재고조회·출고·결재함이 각자 카드 안에서 조립해 쓴다. 규격/미수 표기는
 * lib/spec-display.formatSpecKgMisu로 통일한다(화면마다 `{spec}kg · {misu}미` /
 * `(규격 {spec}kg / {misu})` / `규격: {spec}` 식으로 제각각이던 것을 일원화).
 *
 * LOT번호·재고·가격·상호작용(선택/수량입력/승인)은 화면마다 배치가 달라
 * 이 컴포넌트가 갖지 않는다 — 각 화면이 그대로 소유한다.
 */
export default function LotProductSpec({
  productName,
  spec = '',
  misu = '',
  className = '',
}: LotProductSpecProps) {
  return (
    <div className={`min-w-0 leading-tight ${className}`}>
      <p className="text-[15px] font-black text-gray-900 truncate">{productName || '—'}</p>
      <p className="text-[13px] text-gray-500 mt-0.5">{formatSpecKgMisu(spec ?? '', misu ?? '')}</p>
    </div>
  );
}
