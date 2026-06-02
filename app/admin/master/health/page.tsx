'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { formatIntKo } from '@/lib/number-format';
import {
  getHealthSummary,
  getInvalidRemainingInbounds,
  getLockedWorkers,
  getNegativeStockLots,
  getOutboundCostNullList,
  type HealthSummary,
  type InvalidRemainingInbound,
  type LockedWorker,
  type NegativeStockLot,
  type OutboundCostNullItem,
} from '@/app/actions/admin/master-health';

type DetailKey = 'neg' | 'inv' | 'cost' | 'lock';

export default function HealthMonitorPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState<DetailKey | null>(null);

  const [neg, setNeg] = useState<NegativeStockLot[] | null>(null);
  const [inv, setInv] = useState<InvalidRemainingInbound[] | null>(null);
  const [cost, setCost] = useState<OutboundCostNullItem[] | null>(null);
  const [lock, setLock] = useState<LockedWorker[] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<DetailKey | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace('/login');
      return;
    }
    setWorkerId(session.workerId);
  }, [router]);

  const loadSummary = useCallback(async () => {
    if (!workerId) return;
    setIsLoading(true);
    const result = await getHealthSummary(workerId);
    if (result.success) setSummary(result.data);
    else toast(`조회 실패: ${result.error}`, 'error');
    setIsLoading(false);
  }, [workerId]);

  useEffect(() => {
    if (workerId) void loadSummary();
  }, [workerId, loadSummary]);

  const refreshAll = () => {
    setSummary(null);
    setNeg(null);
    setInv(null);
    setCost(null);
    setLock(null);
    setOpen(null);
    void loadSummary();
  };

  const toggleDetail = async (key: DetailKey) => {
    if (!workerId) return;
    const next = open === key ? null : key;
    setOpen(next);
    if (!next) return;
    if (key === 'neg' && neg === null) {
      setLoadingDetail('neg');
      const r = await getNegativeStockLots(workerId);
      setLoadingDetail(null);
      if (r.success) setNeg(r.data);
      else toast(`조회 실패: ${r.error}`, 'error');
    } else if (key === 'inv' && inv === null) {
      setLoadingDetail('inv');
      const r = await getInvalidRemainingInbounds(workerId);
      setLoadingDetail(null);
      if (r.success) setInv(r.data);
      else toast(`조회 실패: ${r.error}`, 'error');
    } else if (key === 'cost' && cost === null) {
      setLoadingDetail('cost');
      const r = await getOutboundCostNullList(workerId);
      setLoadingDetail(null);
      if (r.success) setCost(r.data);
      else toast(`조회 실패: ${r.error}`, 'error');
    } else if (key === 'lock' && lock === null) {
      setLoadingDetail('lock');
      const r = await getLockedWorkers(workerId);
      setLoadingDetail(null);
      if (r.success) setLock(r.data);
      else toast(`조회 실패: ${r.error}`, 'error');
    }
  };

  if (!workerId) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-black text-gray-900 tracking-tight">음수·이상 LOT 모니터</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            운영 건강도 5지표 (모두 0이면 정상). 카드를 누르면 위반 레코드가 펼쳐집니다.
          </p>
        </div>
        <button
          onClick={refreshAll}
          disabled={isLoading}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-40"
        >
          <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {isLoading || !summary ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <HealthCard
            label="음수 재고 LOT"
            value={summary.negativeStockLots}
            hint="LOT.재고수량 < 0 — 차감 정합성 점검 필요"
            open={open === 'neg'}
            loading={loadingDetail === 'neg'}
            onClick={() => toggleDetail('neg')}
          />
          <HealthCard
            label="잔여수량 정합성 깨진 입고관리"
            value={summary.invalidRemainingInbound}
            hint="잔여수량 < 0 OR 잔여수량 > 입고수량"
            open={open === 'inv'}
            loading={loadingDetail === 'inv'}
            onClick={() => toggleDetail('inv')}
          />
          <HealthCard
            label="출고시점 비용 NULL"
            value={summary.outboundCostNull}
            hint="승인된 출고 중 출고시점 판매원가 비어있음 — E1 가드 실패 조기 발견"
            open={open === 'cost'}
            loading={loadingDetail === 'cost'}
            onClick={() => toggleDetail('cost')}
          />
          <HealthCard
            label="잠긴 PIN"
            value={summary.lockedWorkers}
            hint="활성 작업자 중 PIN 잠금 상태 — 작업자 마스터에서 잠금 해제 가능"
            open={open === 'lock'}
            loading={loadingDetail === 'lock'}
            onClick={() => toggleDetail('lock')}
          />
        </div>
      )}

      {/* 상세 패널 */}
      {open === 'neg' && neg && <NegativeStockTable items={neg} />}
      {open === 'inv' && inv && <InvalidRemainingTable items={inv} />}
      {open === 'cost' && cost && <OutboundCostNullTable items={cost} />}
      {open === 'lock' && lock && <LockedWorkersTable items={lock} />}
    </div>
  );
}

