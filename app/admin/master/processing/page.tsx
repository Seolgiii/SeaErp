'use client';

// ─────────────────────────────────────────────────────────────────────────────
// 가공 거래 — N개 원물 LOT → 가공품 1종, 2단계 WIP
//
//   ㉠ 가공 투입(워크리스트): 가공공장·가공품·동결방식 + 원물 LOT 담기(부분 투입)
//      → 원물 차감 → 상태=가공 중(재공품)
//   ㉡ 가공 완료: 산출 실측(박스·총중량) + 재입고처 → 가공품 LOT 생성 + 가공원가 롤업
//   ⑤ 취소: 가공 중=원물 복구 / 완료=가공품 무효화(미판매 가드)
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { fromGroupedIntegerInput, formatIntKo } from '@/lib/number-format';
import {
  listProcessingBatches,
  createProcessingBatch,
  completeProcessingBatch,
  cancelProcessingBatch,
  type ProcessingBatchSummary,
} from '@/app/actions/admin/master-processing';
import { listStorages, type Storage } from '@/app/actions/admin/master-storage';
import { listProducts, type Product } from '@/app/actions/admin/master-products';
import { listLots, type Lot } from '@/app/actions/admin/master-lots';

const won = (n: number) => `${formatIntKo(Math.round(n))}원`;
const FREEZE_TYPES = ['ONE-Frozen', 'TWO-Frozen'] as const;

