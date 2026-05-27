'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/PageHeader';
import LotProductSpec from '@/components/LotProductSpec';
import TransferCartSheet from '@/app/components/TransferCartSheet';
import { searchTransferLot, createTransferRecord, getStorageOptions } from '@/app/actions';
import type { TransferLotResult } from '@/app/actions/inventory/transfer';
import { runBulkSubmit } from '@/lib/bulk-submit';
import { formatIntKo } from '@/lib/number-format';
import { readSession } from '@/lib/session';
import { toast } from '@/lib/toast';
import {
  PENDING_TRANSFER_LOTS_KEY,
  readPendingCartLots,
  type PendingCartLot,
} from '@/lib/pending-cart-lots';

function pendingToTransferLot(p: PendingCartLot): TransferLotResult {
  return {
    lotRecordId: p.lotRecordId,
    lotNumber: p.lotNumber,
    productName: p.productName,
    spec: p.spec,
    misu: p.misu,
    stockQty: p.stockQty,
    storage: '',
    inboundRecordId: p.inboundRecordId ?? '',
  };
}

function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

type CartItem = {
  cartId: string;
  lotRecordId: string;
  lotNumber: string;
  productName: string;
  spec: string;
  misu: string;
  stockQty: number;
  currentStorage: string;
  transferQty: number;
  targetStorageId: string;
  targetStorageName: string;
  transferDate: string;
};

