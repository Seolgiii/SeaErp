// ─────────────────────────────────────────────────────────────────────────────
// <Modal> — DESIGN.md §6-5
//
// 편집 모달 5벌(보관처·품목·선박·매입처·작업자)이 똑같은 껍데기를 각자 들고 있었다.
// §6-5가 3영역 규격을 못 박은 이상 그 껍데기는 한 곳에만 있어야 한다.
//
// 컴포넌트가 보장하는 것 — 화면에서 다시 지정하지 말 것:
//   · 3영역 padding: 헤더 상하 16 / 본문 상하 24 / 푸터 상하 16, 좌우 전부 24
//   · 헤더 아래·푸터 위 `--border` 1px 구분선
//   · 본문 필드 그룹 간격 24px (space-y-6)
//   · 뒷배경 `--scrim`, 모서리 `--r-sheet`, 그림자 `shadow-overlay`
//   · **푸터 버튼 배치: 파괴적 액션(삭제)은 좌측, 취소·저장은 우측(사이 8px)**
//   · 열려 있는 동안 body 스크롤 잠금
//
// ⚠ 이 컴포넌트는 앱 루트로 포털하지 않는다. 호출 화면의 DOM 자리에 그대로 그린다 —
//   그래야 `[data-surface="admin"]` 스코프 안에 남아 PC용 radius/컨트롤 높이를 받는다.
//   (§6-5 '포털 주의' 참조. 포털로 바꾸려면 표면 정보를 함께 넘겨야 한다.)
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { useEffect, type ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/components/ui/Button';

export interface ModalProps {
  /** 헤더 제목. 배지 등을 옆에 붙이려면 노드를 그대로 넘긴다. */
  title: ReactNode;
  onClose: () => void;
  /**
   * 파괴적 액션(삭제) — 푸터 **좌측**. 없으면 좌측은 빈 자리로 남는다.
   * Primary로 만들지 말 것 (§2-3, §6-4).
   */
  destructiveAction?: ReactNode;
  /** 취소·저장 등 — 푸터 **우측**. 버튼 사이 8px은 여기서 준다. */
  actions: ReactNode;
  /** 본문. 필드 사이 간격은 컴포넌트가 24px로 준다. */
  children: ReactNode;
}

export function Modal({ title, onClose, destructiveAction, actions, children }: ModalProps) {
  // 모달이 열려 있는 동안 뒤 페이지가 스크롤되지 않게 잠근다.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-scrim animate-fade-in motion-reduce:animate-none"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-sheet bg-surface shadow-overlay animate-slide-up motion-reduce:animate-none">
        {/* 헤더 — 상하 16px + 아래 구분선 */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h3 className="flex items-center gap-2 text-section text-text">{title}</h3>
          <Button variant="ghost" icon={XMarkIcon} onClick={onClose} aria-label="닫기" />
        </div>

        {/* 본문 — 상하 24px, 필드 그룹 간격 24px */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">{children}</div>

        {/* 푸터 — 상하 16px + 위 구분선. 삭제 좌측 / 취소·저장 우측 */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          {destructiveAction ?? <div />}
          <div className="flex gap-2">{actions}</div>
        </div>
      </div>
    </div>
  );
}