export default function ProcessingPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [batches, setBatches] = useState<ProcessingBatchSummary[]>([]);
  const [factories, setFactories] = useState<Storage[]>([]);
  const [ownStorages, setOwnStorages] = useState<Storage[]>([]);
  const [fillets, setFillets] = useState<Product[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInput, setShowInput] = useState(false);
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
    const [b, s, p, l] = await Promise.all([
      listProcessingBatches(workerId),
      listStorages(workerId),
      listProducts(workerId),
      listLots(workerId),
    ]);
    if (b.success) setBatches(b.data);
    else toast(`조회 실패: ${b.error}`, 'error');
    if (s.success) {
      setFactories(s.data.filter((x) => x.kind === '가공공장'));
      setOwnStorages(s.data.filter((x) => x.kind === '자사창고'));
    }
    if (p.success) setFillets(p.data.filter((x) => x.category === '필렛'));
    if (l.success) setLots(l.data.filter((x) => x.stockQty > 0));
    setIsLoading(false);
  }, [workerId]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  const productName = useMemo(() => {
    const m = new Map(fillets.map((p) => [p.id, p.name]));
    return (id: string) => m.get(id) ?? '—';
  }, [fillets]);

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
        <button
          onClick={() => setShowInput(true)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#3182F6] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#1c6ce0]"
        >
          <PlusIcon className="h-4 w-4" />
          가공 투입
        </button>
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

      {showInput && (
        <InputModal
          workerId={workerId}
          factories={factories}
          fillets={fillets}
          lots={lots}
          onClose={() => setShowInput(false)}
          onSaved={() => {
            setShowInput(false);
            void loadData();
          }}
        />
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
            <th className="px-5 py-2.5 text-right">산출</th>
            <th className="px-5 py-2.5 text-right">가공원가/박스</th>
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
              <td className="px-5 py-2.5 text-right tabular-nums text-gray-700">
                {b.outputBoxes > 0 ? `${b.outputBoxes}박스 / ${b.outputTotalKg}kg` : '—'}
              </td>
              <td className="px-5 py-2.5 text-right tabular-nums text-gray-900">
                {b.costPerBox > 0 ? won(b.costPerBox) : '—'}
              </td>
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

// ── ㉠ 가공 투입 워크리스트 모달 ──────────────────────────────────────────────
type Row = { lotId: string; lotNumber: string; productName: string; stockQty: number; boxes: string };

function InputModal({
  workerId,
  factories,
  fillets,
  lots,
  onClose,
  onSaved,
}: {
  workerId: string;
  factories: Storage[];
  fillets: Product[];
  lots: Lot[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [factoryId, setFactoryId] = useState('');
  const [productId, setProductId] = useState('');
  const [freezeType, setFreezeType] = useState<(typeof FREEZE_TYPES)[number] | ''>('');
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  const query = q.trim().toLowerCase();
  const candidates = useMemo(() => {
    const picked = new Set(rows.map((r) => r.lotId));
    return lots
      .filter((l) => !picked.has(l.id))
      .filter(
        (l) =>
          !query ||
          l.lotNumber.toLowerCase().includes(query) ||
          l.productName.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [lots, rows, query]);

  const addRow = (l: Lot) =>
    setRows((rs) => [
      ...rs,
      { lotId: l.id, lotNumber: l.lotNumber, productName: l.productName, stockQty: l.stockQty, boxes: '' },
    ]);

  const totalBoxes = rows.reduce((s, r) => s + (fromGroupedIntegerInput(r.boxes).value || 0), 0);

  const save = async () => {
    if (!factoryId) return toast('가공공장을 선택하세요.', 'error');
    if (!productId) return toast('가공품을 선택하세요.', 'error');
    if (!freezeType) return toast('동결방식을 선택하세요.', 'error');
    if (rows.length === 0) return toast('투입할 원물 LOT을 담으세요.', 'error');
    const inputs = [];
    for (const r of rows) {
      const boxes = fromGroupedIntegerInput(r.boxes).value;
      if (!(boxes > 0)) return toast(`${r.lotNumber}: 투입 박스를 입력하세요.`, 'error');
      if (boxes > r.stockQty) return toast(`${r.lotNumber}: 재고(${r.stockQty})를 초과했습니다.`, 'error');
      inputs.push({ lotRecordId: r.lotId, boxes });
    }
    setSaving(true);
    const res = await createProcessingBatch(workerId, {
      date,
      factoryId,
      factoryName: factories.find((f) => f.id === factoryId)?.name ?? '',
      productId,
      freezeType,
      inputs,
    });
    setSaving(false);
    if (res.success) {
      toast('가공 투입 완료 (상태: 가공 중)', 'success');
      onSaved();
    } else {
      toast(res.error ?? '투입 실패', 'error');
    }
  };

  const labelClass = 'text-xs font-semibold text-gray-500';
  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#3182F6]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">가공 투입</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>가공일</span>
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>동결방식</span>
            <select
              className={inputClass}
              value={freezeType}
              onChange={(e) => setFreezeType(e.target.value as (typeof FREEZE_TYPES)[number] | '')}
            >
              <option value="">선택</option>
              {FREEZE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>가공공장</span>
            <select className={inputClass} value={factoryId} onChange={(e) => setFactoryId(e.target.value)}>
              <option value="">선택</option>
              {factories.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>가공품 (필렛)</span>
            <select className={inputClass} value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">선택</option>
              {fillets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.code ? ` (${p.code})` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* 원물 LOT 담기 */}
        <div className="mt-4">
          <div className="relative mb-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="원물 LOT 검색 (LOT번호·품목)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#3182F6]"
            />
          </div>
          {query && candidates.length > 0 && (
            <div className="mb-3 max-h-40 overflow-y-auto rounded-lg border border-gray-100">
              {candidates.map((l) => (
                <button
                  key={l.id}
                  onClick={() => addRow(l)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-blue-50/50"
                >
                  <span>
                    <span className="font-medium text-gray-900">{l.lotNumber}</span>{' '}
                    <span className="text-gray-500">{l.productName}</span>
                  </span>
                  <span className="text-[12px] text-gray-400">재고 {l.stockQty}박스</span>
                </button>
              ))}
            </div>
          )}

          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-[13px] text-gray-400">
              위 검색으로 투입할 원물 LOT을 담으세요. (여러 LOT·부분 투입 가능)
            </div>
          ) : (
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
              {rows.map((r, i) => (
                <div key={r.lotId} className="flex items-center gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-gray-900">{r.lotNumber}</div>
                    <div className="text-[11px] text-gray-400">
                      {r.productName} · 재고 {r.stockQty}박스
                    </div>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="박스"
                    value={r.boxes}
                    onChange={(e) =>
                      setRows((rs) =>
                        rs.map((x, j) =>
                          j === i ? { ...x, boxes: fromGroupedIntegerInput(e.target.value).display } : x,
                        ),
                      )
                    }
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-right text-sm outline-none focus:ring-2 focus:ring-[#3182F6]"
                  />
                  <button
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-red-500"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-[13px] text-gray-500">
            투입 {rows.length}개 LOT · 총 {totalBoxes}박스
          </span>
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
              {saving ? '투입 중…' : '가공 투입'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
