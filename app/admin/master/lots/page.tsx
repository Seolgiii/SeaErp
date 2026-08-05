'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownTrayIcon, FunnelIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { formatNum } from '@/lib/number-format';
import { NumCell, NUM_CELL } from '@/app/admin/_num-cell';
import { makeCellClasses, tableMinWidth, TableColGroup, type TableCol } from '@/app/admin/_table-cols';
import { LotLink } from '@/app/admin/_lot-link';
import { formatSpec, formatMisu } from '@/lib/spec-display';
import { isNormalLotStatus } from '@/lib/status';
import { Button } from '@/app/components/ui/Button';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { LoadingState } from '@/app/components/ui/LoadingState';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { SortIcon, ariaSort, sortState } from '@/app/components/ui/SortIcon';
import { listLots, type Lot } from '@/app/actions/admin/master-lots';

// 재고장 인쇄 핸드오프 키 — /admin/ledger 인쇄 화면과 공유(새 탭 공유 위해 localStorage).
const LEDGER_KEY = 'seaerp:ledger-print';
const seoulToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

type SortField =
  | 'lotNumber'
  | 'productName'
  | 'stockQty'
  | 'firstInboundDate'
  | 'storageName'
  | 'daysHeld'
  | 'stockWeight'
  | 'purchasePrice'
  | 'costPerBox'
  | 'valuation';
type SortDir = 'asc' | 'desc';
type Filters = {
  from: string;
  to: string;
  spec: string;
  misu: string;
  origin: string;
  storage: string;
  minDays: string;
};
const EMPTY_FILTERS: Filters = {
  from: '',
  to: '',
  spec: '',
  misu: '',
  origin: '',
  storage: '',
  minDays: '',
};

/**
 * 재고 조회 — **활성 LOT(재고수량 > 0) 전용** read-only 표.
 * LOT은 입고 승인 시 자동 생성되므로 admin 직접 생성 거의 없음.
 *
 * 2026-07-29 소진 LOT을 별도 화면(`/admin/master/lots-depleted`)으로 분리했다. 이유 두 가지:
 *  ① **재고장 인쇄 안전** — 이 표는 인쇄해서 재고장이 된다. 소진 LOT이 섞이면 안 되는데,
 *     예전엔 상태 칩을 '전체'로 바꾸면 소진까지 선택·인쇄할 수 있었다. 구조로 막는다.
 *  ② **로딩** — 소진은 영구히 쌓인다. 서버에서 scope='active'로 걸러 애초에 안 받아온다.
 *
 * DESIGN.md 적용 완료(2026-07-29) — 토큰·공통 컴포넌트 확산 대상 2번째 화면(보관처 다음).
 */
