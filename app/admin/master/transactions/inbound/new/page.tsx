'use client';

// ─────────────────────────────────────────────────────────────────────────────
// 입고 PC 직접 등록 (관리자 전용)
//
// 모바일(작업자 신청 → 관리자 승인 2단계)과 달리, PC 입력자는 이미 승인 권한자다.
// 입력하는 관리자가 곧 결정자가 되어 한 번에 커밋한다(바로 승인 ON 기본).
// 백엔드는 createInboundDirect 하나만 호출 — 신규 도메인 로직 없음.
//
// 입력 위젯:
//  - 매입처·보관처·매입자: 타이핑 검색 → 자동완성 목록에서 선택(record 링크).
//    오타로 마스터가 중복 생성되지 않도록 "기존 항목 선택" 모델(모바일 카트와 동일).
//    새 항목이 필요하면 각 마스터 화면에서 먼저 추가.
//  - 품목명: 자유 텍스트 + 자동완성(기존 품목 재사용 유도). 신규명은 입고 시 품목마스터 자동 생성.
//  - 원산지: 국내산(기본)/일본산 칩 토글.
//
// 연속 입력: 저장 후 배치 공통 맥락(입고일·매입처·보관처·매입자·선박·원산지)은
// 유지하고 품목·규격·미수·수량·수매가·비고만 비워 같은 입고분을 빠르게 연타 입력.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, type RefObject } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import {
  getSeoulTodayISO,
  getSeoulTodaySlash,
  tryParseInboundDateInput,
} from '@/lib/inbound-date-input';
import {
  fromGroupedIntegerInput,
  fromGroupedOptionalIntInput,
} from '@/lib/number-format';
import { readSession, isSessionExpired, isAdminRole } from '@/lib/session';
import { toast } from '@/lib/toast';
import { createInboundDirect } from '@/app/actions/admin/master-transactions';
import {
  getProductOptions,
  getSupplierOptions,
  getStorageOptions,
} from '@/app/actions/inventory/inbound';
import { listWorkers } from '@/app/actions/admin/master-workers';

type AutoOption = { id: string; name: string };

const ORIGINS = ['국내산', '일본산'];

const labelClass = 'text-xs font-semibold text-gray-500';
const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#3182F6]';
const fieldClass = 'flex flex-col gap-1';

/** 텍스트 + 선택 id를 기존 옵션에서 해소 (정확 이름 일치를 안전망으로). */
function resolveId(text: string, id: string, options: AutoOption[]): string {
  if (id) return id;
  const t = text.trim().toLowerCase();
  if (!t) return '';
  const exact = options.find((o) => o.name.toLowerCase() === t);
  return exact ? exact.id : '';
}

