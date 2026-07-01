// ─────────────────────────────────────────────────────────────────────────────
// 데이터 테이블 / 목록 화면 공통 프리미티브 (노션풍) — CLAUDE.md ■ UI / UX 규칙
//
// 3 워크리스트(가공 투입 · 이동 등록 · 출고 등록)가 공유하는 최소 단위.
// LotCols(콜그룹)는 페이지마다 컬럼이 달라(예: 출고엔 보관처 없음) 공유하지 않고,
// 정렬·톤을 좌우하는 프리미티브만 여기서 통일한다.
// ─────────────────────────────────────────────────────────────────────────────

import type { ComponentType, ReactNode, SVGProps } from 'react';

// 소프트 필드(폼) — 회색 페이지(#F2F4F6) 위 흰 배경 + 연회색 인셋 링(대비 확보), 포커스 파란 링
export const softField =
  'w-full rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none ring-1 ring-inset ring-gray-200 transition hover:ring-gray-300 focus:ring-2 focus:ring-[#3182F6]';

// 폼 라벨 — 필드 위, 가운데 (경계 상자 위 라벨은 중앙)
export const labelClass = 'text-[11px] font-semibold text-gray-500 text-center';

// 입력칸(수량·금액 등 숫자) — 고정폭, 값 내부 우측정렬 + tabular-nums (헤더는 NumInputHeader로 중앙)
export const numCellInput =
  'w-24 rounded-md bg-white px-2 py-1.5 text-right text-sm tabular-nums text-gray-800 outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-[#3182F6]';

// 입력칸(텍스트·select) — 셀 폭 채움, 좌측정렬
export const cellField =
  'w-full rounded-md bg-white px-2 py-1.5 text-sm text-gray-800 outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-[#3182F6]';

// 표시숫자 상자 폭 — 헤더/셀 공유. min-width는 인라인 스타일로 확실히 적용
// (Tailwind v3 임의 rem값 min-w-[3.5rem]가 dev HMR에서 CSS로 안 뽑히던 문제 회피). 최대 자릿수+여유 기준.
const NUM_BOX_STYLE = { minWidth: '3.5rem' };

// 표시숫자 — 셀 왼쪽의 고정폭 상자 안에서 우측정렬(자릿수 세로 정렬). 셀 전체 우측정렬 아님.
// 헤더("재고")와 값 셀 모두 같은 컴포넌트로 감싸 우측 끝을 맞춘다.
export function NumBox({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block text-right tabular-nums" style={NUM_BOX_STYLE}>
      {children}
    </span>
  );
}

// 입력칸 헤더 — 입력칸 폭(w-24) 상자에 중앙정렬 (경계 있는 상자 위 라벨은 중앙이 정석)
export function NumInputHeader({ children }: { children: ReactNode }) {
  return <span className="inline-block w-24 text-center">{children}</span>;
}

// 섹션 제목 — 상자 없이 작은 아이콘 + 텍스트. anchor=결과물 영역(진하게).
export function SectionTitle({
  icon: Icon,
  anchor = false,
  children,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  anchor?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 text-[13px] ${
        anchor ? 'font-bold text-gray-700' : 'font-semibold text-gray-500'
      }`}
    >
      <Icon className={`h-4 w-4 ${anchor ? 'text-gray-500' : 'text-gray-400'}`} />
      {children}
    </div>
  );
}
