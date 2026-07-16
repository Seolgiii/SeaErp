'use client';

// ─────────────────────────────────────────────────────────────────────────────
// 작업 정산 등록 — 2단계: 생산내역 → 작업비 → 요약·확정. '완료 후' 기입.
//   초안(헤더) 로드 → 생산내역(구분 합→작업비 수량 자동) → 작업비(지급처 선택 시 단가 자동)
//   → 실단가 = 수매단가 + 작업단가 → 임시저장 / 확정(생산내역별 입고·LOT 생성).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getSeoulTodayISO, tryParseInboundDateInput } from '@/lib/inbound-date-input';
import { readSession, isSessionExpired, isAdminRole } from '@/lib/session';
import { toast } from '@/lib/toast';
import {
  saveWorkSettlement,
  confirmWorkSettlement,
  getWorkSettlementDetail,
  getStorageBoxTypeFees,
  type SaveWorkSettlementInput,
} from '@/app/actions/admin/master-work-settlement';
import { listProducts, type Product } from '@/app/actions/admin/master-products';
import { listStorages, type Storage } from '@/app/actions/admin/master-storage';
import { listShips, type Ship } from '@/app/actions/admin/master-ships';
import {
  WS_CSS, BOX_INTERNAL, BOX_LABEL, USES, USE_LABEL, DANGA_WON_GROUPS, COMMISSION_RATE,
  pn, fmt, nid, dangaWon, computeWorkHours,
  defaultGroups, emptyProd, prodRowsFromLines, groupsFromCosts,
  buildFreezeRows, buildInoutRows, sumByBoxType, isFeeExemptUse,
  type CostRow, type CostGroup, type ProdRow, type StorageFee,
} from '../_shared';
import { Combo } from '../_combo';

type Hdr = {
  date: string; workplaceId: string; fishingArea: string; hasFeed: string; freshness: string;
  shipId: string; supplierId: string; startTime: string; endTime: string; catchAmount: number; memo: string;
};

