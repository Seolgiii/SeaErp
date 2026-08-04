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
import { readSession, isSessionExpired } from '@/lib/session';
import { formatStamp } from '@/lib/format-datetime';
import { formatNum } from '@/lib/number-format';
import { toast } from '@/lib/toast';
import {
  saveWorkSettlement,
  saveWorkSettlementHeader,
  getWorkSettlementDetail,
  getStorageBoxTypeFees,
  type SaveWorkSettlementInput,
} from '@/app/actions/admin/master-work-settlement';
import { listProducts, type Product } from '@/app/actions/admin/master-products';
import { listStorages, type Storage } from '@/app/actions/admin/master-storage';
import { listShips, type Ship } from '@/app/actions/admin/master-ships';
import {
  WS_CSS, TIMES, BOX_INTERNAL, BOX_LABEL, USES, USE_LABEL, DANGA_WON_GROUPS, COMMISSION_RATE,
  pn, fmt, nid, dangaWon, computeWorkHours, normDate, normTime,
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
  // 작성·최종수정 흔적 — 전원이 고칠 수 있는 기록이라 화면에 항상 띄워둔다.
  const [stamp, setStamp] = useState({ createdAt: '', createdByName: '', updatedAt: '', updatedByName: '' });

  const [products, setProducts] = useState<Product[]>([]);
  const [storages, setStorages] = useState<Storage[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);

  const [hdr, setHdr] = useState<Hdr | null>(null);
  const [groups, setGroups] = useState<CostGroup[]>(() => defaultGroups());
  const [prod, setProd] = useState<ProdRow[]>(() => [emptyProd(), emptyProd()]);
  const [fees, setFees] = useState<Record<string, StorageFee>>({}); // 행선지 보관처 동결비·입출고비 단가 캐시

  // 사전기입 인라인 수정(접기/펼치기) — 페이지 이동 없이 ①단계 값을 바로 고친다.
  const [hdrEdit, setHdrEdit] = useState(false);
  const [hdrSaving, setHdrSaving] = useState(false);
  const [ewWork, setEwWork] = useState('');
  const [ewGu, setEwGu] = useState('');
  const [ewFood, setEwFood] = useState(false);
  const [ewSundo, setEwSundo] = useState('');
  const [ewDate, setEwDate] = useState('');
  const [ewStart, setEwStart] = useState('');
  const [ewEnd, setEwEnd] = useState('');
  const [ewShip, setEwShip] = useState('');
  const [ewEodae, setEwEodae] = useState('');
  const [ewMemo, setEwMemo] = useState('');

  useEffect(() => {
    const s = readSession();
    if (!s || isSessionExpired(s)) return setAuthError('로그인이 필요합니다.');
    // 작성·수정은 전원 개방(2026-08-03). 확정은 ③ 배분 화면에서, 관리자만.
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
      setStamp({
        createdAt: d.data.createdAt,
        createdByName: d.data.createdByName,
        updatedAt: d.data.updatedAt,
        updatedByName: d.data.updatedByName,
      });
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
        // 규격·미수는 서로 다른 칸에서 온다. 통일하지 말 것.
        //   r.weight = 표의 '규격(kg/박스)' 칸 → 문자열 그대로 LOT.규격(번호 표기값, `21.5/22`·`L` 가능)
        //              + 숫자로 파싱되면 중량kg(계산용). 한 입력이 두 필드로 갈리는 건 의도된 것.
        //   r.spec   = 표의 '미수' 칸 → LOT.미수 (사이즈)
        // (2026-08-04: 종전엔 r.spec을 규격·미수 양쪽에 복사해 LOT번호가 `-24-24-`로 나왔다)
        spec: r.weight.trim() || undefined, misu: r.spec.trim() || undefined, weightKg: pn(r.weight) || undefined,
        quantity: pn(r.qty), purchaseUnitPrice: pn(r.price),
        usage: r.use || undefined, destinationId: findStorage(r.dest) || undefined, memo: r.memo || undefined,
      })),
      costs,
    };
  };

  const openHdrEdit = () => {
    if (!hdr) return;
    setEwWork(storages.find((x) => x.id === hdr.workplaceId)?.name ?? '');
    setEwGu(hdr.fishingArea);
    setEwFood(hdr.hasFeed === 'O');
    setEwSundo(hdr.freshness);
    setEwDate(hdr.date);
    setEwStart(hdr.startTime);
    setEwEnd(hdr.endTime);
    setEwShip(ships.find((x) => x.id === hdr.shipId)?.name ?? '');
    setEwEodae(hdr.catchAmount ? fmt(hdr.catchAmount) : '');
    setEwMemo(hdr.memo);
    setHdrEdit(true);
  };

  /**
   * 저장 성공 시 '최종 수정' 표시를 갱신한다.
   *
   * 시각은 **서버가 돌려준 값**을 쓴다. 브라우저 시계로 찍으면 서버와 어긋나
   * 화면에 적힌 시각과 Airtable에 적힌 시각이 다르다(실측 ~9초 차이 있었다).
   */
  const markEdited = (updatedAt: string, byName: string) =>
    setStamp((prev) => ({ ...prev, updatedAt, updatedByName: byName }));

  const saveHdrEdit = async () => {
    const s = readSession();
    if (!s || isSessionExpired(s)) return toast('로그인이 필요합니다.', 'error');
    const d = normDate(ewDate);
    if (!d.trim()) return toast('작업일을 입력하세요.', 'error');
    setHdrSaving(true);
    try {
      const res = await saveWorkSettlementHeader(s.workerId, {
        settlementId,
        date: d,
        workplaceId: storages.find((x) => x.name === ewWork.trim())?.id || undefined,
        fishingArea: ewGu || undefined,
        hasFeed: ewFood ? 'O' : 'X',
        freshness: ewSundo || undefined,
        shipId: ships.find((x) => x.name === ewShip.trim())?.id || undefined,
        startTime: normTime(ewStart) || undefined,
        endTime: normTime(ewEnd) || undefined,
        catchAmount: pn(ewEodae) || undefined,
        memo: ewMemo || undefined,
      });
      if (res.success) {
        setHdr({
          date: d,
          workplaceId: storages.find((x) => x.name === ewWork.trim())?.id ?? '',
          fishingArea: ewGu,
          hasFeed: ewFood ? 'O' : 'X',
          freshness: ewSundo,
          shipId: ships.find((x) => x.name === ewShip.trim())?.id ?? '',
          supplierId: hdr?.supplierId ?? '',
          startTime: normTime(ewStart),
          endTime: normTime(ewEnd),
          catchAmount: pn(ewEodae),
          memo: ewMemo,
        });
        markEdited(res.data.updatedAt, s.workerName);
        toast('사전기입 저장', 'success');
        setHdrEdit(false);
      } else toast(res.error ?? '저장 실패', 'error');
    } finally { setHdrSaving(false); }
  };

  const doSave = async () => {
    const s = readSession();
    if (!s || isSessionExpired(s)) return toast('로그인이 필요합니다.', 'error');
    const payload = buildPayload();
    if (!payload) return;
    setSubmitting(true);
    try {
      const res = await saveWorkSettlement(s.workerId, payload);
      if (res.success) {
        markEdited(res.data.updatedAt, s.workerName);
        toast('임시저장 완료', 'success');
      } else toast(res.error ?? '임시저장 실패', 'error');
    } finally { setSubmitting(false); }
  };
  /**
   * ③ 배분으로 이동 — 저장부터 하고 넘어간다. **확정으로 가는 유일한 길이다.**
   *
   * 2026-08-03: 확정 등록 버튼을 이 화면에서 빼고 ③ 배분으로 옮겼다. 실무 흐름이
   * ①→②→③이고 확정은 마지막에 오는데, ②에 확정이 같이 있으면 배분과 나란히 놓여
   * 무엇이 다른지 읽히지 않았다(확정 이력 0건 — 실제로 아무도 안 눌렀다).
   *
   * 배분 화면은 `getWorkSettlementDetail`로 생산내역을 **서버에서 다시 읽는다.**
   * 저장 없이 이동하면 방금 입력한 줄이 빠진 채 배분표가 그려져, 화면상 수량과
   * 실제 저장된 수량이 어긋난 상태로 박스를 나누게 된다.
   * 저장 검증(생산내역 필수)에 걸리면 이동하지 않는다 — 생산내역 없는 배분은 의미가 없다.
   */
  const doSplit = async () => {
    const s = readSession();
    if (!s || isSessionExpired(s)) return toast('로그인이 필요합니다.', 'error');
    const payload = buildPayload();
    if (!payload) return;
    setSubmitting(true);
    try {
      const res = await saveWorkSettlement(s.workerId, payload);
      if (!res.success) return toast(res.error ?? '저장 실패', 'error');
      markEdited(res.data.updatedAt, s.workerName);
      router.push(`/admin/master/work-settlement/${settlementId}/split`);
    } finally { setSubmitting(false); }
  };

  if (authError) {
    return (
      // .ws-page 밖이라 로컬 var()가 없다 → Tailwind 토큰 클래스를 쓴다.
      // 안내 문구를 text-faint(대비 2.61)로 두지 않는다 — DESIGN §2-2.
      <div className="p-6">
        <Link href="/admin/master/work-settlement" className="text-label text-text-muted">← 작업 정산</Link>
        <div className="mt-10 text-center text-body text-text-muted">{authError}</div>
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
            {/* ③은 화주가 여럿일 때만 거치는 선택 단계다 — ①②처럼 반드시 밟는 길이 아니다. */}
            <Link href={`/admin/master/work-settlement/${settlementId}/split`}>③ 배분 (선택)</Link>
          </div>
          <p className="lede">정산서 나온 뒤 <b>생산내역</b>과 <b>작업비</b>를 채웁니다. 생산내역 <b>구분</b>을 고르면 작업비 수량이 자동 합산되고, <b>지급처</b> 선택 시 동결비·입출고비 단가가 자동 채워집니다. <b>확정</b> 시 생산내역별 재고(LOT)가 생성됩니다.</p>
        </header>

        {/* 사전기입 요약 — 펼치면 페이지 이동 없이 바로 수정 */}
        <div className="ctxbar">
          <div className="ci"><span className="ck">작업일</span><span className="cv">{hdr?.date || '—'}</span></div>
          <div className="ci"><span className="ck">선박</span><span className="cv">{shipName}</span></div>
          <div className="ci"><span className="ck">어대금</span><span className="cv">{hdr?.catchAmount ? `${fmt(hdr.catchAmount)}원` : '—'}</span></div>
          <div className="ci"><span className="ck">작업시간</span><span className="cv">{hdr ? `${hdr.startTime || '—'} ~ ${hdr.endTime || '—'}` : '—'}</span></div>
          {/* 공동 편집 기록 — 누가 만들었고 누가 마지막으로 손댔는지.
              둘이 같으면 '최종 수정'은 군더더기라 접는다. */}
          <div className="ci"><span className="ck">작성</span><span className="cv stamp">{formatStamp(stamp.createdAt, stamp.createdByName)}</span></div>
          {stamp.updatedAt && stamp.updatedAt !== stamp.createdAt && (
            <div className="ci"><span className="ck">최종 수정</span><span className="cv stamp">{formatStamp(stamp.updatedAt, stamp.updatedByName)}</span></div>
          )}
          {editable && (
            <button type="button" className="edit" onClick={() => (hdrEdit ? setHdrEdit(false) : openHdrEdit())}>
              {hdrEdit ? '접기 ▴' : '사전기입 수정 ▾'}
            </button>
          )}
        </div>

        {hdrEdit && (
          <div className="ctx-edit">
            <section className="fields">
              <div className="f"><label>작업장</label><Combo value={ewWork} onChange={setEwWork} options={storages.map((s) => s.name)} placeholder="예: 금능" /></div>
              <div className="f"><label>조업 해구</label><input value={ewGu} onChange={(e) => setEwGu(e.target.value)} placeholder="예: 110" /></div>
              <div className="f"><label>먹이유무</label>
                <label className="chk"><input type="checkbox" checked={ewFood} onChange={(e) => setEwFood(e.target.checked)} /><span className="chk-box" /><span className="chk-txt">{ewFood ? 'O' : 'X'}</span></label>
              </div>
              <div className="f"><label>선도</label><input value={ewSundo} onChange={(e) => setEwSundo(e.target.value)} placeholder="A / B / C" /></div>
              <div className="f"><label>작업일</label><input value={ewDate} onChange={(e) => setEwDate(e.target.value)} onBlur={() => setEwDate(normDate(ewDate))} placeholder="YYYY-MM-DD" /></div>
              <div className="f"><label>시작 ~ 종료시간</label>
                <div className="time-range">
                  <Combo value={ewStart} onChange={setEwStart} options={TIMES} startsWith blurFormat={normTime} placeholder="19:00" />
                  <span className="tl">~</span>
                  <Combo value={ewEnd} onChange={setEwEnd} options={TIMES} startsWith blurFormat={normTime} placeholder="04:00" />
                </div>
              </div>
              <div className="f"><label>선박명</label><Combo value={ewShip} onChange={setEwShip} options={ships.map((s) => s.name)} placeholder="예: 해금호" /></div>
              <div className="f"><label>어대금 <span className="dim">(원물 대금)</span></label><input value={ewEodae} onChange={(e) => setEwEodae(e.target.value)} onBlur={(e) => { const v = pn(e.target.value); if (v) setEwEodae(fmt(v)); }} placeholder="0" /></div>
              <div className="f"><label>비고</label><input value={ewMemo} onChange={(e) => setEwMemo(e.target.value)} placeholder="—" /></div>
              <div className="fields-actions">
                <button type="button" className="btn primary" onClick={() => void saveHdrEdit()} disabled={hdrSaving}>{hdrSaving ? '저장 중…' : '저장'}</button>
              </div>
            </section>
          </div>
        )}

        {status && status !== '임시저장' && (
          <p className="cap" style={{ color: 'var(--amber-ink)' }}>이 정산은 ‘{status}’ 상태입니다. 수정·확정할 수 없습니다.</p>
        )}

        {/* ① 생산내역 (위) */}
        <section className="wsblock">
          <div className="sec-title"><h2>생산내역</h2><span className="sub">품목·사이즈별 매입 · 구분(포장)으로 작업비 수량 자동 연동 · 용도 태그로 추적</span></div>
          <div className="table-wrap">
            <table id="prod">
              <colgroup><col style={{ width: 84 }} /><col style={{ width: 92 }} /><col style={{ width: 56 }} /><col style={{ width: 68 }} /><col style={{ width: 58 }} /><col style={{ width: 60 }} /><col style={{ width: 84 }} /><col style={{ width: 96 }} /><col style={{ width: 88 }} /><col style={{ width: 100 }} /><col style={{ width: 96 }} /><col style={{ width: 108 }} /><col style={{ width: 90 }} /><col style={{ width: 34 }} /></colgroup>
              <thead><tr>
                <th>품목명</th><th>구분</th><th>지방도</th><th>미수</th><th className="ni">규격 <span className="dim">(kg/박스)</span></th><th className="ni">수량</th><th className="ni">수매단가</th>
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
                        // r.spec = 미수 칸이므로 품목마스터의 상세규격_표기(미수)를 채운다. (품목마스터의 spec은 규격이라 여기 아님)
                        patchProd(r.id, { name: v, productId: match?.id ?? '', spec: match && !r.spec ? (match.detailSpec || r.spec) : r.spec });
                      }} /></td>
                      <td className="gubun"><select value={r.gubun} onChange={(e) => patchProd(r.id, { gubun: e.target.value })}>
                        <option value="">—</option>{BOX_INTERNAL.map((b) => <option key={b} value={b}>{BOX_LABEL[b]}</option>)}
                      </select></td>
                      <td className="pct-cell"><span className="pctw"><input className="pct-in" value={r.fat} onChange={(e) => patchProd(r.id, { fat: e.target.value })} placeholder="—" /><span className="pct">%</span></span></td>
                      <td className="txt"><input value={r.spec} onChange={(e) => patchProd(r.id, { spec: e.target.value })} placeholder="—" /></td>
                      <td className="n"><input value={r.weight} onChange={(e) => patchProd(r.id, { weight: e.target.value })} placeholder="—" /></td>
                      <td className="n"><input value={r.qty} onChange={(e) => patchProd(r.id, { qty: e.target.value })} onBlur={(e) => { const v = pn(e.target.value); if (v) patchProd(r.id, { qty: fmt(v) }); }} placeholder="0" /></td>
                      <td className="n"><input value={r.price} onChange={(e) => patchProd(r.id, { price: e.target.value })} onBlur={(e) => { const v = pn(e.target.value); if (v) patchProd(r.id, { price: fmt(v) }); }} placeholder="0" /></td>
                      <td className="auto">{r.price ? formatNum(amt, '원') : ''}</td>
                      <td className="auto">{r.price ? formatNum(real, '원') : ''}</td>
                      <td className="auto em">{r.price ? formatNum(ramt, '원') : ''}</td>
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
                    <tr className="grp" key={`grp-${g.name}`}><td colSpan={7}><div className="grp-bar"><span className="grp-name">{g.name}{isAuto ? <span className="autotag"> · 자동</span> : null}</span><span className="grp-sub">계 <b>{formatNum(groupTotals[g.name] || 0, '원')}</b></span></div></td></tr>,
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

        {editable && (
          <p className="cap" style={{ margin: '0 2px 8px' }}>
            다 채웠으면 <b>화주 배분</b>으로 넘어가세요. 저장하고 이동하며, <b>확정은 배분 화면에서</b> 합니다.
          </p>
        )}

        <div className="actions">
          <button className="btn ghost" onClick={() => void doSave()} disabled={submitting || !ready || !editable}>{submitting ? '저장 중…' : '임시저장'}</button>
          {/* 전진 버튼은 하나뿐 — 확정은 ③ 배분에서 한다. 저장하고 넘어간다. */}
          <button className="btn primary" onClick={() => void doSplit()} disabled={submitting || !ready || !editable}>
            화주 배분 →
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: WS_CSS }} />
    </div>
  );
}
