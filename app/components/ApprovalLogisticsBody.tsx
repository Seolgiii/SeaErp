'use client';

import type { RequestItem } from '@/app/actions/my-requests';
import { formatSpecKgMisu } from '@/lib/spec-display';

interface Props {
  item: RequestItem;
}

/**
 * 결재 카드 본문 — INBOUND / OUTBOUND / TRANSFER 공통.
 * 규격·미수(또는 TRANSFER는 이동일) → 품목명 → LOT번호(있으면) + 수량.
 *
 * LOT번호는 "있으면 표시"(2026-05-28 결정) — 입고 대기엔 LOT 미생성 상태라
 * 자동으로 안 보이고, 출고/이동과 승인된 입고는 그대로 표시.
 */
export default function ApprovalLogisticsBody({ item }: Props) {
  const isTransfer = item.type === 'TRANSFER';

  return (
    <>
      {!isTransfer && (
        <p className="text-[14px] text-gray-500">
          {formatSpecKgMisu(item.spec || '', item.misu || '')}
        </p>
      )}
      {isTransfer && (
        <p className="text-[13px] text-gray-500">
          <span className="font-bold">이동일 :</span> {item.date || '-'}
        </p>
      )}
      <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">{item.title || '-'}</h2>
      <div className="flex justify-between items-center gap-3 min-w-0">
        {item.lotNumber ? (
          <p className="text-[15px] font-bold font-mono text-blue-700 tracking-tight break-all leading-snug min-w-0 flex-1">
            {isTransfer ? `원본: ${item.lotNumber}` : item.lotNumber}
          </p>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <span className="text-[17.6px] font-bold text-gray-800">
            {item.type === 'INBOUND' ? '입고 수량' : isTransfer ? '이동 수량' : '출고 수량'} :
          </span>
          <span className="text-[17.6px] font-bold text-blue-600">{item.amountOrQuantity}박스</span>
        </div>
      </div>
    </>
  );
}