export default function WorkSettlementStep2Page() {
  const router = useRouter();
  const params = useParams();
  const settlementId = String((params as { id?: string })?.id ?? '');

  const [authError, setAuthError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [no, setNo] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [storages, setStorages] = useState<Storage[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);

  const [hdr, setHdr] = useState<Hdr | null>(null);
  const [groups, setGroups] = useState<CostGroup[]>(() => defaultGroups());
  const [prod, setProd] = useState<ProdRow[]>(() => [emptyProd(), emptyProd()]);
  const [fees, setFees] = useState<Record<string, StorageFee>>({}); // 행선지 보관처 동결비·입출고비 단가 캐시

  useEffect(() => {
    const s = readSession();
    if (!s || isSessionExpired(s)) return setAuthError('로그인이 필요합니다.');
    if (!isAdminRole(s)) return setAuthError('관리자 전용 화면입니다.');
    setReady(true);
    void (async () => {
      const [pr, st, sh, d] = await Promise.all([
        listProducts(s.workerId), listStorages(s.workerId),
        listShips(s.workerId), getWorkSettlementDetail(s.workerId, settlementId),
      ]);
      const stList = st.success ? st.data : [];
      if (pr.success) setProducts(pr.data);
      setStorages(stList);
      if (sh.success) setShips(sh.data);
      if (!d.success) { toast(d.error ?? '정산 조회 실패', 'error'); return; }
      const destName = (id: string) => stList.find((x) => x.id === id)?.name ?? '';
      setHdr(d.data.header);
      setStatus(d.data.status);
      setNo(d.data.no);
      setProd(prodRowsFromLines(d.data.lines, destName));
      const g = groupsFromCosts(d.data.costs);
      // 수수료 편의: 비었으면 어대금 × 3.3% 자동 채움
      if (!d.data.costs.length && d.data.header.catchAmount > 0) {
        const fee = g.find((x) => x.name === '수수료');
        const row = fee?.rows.find((r) => r.name === '수수료');
        if (row && !row.cells[2]) row.cells[2] = fmt(Math.round(d.data.header.catchAmount * COMMISSION_RATE));
      }
      setGroups(g);
      setLoaded(true);
    })();
  }, [settlementId]);

  const editable = status === '임시저장' || status === '';

  // 구분(포장)별 박스수 합 — 두 벌.
  //   boxSums       = 전 용도 → 박스(포장재는 용도 무관하게 든다)
  //   boxSumsExempt = 원프로즌 제외 → 탈펜료(원프로즌은 통에 담겨 가니 팬에서 뺄 일이 없음)
  const boxSums = useMemo(() => sumByBoxType(prod), [prod]);
  const boxSumsExempt = useMemo(() => sumByBoxType(prod.filter((r) => !isFeeExemptUse(r.use))), [prod]);

  const costTotal = useMemo(() => groups.reduce((s, g) => s + g.rows.reduce((a, r) => a + pn(r.cells[2]), 0), 0), [groups]);
  const groupTotals = useMemo(() => Object.fromEntries(groups.map((g) => [g.name, g.rows.reduce((a, r) => a + pn(r.cells[2]), 0)])), [groups]);
  const boxTotal = useMemo(() => prod.reduce((s, r) => s + pn(r.qty), 0), [prod]);
  const unit = boxTotal ? Math.round(costTotal / boxTotal) : 0;
  const buyTotal = useMemo(() => prod.reduce((s, r) => s + pn(r.qty) * pn(r.price), 0), [prod]);

  // 행선지 보관처의 동결비·입출고비 단가 조회(캐시) — 생산내역 행선지가 바뀌면 새 보관처만 조회
  useEffect(() => {
    if (!loaded || !hdr) return;
    const s = readSession();
    if (!s) return;
    const need = new Set<string>();
    for (const r of prod) {
      const id = storages.find((x) => x.name === r.dest.trim())?.id;
      if (id && !(id in fees)) need.add(id);
    }
    if (!need.size) return;
    const iso = tryParseInboundDateInput(hdr.date)?.iso ?? getSeoulTodayISO();
    void (async () => {
      const got = await Promise.all(
        [...need].map(async (id) => {
          const res = await getStorageBoxTypeFees(s.workerId, id, iso);
          return res.success
            ? ([id, { name: res.data.storageName, inOutFee: res.data.inOutFee, freeze: res.data.freeze }] as const)
            : null;
        }),
      );
      const add: Record<string, StorageFee> = {};
      for (const e of got) if (e) add[e[0]] = e[1];
      if (Object.keys(add).length) setFees((prev) => ({ ...prev, ...add }));
    })();
  }, [prod, storages, fees, loaded, hdr]);

  // 생산내역 → 작업비 자동: 동결비·입출고비(행선지 산출) · 박스/탈펜료(구분별) · 작업장수수료/내피(총박스) · 수수료(매입액×3.3%)
  useEffect(() => {
    if (!loaded) return;
    const resolveId = (name: string) => storages.find((x) => x.name === name.trim())?.id ?? '';
    setGroups((prev) => prev.map((g) => {
      if (g.name === '동결비') return { ...g, rows: buildFreezeRows(prod, resolveId, fees) };
      if (g.name === '입출고비') return { ...g, rows: buildInoutRows(prod, resolveId, fees) };
      return {
        ...g,
        rows: g.rows.map((r) => {
          if (['박스', '탈펜료'].includes(g.name) && r.boxType && r.boxType in boxSums) {
            const cnt = (g.name === '탈펜료' ? boxSumsExempt : boxSums)[r.boxType];
            const c = [...r.cells] as CostRow['cells'];
            c[0] = cnt ? fmt(cnt) : '';
            if (c[0] && c[1]) c[2] = fmt(pn(c[0]) * pn(c[1]));
            return { ...r, cells: c };
          }
          if (r.name === '작업장수수료' || r.name === '내피') {
            const c = [...r.cells] as CostRow['cells'];
            c[0] = boxTotal ? fmt(boxTotal) : '';
            if (c[0] && c[1]) c[2] = fmt(pn(c[0]) * pn(c[1]));
            return { ...r, cells: c };
          }
          if (g.name === '수수료' && r.name === '수수료') {
            const c = [...r.cells] as CostRow['cells'];
            c[2] = buyTotal ? fmt(Math.round(buyTotal * COMMISSION_RATE)) : '';
            return { ...r, cells: c };
          }
          return r;
        }),
      };
    }));
  }, [prod, fees, boxSums, boxSumsExempt, boxTotal, buyTotal, storages, loaded]);

  const workHours = useMemo(() => (hdr ? computeWorkHours(hdr.startTime, hdr.endTime) : 0), [hdr]);

  // 여노임 — 작업시간은 비고에만 표기한다. 회수 칸은 사용자가 작업 인원수를 적는 곳이라 건드리지 않는다.
  // (작업시간은 금액 계산에만 곱해진다 → patchCost)
  useEffect(() => {
    if (!loaded || !workHours) return;
    setGroups((prev) => prev.map((g) => !g.rows.some((r) => r.hourly) ? g : {
      ...g, rows: g.rows.map((r) => r.hourly
        ? { ...r, cells: [r.cells[0], r.cells[1], r.cells[2], r.cells[3], `${workHours}시간 작업`] as CostRow['cells'] } : r),
    }));
  }, [loaded, workHours]);

  const patchCost = (gi: number, ri: number, ci: number, val: string) => {
    setGroups((prev) => prev.map((g, gx) => gx !== gi ? g : {
      ...g, rows: g.rows.map((r, rx) => {
        if (rx !== ri) return r;
        const c = [...r.cells] as CostRow['cells'];
        c[ci] = val;
        // 금액 = 회수 × 단가 (여노임은 × 작업시간). 단가를 직접 고쳐도 pn이 숫자만 읽어 그 값으로 재계산.
        // 여노임인데 작업시간이 없으면(mult=0) 자동 계산을 걸지 않는다 — 0원을 써 넣지 않기 위함.
        const mult = r.hourly ? workHours : 1;
        if ((ci === 0 || ci === 1) && c[0] && c[1] && mult) c[2] = fmt(pn(c[0]) * pn(c[1]) * mult);
        return { ...r, cells: c };
      }),
    }));
  };
  const patchCostName = (gi: number, ri: number, val: string) =>
    setGroups((prev) => prev.map((g, gx) => gx !== gi ? g : { ...g, rows: g.rows.map((r, rx) => rx !== ri ? r : { ...r, name: val }) }));
  const addCostRow = (gi: number) =>
    setGroups((prev) => prev.map((g, gx) => gx !== gi ? g : { ...g, rows: [...g.rows, { id: nid(), fixed: false, name: '', cells: ['', '', '', '', ''] }] }));
  const removeCostRow = (gi: number, ri: number) =>
    setGroups((prev) => prev.map((g, gx) => gx !== gi ? g : { ...g, rows: g.rows.filter((_, rx) => rx !== ri) }));

  const patchProd = (id: string, patch: Partial<ProdRow>) => setProd((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeProd = (id: string) => setProd((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  const destList = (use: string) =>
    use === '원물동결' ? storages.map((s) => s.name) : use === '원프로즌 가공' ? storages.filter((s) => s.kind === '가공공장').map((s) => s.name) : [];

  const buildPayload = (): SaveWorkSettlementInput | null => {
    if (!hdr) return null;
    const valid = prod.filter((r) => r.productId && pn(r.qty) > 0 && pn(r.price) > 0);
    if (valid.length === 0) { toast('생산내역에 품목·수량·수매단가를 입력하세요.', 'error'); return null; }
    const findStorage = (name: string) => storages.find((s) => s.name === name.trim())?.id;
    const costs = groups.flatMap((g) =>
      g.rows.filter((r) => pn(r.cells[2]) > 0).map((r) => ({
        group: g.name, itemName: r.name || g.name,
        count: pn(r.cells[0]) || undefined, unitPrice: pn(r.cells[1]) || undefined,
        amount: pn(r.cells[2]), payee: r.cells[3] || undefined, memo: r.cells[4] || undefined,
      })),
    );
    return {
      header: {
        settlementId,
        date: hdr.date, workplaceId: hdr.workplaceId || undefined, fishingArea: hdr.fishingArea || undefined,
        hasFeed: (hdr.hasFeed === 'O' ? 'O' : 'X'), freshness: hdr.freshness || undefined,
        shipId: hdr.shipId || undefined, supplierId: hdr.supplierId || undefined,
        startTime: hdr.startTime || undefined, endTime: hdr.endTime || undefined,
        catchAmount: hdr.catchAmount || undefined, memo: hdr.memo || undefined,
      },
      lines: valid.map((r) => ({
        productId: r.productId, productName: products.find((p) => p.id === r.productId)?.name,
        boxType: r.gubun || undefined, fatRatio: pn(r.fat) || undefined,
        spec: r.spec || undefined, misu: r.spec || undefined, weightKg: pn(r.weight) || undefined,
        quantity: pn(r.qty), purchaseUnitPrice: pn(r.price),
        usage: r.use || undefined, destinationId: findStorage(r.dest) || undefined, memo: r.memo || undefined,
      })),
      costs,
    };
  };

  const doSave = async () => {
    const s = readSession();
    if (!s || isSessionExpired(s)) return toast('로그인이 필요합니다.', 'error');
    const payload = buildPayload();
    if (!payload) return;
    setSubmitting(true);
    try {
      const res = await saveWorkSettlement(s.workerId, payload);
      if (res.success) toast('임시저장 완료', 'success');
      else toast(res.error ?? '임시저장 실패', 'error');
    } finally { setSubmitting(false); }
  };
  const doConfirm = async () => {
    const s = readSession();
    if (!s || isSessionExpired(s)) return toast('로그인이 필요합니다.', 'error');
    const payload = buildPayload();
    if (!payload) return;
    if (!confirm('확정하면 생산내역별로 재고(LOT)가 생성됩니다. 진행할까요?')) return;
    setSubmitting(true);
    try {
      const saved = await saveWorkSettlement(s.workerId, payload);
      if (!saved.success) { toast(saved.error ?? '저장 실패', 'error'); return; }
      const res = await confirmWorkSettlement(s.workerId, settlementId);
      if (res.success) { toast(`확정 완료 — LOT ${res.data.lotCount}개 생성`, 'success'); router.push('/admin/master/work-settlement'); }
      else toast(res.error ?? '확정 실패', 'error');
    } finally { setSubmitting(false); }
  };

  if (authError) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/admin/master/work-settlement" style={{ fontSize: 13, color: '#6A7480' }}>← 작업 정산</Link>
        <div style={{ marginTop: 40, textAlign: 'center', color: '#9AA4B0', fontSize: 14 }}>{authError}</div>
      </div>
    );
  }

  const usageCls = (v: string) => (v === '원물동결' ? 'u-frozen' : v === '원프로즌 가공' ? 'u-proc' : v === '생물' ? 'u-fresh' : 'u-none');
  const destPh = (v: string) => (v === '원물동결' ? '보관처' : v === '원프로즌 가공' ? '가공공장' : v === '생물' ? '판매처' : '-');
  const shipName = ships.find((x) => x.id === hdr?.shipId)?.name ?? '—';

  return (
    <div className="ws-page">
      <div className="page">
        <header>
          <Link href="/admin/master/work-settlement" className="backlink">← 작업 정산</Link>
          <div className="title-row"><h1>작업 정산 등록 {no ? `· ${no}` : ''}</h1></div>
          <div className="steps">
            <span>① 사전기입</span><span className="sep">→</span>
            <span className="on">② 작업비 · 생산내역</span><span className="sep">→</span>
            <Link href={`/admin/master/work-settlement/${settlementId}/split`}>③ 배분</Link>
          </div>
          <p className="lede">정산서 나온 뒤 <b>생산내역</b>과 <b>작업비</b>를 채웁니다. 생산내역 <b>구분</b>을 고르면 작업비 수량이 자동 합산되고, <b>지급처</b> 선택 시 동결비·입출고비 단가가 자동 채워집니다. <b>확정</b> 시 생산내역별 재고(LOT)가 생성됩니다.</p>
        </header>

        {/* 사전기입 요약 (읽기 전용) */}
        <div className="ctxbar">
          <div className="ci"><span className="ck">작업일</span><span className="cv">{hdr?.date || '—'}</span></div>
          <div className="ci"><span className="ck">선박</span><span className="cv">{shipName}</span></div>
          <div className="ci"><span className="ck">어대금</span><span className="cv">{hdr?.catchAmount ? `${fmt(hdr.catchAmount)}원` : '—'}</span></div>
          <div className="ci"><span className="ck">작업시간</span><span className="cv">{hdr ? `${hdr.startTime || '—'} ~ ${hdr.endTime || '—'}` : '—'}</span></div>
          <Link href={`/admin/master/work-settlement/new?id=${settlementId}`} className="edit">사전기입 수정</Link>
        </div>

        {status && status !== '임시저장' && (
          <p className="cap" style={{ color: '#8A5A00' }}>이 정산은 ‘{status}’ 상태입니다. 수정·확정할 수 없습니다.</p>
        )}

        {/* ① 생산내역 (위) */}
        <section className="wsblock">
          <div className="sec-title"><h2>생산내역</h2><span className="sub">품목·사이즈별 매입 · 구분(포장)으로 작업비 수량 자동 연동 · 용도 태그로 추적</span></div>
          <div className="table-wrap">
            <table id="prod">
              <colgroup><col style={{ width: 84 }} /><col style={{ width: 92 }} /><col style={{ width: 56 }} /><col style={{ width: 68 }} /><col style={{ width: 58 }} /><col style={{ width: 60 }} /><col style={{ width: 84 }} /><col style={{ width: 96 }} /><col style={{ width: 88 }} /><col style={{ width: 100 }} /><col style={{ width: 96 }} /><col style={{ width: 108 }} /><col style={{ width: 90 }} /><col style={{ width: 34 }} /></colgroup>
              <thead><tr>
                <th>품목명</th><th>구분</th><th>지방도</th><th>규격 <span className="dim">(미수)</span></th><th className="ni">중량 <span className="dim">(kg)</span></th><th className="ni">수량</th><th className="ni">수매단가</th>
                <th className="n">금액</th><th className="n">실단가</th><th className="n">실금액</th><th>용도</th><th>행선지 <span className="dim">(용도별)</span></th><th>비고</th><th />
              </tr></thead>
              <tbody>
                {prod.map((r) => {
                  const amt = pn(r.qty) * pn(r.price);
                  const real = pn(r.price) + unit;
                  const ramt = pn(r.qty) * real;
                  return (
                    <tr className="p-row" key={r.id}>
                      <td className="txt"><Combo value={r.name} placeholder="품목" options={products.map((p) => p.name)} onChange={(v) => {
                        const match = products.find((p) => p.name === v.trim());
                        patchProd(r.id, { name: v, productId: match?.id ?? '', spec: match && !r.spec ? (match.spec || r.spec) : r.spec });
                      }} /></td>
                      <td className="gubun"><select value={r.gubun} onChange={(e) => patchProd(r.id, { gubun: e.target.value })}>
                        <option value="">—</option>{BOX_INTERNAL.map((b) => <option key={b} value={b}>{BOX_LABEL[b]}</option>)}
                      </select></td>
                      <td className="pct-cell"><span className="pctw"><input className="pct-in" value={r.fat} onChange={(e) => patchProd(r.id, { fat: e.target.value })} placeholder="—" /><span className="pct">%</span></span></td>
                      <td className="txt"><input value={r.spec} onChange={(e) => patchProd(r.id, { spec: e.target.value })} placeholder="—" /></td>
                      <td className="n"><input value={r.weight} onChange={(e) => patchProd(r.id, { weight: e.target.value })} placeholder="—" /></td>
                      <td className="n"><input value={r.qty} onChange={(e) => patchProd(r.id, { qty: e.target.value })} onBlur={(e) => { const v = pn(e.target.value); if (v) patchProd(r.id, { qty: fmt(v) }); }} placeholder="0" /></td>
                      <td className="n"><input value={r.price} onChange={(e) => patchProd(r.id, { price: e.target.value })} onBlur={(e) => { const v = pn(e.target.value); if (v) patchProd(r.id, { price: fmt(v) }); }} placeholder="0" /></td>
                      <td className="auto">{r.price ? fmt(amt) : ''}</td>
                      <td className="auto">{r.price ? fmt(real) : ''}</td>
                      <td className="auto em">{r.price ? fmt(ramt) : ''}</td>
                      <td className="use"><select className={`p-use ${usageCls(r.use)}`} value={r.use} onChange={(e) => patchProd(r.id, { use: e.target.value, dest: '' })}>
                        <option value="">—</option>{USES.map((u) => <option key={u} value={u}>{USE_LABEL[u]}</option>)}
                      </select></td>
                      <td className="txt"><Combo value={r.dest} placeholder={destPh(r.use)} options={destList(r.use)} onChange={(v) => patchProd(r.id, { dest: v })} /></td>
                      <td className="txt"><input value={r.memo} onChange={(e) => patchProd(r.id, { memo: e.target.value })} placeholder="—" /></td>
                      <td className="del-cell"><button className="del" onClick={() => removeProd(r.id)} title="줄 삭제">×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button className="add" onClick={() => setProd((p) => [...p, emptyProd()])}>＋ 줄 추가</button>
        </section>

        {/* ② 작업비 (아래) */}
        <section className="wsblock">
          <div className="sec-title"><h2>작업비</h2><span className="sub">단가 고정 기본값 · 금액 = 회수/수량 × 단가 자동 · 포장 수량은 생산내역에서 자동 합산</span></div>
          <div className="table-wrap">
            <table id="cost">
              <colgroup><col style={{ width: 172 }} /><col style={{ width: 96 }} /><col style={{ width: 100 }} /><col style={{ width: 134 }} /><col style={{ width: 168 }} /><col /><col style={{ width: 34 }} /></colgroup>
              <thead><tr><th>항목</th><th className="ni">회수/수량</th><th className="ni">단가</th><th className="n">금액 <span className="dim">(자동)</span></th><th>지급처</th><th>비고</th><th /></tr></thead>
              <tbody>
                {groups.flatMap((g, gi) => {
                  const isAuto = g.name === '동결비' || g.name === '입출고비';
                  return [
                    <tr className="grp" key={`grp-${g.name}`}><td colSpan={7}><div className="grp-bar"><span className="grp-name">{g.name}{isAuto ? <span className="autotag"> · 자동</span> : null}</span><span className="grp-sub">계 <b>{fmt(groupTotals[g.name] || 0)}</b></span></div></td></tr>,
                    ...(isAuto && g.rows.length === 0
                      ? [<tr className="c-row" key={`ph-${g.name}`}><td className="phcell" colSpan={7}>생산내역의 <b>행선지·구분·수량</b>을 입력하면 자동 계산됩니다.</td></tr>]
                      : g.rows.map((r, ri) => r.auto ? (
                          <tr className="c-row auto" data-g={g.name} key={r.id}>
                            <td className="txt fixed-name"><span className="fx">{r.name}</span></td>
                            <td className="n"><span className="roval">{r.cells[0]}</span></td>
                            <td className="n"><span className="roval">{r.cells[1]}</span></td>
                            <td className="n"><span className="roval">{r.cells[2]}</span></td>
                            <td className="txt"><span className="roval">{r.cells[3]}</span></td>
                            <td className="txt"><span className="roval robigo">{r.cells[4]}</span></td>
                            <td className="del-cell" />
                          </tr>
                        ) : (
                          <tr className={`c-row${r.fixed ? ' wsfix' : ''}`} data-g={g.name} key={r.id}>
                            {r.fixed ? <td className="txt fixed-name"><span className="fx">{r.name}</span></td> : <td className="txt"><input value={r.name} onChange={(e) => patchCostName(gi, ri, e.target.value)} placeholder="—" /></td>}
                            {r.noRateCells ? <td className="n" /> : <td className="n"><input value={r.cells[0]} onChange={(e) => patchCost(gi, ri, 0, e.target.value)} placeholder="—" /></td>}
                            {r.noRateCells ? <td className="n" /> : <td className="n"><input value={r.cells[1]} onChange={(e) => patchCost(gi, ri, 1, e.target.value)} onBlur={() => { if (DANGA_WON_GROUPS.includes(g.name)) patchCost(gi, ri, 1, dangaWon(r.cells[1])); }} placeholder="—" /></td>}
                            <td className="n"><input value={r.cells[2]} onChange={(e) => patchCost(gi, ri, 2, e.target.value)} placeholder="0" /></td>
                            <td className="txt"><input value={r.cells[3]} onChange={(e) => patchCost(gi, ri, 3, e.target.value)} placeholder="—" /></td>
                            <td className="txt"><input value={r.cells[4]} onChange={(e) => patchCost(gi, ri, 4, e.target.value)} placeholder="—" /></td>
                            <td className="del-cell"><button className="del" onClick={() => removeCostRow(gi, ri)} title="줄 삭제">×</button></td>
                          </tr>
                        ))),
                    ...(isAuto ? [] : [<tr className="grp-add" key={`add-${g.name}`}><td colSpan={7}><button className="add-in" onClick={() => addCostRow(gi)}>＋ 줄 추가</button></td></tr>]),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="summary">
          <div className="sum-item"><span className="k">총 박스수</span><span className="v">{fmt(boxTotal)}</span></div>
          <div className="sum-item"><span className="k">총 매입액 <em>수매 기준</em></span><span className="v">{fmt(buyTotal)}</span></div>
          <div className="sum-item"><span className="k">작업비 총액</span><span className="v">{fmt(costTotal)}</span></div>
          <div className="sum-item hl"><span className="k">작업단가</span><span className="v">{fmt(unit)}<span className="u">원/박스</span></span></div>
          <div className="sum-item hl"><span className="k">총 재고원가 <em>실금액</em></span><span className="v">{fmt(buyTotal + costTotal)}</span></div>
        </section>

        <div className="actions">
          <button className="btn ghost" onClick={() => void doSave()} disabled={submitting || !ready || !editable}>{submitting ? '저장 중…' : '임시저장'}</button>
          <button className="btn primary" onClick={() => void doConfirm()} disabled={submitting || !ready || !editable}>확정 등록 →</button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: WS_CSS }} />
    </div>
  );
}
