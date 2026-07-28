'use client';

// ─────────────────────────────────────────────────────────────────────────────
// 가공비 단가 마스터
//
// 가공공장(보관처 구분=가공공장) × 가공품(품목구분=필렛)별 임가공 단가표.
// 보관처 비용 이력 패턴 — 적용기간으로 시세 변동 흡수(종료일 빈값=현재 적용).
// 기준: ONE-Frozen=투입kg당 / TWO-Frozen=산출kg당.
// 가공 거래(추후)에서 공장+가공품으로 현재 적용 단가를 자동 조회한다.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { fromGroupedIntegerInput, formatIntKo } from '@/lib/number-format';
import { NumCell, NumHead } from '@/app/admin/_num-cell';
import { RATE_BASES, type RateBasis } from '@/lib/processing-rate-basis';
import {
  listProcessingRates,
  createProcessingRate,
  updateProcessingRate,
  deleteProcessingRate,
  type ProcessingRate,
} from '@/app/actions/admin/master-processing-rates';
import { listStorages, type Storage } from '@/app/actions/admin/master-storage';
import { listProducts, type Product } from '@/app/actions/admin/master-products';


function BasisBadge({ basis }: { basis: RateBasis | '' }) {
  if (!basis) return <span className="text-gray-300">—</span>;
  const cls =
    basis === '투입kg당'
      ? 'bg-blue-50 text-blue-700'
      : 'bg-orange-50 text-orange-700';
  return (
    <span className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${cls}`}>{basis}</span>
  );
}

export default function ProcessingRatesMasterPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [rates, setRates] = useState<ProcessingRate[]>([]);
  const [factories, setFactories] = useState<Storage[]>([]);
  const [fillets, setFillets] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<ProcessingRate | 'new' | null>(null);

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
    const [r, s, p] = await Promise.all([
      listProcessingRates(workerId),
      listStorages(workerId),
      listProducts(workerId),
    ]);
    if (r.success) setRates(r.data);
    else toast(`조회 실패: ${r.error}`, 'error');
    if (s.success) setFactories(s.data.filter((x) => x.kind === '가공공장'));
    if (p.success) setFillets(p.data.filter((x) => x.category === '필렛'));
    setIsLoading(false);
  }, [workerId]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  const resolveFactory = useMemo(() => {
    const m = new Map(factories.map((f) => [f.id, f.name]));
    return (id: string, fallback: string) => m.get(id) ?? fallback ?? '—';
  }, [factories]);
  const resolveProduct = useMemo(() => {
    const m = new Map(fillets.map((p) => [p.id, p.name]));
    return (id: string) => m.get(id) ?? '—';
  }, [fillets]);

  if (!workerId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#3182F6]" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1100px] p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-black tracking-tight text-gray-900">가공비 단가</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            가공공장 × 가공품별 임가공 단가표. 가공 거래에서 이 단가를 자동으로 불러옵니다. (전체{' '}
            {rates.length}건)
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#3182F6] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#1c6ce0]"
        >
          <PlusIcon className="h-4 w-4" />
          단가 추가
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#3182F6]" />
        </div>
      ) : factories.length === 0 ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-8 text-center text-[13px] text-amber-800">
          보관처 마스터에 <b>구분=가공공장</b>인 보관처가 없습니다. 먼저 보관처 마스터에서 가공공장을
          등록하세요.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {rates.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-gray-400">
              아직 단가가 없습니다. ‘단가 추가’로 등록하세요.
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[12px] font-bold text-gray-400">
                  <th className="px-5 py-2.5">가공공장</th>
                  <th className="px-5 py-2.5">가공품</th>
                  <NumHead className="px-5 py-2.5">단가</NumHead>
                  <th className="px-5 py-2.5">기준</th>
                  <th className="px-5 py-2.5">적용기간</th>
                  <th className="px-5 py-2.5">비고</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) => {
                  const current = !r.endDate;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setEditing(r)}
                      className="cursor-pointer border-t border-gray-50 hover:bg-blue-50/40"
                    >
                      <td className="px-5 py-2.5 font-bold text-gray-900">
                        {resolveFactory(r.factoryId, r.factoryName)}
                      </td>
                      <td className="px-5 py-2.5 text-gray-800">{resolveProduct(r.productId)}</td>
                      <NumCell className="px-5 py-2.5 text-gray-900" value={r.price} unit="원" />
                      <td className="px-5 py-2.5">
                        <BasisBadge basis={r.basis} />
                      </td>
                      <td className="px-5 py-2.5 tabular-nums text-gray-500">
                        {r.startDate || '—'} ~{' '}
                        {current ? (
                          <span className="font-medium text-green-600">현재</span>
                        ) : (
                          r.endDate
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-gray-500">{r.memo || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editing && (
        <RateEditModal
          workerId={workerId}
          rate={editing === 'new' ? null : editing}
          factories={factories}
          fillets={fillets}
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

function RateEditModal({
  workerId,
  rate,
  factories,
  fillets,
  onClose,
  onSaved,
}: {
  workerId: string;
  rate: ProcessingRate | null;
  factories: Storage[];
  fillets: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = rate !== null;
  const [factoryId, setFactoryId] = useState(rate?.factoryId ?? '');
  const [productId, setProductId] = useState(rate?.productId ?? '');
  const [priceDisplay, setPriceDisplay] = useState(rate ? formatIntKo(rate.price) : '');
  const [basis, setBasis] = useState<RateBasis | ''>(rate?.basis ?? '');
  const [startDate, setStartDate] = useState(rate?.startDate ?? '');
  const [endDate, setEndDate] = useState(rate?.endDate ?? '');
  const [memo, setMemo] = useState(rate?.memo ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!factoryId) return toast('가공공장을 선택하세요.', 'error');
    if (!productId) return toast('가공품을 선택하세요.', 'error');
    if (!basis) return toast('기준을 선택하세요.', 'error');
    const price = fromGroupedIntegerInput(priceDisplay).value;
    if (!Number.isFinite(price) || price < 0) return toast('단가를 올바르게 입력하세요.', 'error');
    if (!startDate) return toast('적용시작일을 입력하세요.', 'error');
    if (endDate && endDate < startDate) return toast('적용종료일은 시작일 이후여야 합니다.', 'error');

    setSaving(true);
    const input = {
      factoryId,
      factoryName: factories.find((f) => f.id === factoryId)?.name ?? '',
      productId,
      price,
      basis,
      startDate,
      endDate: endDate || undefined,
      memo: memo.trim(),
    };
    const res = isEdit
      ? await updateProcessingRate(workerId, rate!.id, input)
      : await createProcessingRate(workerId, input);
    setSaving(false);
    if (res.success) {
      toast(isEdit ? '수정되었습니다.' : '추가되었습니다.', 'success');
      onSaved();
    } else {
      toast(res.error ?? '저장 실패', 'error');
    }
  };

  const remove = async () => {
    if (!isEdit) return;
    if (!confirm('이 단가를 삭제할까요?')) return;
    setSaving(true);
    const res = await deleteProcessingRate(workerId, rate!.id);
    setSaving(false);
    if (res.success) {
      toast('삭제되었습니다.', 'success');
      onSaved();
    } else {
      toast(res.error ?? '삭제 실패', 'error');
    }
  };

  const labelClass = 'text-xs font-semibold text-gray-500';
  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#3182F6]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            가공비 단가 · {isEdit ? '수정' : '추가'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>가공공장</span>
            <select
              className={inputClass}
              value={factoryId}
              onChange={(e) => setFactoryId(e.target.value)}
            >
              <option value="">선택하세요</option>
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
              className={inputClass}
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">선택하세요</option>
              {fillets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.code ? ` (${p.code})` : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>단가 (원)</span>
              <input
                type="text"
                inputMode="numeric"
                className={inputClass}
                value={priceDisplay}
                onChange={(e) => setPriceDisplay(fromGroupedIntegerInput(e.target.value).display)}
                placeholder="숫자만"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>기준</span>
              <select
                className={inputClass}
                value={basis}
                onChange={(e) => setBasis(e.target.value as RateBasis | '')}
              >
                <option value="">선택</option>
                {RATE_BASES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="-mt-1 text-[11px] text-gray-400">
            ONE-Frozen(제주)=투입kg당 · TWO-Frozen(부산·해외)=산출kg당
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>적용시작일</span>
              <input
                type="date"
                className={inputClass}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>적용종료일 (비우면 현재)</span>
              <input
                type="date"
                className={inputClass}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>비고</span>
            <input
              type="text"
              className={inputClass}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-between">
          {isEdit ? (
            <button
              onClick={() => void remove()}
              disabled={saving}
              className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-40"
            >
              삭제
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg bg-[#3182F6] px-4 py-2 text-sm font-bold text-white hover:bg-[#1c6ce0] disabled:opacity-40"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
