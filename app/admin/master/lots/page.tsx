'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowsUpDownIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { formatNum } from '@/lib/number-format';
import { NumCell, NUM_CELL } from '@/app/admin/_num-cell';
import { makeCellClasses, tableMinWidth, TableColGroup, type TableCol } from '@/app/admin/_table-cols';
import { formatSpec, formatMisu } from '@/lib/spec-display';
import { listLots, type Lot } from '@/app/actions/admin/master-lots';

// 재고장 인쇄 핸드오프 키 — /admin/ledger 인쇄 화면과 공유(새 탭 공유 위해 localStorage).
const LEDGER_KEY = 'seaerp:ledger-print';
const seoulToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

type SortField =
  | 'lotNumber'
  | 'productName'
  | 'stockQty'
  | 'firstInboundDate'
  | 'storageName'
  | 'daysHeld'
  | 'stockWeight'
  | 'purchasePrice'
  | 'costPerBox'
  | 'valuation';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'ALL' | '활성' | '소진';
type Filters = {
  from: string;
  to: string;
  spec: string;
  misu: string;
  origin: string;
  storage: string;
  minDays: string;
};
const EMPTY_FILTERS: Filters = {
  from: '',
  to: '',
  spec: '',
  misu: '',
  origin: '',
  storage: '',
  minDays: '',
};

/**
 * 재고 조회 — LOT 단위 read-only 표.
 * LOT은 입고 승인 시 자동 생성되므로 admin 직접 생성 거의 없음.
 * 1차 dogfooding은 조회만 — 편집 필요성 확인되면 후속 추가.
 */
