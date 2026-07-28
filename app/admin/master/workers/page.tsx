'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockClosedIcon, PlusIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import {
  getMyVerifiedId,
  listWorkers,
  type Worker,
  type WorkerRole,
} from '@/app/actions/admin/master-workers';
import WorkerEditModal from '@/app/components/WorkerEditModal';
import { Button } from '@/app/components/ui/Button';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { LoadingState } from '@/app/components/ui/LoadingState';
import { SortIcon, ariaSort, sortState } from '@/app/components/ui/SortIcon';
import { SpacerCell, TableColGroup, tableMinWidth, type TableCol } from '@/app/admin/_table-cols';

type SortField = 'name' | 'role' | 'active';
type SortDir = 'asc' | 'desc';
type ActiveFilter = 'ALL' | 'active' | 'inactive';
type RoleFilter = 'ALL' | WorkerRole;

const ROLE_LABEL: Record<WorkerRole, string> = {
  WORKER: '작업자',
  ADMIN: '관리자',
  MASTER: '마스터',
};

/**
 * 권한 배지 — §2-3 액센트 토큰. 분류 배지이므로 "최대 2종" 예외에 해당한다.
 * 기본 권한(작업자)은 중립, 권한이 올라갈수록 강조.
 */
const ROLE_BADGE: Record<WorkerRole, string> = {
  WORKER: 'bg-surface-alt text-text-muted',
  ADMIN: 'bg-accent-bg text-accent-ink',
  MASTER: 'bg-info-bg text-info-ink',
};

/**
 * 컬럼 폭 — §7-2. 실측(2026-07-28, 작업자 3건) 최댓값 + 여유 8 + 패딩 32.
 * PIN 상태는 문구가 길다 — `평문 (다음 로그인 시 해시화)` 179px이 하한.
 */
const COLS: TableCol[] = [
  { key: 'name', label: '작업자명', px: 116 }, // max 74 `이경환 본인`
  { key: 'role', label: '권한', px: 92 }, // 배지 49
  { key: 'active', label: '활성', px: 92 }, // 배지 49
  { key: 'pin', label: 'PIN 상태', px: 220 }, // max 179
  { key: 'locked', label: '잠금', px: 100 }, // 배지 `잠금 5회` 58
];

/**
 * 카드·컨트롤·헤더 공통 최대 폭 (§7-9).
 * 표 합계 620 < **컨트롤 행 678**(검색 128 + 칩 7개 538) → 컨트롤이 폭을 정한다. 678 → 704.
 * 이 화면만 표가 아니라 컨트롤이 하한이다 — 필터 칩이 두 그룹(활성·권한)이라 그렇다.
 */
