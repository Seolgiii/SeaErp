'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { formatNum } from '@/lib/number-format';
import {
  listCurrentStorageCosts,
  listStorages,
  type Storage,
  type StorageCost,
} from '@/app/actions/admin/master-storage';
import {
  listProcessingRates,
  type ProcessingRate,
} from '@/app/actions/admin/master-processing-rates';
import { listProducts, type Product } from '@/app/actions/admin/master-products';
import { STORAGE_KINDS, type StorageKind } from '@/lib/storage-kinds';
import StorageEditModal from '@/app/components/StorageEditModal';
import ProcessingRateEditModal from '@/app/components/ProcessingRateEditModal';
import { Button } from '@/app/components/ui/Button';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { LoadingState } from '@/app/components/ui/LoadingState';
import { NumCell, NumHead } from '@/app/admin/_num-cell';
import { SpacerCell, TableColGroup, tableMinWidth, type TableCol } from '@/app/admin/_table-cols';
import { SortIcon, ariaSort, sortState } from '@/app/components/ui/SortIcon';
import { rateBasisLabel } from '@/lib/processing-rate-basis';

type SortDir = 'asc' | 'desc';

/**
 * 보관 경비 표 컬럼 — 자사창고·외부창고 덩어리에서 쓴다.
 * 폭은 §7-2(실측 최댓값 + 여유 8 + 패딩 32). 실측: 보관처 마스터 84건 / 비용 이력 83행.
 *
 * ⚠ 동결비가 3열인 건 실수가 아니다. 라이브 `보관처 비용 이력`에 단일 '동결비' 필드가 없고
 *   박스종류별(팬/베이트大/베이트小)로만 있다. 하나로 합치면 어느 박스 단가인지 잃는다.
 */
const COST_COLS: TableCol[] = [
  { key: 'name', label: '보관처명', px: 320 }, // max 278 `제주어류양식수협 / 제주도해수어류양식수협`
  { key: 'inOut', label: '입출고비', px: 92, numeric: true },
  { key: 'fPan', label: '동결비(팬)', px: 108, numeric: true },
  { key: 'fLarge', label: '동결비(大)', px: 108, numeric: true },
  { key: 'fSmall', label: '동결비(小)', px: 108, numeric: true },
  { key: 'union', label: '노조비', px: 84, numeric: true },
  { key: 'refrig', label: '냉장료', px: 84, numeric: true },
  { key: 'period', label: '적용기간', px: 188 }, // `2026-01-01 ~ 2027-01-01`
];

/** 가공비 단가 표 컬럼 — 가공공장 덩어리의 우측 패널. */
const RATE_COLS: TableCol[] = [
  { key: 'product', label: '가공품', px: 132 }, // max `가시제거고등어`
  { key: 'price', label: '단가', px: 92, numeric: true },
  // 배지 `가공품 중량 기준`(저장값은 `산출kg당`)이 최댓값 — 실측 88 + 여유 8 + 셀 패딩 32 = 128 (§7-2)
  { key: 'basis', label: '기준', px: 128 },
  { key: 'period', label: '적용기간', px: 188 },
  { key: 'memo', label: '비고', px: 200, clamp: true }, // 자유 텍스트 → 상한 + 말줄임(§7-2 예외)
];

/**
 * 제목 줄·카드 공통 최대 폭 (§7-9). 보관 경비 표 1092 → **1120**(스페이서 28px).
 *
 * 페이지 컨테이너에 `mx-auto max-w-[1200px]`를 두지 않는다 — 다른 마스터 4화면과 다르다.
 * 컬럼이 2개일 땐 좁은 마스터였지만 보관 경비 6열이 붙어 **8컬럼 1092px짜리 넓은 데이터 표**가
 * 됐다. 1200 뚜껑을 쓰면 좌측 필터 레일(144)을 붙이는 순간 표에 남는 폭이 960px로 떨어져
 * 표가 가로로 잘린다. CLAUDE.md의 "재고 조회·재고장은 full width 유지"와 같은 범주로 본다.
 * 대신 카드는 여전히 1120에서 멈춘다 — 넓은 모니터에서 표가 화면 끝까지 벌어지면 눈이 멀리 간다.
 */
