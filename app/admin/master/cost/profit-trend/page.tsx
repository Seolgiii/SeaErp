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
import {
  getProfitTrend,
  type ProfitTrend,
  type ProfitDayBucket,
  type ProfitBreakdownRow,
} from '@/app/actions/admin/master-cost';

type Granularity = 'day' | 'week' | 'month';
type BreakdownTab = 'product' | 'buyer';

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

const won = (n: number) => `₩${formatIntKo(Math.round(n))}`;
const signedWon = (n: number) =>
  n < 0 ? `-₩${formatIntKo(Math.abs(Math.round(n)))}` : `₩${formatIntKo(Math.round(n))}`;
const pct = (g: number, base: number) =>
  base > 0 ? `${((g / base) * 100).toFixed(1)}%` : '—';

/** 일별 버킷을 기간 단위(일/주/월)로 집계. */
type PeriodRow = {
  key: string;
  label: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginRevenue: number;
  outboundQty: number;
  outboundCount: number;
  costMissingCount: number;
  purchaseTotal: number;
  expenseTotal: number;
  cashFlow: number;
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

function bucketToPeriods(days: ProfitDayBucket[], g: Granularity): PeriodRow[] {
  const map = new Map<string, PeriodRow>();
  for (const d of days) {
    const { key, label } = periodKeyLabel(d.date, g);
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        label,
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        marginRevenue: 0,
        outboundQty: 0,
        outboundCount: 0,
        costMissingCount: 0,
        purchaseTotal: 0,
        expenseTotal: 0,
        cashFlow: 0,
      };
      map.set(key, row);
    }
    row.revenue += d.revenue;
    row.cogs += d.cogs;
    row.grossProfit += d.grossProfit;
    row.marginRevenue += d.marginRevenue;
    row.outboundQty += d.outboundQty;
    row.outboundCount += d.outboundCount;
    row.costMissingCount += d.costMissingCount;
    row.purchaseTotal += d.purchaseTotal;
    row.expenseTotal += d.expenseTotal;
  }
  const rows = [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  for (const r of rows) r.cashFlow = r.revenue - r.purchaseTotal - r.expenseTotal;
  return rows;
}

/**
 * 손익 추이 — 원가·손익 챕터 1번 화면 (PC 관리, ADMIN/MASTER).
 *
 * 두 층의 손익을 함께 노출:
 *  - 매출총이익(매칭 COGS): 출고시점 손익 스냅샷 집계 (진짜 마진)
 *  - 현금흐름: 매출 − 수매 − 지출 (daily-report 공식의 기간 확장)
 */
