'use client';

// ─────────────────────────────────────────────────────────────────────────────
// 작업 정산 등록 — 1단계: 사전기입(헤더). '작업 시작 시' 기입.
//   '다음 →' 누르면 임시저장(초안 생성) 후 2단계(/[id])로 이동.
//   ?id= 있으면 기존 초안 헤더 수정(자식 라인 보존).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { readSession, isSessionExpired, isAdminRole } from '@/lib/session';
import { toast } from '@/lib/toast';
import {
  saveWorkSettlementHeader,
  getWorkSettlementDetail,
} from '@/app/actions/admin/master-work-settlement';
import { listStorages, type Storage } from '@/app/actions/admin/master-storage';
import { listShips, type Ship } from '@/app/actions/admin/master-ships';
import { WS_CSS, TIMES, pn, fmt } from '../_shared';
import { Combo } from '../_combo';

/** 작업일 → YYYY-MM-DD */
function normDate(s: string): string {
  const t = s.trim().replace(/[.\s]/g, '-').replace(/\//g, '-');
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(t.replace(/-/g, ''));
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return s;
}
/** 시간 → HH:MM */
function normTime(s: string): string {
  const t = s.trim();
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(t);
  if (m) return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
  const d = t.replace(/\D/g, '');
  if (/^\d{3,4}$/.test(d)) return `${d.slice(0, d.length - 2).padStart(2, '0')}:${d.slice(-2)}`;
  return s;
}

export default function WorkSettlementStep1Page() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settlementId, setSettlementId] = useState('');

  const [storages, setStorages] = useState<Storage[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);

  const [work, setWork] = useState('');
  const [gu, setGu] = useState('');
  const [food, setFood] = useState(false);
  const [sundo, setSundo] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [ship, setShip] = useState('');
  const [eodae, setEodae] = useState('');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    const s = readSession();
    if (!s || isSessionExpired(s)) return setAuthError('로그인이 필요합니다.');
    if (!isAdminRole(s)) return setAuthError('관리자 전용 화면입니다.');
    setReady(true);
    const editId = new URLSearchParams(window.location.search).get('id') ?? '';
    void (async () => {
      const [st, sh] = await Promise.all([listStorages(s.workerId), listShips(s.workerId)]);
      const stList = st.success ? st.data : [];
      const shList = sh.success ? sh.data : [];
      setStorages(stList);
      setShips(shList);
      if (/^rec[a-zA-Z0-9]+$/.test(editId)) {
        const d = await getWorkSettlementDetail(s.workerId, editId);
        if (d.success) {
          const h = d.data.header;
          setSettlementId(d.data.id);
          setWork(stList.find((x) => x.id === h.workplaceId)?.name ?? '');
          setGu(h.fishingArea);
          setFood(h.hasFeed === 'O');
          setSundo(h.freshness);
          setDate(h.date);
          setStart(h.startTime);
          setEnd(h.endTime);
          setShip(shList.find((x) => x.id === h.shipId)?.name ?? '');
          setEodae(h.catchAmount ? fmt(h.catchAmount) : '');
          setMemo(h.memo);
        } else toast(d.error ?? '초안 조회 실패', 'error');
      }
    })();
  }, []);

  const next = async () => {
    const s = readSession();
    if (!s || isSessionExpired(s)) return toast('로그인이 필요합니다.', 'error');
    const d = normDate(date);
    if (!d.trim()) return toast('작업일을 입력하세요.', 'error');
    setSubmitting(true);
    try {
      const res = await saveWorkSettlementHeader(s.workerId, {
        settlementId: settlementId || undefined,
        date: d,
        workplaceId: storages.find((x) => x.name === work.trim())?.id || undefined,
        fishingArea: gu || undefined,
        hasFeed: food ? 'O' : 'X',
        freshness: sundo || undefined,
        shipId: ships.find((x) => x.name === ship.trim())?.id || undefined,
        startTime: normTime(start) || undefined,
        endTime: normTime(end) || undefined,
        catchAmount: pn(eodae) || undefined,
        memo: memo || undefined,
      });
      if (res.success) {
        toast(`사전기입 저장 (${res.data.no})`, 'success');
        router.push(`/admin/master/work-settlement/${res.data.settlementId}`);
      } else toast(res.error ?? '저장 실패', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (authError) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/admin/master/work-settlement" style={{ fontSize: 13, color: '#6A7480' }}>← 작업 정산</Link>
        <div style={{ marginTop: 40, textAlign: 'center', color: '#9AA4B0', fontSize: 14 }}>{authError}</div>
      </div>
    );
  }

  return (
    <div className="ws-page">
      <div className="page">
        <header>
          <Link href="/admin/master/work-settlement" className="backlink">← 작업 정산</Link>
          <div className="title-row"><h1>작업 정산 등록</h1></div>
          <div className="steps"><span className="on">① 사전기입</span><span className="sep">→</span><span>② 작업비 · 생산내역</span></div>
          <p className="lede">작업 <b>시작 시</b> 기입 항목입니다. 작성 후 <b>다음 →</b>을 누르면 임시저장되고, 정산서가 나온 뒤 <b>작업비·생산내역</b>을 이어서 채워 확정합니다.</p>
        </header>

        <section className="fields">
          <div className="f"><label>작업장</label><Combo value={work} onChange={setWork} options={storages.map((s) => s.name)} placeholder="예: 금능" /></div>
          <div className="f"><label>조업 해구</label><input value={gu} onChange={(e) => setGu(e.target.value)} placeholder="예: 110" /></div>
          <div className="f"><label>먹이유무</label>
            <label className="chk"><input type="checkbox" checked={food} onChange={(e) => setFood(e.target.checked)} /><span className="chk-box" /><span className="chk-txt">{food ? 'O' : 'X'}</span></label>
          </div>
          <div className="f"><label>선도</label><input value={sundo} onChange={(e) => setSundo(e.target.value)} placeholder="A / B / C" /></div>
          <div className="f"><label>작업일</label><input value={date} onChange={(e) => setDate(e.target.value)} onBlur={() => setDate(normDate(date))} placeholder="YYYY-MM-DD" /></div>
          <div className="f"><label>시작 ~ 종료시간</label>
            <div className="time-range">
              <Combo value={start} onChange={setStart} options={TIMES} startsWith blurFormat={normTime} placeholder="19:00" />
              <span className="tl">~</span>
              <Combo value={end} onChange={setEnd} options={TIMES} startsWith blurFormat={normTime} placeholder="04:00" />
            </div>
          </div>
          <div className="f"><label>선박명</label><Combo value={ship} onChange={setShip} options={ships.map((s) => s.name)} placeholder="예: 해금호" /></div>
          <div className="f"><label>어대금 <span className="dim">(원물 대금)</span></label><input value={eodae} onChange={(e) => setEodae(e.target.value)} onBlur={(e) => { const v = pn(e.target.value); if (v) setEodae(fmt(v)); }} placeholder="0" /></div>
          <div className="f"><label>비고</label><input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="—" /></div>
        </section>
        <p className="cap">작업 시작 시 기입</p>

        <div className="actions">
          <button className="btn primary" onClick={() => void next()} disabled={submitting || !ready}>{submitting ? '저장 중…' : '다음 → (임시저장)'}</button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: WS_CSS }} />
    </div>
  );
}