const CONTENT_MAX = 'max-w-[1120px]';

/** `2026-01-01 ~ 2027-01-01` / 종료일 없으면 `2026-01-01 ~ (현재)`. 둘 다 없으면 —. */
function periodLabel(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return '—';
  if (!endDate) return `${startDate || '(시작일 없음)'} ~ 현재`;
  return `${startDate || '(시작일 없음)'} ~ ${endDate}`;
}

export default function StorageMasterPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [items, setItems] = useState<Storage[]>([]);
  const [costs, setCosts] = useState<Record<string, StorageCost>>({});
  const [rates, setRates] = useState<ProcessingRate[]>([]);
  const [fillets, setFillets] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<StorageKind | 'ALL'>('ALL');
  /**
   * 정렬은 **덩어리마다 독립**이다. 하나로 묶으면 외부창고를 뒤집는 순간
   * 자사창고까지 같이 뒤집혀, 보고 있지도 않은 표가 움직인다.
   */
  const [sortDirs, setSortDirs] = useState<Record<StorageKind, SortDir>>({
    자사창고: 'asc',
    외부창고: 'asc',
    가공공장: 'asc',
  });
  const toggleSort = (kind: StorageKind) =>
    setSortDirs((prev) => ({ ...prev, [kind]: prev[kind] === 'asc' ? 'desc' : 'asc' }));
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Storage | 'new' | null>(null);
  /** 가공비 단가 편집 — 'new'면 선택 중인 공장으로 추가. */
  const [editingRate, setEditingRate] = useState<ProcessingRate | 'new' | null>(null);

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
    const [s, c, r, p] = await Promise.all([
      listStorages(workerId),
      listCurrentStorageCosts(workerId),
      listProcessingRates(workerId),
      listProducts(workerId),
    ]);
    if (s.success) setItems(s.data);
    else toast('보관처 목록을 불러오지 못했습니다. 새로고침하세요.', 'error');
    if (c.success) setCosts(c.data);
    if (r.success) setRates(r.data);
    if (p.success) setFillets(p.data);
    setIsLoading(false);
  }, [workerId]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  const productName = useMemo(() => {
    const m = new Map(fillets.map((p) => [p.id, p.name]));
    return (id: string) => m.get(id) ?? '—';
  }, [fillets]);
  /** 가공품 선택지 — 품목구분이 '필렛'인 것만 (가공비 단가 마스터의 기존 규칙). */
  const filletOptions = useMemo(() => fillets.filter((p) => p.category === '필렛'), [fillets]);

  /** 검색으로 거른 뒤 구분별로 나누고, **덩어리마다 자기 정렬 방향**으로 정렬한다. */
  const byKind = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out: Record<StorageKind, Storage[]> = { 자사창고: [], 외부창고: [], 가공공장: [] };
    for (const s of items) {
      if (q && !s.name.toLowerCase().includes(q)) continue;
      if (s.kind) out[s.kind].push(s);
    }
    for (const k of STORAGE_KINDS) {
      const dir = sortDirs[k] === 'asc' ? 1 : -1;
      out[k].sort((a, b) => a.name.localeCompare(b.name, 'ko') * dir);
    }
    return out;
  }, [items, search, sortDirs]);

  const factories = byKind.가공공장;
  const selectedFactory =
    factories.find((f) => f.id === selectedFactoryId) ?? factories[0] ?? null;
  const factoryRates = useMemo(
    () => (selectedFactory ? rates.filter((r) => r.factoryId === selectedFactory.id) : []),
    [rates, selectedFactory],
  );

  // 최초 진입 — 레이아웃이 아직 없어 골격을 그릴 수 없다(§6-4의 스피너 허용 예외).
  if (!workerId) {
    return (
      <div className="p-8">
        <LoadingState />
      </div>
    );
  }

  const shown = STORAGE_KINDS.reduce((n, k) => n + byKind[k].length, 0);
  const isFiltered = Boolean(search) || kindFilter !== 'ALL';
  const visibleKinds = kindFilter === 'ALL' ? STORAGE_KINDS : [kindFilter];

  /**
   * 화면의 유일한 Primary (§2-3). **첫 덩어리 소제목 우측**에 붙는다.
   * '자사창고 위치'가 기본이지만 필터로 자사창고가 숨으면 첫 덩어리로 따라간다 —
   * 특정 덩어리에 못 박으면 외부창고만 보는 중에는 보관처를 아예 못 만든다.
   */
  const addStorageButton = (
    <Button variant="primary" icon={PlusIcon} onClick={() => setEditing('new')}>
      보관처 추가
    </Button>
  );

  return (
    // items-start — 레일이 sticky로 붙으려면 flex가 늘려 세우면 안 된다.
    // gap-8(32) = 페이지 좌측 여백(p-8)과 같은 간격. 레일과 본문이 붙어 보이지 않게.
    <div className="flex min-w-0 items-start gap-8 p-8">
      {/* 좌측 구분 필터 레일 — 79행을 내려봐도 필터가 따라온다.
          가로 칩 한 줄이 세로로 서면서 컨트롤 행(32 + 여백 16 = 48px)이 통째로 사라진다. */}
      {/* top-[66px] = 탭바(_tab-bar.tsx: sticky top-0 · h-[42px]) 42 + 여백 24.
          top-8(32)이면 스크롤 시 레일 윗부분이 탭바 뒤로 들어가 잘린다. */}
      <aside className="sticky top-[66px] w-36 shrink-0" aria-label="보관처 마스터 구분 필터">
        <h1 className="mb-3 px-3 text-page text-text">보관처 마스터</h1>
        {/* 구분을 세 묶음으로 나눈다 — 아래 표의 생김새가 묶음마다 다르기 때문이다.
            자사·외부창고는 보관 경비 한 표 / 가공공장은 공장 목록 + 가공비 단가 두 표. */}
        <nav className="flex flex-col gap-1">
          <KindRailItem
            label="전체"
            active={kindFilter === 'ALL'}
            count={shown}
            onClick={() => setKindFilter('ALL')}
          />
          <div className="my-1 border-t border-border" />
          {(['자사창고', '외부창고'] as const).map((k) => (
            <KindRailItem
              key={k}
              label={k}
              active={kindFilter === k}
              count={byKind[k].length}
              onClick={() => setKindFilter(k)}
            />
          ))}
          <div className="my-1 border-t border-border" />
          <KindRailItem
            label="가공공장"
            active={kindFilter === '가공공장'}
            count={byKind.가공공장.length}
            onClick={() => setKindFilter('가공공장')}
          />
        </nav>
      </aside>

      {/* 레일 ↔ 본문 구분선.
          `border-l`이라 본문 높이만큼 자동으로 늘어난다(레일은 sticky라 짧다).
          그라데이션·음영을 쓰지 않는 이유: DESIGN.md §1이 장식적 그라데이션을 금지하고,
          §2-6이 "레이어 구분은 --border로 한다"고 못 박았다.
          pl-8(32)로 선과 표 사이도 레일 쪽과 같은 간격을 준다. */}
      <div className="min-w-0 flex-1 border-l border-border pl-8">
      {/* 제목은 레일 상단으로 갔다. 건수도 레일의 '전체 N'과 중복이라 뺐다 —
          걸러진 건수는 각 덩어리 소제목('자사창고 4건')이 이미 보여준다. */}
      <div className={`mb-4 ${CONTENT_MAX}`}>
        {/* 검색 — 폭은 placeholder가 잘리지 않는 최소 (§6-3) */}
        <input
          type="text"
          placeholder="보관처명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-control w-32 rounded-control border border-border bg-surface px-3 text-body text-text outline-none placeholder:text-text-faint focus:border-transparent focus:ring-2 focus:ring-accent-fill"
        />
      </div>

      {isLoading ? (
        <div className={`overflow-hidden rounded-card border border-border bg-surface ${CONTENT_MAX}`}>
          <LoadingState cols={COST_COLS} rows={8} spacer />
        </div>
      ) : shown === 0 ? (
        <div className={`overflow-hidden rounded-card border border-border bg-surface ${CONTENT_MAX}`}>
          {isFiltered ? (
            <EmptyState
              title="조건에 맞는 보관처가 없습니다"
              hint="검색어를 지우거나 구분 필터를 전체로 바꿔보세요."
            />
          ) : (
            <EmptyState
              title="등록된 보관처가 없습니다"
              hint="첫 보관처를 등록하면 입고·이동에서 고를 수 있습니다."
              action={
                <Button variant="secondary" icon={PlusIcon} onClick={() => setEditing('new')}>
                  보관처 추가
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className={`space-y-8 ${CONTENT_MAX}`}>
          {visibleKinds.map((kind, i) =>
            kind === '가공공장' ? (
              <FactorySection
                key={kind}
                factories={factories}
                selected={selectedFactory}
                onSelect={(f) => setSelectedFactoryId(f.id)}
                onEdit={(f) => setEditing(f)}
                rates={factoryRates}
                productName={productName}
                onAddRate={() => setEditingRate('new')}
                onEditRate={(r) => setEditingRate(r)}
                addStorage={i === 0 ? addStorageButton : undefined}
              />
            ) : (
              <CostSection
                key={kind}
                kind={kind}
                storages={byKind[kind]}
                costs={costs}
                sortDir={sortDirs[kind]}
                onToggleSort={() => toggleSort(kind)}
                onEdit={(s) => setEditing(s)}
                action={i === 0 ? addStorageButton : undefined}
              />
            ),
          )}
        </div>
      )}

      </div>

      {editingRate && (
        <ProcessingRateEditModal
          workerId={workerId}
          rate={editingRate === 'new' ? null : editingRate}
          defaultFactoryId={selectedFactory?.id}
          factories={factories}
          fillets={filletOptions}
          onClose={() => setEditingRate(null)}
          onSaved={() => {
            setEditingRate(null);
            void loadData();
          }}
        />
      )}

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

/**
 * 덩어리 소제목 — 구분명(§3 `--t-section`) + 건수, 우측 끝에 그 덩어리의 액션.
 * 액션은 표 카드 **경계선 바로 위**에 놓여 "이 표에 추가한다"는 대상이 분명해진다.
 */
function SectionTitle({
  kind,
  count,
  action,
}: {
  kind: StorageKind;
  count: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-end justify-between gap-3">
      <h2 className="text-section text-text">
        {kind} <span className="text-label text-text-muted">{count}건</span>
      </h2>
      {action}
    </div>
  );
}

/**
 * 자사창고·외부창고 덩어리 — 보관처 + **오늘 적용 중인** 보관 경비를 한 줄에 붙인다.
 *
 * 그림에선 좌(보관처명)/우(경비)가 별개 상자였지만 한 표로 그린다.
 * 두 상자로 나누면 행 높이가 조금만 어긋나도 좌우가 밀려 **다른 보관처의 단가를 읽게 된다.**
 */
function CostSection({
  kind,
  storages,
  costs,
  sortDir,
  onToggleSort,
  onEdit,
  action,
}: {
  kind: StorageKind;
  storages: Storage[];
  costs: Record<string, StorageCost>;
  sortDir: SortDir;
  onToggleSort: () => void;
  onEdit: (s: Storage) => void;
  /** 소제목 우측 액션 — 첫 덩어리에만 '보관처 추가'가 온다. */
  action?: React.ReactNode;
}) {
  const state = sortState(true, sortDir);
  return (
    <section>
      <SectionTitle kind={kind} count={storages.length} action={action} />
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {storages.length === 0 ? (
          <EmptyState title={`${kind}가 없습니다`} hint="구분을 바꾸거나 검색어를 지워보세요." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed" style={{ minWidth: tableMinWidth(COST_COLS) }}>
              <TableColGroup cols={COST_COLS} spacer />
              <thead className="sticky top-0 bg-surface-alt">
                <tr className="text-left">
                  {/* aria-sort는 columnheader(th)에. 패딩은 버튼이 가져간다 (§7-8). */}
                  <th
                    aria-sort={ariaSort(state)}
                    className="whitespace-nowrap p-0 text-table-head text-text-muted"
                  >
                    <button
                      type="button"
                      onClick={onToggleSort}
                      className="group flex w-full cursor-pointer select-none items-center gap-1 px-4 py-2 text-left transition-colors hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-fill motion-reduce:transition-none"
                    >
                      보관처명
                      <SortIcon state={state} />
                    </button>
                  </th>
                  {COST_COLS.slice(1).map((c) =>
                    c.numeric ? (
                      <NumHead key={c.key} className="px-4 py-2 text-table-head text-text-muted">
                        {c.label}
                      </NumHead>
                    ) : (
                      <th
                        key={c.key}
                        className="whitespace-nowrap px-4 py-2 text-table-head text-text-muted"
                      >
                        {c.label}
                      </th>
                    ),
                  )}
                  <SpacerCell as="th" />
                </tr>
              </thead>
              <tbody>
                {storages.map((s) => {
                  const c = costs[s.name];
                  return (
                    <tr
                      key={s.id}
                      onClick={() => onEdit(s)}
                      className="cursor-pointer border-t border-border transition-colors hover:bg-surface-alt"
                    >
                      {/* py-2 + body(14×1.5=21) + border 1 = 38px 행 높이 (§7-7) */}
                      <td className="whitespace-nowrap px-4 py-2 text-body text-text">
                        {s.name || '—'}
                      </td>
                      <NumCell className="px-4 py-2 text-body text-text-muted" value={c?.inOutFee ?? null} unit="원" empty="—" />
                      <NumCell className="px-4 py-2 text-body text-text-muted" value={c?.freezeFeePan ?? null} unit="원" empty="—" />
                      <NumCell className="px-4 py-2 text-body text-text-muted" value={c?.freezeFeeBaitLarge ?? null} unit="원" empty="—" />
                      <NumCell className="px-4 py-2 text-body text-text-muted" value={c?.freezeFeeBaitSmall ?? null} unit="원" empty="—" />
                      <NumCell className="px-4 py-2 text-body text-text-muted" value={c?.unionFee ?? null} unit="원" empty="—" />
                      <NumCell className="px-4 py-2 text-body text-text-muted" value={c?.refrigerationFee ?? null} unit="원" empty="—" />
                      <td className="whitespace-nowrap px-4 py-2 text-body text-text-muted">
                        {c ? periodLabel(c.startDate, c.endDate) : '—'}
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
    </section>
  );
}

/**
 * 가공공장 덩어리 — 좌측 공장 목록, 우측은 **선택한 공장의** 가공비 단가표.
 *
 * 경비와 달리 클릭이 필요한 이유: 가공비는 공장 × **가공품**이라 공장당 여러 줄이다.
 * 나란히 펼치면 다른 공장 단가와 섞여 어느 공장 것인지 잃는다.
 */
function FactorySection({
  factories,
  selected,
  onSelect,
  onEdit,
  rates,
  productName,
  onAddRate,
  onEditRate,
  addStorage,
}: {
  factories: Storage[];
  selected: Storage | null;
  onSelect: (s: Storage) => void;
  onEdit: (s: Storage) => void;
  rates: ProcessingRate[];
  productName: (id: string) => string;
  onAddRate: () => void;
  onEditRate: (r: ProcessingRate) => void;
  /** 가공공장이 첫 덩어리로 보일 때만 '보관처 추가'가 여기로 온다. */
  addStorage?: React.ReactNode;
}) {
  return (
    <section>
      <SectionTitle kind="가공공장" count={factories.length} action={addStorage} />
      {factories.length === 0 ? (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <EmptyState title="가공공장이 없습니다" hint="구분을 바꾸거나 검색어를 지워보세요." />
        </div>
      ) : (
        <div className="flex gap-4">
          {/* 좌 — 공장 목록 */}
          <div className="w-64 shrink-0 overflow-hidden rounded-card border border-border bg-surface">
            {/* 우측 카드 헤더에는 버튼(h-control 32)이 있어 더 높다.
                양쪽 헤더를 h-12로 고정해야 두 카드의 구분선이 한 선에 맞는다. */}
            <div className="flex h-12 items-center border-b border-border bg-surface-alt px-4 text-label text-text-muted">
              공장명
            </div>
            <ul>
              {factories.map((f) => {
                const active = selected?.id === f.id;
                return (
                  <li key={f.id} className="border-t border-border first:border-t-0">
                    <button
                      type="button"
                      onClick={() => onSelect(f)}
                      onDoubleClick={() => onEdit(f)}
                      aria-pressed={active}
                      title="클릭해 단가 보기 · 더블클릭해 수정"
                      className={`flex w-full cursor-pointer items-center px-4 py-2 text-left text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-fill motion-reduce:transition-none ${
                        active ? 'bg-accent-bg text-accent-ink' : 'text-text hover:bg-surface-alt'
                      }`}
                    >
                      {f.name || '—'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 우 — 선택 공장의 가공비 단가 */}
          <div className="min-w-0 flex-1 overflow-hidden rounded-card border border-border bg-surface">
            {/* 단가 추가는 Secondary — 화면의 Primary는 우상단 '보관처 추가' 하나다 (§2-3) */}
            <div className="flex h-12 items-center justify-between gap-3 border-b border-border bg-surface-alt px-4">
              <span className="text-label text-text-muted">
                가공비 단가{selected ? ` · ${selected.name}` : ''}
              </span>
              <Button variant="secondary" icon={PlusIcon} onClick={onAddRate}>
                단가 추가
              </Button>
            </div>
            {rates.length === 0 ? (
              <EmptyState
                title={`${selected?.name ?? '이 공장'}에 등록된 가공비 단가가 없습니다`}
                hint="가공 거래에서 단가를 자동으로 불러오려면 먼저 등록해야 합니다."
                action={
                  <Button variant="secondary" icon={PlusIcon} onClick={onAddRate}>
                    단가 추가
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table
                  className="w-full table-fixed"
                  style={{ minWidth: tableMinWidth(RATE_COLS) }}
                >
                  <TableColGroup cols={RATE_COLS} spacer />
                  <thead className="bg-surface">
                    <tr className="text-left">
                      {RATE_COLS.map((c) =>
                        c.numeric ? (
                          <NumHead key={c.key} className="px-4 py-2 text-table-head text-text-muted">
                            {c.label}
                          </NumHead>
                        ) : (
                          <th
                            key={c.key}
                            className="whitespace-nowrap px-4 py-2 text-table-head text-text-muted"
                          >
                            {c.label}
                          </th>
                        ),
                      )}
                      <SpacerCell as="th" />
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => onEditRate(r)}
                        className="cursor-pointer border-t border-border transition-colors hover:bg-surface-alt"
                      >
                        <td className="whitespace-nowrap px-4 py-2 text-body text-text">
                          {productName(r.productId)}
                        </td>
                        <NumCell className="px-4 py-2 text-body text-text-muted" value={r.price} unit="원" empty="—" />
                        <td className="whitespace-nowrap px-4 py-2">
                          {r.basis ? (
                            <span className="inline-block rounded-pill bg-info-bg px-2 text-caption text-info-ink">
                              {rateBasisLabel(r.basis)}
                            </span>
                          ) : (
                            <span className="text-body text-text-muted">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-body text-text-muted">
                          {periodLabel(r.startDate, r.endDate)}
                        </td>
                        <td
                          className="truncate px-4 py-2 text-body text-text-muted"
                          title={r.memo || undefined}
                        >
                          {r.memo || '—'}
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
      )}
    </section>
  );
}

/**
 * 구분 필터 레일 항목 — 라벨 좌측, 건수 우측(tabular-nums로 자릿수가 세로로 맞는다).
 * 활성은 채움이 아니라 소프트 태그 — 채움 Primary는 화면당 1개여야 한다 (§2-3).
 */
function KindRailItem({
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
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-control w-full items-center justify-between gap-2 rounded-control px-3 text-label transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fill motion-reduce:transition-none ${
        active ? 'bg-accent-bg text-accent-ink' : 'text-text-muted hover:bg-surface-alt'
      }`}
    >
      <span className="truncate">{label}</span>
      <span className={`tabular-nums ${active ? 'text-accent-ink' : 'text-text-faint'}`}>
        {formatNum(count)}
      </span>
    </button>
  );
}
