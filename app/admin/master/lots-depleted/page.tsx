'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { NumCell, NUM_CELL } from '@/app/admin/_num-cell';
import {
  makeCellClasses,
  SpacerCell,
  tableMinWidth,
  TableColGroup,
  type TableCol,
} from '@/app/admin/_table-cols';
import { LotLink } from '@/app/admin/_lot-link';
import { formatSpec, formatMisu } from '@/lib/spec-display';
import { isNormalDepletedStatus } from '@/lib/status';
import { Button } from '@/app/components/ui/Button';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { LoadingState } from '@/app/components/ui/LoadingState';
import { SortIcon, ariaSort, sortState } from '@/app/components/ui/SortIcon';
import { listLots, type Lot } from '@/app/actions/admin/master-lots';

const seoulToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

type SortField = 'lotNumber' | 'productName' | 'firstInboundDate' | 'storageName' | 'purchasePrice';
type SortDir = 'asc' | 'desc';

/**
 * 소진 LOT — **재고수량 0인 LOT**의 이력 조회 (read-only).
 *
 * 2026-07-29 재고 조회에서 분리했다. 소진 LOT은 출고가 끝나도 영구히 남으므로 활성 재고와
 * 같은 화면에 두면 ① 재고장 인쇄에 섞일 수 있고 ② 시간이 갈수록 조회가 무거워진다.
 *
 * **의도적으로 뺀 것**
 * · **재고장 인쇄 없음** — 이 분리의 핵심 이득이다. 소진 LOT은 재고장에 들어가면 안 된다.
 *   (CSV는 남긴다. 이력 감사·정산 대조용이고 재고장으로 오인될 물건이 아니다.)
 * · **재고수량·총중량·평가액 컬럼 없음** — 전부 0이라 자리만 차지한다.
 * · **상태 컬럼 없음** — 거의 전부 '소진' 한 값이라 열이 통째로 빈칸처럼 읽힌다.
 *   개별 상태·사유는 행 클릭 → 생애주기, 또는 CSV(상태·상태사유 포함)에서 본다.
 * · **보관일수·재고원가 컬럼 없음** — 둘 다 '오늘 기준'으로 계산되는 값이라(`asOfDate`)
 *   이미 소진된 LOT에서는 숫자가 계속 커진다. 소진 시점 값이 아니므로 보여주면 오독을 부른다.
 *   ⚠ 소진 시점 원가가 필요하면 출고관리의 '출고시점 판매원가' 스냅샷을 봐야 한다(별도 작업).
 *
 * **반려·취소 LOT도 여기 들어온다** — soft delete로 재고수량이 0이 되기 때문이다.
 * 어느 화면에도 안 나오는 LOT을 만들지 않으려는 것이다.
 * 다만 그것들은 **오류가 아니라 분류**다(재고가 0이 된 사유가 다를 뿐). 재고 조회에서는
 * 반려 LOT에 재고가 남아 있으면 진짜 오류라 경고색을 쓰지만, 여기서는 중립 안내 + 필터만 둔다.
 */