export default function LotsMasterPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [items, setItems] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('활성');
  const [sortField, setSortField] = useState<SortField>('firstInboundDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace('/login');
      return;
    }
    setWorkerId(session.workerId);
  }, [router]);

  const loadData = useCallback(async () => {
    if (!workerId) return;
    setIsLoading(true);
    const result = await listLots(workerId);
    if (result.success) setItems(result.data);
    else toast(`조회 실패: ${result.error}`, 'error');
    setIsLoading(false);
  }, [workerId]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  const visible = (() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) {
      list = list.filter(
        (l) =>
          l.lotNumber.toLowerCase().includes(q) ||
          l.productName.toLowerCase().includes(q),
      );
    }

    // 구조화 필터 (입고기간/품목명/규격/미수/원산지) — 입력된 항목만 적용
    const f = filters;
    const has = (s: string) => s.trim() !== '';
    const inc = (val: string, needle: string) =>
      val.toLowerCase().includes(needle.trim().toLowerCase());
    if (has(f.from)) list = list.filter((l) => l.firstInboundDate && l.firstInboundDate >= f.from);
    if (has(f.to)) list = list.filter((l) => l.firstInboundDate && l.firstInboundDate <= f.to);
    if (has(f.spec)) list = list.filter((l) => inc(l.spec, f.spec));
    if (has(f.misu)) list = list.filter((l) => inc(l.misu, f.misu));
    if (has(f.origin)) list = list.filter((l) => inc(l.origin, f.origin));
    if (has(f.storage)) list = list.filter((l) => inc(l.storageName, f.storage));
    if (has(f.minDays)) {
      const n = Number(f.minDays);
      if (Number.isFinite(n)) list = list.filter((l) => l.daysHeld >= n);
    }

    // 활성: 재고수량 > 0, 소진: 재고수량 == 0
    if (statusFilter === '활성') list = list.filter((l) => l.stockQty > 0);
    else if (statusFilter === '소진') list = list.filter((l) => l.stockQty === 0);

    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      return String(av ?? '').localeCompare(String(bv ?? ''), 'ko') * dir;
    });
    return list;
  })();

  // 현재 보이는 LOT들의 재고 평가액 합계 (재고 자산 가치 한눈 보기)
  const totalValuation = visible.reduce((sum, l) => sum + l.valuation, 0);

  const activeFilterCount = Object.values(filters).filter((v) => v.trim() !== '').length;
  const setFilter = (k: keyof Filters, v: string) =>
    setFilters((p) => ({ ...p, [k]: v }));
  // 드롭다운 검색(datalist) 옵션 — 현재 적재된 LOT들의 고유값
  const storageOptions = Array.from(
    new Set(items.map((l) => l.storageName).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'ko'));

  // 다중선택 — "보이는 것 중 선택된 것"만 대상으로(필터로 가려진 선택은 출력 제외 → 직관적)
  const selectedVisible = visible.filter((l) => selected.has(l.id));
  const selectedValuation = selectedVisible.reduce((s, l) => s + l.valuation, 0);
  const allVisibleSelected = visible.length > 0 && visible.every((l) => selected.has(l.id));

  // 합계 행 — 선택이 있으면 선택분 합계, 없으면 현재 보이는 전체 합계
  const summaryRows = selectedVisible.length > 0 ? selectedVisible : visible;
  const summaryIsSelection = selectedVisible.length > 0;
  const sumQty = summaryRows.reduce((s, l) => s + l.stockQty, 0);
  const sumWeight = summaryRows.reduce((s, l) => s + l.stockWeight, 0);
  const sumVal = summaryRows.reduce((s, l) => s + l.valuation, 0);

  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((l) => next.delete(l.id));
      else visible.forEach((l) => next.add(l.id));
      return next;
    });

  // 드래그 선택 — 체크박스 컬럼에서 mousedown 후 아래/위로 드래그하면 구간 선택.
  //   시작 행의 현재 선택 상태의 반대(target)를 드래그 구간 전체에 적용.
  //   snapshot(드래그 시작 시점 선택)을 기준으로 매 행 진입마다 구간을 재계산 → 되돌리기 자연스러움.
  const dragRef = useRef<{ start: number; target: boolean; snapshot: Set<string> } | null>(null);
  useEffect(() => {
    const end = () => {
      dragRef.current = null;
    };
    window.addEventListener('mouseup', end);
    return () => window.removeEventListener('mouseup', end);
  }, []);
  const applyDrag = (toIndex: number) => {
    const d = dragRef.current;
    if (!d) return;
    const next = new Set(d.snapshot);
    const lo = Math.min(d.start, toIndex);
    const hi = Math.max(d.start, toIndex);
    for (let j = lo; j <= hi; j++) {
      const id = visible[j]?.id;
      if (!id) continue;
      if (d.target) next.add(id);
      else next.delete(id);
    }
    setSelected(next);
  };
  const onSelectMouseDown = (index: number, id: string, e: React.MouseEvent) => {
    if (e.button !== 0) return; // 좌클릭만
    e.preventDefault(); // 드래그 중 텍스트 선택 방지
    dragRef.current = { start: index, target: !selected.has(id), snapshot: new Set(selected) };
    applyDrag(index);
  };

  // 재고장 인쇄 — 선택 LOT을 localStorage로 넘기고 새 탭에서 인쇄 화면 열기.
  const handlePrint = () => {
    if (selectedVisible.length === 0) return;
    try {
      window.localStorage.setItem(
        LEDGER_KEY,
        JSON.stringify({ asOf: seoulToday(), lots: selectedVisible }),
      );
    } catch {
      toast('인쇄 데이터를 준비하지 못했습니다.', 'error');
      return;
    }
    window.open('/admin/ledger', '_blank');
  };

  // CSV 내보내기 — 엑셀 한글 위해 BOM 선두, 쉼표/따옴표 이스케이프.
  const handleCsv = () => {
    if (selectedVisible.length === 0) return;
    const asOf = seoulToday();
    const header = ['LOT번호', '품목명', '규격', '미수', '원산지', '보관처', '보관일수', '재고수량(박스)', '박스당 수매가(원)', '박스당 재고원가(원)', '평가액(원)'];
    const body = selectedVisible.map((l) => [
      l.lotNumber,
      l.productName,
      formatSpec(l.spec),
      formatMisu(l.misu),
      l.origin,
      l.storageName,
      l.firstInboundDate ? String(l.daysHeld) : '',
      String(l.stockQty),
      l.purchasePrice > 0 ? String(Math.round(l.purchasePrice)) : '',
      l.costPerBox > 0 ? String(Math.round(l.costPerBox)) : '',
      l.costPerBox > 0 ? String(l.valuation) : '',
    ]);
    const totalQty = selectedVisible.reduce((s, l) => s + l.stockQty, 0);
    const totalVal = selectedVisible.reduce((s, l) => s + l.valuation, 0);
    const footer = ['합계', '', '', '', '', '', '', String(totalQty), '', '', String(totalVal)];
    const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv =
      '﻿' + [header, ...body, footer].map((r) => r.map(cell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `재고장_${asOf}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      // 날짜·수량·금액은 큰 값부터(desc)가 보통 더 유용
      const descFirst: SortField[] = ['firstInboundDate', 'daysHeld', 'stockQty', 'stockWeight', 'purchasePrice', 'costPerBox', 'valuation'];
      setSortDir(descFirst.includes(field) ? 'desc' : 'asc');
    }
  };

  if (!workerId) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
      </div>
    );
  }

  // 상태별 카운트
  const counts = {
    ALL: items.length,
    활성: items.filter((l) => l.stockQty > 0).length,
    소진: items.filter((l) => l.stockQty === 0).length,
  };

  return (
    <div className="p-8 min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-black text-gray-900 tracking-tight">재고 조회</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {visible.length}건{(search || statusFilter !== 'ALL') && ` / 전체 ${items.length}건`}
            {totalValuation > 0 && (
              <span className="ml-2 font-bold text-gray-700">
                · 평가액 합계 {formatNum(totalValuation, '원')}
              </span>
            )}
            <span className="ml-2 text-gray-400">(행 클릭 → 생애주기·원가 · 조회 전용)</span>
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="LOT번호·품목명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-80 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
        />
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[14px] font-bold transition-colors ${
            showFilter || activeFilterCount > 0
              ? 'bg-[#3182F6]/10 text-[#3182F6] border border-[#3182F6]/30'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <FunnelIcon className="w-4 h-4" />
          필터
          {activeFilterCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#3182F6] text-white text-[11px] font-black leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>
        <div className="flex items-center gap-1.5 ml-auto">
          <StatusChip label="활성" active={statusFilter === '활성'} count={counts.활성} onClick={() => setStatusFilter('활성')} />
          <StatusChip label="소진" active={statusFilter === '소진'} count={counts.소진} onClick={() => setStatusFilter('소진')} />
          <StatusChip label="전체" active={statusFilter === 'ALL'} count={counts.ALL} onClick={() => setStatusFilter('ALL')} />
        </div>
      </div>

      {/* 필터 패널 — 입고기간/품목명/규격/미수/원산지 (입력된 항목만 AND 적용) */}
      {showFilter && (
        <div className="mb-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-wrap gap-4">
            {/* 입고기간 */}
            <div className="flex-[2] min-w-[240px]">
              <label className="block text-[12px] font-bold text-gray-500 mb-1">입고기간</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(e) => setFilter('from', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-[13px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
                />
                <span className="text-gray-400">~</span>
                <input
                  type="date"
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(e) => setFilter('to', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-[13px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
                />
              </div>
            </div>
            {/* 보관처 — 드롭다운 검색 */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[12px] font-bold text-gray-500 mb-1">보관처</label>
              <input
                list="lot-storage-options"
                value={filters.storage}
                onChange={(e) => setFilter('storage', e.target.value)}
                placeholder="전체"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[14px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
              />
              <datalist id="lot-storage-options">
                {storageOptions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <FilterField className="flex-1 min-w-[110px]" label="규격" value={filters.spec} onChange={(v) => setFilter('spec', v)} placeholder="예: 11" />
            <FilterField className="flex-1 min-w-[110px]" label="미수" value={filters.misu} onChange={(v) => setFilter('misu', v)} placeholder="예: 42/44" />
            <FilterField className="flex-1 min-w-[110px]" label="원산지" value={filters.origin} onChange={(v) => setFilter('origin', v)} placeholder="예: 국산" />
            {/* 보관일수 (최소) */}
            <div className="flex-1 min-w-[130px]">
              <label className="block text-[12px] font-bold text-gray-500 mb-1">보관일수</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={filters.minDays}
                  onChange={(e) => setFilter('minDays', e.target.value)}
                  placeholder="예: 90"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[14px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
                />
                <span className="text-gray-400 text-[13px] whitespace-nowrap">일↑</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              disabled={activeFilterCount === 0}
              className="px-4 py-2 text-[13px] font-bold text-gray-500 hover:text-gray-700 disabled:text-gray-300 transition-colors"
            >
              초기화
            </button>
            <button
              onClick={() => setShowFilter(false)}
              className="px-4 py-2 bg-[#191F28] text-white text-[13px] font-bold rounded-lg active:scale-95 transition-transform"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 다중선택 툴바 — 선택 시에만 노출 */}
      {selectedVisible.length > 0 && (
        <div className="mb-3 flex items-center gap-3 flex-wrap rounded-xl bg-[#3182F6]/5 border border-[#3182F6]/20 px-4 py-3">
          <span className="text-[13px] font-bold text-gray-800">
            {selectedVisible.length}건 선택
            {selectedValuation > 0 && (
              <span className="ml-2 text-gray-500">· 평가액 {formatNum(selectedValuation, '원')}</span>
            )}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3182F6] text-white font-bold text-[13px] rounded-lg hover:bg-[#1c6ce0] active:scale-95 transition-all"
            >
              <PrinterIcon className="w-4 h-4" /> 재고장 인쇄
            </button>
            <button
              onClick={handleCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-[13px] rounded-lg hover:bg-gray-50 active:scale-95 transition-all"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> CSV
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-2 text-gray-400 font-bold text-[13px] hover:text-gray-600 transition-colors"
            >
              해제
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-400 font-bold text-[15px]">결과가 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 표준 구조(app/admin/_table-cols) — 잘림 없이 전부 표시하고 총폭을 넘으면 가로 스크롤.
                창을 좁혀도 table-fixed + minWidth라 컬럼 폭이 줄지 않는다. */}
            <table
              className="w-full table-fixed text-[13px]"
              style={{ minWidth: LOT_MIN_WIDTH }}
            >
              <TableColGroup cols={LOT_COLS} />
              <thead className="bg-gray-50 sticky top-0 z-20">
                <tr className="text-left font-bold text-gray-500 text-[12px]">
                  <th className={lotCls.cell()}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="보이는 항목 전체 선택"
                      className="w-4 h-4 accent-[#3182F6] cursor-pointer align-middle"
                    />
                  </th>
                  <Th label="LOT번호" field="lotNumber" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} thClassName="sticky left-0 z-30 bg-gray-50" />
                  <Th label="최초입고일" field="firstInboundDate" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="품목명" field="productName" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <th className={lotCls.cell()}>규격</th>
                  <th className={lotCls.cell()}>미수</th>
                  <Th numeric label="재고수량" field="stockQty" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th numeric label="총중량" field="stockWeight" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th numeric label="수매가" field="purchasePrice" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th numeric label="재고원가" field="costPerBox" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th numeric label="평가액" field="valuation" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="보관처" field="storageName" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th numeric label="보관일수" field="daysHeld" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} title="최초 입고일 기준 총 보관기간 (이동해도 원본 입고일 유지). 냉장료는 현 보관처 입고일 기준이라 더 짧을 수 있음." />
                  <th className={lotCls.cell()}>상태</th>
                  <th className={lotCls.cell()}>비고</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l, idx) => (
                  <tr
                    key={l.id}
                    onClick={
                      l.lotNumber
                        ? () =>
                            router.push(
                              `/admin/master/lot-timeline?lot=${encodeURIComponent(l.lotNumber)}`,
                            )
                        : undefined
                    }
                    title={l.lotNumber ? '클릭해 LOT 생애주기·원가 보기' : undefined}
                    className={`border-t border-gray-100 hover:bg-blue-50/40 transition-colors ${l.lotNumber ? 'cursor-pointer' : ''}`}
                  >
                    <td
                      className={lotCls.pad('cursor-pointer select-none')}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => onSelectMouseDown(idx, l.id, e)}
                      onMouseEnter={() => {
                        if (dragRef.current) applyDrag(idx);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        readOnly
                        aria-label="선택"
                        className="w-4 h-4 accent-[#3182F6] cursor-pointer align-middle pointer-events-none"
                      />
                    </td>
                    <td className={lotCls.cell('font-bold text-gray-900 sticky left-0 z-10 bg-white')}>
                      {l.lotNumber || '-'}
                    </td>
                    <td className={lotCls.cell('text-gray-500')}>{l.firstInboundDate || '-'}</td>
                    <td className={lotCls.cell('font-bold text-gray-900')}>{l.productName || '-'}</td>
                    <td className={lotCls.cell('text-gray-500')}>{formatSpec(l.spec)}</td>
                    <td className={lotCls.cell('text-gray-500')}>{formatMisu(l.misu)}</td>
                    <NumCell
                      className={lotCls.pad(`font-bold ${l.stockQty > 0 ? 'text-[#3182F6]' : 'text-gray-300'}`)}
                      value={l.stockQty}
                      unit="박스"
                    />
                    <NumCell
                      className={lotCls.pad('text-gray-600')}
                      value={l.stockWeight > 0 ? l.stockWeight : null}
                      unit="kg"
                    />
                    <NumCell
                      className={lotCls.pad('text-gray-700')}
                      value={l.purchasePrice > 0 ? l.purchasePrice : null}
                      unit="원"
                    />
                    <NumCell
                      className={lotCls.pad('text-gray-700')}
                      value={l.costPerBox > 0 ? l.costPerBox : null}
                      unit="원"
                    />
                    <NumCell
                      className={lotCls.pad('font-bold text-gray-900')}
                      value={l.costPerBox > 0 ? l.valuation : null}
                      unit="원"
                    />
                    <td className={lotCls.cell('text-gray-600')}>{l.storageName || '-'}</td>
                    <NumCell
                      className={lotCls.pad('text-gray-500')}
                      value={l.firstInboundDate ? l.daysHeld : null}
                      unit="일"
                    />
                    <td className={lotCls.cell()}>
                      {!l.status ? (
                        <span className="text-gray-300">-</span>
                      ) : l.status === '승인 완료' ? (
                        // 활성 LOT(대다수)은 조용한 점 — 상세 사유는 tooltip. 예외 상태만 배지로 강조.
                        <span className="inline-flex items-center" title={l.statusReason || l.status}>
                          <span className="w-2 h-2 rounded-full bg-green-400" />
                        </span>
                      ) : (
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${statusColor(l.status)}`}>
                          {l.statusReason || l.status}
                        </span>
                      )}
                    </td>
                    <td className={lotCls.clamp('text-gray-500')} title={l.memo || undefined}>
                      {l.memo || <span className="text-gray-300">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-black text-gray-800 text-[13px]">
                  <td className={lotCls.pad()} colSpan={6}>
                    합계{' '}
                    <span className="text-gray-400 font-bold">
                      ({summaryIsSelection ? `선택 ${selectedVisible.length}건` : `${visible.length}건`})
                    </span>
                  </td>
                  <NumCell className={lotCls.pad('text-[#3182F6]')} value={sumQty} unit="박스" />
                  <NumCell
                    className={lotCls.pad('text-gray-700')}
                    value={sumWeight > 0 ? sumWeight : null}
                    unit="kg"
                  />
                  <td className={lotCls.pad()} />
                  <td className={lotCls.pad()} />
                  <NumCell
                    className={lotCls.pad('text-gray-900')}
                    value={sumVal > 0 ? sumVal : null}
                    unit="원"
                  />
                  <td className={lotCls.pad()} />
                  <td className={lotCls.pad()} />
                  <td className={lotCls.pad()} />
                  <td className={lotCls.pad()} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 컬럼 폭 (표준: app/admin/_table-cols — 잘림 없이 전부 표시 + 넘치면 가로 스크롤)
// px = 실측 내용 최댓값 + 여유 8 + 좌우 패딩 32(px-4).
// 실측 근거: 2026-07-28 Airtable `LOT별 재고` 200건 전량의 표시 문자열.
// 정렬 헤더(Th)는 ↕ 아이콘 18px이 더 붙으므로 그 하한도 함께 반영.
const LOT_COLS: TableCol[] = [
  { key: 'check', label: '', px: 48 },
  { key: 'lotNumber', label: 'LOT번호', px: 248 },      // max 206 `251002-MA1-21.5/22-점70/80-0008`
  { key: 'firstInboundDate', label: '최초입고일', px: 124 }, // 헤더(65+18)가 하한
  { key: 'productName', label: '품목명', px: 152 },      // max 111 `사료 (BOAR FISH)`
  { key: 'spec', label: '규격', px: 100 },               // max 59 `11.5~12kg`
  { key: 'misu', label: '미수', px: 104 },               // max 62 `70/120G미`
  { key: 'stockQty', label: '재고수량', px: 112, numeric: true },  // max 59 `1,000박스`
  { key: 'stockWeight', label: '총중량', px: 100, numeric: true }, // max 55 `11,245kg`
  { key: 'purchasePrice', label: '수매가', px: 100, numeric: true }, // max 60 `104,000원`
  { key: 'costPerBox', label: '재고원가', px: 112, numeric: true },  // 헤더(52+18)가 하한
  { key: 'valuation', label: '평가액', px: 128, numeric: true },     // max 86 `156,307,899원`
  { key: 'storageName', label: '보관처', px: 140 },      // max 98 `신우농수산2공장`
  { key: 'daysHeld', label: '보관일수', px: 112, numeric: true },    // 헤더(52+18)가 하한
  { key: 'status', label: '상태', px: 112 },             // 상태사유 배지 `이동 입고` 등
  // 비고만 「말줄임 금지」 예외(clamp) — 자유 텍스트라 최댓값을 예측할 수 없다.
  // 실측 max 265지만 상한 240으로 묶고 넘치면 말줄임 + title 툴팁.
  { key: 'memo', label: '비고', px: 240, clamp: true },
];
const LOT_MIN_WIDTH = tableMinWidth(LOT_COLS);
const lotCls = makeCellClasses('px-4');

// 색은 라이프사이클 상태에 매핑: 승인 완료(녹색)/소진(회색)/반려(빨강)/취소(연빨강)
function statusColor(status: string): string {
  switch (status) {
    case '승인 완료':
      return 'bg-green-100 text-green-700';
    case '소진':
      return 'bg-gray-100 text-gray-500';
    case '승인 대기':
      return 'bg-[#3182F6]/10 text-[#3182F6]';
    case '반려':
      return 'bg-red-50 text-red-500';
    case '취소':
      return 'bg-red-50 text-red-400';
    default:
      return 'bg-gray-50 text-gray-400';
  }
}

function FilterField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[12px] font-bold text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[14px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
      />
    </div>
  );
}

function StatusChip({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-[12px] font-bold transition-colors ${
        active
          ? 'bg-[#3182F6] text-white'
          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label} <span className={active ? 'text-blue-100' : 'text-gray-400'}>{count}</span>
    </button>
  );
}

function Th({
  label,
  field,
  sortField,
  sortDir,
  onToggle,
  title,
  numeric = false,
  thClassName = '',
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onToggle: (f: SortField) => void;
  title?: string;
  /** 수량·중량·금액·단가 컬럼 — 값 셀(NumCell)과 우측 끝을 맞춘다. */
  numeric?: boolean;
  thClassName?: string;
}) {
  const Icon =
    sortField === field
      ? sortDir === 'asc'
        ? ChevronUpIcon
        : ChevronDownIcon
      : ArrowsUpDownIcon;
  return (
    <th
      onClick={() => onToggle(field)}
      title={title}
      className={`whitespace-nowrap px-4 py-3 cursor-pointer select-none hover:text-[#3182F6] transition-colors ${
        numeric ? NUM_CELL : ''
      } ${thClassName}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon
          className={`w-3.5 h-3.5 ${
            sortField === field ? 'text-[#3182F6]' : 'text-gray-300'
          }`}
        />
      </span>
    </th>
  );
}
