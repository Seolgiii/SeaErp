// ─────────────────────────────────────────────────────────────────────────────
// 표(테이블) 숫자 셀 공통 컴포넌트 — /admin PC 데이터 화면 전용
//
// 수량·중량·금액·단가를 보여주는 모든 <td>/<th>는 여기를 거친다.
//   · font-variant-numeric: tabular-nums (자릿수 세로 정렬)
//   · 우측 정렬
//   · 천 단위 쉼표 + 단위를 값 뒤에 붙임  (lib/number-format.ts:formatNum)
//
// 화면마다 다시 구현하지 말 것. 패딩·글자색 등 페이지 고유 스타일은 className으로 넘긴다
// (px-4 py-3 처럼 표마다 다른 값을 여기서 강제하면 기존 표 간격이 바뀌므로 일부러 뺐다).
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { formatNum, type NumFormatOptions } from '@/lib/number-format';

/** 숫자 셀 기본 클래스 — 우측 정렬 + tabular-nums. 헤더/셀 공통. */
export const NUM_CELL = 'text-right tabular-nums whitespace-nowrap';

type NumProps = NumFormatOptions & {
  /** 표시할 숫자. null·undefined·NaN이면 empty(기본 "-"). */
  value?: number | null;
  /** 넘기면 포맷 대신 이 내용을 그린다(정렬·tabular-nums는 유지). */
  children?: ReactNode;
};

/** 숫자 값 셀. `<NumCell value={12165160} unit="원" className="px-4 py-3 text-gray-700" />` */
export function NumCell({
  value,
  unit,
  decimals,
  maxDecimals,
  empty,
  children,
  className = '',
  ...rest
}: NumProps & Omit<TdHTMLAttributes<HTMLTableCellElement>, 'children'>) {
  return (
    <td className={`${NUM_CELL} ${className}`} {...rest}>
      {children ?? formatNum(value, { unit, decimals, maxDecimals, empty })}
    </td>
  );
}

/** 숫자 컬럼 헤더 — 값과 우측 끝을 맞춘다. */
export function NumHead({
  className = '',
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`${NUM_CELL} ${className}`} {...rest}>
      {children}
    </th>
  );
}

/** 셀이 아닌 자리(카드·요약 문장 등)에서 같은 표기를 쓸 때. 정렬은 부모 몫. */
export function Num({ value, unit, decimals, maxDecimals, empty }: NumProps) {
  return <span className="tabular-nums">{formatNum(value, { unit, decimals, maxDecimals, empty })}</span>;
}