export default function DepletedLotsPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [items, setItems] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);
  const [sortField, setSortField] = useState<SortField>('firstInboundDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace('/login');
      return;
    }
    setWorkerId(session.workerId);
    // 재고 조회에서 "여기엔 없다"는 안내를 따라오면 검색어를 들고 온다 — 다시 치게 하지 않는다.
    // useSearchParams 대신 직접 읽는 이유: 이 화면은 세션 확인이 필요한 완전 클라이언트 화면이라
    // Suspense 경계를 추가할 이유가 없다.
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setSearch(q);
  }, [router]);

  const loadData = useCallback(async () => {
    if (!workerId) return;
    setIsLoading(true);
    const result = await listLots(workerId, 'depleted');
    if (result.success) setItems(result.data);
    else {
      console.error('[lots-depleted] 조회 실패:', result.error);
      toast('소진 LOT을 불러오지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
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
        (l) => l.lotNumber.toLowerCase().includes(q) || l.productName.toLowerCase().includes(q),
      );
    }
    if (onlyAbnormal) list = list.filter((l) => l.status && !isNormalDepletedStatus(l.status));

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? ''), 'ko') * dir;
    });
  })();

  const isFiltered = search.trim() !== '' || onlyAbnormal;

  /**
   * 반려·취소로 0이 된 LOT — 출고 소진과 성격이 다르다(사람이 되돌린 것).
   * 오류가 아니므로 경고하지 않고, 정산 대조 때 걸러낼 수 있게만 센다.
   * 상태 컬럼은 두지 않는다 — 대부분이 '소진' 한 값이라 열이 통째로 빈칸처럼 읽힌다.
   * 개별 LOT의 상태·사유는 행 클릭 → 생애주기, 또는 CSV에서 본다.
   */
  const reversedPool = items.filter((l) => l.status && !isNormalDepletedStatus(l.status));

  const selectedVisible = visible.filter((l) => selected.has(l.id));
  const allVisibleSelected = visible.length > 0 && visible.every((l) => selected.has(l.id));

  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((l) => next.delete(l.id));
      else visible.forEach((l) => next.add(l.id));
      return next;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir(field === 'firstInboundDate' || field === 'purchasePrice' ? 'desc' : 'asc');
    }
  };

  // CSV — 이력 감사용. 재고장이 아니므로 평가액·합계 없이 사실만 내보낸다.
  const handleCsv = () => {
    if (selectedVisible.length === 0) return;
    const header = ['LOT번호', '최초입고일', '품목명', '규격', '미수', '원산지', '박스당 수매가(원)', '보관처', '상태', '상태사유', '비고'];
    const body = selectedVisible.map((l) => [
      l.lotNumber,
      l.firstInboundDate,
      l.productName,
      formatSpec(l.spec),
      formatMisu(l.misu),
      l.origin,
      l.purchasePrice > 0 ? String(Math.round(l.purchasePrice)) : '',
      l.storageName,
      l.status,
      l.statusReason,
      l.memo,
    ]);
    const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = '﻿' + [header, ...body].map((r) => r.map(cell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `소진LOT_${seoulToday()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!workerId) return <LoadingState label="세션 확인 중…" />;

  const thProps = { sortField, sortDir, onToggle: toggleSort };

  return (
    <div className="min-w-0 p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-page text-text">소진 LOT</h1>
          <p className="mt-1 text-label text-text-muted">
            재고가 0인 LOT {visible.length}건{isFiltered && ` / 전체 ${items.length}건`}
            <span className="ml-2">· 조회 전용</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            type="text"
            placeholder="LOT번호·품목 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-control w-40 rounded-control border border-border bg-surface px-3 text-body text-text outline-none placeholder:text-text-faint focus:border-transparent focus:ring-2 focus:ring-accent-fill"
          />
        </div>
      </header>

      {/* 반려·취소는 **오류가 아니라 분류**다 (§2-3 '분류 배지는 예외').
          재고 조회에서는 반려 LOT에 재고가 남아 있으면 진짜 오류라 경고색을 썼지만,
          여기서는 '재고가 0이 된 다른 사유'일 뿐이라 알람으로 만들면 안 된다.
          정산 대조 때 소진분만 봐야 하는 경우가 있어 걸러내는 수단만 남긴다. */}
      {reversedPool.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface-alt px-4 py-3">
          <span className="text-body text-text-muted">
            이 중 {reversedPool.length}건은 출고 소진이 아니라 반려·취소로 0이 된 LOT입니다.
          </span>
          <div className="ml-auto">
            <Button variant="ghost" onClick={() => setOnlyAbnormal((v) => !v)} aria-pressed={onlyAbnormal}>
              {onlyAbnormal ? '전체 보기' : '반려·취소만 보기'}
            </Button>
          </div>
        </div>
      )}

      {selectedVisible.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface-alt px-4 py-3">
          <span className="text-body text-text">{selectedVisible.length}건 선택</span>
          <div className="ml-auto flex items-center gap-2">
            {/* 재고장 인쇄는 의도적으로 없다 — 소진 LOT은 재고장에 들어가면 안 된다. */}
            <Button variant="secondary" icon={ArrowDownTrayIcon} onClick={handleCsv}>
              CSV
            </Button>
            <Button variant="ghost" onClick={() => setSelected(new Set())}>
              해제
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {isLoading ? (
          /* 스페이서 설정이 실제 표와 같아야 로딩이 끝날 때 컬럼이 안 튄다 (§7-9) */
          <LoadingState cols={COLS} rows={8} spacer />
        ) : visible.length === 0 ? (
          isFiltered ? (
            <EmptyState
              title={search.trim() ? `'${search.trim()}'와 맞는 소진 LOT이 없습니다` : '조건에 맞는 LOT이 없습니다'}
              hint="검색어를 지우거나 재고 조회에서 활성 LOT을 확인하세요."
              action={
                <Button variant="secondary" onClick={() => router.push('/admin/master/lots')}>
                  재고 조회로
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="소진된 LOT이 없습니다"
              hint="LOT은 재고가 0이 되면 이 목록으로 옮겨집니다. 현재 재고는 재고 조회에서 봅니다."
            />
          )
        ) : (
          <div className="overflow-x-auto">
            {/* 컬럼이 적어 총폭(1420)이 컨테이너보다 작다 → 비례 확대 대신 스페이서가 잉여를 먹는다 (§7-9) */}
            <table className="w-full table-fixed" style={{ minWidth: MIN_WIDTH }}>
              <TableColGroup cols={COLS} spacer />
              <thead className="sticky top-0 z-20 bg-surface-alt">
                <tr className="text-left text-table-head text-text-muted">
                  <th className={cls.cell()}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="보이는 항목 전체 선택"
                      className="h-4 w-4 cursor-pointer accent-accent-fill align-middle"
                    />
                  </th>
                  <SortTh label="LOT번호" field="lotNumber" {...thProps} />
                  <SortTh label="품목" field="productName" {...thProps} />
                  <th className={cls.cell()}>규격</th>
                  <th className={cls.cell()}>미수</th>
                  <SortTh label="보관처" field="storageName" {...thProps} />
                  <SortTh label="최초입고일" field="firstInboundDate" {...thProps} />
                  <SortTh numeric label="수매가" field="purchasePrice" {...thProps} />
                  <th className={cls.cell()}>비고</th>
                  <SpacerCell as="th" />
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => (
                  <tr
                    key={l.id}
                    className="border-t border-border transition-colors hover:bg-surface-alt motion-reduce:transition-none"
                  >
                    <td
                      className={cls.pad('cursor-pointer select-none')}
                      onClick={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(l.id)) next.delete(l.id);
                          else next.add(l.id);
                          return next;
                        });
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        readOnly
                        aria-label="선택"
                        className="pointer-events-none h-4 w-4 cursor-pointer accent-accent-fill align-middle"
                      />
                    </td>
                    {/* 링크가 셀 패딩까지 갖는다 → td는 p-0 (근거: _lot-link.tsx).
                        이 화면은 소진 LOT 전용이라 원가를 안 보여준다 → 툴팁도 원가 문구 제외. */}
                    <td className="whitespace-nowrap p-0 text-body">
                      <LotLink
                        lotNumber={l.lotNumber}
                        className={cls.pad()}
                        title="클릭해 LOT 생애주기 보기"
                      />
                    </td>
                    <td className={cls.cell('text-body text-text')}>{l.productName || '—'}</td>
                    <td className={cls.cell('text-body text-text-muted')}>{formatSpec(l.spec)}</td>
                    <td className={cls.cell('text-body text-text-muted')}>{formatMisu(l.misu)}</td>
                    <td className={cls.cell('text-body text-text-muted')}>{l.storageName || '—'}</td>
                    <td className={cls.cell('text-body text-text-muted')}>{l.firstInboundDate || '—'}</td>
                    <NumCell
                      className={cls.pad('text-body text-text-muted')}
                      value={l.purchasePrice > 0 ? l.purchasePrice : null}
                      unit="원"
                      empty="—"
                    />
                    <td className={cls.clamp('text-body text-text-muted')} title={l.memo || undefined}>
                      {l.memo || '—'}
                    </td>
                    <SpacerCell />
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

// 폭 기준은 재고 조회와 동일(2026-07-28 실측 200건을 14px로 환산). 같은 데이터라 같은 값을 쓴다.
// 재고 조회와 같은 순서 규칙 — 좌측 정렬(텍스트) 묶음 → 우측 정렬(숫자) → 비고.
// 전에는 미수(좌) │ 수매가(우) │ 보관처(좌) 로 좌우가 두 번 갈렸다.
// 2026-07-30: 최초입고일도 재고 조회와 동일하게 128→156(헤더가 하한, 헤더 14px 전환).
const COLS: TableCol[] = [
  { key: 'check', label: '', px: 48 },
  { key: 'lotNumber', label: 'LOT번호', px: 264 },
  { key: 'productName', label: '품목', px: 160 },
  { key: 'spec', label: '규격', px: 104 },
  { key: 'misu', label: '미수', px: 108 },
  { key: 'storageName', label: '보관처', px: 148 },
  { key: 'firstInboundDate', label: '최초입고일', px: 156 },
  { key: 'purchasePrice', label: '수매가', px: 108, numeric: true },
  { key: 'memo', label: '비고', px: 240, clamp: true },
];
const MIN_WIDTH = tableMinWidth(COLS);
const cls = makeCellClasses('px-4', 'py-2');

/** 재고 조회와 같은 규격 (§7-8) — 버튼으로 감싸 키보드 조작, aria-sort는 th에. */
function SortTh({
  label,
  field,
  sortField,
  sortDir,
  onToggle,
  numeric = false,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onToggle: (f: SortField) => void;
  numeric?: boolean;
}) {
  const state = sortState(sortField === field, sortDir);
  return (
    <th aria-sort={ariaSort(state)} className={`whitespace-nowrap p-0 ${numeric ? NUM_CELL : ''}`.trim()}>
      <button
        type="button"
        onClick={() => onToggle(field)}
        className={`group flex w-full cursor-pointer select-none items-center gap-1 px-4 py-2 transition-colors hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-fill motion-reduce:transition-none ${
          numeric ? 'justify-end' : 'text-left'
        }`}
      >
        {numeric && <SortIcon state={state} />}
        {label}
        {!numeric && <SortIcon state={state} />}
      </button>
    </th>
  );
}
