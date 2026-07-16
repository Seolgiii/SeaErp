'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { formatIntKo } from '@/lib/number-format';
import { formatSpec, formatMisu, parseSpecKg } from '@/lib/spec-display';
import { useSyncQueryParams } from '@/lib/use-sync-query-params';
import {
  getPurchaseStats,
  type PurchaseStats,
  type PurchaseDayBucket,
  type PurchaseProductDay,
} from '@/app/actions/admin/master-cost';

type Granularity = 'day' | 'week' | 'month';
type BreakdownTab = 'product' | 'supplier' | 'ship';
type DonutBasis = 'amount' | 'weight';

const TABS: { k: BreakdownTab; label: string; noun: string; unit: string }[] = [
  { k: 'product', label: '품목별', noun: '품목', unit: '종' },
  { k: 'supplier', label: '매입처별', noun: '매입처', unit: '곳' },
  { k: 'ship', label: '선박별', noun: '선박', unit: '척' },
];

const seoulToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

/** 두 날짜 차이 (b − a, 일 단위). */
function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/**
 * 묶음 단위 자동 결정 — 기간 길이에 맞는 단위를 화면이 고른다 (수동 토글 제거).
 * ≤31일 일별 / ≤120일 주별 / 그 외 월별. 퇴화 조합(지난 달+월별=1행, 올해+일별=150행) 방지.
 */
function autoGranularity(from: string, to: string): Granularity {
  const days = diffDays(from, to) + 1;
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

const GRAN_LABEL: Record<Granularity, string> = { day: '일별', week: '주별', month: '월별' };

type Preset = 'thisMonth' | 'lastMonth' | 'thisYear';
const PRESETS: { k: Preset; label: string }[] = [
  { k: 'thisMonth', label: '이번 달' },
  { k: 'lastMonth', label: '지난 달' },
  { k: 'thisYear', label: '올해' },
];

/** 프리셋 → {from, to} 범위 (적용·활성표시 공용). */
function presetRange(preset: Preset): { from: string; to: string } {
  const t = seoulToday();
  if (preset === 'thisMonth') return { from: `${t.slice(0, 7)}-01`, to: t };
  if (preset === 'lastMonth') {
    const [y, m] = t.split('-').map(Number);
    const firstThis = new Date(Date.UTC(y, m - 1, 1));
    const lp = new Date(firstThis.getTime() - 86400000).toISOString().slice(0, 10);
    return { from: `${lp.slice(0, 7)}-01`, to: lp };
  }
  return { from: `${t.slice(0, 4)}-01-01`, to: t };
}

const won = (n: number) => `${formatIntKo(Math.round(n))}원`;
const kg = (n: number) => `${formatIntKo(Math.round(n))}kg`;
const share = (part: number, whole: number) =>
  whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—';
/** 박스당 평균 수매가. */
const avgUnit = (total: number, qty: number) => (qty > 0 ? won(total / qty) : '—');

/** 검색 스코프 매칭 — 품목별: 품목명+규격+미수 / 매입처별: 매입처명 / 선박별: 선박명. */
const matchesScope = (pd: PurchaseProductDay, tab: BreakdownTab, q: string) =>
  tab === 'ship'
    ? pd.ship.toLowerCase().includes(q)
    : tab === 'supplier'
      ? pd.supplier.toLowerCase().includes(q)
      : `${pd.name} ${pd.spec} ${pd.misu}`.toLowerCase().includes(q);

/** 탭 차원의 개체명 (랭킹 그룹키·매칭 칩 공용). */
const entityName = (pd: PurchaseProductDay, tab: BreakdownTab) =>
  tab === 'ship' ? pd.ship : tab === 'supplier' ? pd.supplier : pd.name;

/** 분해 표 행 — 랭킹(개체별) / 상세(품목·규격·미수별) 공용. */
type BreakdownRow = {
  name: string;
  spec: string; // 상세 모드에서만 채움
  misu: string;
  purchaseTotal: number;
  qty: number;
  weightKg: number; // 규격(kg) × 박스 합 — 규격을 kg로 해석 못하는 건은 제외
  count: number;
};

function aggregateRows(
  pds: PurchaseProductDay[],
  keyOf: (pd: PurchaseProductDay) => string,
  nameOf: (pd: PurchaseProductDay) => string,
  withSpec: boolean,
): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const pd of pds) {
    const key = keyOf(pd);
    let row = map.get(key);
    if (!row) {
      row = {
        name: nameOf(pd),
        spec: withSpec ? pd.spec : '',
        misu: withSpec ? pd.misu : '',
        purchaseTotal: 0,
        qty: 0,
        weightKg: 0,
        count: 0,
      };
      map.set(key, row);
    }
    row.purchaseTotal += pd.purchaseTotal;
    row.qty += pd.qty;
    const specKg = parseSpecKg(pd.spec);
    if (specKg != null) row.weightKg += specKg * pd.qty;
    row.count += pd.count;
  }
  return [...map.values()].sort((a, b) => b.purchaseTotal - a.purchaseTotal);
}

/** 일별 버킷을 기간 단위(일/주/월)로 집계. */
type PeriodRow = {
  key: string;
  label: string;
  purchaseTotal: number;
  qty: number;
  count: number;
};

