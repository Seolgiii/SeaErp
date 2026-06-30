'use client';

// ─────────────────────────────────────────────────────────────────────────────
// 가공 투입 (㉠) — PC 전체 페이지 워크리스트 (이동 등록과 동일 룩앤필)
//
//   ① 공통: 가공일·동결방식·가공공장·가공품 (배치 단위, 한 번만)
//   ② 원물 LOT 검색 → 담기 (검색 결과 = 작업목록과 동일 표 양식)
//   ③ 작업목록 표: 행마다 투입박스 (부분 투입) + 투입 버튼
//      → createProcessingBatch (원물 차감 → 상태=가공 중)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { createProcessingBatch } from '@/app/actions/admin/master-processing';
import { searchTransferLot } from '@/app/actions/inventory/transfer';
import { listStorages, type Storage } from '@/app/actions/admin/master-storage';
import { listProducts, type Product } from '@/app/actions/admin/master-products';

const FREEZE_TYPES = ['ONE-Frozen', 'TWO-Frozen'] as const;

type SearchHit = {
  lotRecordId: string;
  lotNumber: string;
  product: string;
  spec: string;
  misu: string;
  available: number;
  storage: string;
};
type Row = SearchHit & { boxes: string };

const labelClass = 'text-xs font-semibold text-gray-500';
const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#3182F6]';
const cellInput =
  'w-full rounded-md border border-gray-300 px-2 py-1.5 text-right text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#3182F6]';

// 검색 결과·작업목록 공통 컬럼 (같은 양식으로 정렬)
function LotCols() {
  return (
    <colgroup>
      <col />
      <col />
      <col className="w-20" />
      <col className="w-20" />
      <col className="w-16" />
      <col />
      <col className="w-32" />
      <col className="w-10" />
    </colgroup>
  );
}
function LotHead({ last }: { last: string }) {
  return (
    <thead>
      <tr className="border-b border-gray-100 bg-gray-50 text-left text-[12px] font-bold text-gray-500">
        <th className="px-3 py-2.5">LOT번호</th>
        <th className="px-3 py-2.5">품목</th>
        <th className="px-3 py-2.5">규격</th>
        <th className="px-3 py-2.5">미수</th>
        <th className="px-3 py-2.5 text-right">재고</th>
        <th className="px-3 py-2.5">보관처</th>
        <th className="px-3 py-2.5">{last}</th>
        <th className="px-3 py-2.5" />
      </tr>
    </thead>
  );
}
function LotInfoCells({ h }: { h: SearchHit }) {
  return (
    <>
      <td className="px-3 py-2 text-gray-800">{h.lotNumber}</td>
      <td className="px-3 py-2 text-gray-700">{h.product || '(미상)'}</td>
      <td className="whitespace-nowrap px-3 py-2 text-gray-600">{formatSpec(h.spec)}</td>
      <td className="whitespace-nowrap px-3 py-2 text-gray-600">{formatMisu(h.misu)}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-600">
        {formatIntKo(h.available)}
      </td>
      <td className="px-3 py-2 text-gray-500">{h.storage || '—'}</td>
    </>
  );
}

