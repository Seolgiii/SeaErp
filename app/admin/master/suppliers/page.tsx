'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { listSuppliers, type Supplier } from '@/app/actions/admin/master-suppliers';
import SupplierEditModal from '@/app/components/SupplierEditModal';

type SortDir = 'asc' | 'desc';

export default function SuppliersMasterPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [items, setItems] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);

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
    const result = await listSuppliers(workerId);
    if (result.success) setItems(result.data);
    else toast(`조회 실패: ${result.error}`, 'error');
    setIsLoading(false);
  }, [workerId]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  const visible = (() => {
    const q = search.trim().toLowerCase();
    let list = q ? items.filter((s) => s.name.toLowerCase().includes(q)) : items;
    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ko') * dir);
    return list;
  })();

  if (!workerId) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
      </div>
    );
  }

  const SortIcon = sortDir === 'asc' ? ChevronUpIcon : ChevronDownIcon;

  return (
    <div className="mx-auto max-w-[1200px] p-8 min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-black text-gray-900 tracking-tight">매입처 마스터</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {visible.length}건{search && ` / 전체 ${items.length}건`}
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="px-5 py-2.5 bg-[#3182F6] text-white font-bold text-[14px] rounded-xl shadow-sm hover:bg-[#1c6ce0] active:scale-95 transition-all flex items-center gap-1.5"
        >
          <PlusIcon className="w-4 h-4" />
          매입처 추가
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="매입처명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-80 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-400 font-bold text-[15px]">
              {search ? '검색 결과가 없습니다' : '등록된 매입처가 없습니다'}
            </p>
            {!search && (
              <button
                onClick={() => setEditing('new')}
                className="mt-4 px-5 py-2.5 bg-[#3182F6] text-white font-bold text-[14px] rounded-xl active:scale-95 transition-all"
              >
                첫 매입처 추가하기
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left font-bold text-gray-500 text-[12px]">
                  <th
                    onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                    className="px-4 py-3 cursor-pointer select-none hover:text-[#3182F6] transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      매입처명
                      <SortIcon className="w-3.5 h-3.5 text-[#3182F6]" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setEditing(s)}
                    className="border-t border-gray-100 hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-gray-900">{s.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <SupplierEditModal
          mode={editing === 'new' ? 'create' : 'edit'}
          supplier={editing === 'new' ? null : editing}
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
