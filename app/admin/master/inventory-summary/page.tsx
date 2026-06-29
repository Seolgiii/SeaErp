'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { formatIntKo } from '@/lib/number-format';
import { formatSpec, formatMisu, formatSize } from '@/lib/spec-display';
import { listLots, type Lot } from '@/app/actions/admin/master-lots';

type ViewMode = 'storage-product' | 'storage-only' | 'product-only';
type SortField = 'group' | 'lots' | 'qty';
type SortDir = 'asc' | 'desc';
type Primary = 'storage' | 'product';

type Row = {
  key: string;
  storage: string;
  product: string;
  spec: string;
  misu: string;
  lots: number;
  qty: number;
  /** 현재 재고 총중량 합(kg) = Σ(박스당 무게 × 재고수량) */
  weight: number;
  /** 현재고 평가액 합(원) = Σ(박스당 재고원가 × 재고수량) */
  valuation: number;
  /** 현재고에 묶인 누적 보관비 합(원) = Σ((박스당 재고원가 − 수매가) × 재고수량). 오늘 기준 */
  storageCost: number;
};

const VIEW_OPTIONS: { value: ViewMode; label: string; desc: string }[] = [
  { value: 'storage-product', label: '보관처 × 품목', desc: '보관처마다 어떤 품목이 몇 박스 있는지' },
  { value: 'storage-only', label: '보관처 합계', desc: '보관처별 총 박스·LOT 수' },
  { value: 'product-only', label: '품목 합계', desc: '품목별 총 박스·LOT 수 (보관처 무관)' },
];

