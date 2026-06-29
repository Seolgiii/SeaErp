'use client';

// ─────────────────────────────────────────────────────────────────────────────
// 이동 PC 일괄 등록 (관리자 전용)
//
// 출고와 같은 워크리스트: ① LOT 검색 → ② 담기 → ③ 행마다 이동수량·이동후보관처 →
// ④ 전체 등록+승인. 행별 createTransferDirect(생성→승인) 순회, 부분 실패해도 나머지
// 진행·실패 행만 잔류. 이동후보관처는 보관처 마스터에서만 선택(인라인 생성 안 함).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  getSeoulTodayISO,
  getSeoulTodaySlash,
  tryParseInboundDateInput,
} from '@/lib/inbound-date-input';
import { fromGroupedIntegerInput, formatIntKo } from '@/lib/number-format';
import { formatSpec, formatMisu } from '@/lib/spec-display';
import { readSession, isSessionExpired, isAdminRole } from '@/lib/session';
import { toast } from '@/lib/toast';
import { createTransferDirect } from '@/app/actions/admin/master-transactions';
import { searchTransferLot } from '@/app/actions/inventory/transfer';
import { getStorageOptions } from '@/app/actions/inventory/inbound';

type StorageOption = { id: string; name: string };

type SearchHit = {
  lotRecordId: string;
  lotNumber: string;
  product: string;
  spec: string;
  misu: string;
  available: number;
  storage: string;
};

type Row = SearchHit & {
  qty: string;
  toStorageId: string;
  error?: string;
};

const labelClass = 'text-xs font-semibold text-gray-500';
const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#3182F6]';
const cellInput =
  'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#3182F6]';

