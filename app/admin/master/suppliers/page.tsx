'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { listSuppliers, type Supplier } from '@/app/actions/admin/master-suppliers';
import SupplierEditModal from '@/app/components/SupplierEditModal';
import { Button } from '@/app/components/ui/Button';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { LoadingState } from '@/app/components/ui/LoadingState';
import { SortIcon, ariaSort } from '@/app/components/ui/SortIcon';
import { SpacerCell, TableColGroup, tableMinWidth, type TableCol } from '@/app/admin/_table-cols';

type SortDir = 'asc' | 'desc';

/**
 * 컬럼 폭 — §7-2. 실측(2026-07-28, 매입처 마스터 149건) 최댓값 + 여유 8 + 패딩 32.
 * 최장 `와이에이치탑트레이드 / ㈜와이에이치탑트레이드`(306px) — 정식명 병기 표기가 길다.
 */
const COLS: TableCol[] = [{ key: 'name', label: '매입처명', px: 348 }];

/**
 * 카드·컨트롤·헤더 공통 최대 폭 (§7-9).
 * 표 합계 348 > 컨트롤 행 128(검색창 하나) → 표가 폭을 정한다. 348 → 352.
 */
const CONTENT_MAX = 'max-w-[352px]';

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

  // 최초 진입 — 레이아웃이 아직 없어 골격을 그릴 수 없다(§6-4의 스피너 허용 예외).
  if (!workerId) {
    return (
      <div className="p-8">
        <LoadingState />
      </div>
    );
  }

  // 컬럼이 1개뿐이라 '정렬 안 됨' 상태가 없다 — 항상 asc 또는 desc다.
  const sortIconState = sortDir;

  return (
    <div className="mx-auto max-w-[1200px] p-8 min-w-0">
      {/* 제목·버튼·컨트롤·카드가 모두 같은 최대 폭에 맞는다 (§7-9) */}
      <div className={`mb-6 flex items-center justify-between gap-4 ${CONTENT_MAX}`}>
        <div>
          <h1 className="text-page text-text">매입처 마스터</h1>
          <p className="mt-1 text-label text-text-muted">
            {visible.length}건{search && ` / 전체 ${items.length}건`}
          </p>
        </div>
        {/* 화면의 유일한 Primary (§2-3) */}
        <Button variant="primary" icon={PlusIcon} onClick={() => setEditing('new')}>
          매입처 추가
        </Button>
      </div>

      {/* 검색 — 폭은 placeholder가 잘리지 않는 최소 (§6-3) */}
      <div className={`mb-4 ${CONTENT_MAX}`}>
        <input
          type="text"
          placeholder="매입처명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-control w-32 rounded-control border border-border bg-surface px-3 text-body text-text outline-none placeholder:text-text-faint focus:border-transparent focus:ring-2 focus:ring-accent-fill"
        />
      </div>

      <div className={`overflow-hidden rounded-card border border-border bg-surface ${CONTENT_MAX}`}>
        {isLoading ? (
          <LoadingState cols={COLS} rows={8} spacer />
        ) : visible.length === 0 ? (
          search ? (
            <EmptyState
              title="조건에 맞는 매입처가 없습니다"
              hint="검색어를 지우거나 이름 일부만 넣어보세요."
            />
          ) : (
            <EmptyState
              title="등록된 매입처가 없습니다"
              hint="첫 매입처를 등록하면 입고에서 고를 수 있습니다."
              action={
                <Button variant="secondary" icon={PlusIcon} onClick={() => setEditing('new')}>
                  매입처 추가
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
                  {/* aria-sort는 columnheader(th)에. 패딩은 버튼이 가져간다 (§7-8). */}
                  <th
                    aria-sort={ariaSort(sortIconState)}
                    className="whitespace-nowrap p-0 text-label text-text-muted"
                  >
                    <button
                      type="button"
                      onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                      className="group flex w-full cursor-pointer select-none items-center gap-1 px-4 py-2 text-left transition-colors hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-fill motion-reduce:transition-none"
                    >
                      매입처명
                      <SortIcon state={sortIconState} />
                    </button>
                  </th>
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
                    <SpacerCell />
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
