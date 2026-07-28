'use client';

// ─────────────────────────────────────────────────────────────────────────────
// 가공 거래 — 재공품(가공 중) + 완료·취소 이력
//
//   ㉠ 가공 투입은 별도 전체 페이지(/processing/new, 워크리스트).
//   ㉡ 완료(여기 모달) → 가공품 LOT 생성 + 가공원가 롤업.
//   ⑤ 취소: 가공 중=원물 복구 / 완료=가공품 무효화(미판매 가드).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { fromGroupedIntegerInput, formatNum } from '@/lib/number-format';
import { NumCell, NumHead } from '@/app/admin/_num-cell';
import {
  listProcessingBatches,
  completeProcessingBatch,
  cancelProcessingBatch,
  type ProcessingBatchSummary,
} from '@/app/actions/admin/master-processing';
import { listStorages, type Storage } from '@/app/actions/admin/master-storage';
import { listProducts } from '@/app/actions/admin/master-products';

const won = (n: number) => formatNum(n, '원');

export default function ProcessingPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [batches, setBatches] = useState<ProcessingBatchSummary[]>([]);
  const [ownStorages, setOwnStorages] = useState<Storage[]>([]);
  const [productNames, setProductNames] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [completing, setCompleting] = useState<ProcessingBatchSummary | null>(null);

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
    const [b, s, p] = await Promise.all([
      listProcessingBatches(workerId),
      listStorages(workerId),
      listProducts(workerId),
    ]);
    if (b.success) setBatches(b.data);
    else toast(`조회 실패: ${b.error}`, 'error');
    if (s.success) setOwnStorages(s.data.filter((x) => x.kind === '자사창고'));
    if (p.success) setProductNames(new Map(p.data.map((x) => [x.id, x.name])));
    setIsLoading(false);
  }, [workerId]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  const productName = useMemo(
    () => (id: string) => productNames.get(id) ?? '—',
    [productNames],
  );

  const cancel = async (batch: ProcessingBatchSummary) => {
    if (!workerId) return;
    if (!confirm(`'${batch.date} ${batch.factoryName}' 가공을 취소할까요? (원물이 복구됩니다)`)) return;
    const res = await cancelProcessingBatch(workerId, batch.id);
    if (res.success) {
      toast('취소되었습니다.', 'success');
      void loadData();
    } else {
      toast(res.error ?? '취소 실패', 'error');
    }
  };

  if (!workerId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#3182F6]" />
      </div>
    );
  }

  const wip = batches.filter((b) => b.status === '가공 중');
  const done = batches.filter((b) => b.status !== '가공 중');

  return (
    <div className="mx-auto min-w-0 max-w-[1200px] p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-black tracking-tight text-gray-900">가공 거래</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            원물 LOT을 가공해 가공품으로 변환. 투입(원물 차감) → 완료(가공품 LOT 생성). 가공 중 물량은
            재공품으로 보입니다.
          </p>
        </div>
        <Link
          href="/admin/master/processing/new"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#3182F6] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#1c6ce0]"
        >
          <PlusIcon className="h-4 w-4" />
          가공 투입
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#3182F6]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* 가공 중 (재공품) */}
          <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
            <div className="border-b border-amber-100 bg-amber-50 px-5 py-3">
              <h2 className="text-[15px] font-bold text-amber-800">
                가공 중 (재공품){' '}
                <span className="text-[13px] font-medium text-amber-500">{wip.length}건</span>
              </h2>
            </div>
            {wip.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-gray-400">
                진행 중인 가공이 없습니다.
              </div>
            ) : (
              <BatchTable
                rows={wip}
                productName={productName}
                wip
                onComplete={(b) => setCompleting(b)}
                onCancel={cancel}
              />
            )}
          </section>

          {/* 완료·취소 이력 */}
          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
              <h2 className="text-[15px] font-bold text-gray-800">
                완료·취소 이력{' '}
                <span className="text-[13px] font-medium text-gray-400">{done.length}건</span>
              </h2>
            </div>
            {done.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-gray-400">아직 없습니다.</div>
            ) : (
              <BatchTable rows={done} productName={productName} onCancel={cancel} />
            )}
          </section>
        </div>
      )}

      {completing && (
        <CompleteModal
          workerId={workerId}
          batch={completing}
          ownStorages={ownStorages}
          productName={productName}
          onClose={() => setCompleting(null)}
          onSaved={() => {
            setCompleting(null);
            void loadData();
          }}
        />
      )}
    </div>
  );
}

