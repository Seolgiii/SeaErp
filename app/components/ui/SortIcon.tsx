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

/**
 * 가운데 정렬 헤더용 — 라벨 반대편에 두는 투명 스페이서(§7-8 확장).
 * `justify-center`는 "라벨+아이콘"을 한 묶음으로 가운데 맞추기 때문에, 아이콘이
 * 라벨 오른쪽에만 있으면 라벨 자체는 아이콘 폭만큼 왼쪽으로 밀린다. 라벨 반대편에
 * SortIcon과 동일 크기(16px)의 빈 자리를 둬서 좌우를 대칭으로 만들면 라벨이 실제로
 * 컬럼 중앙에 온다. 좌/우 정렬 헤더의 "아이콘은 라벨 반대편" 원칙(§7-8)을 중앙 정렬로 확장.
 */
export function SortIconSpacer() {
  return <span className="h-4 w-4 shrink-0" aria-hidden="true" />;
}