function periodKeyLabel(date: string, g: Granularity): { key: string; label: string } {
  if (g === 'month') return { key: date.slice(0, 7), label: date.slice(0, 7) };
  if (g === 'week') {
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const dow = (dt.getUTCDay() + 6) % 7; // 월요일=0
    dt.setUTCDate(dt.getUTCDate() - dow);
    const ws = dt.toISOString().slice(0, 10);
    return { key: ws, label: `${ws.slice(5)}~` };
  }
  return { key: date, label: date.slice(5) }; // MM-DD
}

function bucketToPeriods(days: PurchaseDayBucket[], g: Granularity): PeriodRow[] {
  const map = new Map<string, PeriodRow>();
  for (const d of days) {
    const { key, label } = periodKeyLabel(d.date, g);
    let row = map.get(key);
    if (!row) {
      row = { key, label, purchaseTotal: 0, qty: 0, count: 0 };
      map.set(key, row);
    }
    row.purchaseTotal += d.purchaseTotal;
    row.qty += d.qty;
    row.count += d.count;
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * 조회 기간(from~to)에 걸친 모든 달을 오름차순으로 나열 — 매입 없는 달도 축에 남긴다.
 * 라벨: 같은 해면 `N월`, 여러 해에 걸치면 첫 달·매년 1월에만 연도를 붙여 어느 해인지 명확히.
 * (사이즈별 단가 추이 차트에서 축을 품목과 무관하게 고정 + 계절 공백을 눈에 보이게)
 */
function enumerateMonths(from: string, to: string): { key: string; label: string }[] {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  const multiYear = fy !== ty;
  const out: { key: string; label: string }[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const showYear = multiYear && (m === 1 || (y === fy && m === fm));
    out.push({ key, label: showYear ? `${y} ${m}월` : `${m}월` });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

// ── 사이즈별 단가 추이 차트 (품목 탭) ──
const CHART_COLORS = ['#3182F6', '#00C471', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

type SizeTrendVariant = {
  key: string;
  label: string; // "11kg·52/54미"
  color: string;
  points: (number | null)[]; // 기간별 가중평균 단가 (해당 기간 매입 없으면 null)
};

type SizeTrend = {
  labels: string[]; // 기간 라벨
  variants: SizeTrendVariant[];
  min: number;
  max: number;
  droppedCount: number; // 매입액 상위 6개 초과로 제외된 사이즈 수
};

// ── 구성 도넛 (매입처·선박 탭) — 색이 부족해 "기타"가 비대해지지 않게 도넛만 10색 ──
const DONUT_COLORS = [...CHART_COLORS, '#0ea5e9', '#f472b6', '#84cc16', '#f97316'];

type ShareSlice = {
  label: string; // "참조기·11kg·52/54미"
  value: number; // 매입액(원) 또는 총중량(kg)
  share: number; // 0~1
  color: string;
};

/**
 * 매입 통계 — 원가·손익 챕터 2번 화면 (PC 관리, ADMIN/MASTER).
 * 승인 완료 입고만, 재고 이동·기존 재고 제외.
 *
 * 구조: 탭(품목/매입처/선박)으로 차원을 고르면 개체 랭킹이 먼저 보이고,
 * 행 클릭(또는 검색)으로 그 개체의 품목·규격·미수 분포 + 구성 차트 + 추이로 들어간다.
 * "이 배는 뭘 얼마나 잡나 / 이 매입처는 뭘 파나 / 이 품목은 얼마에 사오나"가 한 동선.
 */
export default function PurchaseStatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = seoulToday();
  const [workerId, setWorkerId] = useState<string | null>(null);

  // URL 쿼리 복원 (북마크·새로고침·drill-down 링크 대응)
  const isYmd = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const [from, setFrom] = useState(() => {
    const p = searchParams.get('from');
    return isYmd(p) ? p : `${today.slice(0, 7)}-01`;
  });
  const [to, setTo] = useState(() => {
    const p = searchParams.get('to');
    return isYmd(p) ? p : today;
  });
  const [tab, setTab] = useState<BreakdownTab>(() => {
    const p = searchParams.get('tab');
    return p === 'supplier' || p === 'ship' ? p : 'product';
  });
  const [breakdownSearch, setBreakdownSearch] = useState(() => searchParams.get('q') ?? '');
  const [donutBasis, setDonutBasis] = useState<DonutBasis>('amount');
  const [data, setData] = useState<PurchaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useSyncQueryParams({
    tab: tab === 'product' ? null : tab, // 기본 탭은 URL 생략
    q: breakdownSearch,
    from,
    to,
  });

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
    const result = await getPurchaseStats(workerId, from, to);
    if (result.success) setData(result.data);
    else toast(`조회 실패: ${result.error}`, 'error');
    setIsLoading(false);
  }, [workerId, from, to]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  const tabMeta = TABS.find((t) => t.k === tab) ?? TABS[0];
  const granularity = autoGranularity(from, to);
  const q = breakdownSearch.trim().toLowerCase();
  // 상세 모드: 검색어가 있으면 그 개체(들)의 품목·규격·미수 분포 / 랭킹 모드: 개체별 일람
  const isDetail = q.length > 0;

  // 검색 스코프에 매칭된 최소 단위 버킷 (상세 모드 전용)
  const matchedPds = useMemo<PurchaseProductDay[]>(
    () => (data && isDetail ? data.productDays.filter((pd) => matchesScope(pd, tab, q)) : []),
    [data, isDetail, tab, q],
  );

  // 상세 모드에서 실제 매칭된 개체명 — 부분일치로 여러 개체가 합산될 수 있어 명시 (매입액 순)
  const matchedNames = useMemo<string[]>(() => {
    if (!isDetail) return [];
    const totals = new Map<string, number>();
    for (const pd of matchedPds) {
      const name = entityName(pd, tab);
      totals.set(name, (totals.get(name) ?? 0) + pd.purchaseTotal);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [isDetail, tab, matchedPds]);

  // 검색 스코프의 수매가 미기록 건수 — 구성·비중이 실제보다 낮게 보일 수 있음을 경고
  const scopedPriceMissing = useMemo(
    () => matchedPds.reduce((s, pd) => s + pd.priceMissingCount, 0),
    [matchedPds],
  );

  // 추이 표 데이터 — 상세 모드: 검색 스코프만 / 랭킹 모드: 기간 전체
  const trendDays = useMemo<PurchaseDayBucket[]>(() => {
    if (!data) return [];
    if (!isDetail) return data.days;
    const map = new Map<string, PurchaseDayBucket>();
    for (const pd of matchedPds) {
      let b = map.get(pd.date);
      if (!b) {
        b = { date: pd.date, purchaseTotal: 0, qty: 0, count: 0 };
        map.set(pd.date, b);
      }
      b.purchaseTotal += pd.purchaseTotal;
      b.qty += pd.qty;
      b.count += pd.count;
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [data, isDetail, matchedPds]);

  const periods = useMemo(() => bucketToPeriods(trendDays, granularity), [trendDays, granularity]);

  // 사이즈별(규격·미수) 가중평균 단가 추이 — 품목 검색 시에만.
  // (매입처·선박은 품목이 섞여 단가 추이 시리즈 의미가 약함 → 구성 도넛으로 대체)
  const sizeTrend = useMemo<SizeTrend | null>(() => {
    if (tab !== 'product' || !isDetail || !matchedPds.length) return null;

    const dataPeriodKeys: string[] = [];
    const periodLabels = new Map<string, string>();
    const cells = new Map<string, { total: number; qty: number }>();
    const variantAgg = new Map<string, { spec: string; misu: string; total: number }>();
    for (const pd of matchedPds) {
      const { key, label } = periodKeyLabel(pd.date, granularity);
      if (!periodLabels.has(key)) {
        periodLabels.set(key, label);
        dataPeriodKeys.push(key);
      }
      const vKey = `${pd.spec}|${pd.misu}`;
      let v = variantAgg.get(vKey);
      if (!v) {
        v = { spec: pd.spec, misu: pd.misu, total: 0 };
        variantAgg.set(vKey, v);
      }
      v.total += pd.purchaseTotal;
      const cKey = `${key}|${vKey}`;
      let c = cells.get(cKey);
      if (!c) {
        c = { total: 0, qty: 0 };
        cells.set(cKey, c);
      }
      c.total += pd.purchaseTotal;
      c.qty += pd.qty;
    }
    // 월 단위: 조회 기간 내 모든 달을 축에 깔아 빈 달도 간격으로 남긴다(품목 간 축 고정 + 계절 공백 노출).
    // 그 외(일·주): 기존대로 데이터가 있는 기간만.
    let periodKeys: string[];
    if (granularity === 'month') {
      const axis = enumerateMonths(from, to);
      periodKeys = axis.map((a) => a.key);
      for (const a of axis) periodLabels.set(a.key, a.label); // 연속 축 라벨(N월/연도 규칙)로 덮어씀
    } else {
      dataPeriodKeys.sort();
      periodKeys = dataPeriodKeys;
    }

    const sorted = [...variantAgg.entries()].sort((a, b) => b[1].total - a[1].total);
    const top = sorted.slice(0, CHART_COLORS.length);
    let min = Infinity;
    let max = -Infinity;
    const variants = top.map(([vKey, v], i) => {
      const points = periodKeys.map((pKey) => {
        const c = cells.get(`${pKey}|${vKey}`);
        if (!c || c.qty <= 0 || c.total <= 0) return null;
        const price = c.total / c.qty;
        if (price < min) min = price;
        if (price > max) max = price;
        return price;
      });
      return {
        key: vKey,
        label: `${formatSpec(v.spec)}·${formatMisu(v.misu)}`,
        color: CHART_COLORS[i],
        points,
      };
    });
    if (!Number.isFinite(min)) return null; // 단가 기록이 전혀 없음(수매가 미기록만)
    return {
      labels: periodKeys.map((k) => periodLabels.get(k) ?? k),
      variants,
      min,
      max,
      droppedCount: Math.max(0, sorted.length - CHART_COLORS.length),
    };
  }, [tab, isDetail, matchedPds, granularity, from, to]);

  // 추이 표 합계 — 현재 스코프 기준.
  const trendTotals = useMemo(
    () =>
      trendDays.reduce(
        (t, d) => {
          t.purchaseTotal += d.purchaseTotal;
          t.qty += d.qty;
          t.count += d.count;
          return t;
        },
        { purchaseTotal: 0, qty: 0, count: 0 },
      ),
    [trendDays],
  );
  const maxTotal = useMemo(
    () => Math.max(1, ...periods.map((p) => p.purchaseTotal)),
    [periods],
  );

  const totals = data?.totals;

  // 분해 표 — 랭킹 모드: 탭 개체별 일람(클릭→상세) / 상세 모드: 품목·규격·미수 분포
  const shownBreakdown = useMemo<BreakdownRow[]>(() => {
    if (!data) return [];
    if (!isDetail) {
      return aggregateRows(
        data.productDays,
        (pd) => entityName(pd, tab),
        (pd) => entityName(pd, tab),
        false,
      );
    }
    return aggregateRows(
      matchedPds,
      (pd) => `${pd.name}|${pd.spec}|${pd.misu}`,
      (pd) => pd.name,
      true,
    );
  }, [data, isDetail, tab, matchedPds]);

  // 표시된 행 합계 — 분해 표 합계 행.
  const shownTotals = useMemo(
    () =>
      shownBreakdown.reduce(
        (t, r) => {
          t.purchaseTotal += r.purchaseTotal;
          t.qty += r.qty;
          t.weightKg += r.weightKg;
          t.count += r.count;
          return t;
        },
        { purchaseTotal: 0, qty: 0, weightKg: 0, count: 0 },
      ),
    [shownBreakdown],
  );

  // 비중 분모 — 랭킹 모드는 전체 매입액(=표시 행 합), 상세 모드는 검색 스코프 합.
  const shareBase = shownTotals.purchaseTotal;

  // 매입처·선박 상세 — 구성 도넛 데이터 (매입액/중량 토글, 상위 10개 + 기타).
  const sizeShare = useMemo<{
    total: number;
    slices: ShareSlice[];
    excluded: number;
  } | null>(() => {
    if (!isDetail || tab === 'product' || !shownBreakdown.length) return null;
    const valueOf = (r: BreakdownRow) => (donutBasis === 'amount' ? r.purchaseTotal : r.weightKg);
    const rows = shownBreakdown
      .filter((r) => valueOf(r) > 0)
      .sort((a, b) => valueOf(b) - valueOf(a));
    const excluded = shownBreakdown.length - rows.length;
    const total = rows.reduce((s, r) => s + valueOf(r), 0);
    if (total <= 0) return null;
    const top = rows.slice(0, DONUT_COLORS.length);
    const rest = rows.slice(DONUT_COLORS.length);
    const slices: ShareSlice[] = top.map((r, i) => ({
      label: [r.name, formatSpec(r.spec), formatMisu(r.misu)]
        .filter((s) => s && s !== '-')
        .join('·'),
      value: valueOf(r),
      share: valueOf(r) / total,
      color: DONUT_COLORS[i],
    }));
    const restSum = rest.reduce((s, r) => s + valueOf(r), 0);
    if (restSum > 0)
      slices.push({
        label: `기타 ${rest.length}개`,
        value: restSum,
        share: restSum / total,
        color: '#d1d5db',
      });
    return { total, slices, excluded };
  }, [isDetail, tab, shownBreakdown, donutBasis]);

  // ── 기간 프리셋 — 활성 표시는 현재 from/to가 프리셋 범위와 일치하는지로 판정 ──
  const activePreset = useMemo<Preset | null>(() => {
    for (const p of PRESETS) {
      const r = presetRange(p.k);
      if (r.from === from && r.to === to) return p.k;
    }
    return null;
  }, [from, to]);

  const applyPreset = (preset: Preset) => {
    const r = presetRange(preset);
    setFrom(r.from);
    setTo(r.to);
  };

  // CSV — 화면에 보이는 분포 표 + 추이 표를 그대로 내보냄.
  const exportCsv = () => {
    if (!shownBreakdown.length && !periods.length) {
      toast('내보낼 데이터가 없습니다.', 'info');
      return;
    }
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines: string[] = [];

    // ── 분포 표 섹션 ──
    const scopeLabel = isDetail
      ? `${tabMeta.label} · 검색 "${breakdownSearch.trim()}"`
      : tabMeta.label;
    lines.push(esc(`분포 (${scopeLabel}, ${from}~${to})`));
    const head1 = isDetail
      ? ['품목', '규격', '미수', '매입액', '수량(박스)', '총중량(kg)', '평균단가(박스)', '비중', '건']
      : [tabMeta.noun, '매입액', '수량(박스)', '총중량(kg)', '평균단가(박스)', '비중', '건'];
    lines.push(head1.map(esc).join(','));
    for (const r of shownBreakdown) {
      const cols: (string | number)[] = [r.name];
      if (isDetail) cols.push(formatSpec(r.spec), formatMisu(r.misu));
      cols.push(
        Math.round(r.purchaseTotal),
        r.qty,
        r.weightKg > 0 ? Math.round(r.weightKg) : '',
        r.qty > 0 ? Math.round(r.purchaseTotal / r.qty) : '',
        share(r.purchaseTotal, shareBase),
        r.count,
      );
      lines.push(cols.map(esc).join(','));
    }
    {
      const cols: (string | number)[] = ['합계'];
      if (isDetail) cols.push('', '');
      cols.push(
        Math.round(shownTotals.purchaseTotal),
        shownTotals.qty,
        shownTotals.weightKg > 0 ? Math.round(shownTotals.weightKg) : '',
        shownTotals.qty > 0
          ? Math.round(shownTotals.purchaseTotal / shownTotals.qty)
          : '',
        share(shownTotals.purchaseTotal, shareBase),
        shownTotals.count,
      );
      lines.push(cols.map(esc).join(','));
    }

    // ── 추이 섹션 ──
    lines.push('');
    lines.push(esc(`추이 (${GRAN_LABEL[granularity]} 묶음)`));
    lines.push(['기간', '매입액', '수량(박스)', '평균단가(박스)', '건수'].map(esc).join(','));
    for (const p of periods) {
      lines.push(
        [
          p.label,
          Math.round(p.purchaseTotal),
          p.qty,
          p.qty > 0 ? Math.round(p.purchaseTotal / p.qty) : '',
          p.count,
        ]
          .map(esc)
          .join(','),
      );
    }
    lines.push(
      [
        '합계',
        Math.round(trendTotals.purchaseTotal),
        trendTotals.qty,
        trendTotals.qty > 0
          ? Math.round(trendTotals.purchaseTotal / trendTotals.qty)
          : '',
        trendTotals.count,
      ]
        .map(esc)
        .join(','),
    );

    const blob = new Blob(['﻿' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const safeQ = breakdownSearch.trim().replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 30);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `매입통계_${tabMeta.label}${safeQ ? `_${safeQ}` : ''}_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    /* 분석 화면은 읽기 폭 제한(max-w) — 와이드 모니터에서 표가 비례로 벌어지는 것 방지. 재고 챕터는 full width 유지
       id=ps-print: 인쇄 시 이 영역만 보이게(사이드바·탭바 숨김) — 하단 @media print 참고 */
    <div id="ps-print" className="mx-auto max-w-[1200px] p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#191F28]">매입 통계</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            품목·매입처·선박별 매입액과 물량 (승인 완료 입고, 재고이동·기존재고 제외)
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          <button
            onClick={() => void loadData()}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-600 hover:bg-gray-50"
            title="새로고침"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="A4 가로로 인쇄 (화면 그대로)"
          >
            <PrinterIcon className="h-4 w-4" />
            인쇄
          </button>
        </div>
      </div>

      {/* 조회 기간 — 묶음 단위는 기간 길이에 따라 자동 (추이 표 헤더에 표기) */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-500">조회 기간</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={to}
              min={from}
              max={seoulToday()}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
            />
            <span className="mx-1 h-5 w-px bg-gray-200" />
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => {
                const active = activePreset === p.k;
                return (
                  <button
                    key={p.k}
                    onClick={() => applyPreset(p.k)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                      active
                        ? 'border-[#3182F6] bg-blue-50 text-[#3182F6]'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="py-20 text-center text-sm text-gray-400">불러오는 중…</div>
      ) : !totals ? (
        <div className="py-20 text-center text-sm text-gray-400">데이터가 없습니다.</div>
      ) : (
        <div
          className={`space-y-5 transition-opacity ${isLoading ? 'opacity-60' : ''}`}
        >
          {/* 수매가 미기록 경고 — 랭킹 모드는 기간 전체, 상세 모드는 검색 스코프 기준 */}
          {!isDetail && totals.priceMissingCount > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ 수매가가 기록되지 않은 입고 {totals.priceMissingCount}건은 매입액 0원으로
              집계되었습니다(물량·건수에는 포함). 입고 기록의 수매가 입력 누락 가능성.
            </div>
          )}
          {isDetail && scopedPriceMissing > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ 검색 결과에 수매가 미기록 입고 {scopedPriceMissing}건 — 매입액·비중이 실제보다
              낮게 보일 수 있습니다.
            </div>
          )}

          {/* 분해 카드 — 랭킹(개체 일람, 행 클릭→상세) ↔ 상세(품목·규격·미수 분포) */}
          <div className="print-section rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 px-3 pt-2">
              {TABS.map((t) => (
                <button
                  key={t.k}
                  onClick={() => {
                    // 탭 전환 시 검색어 초기화 — 탭마다 검색 대상(품목명/매입처명/선박명)이 달라 이전 검색어가 무의미
                    if (tab !== t.k) setBreakdownSearch('');
                    setTab(t.k);
                  }}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                    tab === t.k
                      ? 'border-[#3182F6] text-[#3182F6]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 no-print'
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <div className="no-print relative my-1.5 ml-auto">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={breakdownSearch}
                  onChange={(e) => setBreakdownSearch(e.target.value)}
                  placeholder={`${tabMeta.noun}명 검색`}
                  className="w-44 rounded-lg border border-gray-200 py-1 pl-[31px] pr-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
                />
              </div>
            </div>

            {/* 랭킹 모드 안내 — 행 클릭이 상세 진입점임을 알림 */}
            {!isDetail && shownBreakdown.length > 0 && (
              <div className="border-b border-gray-100 px-4 py-2 text-xs text-gray-400">
                행을 클릭하면 해당 {tabMeta.noun}의{' '}
                {tab === 'product' ? '규격·미수' : '품목·규격·미수'} 분포를 분석합니다.
              </div>
            )}

            {/* 매칭 칩 — 부분일치로 여러 개체가 합산될 수 있어 분석 대상을 명시 */}
            {isDetail && matchedNames.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 px-4 py-2 text-xs">
                <span className="text-gray-400">
                  분석 대상 {tabMeta.noun} {matchedNames.length}
                  {tabMeta.unit}
                  {matchedNames.length > 1 && ' (합산)'}:
                </span>
                {matchedNames.map((n) => (
                  <button
                    key={n}
                    onClick={() => setBreakdownSearch(n)}
                    className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-[#3182F6] hover:bg-blue-100"
                    title="이 이름으로 좁히기"
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              {/* table-fixed — 검색 타이핑으로 행이 바뀌어도 컬럼 폭이 재계산되지 않게 고정 */}
              <table className="w-full min-w-[960px] table-fixed text-[13px]">
                <colgroup>
                  {/* 숫자 컬럼은 px 고정, 남는 폭은 맨 끝(건) 컬럼이 흡수 — 화면이 넓어져도 컬럼이 벌어지지 않음 */}
                  {isDetail ? (
                    <>
                      <col style={{ width: 170 }} />
                      <col style={{ width: 80 }} />
                      <col style={{ width: 84 }} />
                      <col style={{ width: 135 }} />
                      <col style={{ width: 95 }} />
                      <col style={{ width: 100 }} />
                      <col style={{ width: 125 }} />
                      <col style={{ width: 78 }} />
                      <col />
                    </>
                  ) : (
                    <>
                      <col style={{ width: 220 }} />
                      <col style={{ width: 140 }} />
                      <col style={{ width: 100 }} />
                      <col style={{ width: 105 }} />
                      <col style={{ width: 130 }} />
                      <col style={{ width: 80 }} />
                      <col />
                    </>
                  )}
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-[12px] font-bold text-gray-500">
                    {/* 상세 모드 행은 어느 탭이든 품목(규격·미수) 분포 */}
                    <th className="px-4 py-3">{isDetail ? '품목' : tabMeta.noun}</th>
                    {isDetail && (
                      <>
                        <th className="px-4 py-3">규격</th>
                        <th className="px-4 py-3">미수</th>
                      </>
                    )}
                    <th className="px-4 py-3">매입액</th>
                    <th className="px-4 py-3">수량</th>
                    <th className="px-4 py-3" title="규격(kg) × 박스 수 — 규격 미상 건 제외">
                      총중량
                    </th>
                    <th className="px-4 py-3">평균단가(박스)</th>
                    <th
                      className="px-4 py-3"
                      title={
                        isDetail
                          ? `검색된 ${tabMeta.noun} 매입액 내 비중`
                          : '기간 전체 매입액 대비 비중'
                      }
                    >
                      비중
                    </th>
                    <th className="px-4 py-3">건</th>
                  </tr>
                </thead>
                <tbody>
                  {shownBreakdown.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isDetail ? 9 : 7}
                        className="px-4 py-8 text-center text-sm text-gray-400"
                      >
                        {isDetail ? '검색 결과 없음' : '데이터 없음'}
                      </td>
                    </tr>
                  ) : (
                    shownBreakdown.map((r) => (
                      <tr
                        key={`${r.name}|${r.spec}|${r.misu}`}
                        onClick={isDetail ? undefined : () => setBreakdownSearch(r.name)}
                        title={isDetail ? undefined : `${r.name} 상세 분포 보기`}
                        className={`border-t border-gray-100 ${
                          isDetail ? '' : 'cursor-pointer hover:bg-blue-50/40'
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-gray-900">{r.name}</td>
                        {isDetail && (
                          <>
                            <td className="px-4 py-3 text-gray-500">{formatSpec(r.spec)}</td>
                            <td className="px-4 py-3 text-gray-500">{formatMisu(r.misu)}</td>
                          </>
                        )}
                        <td className="px-4 py-3 tabular-nums font-bold text-gray-700">
                          {won(r.purchaseTotal)}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-gray-500">
                          {formatIntKo(r.qty)}박스
                        </td>
                        <td className="px-4 py-3 tabular-nums text-gray-500">
                          {r.weightKg > 0 ? kg(r.weightKg) : '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-gray-500">
                          {avgUnit(r.purchaseTotal, r.qty)}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-gray-500">
                          {share(r.purchaseTotal, shareBase)}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-gray-400">
                          {formatIntKo(r.count)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {shownBreakdown.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-[#191F28]">
                      <td className="px-4 py-3">합계</td>
                      {isDetail && (
                        <>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3" />
                        </>
                      )}
                      <td className="px-4 py-3 tabular-nums">{won(shownTotals.purchaseTotal)}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatIntKo(shownTotals.qty)}박스
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {shownTotals.weightKg > 0 ? kg(shownTotals.weightKg) : '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {avgUnit(shownTotals.purchaseTotal, shownTotals.qty)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {share(shownTotals.purchaseTotal, shareBase)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatIntKo(shownTotals.count)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* 사이즈별 단가 추이 — 품목 검색 시에만 */}
          {sizeTrend && (
            <div className="print-section rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-bold text-[#191F28]">사이즈별 단가 추이</h2>
                <span className="text-xs text-gray-400">
                  규격·미수별 기간 가중평균 수매가 (박스당)
                  {sizeTrend.droppedCount > 0 &&
                    ` · 매입액 상위 ${CHART_COLORS.length}개 표시, ${sizeTrend.droppedCount}개 제외`}
                </span>
              </div>
              <SizePriceChart trend={sizeTrend} />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {sizeTrend.variants.map((v) => (
                  <span key={v.key} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: v.color }}
                    />
                    {v.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 구성 도넛 — 매입처/선박 검색 시: 그 개체의 품목·규격·미수 구성비 */}
          {sizeShare && (
            <div className="print-section rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="text-sm font-bold text-[#191F28]">
                    {tab === 'ship' ? '어획 구성' : '매입 구성'}
                  </h2>
                  <span className="text-xs text-gray-400">
                    검색된 {tabMeta.noun}의 품목·규격·미수 구성비 ·{' '}
                    {donutBasis === 'amount' ? '매입액' : '총중량'} 기준
                    {sizeShare.excluded > 0 &&
                      ` · ${
                        donutBasis === 'amount' ? '수매가 미기록' : '규격 미상'
                      } ${sizeShare.excluded}개 항목 제외`}
                  </span>
                </div>
                <div className="inline-flex overflow-hidden rounded-lg border border-gray-200">
                  {(
                    [
                      { k: 'amount', label: '매입액' },
                      { k: 'weight', label: '중량' },
                    ] as const
                  ).map((b) => (
                    <button
                      key={b.k}
                      onClick={() => setDonutBasis(b.k)}
                      className={`px-2.5 py-1 text-xs font-medium ${
                        donutBasis === b.k
                          ? 'bg-[#3182F6] text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
              <SizeShareDonut
                total={sizeShare.total}
                slices={sizeShare.slices}
                centerLabel={donutBasis === 'amount' ? '매입액' : '총중량'}
                fmt={donutBasis === 'amount' ? won : kg}
              />
            </div>
          )}

          {/* 추이 표 — 랭킹 모드: 기간 전체 / 상세 모드: 검색 스코프 */}
          {periods.length > 0 && (
          <div className="print-section overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[860px] table-fixed text-[13px]">
              <colgroup>
                {/* 숫자 컬럼 px 고정 — 남는 폭은 막대(매입 추이) 컬럼이 흡수 */}
                <col style={{ width: 110 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 105 }} />
                <col style={{ width: 130 }} />
                <col />
                <col style={{ width: 64 }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-[12px] font-bold text-gray-500">
                  <th className="whitespace-nowrap px-4 py-3">
                    기간{' '}
                    <span className="font-normal text-gray-400">
                      ({GRAN_LABEL[granularity]})
                    </span>
                  </th>
                  <th className="px-4 py-3">매입액</th>
                  <th className="px-4 py-3">수량</th>
                  <th className="px-4 py-3">평균단가(박스)</th>
                  <th className="py-3 pl-0 pr-[46px]">매입 추이</th>
                  <th className="px-4 py-3">건</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => {
                  const w = (p.purchaseTotal / maxTotal) * 100;
                  return (
                    <tr key={p.key} className="border-t border-gray-100">
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-gray-900">
                        {p.label}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-bold text-gray-700">
                        {won(p.purchaseTotal)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-gray-500">
                        {formatIntKo(p.qty)}박스
                      </td>
                      <td className="px-4 py-3 tabular-nums text-gray-500">
                        {avgUnit(p.purchaseTotal, p.qty)}
                      </td>
                      <td className="py-3 pl-0 pr-[46px]">
                        {/* 트랙 폭 2/3 — 막대가 셀을 꽉 채우지 않게 */}
                        <div className="h-2.5 w-2/3 rounded-full bg-gray-100">
                          <div
                            className="h-2.5 rounded-full bg-[#3182F6]"
                            style={{ width: `${w}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-gray-400">
                        {formatIntKo(p.count)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-[#191F28]">
                  <td className="px-4 py-3">합계</td>
                  <td className="px-4 py-3 tabular-nums">{won(trendTotals.purchaseTotal)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatIntKo(trendTotals.qty)}박스</td>
                  <td className="px-4 py-3 tabular-nums">
                    {avgUnit(trendTotals.purchaseTotal, trendTotals.qty)}
                  </td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 tabular-nums">{formatIntKo(trendTotals.count)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          )}

          {/* 설명 — 화면 안내용, 인쇄 제외(no-print) */}
          <p className="no-print text-xs leading-relaxed text-gray-400">
            * 매입액 = 입고 수매가 × 입고수량(박스). 승인 완료 입고만 집계하며 재고 이동·기존 재고
            입고는 실제 매입이 아니라 제외합니다. 평균단가 = 매입액 ÷ 수량(가중 평균). 총중량 =
            규격(kg) × 박스 수 — 규격을 kg로 해석할 수 없는 입고는 총중량에서 제외됩니다.
          </p>
        </div>
      )}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          /* 인쇄 영역(이 화면)만 보이게 — 사이드바·탭바 등 앱 크롬 숨김 */
          body * { visibility: hidden; }
          #ps-print, #ps-print * { visibility: visible; }
          #ps-print {
            position: absolute; left: 0; top: 0; width: 100%;
            max-width: none; margin: 0; padding: 0;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          /* 화면용 버튼은 인쇄 제외 */
          .no-print { display: none !important; }
          /* 가로 스크롤 표가 잘리지 않도록 펼침 */
          #ps-print .overflow-x-auto { overflow: visible !important; }
          /* 섹션을 독립된 장으로 — 각 섹션이 새 페이지에서 시작(서로 섞이지 않게).
             첫 섹션은 헤더·조회기간과 같은 페이지(인접 형제만 break-before). */
          #ps-print .print-section + .print-section { break-before: page; }
          /* 표: 페이지마다 헤더 반복 + 행이 경계에서 잘리지 않게 */
          #ps-print thead { display: table-header-group; }
          #ps-print tr { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

/** 구성 도넛 차트 — 차트 라이브러리 없이 SVG (최소 수정 원칙). */
function SizeShareDonut({
  total,
  slices,
  centerLabel,
  fmt,
}: {
  total: number;
  slices: ShareSlice[];
  centerLabel: string;
  fmt: (n: number) => string;
}) {
  const SZ = 200;
  const C = SZ / 2;
  const R = 92; // 외경
  const r = 58; // 내경
  const polar = (deg: number, radius: number): [number, number] => {
    const a = ((deg - 90) * Math.PI) / 180; // 12시 방향 시작, 시계 방향
    return [C + radius * Math.cos(a), C + radius * Math.sin(a)];
  };
  const arcPath = (start: number, sweep: number) => {
    // 단일 슬라이스 100%는 시작·끝점이 겹쳐 호가 소실 → 359.99°로 클램프
    const end = start + Math.min(sweep, 359.99);
    const large = end - start > 180 ? 1 : 0;
    const [x0, y0] = polar(start, R);
    const [x1, y1] = polar(end, R);
    const [x2, y2] = polar(end, r);
    const [x3, y3] = polar(start, r);
    return [
      `M${x0.toFixed(2)},${y0.toFixed(2)}`,
      `A${R},${R} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`,
      `L${x2.toFixed(2)},${y2.toFixed(2)}`,
      `A${r},${r} 0 ${large} 0 ${x3.toFixed(2)},${y3.toFixed(2)}`,
      'Z',
    ].join(' ');
  };

  let acc = 0;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-4">
      <svg
        viewBox={`0 0 ${SZ} ${SZ}`}
        className="h-44 w-44 shrink-0"
        role="img"
        aria-label="구성 비율"
      >
        {slices.map((s, i) => {
          const start = acc * 360;
          acc += s.share;
          return (
            <path key={i} d={arcPath(start, s.share * 360)} fill={s.color}>
              <title>{`${s.label} — ${fmt(s.value)} (${(s.share * 100).toFixed(1)}%)`}</title>
            </path>
          );
        })}
        <text x={C} y={C - 6} textAnchor="middle" fontSize={11} fill="#9ca3af">
          {centerLabel}
        </text>
        <text x={C} y={C + 12} textAnchor="middle" fontSize={13} fontWeight={700} fill="#191F28">
          {fmt(total)}
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {slices.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-[13px]">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="truncate font-medium text-gray-700">{s.label}</span>
            <span className="ml-auto shrink-0 tabular-nums font-bold text-gray-900">
              {(s.share * 100).toFixed(1)}%
            </span>
            <span className="w-28 shrink-0 text-right tabular-nums text-gray-400">
              {fmt(s.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 사이즈별 단가 추이 라인 차트 — 차트 라이브러리 없이 SVG (최소 수정 원칙). */
function SizePriceChart({ trend }: { trend: SizeTrend }) {
  const W = 800;
  const H = 240;
  const PL = 70; // y축 라벨 폭
  const PR = 16;
  const PT = 12;
  const PB = 26; // x축 라벨 높이
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;
  const n = trend.labels.length;

  // y 범위 — 위아래 10% 여유 (단일 값이면 ±10%)
  const span = trend.max - trend.min || trend.max * 0.2 || 1000;
  const yMin = Math.max(0, trend.min - span * 0.1);
  const yMax = trend.max + span * 0.1;
  const x = (i: number) => (n <= 1 ? PL + innerW / 2 : PL + (i / (n - 1)) * innerW);
  const y = (p: number) => PT + (1 - (p - yMin) / (yMax - yMin)) * innerH;

  // x축 라벨은 최대 8개만 (기간이 많을 때 겹침 방지)
  const labelStep = Math.max(1, Math.ceil(n / 8));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="사이즈별 단가 추이">
      {/* y축 그리드 + 라벨 */}
      {[0, 1, 2, 3].map((t) => {
        const value = yMax - (t / 3) * (yMax - yMin);
        const gy = y(value);
        return (
          <g key={t}>
            <line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="#f3f4f6" strokeWidth={1} />
            <text x={PL - 8} y={gy + 3.5} textAnchor="end" fontSize={11} fill="#9ca3af">
              {formatIntKo(Math.round(value))}원
            </text>
          </g>
        );
      })}
      {/* x축 라벨 */}
      {trend.labels.map((label, i) =>
        i % labelStep === 0 ? (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize={11}
            fill="#9ca3af"
          >
            {label}
          </text>
        ) : null,
      )}
      {/* 시리즈 — null(해당 기간 매입 없음) 구간은 선을 끊음 */}
      {trend.variants.map((v) => {
        const segments: string[] = [];
        let d = '';
        v.points.forEach((p, i) => {
          if (p == null) {
            if (d) segments.push(d);
            d = '';
            return;
          }
          d += `${d ? 'L' : 'M'}${x(i).toFixed(1)},${y(p).toFixed(1)} `;
        });
        if (d) segments.push(d);
        return (
          <g key={v.key}>
            {segments.map((seg, si) => (
              <path key={si} d={seg} fill="none" stroke={v.color} strokeWidth={2} />
            ))}
            {v.points.map((p, i) =>
              p == null ? null : (
                <circle key={i} cx={x(i)} cy={y(p)} r={3} fill={v.color}>
                  <title>{`${v.label} · ${trend.labels[i]} — ${formatIntKo(Math.round(p))}원/박스`}</title>
                </circle>
              ),
            )}
          </g>
        );
      })}
    </svg>
  );
}
