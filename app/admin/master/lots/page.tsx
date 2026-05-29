'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { formatIntKo } from '@/lib/number-format';
import { formatSpec, formatMisu } from '@/lib/spec-display';
import { listLots, type Lot } from '@/app/actions/admin/master-lots';

type SortField = 'lotNumber' | 'productName' | 'stockQty' | 'firstInboundDate' | 'storageName';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'ALL' | '활성' | '소진';

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

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir(field === 'firstInboundDate' || field === 'stockQty' ? 'desc' : 'asc');
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
          <h1 className="text-[22px] font-black text-gray-900 tracking-tight">재고(LOT별)</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {visible.length}건{(search || statusFilter !== 'ALL') && ` / 전체 ${items.length}건`}
            <span className="ml-2 text-gray-400">(행 클릭 → 생애주기 · 조회 전용)</span>
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
        <div className="flex items-center gap-1.5">
          <StatusChip label="활성" active={statusFilter === '활성'} count={counts.활성} onClick={() => setStatusFilter('활성')} />
          <StatusChip label="소진" active={statusFilter === '소진'} count={counts.소진} onClick={() => setStatusFilter('소진')} />
          <StatusChip label="전체" active={statusFilter === 'ALL'} count={counts.ALL} onClick={() => setStatusFilter('ALL')} />
        </div>
      </div>

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
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left font-bold text-gray-500 text-[12px]">
                  <Th label="LOT번호" field="lotNumber" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="품목명" field="productName" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <th className="px-4 py-3">규격</th>
                  <th className="px-4 py-3">미수</th>
                  <Th label="재고수량" field="stockQty" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="보관처" field="storageName" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <th className="px-4 py-3">상태</th>
                  <Th label="최초입고일" field="firstInboundDate" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => (
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
                    title={l.lotNumber ? '클릭해 LOT 생애주기 보기' : undefined}
                    className={`border-t border-gray-100 hover:bg-blue-50/40 transition-colors ${l.lotNumber ? 'cursor-pointer' : ''}`}
                  >
                    <td className="px-4 py-3 font-bold text-gray-900">{l.lotNumber || '-'}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{l.productName || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatSpec(l.spec)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatMisu(l.misu)}</td>
                    <td className={`px-4 py-3 font-bold ${l.stockQty > 0 ? 'text-[#3182F6]' : 'text-gray-300'}`}>
                      {formatIntKo(l.stockQty)}박스
                    </td>
                    <td className="px-4 py-3 text-gray-600">{l.storageName || '-'}</td>
                    <td className="px-4 py-3">
                      {l.statusReason ? (
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${statusColor(l.status)}`}>
                          {l.statusReason}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{l.firstInboundDate || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

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
