'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { formatIntKo } from '@/lib/number-format';
import { formatSpecKgMisu, formatSpec, parseSpecKg } from '@/lib/spec-display';
import {
  fetchLotLifecycle,
  type LifecycleEvent,
  type LifecycleEventType,
  type LotCostInfo,
  type LotLifecycleData,
} from '@/app/actions/admin/master-lot-timeline';
import { listMaterials, type Material } from '@/app/actions/admin/master-materials';
import { MATERIAL_SECTIONS } from '@/lib/material-sections';

// 한 이동은 보내는 LOT의 '이동 출고'(−)와 받는 LOT의 '이동 입고'(+) 두 줄로 표시 →
// 각 LOT의 잔여재고를 통장처럼 추적. LOT 전이(원본→신규)는 본문에 표기.
const EVENT_LABEL: Record<LifecycleEventType, string> = {
  inbound: '입고',
  'transfer-in': '이동 입고',
  'transfer-out': '이동 출고',
  outbound: '출고',
};

const EVENT_COLOR: Record<LifecycleEventType, string> = {
  inbound: 'bg-blue-100 text-blue-700',
  'transfer-in': 'bg-emerald-100 text-emerald-700',
  'transfer-out': 'bg-amber-100 text-amber-700',
  outbound: 'bg-red-100 text-red-700',
};

const EVENT_ICON: Record<LifecycleEventType, typeof ArrowDownTrayIcon> = {
  inbound: ArrowDownTrayIcon,
  'transfer-in': ArrowsRightLeftIcon,
  'transfer-out': ArrowsRightLeftIcon,
  outbound: ShoppingCartIcon,
};