export default function LotsMasterPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [items, setItems] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);
  const [sortField, setSortField] = useState<SortField>('firstInboundDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

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
    // 활성만 — 소진은 서버에서 아예 안 내려온다(소진 LOT 화면이 따로 받는다).
    const result = await listLots(workerId, 'active');
    if (result.success) setItems(result.data);
    else {
      // 서버 원문은 콘솔로, 화면에는 사용자 행동으로 번역해 보여준다 (§6-4).
      console.error('[lots] 재고 조회 실패:', result.error);
      toast('재고를 불러오지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
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
        (l) =>
          l.lotNumber.toLowerCase().includes(q) ||
          l.productName.toLowerCase().includes(q) ||
          l.misu.toLowerCase().includes(q),
      );
    }

    // 구조화 필터 (입고기간/품목명/규격/미수/원산지) — 입력된 항목만 적용
    const f = filters;
    const has = (s: string) => s.trim() !== '';
    const inc = (val: string, needle: string) =>
      val.toLowerCase().includes(needle.trim().toLowerCase());
    if (has(f.from)) list = list.filter((l) => l.firstInboundDate && l.firstInboundDate >= f.from);
    if (has(f.to)) list = list.filter((l) => l.firstInboundDate && l.firstInboundDate <= f.to);
    if (has(f.spec)) list = list.filter((l) => inc(l.spec, f.spec));
    if (has(f.misu)) list = list.filter((l) => inc(l.misu, f.misu));
    if (has(f.origin)) list = list.filter((l) => inc(l.origin, f.origin));
    if (has(f.storage)) list = list.filter((l) => inc(l.storageName, f.storage));
    if (has(f.minDays)) {
      const n = Number(f.minDays);
      if (Number.isFinite(n)) list = list.filter((l) => l.daysHeld >= n);
    }

    // 활성/소진 구분은 서버(scope='active')가 이미 했다 — 여기서 다시 거르지 않는다.

    // 이상 LOT만 보기 — 아래 경고 줄에서 켠다.
    if (onlyAbnormal) list = list.filter((l) => l.status && !isNormalLotStatus(l.status));

    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      return String(av ?? '').localeCompare(String(bv ?? ''), 'ko') * dir;
    });
    return list;
  })();

  // 현재 보이는 LOT들의 재고 평가액 합계 (재고 자산 가치 한눈 보기)
  const totalValuation = visible.reduce((sum, l) => sum + l.valuation, 0);

  const activeFilterCount = Object.values(filters).filter((v) => v.trim() !== '').length;
  const isFiltered = activeFilterCount > 0 || search.trim() !== '' || onlyAbnormal;
  const setFilter = (k: keyof Filters, v: string) =>
    setFilters((p) => ({ ...p, [k]: v }));
  // 드롭다운 검색(datalist) 옵션 — 현재 적재된 LOT들의 고유값
  const storageOptions = Array.from(
    new Set(items.map((l) => l.storageName).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'ko'));

  /**
   * 이상 LOT — 상태가 '승인 완료'가 아닌 것 (§6-2).
   * 이 표는 인쇄해서 재고장으로 쓰이므로, 정상이 아닌 LOT이 섞여 있는 것 자체가 오류다.
   * 200행을 눈으로 훑지 않고 잡아낼 수 있도록 표 위에 건수를 띄운다.
   * items는 이미 활성만이므로 상태 조건만 본다(이상 필터 자신은 빼야 토글이 성립한다).
   */
  const abnormalPool = items.filter((l) => l.status && !isNormalLotStatus(l.status));

  // 다중선택 — "보이는 것 중 선택된 것"만 대상으로(필터로 가려진 선택은 출력 제외 → 직관적)
  const selectedVisible = visible.filter((l) => selected.has(l.id));
  const selectedValuation = selectedVisible.reduce((s, l) => s + l.valuation, 0);
  const allVisibleSelected = visible.length > 0 && visible.every((l) => selected.has(l.id));

  // 합계 행 — 선택이 있으면 선택분 합계, 없으면 현재 보이는 전체 합계
  const summaryRows = selectedVisible.length > 0 ? selectedVisible : visible;
  const summaryIsSelection = selectedVisible.length > 0;
  const sumQty = summaryRows.reduce((s, l) => s + l.stockQty, 0);
  const sumWeight = summaryRows.reduce((s, l) => s + l.stockWeight, 0);
  const sumVal = summaryRows.reduce((s, l) => s + l.valuation, 0);

  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((l) => next.delete(l.id));
      else visible.forEach((l) => next.add(l.id));
      return next;
    });

  // 드래그 선택 — 체크박스 컬럼에서 mousedown 후 아래/위로 드래그하면 구간 선택.
  //   시작 행의 현재 선택 상태의 반대(target)를 드래그 구간 전체에 적용.
  //   snapshot(드래그 시작 시점 선택)을 기준으로 매 행 진입마다 구간을 재계산 → 되돌리기 자연스러움.
  const dragRef = useRef<{ start: number; target: boolean; snapshot: Set<string> } | null>(null);
  useEffect(() => {
    const end = () => {
      dragRef.current = null;
    };
    window.addEventListener('mouseup', end);
    return () => window.removeEventListener('mouseup', end);
  }, []);
  const applyDrag = (toIndex: number) => {
    const d = dragRef.current;
    if (!d) return;
    const next = new Set(d.snapshot);
    const lo = Math.min(d.start, toIndex);
    const hi = Math.max(d.start, toIndex);
    for (let j = lo; j <= hi; j++) {
      const id = visible[j]?.id;
      if (!id) continue;
      if (d.target) next.add(id);
      else next.delete(id);
    }
    setSelected(next);
  };
  const onSelectMouseDown = (index: number, id: string, e: React.MouseEvent) => {
    if (e.button !== 0) return; // 좌클릭만
    e.preventDefault(); // 드래그 중 텍스트 선택 방지
    dragRef.current = { start: index, target: !selected.has(id), snapshot: new Set(selected) };
    applyDrag(index);
  };

  // 재고장 인쇄 — 선택 LOT을 localStorage로 넘기고 새 탭에서 인쇄 화면 열기.
  const handlePrint = () => {
    if (selectedVisible.length === 0) return;
    try {
      window.localStorage.setItem(
        LEDGER_KEY,
        JSON.stringify({ asOf: seoulToday(), lots: selectedVisible }),
      );
    } catch (err) {
      console.error('[lots] 인쇄 핸드오프 실패:', err);
      toast('인쇄 데이터를 준비하지 못했습니다. 선택을 줄이고 다시 시도하세요.', 'error');
      return;
    }
    window.open('/admin/ledger', '_blank');
  };

  // CSV 내보내기 — 엑셀 한글 위해 BOM 선두, 쉼표/따옴표 이스케이프.
  // ⚠ CSV 헤더는 화면 라벨이 아니라 데이터 필드명이므로 '품목명'을 유지한다(§8-2 단서).
  //   기존 내려받은 파일·수식과의 호환을 깨지 않기 위함.
  const handleCsv = () => {
    if (selectedVisible.length === 0) return;
    const asOf = seoulToday();
    const header = ['LOT번호', '품목명', '규격', '미수', '원산지', '보관처', '보관일수', '재고수량(박스)', '박스당 수매가(원)', '박스당 재고원가(원)', '평가액(원)'];
    const body = selectedVisible.map((l) => [
      l.lotNumber,
      l.productName,
      formatSpec(l.spec),
      formatMisu(l.misu),
      l.origin,
      l.storageName,
      l.firstInboundDate ? String(l.daysHeld) : '',
      String(l.stockQty),
      l.purchasePrice > 0 ? String(Math.round(l.purchasePrice)) : '',
      l.costPerBox > 0 ? String(Math.round(l.costPerBox)) : '',
      l.costPerBox > 0 ? String(l.valuation) : '',
    ]);
    const totalQty = selectedVisible.reduce((s, l) => s + l.stockQty, 0);
    const totalVal = selectedVisible.reduce((s, l) => s + l.valuation, 0);
    const footer = ['합계', '', '', '', '', '', '', String(totalQty), '', '', String(totalVal)];
    const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv =
      '﻿' + [header, ...body, footer].map((r) => r.map(cell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `재고장_${asOf}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      // 날짜·수량·금액은 큰 값부터(desc)가 보통 더 유용
      const descFirst: SortField[] = ['firstInboundDate', 'daysHeld', 'stockQty', 'stockWeight', 'purchasePrice', 'costPerBox', 'valuation'];
      setSortDir(descFirst.includes(field) ? 'desc' : 'asc');
    }
  };

  // 최초 진입 — 레이아웃이 아직 없어 표 골격을 그릴 수 없다(§6-4).
  if (!workerId) return <LoadingState label="세션 확인 중…" />;

  const thProps = { sortField, sortDir, onToggle: toggleSort };

  return (
    <div className="min-w-0 p-8">
      {/* 제목 줄에 검색·필터를 함께 둔다.
          상태 칩(활성/소진/전체)이 화면 분리로 사라지면서 컨트롤 행 하나가 통째로 없어졌다 —
          남은 컨트롤 2개를 다시 한 줄로 내리면 그 여백이 그대로 되살아난다. */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-page text-text">재고 조회</h1>
          {/* 순서: 조회 전용 → (건수) → 평가액 합계.
              `조회 전용`이 늘 앞에 있어 뒤 조각들이 각자 앞에 ` · `를 달면 된다 —
              구분자가 어디에도 매달리지 않는다.

              건수는 필터가 걸렸을 때만 띄운다 (§6-2 '정상은 조용히').
              필터가 없으면 `186건 / 전체 186건`이라 스스로를 반복한다.

              ⚠ 반대로 필터가 걸리면 건수는 **필수다.** 평가액 합계는 전체가 아니라
              `visible` 기준이라(위 totalValuation) 필터만큼 줄어든 금액이 찍힌다. 건수가
              없으면 그 7억이 전사 재고자산 총액으로 읽힌다. 건수 = "이건 일부다"의 유일한 신호.
              **그래서 건수는 평가액 바로 앞에 붙인다** — 떼어놓으면 그 연결이 끊긴다.

              '재고가 남은 LOT' 접두어는 뺐다 — 소진 LOT을 별도 화면으로 분리한 뒤로는
              이 화면에 남은 것만 있다는 게 자명해서 매번 읽히기만 하고 알려주는 게 없었다. */}
          <p className="mt-1 text-label text-text-muted">
            조회 전용
            {isFiltered && (
              <> · <span className="text-text">{visible.length}건 / 전체 {items.length}건</span></>
            )}
            {totalValuation > 0 && (
              <> · <span className="text-text">평가액 합계 {formatNum(totalValuation, '원')}</span></>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* 카드 밖 입력이라 배경은 --surface (§6-3) */}
          <input
            type="text"
            placeholder="LOT번호·품목 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-control w-40 rounded-control border border-border bg-surface px-3 text-body text-text outline-none placeholder:text-text-faint focus:border-transparent focus:ring-2 focus:ring-accent-fill"
          />
          {/* 필터 토글 — 채움(Primary)은 '재고장 인쇄' 하나뿐이므로 여기는 면+글자 분리 (§2-3) */}
          <Button
            variant="secondary"
            icon={FunnelIcon}
            onClick={() => setShowFilter((v) => !v)}
            aria-expanded={showFilter}
            className={showFilter || activeFilterCount > 0 ? 'border-accent-ink bg-accent-bg text-accent-ink' : ''}
          >
            필터
            {activeFilterCount > 0 && <span className="tabular-nums">{activeFilterCount}</span>}
          </Button>
        </div>
      </header>

      {/* 필터 패널 — 입고기간/보관처/규격/미수/원산지/보관일수 (입력된 항목만 AND 적용) */}
      {showFilter && (
        <div className="mb-4 rounded-card border border-border bg-surface p-6">
          <div className="flex flex-wrap gap-4">
            {/* 입고기간 */}
            <div className="min-w-[240px] flex-[2]">
              <label className="mb-2 block text-label text-text-muted" htmlFor="lot-from">입고기간</label>
              <div className="flex items-center gap-2">
                <input
                  id="lot-from"
                  type="date"
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(e) => setFilter('from', e.target.value)}
                  className={FIELD}
                />
                <span className="text-text-muted">~</span>
                <input
                  type="date"
                  aria-label="입고기간 끝"
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(e) => setFilter('to', e.target.value)}
                  className={FIELD}
                />
              </div>
            </div>
            {/* 보관처 — 드롭다운 검색 */}
            <div className="min-w-[152px] flex-1">
              <label className="mb-2 block text-label text-text-muted" htmlFor="lot-storage">보관처</label>
              <input
                id="lot-storage"
                list="lot-storage-options"
                value={filters.storage}
                onChange={(e) => setFilter('storage', e.target.value)}
                placeholder="전체"
                className={FIELD}
              />
              <datalist id="lot-storage-options">
                {storageOptions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <FilterField className="min-w-[112px] flex-1" label="규격" value={filters.spec} onChange={(v) => setFilter('spec', v)} placeholder="예: 11" />
            <FilterField className="min-w-[112px] flex-1" label="미수" value={filters.misu} onChange={(v) => setFilter('misu', v)} placeholder="예: 42/44" />
            <FilterField className="min-w-[112px] flex-1" label="원산지" value={filters.origin} onChange={(v) => setFilter('origin', v)} placeholder="예: 국산" />
            {/* 보관일수 (최소) */}
            <div className="min-w-[136px] flex-1">
              <label className="mb-2 block text-label text-text-muted" htmlFor="lot-days">보관일수</label>
              <div className="flex items-center gap-2">
                <input
                  id="lot-days"
                  type="number"
                  min="0"
                  value={filters.minDays}
                  onChange={(e) => setFilter('minDays', e.target.value)}
                  placeholder="예: 90"
                  className={FIELD}
                />
                <span className="whitespace-nowrap text-body text-text-muted">일↑</span>
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)} disabled={activeFilterCount === 0}>
              초기화
            </Button>
            <Button variant="secondary" onClick={() => setShowFilter(false)}>
              닫기
            </Button>
          </div>
        </div>
      )}

      {/* 이상 LOT 경고 (§6-2) — 이 표는 인쇄해 재고장으로 쓰이므로 비정상 LOT이 섞이는 것 자체가 오류다.
          200행을 훑지 않고 잡아낼 수 있도록 건수를 띄우고, 바로 걸러볼 수 있게 토글을 붙인다. */}
      {abnormalPool.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-warn-ink bg-warn-bg px-4 py-3">
          <span className="text-body text-warn-ink">
            상태가 정상이 아닌 LOT {abnormalPool.length}건이 있습니다. 재고장에 포함되면 안 됩니다.
          </span>
          <div className="ml-auto">
            <Button variant="ghost" onClick={() => setOnlyAbnormal((v) => !v)} aria-pressed={onlyAbnormal}>
              {onlyAbnormal ? '전체 보기' : '이상만 보기'}
            </Button>
          </div>
        </div>
      )}

      {/* 다중선택 툴바 — 선택 시에만 노출 */}
      {selectedVisible.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface-alt px-4 py-3">
          <span className="text-body text-text">
            {selectedVisible.length}건 선택
            {selectedValuation > 0 && (
              <span className="ml-2 text-text-muted">· 평가액 {formatNum(selectedValuation, '원')}</span>
            )}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {/* 화면의 유일한 Primary (§2-3) */}
            <Button variant="primary" icon={PrinterIcon} onClick={handlePrint}>
              재고장 인쇄
            </Button>
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
          <LoadingState cols={LOT_COLS} rows={8} />
        ) : visible.length === 0 ? (
          search.trim() !== '' ? (
            /* 검색이 빈손일 때 — 이 화면은 활성만 담으므로 "없다"가 아니라
               "여기엔 없다"가 정확하다. 소진됐을 수 있으니 검색어를 들고 넘어갈 길을 준다.
               이 안내가 없으면 존재하는 LOT을 없다고 말하는 조용한 실패가 된다. */
            <EmptyState
              title={`'${search.trim()}'와 맞는 재고가 없습니다`}
              hint="이미 소진된 LOT일 수 있습니다. 같은 검색어로 소진 LOT을 확인하세요."
              action={
                <Button
                  variant="secondary"
                  onClick={() =>
                    router.push(`/admin/master/lots-depleted?q=${encodeURIComponent(search.trim())}`)
                  }
                >
                  소진 LOT에서 찾기
                </Button>
              }
            />
          ) : isFiltered ? (
            <EmptyState
              title="조건에 맞는 LOT이 없습니다"
              hint="필터를 초기화하거나 조건을 넓혀보세요."
            />
          ) : (
            <EmptyState
              title="재고가 남은 LOT이 없습니다"
              hint="LOT은 입고 승인 시 자동으로 만들어집니다. 결재 수신함에서 대기 중인 입고를 확인하세요."
            />
          )
        ) : (
          <div className="overflow-x-auto">
            {/* 표준 구조(app/admin/_table-cols) — 잘림 없이 전부 표시하고 총폭을 넘으면 가로 스크롤.
                창을 좁혀도 table-fixed + minWidth라 컬럼 폭이 줄지 않는다. */}
            <table className="w-full table-fixed" style={{ minWidth: LOT_MIN_WIDTH }}>
              <TableColGroup cols={LOT_COLS} />
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
                  {/* sticky 헤더 셀은 불투명 배경이 필요하다 (§7-3) */}
                  <SortTh label="LOT번호" field="lotNumber" {...thProps} thClassName="sticky left-0 z-30 bg-surface-alt" />
                  {/* §8-2 용어 사전: 표 헤더는 '품목'(필드 라벨일 때만 '품목명') */}
                  <SortTh label="품목" field="productName" {...thProps} />
                  <th className={cls.cell()}>규격</th>
                  <th className={cls.cell()}>미수</th>
                  <SortTh label="보관처" field="storageName" {...thProps} />
                  <SortTh label="최초입고일" field="firstInboundDate" {...thProps} />
                  <SortTh numeric label="재고수량" field="stockQty" {...thProps} />
                  <SortTh numeric label="총중량" field="stockWeight" {...thProps} />
                  <SortTh numeric label="수매가" field="purchasePrice" {...thProps} />
                  <SortTh numeric label="재고원가" field="costPerBox" {...thProps} />
                  <SortTh numeric label="평가액" field="valuation" {...thProps} />
                  <SortTh
                    numeric
                    label="보관일수"
                    field="daysHeld"
                    {...thProps}
                    title={`최초 입고일 기준 총 보관기간 (이동해도 원본 입고일 유지). 냉장료는 현 보관처 입고일 기준이라 더 짧을 수 있음. ${DAYS_WARN}일 이상 주의색, ${DAYS_DANGER}일 이상 위험색.`}
                  />
                  <th className={cls.cell()}>비고</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l, idx) => (
                  <tr
                    key={l.id}
                    className="group border-t border-border transition-colors hover:bg-surface-alt motion-reduce:transition-none"
                  >
                    <td
                      className={cls.pad('cursor-pointer select-none')}
                      onMouseDown={(e) => onSelectMouseDown(idx, l.id, e)}
                      onMouseEnter={() => {
                        if (dragRef.current) applyDrag(idx);
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
                    {/* sticky 칸도 행 hover 배경을 따라가야 한다 (§7-3).
                        bg-surface로 고정하면 가로 스크롤 시 이 칸만 hover가 끊겨 행이 잘려 보인다.

                        **이상 상태 배지가 여기 붙는다.** 전에는 14번째 '상태' 컬럼(x=1640px)에
                        있었는데, DESIGN.md §1의 최소 지원 폭 1280px에서는 화면 밖이었다 —
                        가로 스크롤해야 보이는 오류 표시는 오류를 못 잡는다. sticky라 항상 보이는
                        이 칸으로 옮겼다. 정상 행에는 아무 표식도 없다(§6-2 '정상은 조용히').

                        **LOT 생애주기 진입 = 이 링크뿐이다** (2026-07-30, 근거: _lot-link.tsx).
                        전에는 행 전체 클릭이었는데 셀 텍스트를 복사하려 드래그하면 페이지가
                        이동했고, Ctrl+클릭으로 새 탭에 못 띄웠다. 링크가 셀 패딩을 갖는 대신
                        td는 p-0 — 패딩을 td에 남기면 세로 타겟이 20px로 얇아진다.
                        상태 배지는 링크 안에 둔다 — 그 LOT을 설명하는 라벨이라 목적지가 같다.

                        ⚠ **LOT번호를 `inline-flex`로 감싸지 말 것.** text-decoration은 flex
                        컨테이너·inline-block 같은 원자 상자 안으로 전파되지 않아서, 감싸면
                        hover 밑줄이 조용히 사라진다(2026-07-30 실제 발생). LOT번호는 링크의
                        직계 텍스트로 두고, 배지 간격은 배지 쪽 `ml-2`로 준다.
                        배지 자신은 inline-block이라 밑줄이 안 번진다 — 이건 의도한 것이다. */}
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-surface p-0 text-body group-hover:bg-surface-alt">
                      <LotLink lotNumber={l.lotNumber} className={cls.pad()}>
                        {l.lotNumber}
                        {l.status && !isNormalLotStatus(l.status) && (
                          <StatusBadge
                            status={l.status}
                            label={l.statusReason || l.status}
                            className="ml-2"
                          />
                        )}
                      </LotLink>
                    </td>
                    <td className={cls.cell('text-body text-text')}>{l.productName || '—'}</td>
                    <td className={cls.cell('text-body text-text-muted')}>{formatSpec(l.spec)}</td>
                    <td className={cls.cell('text-body text-text-muted')}>{formatMisu(l.misu)}</td>
                    <td className={cls.cell('text-body text-text-muted')}>{l.storageName || '—'}</td>
                    <td className={cls.cell('text-body text-text-muted')}>{l.firstInboundDate || '—'}</td>
                    {/* 이 화면의 핵심 지표 — 값 컬럼 중 유일하게 액센트를 쓴다.
                        재고 0은 '있음'의 반대라 액센트를 빼고 중립으로 가라앉힌다. */}
                    <NumCell
                      className={cls.pad(`text-body ${l.stockQty > 0 ? 'text-accent-ink' : 'text-text-muted'}`)}
                      value={l.stockQty}
                      unit="박스"
                      empty="—"
                    />
                    <NumCell
                      className={cls.pad('text-body text-text-muted')}
                      value={l.stockWeight > 0 ? l.stockWeight : null}
                      unit="kg"
                      empty="—"
                    />
                    <NumCell
                      className={cls.pad('text-body text-text-muted')}
                      value={l.purchasePrice > 0 ? l.purchasePrice : null}
                      unit="원"
                      empty="—"
                    />
                    <NumCell
                      className={cls.pad('text-body text-text-muted')}
                      value={l.costPerBox > 0 ? l.costPerBox : null}
                      unit="원"
                      empty="—"
                    />
                    <NumCell
                      className={cls.pad('text-body text-text')}
                      value={l.costPerBox > 0 ? l.valuation : null}
                      unit="원"
                      empty="—"
                    />
                    {/* 오래 묵은 LOT은 냉장료가 계속 붙어 원가가 오른다 → 임계 넘으면 주의·위험색 */}
                    <NumCell
                      className={cls.pad(`text-body ${l.firstInboundDate ? daysHeldTone(l.daysHeld) : 'text-text-muted'}`)}
                      value={l.firstInboundDate ? l.daysHeld : null}
                      unit="일"
                      empty="—"
                    />
                    <td className={cls.clamp('text-body text-text-muted')} title={l.memo || undefined}>
                      {l.memo || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* colSpan 7 = check·LOT번호·품목·규격·미수·보관처·최초입고일 (좌측 텍스트 묶음).
                    뒤로 숫자 6칸 + 비고 1칸 = 총 14열. 컬럼을 더하거나 뺄 때 여기도 같이 고칠 것. */}
                <tr className="border-t border-border bg-surface-alt text-body text-text">
                  <td className={cls.pad()} colSpan={7}>
                    합계{' '}
                    <span className="text-text-muted">
                      ({summaryIsSelection ? `선택 ${selectedVisible.length}건` : `${visible.length}건`})
                    </span>
                  </td>
                  {/* 합계도 본문과 같은 색 규칙 — 재고수량만 액센트 */}
                  <NumCell className={cls.pad('text-accent-ink')} value={sumQty} unit="박스" empty="—" />
                  <NumCell className={cls.pad()} value={sumWeight > 0 ? sumWeight : null} unit="kg" empty="—" />
                  <td className={cls.pad()} />
                  <td className={cls.pad()} />
                  <NumCell className={cls.pad()} value={sumVal > 0 ? sumVal : null} unit="원" empty="—" />
                  <td className={cls.pad()} />
                  <td className={cls.pad()} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 컬럼 폭 (표준: app/admin/_table-cols — 잘림 없이 전부 표시 + 넘치면 가로 스크롤)
// px = 내용 최댓값 + 여유 8 + 좌우 패딩 32(px-4).
//
// 실측 근거: 2026-07-28 Airtable `LOT별 재고` 200건 전량의 표시 문자열(13px 기준).
// ⚠ 2026-07-29 셀 글자를 13px → text-body(14px)로 올리며(§3 타입 스케일) 폭을 14/13 = 1.077배로
//   환산했다. **브라우저 재실측이 아니라 산술 환산이다** — 실제 렌더 폭과 1~2px 어긋날 수 있다.
//   (정렬 아이콘만 14 → 16px로 커져 +2px 반영.)
// ⚠ 2026-07-30 헤더도 text-label(12px) → text-table-head(14px)로 올라가며, 헤더가
//   하한이던 4개 컬럼(최초입고일·재고수량·재고원가·보관일수)을 ×1.2로 재환산했다 —
//   이 역시 산술 환산이다. Pretendard가 Spoqa보다 자면이 커서 안전 마진을 더 뒀다.
// ── 컬럼 순서 (2026-07-29 재정렬) ─────────────────────────────────────────────
// **좌측 정렬(텍스트) 묶음 → 우측 정렬(숫자) 묶음 → 비고** 순으로 뭉친다.
// 전에는 …평가액(우) │ 보관처(좌) │ 보관일수(우)… 로 좌우가 세 번 갈렸다. 시선이 매 행마다
// 지그재그로 튀고, 좌측 텍스트가 양옆 숫자 사이에 떠 보인다. 이제 좌우 전환이 한 번뿐이다.
//
// §7-6은 정렬 방향만 정한다(계산되는 수=우측 / 식별자·라벨=좌측). 보관처는 '거래처'류라
// 좌측이 맞고, 어색함의 원인은 정렬이 아니라 순서였다 — 정렬을 바꾸지 않고 순서로 푼다.
//
// 2026-07-25 journal의 "최초입고일을 정체성 묶음 앞에서 보관처↔보관일수 사이로" 의도도
// 함께 반영했다(그 작업은 코드에 반영되기 전에 유실됐다). 품목이 LOT번호 바로 옆이 되고,
// 최초입고일은 앞머리에서 빠져 텍스트 묶음 끝으로 간다.
const LOT_COLS: TableCol[] = [
  { key: 'check', label: '', px: 48 },
  // 이상 상태 배지가 이 셀 안에 붙는다(아래 주석 참조) → 배지 폭 46 + 간격 8 만큼 넓혔다.
  { key: 'lotNumber', label: 'LOT번호', px: 320 },      // 206→222 `251002-MA1-21.5/22-점70/80-0008`
  { key: 'productName', label: '품목', px: 160 },        // 111→120 `사료 (BOAR FISH)`
  { key: 'spec', label: '규격', px: 104 },               // 59→64 `11.5~12kg`
  { key: 'misu', label: '미수', px: 108 },               // 62→67 `70/120G미`
  { key: 'storageName', label: '보관처', px: 148 },      // 98→106 `신우농수산2공장`
  { key: 'firstInboundDate', label: '최초입고일', px: 156 }, // 128→156. 헤더가 하한
  { key: 'stockQty', label: '재고수량', px: 136, numeric: true },  // 112→136. 헤더가 하한
  { key: 'stockWeight', label: '총중량', px: 100, numeric: true }, // 55→59 `11,245kg`
  { key: 'purchasePrice', label: '수매가', px: 108, numeric: true }, // 60→65 `104,000원`
  { key: 'costPerBox', label: '재고원가', px: 136, numeric: true },  // 112→136. 헤더가 하한
  { key: 'valuation', label: '평가액', px: 136, numeric: true },     // 86→93 `156,307,899원`
  { key: 'daysHeld', label: '보관일수', px: 136, numeric: true },    // 112→136. 헤더가 하한
  // 비고만 「말줄임 금지」 예외(clamp) — 자유 텍스트라 최댓값을 예측할 수 없다.
  // 상한 240은 실측이 아니라 정책값이므로 글자 크기 환산 대상이 아니다.
  { key: 'memo', label: '비고', px: 240, clamp: true },
];
const LOT_MIN_WIDTH = tableMinWidth(LOT_COLS);
// py-2 + body(14×1.5=21) + border 1 = 38px 행 높이 (§7-7)
const cls = makeCellClasses('px-4', 'py-2');

// ── 색 운용 원칙 (DESIGN.md §2-3: 한 화면 액센트 최대 2종) ─────────────────────
// **색은 "찾는 값"과 "예외"에만 준다.** 전부에 색을 주면 아무것도 강조되지 않는다.
//   accent-ink  재고수량 — 이 화면에 온 이유. 값 컬럼 중 유일한 액센트.
//   warn/danger 보관일수 임계 초과 — 상태 배지와 같은 계열을 재사용한다(새 색 도입 아님).
//   text        LOT번호·평가액 — 액센트가 아니라 가장 진한 중립으로 위계를 만든다(§3).
//   text-muted  나머지 전부.
// LOT번호에 `--link`(§2-2)를 쓰지 않은 이유: 클릭 대상은 셀이 아니라 **행 전체**다.
// 링크색을 주면 그 칸만 눌러야 하는 것처럼 읽힌다. 행 hover + cursor로 이미 알린다.

/**
 * 보관일수 경고 임계.
 *
 * ⚠ **업무 규칙으로 확정된 값이 아니다.** 냉장료가 하루 단위로 붙어 오래 묵을수록 원가가
 *   오르므로 오래된 LOT을 눈에 띄게 한 것뿐이다. (필터 placeholder가 '예: 90'인 것에서 90을 땄다.)
 *   실제 악성재고 기준이 정해지면 이 두 줄만 고친다.
 */
const DAYS_WARN = 90;
const DAYS_DANGER = 180;

/** 보관일수 → 글자색. 숫자 자체가 정보이고 색은 강조일 뿐이다(§6-2 '색만으로 표현 금지' 충족). */
function daysHeldTone(days: number): string {
  if (days >= DAYS_DANGER) return 'text-danger-ink';
  if (days >= DAYS_WARN) return 'text-warn-ink';
  return 'text-text-muted';
}

/** 카드 안에 놓이는 입력 — 배경은 --surface-alt (§6-3). 카드 밖 검색창만 --surface. */
const FIELD =
  'h-control w-full rounded-control border border-border bg-surface-alt px-3 text-body text-text outline-none placeholder:text-text-faint focus:border-transparent focus:ring-2 focus:ring-accent-fill';

function FilterField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const id = `lot-filter-${label}`;
  return (
    <div className={className}>
      <label className="mb-2 block text-label text-text-muted" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={FIELD}
      />
    </div>
  );
}

/**
 * 정렬 가능한 헤더 (§7-8).
 *
 * · 헤더 내용을 `<button>`으로 감싼다 — `<th onClick>`은 키보드로 조작할 수 없다.
 * · `aria-sort`는 columnheader인 `<th>`에 붙는다.
 * · **아이콘은 라벨의 정렬 반대편**: 좌측 정렬 컬럼은 라벨 오른쪽, 우측 정렬(숫자) 컬럼은
 *   라벨 왼쪽. 그래야 숫자 헤더의 우측선이 값의 우측선과 일치한다.
 * · 패딩은 th가 아니라 button이 가져간다 — 클릭 영역이 헤더 칸 전체가 되도록.
 */
function SortTh({
  label,
  field,
  sortField,
  sortDir,
  onToggle,
  title,
  numeric = false,
  thClassName = '',
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onToggle: (f: SortField) => void;
  title?: string;
  /** 수량·중량·금액·단가 컬럼 — 값 셀(NumCell)과 우측 끝을 맞춘다. */
  numeric?: boolean;
  thClassName?: string;
}) {
  const state = sortState(sortField === field, sortDir);
  return (
    <th
      aria-sort={ariaSort(state)}
      title={title}
      className={`whitespace-nowrap p-0 ${numeric ? NUM_CELL : ''} ${thClassName}`.trim()}
    >
      <button
        type="button"
        onClick={() => onToggle(field)}
        className={`group flex w-full cursor-pointer select-none items-center gap-1 px-4 py-2 transition-colors hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-fill motion-reduce:transition-none ${
          numeric ? 'justify-end' : 'text-left'
        }`}
      >
        {/* 우측 정렬 컬럼은 아이콘이 라벨 왼쪽 (§7-8) */}
        {numeric && <SortIcon state={state} />}
        {label}
        {!numeric && <SortIcon state={state} />}
      </button>
    </th>
  );
}
