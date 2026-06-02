'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatIntKo } from '@/lib/number-format';
import { formatSpec, formatMisu } from '@/lib/spec-display';
import type { Lot } from '@/app/actions/admin/master-lots';

/**
 * 재고장 인쇄 화면 (A4) — 재고 조회에서 다중선택 후 넘어오는 인쇄 전용 페이지.
 *
 * - /admin/* 라 권한 게이트(AdminAuthGate)는 받지만, master 레이아웃(사이드바) 밖이라
 *   인쇄에 깨끗하다.
 * - 선택 데이터는 localStorage(LEDGER_KEY)로 핸드오프받는다(새 탭 열림 → sessionStorage
 *   대신 localStorage라야 안정적으로 공유됨).
 * - 내용은 "현재 보유 스냅샷": 선택 LOT들의 수량·박스당 판매원가·평가액 + 합계, 기준일.
 */

const LEDGER_KEY = 'seaerp:ledger-print';

type LedgerPayload = { asOf: string; lots: Lot[] };

export default function LedgerPrintPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<LedgerPayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [printedAt, setPrintedAt] = useState('');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LEDGER_KEY);
      if (raw) setPayload(JSON.parse(raw) as LedgerPayload);
    } catch {
      /* 무시 — 아래 빈 화면 안내 */
    }
    // 출력 일시(인쇄 시점) — 서울 기준 날짜·시각.
    setPrintedAt(
      new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date()),
    );
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  if (!payload || payload.lots.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="font-bold text-gray-500">재고장 데이터가 없습니다.</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 bg-[#191F28] text-white font-bold text-[14px] rounded-xl active:scale-95 transition-transform"
        >
          뒤로
        </button>
      </div>
    );
  }

  const { asOf, lots } = payload;
  const totalQty = lots.reduce((s, l) => s + l.stockQty, 0);
  const totalVal = lots.reduce((s, l) => s + l.valuation, 0);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* 화면 전용 툴바 — 인쇄 시 숨김 */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <p className="text-[14px] font-black text-gray-800">재고장 미리보기</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#3182F6] text-white font-bold text-[14px] rounded-xl shadow-sm hover:bg-[#1c6ce0] active:scale-95 transition-all"
          >
            <PrinterIcon className="w-5 h-5" />
            인쇄
          </button>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold text-[14px] rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
          >
            <XMarkIcon className="w-5 h-5" />
            닫기
          </button>
        </div>
      </div>

      {/* 재고장 본문 (A4) */}
      <div className="ledger-doc mx-auto max-w-[1100px] px-10 py-8">
        <div className="flex items-end gap-4 border-b-2 border-gray-900 pb-3">
          <p className="flex-1 text-[12px] font-bold text-gray-500">출력 {printedAt}</p>
          <h1 className="text-[26px] font-black tracking-tight text-center">재고장</h1>
          <p className="flex-1 text-right text-[13px] font-bold text-gray-600">
            기준일 {asOf} · 총 {lots.length}건
          </p>
        </div>

        <table className="w-full mt-5 text-[12px] border-collapse">
          <thead>
            <tr className="border-b border-gray-300 text-center text-gray-500">
              <th className="py-2 pr-2 font-bold text-left">LOT번호</th>
              <th className="py-2 px-2 font-bold">품목</th>
              <th className="py-2 px-2 font-bold">규격</th>
              <th className="py-2 px-2 font-bold">미수</th>
              <th className="py-2 px-2 font-bold">원산지</th>
              <th className="py-2 px-2 font-bold">보관처</th>
              <th className="py-2 px-2 font-bold text-right">보관일수</th>
              <th className="py-2 px-2 font-bold text-right">재고(박스)</th>
              <th className="py-2 px-2 font-bold text-right">박스당 수매가</th>
              <th className="py-2 px-2 font-bold text-right">박스당 판매원가</th>
              <th className="py-2 pl-2 font-bold text-right">평가액</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((l) => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-1.5 pr-2 font-bold">{l.lotNumber || '-'}</td>
                <td className="py-1.5 px-2 text-center">{l.productName || '-'}</td>
                <td className="py-1.5 px-2 text-center text-gray-600">{formatSpec(l.spec)}</td>
                <td className="py-1.5 px-2 text-center text-gray-600">{formatMisu(l.misu)}</td>
                <td className="py-1.5 px-2 text-center text-gray-600">{l.origin || '-'}</td>
                <td className="py-1.5 px-2 text-center text-gray-600">{l.storageName || '-'}</td>
                <td className="py-1.5 px-2 text-right tabular-nums text-gray-600">
                  {l.firstInboundDate ? `${formatIntKo(l.daysHeld)}일` : '-'}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums">{formatIntKo(l.stockQty)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums text-gray-600">
                  {l.purchasePrice > 0 ? formatIntKo(Math.round(l.purchasePrice)) : '-'}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums">
                  {l.costPerBox > 0 ? formatIntKo(Math.round(l.costPerBox)) : '-'}
                </td>
                <td className="py-1.5 pl-2 text-right tabular-nums font-bold">
                  {l.costPerBox > 0 ? formatIntKo(l.valuation) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-900 font-black">
              <td className="py-2 pr-2" colSpan={6}>
                합계
              </td>
              <td className="py-2 px-2"></td>
              <td className="py-2 px-2 text-right tabular-nums">{formatIntKo(totalQty)}</td>
              <td className="py-2 px-2"></td>
              <td className="py-2 px-2"></td>
              <td className="py-2 pl-2 text-right tabular-nums">{formatIntKo(totalVal)}원</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 text-[11px] text-gray-400">
          ※ 박스당 판매원가·평가액은 기준일({asOf}) 시점 누적 비용(매입가 + 보관비)으로 산정한
          관리회계상 추정치입니다.
        </p>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .ledger-doc { max-width: none; padding: 0; }
          @page {
            size: A4 landscape;
            margin: 12mm 12mm 16mm;
            @bottom-right {
              content: "페이지 " counter(page) " / " counter(pages);
              font-size: 10px;
              color: #9ca3af;
            }
          }
        }
      `}</style>
    </div>
  );
}
