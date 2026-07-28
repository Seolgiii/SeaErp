'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { formatNum } from '@/lib/number-format';
import { NumCell, NumHead } from '@/app/admin/_num-cell';
import { formatSpec, formatMisu } from '@/lib/spec-display';
import {
  getOutboundHistory,
  type OutboundHistory,
  type OutboundHistoryRow,
} from '@/app/actions/admin/master-transactions';

const seoulToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

type Preset = 'all' | 'thisMonth' | 'lastMonth' | 'thisYear';
const PRESETS: { k: Preset; label: string }[] = [
  { k: 'all', label: '전체' },
  { k: 'thisMonth', label: '이번 달' },
  { k: 'lastMonth', label: '지난 달' },
  { k: 'thisYear', label: '올해' },
];

/** '전체' 조회의 시작일 바닥값 — 운영 데이터 시작보다 충분히 이른 날짜. */
const ALL_FROM = '2020-01-01';

/** 프리셋 → {from, to} 범위. */
function presetRange(preset: Preset): { from: string; to: string } {
  const t = seoulToday();
  if (preset === 'all') return { from: ALL_FROM, to: t };
  if (preset === 'thisMonth') return { from: `${t.slice(0, 7)}-01`, to: t };
  if (preset === 'lastMonth') {
    const [y, m] = t.split('-').map(Number);
    const firstThis = new Date(Date.UTC(y, m - 1, 1));
    const lp = new Date(firstThis.getTime() - 86400000).toISOString().slice(0, 10);
    return { from: `${lp.slice(0, 7)}-01`, to: lp };
  }
  return { from: `${t.slice(0, 4)}-01-01`, to: t };
}

// 승인상태 필터 — 전체 + 베이스 표준 3종.
type StatusFilter = '전체' | '승인 완료' | '승인 대기' | '반려';
const STATUS_FILTERS: StatusFilter[] = ['전체', '승인 완료', '승인 대기', '반려'];

/** 승인상태 배지 색. */
function statusBadgeClass(status: string): string {
  if (status === '승인 완료') return 'bg-green-50 text-green-700';
  if (status === '반려') return 'bg-red-50 text-red-700';
  if (status.includes('대기')) return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-500';
}

/**
 * 출고 이력 — 거래 이력 챕터 2번 화면 (PC 관리, ADMIN/MASTER).
 * 개별 출고 건 원장 — 상태 무관 전체, 기간·상태·검색 필터 + CSV.
 */