export default function InventorySummaryPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('storage-product');
  const [includeDepleted, setIncludeDepleted] = useState(false);
  const [search, setSearch] = useState('');
  const [storageFilter, setStorageFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('qty');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  // 보관처 × 품목 뷰에서 어떤 컬럼이 먼저 오는지 (= 1차 그룹화 기준).
  // 헤더 클릭으로 swap. 같은 데이터를 두 관점으로 본다.
  const [primary, setPrimary] = useState<Primary>('storage');
  // 보관처·품목 두 컬럼을 내용 길이에 맞춘 최소 너비로 줄이되, 더 긴 쪽 기준으로 통일.
  const tableRef = useRef<HTMLTableElement>(null);
  const [pairW, setPairW] = useState<number>();

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
    if (result.success) setLots(result.data);
    else toast(`조회 실패: ${result.error}`, 'error');
    setIsLoading(false);
  }, [workerId]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  // 승인 완료 + 재고수량 > 0 인 LOT만 집계 대상 (옵션으로 0 박스 포함 가능)
  // 라이프사이클 상태: '승인 완료'(활성) 또는 '소진'(재고 0이지만 정상 처리 완료) 둘 다 포함
  const baseLots = useMemo(
    () =>
      lots.filter(
        (l) =>
          (l.status === '승인 완료' || l.status === '소진') &&
          (includeDepleted || l.stockQty > 0),
      ),
    [lots, includeDepleted],
  );

  const storageOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of baseLots) if (l.storageName) set.add(l.storageName);
    return ['ALL', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'))];
  }, [baseLots]);

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    for (const l of baseLots) {
      if (storageFilter !== 'ALL' && l.storageName !== storageFilter) continue;
      const storage = l.storageName || '(미지정)';
      const product = l.productName || '(미지정)';
      let key: string;
      let row: Omit<Row, 'lots' | 'qty' | 'weight' | 'valuation' | 'storageCost'>;
      if (view === 'storage-product') {
        key = JSON.stringify([storage, product, l.spec, l.misu]);
        row = { key, storage, product, spec: l.spec, misu: l.misu };
      } else if (view === 'storage-only') {
        key = storage;
        row = { key, storage, product: '', spec: '', misu: '' };
      } else {
        key = JSON.stringify([product, l.spec, l.misu]);
        row = { key, storage: '', product, spec: l.spec, misu: l.misu };
      }
      // 보관비 = 박스당(재고원가 − 수매가) × 재고수량 — 현재고에 묶인 보관 비용분(오늘 기준).
      const lotStorageCost =
        Math.max(0, l.costPerBox - l.purchasePrice) * Math.max(0, l.stockQty);
      const prev = map.get(key);
      if (prev) {
        prev.lots += 1;
        prev.qty += l.stockQty;
        prev.weight += l.stockWeight;
        prev.valuation += l.valuation;
        prev.storageCost += lotStorageCost;
      } else {
        map.set(key, {
          ...row,
          lots: 1,
          qty: l.stockQty,
          weight: l.stockWeight,
          valuation: l.valuation,
          storageCost: lotStorageCost,
        });
      }
    }
    const list = Array.from(map.values());

    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (r) =>
            r.storage.toLowerCase().includes(q) ||
            r.product.toLowerCase().includes(q),
        )
      : list;

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortField === 'qty') return (a.qty - b.qty) * dir;
      if (sortField === 'lots') return (a.lots - b.lots) * dir;
      // 'group' 정렬: storage-product 뷰에서는 primary 우선, 외 뷰는 보관처+품목 합성.
      const ga = view === 'storage-product' && primary === 'product'
        ? `${a.product} ${a.storage}`.trim()
        : `${a.storage} ${a.product}`.trim();
      const gb = view === 'storage-product' && primary === 'product'
        ? `${b.product} ${b.storage}`.trim()
        : `${b.storage} ${b.product}`.trim();
      return ga.localeCompare(gb, 'ko') * dir;
    });
  }, [baseLots, view, storageFilter, search, sortField, sortDir, primary]);

  const totals = useMemo(
    () => ({
      qty: rows.reduce((s, r) => s + r.qty, 0),
      lots: rows.reduce((s, r) => s + r.lots, 0),
      weight: rows.reduce((s, r) => s + r.weight, 0),
      valuation: rows.reduce((s, r) => s + r.valuation, 0),
      storageCost: rows.reduce((s, r) => s + r.storageCost, 0),
    }),
    [rows],
  );

  // storage-product 뷰: 보관처·품목 두 컬럼을 내용에 맞춘 최소 너비로 줄이되,
  // 둘 중 더 긴 쪽 기준으로 같은 너비로 통일 → swap해도 폭이 흔들리지 않음.
  // table-auto + 비-w-full이라 컬럼이 내용만큼만 차지(콤팩트)하고, 남는 폭은 채우지 않음.
  useEffect(() => {
    if (view !== 'storage-product') {
      setPairW(undefined);
      return;
    }
    const table = tableRef.current;
    if (!table) return;
    const cols = table.querySelectorAll<HTMLTableColElement>('colgroup col');
    const ths = table.querySelectorAll<HTMLElement>('thead th');
    const ca = cols[0];
    const cb = cols[1];
    const ta = ths[0];
    const tb = ths[1];
    if (!ca || !cb || !ta || !tb) return;
    // 적용된 너비를 비워 내용 자연 너비를 측정한 뒤, 더 넓은 쪽으로 둘을 통일.
    ca.style.width = '';
    cb.style.width = '';
    const next = Math.ceil(
      Math.max(ta.getBoundingClientRect().width, tb.getBoundingClientRect().width),
    );
    ca.style.width = `${next}px`;
    cb.style.width = `${next}px`;
    setPairW(next);
  }, [view, rows]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir(field === 'group' ? 'asc' : 'desc');
    }
  };

  if (!workerId) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] p-8 min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-black text-gray-900 tracking-tight">재고 집계</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {isLoading ? '집계 중...' : `${rows.length}행 · 총 ${formatIntKo(totals.qty)}박스 · ${totals.lots}LOT`}
            <span className="ml-2 text-gray-400">(승인 완료·소진 LOT 기준)</span>
          </p>
        </div>
      </div>

      {/* 뷰 선택 */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {VIEW_OPTIONS.map((opt) => {
          const selected = view === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setView(opt.value)}
              className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${
                selected
                  ? 'border-[#3182F6] bg-[#3182F6]/5'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <p
                className={`text-[14px] font-bold ${selected ? 'text-[#3182F6]' : 'text-gray-800'}`}
              >
                {opt.label}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          );
        })}
      </div>

      {/* 필터 */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="보관처·품목 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
        />
        <select
          value={storageFilter}
          onChange={(e) => setStorageFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6]"
        >
          {storageOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt === 'ALL' ? '모든 보관처' : opt}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={includeDepleted}
            onChange={(e) => setIncludeDepleted(e.target.checked)}
            className="w-4 h-4 accent-[#3182F6]"
          />
          <span className="text-[12px] font-bold text-gray-700">소진 LOT 포함</span>
        </label>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-400 font-bold text-[15px]">집계할 재고가 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              ref={tableRef}
              className={`text-[13px] ${view === 'storage-product' ? '' : 'w-full table-fixed'}`}
            >
              {/* 보관처/품목 너비는 pairW(측정값)로 동기화 — 둘 중 더 긴 내용에 맞춘
                  최소 너비로 통일. table-auto + 비-w-full이라 내용만큼만 차지(콤팩트),
                  남는 폭은 채우지 않음. swap해도 둘이 같은 폭이라 흔들리지 않음. */}
              {view === 'storage-product' && (
                <colgroup>
                  <col style={pairW ? { width: pairW } : undefined} />
                  <col style={pairW ? { width: pairW } : undefined} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '110px' }} />
                </colgroup>
              )}
              {view === 'storage-only' && (
                <colgroup>
                  <col />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '140px' }} />
                </colgroup>
              )}
              {view === 'product-only' && (
                <colgroup>
                  <col />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '110px' }} />
                </colgroup>
              )}
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left font-bold text-gray-500 text-[12px]">
                  {/* storage-product 뷰: 보관처/품목을 swap 버튼으로. primary가 먼저 옴.
                      다른 뷰는 기존 단일 열 그대로 (정렬 의미 있음). */}
                  {view === 'storage-product' ? (
                    primary === 'storage' ? (
                      <>
                        <SwapTh label="보관처" active onSwap={() => setPrimary('product')} />
                        <SwapTh label="품목" onSwap={() => setPrimary('product')} />
                      </>
                    ) : (
                      <>
                        <SwapTh label="품목" active onSwap={() => setPrimary('storage')} />
                        <SwapTh label="보관처" onSwap={() => setPrimary('storage')} />
                      </>
                    )
                  ) : view === 'storage-only' ? (
                    <Th label="보관처" field="group" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} paddingX="px-3" />
                  ) : (
                    <Th label="품목" field="group" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} paddingX="px-3" />
                  )}
                  {view !== 'storage-only' && (
                    <>
                      <th className="px-4 py-3">규격</th>
                      <th className="px-4 py-3">미수</th>
                      <th className="px-4 py-3">사이즈</th>
                    </>
                  )}
                  <Th label="LOT 수" field="lots" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="재고 합계" field="qty" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <th className="px-4 py-3" title="현재 재고 총중량(kg) = 박스당 무게 × 재고수량">총중량</th>
                  {view === 'storage-only' && (
                    <>
                      <th
                        className="px-4 py-3"
                        title="현재고에 묶인 누적 보관비 (오늘 기준 · 냉장료+입출고비+노조비+동결비+이월). 기간별 발생액은 추후 추가 예정."
                      >
                        보관비
                      </th>
                      <th className="px-4 py-3" title="현재고 평가액 = 박스당 재고원가 × 재고수량">
                        평가액
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-t border-gray-100 hover:bg-blue-50/40 transition-colors">
                    {view === 'storage-product' ? (
                      primary === 'storage' ? (
                        <>
                          <td className="px-3 py-3 font-bold text-gray-900 truncate" title={r.storage || undefined}>{r.storage || '-'}</td>
                          <td className="px-3 py-3 text-gray-700 truncate" title={r.product || undefined}>{r.product || '-'}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3 font-bold text-gray-900 truncate" title={r.product || undefined}>{r.product || '-'}</td>
                          <td className="px-3 py-3 text-gray-700 truncate" title={r.storage || undefined}>{r.storage || '-'}</td>
                        </>
                      )
                    ) : view === 'storage-only' ? (
                      <td className="px-3 py-3 font-bold text-gray-900 truncate" title={r.storage || undefined}>{r.storage || '-'}</td>
                    ) : (
                      <td className="px-3 py-3 font-bold text-gray-900 truncate" title={r.product || undefined}>{r.product || '-'}</td>
                    )}
                    {view !== 'storage-only' && (
                      <>
                        <td className="px-4 py-3 text-gray-500">{formatSpec(r.spec)}</td>
                        <td className="px-4 py-3 text-gray-500">{formatMisu(r.misu)}</td>
                        <td className="px-4 py-3 text-gray-500">{formatSize(r.spec, r.misu)}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-gray-600">{r.lots}</td>
                    <td className={`px-4 py-3 font-bold ${r.qty > 0 ? 'text-[#3182F6]' : 'text-gray-300'}`}>
                      {formatIntKo(r.qty)}박스
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-600">
                      {r.weight > 0 ? `${formatIntKo(r.weight)} kg` : '-'}
                    </td>
                    {view === 'storage-only' && (
                      <>
                        <td className="px-4 py-3 tabular-nums text-gray-700">
                          {r.storageCost > 0 ? `${formatIntKo(Math.round(r.storageCost))}원` : '-'}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-bold text-gray-900">
                          {r.valuation > 0 ? `${formatIntKo(Math.round(r.valuation))}원` : '-'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr className="text-[13px] font-black text-gray-800">
                  <td
                    className="px-4 py-3"
                    colSpan={view === 'storage-only' ? 1 : view === 'product-only' ? 4 : 5}
                  >
                    합계
                  </td>
                  <td className="px-4 py-3">{totals.lots}</td>
                  <td className="px-4 py-3 text-[#3182F6]">{formatIntKo(totals.qty)}박스</td>
                  <td className="px-4 py-3 tabular-nums text-gray-700">
                    {totals.weight > 0 ? `${formatIntKo(totals.weight)} kg` : '-'}
                  </td>
                  {view === 'storage-only' && (
                    <>
                      <td className="px-4 py-3 tabular-nums text-gray-700">
                        {totals.storageCost > 0 ? `${formatIntKo(Math.round(totals.storageCost))}원` : '-'}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-gray-900">
                        {totals.valuation > 0 ? `${formatIntKo(Math.round(totals.valuation))}원` : '-'}
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Swap-on-click 헤더. asc/desc 정렬 대신 컬럼 순서 swap.
 * active=true (현재 primary)는 파란색 강조, 비활성은 회색 + swap 아이콘.
 */
function SwapTh({
  label,
  active = false,
  onSwap,
}: {
  label: string;
  active?: boolean;
  onSwap: () => void;
}) {
  return (
    <th
      onClick={onSwap}
      title={active ? '클릭해 순서 바꾸기' : '클릭해 이 컬럼을 앞으로'}
      className="px-3 py-3 cursor-pointer select-none transition-colors group"
    >
      <span
        className={`inline-flex items-center gap-1 ${
          active ? 'text-[#3182F6]' : 'text-gray-500 group-hover:text-[#3182F6]'
        }`}
      >
        {label}
        <ArrowsRightLeftIcon
          className={`w-3.5 h-3.5 ${active ? 'text-[#3182F6]' : 'text-gray-300 group-hover:text-[#3182F6]'}`}
        />
      </span>
    </th>
  );
}

function Th({
  label,
  field,
  sortField,
  sortDir,
  onToggle,
  paddingX = 'px-4',
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onToggle: (f: SortField) => void;
  paddingX?: string;
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
      className={`${paddingX} py-3 cursor-pointer select-none hover:text-[#3182F6] transition-colors`}
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
