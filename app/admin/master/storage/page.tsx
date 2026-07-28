'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { listStorages, type Storage } from '@/app/actions/admin/master-storage';
import { STORAGE_KINDS, type StorageKind } from '@/lib/storage-kinds';
import StorageEditModal from '@/app/components/StorageEditModal';
import { Button } from '@/app/components/ui/Button';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { LoadingState } from '@/app/components/ui/LoadingState';
import { SpacerCell, TableColGroup, tableMinWidth, type TableCol } from '@/app/admin/_table-cols';
import { SortIcon, ariaSort, sortState } from '@/app/components/ui/SortIcon';

type SortField = 'name' | 'kind';
type SortDir = 'asc' | 'desc';

/**
 * 컬럼 폭 — §7-1·§7-2. 실측(2026-07-28, 보관처 마스터 84건) 최댓값 + 여유 8 + 패딩 32.
 * 표와 로딩 스켈레톤이 같은 배열을 쓰므로 골격이 어긋나지 않는다.
 *
 * 컬럼이 2개뿐이라 합계(412px)가 화면 폭(≈1136px)보다 훨씬 작다. 비례 확대에 맡기면
 * 구분 컬럼이 92 → 250px 넘게 벌어져 배지가 빈 공간에 떠 보인다.
 * → `spacer`로 설계 px를 고정하고 남는 폭은 맨 끝 빈 컬럼이 먹는다.
 */
const COLS: TableCol[] = [
  // max 278 `제주어류양식수협 / 제주도해수어류양식수협`
  { key: 'name', label: '보관처명', px: 320 },
  // 배지 = caption 글자 44 + 좌우 16
  { key: 'kind', label: '구분', px: 92 },
];

/**
 * 컨트롤 행·표 카드 공통 최대 폭.
 *
 * 컬럼 합계는 412px뿐이라 컨테이너(≈1136px)를 다 쓰면 오른쪽 2/3가 빈다.
 * 그렇다고 412에 맞추면 위쪽 컨트롤 행이 두 줄로 접힌다 — **하한을 정하는 건 표가 아니라 컨트롤이다.**
 *   검색창 320(w-80) + gap 12 + 필터 칩 5개 411(gap 포함) = **743px**
 *   (칩 카운트가 3자리로 늘면 ≈765px)
 * → 800px. 하한 대비 57px 여유, 3자리 카운트에도 35px 남는다.
 *
 * 스페이서는 그대로 둔다. 800 − 412 = 388px을 맨 끝 빈 컬럼이 먹고,
 * 창을 좁히면 스페이서가 먼저 0까지 줄어든 뒤 minWidth(412)에서 가로 스크롤로 넘어간다.
 *
 * mx-auto를 주지 않는다 — 표가 화면 가운데 뜨면 안 되고 좌측 정렬을 유지해야 한다.
 */
const CONTENT_MAX = 'max-w-[800px]';

/**
 * 구분 배지 색 — §2-3 액센트 토큰.
 * ⚠ 이 화면은 액센트를 3종(Primary·Warning·Info) 쓴다. §2-3 "한 화면 최대 2종"과 충돌한다.
 *   줄이려면 '자사창고'(입출고증 발행 분기)만 강조하고 나머지를 중립으로 두는 안이 있는데,
 *   그건 색 배정 변경이라 이번 시범 범위 밖으로 두었다.
 */
const KIND_BADGE: Record<StorageKind | '', string> = {
  자사창고: 'bg-accent-bg text-accent-ink',
  외부창고: 'bg-surface-alt text-text-muted',
  가공공장: 'bg-info-bg text-info-ink',
  기타: 'bg-warn-bg text-warn-ink',
  '': 'bg-surface-alt text-text-muted',
};

