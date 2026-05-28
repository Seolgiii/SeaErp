'use client';

import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import type { Filters } from '@/app/components/stock-status-shared';

interface Props {
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  setNotFound: Dispatch<SetStateAction<boolean>>;
  productNames: string[];
  isLoading: boolean;
  notFound: boolean;
  canSearch: boolean;
  onSearch: () => void;
}

/**
 * 재고조회 1단계: 검색 폼.
 * - 자체 상태: showDropdown / dropdownRef (자동완성 드롭다운, 폼 내부에서만 의미)
 * - 부모 상태 사용: filters / notFound / isLoading / productNames (parent 한 번만 fetch)
 */
export default function StockStatusForm({
  filters,
  setFilters,
  setNotFound,
  productNames,
  isLoading,
  notFound,
  canSearch,
  onSearch,
}: Props) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredNames = filters.q.trim().length > 0
    ? productNames.filter((n) => n.includes(filters.q.trim())).slice(0, 8)
    : [];

  return (
    <main
      className="min-h-screen bg-[#F2F4F6]"
      style={{ fontFamily: "'Spoqa Han Sans Neo', sans-serif" }}
    >
      <PageHeader title="재고 조회" onBack={() => router.push('/')} />

      <div className="pt-3 px-5 pb-5 space-y-3">
        <div className="bg-white rounded-[24px] p-5 shadow-[0_8px_24px_rgba(149,157,165,0.08)] space-y-4">

          {/* 품목명 — 자동완성 */}
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-gray-500">품목명</label>
            <div className="relative" ref={dropdownRef}>
              <input
                type="text"
                placeholder="예: 연어 필렛"
                value={filters.q}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, q: e.target.value }));
                  setNotFound(false);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { setShowDropdown(false); onSearch(); }
                  if (e.key === 'Escape') setShowDropdown(false);
                }}
                className="w-full bg-gray-100 rounded-2xl px-4 py-3.5 text-[15px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              {showDropdown && filteredNames.length > 0 && (
                <ul className="absolute z-20 w-full mt-1 bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden border border-gray-100 max-h-52 overflow-y-auto">
                  {filteredNames.map((name) => (
                    <li
                      key={name}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFilters((f) => ({ ...f, q: name }));
                        setShowDropdown(false);
                        setNotFound(false);
                      }}
                      className="px-4 py-3 text-[14px] font-bold text-gray-800 hover:bg-blue-50 active:bg-blue-100 cursor-pointer"
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 규격 + 미수 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-500">규격</label>
              <input
                type="text"
                placeholder="예: 11"
                value={filters.spec}
                onChange={(e) => { setFilters((f) => ({ ...f, spec: e.target.value })); setNotFound(false); }}
                className="w-full bg-gray-100 rounded-2xl px-4 py-3.5 text-[15px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-500">미수</label>
              <input
                type="text"
                placeholder="예: 42/44"
                value={filters.misu}
                onChange={(e) => { setFilters((f) => ({ ...f, misu: e.target.value })); setNotFound(false); }}
                className="w-full bg-gray-100 rounded-2xl px-4 py-3.5 text-[15px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* 입고기간 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-gray-500">입고기간</label>
              <button
                type="button"
                onClick={() => { setFilters((f) => ({ ...f, from: '', to: '' })); setNotFound(false); }}
                className={`text-[12px] font-bold px-3 py-1 rounded-full transition-colors ${
                  !filters.from && !filters.to
                    ? 'bg-[#3182F6] text-white'
                    : 'bg-gray-100 text-gray-500 active:bg-gray-200'
                }`}
              >
                전체
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.from}
                onChange={(e) => { setFilters((f) => ({ ...f, from: e.target.value })); setNotFound(false); }}
                className="flex-1 bg-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <span className="text-gray-400 font-bold shrink-0">~</span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => { setFilters((f) => ({ ...f, to: e.target.value })); setNotFound(false); }}
                className="flex-1 bg-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            {!filters.from && !filters.to && (
              <p className="text-[12px] font-bold text-[#3182F6] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                전체 기간으로 조회됩니다
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onSearch}
          disabled={!canSearch || isLoading}
          className="w-full py-4 rounded-[20px] bg-blue-600 text-white text-[16px] font-black shadow-[0_4px_16px_rgba(59,130,246,0.3)] active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {isLoading ? '조회 중...' : '조회하기'}
        </button>

        {/* 결과 없음 인라인 메시지 */}
        {notFound && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-center">
            <p className="text-[14px] font-bold text-amber-700">일치하는 재고가 없습니다</p>
            <p className="text-[12px] text-amber-500 mt-1">검색 조건을 바꿔서 다시 시도해보세요</p>
          </div>
        )}
      </div>
    </main>
  );
}
