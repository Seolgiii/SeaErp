'use client';

import { XMarkIcon, ArrowsRightLeftIcon, ArrowUpOnSquareIcon } from '@heroicons/react/24/outline';
import { formatIntKo } from '@/lib/number-format';
import { formatSpecKgMisu } from '@/lib/spec-display';
import { calcAmount, type LotRecord, type Filters } from '@/app/components/stock-status-shared';

interface Props {
  selectedLots: LotRecord[];
  selectedQty: Record<string, number>;
  applied: Filters | null;
  totalBoxes: number;
  totalAmount: number;
  onClose: () => void;
  onHandoff: (target: 'transfer' | 'outbound') => void;
}

/**
 * 재고조회 3단계: 견적 요약 바텀시트(모달 오버레이).
 * 출고/이동 버튼 클릭 시 부모의 handoffToCart로 sessionStorage 저장 + navigate.
 */
export default function StockStatusSummary({
  selectedLots,
  selectedQty,
  applied,
  totalBoxes,
  totalAmount,
  onClose,
  onHandoff,
}: Props) {
  return (
    <main
      className="min-h-screen bg-[#F2F4F6]"
      style={{ fontFamily: "'Spoqa Han Sans Neo', sans-serif" }}
    >
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[32px] max-h-[85vh] flex flex-col shadow-[0_-8px_40px_rgba(0,0,0,0.15)]">
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="px-6 pt-4 pb-3 flex items-start justify-between shrink-0">
          <div>
            <p className="text-[12px] font-bold text-gray-400 mb-1">
              {[
                applied?.q,
                applied?.spec && `규격 ${applied.spec}kg`,
                applied?.misu && `${applied.misu}미`,
                applied?.from || applied?.to
                  ? `${applied?.from || '—'}~${applied?.to || '—'}`
                  : '기간 전체',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <h2 className="text-[22px] font-black text-gray-900">견적 요약</h2>
          </div>
          <button onClick={onClose} className="p-2 -mr-1 mt-1">
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* LOT 목록 */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {selectedLots.map((lot, i) => {
            const boxes  = selectedQty[lot.id] ?? 0;
            const amount = calcAmount(lot, boxes);
            const spec   = formatSpecKgMisu(lot.spec, lot.misu);
            return (
              <div
                key={lot.id}
                className={`py-4 ${i < selectedLots.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <p className="font-mono text-[11px] font-black text-blue-500 tracking-tight break-all mb-1">
                  {lot.lotNumber}
                </p>
                <div className="flex justify-between items-baseline gap-2">
                  <p className="text-[15px] font-black text-gray-900">
                    {formatIntKo(boxes)}박스
                  </p>
                  {amount > 0 ? (
                    <p className="text-[14px] font-bold text-gray-700 shrink-0">
                      {formatIntKo(amount)}원
                    </p>
                  ) : (
                    <p className="text-[13px] text-gray-400 shrink-0">단가 미산출</p>
                  )}
                </div>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  {lot.productName}
                  {spec && spec !== '-' ? ` · ${spec}` : ''}
                </p>
              </div>
            );
          })}
        </div>

        {/* 합계 + 버튼 */}
        <div
          className="px-6 pt-4 pb-6 bg-gray-50 border-t border-gray-100 shrink-0 space-y-5"
          style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex justify-between items-center">
            <p className="text-[15px] font-bold text-gray-500">합계</p>
            <div className="text-right">
              <p className="text-[26px] font-black text-blue-600 leading-tight">
                {formatIntKo(totalBoxes)}박스
              </p>
              {totalAmount > 0 && (
                <p className="text-[14px] font-bold text-gray-500 mt-0.5">
                  {formatIntKo(totalAmount)}원 (예상)
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onHandoff('transfer')}
              className="py-4 rounded-2xl bg-orange-500 text-white font-black text-[14px] flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(249,115,22,0.3)] active:scale-[0.98] transition-all"
            >
              <ArrowsRightLeftIcon className="w-5 h-5" />
              재고 이동
            </button>
            <button
              onClick={() => onHandoff('outbound')}
              className="py-4 rounded-2xl bg-red-600 text-white font-black text-[14px] flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(239,68,68,0.3)] active:scale-[0.98] transition-all"
            >
              <ArrowUpOnSquareIcon className="w-5 h-5" />
              출고 요청
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