function HealthCard({
  label,
  value,
  hint,
  open,
  loading,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  open: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const bad = value > 0;
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-2xl border-2 transition-all ${
        open
          ? 'border-[#3182F6] bg-white'
          : bad
            ? 'border-red-200 bg-red-50/30 hover:border-red-300'
            : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {bad ? (
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
          ) : (
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          )}
          <p className="text-[13px] font-bold text-gray-700">{label}</p>
        </div>
        {open ? (
          <ChevronUpIcon className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
        )}
      </div>
      <p className={`text-[28px] font-black ${bad ? 'text-red-600' : 'text-green-600'}`}>
        {loading ? '...' : `${value}건`}
      </p>
      <p className="text-[11px] text-gray-500 mt-1">{hint}</p>
    </button>
  );
}

function NegativeStockTable({ items }: { items: NegativeStockLot[] }) {
  if (items.length === 0) return <EmptyDetail label="음수 재고 LOT" />;
  return (
    <DetailFrame title={`음수 재고 LOT (${items.length}건)`}>
      <table className="w-full text-[13px]">
        <thead className="bg-gray-50">
          <tr className="text-left font-bold text-gray-500 text-[12px]">
            <th className="px-4 py-3">LOT번호</th>
            <th className="px-4 py-3">품목</th>
            <th className="px-4 py-3">보관처</th>
            <th className="px-4 py-3">재고수량</th>
            <th className="px-4 py-3">승인상태</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t border-gray-100">
              <td className="px-4 py-3 font-bold text-blue-700">{it.lotNumber || '-'}</td>
              <td className="px-4 py-3 font-bold text-gray-900">{it.productName || '-'}</td>
              <td className="px-4 py-3 text-gray-600">{it.storageName || '-'}</td>
              <td className="px-4 py-3 font-bold text-red-600">
                {formatIntKo(it.stockQty)}박스
              </td>
              <td className="px-4 py-3 text-gray-600">{it.approvalStatus || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DetailFrame>
  );
}

function InvalidRemainingTable({ items }: { items: InvalidRemainingInbound[] }) {
  if (items.length === 0) return <EmptyDetail label="잔여수량 정합성 위반 입고관리" />;
  return (
    <DetailFrame title={`잔여수량 정합성 위반 입고관리 (${items.length}건)`}>
      <table className="w-full text-[13px]">
        <thead className="bg-gray-50">
          <tr className="text-left font-bold text-gray-500 text-[12px]">
            <th className="px-4 py-3">입고일</th>
            <th className="px-4 py-3">품목</th>
            <th className="px-4 py-3">입고수량</th>
            <th className="px-4 py-3">잔여수량</th>
            <th className="px-4 py-3">승인상태</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t border-gray-100">
              <td className="px-4 py-3 text-gray-700">{it.inboundDate || '-'}</td>
              <td className="px-4 py-3 font-bold text-gray-900">{it.productName || '-'}</td>
              <td className="px-4 py-3 text-gray-600">{formatIntKo(it.inboundQty)}</td>
              <td className="px-4 py-3 font-bold text-red-600">{formatIntKo(it.remaining)}</td>
              <td className="px-4 py-3 text-gray-600">{it.approvalStatus || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DetailFrame>
  );
}

function OutboundCostNullTable({ items }: { items: OutboundCostNullItem[] }) {
  if (items.length === 0) return <EmptyDetail label="출고시점 비용 NULL 출고" />;
  return (
    <DetailFrame title={`출고시점 비용 NULL 출고 (${items.length}건)`}>
      <table className="w-full text-[13px]">
        <thead className="bg-gray-50">
          <tr className="text-left font-bold text-gray-500 text-[12px]">
            <th className="px-4 py-3">출고일</th>
            <th className="px-4 py-3">품목</th>
            <th className="px-4 py-3">판매처</th>
            <th className="px-4 py-3">수량</th>
            <th className="px-4 py-3">출고시점 판매원가</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t border-gray-100">
              <td className="px-4 py-3 text-gray-700">{it.outboundDate || '-'}</td>
              <td className="px-4 py-3 font-bold text-gray-900">{it.productName || '-'}</td>
              <td className="px-4 py-3 text-gray-600">{it.buyer || '-'}</td>
              <td className="px-4 py-3 text-gray-600">{formatIntKo(it.qty)}박스</td>
              <td className="px-4 py-3 font-bold text-red-600">
                ₩{formatIntKo(it.salePriceSnapshot)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DetailFrame>
  );
}

function LockedWorkersTable({ items }: { items: LockedWorker[] }) {
  if (items.length === 0) return <EmptyDetail label="잠긴 PIN" />;
  return (
    <DetailFrame title={`잠긴 PIN (${items.length}건)`}>
      <table className="w-full text-[13px]">
        <thead className="bg-gray-50">
          <tr className="text-left font-bold text-gray-500 text-[12px]">
            <th className="px-4 py-3">작업자명</th>
            <th className="px-4 py-3">권한</th>
            <th className="px-4 py-3">실패 횟수</th>
            <th className="px-4 py-3">잠금 해제 예정</th>
            <th className="px-4 py-3">조치</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t border-gray-100">
              <td className="px-4 py-3 font-bold text-gray-900">{it.name || '-'}</td>
              <td className="px-4 py-3 text-gray-600">{it.role || '-'}</td>
              <td className="px-4 py-3 font-bold text-red-600">{it.pinFailCount}회</td>
              <td className="px-4 py-3 text-gray-600">
                {it.pinLockedUntil
                  ? new Date(it.pinLockedUntil).toLocaleString('ko-KR')
                  : '-'}
              </td>
              <td className="px-4 py-3">
                <Link
                  href="/admin/master/workers"
                  className="text-[12px] font-bold text-[#3182F6] hover:underline"
                >
                  작업자 마스터에서 해제 →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DetailFrame>
  );
}

function DetailFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="text-[14px] font-black text-gray-800">{title}</p>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function EmptyDetail({ label }: { label: string }) {
  return (
    <div className="mt-4 py-12 bg-white rounded-2xl border border-gray-100 text-center">
      <CheckCircleIcon className="w-10 h-10 text-green-500 mx-auto mb-2" />
      <p className="font-bold text-gray-700">{label} 위반 0건 — 정상</p>
    </div>
  );
}
