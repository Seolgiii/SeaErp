'use client';

// ─────────────────────────────────────────────────────────────────────────────
// 지출 PC 직접 등록 (관리자 전용)
//
// 입고·출고·이동과 동일: 입력 관리자가 곧 결정자(바로 승인 ON 기본). 단건 폼 +
// 연속 입력(저장 후 지출일 유지, 나머지 비움). 영수증 첨부는 다음 이터레이션.
//
// 100만원 룰: ADMIN이 ≥100만원을 '바로 승인'하면 서버가 즉시 승인을 막아 '승인 대기'로
// 저장된다(MASTER만 즉시 승인). 안내 문구로 표시.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import {
  getSeoulTodayISO,
  getSeoulTodaySlash,
  tryParseInboundDateInput,
} from '@/lib/inbound-date-input';
import { fromGroupedIntegerInput } from '@/lib/number-format';
import { readSession, isSessionExpired, isAdminRole } from '@/lib/session';
import { toast } from '@/lib/toast';
import { createExpenseDirect } from '@/app/actions/admin/master-transactions';

const labelClass = 'text-xs font-semibold text-gray-500';
const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#3182F6]';
const fieldClass = 'flex flex-col gap-1';

export default function ExpenseCreatePage() {
  const titleRef = useRef<HTMLInputElement>(null);

  const [authError, setAuthError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [bizDate, setBizDate] = useState(() => getSeoulTodaySlash());
  const [title, setTitle] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [isCorpCard, setIsCorpCard] = useState(false);
  const [description, setDescription] = useState('');
  const [remarks, setRemarks] = useState('');

  const [commit, setCommit] = useState(true);
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
    titleRef.current?.focus();
  }, []);

  const submit = async () => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      toast('로그인이 필요합니다.', 'error');
      return;
    }
    if (!title.trim()) {
      toast('건명(항목)을 입력하세요.', 'error');
      return;
    }
    const amount = fromGroupedIntegerInput(amountDisplay).value;
    if (!Number.isFinite(amount) || amount <= 0) {
      toast('금액을 올바르게 입력하세요.', 'error');
      return;
    }
    const parsed = tryParseInboundDateInput(bizDate);
    if (!parsed) {
      setBizDate(getSeoulTodaySlash());
      toast('지출일 형식이 올바르지 않아 오늘 날짜로 설정했습니다.', 'info');
    }
    const iso = parsed?.iso ?? getSeoulTodayISO();

    setSubmitting(true);
    try {
      const res = await createExpenseDirect({
        adminWorkerId: session.workerId,
        date: iso,
        title: title.trim(),
        amount,
        description: description.trim() || undefined,
        remarks: remarks.trim() || undefined,
        isCorpCard,
        commit,
      });

      if (!res.success) {
        toast(res.message ?? '지출 등록에 실패했습니다.', 'error');
        return;
      }
      if (res.message) {
        toast(res.message, 'info');
      } else {
        const label = res.committed ? '지출 등록 완료' : '승인 대기로 저장';
        toast(label, 'success');
      }
      // 연속 입력 — 지출일은 유지, 나머지 비움
      setTitle('');
      setAmountDisplay('');
      setDescription('');
      setRemarks('');
      setIsCorpCard(false);
      titleRef.current?.focus();
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
          href="/admin/master/transactions/expense"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          지출 이력
        </Link>
        <div className="mt-10 text-center text-sm text-gray-400">{authError}</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5 p-6">
      {/* 헤더 */}
      <div>
        <Link
          href="/admin/master/transactions/expense"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          지출 이력
        </Link>
        <h1 className="mt-2 text-xl font-bold text-[#191F28]">지출 등록</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          관리자가 직접 지출을 등록합니다. ‘바로 승인’이 켜져 있으면 입력 즉시
          처리됩니다. (영수증 첨부는 추후 추가)
        </p>
      </div>

      {/* 입력 카드 */}
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className={fieldClass}>
            <span className={labelClass}>지출일</span>
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
          <label className={`${fieldClass} sm:col-span-2`}>
            <span className={labelClass}>건명 (항목)</span>
            <input
              ref={titleRef}
              type="text"
              placeholder="예: 사무용품 구입"
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className={fieldClass}>
            <span className={labelClass}>금액 (원)</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="숫자만"
              className={inputClass}
              value={amountDisplay}
              onChange={(e) =>
                setAmountDisplay(fromGroupedIntegerInput(e.target.value).display)
              }
            />
          </label>
          <label className="mt-6 inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#3182F6]"
              checked={isCorpCard}
              onChange={(e) => setIsCorpCard(e.target.checked)}
            />
            법인카드 사용
          </label>
        </div>

        <label className={fieldClass}>
          <span className={labelClass}>적요</span>
          <input
            type="text"
            placeholder="지출 내용"
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoComplete="off"
          />
        </label>

        <label className={fieldClass}>
          <span className={labelClass}>비고</span>
          <textarea
            rows={2}
            className={`${inputClass} resize-y`}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            autoComplete="off"
          />
        </label>
      </div>

      {/* 액션 */}
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
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting || !ready}
          className="rounded-lg bg-[#3182F6] px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-40"
        >
          {submitting ? '처리 중…' : commit ? '등록 + 승인' : '승인 대기로 저장'}
        </button>
      </div>

      <p className="text-xs text-gray-400">
        100만원 이상 지출의 즉시 승인은 MASTER 권한만 가능합니다. ADMIN이 등록하면
        ‘승인 대기’로 저장되어 MASTER 승인이 필요합니다.
      </p>
    </div>
  );
}