/** 타이핑 검색 + 자동완성 콤보박스. */
function Autocomplete({
  value,
  onType,
  onPick,
  options,
  placeholder,
  inputRef,
  disabled,
  unresolved,
}: {
  value: string;
  onType: (t: string) => void;
  onPick: (o: AutoOption) => void;
  options: AutoOption[];
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  unresolved?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const q = value.trim().toLowerCase();
  const matches = (
    q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options
  ).slice(0, 8);

  const pick = (o: AutoOption) => {
    onPick(o);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        className={`${inputClass} ${unresolved ? 'border-amber-400 bg-amber-50/40' : ''}`}
        onChange={(e) => {
          onType(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setOpen(true);
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter' && open && matches[hi]) {
            e.preventDefault();
            pick(matches[hi]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {matches.map((o, i) => (
            <li key={o.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
                className={`block w-full px-3 py-1.5 text-left text-sm ${
                  i === hi
                    ? 'bg-blue-50 text-[#3182F6]'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {o.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function InboundCreatePage() {
  const productRef = useRef<HTMLInputElement>(null);

  const [authError, setAuthError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [suppliers, setSuppliers] = useState<AutoOption[]>([]);
  const [storages, setStorages] = useState<AutoOption[]>([]);
  const [workers, setWorkers] = useState<AutoOption[]>([]);
  const [products, setProducts] = useState<AutoOption[]>([]);

  // 배치 공통 맥락 (연속 입력 시 유지) — 링크 필드는 {text, id}
  const [bizDate, setBizDate] = useState(() => getSeoulTodaySlash());
  const [supplierText, setSupplierText] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [storageText, setStorageText] = useState('');
  const [storageId, setStorageId] = useState('');
  const [purchaserText, setPurchaserText] = useState('');
  const [purchaserId, setPurchaserId] = useState('');
  const [shipName, setShipName] = useState('');
  const [origin, setOrigin] = useState('국내산');

  // 품목별 입력 (연속 입력 시 비움)
  const [productName, setProductName] = useState('');
  const [spec, setSpec] = useState('');
  const [misu, setMisu] = useState('');
  const [qtyDisplay, setQtyDisplay] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [memo, setMemo] = useState('');

  const [commit, setCommit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastLot, setLastLot] = useState<string | null>(null);

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
        const [sup, sto, wk, prod] = await Promise.all([
          getSupplierOptions(),
          getStorageOptions(),
          listWorkers(s.workerId),
          getProductOptions(),
        ]);
        setSuppliers(sup);
        setStorages(sto);
        setProducts(prod.map((p) => ({ id: p.id, name: p.name })));
        if (wk.success) {
          setWorkers(
            wk.data.filter((w) => w.active).map((w) => ({ id: w.id, name: w.name })),
          );
        }
      } catch {
        toast('옵션을 불러오지 못했습니다.', 'error');
      }
    })();
    productRef.current?.focus();
  }, []);

  // 링크 필드 미해소 표시 (텍스트는 있는데 기존 항목에 없음)
  const supplierUnresolved =
    supplierText.trim() !== '' && resolveId(supplierText, supplierId, suppliers) === '';
  const storageUnresolved =
    storageText.trim() !== '' && resolveId(storageText, storageId, storages) === '';
  const purchaserUnresolved =
    purchaserText.trim() !== '' && resolveId(purchaserText, purchaserId, workers) === '';

  const submit = async () => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      toast('로그인이 필요합니다.', 'error');
      return;
    }
    if (!productName.trim()) {
      toast('품목명을 입력하세요.', 'error');
      return;
    }
    const parsed = tryParseInboundDateInput(bizDate);
    if (!parsed) {
      setBizDate(getSeoulTodaySlash());
      toast('입고일 형식이 올바르지 않아 오늘 날짜로 설정했습니다.', 'info');
    }
    const iso = parsed?.iso ?? getSeoulTodayISO();

    const qty = fromGroupedIntegerInput(qtyDisplay).value;
    if (!Number.isFinite(qty) || qty <= 0) {
      toast('입고 수량(박스)은 1 이상이어야 합니다.', 'error');
      return;
    }
    const price = fromGroupedOptionalIntInput(priceDisplay).value;

    // 링크 필드 해소 (선택 id 우선, 없으면 정확 이름 일치)
    const supRid = resolveId(supplierText, supplierId, suppliers);
    const stoRid = resolveId(storageText, storageId, storages);
    const purRid = resolveId(purchaserText, purchaserId, workers);

    setSubmitting(true);
    try {
      const res = await createInboundDirect({
        adminWorkerId: session.workerId,
        입고일자: iso,
        품목명: productName.trim(),
        규격: spec.trim(),
        미수: misu.trim(),
        '입고수량(BOX)': qty,
        수매가: price ?? undefined,
        원산지: origin,
        매입처RecordId: supRid || undefined,
        선박명: shipName.trim() || undefined,
        storageRecordId: stoRid || undefined,
        매입자RecordId: purRid || undefined,
        비고: memo.trim() || undefined,
        commit,
      });

      if (!res.success) {
        toast(res.message ?? '입고 등록에 실패했습니다.', 'error');
        return;
      }
      if (res.message) {
        toast(res.message, 'info');
      } else {
        const label = res.committed ? '입고 등록 완료' : '승인 대기로 저장';
        toast(
          `${label}${res.lotNumber ? ` · LOT ${res.lotNumber}` : ''}`,
          'success',
        );
      }
      setLastLot(res.lotNumber ?? null);

      // 연속 입력 — 품목별 필드만 비우고 배치 맥락은 유지
      setProductName('');
      setSpec('');
      setMisu('');
      setQtyDisplay('');
      setPriceDisplay('');
      setMemo('');
      productRef.current?.focus();
    } catch {
      toast('처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (authError) {
    return (
      <div className="p-6">
        <Link
          href="/admin/master/transactions/inbound"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          입고 이력
        </Link>
        <div className="mt-10 text-center text-sm text-gray-400">{authError}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5 p-6">
      {/* 헤더 */}
      <div>
        <Link
          href="/admin/master/transactions/inbound"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          입고 이력
        </Link>
        <h1 className="mt-2 text-xl font-bold text-[#191F28]">입고 등록</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          관리자가 직접 입고를 등록합니다. ‘바로 승인’이 켜져 있으면 입력 즉시
          재고·LOT가 생성되고 입고증이 발행됩니다.
        </p>
      </div>

      {/* 입력 카드 */}
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        {/* 배치 공통 맥락 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className={fieldClass}>
            <span className={labelClass}>입고일</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="YYYY/MM/DD"
              className={inputClass}
              value={bizDate}
              onChange={(e) => setBizDate(e.target.value)}
              autoComplete="off"
            />
          </label>
          <div className={fieldClass}>
            <span className={labelClass}>매입처</span>
            <Autocomplete
              value={supplierText}
              onType={(t) => {
                setSupplierText(t);
                setSupplierId('');
              }}
              onPick={(o) => {
                setSupplierText(o.name);
                setSupplierId(o.id);
              }}
              options={suppliers}
              placeholder="검색 후 선택"
              disabled={!ready}
              unresolved={supplierUnresolved}
            />
          </div>
          <div className={fieldClass}>
            <span className={labelClass}>보관처</span>
            <Autocomplete
              value={storageText}
              onType={(t) => {
                setStorageText(t);
                setStorageId('');
              }}
              onPick={(o) => {
                setStorageText(o.name);
                setStorageId(o.id);
              }}
              options={storages}
              placeholder="검색 후 선택"
              disabled={!ready}
              unresolved={storageUnresolved}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className={`${fieldClass} sm:col-span-2`}>
            <span className={labelClass}>품목</span>
            <Autocomplete
              value={productName}
              onType={setProductName}
              onPick={(o) => setProductName(o.name)}
              options={products}
              placeholder="품목명 입력 (기존 품목은 자동완성)"
              inputRef={productRef}
              disabled={!ready}
            />
          </div>
          <div className={fieldClass}>
            <span className={labelClass}>매입자</span>
            <Autocomplete
              value={purchaserText}
              onType={(t) => {
                setPurchaserText(t);
                setPurchaserId('');
              }}
              onPick={(o) => {
                setPurchaserText(o.name);
                setPurchaserId(o.id);
              }}
              options={workers}
              placeholder="비우면 입력자"
              disabled={!ready}
              unresolved={purchaserUnresolved}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className={fieldClass}>
            <span className={labelClass}>규격</span>
            <input
              type="text"
              placeholder="예: 11"
              className={inputClass}
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
            />
          </label>
          <label className={fieldClass}>
            <span className={labelClass}>미수</span>
            <input
              type="text"
              placeholder="예: 42/44"
              className={inputClass}
              value={misu}
              onChange={(e) => setMisu(e.target.value)}
            />
          </label>
          <div className={fieldClass}>
            <span className={labelClass}>원산지</span>
            <div className="flex gap-1.5">
              {ORIGINS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOrigin(o)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                    origin === o
                      ? 'border-[#3182F6] bg-blue-50 text-[#3182F6]'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className={fieldClass}>
            <span className={labelClass}>입고 수량 (박스)</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="예: 10"
              className={inputClass}
              value={qtyDisplay}
              onChange={(e) =>
                setQtyDisplay(fromGroupedIntegerInput(e.target.value).display)
              }
            />
          </label>
          <label className={fieldClass}>
            <span className={labelClass}>수매가 (박스당)</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="숫자만"
              className={inputClass}
              value={priceDisplay}
              onChange={(e) =>
                setPriceDisplay(
                  fromGroupedOptionalIntInput(e.target.value).display,
                )
              }
            />
          </label>
          <label className={fieldClass}>
            <span className={labelClass}>선박명</span>
            <input
              type="text"
              placeholder="선택"
              className={inputClass}
              value={shipName}
              onChange={(e) => setShipName(e.target.value)}
            />
          </label>
        </div>

        <label className={fieldClass}>
          <span className={labelClass}>비고</span>
          <textarea
            rows={2}
            className={`${inputClass} resize-y`}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            autoComplete="off"
          />
        </label>

        {(supplierUnresolved || storageUnresolved || purchaserUnresolved) && (
          <p className="text-xs text-amber-600">
            노란 칸은 목록에 없는 값입니다 — 자동완성에서 선택하거나, 해당 마스터에
            먼저 등록하세요. (선택 안 하면 비운 채로 저장됩니다)
          </p>
        )}
      </div>

      {/* 액션 줄 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#3182F6]"
            checked={commit}
            onChange={(e) => setCommit(e.target.checked)}
          />
          바로 승인 (끄면 ‘승인 대기’로만 저장)
        </label>
        <div className="flex items-center gap-3">
          {lastLot && (
            <span className="text-xs text-gray-400">
              직전 등록 LOT: <span className="font-mono">{lastLot}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || !ready}
            className="rounded-lg bg-[#3182F6] px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-40"
          >
            {submitting ? '처리 중…' : commit ? '등록 + 승인' : '승인 대기로 저장'}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        저장하면 입고일·매입처·보관처·매입자·선박·원산지는 유지되고 품목·규격·미수·수량·수매가·비고만
        비워집니다. 같은 입고분의 여러 품목을 빠르게 이어 입력할 수 있습니다.
      </p>
    </div>
  );
}