export default function StorageMasterPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [items, setItems] = useState<Storage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<StorageKind | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editing, setEditing] = useState<Storage | 'new' | null>(null);

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
    const result = await listStorages(workerId);
    if (result.success) setItems(result.data);
    else toast('보관처 목록을 불러오지 못했습니다. 새로고침하세요.', 'error');
    setIsLoading(false);
  }, [workerId]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  const visible = (() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) list = list.filter((s) => s.name.toLowerCase().includes(q));
    if (kindFilter !== 'ALL') list = list.filter((s) => s.kind === kindFilter);
    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort(
      (a, b) =>
        String(a[sortField] ?? '').localeCompare(String(b[sortField] ?? ''), 'ko') *
        dir,
    );
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

  const isFiltered = Boolean(search) || kindFilter !== 'ALL';

  // 구분별 카운트 (필터 칩에 표시)
  const counts: Record<string, number> = { ALL: items.length };
  for (const k of STORAGE_KINDS) counts[k] = 0;
  counts[''] = 0;
  for (const s of items) counts[s.kind || ''] = (counts[s.kind || ''] ?? 0) + 1;

  return (
    <div className="mx-auto max-w-[1200px] p-8 min-w-0">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-page text-text">보관처 마스터</h1>
          <p className="mt-1 text-label text-text-muted">
            {visible.length}건{isFiltered && ` / 전체 ${items.length}건`}
          </p>
        </div>
        {/* 화면의 유일한 Primary (§2-3) */}
        <Button variant="primary" icon={PlusIcon} onClick={() => setEditing('new')}>
          보관처 추가
        </Button>
      </div>

      <div className={`mb-4 flex flex-wrap items-center gap-3 ${CONTENT_MAX}`}>
        <input
          type="text"
          placeholder="보관처명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-control w-80 rounded-control border border-border bg-surface px-3 text-body text-text outline-none placeholder:text-text-faint focus:border-transparent focus:ring-2 focus:ring-accent-fill"
        />
        <div className="flex items-center gap-2">
          <KindChip label="전체" active={kindFilter === 'ALL'} count={counts.ALL} onClick={() => setKindFilter('ALL')} />
          {STORAGE_KINDS.map((k) => (
            <KindChip
              key={k}
              label={k}
              active={kindFilter === k}
              count={counts[k] ?? 0}
              onClick={() => setKindFilter(k)}
            />
          ))}
        </div>
      </div>

      <div className={`overflow-hidden rounded-card border border-border bg-surface ${CONTENT_MAX}`}>
        {isLoading ? (
          <LoadingState cols={COLS} rows={8} spacer />
        ) : visible.length === 0 ? (
          isFiltered ? (
            <EmptyState
              title="조건에 맞는 보관처가 없습니다"
              hint="검색어를 지우거나 구분 필터를 전체로 바꿔보세요."
            />
          ) : (
            <EmptyState
              title="등록된 보관처가 없습니다"
              hint="첫 보관처를 등록하면 입고·이동에서 고를 수 있습니다."
              action={
                // 빈 상태 버튼은 Secondary — Primary는 우상단 하나뿐이다 (§2-3)
                <Button variant="secondary" icon={PlusIcon} onClick={() => setEditing('new')}>
                  보관처 추가
                </Button>
              }
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed" style={{ minWidth: tableMinWidth(COLS) }}>
              <TableColGroup cols={COLS} spacer />
              <thead className="sticky top-0 bg-surface-alt">
                <tr className="text-left">
                  <Th label="보관처명" field="name" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="구분" field="kind" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <SpacerCell as="th" />
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setEditing(s)}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-surface-alt"
                  >
                    {/* py-2 + body(14×1.5=21) + border 1 = 38px 행 높이 (§7-7) */}
                    <td className="whitespace-nowrap px-4 py-2 text-left text-body text-text">
                      {s.name || '—'}
                    </td>
                    {/* 구분 = 분류 라벨이므로 좌측 정렬 (§7-6) — 헤더와 시작선을 맞춘다 */}
                    <td className="whitespace-nowrap px-4 py-2 text-left">
                      <span className={`inline-block rounded-pill px-2 text-caption ${KIND_BADGE[s.kind]}`}>
                        {s.kind || '미분류'}
                      </span>
                    </td>
                    <SpacerCell />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <StorageEditModal
          mode={editing === 'new' ? 'create' : 'edit'}
          storage={editing === 'new' ? null : editing}
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

function KindChip({
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
    // aria-sort는 columnheader(th)에 붙는다. 패딩은 버튼이 가져가 셀 전체가 클릭 영역이 된다.
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
