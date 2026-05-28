'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSyncQueryParams } from '@/lib/use-sync-query-params';
import { toast } from '@/lib/toast';
import {
  PENDING_TRANSFER_LOTS_KEY,
  PENDING_OUTBOUND_LOTS_KEY,
  type PendingCartLot,
} from '@/lib/pending-cart-lots';
import {
  parseLot,
  calcAmount,
  type Stage,
  type LotRecord,
  type Filters,
} from '@/app/components/stock-status-shared';
import StockStatusForm from '@/app/components/StockStatusForm';
import StockStatusResults from '@/app/components/StockStatusResults';
import StockStatusSummary from '@/app/components/StockStatusSummary';

/**
 * 재고조회 페이지 — 3단계(form/results/summary) 오케스트레이터.
 *
 * 상태는 모두 여기서 소유한다(stage / filters / applied / lots / selectedQty / productNames):
 * - filters는 useSyncQueryParams로 URL과 양방향 동기화
 * - productNames는 페이지 mount 시 1회 fetch (stage 전환에도 form 재mount되지 않도록 부모 보관)
 * - selectedQty는 results에서 setter로 직접 조작, summary에서 read-only
 *
 * 표현(JSX)은 StockStatusForm/Results/Summary 3컴포넌트로 분리해 길이·테스트성을 확보.
 * sub-route 분리는 미적용 — 실사용 후 뒤로가기 필요성이 확인되면 도입.
 */
export default function StockStatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stage, setStage] = useState<Stage>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [lots, setLots] = useState<LotRecord[]>([]);
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({});
  // URL 쿼리에서 초기 필터 복원 (뒤로가기·새로고침·링크 공유 시 동일 상태 재현)
  const [filters, setFilters] = useState<Filters>(() => ({
    q: searchParams.get('q') ?? '',
    spec: searchParams.get('spec') ?? '',
    misu: searchParams.get('misu') ?? '',
    from: searchParams.get('from') ?? '',
    to: searchParams.get('to') ?? '',
  }));
  const [applied, setApplied] = useState<Filters | null>(null);
  const [notFound, setNotFound] = useState(false);

  // 필터 → URL 동기화 (300ms 디바운스, 빈 값은 URL에서 제외)
  useSyncQueryParams(filters);

  // 품목명 자동완성 — 부모에서 1회 fetch해 form에 prop으로 전달 (stage 전환 시 재fetch 회피)
  const [productNames, setProductNames] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/inventory/product-names')
      .then((r) => r.json())
      .then((d) => setProductNames(d.names ?? []))
      .catch(() => {});
  }, []);

  const canSearch = Boolean(
    filters.q.trim() || filters.spec.trim() || filters.misu.trim() || filters.from || filters.to,
  );

  const handleSearch = useCallback(async () => {
    if (!canSearch) return;
    setIsLoading(true);
    setNotFound(false);
    try {
      const p = new URLSearchParams();
      if (filters.q.trim())    p.set('q',    filters.q.trim());
      if (filters.spec.trim()) p.set('spec', filters.spec.trim());
      if (filters.misu.trim()) p.set('misu', filters.misu.trim());
      if (filters.from)        p.set('from', filters.from);
      if (filters.to)          p.set('to',   filters.to);

      const res = await fetch(`/api/inventory/lot-search?${p}`);
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
      const data = await res.json();
      const records = (data.records ?? []).map(parseLot) as LotRecord[];

      if (records.length === 0) {
        setNotFound(true);
        return; // 폼 유지
      }

      setLots(records);
      setSelectedQty({});
      setApplied({ ...filters });
      setStage('results');
    } catch {
      toast('서버와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, canSearch]);

  const selectedLots = lots.filter((l) => (selectedQty[l.id] ?? 0) > 0);
  const totalBoxes   = selectedLots.reduce((s, l) => s + (selectedQty[l.id] ?? 0), 0);
  const totalAmount  = selectedLots.reduce((s, l) => s + calcAmount(l, selectedQty[l.id] ?? 0), 0);

  /**
   * 선택된 LOT을 카트형 페이지(/inventory/transfer · /inventory/outbound)로 핸드오프.
   * sessionStorage에 PendingCartLot[] 저장 후 navigate — 해당 페이지가 mount 시 1회 읽고 비움.
   * 각 LOT의 보관처/판매처/날짜 등은 카트 페이지에서 LOT마다 개별 입력.
   */
  const handoffToCart = (target: 'transfer' | 'outbound') => {
    if (selectedLots.length === 0) return;
    const pending: PendingCartLot[] = selectedLots.map((lot) => ({
      lotRecordId: lot.id,
      lotNumber: lot.lotNumber,
      productName: lot.productName,
      spec: lot.spec,
      misu: lot.misu,
      stockQty: lot.stockQty,
      quantity: selectedQty[lot.id] ?? 0,
      origin: lot.origin,
      inboundRecordId: lot.inboundRecordId,
    }));
    try {
      const key =
        target === 'transfer' ? PENDING_TRANSFER_LOTS_KEY : PENDING_OUTBOUND_LOTS_KEY;
      sessionStorage.setItem(key, JSON.stringify(pending));
    } catch {
      toast('LOT 전달에 실패했습니다. 카트 페이지에서 직접 검색해주세요.');
    }
    router.push(target === 'transfer' ? '/inventory/transfer' : '/inventory/outbound');
  };

  if (stage === 'form') {
    return (
      <StockStatusForm
        filters={filters}
        setFilters={setFilters}
        setNotFound={setNotFound}
        productNames={productNames}
        isLoading={isLoading}
        notFound={notFound}
        canSearch={canSearch}
        onSearch={handleSearch}
      />
    );
  }

  if (stage === 'results') {
    return (
      <StockStatusResults
        lots={lots}
        applied={applied}
        selectedQty={selectedQty}
        setSelectedQty={setSelectedQty}
        totalBoxes={totalBoxes}
        totalAmount={totalAmount}
        onBackToForm={() => setStage('form')}
        onResetSearch={() => { setStage('form'); setLots([]); setSelectedQty({}); }}
        onShowSummary={() => setStage('summary')}
      />
    );
  }

  return (
    <StockStatusSummary
      selectedLots={selectedLots}
      selectedQty={selectedQty}
      applied={applied}
      totalBoxes={totalBoxes}
      totalAmount={totalAmount}
      onClose={() => setStage('results')}
      onHandoff={handoffToCart}
    />
  );
}