export default function TransferCreatePage() {
  const [authError, setAuthError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [bizDate, setBizDate] = useState(() => getSeoulTodaySlash());
  const [commit, setCommit] = useState(true);

  const [storages, setStorages] = useState<StorageOption[]>([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const s = readSession();
    if (!s || isSessionExpired(s)) {
      setAuthError('로그인이 필요합니다.');
      return;
    }
    if (!isAdminRole(s)) {
      setAuthError('관리자 전용 화면입니다.');
      return;
    }
    setReady(true);
    void (async () => {
      try {
        setStorages(await getStorageOptions());
      } catch {
        toast('보관처 목록을 불러오지 못했습니다.', 'error');
      }
    })();
  }, []);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await searchTransferLot(q);
      if (!res.success) {
        toast(res.error ?? '검색 실패', 'error');
        setHits([]);
        return;
      }
      const mapped: SearchHit[] = res.records.map((r) => ({
        lotRecordId: r.lotRecordId,
        lotNumber: r.lotNumber,
        product: r.productName,
        spec: r.spec,
        misu: r.misu,
        available: r.stockQty,
        storage: r.storage,
      }));
      setHits(mapped);
      if (mapped.length === 0) toast('재고가 있는 LOT이 없습니다.', 'info');
    } catch {
      toast('검색 중 오류가 발생했습니다.', 'error');
    } finally {
      setSearching(false);
    }
  };

  const addRow = (h: SearchHit) => {
    if (rows.some((r) => r.lotRecordId === h.lotRecordId)) {
      toast('이미 작업목록에 있습니다.', 'info');
      return;
    }
    setRows((prev) => [...prev, { ...h, qty: '', toStorageId: '' }]);
  };

  const patchRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.lotRecordId === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.lotRecordId !== id));

  const submit = async () => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      toast('로그인이 필요합니다.', 'error');
      return;
    }
    if (rows.length === 0) {
      toast('이동할 LOT을 추가하세요.', 'error');
      return;
    }
    const parsed = tryParseInboundDateInput(bizDate);
    if (!parsed) {
      setBizDate(getSeoulTodaySlash());
      toast('이동일 형식이 올바르지 않아 오늘 날짜로 설정했습니다.', 'info');
    }
    const iso = parsed?.iso ?? getSeoulTodayISO();

    const invalid = rows.some((r) => {
      const q = fromGroupedIntegerInput(r.qty).value;
      return !(q >= 1 && q <= r.available) || !r.toStorageId;
    });
    if (invalid) {
      toast('각 행의 이동수량(1~재고)·이동후보관처를 확인하세요.', 'error');
      return;
    }

    setSubmitting(true);
    const failed: Row[] = [];
    let committed = 0;
    let pending = 0;
    try {
      for (const r of rows) {
        const res = await createTransferDirect({
          adminWorkerId: session.workerId,
          item: {
            lotRecordId: r.lotRecordId,
            lotNumber: r.lotNumber,
            이동수량: fromGroupedIntegerInput(r.qty).value,
            이동후보관처RecordId: r.toStorageId,
            이동일: iso,
          },
          commit,
        });
        if (!res.success) {
          failed.push({ ...r, error: res.message ?? '실패' });
        } else if (res.committed) {
          committed += 1;
        } else {
          pending += 1;
        }
      }
    } finally {
      setSubmitting(false);
    }

    setRows(failed);
    const parts: string[] = [];
    if (committed) parts.push(`등록+승인 ${committed}건`);
    if (pending) parts.push(`승인대기 ${pending}건`);
    if (failed.length) parts.push(`실패 ${failed.length}건`);
    toast(parts.join(' · ') || '처리 결과 없음', failed.length ? 'info' : 'success');
  };

  if (authError) {
    return (
      <div className="p-6">
        <Link
          href="/admin/master/transactions/transfer"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          이동 이력
        </Link>
        <div className="mt-10 text-center text-sm text-gray-400">{authError}</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-5 p-6">
      {/* 헤더 */}
      <div>
        <Link
          href="/admin/master/transactions/transfer"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          이동 이력
        </Link>
        <h1 className="mt-2 text-xl font-bold text-[#191F28]">이동 등록</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          LOT을 검색해 작업목록에 담고, 행마다 이동수량·이동후보관처를 정한 뒤 한 번에
          등록합니다. ‘바로 승인’이 켜져 있으면 즉시 새 LOT이 생성되고 원본이 차감됩니다.
        </p>
      </div>

      {/* 공통 컨트롤 */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>이동일</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="YYYY/MM/DD"
            className={`${inputClass} w-40`}
            value={bizDate}
            onChange={(e) => setBizDate(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="mb-2 inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#3182F6]"
            checked={commit}
            onChange={(e) => setCommit(e.target.checked)}
          />
          바로 승인 (끄면 ‘승인 대기’로만 저장)
        </label>
      </div>

      {/* LOT 검색 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <span className={labelClass}>LOT 검색</span>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className={`${inputClass} pl-9`}
              placeholder="LOT번호 끝자리 또는 품목명"
              value={query}
              disabled={!ready}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void runSearch();
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={!ready || searching}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40"
          >
            {searching ? '검색 중…' : '검색'}
          </button>
        </div>

        {hits.length > 0 && (
          <ul className="mt-2 max-h-60 divide-y divide-gray-100 overflow-auto rounded-lg border border-gray-100">
            {hits.map((h) => {
              const added = rows.some((r) => r.lotRecordId === h.lotRecordId);
              return (
                <li key={h.lotRecordId}>
                  <button
                    type="button"
                    onClick={() => addRow(h)}
                    disabled={added}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex-1">
                      <span className="font-mono text-[13px] text-gray-800">{h.lotNumber}</span>
                      <span className="ml-2 text-gray-600">
                        {h.product || '(미상)'} {formatSpec(h.spec)} {formatMisu(h.misu)}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-xs text-gray-500">
                      재고 {formatIntKo(h.available)} · {h.storage || '—'}
                    </span>
                    <span className="text-xs font-semibold text-[#3182F6]">
                      {added ? '담김' : '담기'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 작업목록 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-[12px] font-bold text-gray-500">
              <th className="px-3 py-2.5">LOT번호</th>
              <th className="px-3 py-2.5">품목</th>
              <th className="whitespace-nowrap px-3 py-2.5">규격</th>
              <th className="whitespace-nowrap px-3 py-2.5">미수</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">재고</th>
              <th className="px-3 py-2.5">현재 보관처</th>
              <th className="w-28 px-3 py-2.5">이동수량</th>
              <th className="w-48 px-3 py-2.5">이동 후 보관처</th>
              <th className="w-10 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-sm text-gray-400">
                  위에서 LOT을 검색해 담으세요.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.lotRecordId} className="border-b border-gray-50">
                  <td className="px-3 py-2 font-mono text-[12px] text-gray-800">{r.lotNumber}</td>
                  <td className="px-3 py-2 text-gray-700">{r.product || '(미상)'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{formatSpec(r.spec)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{formatMisu(r.misu)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-600">
                    {formatIntKo(r.available)}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{r.storage || '—'}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      className={cellInput}
                      placeholder={`≤ ${r.available}`}
                      value={r.qty}
                      onChange={(e) => {
                        const { value } = fromGroupedIntegerInput(e.target.value);
                        const clamped = Number.isFinite(value)
                          ? Math.min(value, r.available)
                          : value;
                        patchRow(r.lotRecordId, {
                          qty: clamped > 0 ? formatIntKo(clamped) : '',
                        });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className={cellInput}
                      value={r.toStorageId}
                      onChange={(e) => patchRow(r.lotRecordId, { toStorageId: e.target.value })}
                    >
                      <option value="">— 선택 —</option>
                      {storages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(r.lotRecordId)}
                      className="text-gray-400 hover:text-red-500"
                      title="삭제"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {rows.some((r) => r.error) && (
          <div className="border-t border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {rows
              .filter((r) => r.error)
              .map((r) => `${r.lotNumber}: ${r.error}`)
              .join(' / ')}
          </div>
        )}
      </div>

      {/* 액션 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">작업목록 {rows.length}건</span>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting || !ready || rows.length === 0}
          className="rounded-lg bg-[#3182F6] px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-40"
        >
          {submitting
            ? '처리 중…'
            : commit
              ? `전체 등록 + 승인 (${rows.length})`
              : `전체 승인 대기로 저장 (${rows.length})`}
        </button>
      </div>
    </div>
  );
}
