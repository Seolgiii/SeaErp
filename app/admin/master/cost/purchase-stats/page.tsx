'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { formatIntKo } from '@/lib/number-format';
import { formatSpec, formatMisu } from '@/lib/spec-display';
import {
  getPurchaseStats,
  type PurchaseStats,
  type PurchaseDayBucket,
  type PurchaseBreakdownRow,
} from '@/app/actions/admin/master-cost';

type Granularity = 'day' | 'week' | 'month';
type BreakdownTab = 'product' | 'supplier' | 'ship';

const seoulToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

/** YYYY-MM-DD를 deltaDays 만큼 이동(UTC 날짜 산술). */
function shiftDate(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

type Preset = 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear';
const PRESETS: { k: Preset; label: string }[] = [
  { k: 'last30', label: '최근 30일' },
  { k: 'thisMonth', label: '이번 달' },
  { k: 'lastMonth', label: '지난 달' },
  { k: 'thisYear', label: '올해' },
];

/** 프리셋 → {from, to} 범위 (적용·활성표시 공용). */
function presetRange(preset: Preset): { from: string; to: string } {
  const t = seoulToday();
  if (preset === 'last30') return { from: shiftDate(t, -29), to: t };
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
const share = (part: number, whole: number) =>
  whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—';
/** 박스당 평균 수매가. */
const avgUnit = (total: number, qty: number) => (qty > 0 ? won(total / qty) : '—');

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

// ── 사이즈별 단가 추이 차트 ──
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

/**
 * 매입 통계 — 원가·손익 챕터 2번 화면 (PC 관리, ADMIN/MASTER).
 * 승인 완료 입고만, 재고 이동·기존 재고 제외. 매입처별/품목별 매입액·물량 분해.
 */
export default function PurchaseStatsPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const today = seoulToday();
  const [from, setFrom] = useState(() => shiftDate(today, -29));
  const [to, setTo] = useState(today);
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [activePreset, setActivePreset] = useState<Preset | null>('last30');
  const [tab, setTab] = useState<BreakdownTab>('product');
  const [breakdownSearch, setBreakdownSearch] = useState('');
  const [data, setData] = useState<PurchaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // 추이 표 데이터 — 품목별 탭에선 검색된 품목만의 일별 버킷으로 좁힘 (검색 전엔 비움).
  const trendDays = useMemo<PurchaseDayBucket[]>(() => {
    if (!data) return [];
    if (tab !== 'product') return data.days;
    const q = breakdownSearch.trim().toLowerCase();
    if (!q) return [];
    const map = new Map<string, PurchaseDayBucket>();
    for (const pd of data.productDays) {
      if (!`${pd.name} ${pd.spec} ${pd.misu}`.toLowerCase().includes(q)) continue;
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
  }, [data, tab, breakdownSearch]);

  const periods = useMemo(() => bucketToPeriods(trendDays, granularity), [trendDays, granularity]);

  // 사이즈별(규격·미수) 가중평균 단가 추이 — 품목 검색 시에만, 묶음 단위 공유.
  const sizeTrend = useMemo<SizeTrend | null>(() => {
    if (!data || tab !== 'product') return null;
    const q = breakdownSearch.trim().toLowerCase();
    if (!q) return null;
    const matched = data.productDays.filter((pd) =>
      `${pd.name} ${pd.spec} ${pd.misu}`.toLowerCase().includes(q),
    );
    if (!matched.length) return null;

    const periodKeys: string[] = [];
    const periodLabels = new Map<string, string>();
    const cells = new Map<string, { total: number; qty: number }>();
    const variantAgg = new Map<string, { spec: string; misu: string; total: number }>();
    for (const pd of matched) {
      const { key, label } = periodKeyLabel(pd.date, granularity);
      if (!periodLabels.has(key)) {
        periodLabels.set(key, label);
        periodKeys.push(key);
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
    periodKeys.sort();

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
  }, [data, tab, breakdownSearch, granularity]);

  // 추이 표 합계 — 품목 스코프가 적용된 데이터 기준.
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
  const shownBreakdown = useMemo(() => {
    const breakdown: PurchaseBreakdownRow[] =
      tab === 'product'
        ? data?.byProduct ?? []
        : tab === 'supplier'
          ? data?.bySupplier ?? []
          : data?.byShip ?? [];
    const q = breakdownSearch.trim().toLowerCase();
    // 품목별은 검색-우선: 품목명을 입력해야 해당 품목의 규격·미수 분포가 표시됨.
    if (tab === 'product' && !q) return [];
    return q
      ? breakdown.filter((r) =>
          `${r.name} ${r.spec} ${r.misu}`.toLowerCase().includes(q),
        )
      : breakdown;
  }, [data, tab, breakdownSearch]);

  // 표시된 행 합계 — 분해 표 합계 행(검색 결과 반영).
  const shownTotals = useMemo(
    () =>
      shownBreakdown.reduce(
        (t, r) => {
          t.purchaseTotal += r.purchaseTotal;
          t.qty += r.qty;
          t.count += r.count;
          return t;
        },
        { purchaseTotal: 0, qty: 0, count: 0 },
      ),
    [shownBreakdown],
  );

  // 비중 분모 — 품목별은 검색된 품목 내 비중(규격·미수 분포), 그 외는 전체 매입액 대비.
  const shareBase =
    tab === 'product' ? shownTotals.purchaseTotal : data?.totals.purchaseTotal ?? 0;

  // ── 기간 프리셋 ──
  const applyPreset = (preset: Preset) => {
    const r = presetRange(preset);
    setFrom(r.from);
    setTo(r.to);
    setActivePreset(preset);
  };

  const exportCsv = () => {
    if (!periods.length) {
      toast('내보낼 데이터가 없습니다.', 'info');
      return;
    }
    const header = ['기간', '매입액', '수량(박스)', '평균단가(박스)', '건수'];
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `매입통계_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#191F28]">매입 통계</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            매입처별·품목별 매입액과 물량 (승인 완료 입고, 재고이동·기존재고 제외)
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          CSV
        </button>
      </div>

      {/* 컨트롤 — 좌: 조회 기간(얼마나) / 우: 묶음 단위(어떻게 묶을지) */}
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 rounded-xl border border-gray-200 bg-white p-4">
        {/* 조회 기간 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-500">조회 기간</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => {
                setFrom(e.target.value);
                setActivePreset(null);
              }}
              className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={to}
              min={from}
              max={seoulToday()}
              onChange={(e) => {
                setTo(e.target.value);
                setActivePreset(null);
              }}
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

        {/* 묶음 단위 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-500">묶음 단위</span>
          <div className="flex items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-gray-200">
              {[
                { k: 'day' as const, label: '일별' },
                { k: 'week' as const, label: '주별' },
                { k: 'month' as const, label: '월별' },
              ].map((g) => (
                <button
                  key={g.k}
                  onClick={() => setGranularity(g.k)}
                  className={`px-3 py-1.5 text-sm font-medium ${
                    granularity === g.k
                      ? 'bg-[#3182F6] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => void loadData()}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              title="새로고침"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="py-20 text-center text-sm text-gray-400">불러오는 중…</div>
      ) : !totals ? (
        <div className="py-20 text-center text-sm text-gray-400">데이터가 없습니다.</div>
      ) : (
        <>

          {totals.priceMissingCount > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ 수매가가 기록되지 않은 입고 {totals.priceMissingCount}건은 매입액 0원으로
              집계되었습니다(물량·건수에는 포함). 입고 기록의 수매가 입력 누락 가능성.
            </div>
          )}

          {/* 분해: 매입처별 / 품목별 */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 px-3 pt-2">
              {[
                { k: 'product' as const, label: '품목별' },
                { k: 'supplier' as const, label: '매입처별' },
                { k: 'ship' as const, label: '선박별' },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                    tab === t.k
                      ? 'border-[#3182F6] text-[#3182F6]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <div className="relative my-1.5 ml-auto">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={breakdownSearch}
                  onChange={(e) => setBreakdownSearch(e.target.value)}
                  placeholder={
                    tab === 'product'
                      ? '품목명 검색'
                      : tab === 'supplier'
                        ? '매입처명 검색'
                        : '선박명 검색'
                  }
                  className="w-44 rounded-lg border border-gray-200 py-1 pl-[31px] pr-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              {/* table-fixed — 검색 타이핑으로 행이 바뀌어도 컬럼 폭이 재계산되지 않게 고정 */}
              <table className="w-full table-fixed text-[13px]">
                <colgroup>
                  {/* 품목별: 이름 17% 고정(기존 잔여폭 25%의 2/3), 남는 폭은 맨 끝(건 뒤)으로 — 컬럼들이 왼쪽으로 당겨짐 */}
                  <col style={tab === 'product' ? { width: '17%' } : undefined} />
                  {tab === 'product' && (
                    <>
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                    </>
                  )}
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '9%' }} />
                  {tab === 'product' ? <col /> : <col style={{ width: '8%' }} />}
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-[12px] font-bold text-gray-500">
                    <th className="px-4 py-3">
                      {tab === 'product' ? '품목' : tab === 'supplier' ? '매입처' : '선박'}
                    </th>
                    {tab === 'product' && (
                      <>
                        <th className="px-4 py-3">규격</th>
                        <th className="px-4 py-3">미수</th>
                      </>
                    )}
                    <th className="px-4 py-3">매입액</th>
                    <th className="px-4 py-3">수량</th>
                    <th className="px-4 py-3">평균단가(박스)</th>
                    <th
                      className="px-4 py-3"
                      title={
                        tab === 'product'
                          ? '검색된 품목 매입액 내 비중 (규격·미수 분포)'
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
                        colSpan={tab === 'product' ? 8 : 6}
                        className="px-4 py-8 text-center text-sm text-gray-400"
                      >
                        {breakdownSearch.trim()
                          ? '검색 결과 없음'
                          : tab === 'product'
                            ? '품목명을 검색하면 해당 품목의 규격·미수별 매입 분포가 표시됩니다.'
                            : '데이터 없음'}
                      </td>
                    </tr>
                  ) : (
                    shownBreakdown.map((r) => (
                      <tr
                        key={`${r.name}|${r.spec}|${r.misu}`}
                        className="border-t border-gray-100"
                      >
                        <td className="px-4 py-3 font-bold text-gray-900">{r.name}</td>
                        {tab === 'product' && (
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
                      {tab === 'product' && (
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

          {/* 추이 표 — 품목별 탭에선 검색된 품목만의 추이 (검색 전 숨김) */}
          {periods.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full table-fixed text-[13px]">
              <colgroup>
                <col style={{ width: '12%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '16%' }} />
                <col />
                <col style={{ width: '9%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-[12px] font-bold text-gray-500">
                  <th className="px-4 py-3">기간</th>
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

          {/* 사이즈별 단가 추이 그래프 — 품목 검색 시에만 */}
          {sizeTrend && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
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

          {/* 설명 */}
          <p className="text-xs leading-relaxed text-gray-400">
            * 매입액 = 입고 수매가 × 입고수량(박스). 승인 완료 입고만 집계하며 재고 이동·기존 재고
            입고는 실제 매입이 아니라 제외합니다. 평균단가 = 매입액 ÷ 수량(가중 평균).
          </p>
        </>
      )}
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

