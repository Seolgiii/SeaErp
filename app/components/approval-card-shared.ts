/**
 * 결재 카드(ApprovalCard) 공유 상수·헬퍼.
 * - PENDING_STATUSES: 결재 대기 상태(승인 대기 / 최종 승인 대기). dashboard isBulkEligible에서도 사용.
 * - STATUS_STYLE: 우측 상단 상태 칩 색.
 * - TYPE_BADGE + badge(): 좌측 타입 뱃지.
 * - formatSubmittedAt: 접수 시간 표시(ko-KR short).
 */

export const PENDING_STATUSES = ["승인 대기", "최종 승인 대기"];

export const STATUS_STYLE: Record<string, string> = {
  "승인 대기": "bg-[#3182F6]/10 text-[#3182F6]",
  "최종 승인 대기": "bg-orange-50 text-orange-600",
  "승인 완료": "bg-green-100 text-green-700",
  "반려": "bg-gray-100 text-gray-500",
  "취소": "bg-red-50 text-red-400",
};

export const TYPE_BADGE: Record<string, { bg: string; label: string }> = {
  INBOUND: { bg: "bg-[#3182F6]/10 text-[#3182F6]", label: "물품 입고" },
  OUTBOUND: { bg: "bg-[#5061FF]/10 text-[#5061FF]", label: "물품 출고" },
  EXPENSE: { bg: "bg-[#00D082]/10 text-[#00D082]", label: "지출 신청" },
  TRANSFER: { bg: "bg-orange-100 text-orange-600", label: "재고 이동" },
};

export function badge(type: string): { bg: string; label: string } {
  return TYPE_BADGE[type] ?? { bg: "bg-gray-100 text-gray-700", label: "기타" };
}

export function formatSubmittedAt(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}
