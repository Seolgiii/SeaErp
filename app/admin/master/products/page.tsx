'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { listProducts, type Product } from '@/app/actions/admin/master-products';
import ProductEditModal from '@/app/components/ProductEditModal';

type SortField = 'name' | 'code' | 'category' | 'spec';
type SortDir = 'asc' | 'desc';

/**
 * 제품 마스터 관리 페이지.
 * - 표 + 검색(품목명/품목코드) + 정렬(컬럼 클릭) + "+ 추가" 버튼
 * - 행 클릭 → ProductEditModal (수정/삭제)
 * - "+ 추가" → ProductEditModal (신규)
 */
export default function ProductsMasterPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField | null>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

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
    const result = await listProducts(workerId);
    if (result.success) {
      setProducts(result.data);
    } else {
      toast(`조회 실패: ${result.error}`, 'error');
    }
    setIsLoading(false);
  }, [workerId]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  // 검색 + 정렬 파생
  const visible = (() => {
    const q = search.trim().toLowerCase();
    let list = products;
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
      );
    }
    if (sortField) {
      const dir = sortDir === 'asc' ? 1 : -1;
      list = [...list].sort(
        (a, b) =>
          String(a[sortField] ?? '').localeCompare(
            String(b[sortField] ?? ''),
            'ko',
          ) * dir,
      );
    }
    return list;
  })();

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
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
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-black text-gray-900 tracking-tight">제품 마스터</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {visible.length}건{search && ` / 전체 ${products.length}건`}
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="px-5 py-2.5 bg-[#3182F6] text-white font-bold text-[14px] rounded-xl shadow-sm hover:bg-[#1c6ce0] active:scale-95 transition-all flex items-center gap-1.5"
        >
          <PlusIcon className="w-4 h-4" />
          제품 추가
        </button>
      </div>

      {/* 검색 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="품목명·품목코드 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-80 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
        />
      </div>

      {/* 표 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-400 font-bold text-[15px]">
              {search ? '검색 결과가 없습니다' : '등록된 제품이 없습니다'}
            </p>
            {!search && (
              <button
                onClick={() => setEditing('new')}
                className="mt-4 px-5 py-2.5 bg-[#3182F6] text-white font-bold text-[14px] rounded-xl active:scale-95 transition-all"
              >
                첫 제품 추가하기
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left font-bold text-gray-500 text-[12px]">
                  <Th label="품목명" field="name" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="품목코드" field="code" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="품목구분" field="category" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="권장규격" field="spec" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <th className="px-4 py-3">상세규격</th>
                  <th className="px-4 py-3">원산지</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setEditing(p)}
                    className="border-t border-gray-100 hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-gray-900">{p.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.code || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.category || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.spec || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.detailSpec || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.origin || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 편집 모달 */}
      {editing && (
        <ProductEditModal
          mode={editing === 'new' ? 'create' : 'edit'}
          product={editing === 'new' ? null : editing}
          workerId={workerId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void loadData();
          }}
        />
      )}
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
  sortField: SortField | null;
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
