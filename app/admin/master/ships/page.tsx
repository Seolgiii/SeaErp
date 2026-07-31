'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { listShips, type Ship } from '@/app/actions/admin/master-ships';
import ShipEditModal from '@/app/components/ShipEditModal';
import { Button } from '@/app/components/ui/Button';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { LoadingState } from '@/app/components/ui/LoadingState';
import { SortIcon, ariaSort, sortState } from '@/app/components/ui/SortIcon';
import { SpacerCell, TableColGroup, tableMinWidth, type TableCol } from '@/app/admin/_table-cols';

type SortField = 'name' | 'company' | 'captain' | 'homePort';
type SortDir = 'asc' | 'desc';

/**
 * 컬럼 폭 — §7-2. 실측(2026-07-28, 선박 정보 마스터 24건) 최댓값 + 여유 8 + 패딩 32.
 * 선장·선적항·어업허가번호·연락처는 **24건 전부 비어 있어** 헤더 폭이 하한이다.
 * 값이 들어오기 시작하면 재측정 대상.
 *
 * ⚠ 2026-07-30: 헤더가 `--t-label`(12px) → `--t-table-head`(14px)로 바뀌며 헤더가
 *   하한인 5개 컬럼을 산술 환산(×1.2, 4px 단위 올림)했다 — **브라우저 재실측이 아니다.**
 *   Pretendard가 Spoqa보다 자면이 커서 안전 마진을 더 뒀다. 육안 확인 필요.
 */
const COLS: TableCol[] = [
  { key: 'name', label: '선박명', px: 108 }, // max 69 `151헤승(2)`
  { key: 'company', label: '선박회사', px: 132 }, // 108→132. 헤더(66+18)가 하한
  { key: 'captain', label: '선장', px: 104 }, // 84→104. 헤더가 하한 (값 없음)
  { key: 'homePort', label: '선적항', px: 116 }, // 96→116. 헤더가 하한 (값 없음)
  { key: 'licenseNo', label: '어업허가번호', px: 136 }, // 112→136. 헤더가 하한 (값 없음)
  { key: 'phone', label: '연락처', px: 92 }, // 76→92. 헤더가 하한 (값 없음)
];

/**
 * 카드·컨트롤·헤더 공통 최대 폭 (§7-9).
 * 표 합계 584 > 컨트롤 행 184(검색창 하나) → 표가 폭을 정한다. 584 → 608.
 * 2026-07-30: 헤더 폭 재계산으로 표 합계 688 → 712.
 */
const CONTENT_MAX = 'max-w-[712px]';

export default function ShipsMasterPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [items, setItems] = useState<Ship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editing, setEditing] = useState<Ship | 'new' | null>(null);

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
    const result = await listShips(workerId);
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
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.company.toLowerCase().includes(q) ||
          s.captain.toLowerCase().includes(q),
      );
    }
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

  return (
    <div className="mx-auto max-w-[1200px] p-8 min-w-0">
      {/* 제목·버튼·컨트롤·카드가 모두 같은 최대 폭에 맞는다 (§7-9) */}
      <div className={`mb-6 flex items-center justify-between gap-4 ${CONTENT_MAX}`}>
        <div>
          <h1 className="text-page text-text">선박 마스터</h1>
          <p className="mt-1 text-label text-text-muted">
            {visible.length}건{search && ` / 전체 ${items.length}건`}
          </p>
        </div>
        {/* 화면의 유일한 Primary (§2-3) */}
        <Button variant="primary" icon={PlusIcon} onClick={() => setEditing('new')}>
          선박 추가
        </Button>
      </div>

      {/* 검색 — 폭은 placeholder가 잘리지 않는 최소 (§6-3) */}
      <div className={`mb-4 ${CONTENT_MAX}`}>
        <input
          type="text"
          placeholder="선박명·회사·선장 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-control w-48 rounded-control border border-border bg-surface px-3 text-body text-text outline-none placeholder:text-text-faint focus:border-transparent focus:ring-2 focus:ring-accent-fill"
        />
      </div>

      <div className={`overflow-hidden rounded-card border border-border bg-surface ${CONTENT_MAX}`}>
        {isLoading ? (
          <LoadingState cols={COLS} rows={8} spacer />
        ) : visible.length === 0 ? (
          search ? (
            <EmptyState
              title="조건에 맞는 선박이 없습니다"
              hint="검색어를 지우거나 회사·선장 이름으로 찾아보세요."
            />
          ) : (
            <EmptyState
              title="등록된 선박이 없습니다"
              hint="첫 선박을 등록하면 입고에서 고를 수 있습니다."
              action={
                <Button variant="secondary" icon={PlusIcon} onClick={() => setEditing('new')}>
                  선박 추가
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
                  <Th label="선박명" field="name" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="선박회사" field="company" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="선장" field="captain" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="선적항" field="homePort" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <th className="whitespace-nowrap px-4 py-2 text-table-head text-text-muted">어업허가번호</th>
                  <th className="whitespace-nowrap px-4 py-2 text-table-head text-text-muted">연락처</th>
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
                    <td className="whitespace-nowrap px-4 py-2 text-body text-text">{s.name || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-body text-text-muted">{s.company || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-body text-text-muted">{s.captain || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-body text-text-muted">{s.homePort || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-body text-text-muted">{s.licenseNo || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-body text-text-muted">{s.phone || '—'}</td>
                    <SpacerCell />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <ShipEditModal
          mode={editing === 'new' ? 'create' : 'edit'}
          ship={editing === 'new' ? null : editing}
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
  sortField: SortField;
  sortDir: SortDir;
  onToggle: (f: SortField) => void;
}) {
  const state = sortState(sortField === field, sortDir);
  return (
    // aria-sort는 columnheader(th)에. 패딩은 버튼이 가져가 셀 전체가 클릭 영역이 된다 (§7-8).
    <th aria-sort={ariaSort(state)} className="whitespace-nowrap p-0 text-table-head text-text-muted">
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