export default function ProfitTrendPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const today = seoulToday();
  const [from, setFrom] = useState(() => shiftDate(today, -29));
  const [to, setTo] = useState(today);
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [activePreset, setActivePreset] = useState<Preset | null>('last30');
  const [tab, setTab] = useState<BreakdownTab>('product');
  const [breakdownSearch, setBreakdownSearch] = useState('');
  const [data, setData] = useState<ProfitTrend | null>(null);
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
    const result = await getProfitTrend(workerId, from, to);
    if (result.success) setData(result.data);
    else toast(`조회 실패: ${result.error}`, 'error');
    setIsLoading(false);
  }, [workerId, from, to]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  const periods = useMemo(
    () => (data ? bucketToPeriods(data.days, granularity) : []),
    [data, granularity],
  );
  const maxGross = useMemo(
    () => Math.max(1, ...periods.map((p) => Math.abs(p.grossProfit))),
    [periods],
  );

  const totals = data?.totals;
  const breakdown: ProfitBreakdownRow[] =
    tab === 'product' ? data?.byProduct ?? [] : data?.byBuyer ?? [];
  const shownBreakdown = useMemo(() => {
    const q = breakdownSearch.trim().toLowerCase();
    return q ? breakdown.filter((r) => r.name.toLowerCase().includes(q)) : breakdown;
  }, [breakdown, breakdownSearch]);

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
    const header = ['기간', '매출', '매출원가', '매출총이익', '마진율', '수매', '지출', '현금흐름'];
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const p of periods) {
      lines.push(
        [
          p.label,
          Math.round(p.revenue),
          Math.round(p.cogs),
          Math.round(p.grossProfit),
          pct(p.grossProfit, p.marginRevenue),
          Math.round(p.purchaseTotal),
          Math.round(p.expenseTotal),
          Math.round(p.cashFlow),
        ]
          .map(esc)
          .join(','),
      );
    }
    if (totals) {
      lines.push(
        [
          '합계',
          Math.round(totals.revenue),
          Math.round(totals.cogs),
          Math.round(totals.grossProfit),
          pct(totals.grossProfit, totals.marginRevenue),
          Math.round(totals.purchaseTotal),
          Math.round(totals.expenseTotal),
          Math.round(totals.cashFlow),
        ]
          .map(esc)
          .join(','),
      );
    }
    const blob = new Blob(['﻿' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `손익추이_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#191F28]">손익 추이</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            매출총이익(출고시점 매칭 원가) + 현금흐름(매출 − 수매 − 지출)
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
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              label="매출"
              value={won(totals.revenue)}
              sub={`출고 ${formatIntKo(totals.outboundCount)}건 · ${formatIntKo(totals.outboundQty)}박스`}
            />
            <SummaryCard
              label="매출원가"
              value={won(totals.cogs)}
              sub="출고시점 매칭 원가"
            />
            <SummaryCard
              label="매출총이익"
              value={signedWon(totals.grossProfit)}
              valueClass={totals.grossProfit >= 0 ? 'text-[#00C471]' : 'text-[#ef4444]'}
              sub={`마진율 ${pct(totals.grossProfit, totals.marginRevenue)}`}
            />
            <SummaryCard
              label="현금흐름"
              value={signedWon(totals.cashFlow)}
              valueClass={totals.cashFlow >= 0 ? 'text-[#00C471]' : 'text-[#ef4444]'}
              sub={`수매 ${signedWon(-totals.purchaseTotal)} · 지출 ${signedWon(-totals.expenseTotal)}`}
            />
          </div>

          {totals.costMissingCount > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ 출고시점 원가가 기록되지 않은 출고 {totals.costMissingCount}건은 매출총이익·매출원가
              집계에서 제외되었습니다(매출에는 포함). 출고 승인 시점 비용 스냅샷 누락 가능성.
            </div>
          )}

          {/* 분해: 품목별 / 판매처별 */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 px-3 pt-2">
              {[
                { k: 'product' as const, label: '품목별' },
                { k: 'buyer' as const, label: '판매처별' },
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
                <MagnifyingGlassIcon className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={breakdownSearch}
                  onChange={(e) => setBreakdownSearch(e.target.value)}
                  placeholder={tab === 'product' ? '품목 검색' : '판매처 검색'}
                  className="w-44 rounded-lg border border-gray-300 py-1 pl-7 pr-2.5 text-sm"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="px-3 py-2 text-left font-medium">
                      {tab === 'product' ? '품목' : '판매처'}
                    </th>
                    <th className="px-3 py-2 text-right font-medium">매출</th>
                    <th className="px-3 py-2 text-right font-medium">매출원가</th>
                    <th className="px-3 py-2 text-right font-medium">매출총이익</th>
                    <th className="px-3 py-2 text-right font-medium">마진율</th>
                    <th className="px-3 py-2 text-right font-medium">수량</th>
                    <th className="px-3 py-2 text-right font-medium">건</th>
                  </tr>
                </thead>
                <tbody>
                  {shownBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">
                        {breakdownSearch.trim() ? '검색 결과 없음' : '데이터 없음'}
                      </td>
                    </tr>
                  ) : (
                    shownBreakdown.map((r) => (
                      <tr key={r.name} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2 text-gray-700">{r.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                          {won(r.revenue)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                          {won(r.cogs)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums font-medium ${
                            r.grossProfit >= 0 ? 'text-[#00C471]' : 'text-[#ef4444]'
                          }`}
                        >
                          {signedWon(r.grossProfit)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                          {pct(r.grossProfit, r.marginRevenue)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                          {formatIntKo(r.qty)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-400">
                          {formatIntKo(r.count)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 추이 표 */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left font-medium">기간</th>
                  <th className="px-3 py-2 text-right font-medium">매출</th>
                  <th className="px-3 py-2 text-right font-medium">매출원가</th>
                  <th className="px-3 py-2 text-right font-medium">매출총이익</th>
                  <th className="px-3 py-2 text-right font-medium">마진율</th>
                  <th className="px-3 py-2 text-left font-medium" style={{ width: 180 }}>
                    이익 추이
                  </th>
                  <th className="px-3 py-2 text-right font-medium">현금흐름</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => {
                  const positive = p.grossProfit >= 0;
                  const w = (Math.abs(p.grossProfit) / maxGross) * 100;
                  return (
                    <tr key={p.key} className="border-b border-gray-100 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-700">{p.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                        {won(p.revenue)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                        {won(p.cogs)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums font-medium ${
                          positive ? 'text-[#00C471]' : 'text-[#ef4444]'
                        }`}
                      >
                        {signedWon(p.grossProfit)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                        {pct(p.grossProfit, p.marginRevenue)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="h-2.5 w-full rounded-full bg-gray-100">
                          <div
                            className={`h-2.5 rounded-full ${
                              positive ? 'bg-[#00C471]' : 'bg-[#ef4444]'
                            }`}
                            style={{ width: `${w}%` }}
                          />
                        </div>
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          p.cashFlow >= 0 ? 'text-gray-700' : 'text-[#ef4444]'
                        }`}
                      >
                        {signedWon(p.cashFlow)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-[#191F28]">
                  <td className="px-3 py-2">합계</td>
                  <td className="px-3 py-2 text-right tabular-nums">{won(totals.revenue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{won(totals.cogs)}</td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      totals.grossProfit >= 0 ? 'text-[#00C471]' : 'text-[#ef4444]'
                    }`}
                  >
                    {signedWon(totals.grossProfit)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {pct(totals.grossProfit, totals.marginRevenue)}
                  </td>
                  <td className="px-3 py-2" />
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      totals.cashFlow >= 0 ? '' : 'text-[#ef4444]'
                    }`}
                  >
                    {signedWon(totals.cashFlow)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 설명 */}
          <p className="text-xs leading-relaxed text-gray-400">
            * 매출총이익 = 출고 판매금액 − 출고시점 판매원가(승인 시 스냅샷, 매칭 원가). 현금흐름 =
            매출 − 입고 수매가 − 지출(기간 현금 입출, 재고이동·기존재고 입고 제외). 두 값은 기간 매칭
            방식이 달라 의미가 다릅니다.
          </p>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  valueClass = 'text-[#191F28]',
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}
