'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { logError } from '@/lib/logger';
import { useSyncQueryParams } from '@/lib/use-sync-query-params';
import {
  getMyRequests,
  updateApprovalStatus,
  updateApprovalStatusBulk,
} from '@/app/actions';
import type { RequestItem } from '@/app/actions/my-requests';
import {
  PENDING_STATUSES,
  STATUS_STYLE,
  TYPE_BADGE,
  formatSubmittedAt,
} from '@/app/components/approval-card-shared';
import RejectBottomSheet from '@/app/components/RejectBottomSheet';
import { useConfirm } from '@/app/components/ConfirmBottomSheet';
import { formatNum } from '@/lib/number-format';
import { NumCell, NumHead } from '@/app/admin/_num-cell';

/**
 * PC 결재 수신함 — 표 일람 + 다중선택 일괄 처리.
 *
 * 모바일(/admin/dashboard)과 백엔드(updateApprovalStatus/Bulk, getMyRequests)는 100%
 * 공유. UI만 PC 답게: 표/체크박스/sticky 액션바/되돌리기 인라인 버튼.
 *
 * 동작 정책은 모바일과 동일:
 * - 일괄 대상: INBOUND/OUTBOUND/TRANSFER + 대기 상태만 (EXPENSE는 100만원 권한 분기로 제외)
 * - EXPENSE 100만원 분기: <100만원 즉시 승인, ≥100만원 ADMIN → 최종 승인 대기, MASTER → 선택
 * - 완료 항목 클릭 시 양방향 토글 (승인 ↔ 반려)
 * - 멱등 가드는 서버에서 처리 (출고시점 판매원가 > 0 차단)
 */

type TabKey = 'pending' | 'done';
type TypeFilter = 'ALL' | 'INBOUND' | 'OUTBOUND' | 'TRANSFER' | 'EXPENSE';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: '대기' },
  { key: 'done', label: '완료' },
];

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'INBOUND', label: '입고' },
  { key: 'OUTBOUND', label: '출고' },
  { key: 'TRANSFER', label: '이동' },
  // 2026-07-31: 비용 관리를 회계 프로그램으로 이관하기로 해 진입 경로만 숨김(처리 로직은 유지 —
  //   '전체' 탭에서는 계속 섞여 나오고 승인·반려도 그대로 동작한다).
  // { key: 'EXPENSE', label: '지출' },
];

