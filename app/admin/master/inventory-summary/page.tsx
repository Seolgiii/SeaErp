'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { formatIntKo } from '@/lib/number-format';
import { formatSpecKgMisu } from '@/lib/spec-display';
import { listLots, type Lot } from '@/app/actions/admin/master-lots';

type ViewMode = 'storage-product' | 'storage-only' | 'product-only';
type SortField = 'group' | 'lots' | 'qty';
type SortDir = 'asc' | 'desc';

type Row = {
  key: string;
  storage: string;
  product: string;
  spec: string;
  misu: string;
  lots: number;
  qty: number;
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
  const baseLots = useMemo(
    () =>
      lots.filter(
        (l) =>
          l.approvalStatus === '승인 완료' &&
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
      let row: Omit<Row, 'lots' | 'qty'>;
      if (view === 'storage-product') {
        key = `${storage}${product}${l.spec}${l.misu}`;
        row = { key, storage, product, spec: l.spec, misu: l.misu };
      } else if (view === 'storage-only') {
        key = storage;
        row = { key, storage, product: '', spec: '', misu: '' };
      } else {
        key = `${product}${l.spec}${l.misu}`;
        row = { key, storage: '', product, spec: l.spec, misu: l.misu };
      }
      const prev = map.get(key);
      if (prev) {
        prev.lots += 1;
        prev.qty += l.stockQty;
      } else {
        map.set(key, { ...row, lots: 1, qty: l.stockQty });
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
      const ga = `${a.storage} ${a.product}`.trim();
      const gb = `${b.storage} ${b.product}`.trim();
      return ga.localeCompare(gb, 'ko') * dir;
    });
  }, [baseLots, view, storageFilter, search, sortField, sortDir]);

  const totals = useMemo(
    () => ({
      qty: rows.reduce((s, r) => s + r.qty, 0),
      lots: rows.reduce((s, r) => s + r.lots, 0),
    }),
    [rows],
  );

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
    <div className="p-8 min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-black text-gray-900 tracking-tight">재고 현황 집계</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {isLoading ? '집계 중...' : `${rows.length}행 · 총 ${formatIntKo(totals.qty)}박스 · ${totals.lots}LOT`}
            <span className="ml-2 text-gray-400">(승인 완료 LOT 기준)</span>
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
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left font-bold text-gray-500 text-[12px]">
                  {view !== 'product-only' && (
                    <Th label="보관처" field="group" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  )}
                  {view !== 'storage-only' && (
                    <>
                      <th className="px-4 py-3">품목</th>
                      <th className="px-4 py-3">규격·미수</th>
                    </>
                  )}
                  <Th label="LOT 수" field="lots" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="재고 합계" field="qty" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-t border-gray-100 hover:bg-blue-50/40 transition-colors">
                    {view !== 'product-only' && (
                      <td className="px-4 py-3 font-bold text-gray-900">{r.storage || '-'}</td>
                    )}
                    {view !== 'storage-only' && (
                      <>
                        <td className="px-4 py-3 text-gray-700">{r.product || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatSpecKgMisu(r.spec, r.misu) || '-'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-gray-600">{r.lots}</td>
                    <td className={`px-4 py-3 font-bold ${r.qty > 0 ? 'text-[#3182F6]' : 'text-gray-300'}`}>
                      {formatIntKo(r.qty)}박스
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr className="text-[13px] font-black text-gray-800">
                  <td
                    className="px-4 py-3"
                    colSpan={view === 'storage-only' ? 1 : view === 'product-only' ? 2 : 3}
                  >
                    합계
                  </td>
                  <td className="px-4 py-3">{totals.lots}</td>
                  <td className="px-4 py-3 text-[#3182F6]">{formatIntKo(totals.qty)}박스</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({
  label,
  field,
  sortField,
  sortDir,
  onToggle,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onToggle: (f: SortField) => void;
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
      className="px-4 py-3 cursor-pointer select-none hover:text-[#3182F6] transition-colors"
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
