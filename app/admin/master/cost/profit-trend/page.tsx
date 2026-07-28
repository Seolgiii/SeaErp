'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { formatNum } from '@/lib/number-format';
import { NumCell, NumHead } from '@/app/admin/_num-cell';
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

const won = (n: number) => formatNum(n, '원');
/** 마진율 — 분모가 0이면 계산 불가(null → 표시는 '—'). */
const pctValue = (g: number, base: number) => (base > 0 ? (g / base) * 100 : null);
/** 표 밖(KPI 카드·CSV)에서 쓰는 문자열 버전 — 표기는 표 셀과 동일. */
const pct = (g: number, base: number) =>
  formatNum(pctValue(g, base), { unit: '%', decimals: 1, empty: '—' });

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
  const [from, setFrom] = useState(() => `${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [activePreset, setActivePreset] = useState<Preset | null>('thisMonth');
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
  const breakdown: ProfitBreakdownRow[] = useMemo(
    () => (tab === 'product' ? data?.byProduct ?? [] : data?.byBuyer ?? []),
    [tab, data],
  );
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
    /* 분석 화면은 읽기 폭 제한(max-w) — 와이드 모니터에서 표가 비례로 벌어지는 것 방지. 재고 챕터는 full width 유지 */
    <div id="pt-print" className="mx-auto max-w-[1200px] p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#191F28]">손익 추이</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            매출총이익(출고시점 매칭 원가) + 현금흐름(매출 − 수매 − 지출)
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
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
              className="no-print inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
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
              sub={`출고 ${formatNum(totals.outboundCount, '건')} · ${formatNum(totals.outboundQty, '박스')}`}
            />
            <SummaryCard
              label="매출원가"
              value={won(totals.cogs)}
              sub="출고시점 매칭 원가"
            />
            <SummaryCard
              label="매출총이익"
              value={won(totals.grossProfit)}
              valueClass={totals.grossProfit >= 0 ? 'text-[#00C471]' : 'text-[#ef4444]'}
              sub={`마진율 ${pct(totals.grossProfit, totals.marginRevenue)}`}
            />
            <SummaryCard
              label="현금흐름"
              value={won(totals.cashFlow)}
              valueClass={totals.cashFlow >= 0 ? 'text-[#00C471]' : 'text-[#ef4444]'}
              sub={`수매 ${won(-totals.purchaseTotal)} · 지출 ${won(-totals.expenseTotal)}`}
            />
          </div>

          {totals.costMissingCount > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ 출고시점 원가가 기록되지 않은 출고 {totals.costMissingCount}건은 매출총이익·매출원가
              집계에서 제외되었습니다(매출에는 포함). 출고 승인 시점 비용 스냅샷 누락 가능성.
            </div>
          )}

          {/* 분해: 품목별 / 판매처별 */}
          <div className="print-section rounded-xl border border-gray-200 bg-white">
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
                  placeholder={tab === 'product' ? '품목명 검색' : '판매처명 검색'}
                  className="w-44 rounded-lg border border-gray-200 py-1 pl-[31px] pr-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] table-fixed text-[13px]">
                <colgroup>
                  {/* 숫자 컬럼은 px 고정, 남는 폭은 맨 끝(건) 컬럼이 흡수 — 화면이 넓어져도 컬럼이 벌어지지 않음 */}
                  <col style={{ width: 200 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 145 }} />
                  <col style={{ width: 80 }} />
                  <col style={{ width: 100 }} />
                  <col />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-[12px] font-bold text-gray-500">
                    <th className="px-4 py-3">{tab === 'product' ? '품목' : '판매처'}</th>
                    <NumHead className="px-4 py-3">매출</NumHead>
                    <NumHead className="px-4 py-3">매출원가</NumHead>
                    <NumHead className="px-4 py-3">매출총이익</NumHead>
                    <NumHead className="px-4 py-3">마진율</NumHead>
                    <NumHead className="px-4 py-3">수량</NumHead>
                    <NumHead className="px-4 py-3">건</NumHead>
                  </tr>
                </thead>
                <tbody>
                  {shownBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                        {breakdownSearch.trim() ? '검색 결과 없음' : '데이터 없음'}
                      </td>
                    </tr>
                  ) : (
                    shownBreakdown.map((r) => (
                      <tr key={r.name} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-bold text-gray-900">{r.name}</td>
                        <NumCell className="px-4 py-3 text-gray-700" value={r.revenue} unit="원" />
                        <NumCell className="px-4 py-3 text-gray-500" value={r.cogs} unit="원" />
                        <NumCell
                          className={`px-4 py-3 font-bold ${
                            r.grossProfit >= 0 ? 'text-[#00C471]' : 'text-[#ef4444]'
                          }`}
                          value={r.grossProfit}
                          unit="원"
                        />
                        <NumCell
                          className="px-4 py-3 text-gray-500"
                          value={pctValue(r.grossProfit, r.marginRevenue)}
                          unit="%"
                          decimals={1}
                          empty="—"
                        />
                        <NumCell className="px-4 py-3 text-gray-500" value={r.qty} unit="박스" />
                        <NumCell className="px-4 py-3 text-gray-400" value={r.count} unit="건" />
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 추이 표 */}
          <div className="print-section overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[960px] table-fixed text-[13px]">
              <colgroup>
                {/* 숫자 컬럼 px 고정 — 남는 폭은 막대(이익 추이) 컬럼이 흡수 */}
                <col style={{ width: 110 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 145 }} />
                <col style={{ width: 80 }} />
                <col />
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-[12px] font-bold text-gray-500">
                  <th className="px-4 py-3">기간</th>
                  <NumHead className="px-4 py-3">매출</NumHead>
                  <NumHead className="px-4 py-3">매출원가</NumHead>
                  <NumHead className="px-4 py-3">매출총이익</NumHead>
                  <NumHead className="px-4 py-3">마진율</NumHead>
                  <th className="px-4 py-3">이익 추이</th>
                  <NumHead className="px-4 py-3">현금흐름</NumHead>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => {
                  const positive = p.grossProfit >= 0;
                  const w = (Math.abs(p.grossProfit) / maxGross) * 100;
                  return (
                    <tr key={p.key} className="border-t border-gray-100">
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-gray-900">
                        {p.label}
                      </td>
                      <NumCell className="px-4 py-3 text-gray-700" value={p.revenue} unit="원" />
                      <NumCell className="px-4 py-3 text-gray-500" value={p.cogs} unit="원" />
                      <NumCell
                        className={`px-4 py-3 font-bold ${
                          positive ? 'text-[#00C471]' : 'text-[#ef4444]'
                        }`}
                        value={p.grossProfit}
                        unit="원"
                      />
                      <NumCell
                        className="px-4 py-3 text-gray-500"
                        value={pctValue(p.grossProfit, p.marginRevenue)}
                        unit="%"
                        decimals={1}
                        empty="—"
                      />
                      <td className="px-4 py-3">
                        <div className="h-2.5 w-full rounded-full bg-gray-100">
                          <div
                            className={`h-2.5 rounded-full ${
                              positive ? 'bg-[#00C471]' : 'bg-[#ef4444]'
                            }`}
                            style={{ width: `${w}%` }}
                          />
                        </div>
                      </td>
                      <NumCell
                        className={`px-4 py-3 ${
                          p.cashFlow >= 0 ? 'text-gray-700' : 'text-[#ef4444]'
                        }`}
                        value={p.cashFlow}
                        unit="원"
                      />
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-[#191F28]">
                  <td className="px-4 py-3">합계</td>
                  <NumCell className="px-4 py-3" value={totals.revenue} unit="원" />
                  <NumCell className="px-4 py-3" value={totals.cogs} unit="원" />
                  <NumCell
                    className={`px-4 py-3 ${
                      totals.grossProfit >= 0 ? 'text-[#00C471]' : 'text-[#ef4444]'
                    }`}
                    value={totals.grossProfit}
                    unit="원"
                  />
                  <NumCell
                    className="px-4 py-3"
                    value={pctValue(totals.grossProfit, totals.marginRevenue)}
                    unit="%"
                    decimals={1}
                    empty="—"
                  />
                  <td className="px-4 py-3" />
                  <NumCell
                    className={`px-4 py-3 ${totals.cashFlow >= 0 ? '' : 'text-[#ef4444]'}`}
                    value={totals.cashFlow}
                    unit="원"
                  />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 설명 — 화면 안내용, 인쇄 제외(no-print) */}
          <p className="no-print text-xs leading-relaxed text-gray-400">
            * 매출총이익 = 출고 판매금액 − 출고시점 판매원가(승인 시 스냅샷, 매칭 원가). 현금흐름 =
            매출 − 입고 수매가 − 지출(기간 현금 입출, 재고이동·기존재고 입고 제외). 두 값은 기간 매칭
            방식이 달라 의미가 다릅니다.
          </p>
        </>
      )}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          /* 인쇄 영역(이 화면)만 보이게 — 사이드바·탭바 등 앱 크롬 숨김 */
          body * { visibility: hidden; }
          #pt-print, #pt-print * { visibility: visible; }
          #pt-print {
            position: absolute; left: 0; top: 0; width: 100%;
            max-width: none; margin: 0; padding: 0;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          /* 화면용 버튼은 인쇄 제외 */
          .no-print { display: none !important; }
          /* 가로 스크롤 표가 잘리지 않도록 펼침 */
          #pt-print .overflow-x-auto { overflow: visible !important; }
          /* 섹션(분해 표·추이 표)을 독립된 장으로 — 각 섹션 새 페이지 시작.
             요약 카드는 헤더·조회기간과 함께 1페이지에 둠(print-section 미부착). */
          #pt-print .print-section { break-before: page; }
          /* 표: 페이지마다 헤더 반복 + 행이 경계에서 잘리지 않게 */
          #pt-print thead { display: table-header-group; }
          #pt-print tr { break-inside: avoid; }
        }
      `}</style>
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
