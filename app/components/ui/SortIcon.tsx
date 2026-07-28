// ─────────────────────────────────────────────────────────────────────────────
// <SortIcon> — 목록 테이블 정렬 표시 (DESIGN.md §7)
//
// **세 상태가 같은 아이콘 계열(화살표)을 쓴다.** 예전엔 정렬 안 됨=양방향 화살표(↑↓),
// 정렬됨=꺾쇠(∨)로 계열이 바뀌어서, 상태 변화가 '강조'가 아니라 '다른 물건'으로 읽혔다.
//
//   none  ↑↓  평소 숨김(opacity-0) · hover에서 --text-faint 로 드러남
//   asc   ↑   항상 표시 · --text
//   desc  ↓   항상 표시 · --text
//
// · 크기는 세 상태 모두 16px 고정.
// · 숨김은 `display`가 아니라 `opacity`다 — 자리를 늘 차지해야 hover할 때 헤더 폭이
//   흔들리지 않는다. 표 헤더가 움직이면 클릭하려던 컬럼을 놓친다.
// · 아이콘은 라벨 오른쪽 4px(`gap-1`). 부모가 그 간격을 준다.
//
// ⚠ 부모(헤더 버튼)에 `group` 클래스가 있어야 none 상태의 hover 노출이 동작한다.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ArrowDownIcon,
  ArrowsUpDownIcon,
  ArrowUpIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

export type SortState = 'none' | 'asc' | 'desc';

/** 이 컬럼이 현재 정렬 기준인지 + 방향 → 상태. 화면마다 삼항식을 다시 쓰지 않게. */
export function sortState(isActive: boolean, dir: 'asc' | 'desc'): SortState {
  return isActive ? dir : 'none';
}

/** `<th aria-sort={…}>`에 넣을 값. 스크린리더가 정렬 상태를 읽어준다. */
export function ariaSort(state: SortState): 'none' | 'ascending' | 'descending' {
  if (state === 'asc') return 'ascending';
  if (state === 'desc') return 'descending';
  return 'none';
}

const ICON: Record<SortState, ComponentType<SVGProps<SVGSVGElement>>> = {
  none: ArrowsUpDownIcon,
  asc: ArrowUpIcon,
  desc: ArrowDownIcon,
};

export function SortIcon({ state }: { state: SortState }) {
  const Icon = ICON[state];
  const idle = state === 'none';
  return (
    <Icon
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 transition-opacity motion-reduce:transition-none ${
        idle
          ? 'text-text-faint opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          : 'text-text opacity-100'
      }`}
    />
  );
}
