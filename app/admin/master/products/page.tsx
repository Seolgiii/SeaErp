'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { listProducts, type Product } from '@/app/actions/admin/master-products';
import ProductEditModal from '@/app/components/ProductEditModal';
import { Button } from '@/app/components/ui/Button';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { LoadingState } from '@/app/components/ui/LoadingState';
import { SortIcon, ariaSort, sortState } from '@/app/components/ui/SortIcon';
import { SpacerCell, TableColGroup, tableMinWidth, type TableCol } from '@/app/admin/_table-cols';

type SortField = 'name' | 'code' | 'category' | 'spec';
type SortDir = 'asc' | 'desc';

/**
 * 컬럼 폭 — §7-2. 실측(2026-07-28, 품목마스터 137건) 최댓값 + 여유 8 + 패딩 32.
 * 정렬 헤더는 ↕ 아이콘 18px이 붙으므로 그 하한도 반영.
 *
 * ⚠ 권장규격·상세규격은 **항상 비어 있다.** master-products.ts가 읽는 `권장표기`·
 *   `상세규격_표기` 필드가 Airtable 품목마스터에 존재하지 않는다(API가 이름을 거부).
 *   두 컬럼 폭은 헤더 기준으로만 잡았다. 데이터 쪽 정리는 별도 작업.
 */
const COLS: TableCol[] = [
  { key: 'name', label: '품목명', px: 248 }, // max 207 `사료 (FORZEN BRADED HORSE)`
  { key: 'code', label: '품목코드', px: 108 }, // 헤더(66+18)가 하한
  { key: 'category', label: '품목구분', px: 108 }, // 헤더가 하한
  { key: 'spec', label: '권장규격', px: 108 }, // 헤더가 하한 (값 없음)
  { key: 'detailSpec', label: '상세규격', px: 88 }, // 헤더가 하한 (값 없음)
  { key: 'origin', label: '원산지', px: 84 }, // max 42 `국내산`
];

/**
 * 카드·컨트롤·헤더 공통 최대 폭 (§7-9).
 * 표 합계 744 > 컨트롤 행 176(검색창 하나) → 표가 폭을 정한다. 744 → 768.
 */
const CONTENT_MAX = 'max-w-[768px]';

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
      {/* 헤더 — 제목·버튼·컨트롤·카드가 모두 같은 최대 폭에 맞는다 (§7-9) */}
      <div className={`mb-6 flex items-center justify-between gap-4 ${CONTENT_MAX}`}>
        <div>
          <h1 className="text-page text-text">품목 마스터</h1>
          <p className="mt-1 text-label text-text-muted">
            {visible.length}건{search && ` / 전체 ${products.length}건`}
          </p>
        </div>
        {/* 화면의 유일한 Primary (§2-3) */}
        <Button variant="primary" icon={PlusIcon} onClick={() => setEditing('new')}>
          품목 추가
        </Button>
      </div>

      {/* 검색 — 폭은 placeholder가 잘리지 않는 최소 (§6-3) */}
      <div className={`mb-4 ${CONTENT_MAX}`}>
        <input
          type="text"
          placeholder="품목명·품목코드 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-control w-44 rounded-control border border-border bg-surface px-3 text-body text-text outline-none placeholder:text-text-faint focus:border-transparent focus:ring-2 focus:ring-accent-fill"
        />
      </div>

      {/* 표 */}
      <div className={`overflow-hidden rounded-card border border-border bg-surface ${CONTENT_MAX}`}>
        {isLoading ? (
          <LoadingState cols={COLS} rows={8} spacer />
        ) : visible.length === 0 ? (
          search ? (
            <EmptyState
              title="조건에 맞는 품목이 없습니다"
              hint="검색어를 지우거나 다른 이름·코드로 찾아보세요."
            />
          ) : (
            <EmptyState
              title="등록된 품목이 없습니다"
              hint="첫 품목을 등록하면 입고·출고에서 고를 수 있습니다."
              action={
                <Button variant="secondary" icon={PlusIcon} onClick={() => setEditing('new')}>
                  품목 추가
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
                  <Th label="품목명" field="name" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="품목코드" field="code" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="품목구분" field="category" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="권장규격" field="spec" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} />
                  <th className="whitespace-nowrap px-4 py-2 text-label text-text-muted">상세규격</th>
                  <th className="whitespace-nowrap px-4 py-2 text-label text-text-muted">원산지</th>
                  <SpacerCell as="th" />
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setEditing(p)}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-surface-alt"
                  >
                    {/* py-2 + body(14×1.5=21) + border 1 = 38px 행 높이 (§7-7) */}
                    <td className="whitespace-nowrap px-4 py-2 text-body text-text">{p.name || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-body text-text-muted">{p.code || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-body text-text-muted">{p.category || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-body text-text-muted">{p.spec || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-body text-text-muted">{p.detailSpec || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-body text-text-muted">{p.origin || '—'}</td>
                    <SpacerCell />
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