export default function TransferPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState('');
  const [storageOptions, setStorageOptions] = useState<{ id: string; name: string }[]>([]);

  // LOT 검색
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<TransferLotResult[]>([]);
  const [selectedLot, setSelectedLot] = useState<TransferLotResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // 현재 입력 중인 이동 정보
  const [transferQty, setTransferQty] = useState('');
  const [storageQuery, setStorageQuery] = useState('');
  const [storageOpen, setStorageOpen] = useState(false);
  const [targetStorageId, setTargetStorageId] = useState('');
  const [targetStorageName, setTargetStorageName] = useState('');
  const [transferDate, setTransferDate] = useState(todayKST());
  const storageRef = useRef<HTMLDivElement>(null);

  // 장바구니
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 묶음 신청 결과 (B안: 부분 성공/실패) — 출고 화면과 동일 패턴
  const [bulkResult, setBulkResult] = useState<{
    successCartIds: string[];
    failures: { cartId: string; lotNumber: string; reason: string }[];
  } | null>(null);

  // 재고 조회 → 핸드오프된 대기 LOT 목록 (mount 시 1회 hydrate)
  // pending은 cart에 들어가지 않은 모든 후보를 포함. 첫 LOT은 자동 selectedLot.
  const [pending, setPending] = useState<PendingCartLot[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);

  useEffect(() => {
    const s = readSession();
    if (s) setWorkerId(s.workerId);
  }, []);

  useEffect(() => {
    getStorageOptions()
      .then(setStorageOptions)
      .catch(() => {});
  }, []);

  // sessionStorage 핸드오프: 첫 LOT 자동 선택 + 수량 자동 입력.
  // pending 큐는 첫 LOT 포함 전체 유지 — [다시 검색]으로 자동 선택을 취소해도 큐에 그대로 남아 다시 선택 가능.
  useEffect(() => {
    const lots = readPendingCartLots(PENDING_TRANSFER_LOTS_KEY);
    if (lots.length === 0) return;
    setPending(lots);
    setPendingTotal(lots.length);
    const first = lots[0];
    setSelectedLot(pendingToTransferLot(first));
    setTransferQty(String(first.quantity));
  }, []);

  // 보관처 드롭다운 바깥 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (storageRef.current && !storageRef.current.contains(e.target as Node)) {
        setStorageOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setIsSearching(true);
    setSelectedLot(null);
    setSearchResults([]);
    try {
      const res = await searchTransferLot(q);
      if (res.success) {
        if (res.records.length === 0) {
          toast('일치하는 재고가 없습니다.', 'info');
        } else if (res.records.length === 1) {
          setSelectedLot(res.records[0]);
        } else {
          setSearchResults(res.records);
        }
      } else {
        toast(res.error ?? '검색 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = () => doSearch(keyword);

  const handleSelect = (lot: TransferLotResult) => {
    setSelectedLot(lot);
    setSearchResults([]);
    setTransferQty('');
  };

  // "다시 검색" — 선택만 해제하고 직전 검색어·결과는 유지해 검색 결과 리스트로 복귀.
  const backToSearchResults = () => {
    setSelectedLot(null);
    setTransferQty('');
    setStorageQuery('');
    setTargetStorageId('');
    setTargetStorageName('');
  };

  const filteredStorage = storageOptions.filter((o) => o.name.includes(storageQuery));

  const handleAddToCart = () => {
    if (!selectedLot) return;
    const qty = Number(transferQty.replace(/,/g, ''));
    if (!qty || qty <= 0) { toast('이동 수량을 올바르게 입력해주세요.'); return; }
    if (qty > selectedLot.stockQty) { toast(`재고 부족 (현재: ${selectedLot.stockQty}박스)`); return; }
    if (!targetStorageId) { toast('이동 후 보관처를 선택해주세요.'); return; }
    if (!transferDate) { toast('이동일을 입력해주세요.'); return; }

    setCart((prev) => [
      ...prev,
      {
        cartId: `${selectedLot.lotRecordId}-${Date.now()}`,
        lotRecordId: selectedLot.lotRecordId,
        lotNumber: selectedLot.lotNumber,
        productName: selectedLot.productName,
        spec: selectedLot.spec,
        misu: selectedLot.misu,
        stockQty: selectedLot.stockQty,
        currentStorage: selectedLot.storage,
        transferQty: qty,
        targetStorageId,
        targetStorageName,
        transferDate,
      },
    ]);
    toast(`이동 목록에 담았어요 · ${cart.length + 1}건`, 'success');

    // 대기 큐에서 현재 LOT 제거. 다음 LOT 있으면 자동 선택 + 보관처/날짜 유지(같은 곳 가능성↑).
    // 비어 있으면 일반 검색 모드로 전환.
    const remaining = pending.filter((p) => p.lotRecordId !== selectedLot.lotRecordId);
    setPending(remaining);

    if (remaining.length > 0) {
      const next = remaining[0];
      setSelectedLot(pendingToTransferLot(next));
      setTransferQty(String(next.quantity));
      setKeyword('');
      setSearchResults([]);
    } else {
      setSelectedLot(null);
      setTransferQty('');
      setStorageQuery('');
      setTargetStorageId('');
      setTargetStorageName('');
      setKeyword('');
      setSearchResults([]);
    }
  };

  /** 핸드오프 큐에서 임의 순서로 LOT 선택 (대기 칩 클릭) */
  const pickPending = (lotRecordId: string) => {
    if (selectedLot) {
      toast('현재 LOT 입력을 먼저 마치거나 [다시 검색]을 눌러주세요.', 'info');
      return;
    }
    const picked = pending.find((p) => p.lotRecordId === lotRecordId);
    if (!picked) return;
    setSelectedLot(pendingToTransferLot(picked));
    setTransferQty(String(picked.quantity));
  };

  /** 핸드오프 큐에서 LOT 영구 제거 (취소) */
  const dismissPending = (lotRecordId: string) => {
    setPending((prev) => prev.filter((p) => p.lotRecordId !== lotRecordId));
    setPendingTotal((n) => Math.max(0, n - 1));
    if (selectedLot?.lotRecordId === lotRecordId) {
      setSelectedLot(null);
      setTransferQty('');
    }
  };

  // 묶음 이동 신청 — B안(부분 성공 허용). 순회 정책은 lib/bulk-submit.runBulkSubmit으로 통일.
  const handleSubmitAll = async () => {
    if (cart.length === 0) return;
    if (!workerId) { toast('로그인 정보를 확인해주세요.'); return; }
    setIsSubmitting(true);

    const { successCartIds, failures } = await runBulkSubmit(cart, async (item) => {
      const result = await createTransferRecord({
        lotRecordId: item.lotRecordId,
        이동수량: item.transferQty,
        이동후보관처RecordId: item.targetStorageId,
        이동일: item.transferDate,
        workerId,
      });
      return { success: result.success, error: result.message };
    });

    setIsSubmitting(false);

    if (failures.length === 0) {
      toast('재고 이동 신청이 완료되었습니다.', 'success');
      router.push('/');
      return;
    }

    setCartOpen(false);
    setBulkResult({ successCartIds, failures });
  };

  // 실패 N건만 cart에 남기고 결과 패널 닫기 (재시도용)
  const retryFailedBulk = () => {
    if (!bulkResult) return;
    const succeeded = new Set(bulkResult.successCartIds);
    setCart((prev) => prev.filter((c) => !succeeded.has(c.cartId)));
    setBulkResult(null);
  };

  // 성공분 제거 + 요약 toast 후 결과 패널 닫기
  const closeBulkResult = () => {
    if (!bulkResult) return;
    const succeeded = new Set(bulkResult.successCartIds);
    setCart((prev) => prev.filter((c) => !succeeded.has(c.cartId)));
    const successCount = bulkResult.successCartIds.length;
    const failCount = bulkResult.failures.length;
    toast(
      successCount > 0 ? `${successCount}건 신청 완료, ${failCount}건 실패` : `${failCount}건 모두 실패`,
      successCount > 0 ? 'info' : 'error',
    );
    setBulkResult(null);
  };

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex flex-col pb-32 font-['Spoqa_Han_Sans_Neo']">
      <PageHeader
        title="재고 이동"
        subtitle="어디로 옮기시나요?"
        onBack={() => router.push('/')}
        titleClassName="text-[#FF8C00] font-black"
        rightSlot={
          cart.length > 0 && !bulkResult ? (
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`이동 목록 ${cart.length}건 보기`}
              className="relative w-9 h-9 mr-2.5 flex items-center justify-center rounded-xl active:bg-gray-100 transition-colors"
            >
              <ShoppingCartIcon className="w-6 h-6 text-gray-800" />
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF8C00] text-white text-[11px] font-black flex items-center justify-center">
                {cart.length}
              </span>
            </button>
          ) : undefined
        }
      />

      <main className="p-4 flex flex-col gap-4">

        {!bulkResult && (
        <>
        {/* 재고 조회에서 핸드오프된 대기 LOT 안내 — 첫 LOT은 자동 선택, 다음 LOT은 + 추가 시 자동 이어짐 */}
        {pending.length > 0 && (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-black text-[#FF8C00]">
                재고 조회 가져온 LOT {pendingTotal}건 · 남은 {pending.length}건
              </p>
              <p className="text-[11px] font-bold text-orange-400">
                현재 처리 완료 후 자동 이어집니다
              </p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {pending.map((p) => {
                const isCurrent = selectedLot?.lotRecordId === p.lotRecordId;
                return (
                  <li
                    key={p.lotRecordId}
                    className={`flex items-center gap-1 rounded-full pl-3 pr-1 py-1 border ${
                      isCurrent
                        ? 'bg-[#FF8C00] border-[#FF8C00] text-white'
                        : 'bg-white border-orange-200 text-gray-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => !isCurrent && pickPending(p.lotRecordId)}
                      disabled={isCurrent}
                      className="text-[12px] font-bold active:scale-95 disabled:cursor-default"
                      aria-label={isCurrent ? `${p.lotNumber} 현재 처리 중` : `${p.lotNumber} 먼저 선택`}
                    >
                      {isCurrent && <span className="mr-1">●</span>}
                      <span className="font-mono">{p.lotNumber}</span>
                      <span className={`ml-1 ${isCurrent ? 'text-white/90' : 'text-[#FF8C00]'}`}>
                        ·{p.quantity}박스
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissPending(p.lotRecordId)}
                      className={`w-5 h-5 rounded-full text-[12px] active:scale-90 ${
                        isCurrent ? 'text-white/70 hover:text-white' : 'text-gray-300 hover:text-red-500'
                      }`}
                      aria-label={`${p.lotNumber} 큐에서 제거`}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* LOT 검색 + 이동 정보 카드 */}
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">

          {/* LOT 검색 입력 */}
          {!selectedLot && (
            <div className="space-y-3">
              <label className="text-[13px] font-bold text-gray-500 ml-1">
                품목명 또는 LOT번호
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="예: 고등어, 0001"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 min-w-0 bg-gray-100 text-gray-900 text-[15px] font-bold rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#FF8C00] transition-all"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="shrink-0 bg-[#FF8C00] text-white px-5 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
                >
                  {isSearching
                    ? <span className="text-[13px] font-bold px-1">...</span>
                    : <MagnifyingGlassIcon className="w-5 h-5" />
                  }
                </button>
              </div>
            </div>
          )}

          {/* 검색 결과 리스트 */}
          {!selectedLot && searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-[12px] font-bold text-gray-400 ml-1">
                이동할 LOT를 선택하세요 ({searchResults.length}건)
              </p>
              {searchResults.map((lot) => (
                <button
                  key={lot.lotRecordId}
                  onClick={() => handleSelect(lot)}
                  className="w-full text-left p-4 rounded-2xl border border-orange-100 bg-orange-50 active:scale-95 transition-all"
                >
                  <p className="font-mono text-[12px] font-black text-[#FF8C00] mb-1 tracking-tight">
                    {lot.lotNumber}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <LotProductSpec
                      productName={lot.productName}
                      spec={lot.spec}
                      misu={lot.misu}
                      className="flex-1"
                    />
                    <p className="text-[13px] font-bold text-blue-600 shrink-0">{formatIntKo(lot.stockQty)}박스</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 선택된 LOT + 이동 정보 입력 */}
          {selectedLot && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block px-2 py-1 bg-orange-100 text-[#FF8C00] text-[11px] font-black rounded-md mb-2">
                    선택된 LOT
                  </span>
                  <LotProductSpec
                    productName={selectedLot.productName}
                    spec={selectedLot.spec}
                    misu={selectedLot.misu}
                  />
                  <p className="font-mono text-[12px] font-black text-[#FF8C00] tracking-tight mt-0.5">
                    {selectedLot.lotNumber}
                  </p>
                </div>
                <button onClick={backToSearchResults} className="text-[12px] text-gray-400 underline p-2 shrink-0">
                  다시 검색
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-500 ml-1">현재 재고</label>
                  <div className="w-full bg-gray-100 rounded-2xl px-4 py-3.5 text-[15px] font-bold text-blue-600">
                    {selectedLot.stockQty}박스
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-500 ml-1">
                    이동 수량 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    autoFocus
                    value={transferQty}
                    onChange={(e) => {
                      const raw = Number(e.target.value.replace(/,/g, ''));
                      const max = selectedLot?.stockQty ?? 0;
                      if (max > 0 && Number.isFinite(raw) && raw > max) {
                        setTransferQty(String(max));
                        toast(`재고 ${formatIntKo(max)}박스가 최대예요.`, 'info');
                      } else {
                        setTransferQty(e.target.value);
                      }
                    }}
                    placeholder={`최대 ${selectedLot.stockQty}`}
                    min={1}
                    max={selectedLot.stockQty}
                    className="w-full bg-gray-100 text-gray-900 text-[15px] font-bold rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#FF8C00] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2" ref={storageRef}>
                <label className="text-[13px] font-bold text-gray-500 ml-1">
                  이동 후 보관처 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={storageQuery}
                    onChange={(e) => {
                      setStorageQuery(e.target.value);
                      setTargetStorageId('');
                      setTargetStorageName('');
                      setStorageOpen(true);
                    }}
                    onFocus={() => setStorageOpen(true)}
                    placeholder="보관처 검색 또는 선택"
                    className="w-full bg-gray-100 text-gray-900 text-[15px] font-bold rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#FF8C00] transition-all"
                  />
                  {storageOpen && filteredStorage.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredStorage.map((opt) => (
                        <li
                          key={opt.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setStorageQuery(opt.name);
                            setTargetStorageId(opt.id);
                            setTargetStorageName(opt.name);
                            setStorageOpen(false);
                          }}
                          className="px-4 py-3 text-[14px] font-bold text-gray-800 hover:bg-orange-50 cursor-pointer first:rounded-t-2xl last:rounded-b-2xl"
                        >
                          {opt.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="space-y-2 overflow-hidden">
                <label className="text-[13px] font-bold text-gray-500 ml-1">
                  이동일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full max-w-full bg-gray-100 text-gray-900 text-[14px] font-bold rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#FF8C00] transition-all"
                />
              </div>

              <button
                onClick={handleAddToCart}
                className="w-full py-4 rounded-2xl bg-gray-800 text-white text-[16px] font-black active:scale-95 transition-all"
              >
                + 이동 목록에 추가
              </button>
            </div>
          )}
        </div>
        </>
        )}

        {/* ── 결과 패널 (B안: 부분 성공/실패 표시) ─────────────────────── */}
        {bulkResult && (
          <div className="space-y-4">
            {bulkResult.successCartIds.length > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-[2rem] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  <p className="text-[14px] font-black text-green-700">
                    {bulkResult.successCartIds.length}건 신청 완료
                  </p>
                </div>
                <ul className="text-[12px] font-medium text-green-700 space-y-1 pl-7">
                  {bulkResult.successCartIds.map((cid) => {
                    const item = cart.find((c) => c.cartId === cid);
                    return (
                      <li key={cid} className="truncate font-mono">
                        {item?.lotNumber ?? '—'}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {bulkResult.failures.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-[2rem] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ExclamationCircleIcon className="w-5 h-5 text-[#FF3B30]" />
                  <p className="text-[14px] font-black text-[#FF3B30]">
                    {bulkResult.failures.length}건 실패
                  </p>
                </div>
                <ul className="space-y-2 pl-7">
                  {bulkResult.failures.map((f) => (
                    <li key={f.cartId} className="text-[12px]">
                      <p className="font-bold text-gray-800 truncate font-mono">{f.lotNumber}</p>
                      <p className="text-gray-500 mt-0.5">{f.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[12px] font-medium text-gray-400 leading-relaxed px-1">
              성공한 건은 결재 대기로 등록되었습니다. 실패한 건만 다시 시도하거나 닫고 종료할 수 있습니다.
            </p>
          </div>
        )}
      </main>

      {bulkResult ? (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#F2F4F6] border-t border-gray-200 space-y-2">
          {bulkResult.failures.length > 0 && (
            <button
              type="button"
              onClick={retryFailedBulk}
              className="w-full py-4 rounded-2xl text-white text-[16px] font-black bg-[#FF8C00] shadow-lg active:scale-[0.98] transition-all"
            >
              실패한 {bulkResult.failures.length}건 다시 시도
            </button>
          )}
          <button
            type="button"
            onClick={closeBulkResult}
            className="w-full py-3 rounded-2xl text-gray-700 text-[14px] font-bold bg-gray-100 active:scale-[0.98] transition-all"
          >
            닫기
          </button>
        </div>
      ) : cart.length > 0 ? (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#F2F4F6] border-t border-gray-200">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="w-full py-5 rounded-2xl text-[18px] font-black text-white shadow-lg transition-all bg-[#FF8C00] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <ShoppingCartIcon className="w-5 h-5" />
            이동 목록 {cart.length}건 · 신청하기
          </button>
        </div>
      ) : null}

      <TransferCartSheet
        open={cartOpen}
        items={cart}
        isSubmitting={isSubmitting}
        onClose={() => setCartOpen(false)}
        onRemove={(id) => setCart((prev) => prev.filter((c) => c.cartId !== id))}
        onSubmit={handleSubmitAll}
      />
    </div>
  );
}
