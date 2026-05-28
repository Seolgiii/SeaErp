'use client';

import type { RequestItem } from '@/app/actions/my-requests';

interface Props {
  item: RequestItem;
}

/**
 * 결재 카드 본문 — EXPENSE(지출 신청).
 * 건명 → 적요(있으면) → 금액. 적요는 item.raw["적요"]에서 읽음.
 */
export default function ApprovalExpenseBody({ item }: Props) {
  const description = String(item.raw['적요'] ?? '');

  return (
    <>
      <h2 className="text-[17px] font-bold text-gray-900 tracking-tight min-w-0">
        건명 : {item.title || '-'}
      </h2>
      <div className="flex justify-between items-center gap-3 min-w-0">
        {description ? (
          <p className="text-gray-400 font-medium text-[14px] min-w-0 flex-1 leading-snug">
            적요 : {description}
          </p>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <span className="text-[17.6px] font-bold text-gray-800">금액 :</span>
          <span className="text-[17.6px] font-bold text-[#191F28]">{item.amountOrQuantity}</span>
        </div>
      </div>
    </>
  );
}