function BatchTable({
  rows,
  productName,
  wip,
  onComplete,
  onCancel,
}: {
  rows: ProcessingBatchSummary[];
  productName: (id: string) => string;
  wip?: boolean;
  onComplete?: (b: ProcessingBatchSummary) => void;
  onCancel: (b: ProcessingBatchSummary) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[12px] font-bold text-gray-400">
            <th className="px-5 py-2.5">가공일</th>
            <th className="px-5 py-2.5">가공공장</th>
            <th className="px-5 py-2.5">가공품</th>
            <th className="px-5 py-2.5">동결</th>
            <NumHead className="px-5 py-2.5">산출</NumHead>
            <NumHead className="px-5 py-2.5">가공원가/박스</NumHead>
            <th className="px-5 py-2.5">상태</th>
            <th className="px-5 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-t border-gray-50">
              <td className="px-5 py-2.5 tabular-nums text-gray-700">{b.date || '—'}</td>
              <td className="px-5 py-2.5 font-medium text-gray-900">{b.factoryName || '—'}</td>
              <td className="px-5 py-2.5 text-gray-800">{productName(b.productId)}</td>
              <td className="px-5 py-2.5 text-[12px] text-gray-500">{b.freezeType || '—'}</td>
              <NumCell className="px-5 py-2.5 text-gray-700">
                {b.outputBoxes > 0
                  ? `${formatNum(b.outputBoxes, '박스')} / ${formatNum(b.outputTotalKg, 'kg')}`
                  : '—'}
              </NumCell>
              <NumCell
                className="px-5 py-2.5 text-gray-900"
                value={b.costPerBox > 0 ? b.costPerBox : null}
                unit="원"
                empty="—"
              />
              <td className="px-5 py-2.5">
                <StatusBadge status={b.status} />
              </td>
              <td className="px-5 py-2.5 text-right whitespace-nowrap">
                {wip && onComplete && (
                  <button
                    onClick={() => onComplete(b)}
                    className="mr-2 rounded-md bg-green-600 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-green-700"
                  >
                    완료
                  </button>
                )}
                {b.status !== '취소' && (
                  <button
                    onClick={() => onCancel(b)}
                    className="text-[12px] font-medium text-red-500 hover:text-red-600"
                  >
                    취소
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === '가공 중'
      ? 'bg-amber-100 text-amber-700'
      : status === '완료'
        ? 'bg-green-50 text-green-700'
        : 'bg-gray-100 text-gray-400';
  return <span className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${cls}`}>{status}</span>;
}

// ── ㉡ 가공 완료 모달 ────────────────────────────────────────────────────────
function CompleteModal({
  workerId,
  batch,
  ownStorages,
  productName,
  onClose,
  onSaved,
}: {
  workerId: string;
  batch: ProcessingBatchSummary;
  ownStorages: Storage[];
  productName: (id: string) => string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [completedDate, setCompletedDate] = useState(today);
  const [restorageId, setRestorageId] = useState('');
  const [outputBoxes, setOutputBoxes] = useState('');
  const [outputKg, setOutputKg] = useState('');
  const [misu, setMisu] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const boxes = fromGroupedIntegerInput(outputBoxes).value;
    const kg = Number(outputKg.replace(/,/g, ''));
    if (!restorageId) return toast('재입고 보관처를 선택하세요.', 'error');
    if (!(boxes > 0)) return toast('산출 박스 수를 입력하세요.', 'error');
    if (!(kg > 0)) return toast('산출 총중량(kg)을 입력하세요.', 'error');
    setSaving(true);
    const res = await completeProcessingBatch(workerId, {
      batchId: batch.id,
      outputBoxes: boxes,
      outputTotalKg: kg,
      restorageId,
      misu: misu.trim() || undefined,
      completedDate,
    });
    setSaving(false);
    if (res.success) {
      toast(`완료 — 가공품 LOT 생성 (박스당 ${won(res.data.costPerBox)})`, 'success');
      onSaved();
    } else {
      toast(res.error ?? '완료 실패', 'error');
    }
  };

  const labelClass = 'text-xs font-semibold text-gray-500';
  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#3182F6]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">가공 완료</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-[13px] text-gray-500">
          {batch.factoryName} · {productName(batch.productId)} · {batch.freezeType}
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>완료일(재입고일)</span>
              <input
                type="date"
                className={inputClass}
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>재입고 보관처(자사)</span>
              <select className={inputClass} value={restorageId} onChange={(e) => setRestorageId(e.target.value)}>
                <option value="">선택</option>
                {ownStorages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>산출 박스</span>
              <input
                type="text"
                inputMode="numeric"
                className={inputClass}
                value={outputBoxes}
                onChange={(e) => setOutputBoxes(fromGroupedIntegerInput(e.target.value).display)}
                placeholder="박스 수"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>산출 총중량(kg) ★실측</span>
              <input
                type="text"
                inputMode="decimal"
                className={inputClass}
                value={outputKg}
                onChange={(e) => setOutputKg(e.target.value)}
                placeholder="계근·패킹리스트"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>미수(피스) — 선택</span>
            <input
              type="text"
              className={inputClass}
              value={misu}
              onChange={(e) => setMisu(e.target.value)}
              placeholder="예: 150피스"
            />
          </label>
          <p className="text-[11px] text-gray-400">
            가공원가 = (투입 원물원가 + 임가공비) ÷ 산출총중량. 가공품 LOT의 재고원가로 심깁니다.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-40"
          >
            {saving ? '완료 중…' : '완료 (가공품 입고)'}
          </button>
        </div>
      </div>
    </div>
  );
}
