// ─────────────────────────────────────────────────────────────────────────────
// <EmptyState> — DESIGN.md §6-4
//
// 빈 상태는 항상 **[제목 + 다음 행동] 2줄**이다. "…없습니다"로 끝내지 않는다.
// 다음 행동이 버튼으로 존재하지 않는 경우(검색 결과 0건)에도 조작 힌트는 반드시 준다.
//
// 문구 색은 --text-muted. --text-faint(대비 2.61)는 쓰지 않는다.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** 무엇이 없는지. 예: "등록된 보관처가 없습니다" */
  title: string;
  /** 다음에 할 행동. 예: "아래 버튼으로 첫 보관처를 등록하세요." */
  hint: string;
  /**
   * 선택. 행동 버튼.
   * ⚠ Primary는 화면당 1개이므로(§2-3) 여기에는 Secondary/Ghost를 넣는다.
   */
  action?: ReactNode;
}

export function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <p className="text-body text-text">{title}</p>
      <p className="text-label text-text-muted">{hint}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
