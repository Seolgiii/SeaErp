'use client';

import type { ReactNode } from 'react';
import type { RequestItem } from '@/app/actions/my-requests';
import {
  PENDING_STATUSES,
  STATUS_STYLE,
  badge,
  formatSubmittedAt,
} from '@/app/components/approval-card-shared';

interface Props {
  item: RequestItem;
  /** 낙관적 UI 상태 (처리 중/완료/반려 오버레이). undefined면 정상 카드. */
  uiState: 'PROCESSING' | 'COMPLETED' | 'REJECTED' | undefined;
  /** 완료 탭 여부 — 카드 클릭으로 상태 변경 가능 여부 분기. */
  isDoneTab: boolean;
  role: string | undefined;
  /** 일괄 승인 대상 체크박스 표시 여부 (parent가 계산해 전달). */
  bulkEligible: boolean;
  /** 일괄 선택 체크 상태. */
  checked: boolean;
  onToggleSelect: () => void;
  onOpenActionSheet: () => void;
  onOpenReject: () => void;
  onApprove: () => void;
  /** 타입별 본문 (LogisticsBody 또는 ExpenseBody). */
  children: ReactNode;
}

/**
 * 결재 카드 셸 — 모든 타입(INBOUND/OUTBOUND/TRANSFER/EXPENSE) 공통의
 * 래퍼·일괄선택·헤더·승인반려 버튼·낙관적 UI 오버레이를 담당.
 * 본문(타입별 차이)은 children 슬롯으로 받는다.
 */
export default function ApprovalCard({
  item,
  uiState,
  isDoneTab,
  role,
  bulkEligible,
  checked,
  onToggleSelect,
  onOpenActionSheet,
  onOpenReject,
  onApprove,
  children,
}: Props) {
  const b = badge(item.type);
  const isExpense = item.type === 'EXPENSE';
  const displayStatus =
    uiState === 'COMPLETED' ? '승인 완료' :
    uiState === 'REJECTED'  ? '반려' :
    item.status;

  // 완료 탭 + (승인 완료 || 반려) + ADMIN/MASTER + 처리 중이 아닐 때만 카드 클릭 가능
  // — 승인 완료 → 반려, 반려 → 승인 양방향 변경 진입점
  const canChangeStatus =
    isDoneTab &&
    (item.status === '승인 완료' || item.status === '반려') &&
    !uiState &&
    (role === 'ADMIN' || role === 'MASTER');

  const baseClass = isExpense
    ? 'bg-white p-5 rounded-[24px] shadow-[0_8px_24px_rgba(149,157,165,0.08)] flex flex-col gap-3 animate-fade-in'
    : 'bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1';
  const interactiveClass = canChangeStatus
    ? ' cursor-pointer hover:shadow-md active:scale-[0.99] transition-all'
    : '';
  const cardRingClass = bulkEligible && checked ? ' ring-2 ring-[#3182F6]' : '';

  return (
    <div
      key={item.id}
      className={baseClass + interactiveClass + cardRingClass}
      onClick={canChangeStatus ? onOpenActionSheet : undefined}
      role={canChangeStatus ? 'button' : undefined}
      tabIndex={canChangeStatus ? 0 : undefined}
      onKeyDown={
        canChangeStatus
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenActionSheet();
              }
            }
          : undefined
      }
    >
      {bulkEligible && (
        <div className="flex items-center gap-2 -mb-1">
          <label className="inline-flex items-center gap-2 select-none cursor-pointer active:scale-95 transition-transform">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => { e.stopPropagation(); onToggleSelect(); }}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 rounded border-gray-300 text-[#3182F6] focus:ring-[#3182F6]"
              aria-label="일괄 승인 대상으로 선택"
            />
            <span className="text-[12px] font-bold text-gray-400">
              일괄 승인 대상
            </span>
          </label>
        </div>
      )}

      {/* 공통 헤더: 타입 뱃지 + 신청자 + 접수 시간 + 상태 칩 */}
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className={`shrink-0 text-[12px] font-bold px-2.5 py-1 rounded-md ${b.bg}`}>{b.label}</span>
          <p className="text-[14px] text-gray-500 font-medium shrink-0 min-w-0">
            <span className="font-bold">신청자 :</span> {item.requester}
          </p>
          {formatSubmittedAt(item.createdTime) && (
            <p className="text-[14px] text-gray-500 font-medium min-w-0">
              <span className="font-bold">접수 시간 :</span> {formatSubmittedAt(item.createdTime)}
            </p>
          )}
        </div>
        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[displayStatus] ?? 'bg-[#3182F6]/10 text-[#3182F6]'}`}>
          {displayStatus}
        </span>
      </div>

      {/* 타입별 본문 슬롯 */}
      {children}

      {/* 승인/반려 버튼 — 대기 상태 + ADMIN/MASTER + 오버레이 없을 때만 */}
      {!uiState && PENDING_STATUSES.includes(item.status) && (role === 'ADMIN' || role === 'MASTER') && (
        <div className={`flex gap-3 ${isExpense ? 'mt-1.5' : 'mt-0.5'}`}>
          <button
            onClick={onOpenReject}
            className="flex-1 bg-gray-100 text-gray-600 font-bold text-[15px] py-4 rounded-[16px] active:scale-95 transition-transform"
          >
            반려
          </button>
          <button
            onClick={onApprove}
            className="flex-[2] bg-[#191F28] text-white font-bold text-[15px] py-4 rounded-[16px] active:scale-95 transition-transform"
          >
            승인
          </button>
        </div>
      )}

      {/* 낙관적 UI 오버레이 — 결재 진행/완료/반려 시 */}
      {uiState === 'PROCESSING' && (
        <div className="w-full bg-blue-50/50 text-[#3182F6] font-bold py-4 rounded-[16px] text-center flex items-center justify-center gap-2 animate-pulse">
          처리 중...
        </div>
      )}
      {uiState === 'COMPLETED' && (
        <div className="w-full bg-[#00D082]/10 text-[#00D082] font-bold py-4 rounded-[16px] text-center flex items-center justify-center gap-2">
          승인 완료
        </div>
      )}
      {uiState === 'REJECTED' && (
        <div className="w-full bg-gray-50 text-gray-400 font-bold py-4 rounded-[16px] text-center">
          반려됨
        </div>
      )}
    </div>
  );
}
