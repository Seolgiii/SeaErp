'use client';

import type { Dispatch, SetStateAction } from 'react';
import PageHeader from '@/components/PageHeader';
import LotProductSpec from '@/components/LotProductSpec';
import { formatIntKo } from '@/lib/number-format';
import type { LotRecord, Filters } from '@/app/components/stock-status-shared';

interface Props {
  lots: LotRecord[];
  applied: Filters | null;
  selectedQty: Record<string, number>;
  setSelectedQty: Dispatch<SetStateAction<Record<string, number>>>;
  totalBoxes: number;
  totalAmount: number;
  onBackToForm: () => void;
  onResetSearch: () => void;
  onShowSummary: () => void;
}

function FilterChip({ label }: { label: string }) {
  return (
    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[12px] font-bold whitespace-nowrap">
      {label}
    </span>
  );
}

/**
 * 재고조회 2단계: 검색 결과 + 선택 수량 입력.
 * 부모로부터 selectedQty와 setter를 받아 자체 qty 핸들러(toggleFull/handleQtyChange)를 정의.
 */
export default function StockStatusResults({
  lots,
  applied,
  selectedQty,
  setSelectedQty,
  totalBoxes,
  totalAmount,
  onBackToForm,
  onResetSearch,
  onShowSummary,
}: Props) {
  const handleQtyChange = (id: string, value: string, max: number) => {
    const n = parseInt(value, 10);
    setSelectedQty((prev) => {
      const next = { ...prev };
      if (isNaN(n) || n <= 0) {
        delete next[id];
      } else {
        next[id] = Math.min(n, max);
      }
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-[#F2F4F6] pb-36">
      <PageHeader
        title="재고 조회"
        onBack={onBackToForm}
        rightSlot={
          <button
            onClick={onResetSearch}
            className="text-[13px] font-bold text-blue-600"
          >
            재검색
          </button>
        }
      />

      {/* 적용된 검색 조건 칩 */}
      <div className="px-5 pt-3 pb-1 flex flex-wrap gap-2">
        {applied?.q    && <FilterChip label={applied.q} />}
        {applied?.spec && <FilterChip label={`규격 ${applied.spec}kg`} />}
        {applied?.misu && <FilterChip label={`${applied.misu}미`} />}
        {applied?.from || applied?.to ? (
          <FilterChip label={`${applied.from || '—'} ~ ${applied.to || '—'}`} />
        ) : (
          <FilterChip label="기간 전체" />
        )}
      </div>

      <p className="px-5 py-2 text-[13px] font-bold text-gray-400">{lots.length}개 LOT</p>

      {/* LOT 카드 */}
      <div className="px-5 space-y-3">
        {lots.map((lot) => {
          const selected = selectedQty[lot.id] ?? 0;
          const isFull = lot.stockQty > 0 && selected === lot.stockQty;
          const isPartial = selected > 0 && selected < lot.stockQty;
          const toggleFull = () => {
            setSelectedQty((p) => ({
              ...p,
              [lot.id]: isFull ? 0 : lot.stockQty,
            }));
          };
          return (
            <div
              key={lot.id}
              className={`bg-white rounded-[20px] px-4 py-3.5 shadow-[0_4px_12px_rgba(149,157,165,0.06)] space-y-3 transition-all ${
                selected > 0 ? 'ring-2 ring-blue-400' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[16px] font-black text-blue-500 tracking-tight break-all leading-tight flex-1 min-w-0">
                  {lot.lotNumber || '—'}
                </p>
                <button
                  type="button"
                  onClick={toggleFull}
                  disabled={lot.stockQty === 0}
                  aria-label={isFull ? '전체 선택 해제' : '풀 수량 선택'}
                  aria-pressed={isFull}
                  className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all touch-manipulation disabled:opacity-30 ${
                    isFull
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isPartial
                      ? 'bg-blue-50 border-2 border-blue-400'
                      : 'bg-gray-100 border-2 border-gray-200 active:bg-gray-200'
                  }`}
                >
                  {isFull ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isPartial ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  ) : null}
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <LotProductSpec
                  productName={lot.productName}
                  spec={lot.spec}
                  misu={lot.misu}
                  className="flex-1"
                />
                {lot.salePrice > 0 && (
                  <p className="text-[17px] font-black text-gray-900 shrink-0 leading-tight">
                    {formatIntKo(Math.round(lot.salePrice))}원/kg
                  </p>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3 flex items-center justify-end gap-2">
                <span className="text-[16px] font-black text-blue-600 shrink-0 whitespace-nowrap">
                  {formatIntKo(lot.stockQty)}박스 중
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={lot.stockQty}
                  value={selected || ''}
                  onChange={(e) => handleQtyChange(lot.id, e.target.value, lot.stockQty)}
                  placeholder="0"
                  className="w-20 text-right bg-gray-100 rounded-xl px-3 py-2.5 font-black text-[16px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 고정 바 */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-4"
        style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-gray-400">선택</p>
            <p className="text-[20px] font-black text-blue-600 leading-tight">
              {formatIntKo(totalBoxes)}박스
            </p>
            {totalAmount > 0 && (
              <p className="text-[12px] text-gray-500">
                {formatIntKo(totalAmount)}원 (예상)
              </p>
            )}
          </div>
          <button
            onClick={onShowSummary}
            disabled={totalBoxes === 0}
            className="shrink-0 px-8 py-4 rounded-2xl bg-blue-600 text-white font-black text-[15px] shadow-[0_4px_16px_rgba(59,130,246,0.3)] active:scale-[0.98] transition-all disabled:opacity-40"
          >
            요약하기
          </button>
        </div>
      </div>
    </main>
  );
}
