'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LockClosedIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import {
  getMyVerifiedId,
  listWorkers,
  type Worker,
  type WorkerRole,
} from '@/app/actions/admin/master-workers';
import WorkerEditModal from '@/app/components/WorkerEditModal';

type SortField = 'name' | 'role' | 'active';
type SortDir = 'asc' | 'desc';
type ActiveFilter = 'ALL' | 'active' | 'inactive';
type RoleFilter = 'ALL' | WorkerRole;

const ROLE_LABEL: Record<WorkerRole, string> = {
  WORKER: '작업자',
  ADMIN: '관리자',
  MASTER: '마스터',
};

const ROLE_BADGE: Record<WorkerRole, string> = {
  WORKER: 'bg-gray-100 text-gray-600',
  ADMIN: 'bg-[#3182F6]/10 text-[#3182F6]',
  MASTER: 'bg-purple-100 text-purple-700',
};

export default function WorkersMasterPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [items, setItems] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editing, setEditing] = useState<Worker | 'new' | null>(null);

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
    const [listRes, meRes] = await Promise.all([
      listWorkers(workerId),
      getMyVerifiedId(workerId),
    ]);
    if (listRes.success) setItems(listRes.data);
    else toast(`조회 실패: ${listRes.error}`, 'error');
    if (meRes.success) setMyId(meRes.data.id);
    setIsLoading(false);
  }, [workerId]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  const visible = (() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) list = list.filter((w) => w.name.toLowerCase().includes(q));
    if (activeFilter === 'active') list = list.filter((w) => w.active);
    else if (activeFilter === 'inactive') list = list.filter((w) => !w.active);
    if (roleFilter !== 'ALL') list = list.filter((w) => w.role === roleFilter);

    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (sortField === 'name') return a.name.localeCompare(b.name, 'ko') * dir;
      if (sortField === 'role') return a.role.localeCompare(b.role) * dir;
      return (Number(a.active) - Number(b.active)) * dir;
    });
    return list;
  })();

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
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

  const counts = {
    ALL: items.length,
    active: items.filter((w) => w.active).length,
    inactive: items.filter((w) => !w.active).length,
    WORKER: items.filter((w) => w.role === 'WORKER').length,
    ADMIN: items.filter((w) => w.role === 'ADMIN').length,
    MASTER: items.filter((w) => w.role === 'MASTER').length,
    locked: items.filter((w) => w.isLocked).length,
  };

  return (
    <div className="p-8 min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-black text-gray-900 tracking-tight">작업자 마스터</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {visible.length}건
            {(search || activeFilter !== 'ALL' || roleFilter !== 'ALL') &&
              ` / 전체 ${items.length}건`}
            {counts.locked > 0 && (
              <span className="ml-2 text-red-500 font-bold">
                · 잠금 {counts.locked}건
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="px-5 py-2.5 bg-[#3182F6] text-white font-bold text-[14px] rounded-xl shadow-sm hover:bg-[#1c6ce0] active:scale-95 transition-all flex items-center gap-1.5"
        >
          <PlusIcon className="w-4 h-4" />
          작업자 추가
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="작업자명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
        />
        <div className="flex items-center gap-1.5">
          <Chip label="활성" active={activeFilter === 'active'} count={counts.active} onClick={() => setActiveFilter('active')} />
          <Chip label="비활성" active={activeFilter === 'inactive'} count={counts.inactive} onClick={() => setActiveFilter('inactive')} />
          <Chip label="전체" active={activeFilter === 'ALL'} count={counts.ALL} onClick={() => setActiveFilter('ALL')} />
        </div>
        <div className="flex items-center gap-1.5">
          <Chip label="모든 권한" active={roleFilter === 'ALL'} count={counts.ALL} onClick={() => setRoleFilter('ALL')} />
          {(['WORKER', 'ADMIN', 'MASTER'] as WorkerRole[]).map((r) => (
            <Chip
              key={r}
              label={ROLE_LABEL[r]}
              active={roleFilter === r}
              count={counts[r]}
              onClick={() => setRoleFilter(r)}
            />
          ))}
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
                  <Th label="작업자명" field="name" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="권한" field="role" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="활성" field="active" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <th className="px-4 py-3">PIN 상태</th>
                  <th className="px-4 py-3">잠금</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((w) => {
                  const isSelf = myId === w.id;
                  return (
                    <tr
                      key={w.id}
                      onClick={() => setEditing(w)}
                      className="border-t border-gray-100 hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {w.name || '-'}
                        {isSelf && (
                          <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded">
                            본인
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${ROLE_BADGE[w.role]}`}>
                          {ROLE_LABEL[w.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${w.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                        >
                          {w.active ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {w.hasHashedPin
                          ? '해시 저장됨'
                          : w.hasPlainPin
                            ? '평문 (다음 로그인 시 해시화)'
                            : <span className="text-red-500 font-bold">미설정</span>}
                      </td>
                      <td className="px-4 py-3">
                        {w.isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-[11px] font-bold">
                            <LockClosedIcon className="w-3 h-3" />
                            잠금
                            {w.pinFailCount > 0 && (
                              <span className="ml-0.5">{w.pinFailCount}회</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-[11px]">정상</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <WorkerEditModal
          mode={editing === 'new' ? 'create' : 'edit'}
          worker={editing === 'new' ? null : editing}
          workerId={workerId}
          isSelf={editing !== 'new' && myId === editing.id}
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

function Chip({
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