export default function OutboundHistoryPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const today = seoulToday();
  const [from, setFrom] = useState(ALL_FROM);
  const [to, setTo] = useState(today);
  const [activePreset, setActivePreset] = useState<Preset | null>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('전체');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<OutboundHistory | null>(null);
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
    const result = await getOutboundHistory(workerId, from, to);
    if (result.success) setData(result.data);
    else toast(`조회 실패: ${result.error}`, 'error');
    setIsLoading(false);
  }, [workerId, from, to]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  // 상태 + 검색 필터 (화면 즉시 필터).
  const rows = useMemo<OutboundHistoryRow[]>(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.rows.filter((r) => {
      if (statusFilter !== '전체' && r.approvalStatus !== statusFilter) return false;
      if (!q) return true;
      return [r.lotNumber, r.product, r.seller, r.storage, r.worker]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [data, statusFilter, search]);

  const shown = useMemo(
    () =>
      rows.reduce(
        (t, r) => {
          t.qty += r.qty;
          t.saleTotal += r.saleTotal;
          return t;
        },
        { qty: 0, saleTotal: 0 },
      ),
    [rows],
  );

  const applyPreset = (preset: Preset) => {
    const r = presetRange(preset);
    setFrom(r.from);
    setTo(r.to);
    setActivePreset(preset);
  };

  const exportCsv = () => {
    if (!rows.length) {
      toast('내보낼 데이터가 없습니다.', 'info');
      return;
    }
    const header = [
      '출고일', 'LOT번호', '품목', '규격', '미수', '출고수량',
      '판매가', '판매금액', '판매처', '보관처', '작업자', '상태',
    ];
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.date, r.lotNumber, r.product, r.spec, r.misu, r.qty,
          Math.round(r.salePrice), Math.round(r.saleTotal), r.seller,
          r.storage, r.worker, r.approvalStatus,
        ]
          .map(esc)
          .join(','),
      );
    }
    lines.push(
      ['합계', '', '', '', '', shown.qty, '', Math.round(shown.saleTotal), '', '', '', '']
        .map(esc)
        .join(','),
    );
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `출고이력_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#191F28]">출고 이력</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            기간 내 모든 출고 건 (승인 완료·대기·반려 전체)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/master/transactions/outbound/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3182F6] px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600"
          >
            <PlusIcon className="h-4 w-4" />
            출고 등록
          </Link>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {/* 컨트롤 — 조회 기간 + 상태 필터 */}
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

        {/* 새로고침 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-500">&nbsp;</span>
          <button
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            title="새로고침"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="py-20 text-center text-sm text-gray-400">불러오는 중…</div>
      ) : !data ? (
        <div className="py-20 text-center text-sm text-gray-400">데이터가 없습니다.</div>
      ) : (
        <>
          {/* 상태 필터 칩 + 검색 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((s) => {
                const active = statusFilter === s;
                const count =
                  s === '전체' ? data.totals.count : data.totals.byStatus[s] ?? 0;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      active
                        ? 'border-[#3182F6] bg-blue-50 text-[#3182F6]'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {s} <span className="text-gray-400">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="LOT·품목·판매처·보관처·작업자 검색"
                className="w-64 rounded-lg border border-gray-200 py-1.5 pl-[31px] pr-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
              />
            </div>
          </div>

          {/* 원장 표 */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-[12px] font-bold text-gray-500">
                  <th className="whitespace-nowrap px-4 py-3">출고일</th>
                  <th className="whitespace-nowrap px-4 py-3">LOT번호</th>
                  <th className="px-4 py-3">품목</th>
                  <th className="whitespace-nowrap px-4 py-3">규격</th>
                  <th className="whitespace-nowrap px-4 py-3">미수</th>
                  <NumHead className="px-4 py-3">출고수량</NumHead>
                  <NumHead className="px-4 py-3">판매가</NumHead>
                  <NumHead className="px-4 py-3">판매금액</NumHead>
                  <th className="px-4 py-3">판매처</th>
                  <th className="px-4 py-3">보관처</th>
                  <th className="whitespace-nowrap px-4 py-3">작업자</th>
                  <th className="whitespace-nowrap px-4 py-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-sm text-gray-400">
                      조건에 맞는 출고 건이 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">{r.date}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {r.lotNumber ? (
                          <button
                            onClick={() =>
                              router.push(
                                `/admin/master/lot-timeline?lot=${encodeURIComponent(r.lotNumber)}`,
                              )
                            }
                            title="클릭해 LOT 생애주기·원가 보기"
                            className="text-[#3182F6] hover:underline"
                          >
                            {r.lotNumber}
                          </button>
                        ) : (
                          <span className="text-[#191F28]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#191F28]">{r.product}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatSpec(r.spec)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatMisu(r.misu)}</td>
                      <NumCell className="px-4 py-3 text-gray-700" value={r.qty} unit="박스" />
                      <NumCell
                        className="px-4 py-3 text-gray-700"
                        value={r.salePrice > 0 ? r.salePrice : null}
                        unit="원"
                        empty="—"
                      />
                      <NumCell
                        className="px-4 py-3 text-[#191F28]"
                        value={r.saleTotal > 0 ? r.saleTotal : null}
                        unit="원"
                        empty="—"
                      />
                      <td className="px-4 py-3 text-gray-700">{r.seller || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{r.storage || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{r.worker || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${statusBadgeClass(r.approvalStatus)}`}>
                          {r.approvalStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-[#191F28]">
                    <td className="px-4 py-3" colSpan={5}>
                      합계 {formatNum(rows.length, '건')}
                    </td>
                    <NumCell className="px-4 py-3" value={shown.qty} unit="박스" />
                    <td className="px-4 py-3" />
                    <NumCell className="px-4 py-3" value={shown.saleTotal} unit="원" />
                    <td className="px-4 py-3" colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}