export default function ApprovalInboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();

  const tabParam = searchParams.get('tab');
  const initialTab: TabKey = tabParam === 'done' ? 'done' : 'pending';
  const typeParam = searchParams.get('type');
  const initialType: TypeFilter =
    typeParam === 'INBOUND' || typeParam === 'OUTBOUND' || typeParam === 'TRANSFER' || typeParam === 'EXPENSE'
      ? typeParam
      : 'ALL';

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialType);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uiOverrides, setUiOverrides] = useState<
    Record<string, 'PROCESSING' | 'COMPLETED' | 'REJECTED'>
  >({});
  const processingIds = useRef<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<RequestItem | null>(null);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);

  type BulkResult = {
    results: { recordId: string; lotNumber: string; success: boolean; message?: string }[];
    successCount: number;
    failCount: number;
  };
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  useSyncQueryParams(
    {
      tab: tab === 'pending' ? '' : tab,
      type: typeFilter === 'ALL' ? '' : typeFilter,
    },
    0,
  );

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace('/login');
      return;
    }
    setRole(session.role);
  }, [router]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const data = await getMyRequests();
    setItems(data);
    setUiOverrides({});
    processingIds.current.clear();
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // 탭 전환 시 선택 초기화
  useEffect(() => {
    setSelectedIds(new Set());
  }, [tab, typeFilter]);

  const isItemPending = useCallback(
    (it: RequestItem) => {
      const ui = uiOverrides[it.id];
      if (ui === 'COMPLETED' || ui === 'REJECTED') return false;
      return PENDING_STATUSES.includes(it.status);
    },
    [uiOverrides],
  );

  const isBulkEligible = (it: RequestItem): boolean =>
    PENDING_STATUSES.includes(it.status) &&
    (it.type === 'INBOUND' || it.type === 'OUTBOUND' || it.type === 'TRANSFER');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const ui = uiOverrides[it.id];
      // 처리 결과(완료/반려) 직후 항목은 현재 탭에 잠시 유지(시각 피드백)
      if (ui === 'COMPLETED' || ui === 'REJECTED') {
        if (tab === 'done') return false;
      } else {
        const pending = isItemPending(it);
        if (tab === 'pending' && !pending) return false;
        if (tab === 'done' && pending) return false;
      }
      if (typeFilter !== 'ALL' && it.type !== typeFilter) return false;
      if (q) {
        const hay = `${it.title} ${it.lotNumber ?? ''} ${it.requester}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, uiOverrides, isItemPending, tab, typeFilter, search]);

  const counts = useMemo(() => {
    const c = {
      pending: 0,
      done: 0,
      byType: { INBOUND: 0, OUTBOUND: 0, TRANSFER: 0, EXPENSE: 0 } as Record<string, number>,
    };
    for (const it of items) {
      const ui = uiOverrides[it.id];
      const pending =
        ui === 'COMPLETED' || ui === 'REJECTED'
          ? false
          : PENDING_STATUSES.includes(it.status);
      if (pending) c.pending++;
      else c.done++;
      if (pending && it.type in c.byType) c.byType[it.type]++;
    }
    return c;
  }, [items, uiOverrides]);

  const selectableInFiltered = useMemo(
    () => filtered.filter(isBulkEligible).filter((it) => !uiOverrides[it.id]),
    [filtered, uiOverrides],
  );

  const allSelected =
    selectableInFiltered.length > 0 &&
    selectableInFiltered.every((it) => selectedIds.has(it.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const it of selectableInFiltered) next.delete(it.id);
      } else {
        for (const it of selectableInFiltered) next.add(it.id);
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApprove = async (item: RequestItem, opts?: { skipConfirm?: boolean }) => {
    if (processingIds.current.has(item.id)) return;
    const session = readSession();
    if (!session?.workerId) {
      toast('로그인 정보를 확인해주세요.');
      return;
    }
    if (!opts?.skipConfirm) {
      const ok = await confirm({
        title: '해당 건을 승인할까요?',
        confirmLabel: '승인',
        accent: 'blue',
      });
      if (!ok) return;
    }

    processingIds.current.add(item.id);
    setUiOverrides((prev) => ({ ...prev, [item.id]: 'PROCESSING' }));

    let nextStatus: string;
    if (
      item.type === 'EXPENSE' &&
      (item.status === '승인 대기' || item.status === '반려')
    ) {
      const amount = Number(item.raw['금액'] ?? 0);
      if (amount < 1_000_000) {
        nextStatus = '승인 완료';
      } else if (role === 'MASTER') {
        const skip = await confirm({
          title: '중간 승인을 생략할까요?',
          message: '100만원 이상 건은 기본적으로 최종 승인 대기로 넘어갑니다.',
          confirmLabel: '생략',
          cancelLabel: '최종 승인 대기로',
          accent: 'blue',
        });
        nextStatus = skip ? '승인 완료' : '최종 승인 대기';
      } else {
        nextStatus = '최종 승인 대기';
      }
    } else {
      nextStatus = '승인 완료';
    }

    try {
      const result = await updateApprovalStatus(
        session.workerId,
        item.id,
        item.type,
        nextStatus,
      );
      if (result.success) {
        if (nextStatus === '최종 승인 대기') {
          void loadData();
        } else {
          setUiOverrides((prev) => ({ ...prev, [item.id]: 'COMPLETED' }));
          setTimeout(() => void loadData(), 1200);
        }
      } else {
        toast(result.message ?? '처리 중 오류가 발생했습니다.');
        void loadData();
      }
    } catch (err) {
      logError('[handleApprove] uncaught error', err);
      toast('승인 처리 중 오류가 발생했습니다.');
      void loadData();
    } finally {
      processingIds.current.delete(item.id);
    }
  };

  const handleRejectSubmit = async (reasonCode: string, reasonNote: string) => {
    if (!rejectTarget) return;
    const session = readSession();
    if (!session?.workerId) {
      toast('로그인 정보를 확인해주세요.');
      return;
    }
    setUiOverrides((prev) => ({ ...prev, [rejectTarget.id]: 'PROCESSING' }));
    const composed = reasonNote ? `${reasonCode} — ${reasonNote}` : reasonCode;
    const result = await updateApprovalStatus(
      session.workerId,
      rejectTarget.id,
      rejectTarget.type,
      '반려',
      composed,
      reasonCode,
    );
    if (result.success) {
      setUiOverrides((prev) => ({ ...prev, [rejectTarget.id]: 'REJECTED' }));
      setTimeout(() => void loadData(), 1200);
    } else {
      toast(result.message ?? '처리 중 오류가 발생했습니다.');
      void loadData();
    }
    setRejectTarget(null);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const session = readSession();
    if (!session?.workerId) {
      toast('로그인 정보를 확인해주세요.');
      return;
    }
    const targets = items.filter((i) => selectedIds.has(i.id) && isBulkEligible(i));
    if (targets.length === 0) return;
    const ok = await confirm({
      title: `${targets.length}건을 일괄 승인할까요?`,
      message: '각 건은 순차 처리되며 일부 실패해도 성공한 건은 그대로 적용됩니다.',
      confirmLabel: `${targets.length}건 승인`,
      accent: 'blue',
    });
    if (!ok) return;

    setIsBulkProcessing(true);
    const payload = targets.map((it) => ({
      recordId: it.id,
      type: it.type as 'INBOUND' | 'OUTBOUND' | 'TRANSFER',
    }));
    try {
      const res = await updateApprovalStatusBulk(session.workerId, payload);
      const successIds = new Set(res.results.filter((r) => r.success).map((r) => r.recordId));
      setUiOverrides((prev) => {
        const next = { ...prev };
        for (const id of successIds) next[id] = 'COMPLETED';
        return next;
      });
      setBulkResult({
        results: res.results.map((r) => {
          const it = targets.find((t) => t.id === r.recordId);
          return {
            recordId: r.recordId,
            lotNumber: it?.lotNumber || it?.title || '—',
            success: r.success,
            message: r.message,
          };
        }),
        successCount: res.successCount,
        failCount: res.failCount,
      });
      setSelectedIds(new Set());
      setTimeout(() => void loadData(), 1500);
    } catch (err) {
      logError('[handleBulkApprove] uncaught error', err);
      toast('일괄 승인 중 오류가 발생했습니다.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkRejectSubmit = async (reasonCode: string, reasonNote: string) => {
    const session = readSession();
    if (!session?.workerId) {
      toast('로그인 정보를 확인해주세요.');
      return;
    }
    const targets = items.filter((i) => selectedIds.has(i.id) && isBulkEligible(i));
    if (targets.length === 0) return;

    setIsBulkProcessing(true);
    const composed = reasonNote ? `${reasonCode} — ${reasonNote}` : reasonCode;
    const results: BulkResult['results'] = [];
    let success = 0;
    let fail = 0;
    for (const it of targets) {
      try {
        const r = await updateApprovalStatus(
          session.workerId,
          it.id,
          it.type,
          '반려',
          composed,
          reasonCode,
        );
        if (r.success) {
          success++;
          setUiOverrides((prev) => ({ ...prev, [it.id]: 'REJECTED' }));
          results.push({
            recordId: it.id,
            lotNumber: it.lotNumber || it.title || '—',
            success: true,
          });
        } else {
          fail++;
          results.push({
            recordId: it.id,
            lotNumber: it.lotNumber || it.title || '—',
            success: false,
            message: r.message,
          });
        }
      } catch (err) {
        fail++;
        logError('[handleBulkReject] item error', err);
        results.push({
          recordId: it.id,
          lotNumber: it.lotNumber || it.title || '—',
          success: false,
          message: err instanceof Error ? err.message : '알 수 없는 오류',
        });
      }
    }
    setBulkResult({ results, successCount: success, failCount: fail });
    setSelectedIds(new Set());
    setBulkRejectOpen(false);
    setIsBulkProcessing(false);
    setTimeout(() => void loadData(), 1500);
  };

  // 완료 항목 되돌리기 — 모바일 CompletedItemActionSheet의 PC 버전 (인라인 버튼)
  const handleRevert = async (item: RequestItem) => {
    if (item.status === '승인 완료') {
      // 승인 완료 → 반려로 (반려 사유 입력)
      setRejectTarget(item);
    } else if (item.status === '반려') {
      // 반려 → 승인으로
      void handleApprove(item);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] p-8 min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-black text-gray-900 tracking-tight">결재 수신함</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {filtered.length}건 / 대기 {counts.pending}건 · 완료 {counts.done}건
          </p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-100">
        {TABS.map((t) => {
          const active = tab === t.key;
          const cnt = t.key === 'pending' ? counts.pending : counts.done;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-[14px] font-bold border-b-2 transition-colors -mb-px ${
                active
                  ? 'border-[#3182F6] text-[#3182F6]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label} <span className={active ? 'text-[#3182F6]' : 'text-gray-300'}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* 필터 */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="품목·LOT·신청자 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          {TYPE_FILTERS.map((f) => {
            const active = typeFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setTypeFilter(f.key)}
                className={`px-3 py-2 rounded-xl text-[12px] font-bold transition-colors ${
                  active
                    ? 'bg-[#3182F6] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 표 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-400 font-bold text-[15px]">
              {tab === 'pending' ? '대기 중인 결재가 없습니다' : '완료된 내역이 없습니다'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left font-bold text-gray-500 text-[12px]">
                  <th className="px-3 py-3 w-10">
                    {tab === 'pending' && selectableInFiltered.length > 0 && (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-[#3182F6] cursor-pointer"
                      />
                    )}
                  </th>
                  <th className="px-4 py-3 w-24">구분</th>
                  <th className="px-4 py-3 w-24">신청자</th>
                  <th className="px-4 py-3">품목 · LOT</th>
                  <NumHead className="px-4 py-3 w-32">수량 · 금액</NumHead>
                  <th className="px-4 py-3 w-40">신청일시</th>
                  <th className="px-4 py-3 w-28">상태</th>
                  <th className="px-4 py-3 w-44 text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const ui = uiOverrides[item.id];
                  const pending = isItemPending(item);
                  const eligible = isBulkEligible(item) && !ui;
                  const t = TYPE_BADGE[item.type] ?? { bg: 'bg-gray-100 text-gray-700', label: '기타' };
                  const displayStatus =
                    ui === 'COMPLETED' ? '승인 완료' : ui === 'REJECTED' ? '반려' : ui === 'PROCESSING' ? '처리 중' : item.status;
                  const statusCls =
                    ui === 'PROCESSING'
                      ? 'bg-gray-100 text-gray-500'
                      : STATUS_STYLE[displayStatus] ?? 'bg-gray-100 text-gray-500';
                  return (
                    <tr
                      key={item.id}
                      className={`border-t border-gray-100 transition-colors ${
                        selectedIds.has(item.id) ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-3">
                        {tab === 'pending' && eligible ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            className="w-4 h-4 accent-[#3182F6] cursor-pointer"
                          />
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded-md text-[11px] font-black ${t.bg}`}>
                          {t.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">{item.requester || '-'}</td>
                      <td className="px-4 py-3 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{item.title || '-'}</p>
                        {item.lotNumber && (
                          <p className="text-[12px] text-gray-400 mt-0.5 truncate">{item.lotNumber}</p>
                        )}
                      </td>
                      <NumCell className="px-4 py-3 font-bold text-gray-700">
                        {formatAmount(item)}
                      </NumCell>
                      <td className="px-4 py-3 text-gray-500">
                        {formatSubmittedAt(item.createdTime) ?? item.date ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${statusCls}`}>
                          {displayStatus}
                        </span>
                        {item.rejectReason && !pending && (
                          <p className="text-[11px] text-gray-400 mt-1 truncate" title={item.rejectReason}>
                            {item.rejectReason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {pending && !ui ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleApprove(item)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#3182F6] text-white text-[12px] font-bold hover:bg-[#1B64DA] active:scale-95 transition-all"
                              >
                                <CheckIcon className="w-3.5 h-3.5" />
                                승인
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectTarget(item)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-[12px] font-bold hover:bg-gray-50 active:scale-95 transition-all"
                              >
                                <XMarkIcon className="w-3.5 h-3.5" />
                                반려
                              </button>
                            </>
                          ) : tab === 'done' && (item.status === '승인 완료' || item.status === '반려') && !ui ? (
                            <button
                              type="button"
                              onClick={() => void handleRevert(item)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 text-[12px] font-bold hover:bg-gray-50 active:scale-95 transition-all"
                              title={item.status === '승인 완료' ? '반려로 변경' : '승인으로 변경'}
                            >
                              <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                              {item.status === '승인 완료' ? '반려로' : '승인으로'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 일괄 액션바 */}
      {selectedIds.size > 0 && !bulkResult && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-[#191F28] text-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.18)] px-5 py-3.5 flex items-center gap-4 min-w-[420px]">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-black">{selectedIds.size}건 선택됨</p>
              <p className="text-[11px] font-medium text-gray-400">순차 처리 · 부분 성공 허용</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-[12px] font-bold text-gray-300 px-3 py-2 rounded-lg hover:bg-white/10 active:scale-95 transition-all"
            >
              해제
            </button>
            <button
              type="button"
              onClick={() => setBulkRejectOpen(true)}
              disabled={isBulkProcessing}
              className="bg-white/10 text-white font-bold text-[13px] px-4 py-2.5 rounded-lg hover:bg-white/20 active:scale-95 transition-all disabled:opacity-50"
            >
              일괄 반려
            </button>
            <button
              type="button"
              onClick={() => void handleBulkApprove()}
              disabled={isBulkProcessing}
              className="bg-[#3182F6] text-white font-black text-[13px] px-5 py-2.5 rounded-lg hover:bg-[#1B64DA] active:scale-95 transition-all disabled:opacity-50"
            >
              {isBulkProcessing ? '처리 중...' : '일괄 승인'}
            </button>
          </div>
        </div>
      )}

      {/* 단건 반려 모달 */}
      {rejectTarget && (
        <RejectBottomSheet
          isOpen={!!rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSubmit={handleRejectSubmit}
          requesterName={rejectTarget.requester}
        />
      )}

      {/* 일괄 반려 모달 */}
      {bulkRejectOpen && (
        <RejectBottomSheet
          isOpen={bulkRejectOpen}
          onClose={() => setBulkRejectOpen(false)}
          onSubmit={handleBulkRejectSubmit}
          requesterName={`선택 ${selectedIds.size}건`}
        />
      )}

      {/* 일괄 결과 모달 */}
      {bulkResult && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setBulkResult(null)} />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col"
          >
            <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-[18px] font-black text-gray-900">일괄 처리 결과</h2>
                <p className="text-[13px] font-medium text-gray-500 mt-0.5">
                  성공 {bulkResult.successCount}건 · 실패 {bulkResult.failCount}건
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkResult(null)}
                className="p-1 -mr-1 hover:bg-gray-100 rounded-lg active:scale-90 transition-all"
                aria-label="닫기"
              >
                <XMarkIcon className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
              {bulkResult.successCount > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <p className="text-[13px] font-black text-green-700">
                      {bulkResult.successCount}건 처리 완료
                    </p>
                  </div>
                  <ul className="text-[12px] font-medium text-green-700 space-y-1 pl-7">
                    {bulkResult.results.filter((r) => r.success).map((r) => (
                      <li key={r.recordId} className="truncate">{r.lotNumber}</li>
                    ))}
                  </ul>
                </div>
              )}
              {bulkResult.failCount > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <ExclamationCircleIcon className="w-5 h-5 text-[#FF3B30]" />
                    <p className="text-[13px] font-black text-[#FF3B30]">
                      {bulkResult.failCount}건 실패
                    </p>
                  </div>
                  <ul className="space-y-2 pl-7">
                    {bulkResult.results.filter((r) => !r.success).map((r) => (
                      <li key={r.recordId} className="text-[12px]">
                        <p className="font-bold text-gray-800 truncate">{r.lotNumber}</p>
                        <p className="text-gray-500 mt-0.5">{r.message ?? '알 수 없는 오류'}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setBulkResult(null)}
                className="w-full py-3 rounded-xl bg-[#191F28] text-white text-[14px] font-black hover:bg-black active:scale-[0.98] transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 수량 · 금액 컬럼 — 지출은 금액(원), 나머지(입고·출고·이동)는 박스 수량.
 * amountOrQuantity는 모바일 신청 내역과 공유하는 문자열이라(이동은 콤마 없는 raw)
 * 여기서 숫자로 되돌린 뒤 표 공통 표기(천단위 콤마 + 단위 접미)로 다시 만든다.
 */
function formatAmount(item: RequestItem): string {
  if (item.type === 'EXPENSE') {
    const n = Number(item.raw['금액'] ?? 0);
    return n > 0 ? formatNum(n, '원') : '-';
  }
  const raw = item.amountOrQuantity || '';
  const n = Number(raw.replace(/,/g, ''));
  if (raw && Number.isFinite(n)) return formatNum(n, '박스');
  return raw || '-';
}
