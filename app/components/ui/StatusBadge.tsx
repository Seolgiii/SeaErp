// ─────────────────────────────────────────────────────────────────────────────
// <StatusBadge> — DESIGN.md §6-1 · §6-2
//
// **상태 → 색 매핑은 이 파일의 TONE 하나뿐이다.** 화면별 `statusColor()` 정의 금지.
// 같은 상태는 어느 화면에서도 같은 색이어야 한다.
//
//   승인 대기  warn      승인 완료  success
//   반려       danger    취소·소진  중립
//
// ⚠ **반려(타인의 거부)와 취소(본인의 철회)는 다른 색군을 쓴다.** 둘 다 빨강이면 구분이 안 된다.
//
// 크기는 1종 고정 — caption(11px) + 좌우 8px + rounded-pill.
// **상하 padding을 주지 않는다**: caption의 행간만으로 높이를 만들어야 표 행 높이(38px)
// 안에서 행을 밀어내지 않는다 (§6-2).
// ─────────────────────────────────────────────────────────────────────────────

import { LOT_STATUS, isNormalLotStatus } from '@/lib/status';

type Tone = 'success' | 'warn' | 'danger' | 'info' | 'neutral';

/** 면(bg)과 글자(ink)를 분리한다 — 파스텔 배경 위 파스텔 글씨는 현장 조명에서 안 읽힌다 (§2-3). */
const TONE: Record<Tone, string> = {
  success: 'bg-success-bg text-success-ink',
  warn: 'bg-warn-bg text-warn-ink',
  danger: 'bg-danger-bg text-danger-ink',
  info: 'bg-info-bg text-info-ink',
  neutral: 'bg-surface-alt text-text-muted',
};

/**
 * 전역 단일 매핑 테이블 (§6-2).
 * 여기 없는 상태는 중립으로 떨어진다 — 색을 임의 배정하는 것보다 안전하다.
 */
const STATUS_TONE: Record<string, Tone> = {
  [LOT_STATUS.PENDING]: 'warn',
  [LOT_STATUS.APPROVED]: 'success',
  [LOT_STATUS.REJECTED]: 'danger',
  [LOT_STATUS.CANCELED]: 'neutral', // 반려와 같은 빨강을 쓰지 않는다
  [LOT_STATUS.DEPLETED]: 'neutral',
};

export interface StatusBadgeProps {
  /** 상태 문자열. `lib/status.ts`의 상수를 넘긴다. */
  status: string;
  /**
   * 배지에 띄울 문구. 생략하면 status 그대로.
   * (LOT은 '상태'보다 '상태사유'가 구체적이라 사유를 넘기는 경우가 많다.)
   */
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const tone = STATUS_TONE[status] ?? 'neutral';
  return (
    <span
      className={`inline-block rounded-pill px-2 text-caption ${TONE[tone]} ${className}`.trim()}
    >
      {label || status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 정상이 대다수인 컬럼용 (§6-2 예외 규칙)
//
// > 정상 상태가 대다수인 컬럼은 **정상을 조용히, 예외를 크게** 표시한다.
// > 모든 상태에 동일한 무게의 배지를 다는 것은 이상 신호를 묻는다.
//
// 재고 조회의 상태 컬럼이 대표 사례다. 정상 → 점, 비정상 → 배지.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 정상은 점, 비정상은 배지.
 *
 * 점에는 `sr-only` 텍스트를 함께 둔다 — §6-2가 "점·아이콘만으로 상태를 표시하지 않는다"고
 * 했고 `title` 툴팁은 터치·인쇄에서 사라지므로, 보조기기에는 반드시 글자로 남긴다.
 * (시각적으로 조용한 것과 접근성 정보가 없는 것은 다르다.)
 *
 * `normal`로 정상 판정을 주입할 수 있다 — **화면마다 정상의 뜻이 다르기 때문이다.**
 * 재고 조회는 '승인 완료'가 정상이고, 소진 LOT 화면은 '소진'이 정상이다.
 */
export function LotStatusCell({
  status,
  reason,
  normal = isNormalLotStatus,
}: {
  status: string;
  reason?: string;
  normal?: (status: string) => boolean;
}) {
  if (!status) return <span className="text-text-muted">—</span>;

  if (normal(status)) {
    return (
      <span className="inline-flex items-center" title={reason || status}>
        <span className="h-2 w-2 rounded-pill bg-success-ink" aria-hidden="true" />
        <span className="sr-only">{reason ? `${status} · ${reason}` : status}</span>
      </span>
    );
  }

  // 비정상 — 흑백 인쇄에서도 읽히도록 반드시 텍스트를 남긴다.
  return <StatusBadge status={status} label={reason || status} />;
}