export default function LotTimelinePage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<LotLifecycleData | null>(null);
  const [searched, setSearched] = useState(false);
  // 판매원가 계산기용 — 활성 부자재·경비 항목 (LOT과 무관, 1회 로드)
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace('/login');
      return;
    }
    setWorkerId(session.workerId);
  }, [router]);

  useEffect(() => {
    if (!workerId) return;
    void (async () => {
      const res = await listMaterials(workerId);
      if (res.success) setMaterials(res.data.filter((m) => m.active));
    })();
  }, [workerId]);

  const runSearch = useCallback(
    async (raw: string) => {
      if (!workerId) return;
      const q = raw.trim();
      if (!q) {
        toast('LOT번호를 입력하세요.', 'error');
        return;
      }
      setIsLoading(true);
      setData(null);
      const result = await fetchLotLifecycle(workerId, q);
      setIsLoading(false);
      setSearched(true);
      if (result.success) setData(result.data);
      else toast(`조회 실패: ${result.error}`, 'error');
    },
    [workerId],
  );

  const handleSearch = () => void runSearch(query);

  // 재고 조회 행 클릭으로 ?lot= 가 넘어오면 자동 조회 — drill-down 진입점.
  useEffect(() => {
    if (!workerId) return;
    const lot = new URLSearchParams(window.location.search).get('lot');
    if (lot && lot.trim()) {
      setQuery(lot);
      void runSearch(lot);
    }
  }, [workerId, runSearch]);

  if (!workerId) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 min-w-0">
      <div className="mb-6">
        <h1 className="text-[22px] font-black text-gray-900 tracking-tight">LOT 생애주기</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          LOT번호로 입고 → 이동 → 출고 흐름을 시간순으로 조회합니다.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="예: 260417-MC1-11-26-0001"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          className="px-6 py-2.5 bg-[#3182F6] text-white font-bold text-[14px] rounded-xl shadow-sm hover:bg-[#1c6ce0] active:scale-95 transition-all disabled:bg-blue-300"
        >
          {isLoading ? '조회 중...' : '조회'}
        </button>
      </div>

      {isLoading && (
        <div className="py-20 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && searched && !data && (
        <div className="py-12 bg-white rounded-2xl border border-gray-100 text-center">
          <p className="font-bold text-gray-500">해당 LOT번호를 찾을 수 없습니다.</p>
        </div>
      )}

      {!isLoading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* 좌: 재고 정보 + 재고원가 + 판매원가 (요약 카드 묶음) */}
          <div className="space-y-4">
            {/* 재고 정보 — 절반 폭에 맞춰 세로 구성(식별 정보 → 구분선 → 수량/상태) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div>
                <p className="font-black text-[18px] text-gray-900">
                  {data.lotNumber}
                </p>
                <p className="text-[14px] font-bold text-gray-900 mt-1">
                  {data.productName || '(품목명 없음)'}
                </p>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  {formatSpecKgMisu(data.spec, data.misu) || '규격 없음'}
                  {data.firstInboundDate && (
                    <span className="ml-3">최초입고 {data.firstInboundDate}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-5 mt-4 pt-4 border-t border-gray-100">
                <Stat label="입고수량" value={`${formatIntKo(data.initialQty)}박스`} />
                <Stat
                  label="현재 재고"
                  value={`${formatIntKo(data.currentStockQty)}박스`}
                  highlight={data.currentStockQty > 0}
                />
                <span
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${statusColor(data.approvalStatus)}`}
                >
                  {data.approvalStatus || '-'}
                </span>
              </div>
            </div>

            {/* 재고원가 (오늘 기준 박스당 + 현재 재고 평가액) */}
            <CostCard cost={data.cost} stockQty={data.currentStockQty} />

            {/* 판매원가 (계산기) — 재고원가 + 선택 부자재·경비. 폭은 재고원가와 동일(좌측 칸). */}
            <SalePriceCard
              baseCostPerBox={data.cost.totalPerBox}
              hasBase={data.cost.hasData}
              stockQty={data.currentStockQty}
              spec={data.spec}
              materials={materials}
            />
          </div>

          {/* 우: 이벤트 타임라인 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-[14px] font-black text-gray-800">
                이벤트 ({data.events.length}건)
              </p>
            </div>
            {data.events.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-bold text-gray-400">기록된 이벤트가 없습니다.</p>
              </div>
            ) : (
              <ol className="p-5 space-y-3">
                {data.events.map((ev, i) => {
                  // 입고·이동 입고 = 새 재고(LOT)가 생성되는 순간 → 직전에 구분선으로 세대 경계 표시.
                  const isBirth = ev.type === 'inbound' || ev.type === 'transfer-in';
                  return (
                    <Fragment key={`${ev.recordId}-${i}`}>
                      {isBirth && <GenerationDivider event={ev} first={i === 0} />}
                      <EventItem
                        event={ev}
                        currentLot={data.lotNumber}
                        isLast={i === data.events.length - 1}
                      />
                    </Fragment>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** 원가 표시 — 반올림 후 천단위 콤마 (formatIntKo는 trunc이므로 round 선행) */
function won(n: number): string {
  return formatIntKo(Math.round(n));
}

/**
 * 판매원가 계산기 — 재고원가(박스당) + 선택한 부자재·경비(박스당) 합.
 * 선택은 저장하지 않는 인터랙티브 계산(계산기형). 운임·필렛 단위는 추후.
 */
function SalePriceCard({
  baseCostPerBox,
  hasBase,
  stockQty,
  spec,
  materials,
}: {
  baseCostPerBox: number;
  hasBase: boolean;
  stockQty: number;
  spec: string;
  materials: Material[];
}) {
  // 섹션별 단일 선택 (materialId | '') — 포장은 보통 박스 1종·아이스팩 1종.
  const [picked, setPicked] = useState<Record<string, string>>({});

  const base = hasBase ? baseCostPerBox : 0;
  const byId = new Map(materials.map((m) => [m.id, m]));
  const chosen = MATERIAL_SECTIONS.map((s) => byId.get(picked[s] ?? '')).filter(
    (m): m is Material => !!m,
  );
  const addOn = chosen.reduce((sum, m) => sum + m.price, 0);
  const salePerBox = base + addOn;
  // kg단가 환산 — 일단 규격(박스당 kg)으로 나눔. (아이스팩·박스 무게 차감은 추후)
  const kgPerBox = parseSpecKg(spec);
  const salePerKg = kgPerBox ? salePerBox / kgPerBox : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div>
        {/* 위: 결과 (영수증식 분해) */}
        <div className="p-5">
          <p className="text-[11px] font-bold text-gray-400">판매원가</p>
          <p className="mt-0.5 text-[28px] font-black leading-tight text-gray-900">
            {won(salePerBox)}
            <span className="ml-1 text-[14px] font-bold text-gray-400">원 / 박스</span>
          </p>
          {salePerKg != null ? (
            <p className="mt-0.5 text-[15px] font-bold text-[#3182F6]">
              {won(salePerKg)}
              <span className="font-medium text-gray-400"> 원 / kg</span>
              <span className="ml-1.5 text-[11px] font-medium text-gray-400">
                규격 {formatSpec(spec)} 기준
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-[12px] text-gray-400">규격이 없어 kg단가 환산 불가</p>
          )}

          <div className="mt-3 text-[13px]">
            <div className="flex justify-between py-0.5">
              <span className="text-gray-500">재고원가</span>
              <span className="tabular-nums text-gray-700">
                {hasBase ? `${won(base)}원` : '—'}
              </span>
            </div>
            {chosen.map((m) => (
              <div key={m.id} className="flex justify-between py-0.5">
                <span className="min-w-0 truncate text-gray-500">
                  <span className="mr-1 text-gray-300">{m.section}</span>
                  {m.name}
                </span>
                <span className="ml-2 shrink-0 tabular-nums text-gray-700">
                  +{won(m.price)}원
                </span>
              </div>
            ))}
            {stockQty > 0 && (
              <div className="mt-1.5 flex justify-between border-t border-gray-100 pt-1.5">
                <span className="text-gray-500">× 재고 {formatIntKo(stockQty)}박스</span>
                <span className="tabular-nums font-bold text-gray-800">
                  {won(salePerBox * stockQty)}원
                </span>
              </div>
            )}
          </div>

          {!hasBase && (
            <p className="mt-2 text-[12px] text-amber-600">
              재고원가 없음 — 부자재 합계만 반영됩니다.
            </p>
          )}
        </div>

        {/* 아래: 선택 (섹션별 드롭다운 — 클릭해서 고름) */}
        <div className="border-t border-gray-100 bg-gray-50/60 p-5">
          <p className="mb-3 text-[11px] font-bold text-gray-400">부자재·경비 선택</p>
          {materials.length === 0 ? (
            <p className="text-[12px] text-gray-400">
              활성 항목이 없습니다.{' '}
              <Link
                href="/admin/master/materials"
                className="font-medium text-[#3182F6] hover:underline"
              >
                마스터에서 등록 →
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              {MATERIAL_SECTIONS.map((section) => {
                const rows = materials.filter((m) => m.section === section);
                const empty = rows.length === 0;
                return (
                  <label key={section} className="flex flex-col gap-1">
                    <span className="text-[12px] font-bold text-gray-500">{section}</span>
                    <select
                      value={picked[section] ?? ''}
                      disabled={empty}
                      onChange={(e) =>
                        setPicked((p) => ({ ...p, [section]: e.target.value }))
                      }
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-transparent focus:ring-2 focus:ring-[#3182F6] disabled:bg-gray-100 disabled:text-gray-300"
                    >
                      <option value="">{empty ? '항목 없음' : '선택 안 함'}</option>
                      {rows.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} · {won(m.price)}원
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CostCard({ cost, stockQty }: { cost: LotCostInfo; stockQty: number }) {
  if (!cost.hasData) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="text-[13px] font-bold text-gray-400">
          원가 정보가 없습니다 (수매가·보관비 미입력 LOT).
        </p>
      </div>
    );
  }

  const rows: { label: string; value: number; title?: string }[] = [
    { label: '수매가', value: cost.purchasePerBox },
    {
      label: `냉장료 (${cost.daysHeld}일)`,
      value: cost.refrigerationPerBox,
      title:
        '현 보관처 입고일(이동 LOT은 이동입고일)부터 오늘까지. 재고 조회의 보관일수(최초입고 기준)와 다를 수 있음.',
    },
    { label: '입출고비', value: cost.inOutPerBox },
    { label: '노조비', value: cost.unionPerBox },
    { label: '동결비', value: cost.freezePerBox },
  ];
  // 이월비용(전 보관처)은 이동된 LOT에만 발생 → 0이면 줄을 숨겨 일반 LOT 화면을 단순하게.
  if (cost.carriedPerBox > 0) {
    rows.push({ label: '이월비용 (전 보관처)', value: cost.carriedPerBox });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        {/* 좌: 박스당 원가 + 분해 */}
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-gray-400">재고원가 (오늘 기준)</p>
          <p className="text-[22px] font-black text-gray-900 mt-0.5">
            {won(cost.totalPerBox)}
            <span className="text-[14px] font-bold text-gray-400 ml-1">원/박스</span>
          </p>
          <ul className="mt-3 space-y-1">
            {rows.map((r) => (
              <li
                key={r.label}
                className="flex items-center justify-between gap-8 text-[13px]"
              >
                <span className="text-gray-500" title={r.title}>· {r.label}</span>
                <span className="font-bold text-gray-700 tabular-nums">
                  {won(r.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 우: 현재 재고 평가액 */}
        <div className="text-right">
          <p className="text-[11px] font-bold text-gray-400">
            평가액 (재고 {formatIntKo(stockQty)}박스)
          </p>
          <p
            className={`text-[22px] font-black mt-0.5 ${
              stockQty > 0 ? 'text-[#3182F6]' : 'text-gray-300'
            }`}
          >
            {won(cost.stockValuation)}
            <span className="text-[14px] font-bold text-gray-400 ml-1">원</span>
          </p>
          {stockQty <= 0 && (
            <p className="text-[12px] font-bold text-gray-400 mt-1">소진</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 세대 구분선 — 입고/이동 입고로 "새 재고(LOT)"가 생성되는 지점에 표시.
 * 조상 LOT 체인이 한 타임라인에 섞여 보이므로, LOT번호가 바뀌는 경계를 한눈에 읽게 한다.
 */
function GenerationDivider({ event, first }: { event: LifecycleEvent; first: boolean }) {
  const isTransfer = event.type === 'transfer-in';
  // 이동 입고면 신규 LOT번호, 일반 입고(루트)면 이 LOT번호.
  const lotLabel = (isTransfer ? event.toLot : '') || event.lotNumber;
  const sub = isTransfer ? '이동 입고로 신규 LOT 생성' : '신규 입고로 LOT 생성';
  return (
    <li className={`flex items-center gap-2.5 ${first ? '' : 'pt-1'}`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
          isTransfer ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
        }`}
      >
        <span>{isTransfer ? '🔁' : '📦'}</span>
        {lotLabel && <span>{lotLabel}</span>}
        <span className="opacity-70">· {sub}</span>
      </span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
    </li>
  );
}

function EventItem({
  event,
  currentLot,
  isLast,
}: {
  event: LifecycleEvent;
  currentLot: string;
  isLast: boolean;
}) {
  const Icon = EVENT_ICON[event.type];
  const isTransfer = event.type === 'transfer-in' || event.type === 'transfer-out';
  // 입고·출고가 다른 LOT의 기록이면(=이동 전 원본 LOT) 어느 LOT인지 배지로 표시.
  // 이동 이벤트는 본문에 '원본LOT → 신규LOT' 전이를 직접 보여주므로 배지 생략.
  const showLotBadge = !isTransfer && !!event.lotNumber && event.lotNumber !== currentLot;
  // 방향 부호: 들어오면 +파랑(입고·이동 입고), 나가면 −빨강(출고·이동 출고).
  const isIncrease = event.type === 'inbound' || event.type === 'transfer-in';
  const sign = isIncrease ? '+' : '−';
  const qtyColor = isIncrease ? 'text-[#3182F6]' : 'text-red-500';
  // 보관처 동일 이동(예: 한라→한라)은 화살표 없이 한 번만 표기.
  const sameStorage = !!event.storageFrom && event.storageFrom === event.storageTo;
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center pt-1">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center ${EVENT_COLOR[event.type]}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        {!isLast && <div className="flex-1 w-px bg-gray-200 mt-1" />}
      </div>
      <div className="flex-1 bg-gray-50 rounded-xl p-4 mb-1">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-black ${EVENT_COLOR[event.type]}`}
            >
              {EVENT_LABEL[event.type]}
            </span>
            <span className="text-[14px] font-bold text-gray-900">
              {event.date || '날짜 없음'}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${statusColor(event.approvalStatus)}`}
            >
              {event.approvalStatus || '-'}
            </span>
            {showLotBadge && (
              <span
                className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-500"
                title="이동 전(원본) LOT의 기록"
              >
                LOT {event.lotNumber}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className={`text-[14px] font-black tabular-nums ${qtyColor}`}>
              {sign}
              {formatIntKo(event.qty)}박스
            </span>
            {event.balanceAfter != null && (
              <span className="text-[12px] font-bold text-gray-900 tabular-nums mt-0.5">
                잔여 {formatIntKo(event.balanceAfter)}박스
              </span>
            )}
          </div>
        </div>
        <div className="text-[12px] text-gray-600 space-y-0.5">
          {/* 이동: LOT 전이 (원본 → 신규) — 이동 사건의 핵심 정보 */}
          {isTransfer && (event.fromLot || event.toLot) && (
            <p className="flex items-center gap-1.5 font-bold text-gray-700">
              {event.fromLot && <span>{event.fromLot}</span>}
              {event.fromLot && event.toLot && (
                <ArrowRightIcon className="w-3 h-3 text-gray-400" />
              )}
              {event.toLot && <span>{event.toLot}</span>}
            </p>
          )}
          {/* 보관처 (동일하면 한 번만, 다르면 화살표) */}
          {(event.storageFrom || event.storageTo) &&
            (sameStorage ? (
              <p>{event.storageTo}</p>
            ) : (
              <p className="flex items-center gap-1.5">
                {event.storageFrom && <span>{event.storageFrom}</span>}
                {event.storageFrom && event.storageTo && (
                  <ArrowRightIcon className="w-3 h-3 text-gray-400" />
                )}
                {event.storageTo && (
                  <span className="font-bold">{event.storageTo}</span>
                )}
              </p>
            ))}
          {event.buyer && <p>판매처: {event.buyer}</p>}
          {event.workerName && <p>작업자: {event.workerName}</p>}
          {event.pdfUrl && (
            <a
              href={event.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-1 text-[12px] font-bold text-[#3182F6] hover:underline"
            >
              PDF 열기 →
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400">{label}</p>
      <p
        className={`text-[15px] font-black ${highlight ? 'text-[#3182F6]' : 'text-gray-700'}`}
      >
        {value}
      </p>
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case '승인 완료':
      return 'bg-green-100 text-green-700';
    case '승인 대기':
      return 'bg-[#3182F6]/10 text-[#3182F6]';
    case '반려':
      return 'bg-gray-200 text-gray-500';
    case '취소':
      return 'bg-red-50 text-red-500';
    default:
      return 'bg-gray-100 text-gray-400';
  }
}
