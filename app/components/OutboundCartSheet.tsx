'use client';

import { useEffect } from 'react';
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatSpecKgMisu } from '@/lib/spec-display';
import { formatIntKo } from '@/lib/number-format';

export interface OutboundCartLine {
  cartId: string;
  lotNumber: string;
  productName: string;
  spec: string;
  misu: string;
  quantity: number;
  seller: string;
  salePrice?: number;
}

interface OutboundCartSheetProps {
  open: boolean;
  items: ReadonlyArray<OutboundCartLine>;
  isSubmitting: boolean;
  onClose: () => void;
  onRemove: (cartId: string) => void;
  onSubmit: () => void;
}

/**
 * 출고 카트 바텀시트 — 헤더 장바구니 아이콘/하단바에서 열어 담은 LOT을 확인하고 신청.
 * ConfirmBottomSheet와 동일한 오버레이·slide-up·스크롤 잠금 패턴. 제출은 시트 안에서 처리해
 * "확인 후 출고"를 자연스럽게 강제한다. 표시 전용이라 카트 상태는 부모(출고 페이지)가 소유.
 */
export default function OutboundCartSheet({
  open,
  items,
  isSubmitting,
  onClose,
  onRemove,
  onSubmit,
}: OutboundCartSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const canSubmit = !isSubmitting && items.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-[28px] sm:rounded-[28px] shadow-2xl animate-slide-up flex flex-col max-h-[85vh]">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-3 pb-3">
          <h3 className="text-[18px] font-black text-gray-900">출고 목록 ({items.length}건)</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-8 h-8 flex items-center justify-center rounded-lg active:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 목록 (스크롤) */}
        <div className="flex-1 overflow-y-auto px-6 space-y-2.5">
          {items.length === 0 ? (
            <p className="text-center text-gray-400 text-[14px] py-12">담은 상품이 없습니다.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.cartId}
                className="flex items-stretch gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold text-gray-400">{item.lotNumber}</p>
                  <p className="truncate text-[14px] font-black text-gray-800">
                    {item.productName}{' '}
                    <span className="text-[12px] font-normal text-gray-500">
                      {formatSpecKgMisu(item.spec, item.misu)}
                    </span>
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="text-[13px] font-bold text-[#FF3B30]">
                      {formatIntKo(item.quantity)}박스
                    </span>
                    {item.seller && (
                      <span className="text-[12px] text-gray-500">{item.seller}</span>
                    )}
                    {item.salePrice != null && (
                      <span className="text-[12px] text-gray-500">
                        {formatIntKo(item.salePrice)}원
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onRemove(item.cartId)}
                    aria-label="목록에서 삭제"
                    className="p-2 text-gray-300 hover:text-red-500 active:scale-90 transition-all"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 제출 */}
        <div className="px-6 pt-3 pb-8 sm:pb-6">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`w-full py-4 rounded-2xl text-[18px] font-black text-white shadow-lg transition-all ${
              canSubmit ? 'bg-[#FF3B30] active:scale-[0.98]' : 'bg-red-300 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? '신청 중...' : `출고 신청 (${items.length}건)`}
          </button>
        </div>
      </div>
    </div>
  );
}