const CONTENT_MAX = 'max-w-[704px]';

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

  // 최초 진입 — 레이아웃이 아직 없어 골격을 그릴 수 없다(§6-4의 스피너 허용 예외).
  if (!workerId) {
    return (
      <div className="p-8">
        <LoadingState />
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
    <div className="mx-auto max-w-[1200px] p-8 min-w-0">
      {/* 제목·버튼·컨트롤·카드가 모두 같은 최대 폭에 맞는다 (§7-9) */}
      <div className={`mb-6 flex items-center justify-between gap-4 ${CONTENT_MAX}`}>
        <div>
          <h1 className="text-page text-text">작업자 마스터</h1>
          <p className="mt-1 text-label text-text-muted">
            {visible.length}건
            {(search || activeFilter !== 'ALL' || roleFilter !== 'ALL') &&
              ` / 전체 ${items.length}건`}
            {counts.locked > 0 && (
              <span className="ml-2 text-danger-ink">· 잠금 {counts.locked}건</span>
            )}
          </p>
        </div>
        {/* 화면의 유일한 Primary (§2-3) */}
        <Button variant="primary" icon={PlusIcon} onClick={() => setEditing('new')}>
          작업자 추가
        </Button>
      </div>

      <div className={`mb-4 flex flex-wrap items-center gap-3 ${CONTENT_MAX}`}>
        {/* 검색 — 폭은 placeholder가 잘리지 않는 최소 (§6-3) */}
        <input
          type="text"
          placeholder="작업자명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-control w-32 rounded-control border border-border bg-surface px-3 text-body text-text outline-none placeholder:text-text-faint focus:border-transparent focus:ring-2 focus:ring-accent-fill"
        />
        <div className="flex items-center gap-2">
          <Chip label="활성" active={activeFilter === 'active'} count={counts.active} onClick={() => setActiveFilter('active')} />
          <Chip label="비활성" active={activeFilter === 'inactive'} count={counts.inactive} onClick={() => setActiveFilter('inactive')} />
          <Chip label="전체" active={activeFilter === 'ALL'} count={counts.ALL} onClick={() => setActiveFilter('ALL')} />
        </div>
        <div className="flex items-center gap-2">
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

      <div className={`overflow-hidden rounded-card border border-border bg-surface ${CONTENT_MAX}`}>
        {isLoading ? (
          <LoadingState cols={COLS} rows={8} spacer />
        ) : visible.length === 0 ? (
          <EmptyState
            title="조건에 맞는 작업자가 없습니다"
            hint="검색어를 지우거나 활성·권한 필터를 전체로 바꿔보세요."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed" style={{ minWidth: tableMinWidth(COLS) }}>
              <TableColGroup cols={COLS} spacer />
              <thead className="sticky top-0 bg-surface-alt">
                <tr className="text-left">
                  <Th label="작업자명" field="name" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="권한" field="role" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="활성" field="active" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <th className="whitespace-nowrap px-4 py-2 text-label text-text-muted">PIN 상태</th>
                  <th className="whitespace-nowrap px-4 py-2 text-label text-text-muted">잠금</th>
                  <SpacerCell as="th" />
                </tr>
              </thead>
              <tbody>
                {visible.map((w) => {
                  const isSelf = myId === w.id;
                  return (
                    <tr
                      key={w.id}
                      onClick={() => setEditing(w)}
                      className="cursor-pointer border-t border-border transition-colors hover:bg-surface-alt"
                    >
                      {/* py-2 + body(14×1.5=21) + border 1 = 38px 행 높이 (§7-7) */}
                      <td className="whitespace-nowrap px-4 py-2 text-body text-text">
                        {w.name || '—'}
                        {isSelf && (
                          <span className="ml-2 rounded-pill bg-warn-bg px-2 text-caption text-warn-ink">
                            본인
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <span className={`inline-block rounded-pill px-2 text-caption ${ROLE_BADGE[w.role]}`}>
                          {ROLE_LABEL[w.role]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <span
                          className={`inline-block rounded-pill px-2 text-caption ${w.active ? 'bg-success-bg text-success-ink' : 'bg-surface-alt text-text-muted'}`}
                        >
                          {w.active ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-body text-text-muted">
                        {w.hasHashedPin
                          ? '해시 저장됨'
                          : w.hasPlainPin
                            ? '평문 (다음 로그인 시 해시화)'
                            : <span className="text-danger-ink">미설정</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        {w.isLocked ? (
                          <span className="inline-flex items-center gap-1 rounded-pill bg-danger-bg px-2 text-caption text-danger-ink">
                            <LockClosedIcon className="h-3 w-3" aria-hidden="true" />
                            잠금
                            {w.pinFailCount > 0 && <span>{w.pinFailCount}회</span>}
                          </span>
                        ) : (
                          <span className="text-caption text-text-muted">정상</span>
                        )}
                      </td>
                      <SpacerCell />
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
  // 활성 칩은 채움이 아니라 소프트 태그 — 채움 Primary는 화면당 1개여야 한다 (§2-3).
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-control items-center gap-1 rounded-control px-3 text-label transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fill ${
        active
          ? 'bg-accent-bg text-accent-ink'
          : 'border border-border bg-surface text-text-muted hover:bg-surface-alt'
      }`}
    >
      {label}
      <span className={active ? 'text-accent-ink' : 'text-text-faint'}>{count}</span>
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
  const state = sortState(sortField === field, sortDir);
  return (
    // aria-sort는 columnheader(th)에. 패딩은 버튼이 가져가 셀 전체가 클릭 영역이 된다 (§7-8).
    <th aria-sort={ariaSort(state)} className="whitespace-nowrap p-0 text-label text-text-muted">
      <button
        type="button"
        onClick={() => onToggle(field)}
        className="group flex w-full cursor-pointer select-none items-center gap-1 px-4 py-2 text-left transition-colors hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-fill motion-reduce:transition-none"
      >
        {label}
        <SortIcon state={state} />
      </button>
    </th>
  );
}