export default function ProcessingCreatePage() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [bizDate, setBizDate] = useState(() => getSeoulTodaySlash());
  const [freezeType, setFreezeType] = useState<(typeof FREEZE_TYPES)[number] | ''>('');
  const [factoryId, setFactoryId] = useState('');
  const [productId, setProductId] = useState('');

  const [factories, setFactories] = useState<Storage[]>([]);
  const [fillets, setFillets] = useState<Product[]>([]);
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
      const [st, pr] = await Promise.all([listStorages(s.workerId), listProducts(s.workerId)]);
      if (st.success) setFactories(st.data.filter((x) => x.kind === '가공공장'));
      else toast('가공공장 목록을 불러오지 못했습니다.', 'error');
      if (pr.success) setFillets(pr.data.filter((x) => x.category === '필렛'));
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
      setHits(
        res.records.map((r) => ({
          lotRecordId: r.lotRecordId,
          lotNumber: r.lotNumber,
          product: r.productName,
          spec: r.spec,
          misu: r.misu,
          available: r.stockQty,
          storage: r.storage,
        })),
      );
      if (res.records.length === 0) toast('재고가 있는 LOT이 없습니다.', 'info');
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
    setRows((prev) => [...prev, { ...h, boxes: '' }]);
  };
  const patchRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.lotRecordId === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.lotRecordId !== id));

  const totalBoxes = rows.reduce((s, r) => s + (fromGroupedIntegerInput(r.boxes).value || 0), 0);

  const submit = async () => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      toast('로그인이 필요합니다.', 'error');
      return;
    }
    if (!factoryId) return toast('가공공장을 선택하세요.', 'error');
    if (!productId) return toast('가공품을 선택하세요.', 'error');
    if (!freezeType) return toast('동결방식을 선택하세요.', 'error');
    if (rows.length === 0) return toast('투입할 원물 LOT을 담으세요.', 'error');

    const parsed = tryParseInboundDateInput(bizDate);
    if (!parsed) {
      setBizDate(getSeoulTodaySlash());
      toast('가공일 형식이 올바르지 않아 오늘 날짜로 설정했습니다.', 'info');
    }
    const iso = parsed?.iso ?? getSeoulTodayISO();

    const invalid = rows.some((r) => {
      const q = fromGroupedIntegerInput(r.boxes).value;
      return !(q >= 1 && q <= r.available);
    });
    if (invalid) return toast('각 행의 투입박스(1~재고)를 확인하세요.', 'error');

    setSubmitting(true);
    try {
      const res = await createProcessingBatch(session.workerId, {
        date: iso,
        factoryId,
        factoryName: factories.find((f) => f.id === factoryId)?.name ?? '',
        productId,
        freezeType,
        inputs: rows.map((r) => ({
          lotRecordId: r.lotRecordId,
          boxes: fromGroupedIntegerInput(r.boxes).value,
        })),
      });
      if (res.success) {
        toast('가공 투입 완료 (상태: 가공 중)', 'success');
        router.push('/admin/master/processing');
      } else {
        toast(res.error ?? '투입 실패', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authError) {
    return (
      <div className="p-6">
        <Link
          href="/admin/master/processing"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          가공 거래
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
          href="/admin/master/processing"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          가공 거래
        </Link>
        <h1 className="mt-2 text-xl font-bold text-[#191F28]">가공 투입</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          ① 가공공장·가공품·동결방식을 정하고 ② 원물 LOT을 검색해 담은 뒤 ③ 투입박스를 정해 한 번에
          투입합니다. 투입하면 원물이 차감되고 ‘가공 중(재공품)’ 상태가 됩니다. (완료는 가공 거래
          화면에서)
        </p>
      </div>

      {/* ① 공통 컨트롤 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 text-[13px] font-bold text-gray-700">① 가공 정보</div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>가공일</span>
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
          <label className="flex flex-col gap-1">
            <span className={labelClass}>동결방식</span>
            <select
              className={`${inputClass} w-44`}
              value={freezeType}
              onChange={(e) => setFreezeType(e.target.value as (typeof FREEZE_TYPES)[number] | '')}
            >
              <option value="">— 선택 —</option>
              {FREEZE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>가공공장</span>
            <select
              className={`${inputClass} w-48`}
              value={factoryId}
              onChange={(e) => setFactoryId(e.target.value)}
            >
              <option value="">— 선택 —</option>
              {factories.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>가공품 (필렛)</span>
            <select
              className={`${inputClass} w-56`}
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">— 선택 —</option>
              {fillets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.code ? ` (${p.code})` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* ② 원물 LOT 검색 (결과 = 작업목록과 동일 표 양식) */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 text-[13px] font-bold text-gray-700">② 원물 LOT 검색</div>
        <div className="flex gap-2">
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
          <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-gray-100">
            <table className="w-full text-[13px]">
              <LotCols />
              <LotHead last="" />
              <tbody>
                {hits.map((h) => {
                  const added = rows.some((r) => r.lotRecordId === h.lotRecordId);
                  return (
                    <tr key={h.lotRecordId} className="border-b border-gray-50 last:border-0">
                      <LotInfoCells h={h} />
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => addRow(h)}
                          disabled={added}
                          className="w-full rounded-md bg-[#3182F6]/10 px-2 py-1.5 text-[12px] font-semibold text-[#3182F6] hover:bg-[#3182F6]/20 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          {added ? '담김' : '＋ 담기'}
                        </button>
                      </td>
                      <td className="px-3 py-2" />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ③ 작업목록 (투입) */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="text-[13px] font-bold text-gray-700">
            ③ 작업목록{' '}
            <span className="font-medium text-gray-400">
              {rows.length}건 · 총 {formatIntKo(totalBoxes)}박스
            </span>
          </div>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || !ready || rows.length === 0}
            className="rounded-lg bg-[#3182F6] px-5 py-2 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-40"
          >
            {submitting ? '투입 중…' : `가공 투입 (${rows.length})`}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <LotCols />
            <LotHead last="투입박스" />
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-sm text-gray-400">
                    위 ②에서 원물 LOT을 검색해 담으세요. (여러 LOT·부분 투입 가능)
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.lotRecordId} className="border-b border-gray-50 last:border-0">
                    <LotInfoCells h={r} />
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        className={cellInput}
                        placeholder={`≤ ${r.available}`}
                        value={r.boxes}
                        onChange={(e) => {
                          const { value } = fromGroupedIntegerInput(e.target.value);
                          const clamped = Number.isFinite(value)
                            ? Math.min(value, r.available)
                            : value;
                          patchRow(r.lotRecordId, { boxes: clamped > 0 ? formatIntKo(clamped) : '' });
                        }}
                      />
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
        </div>
      </div>
    </div>
  );
}
