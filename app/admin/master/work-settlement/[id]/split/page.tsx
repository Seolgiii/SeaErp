'use client';

// ─────────────────────────────────────────────────────────────────────────────
// 작업 정산 등록 — 3단계: 화주 배분. 생산내역 물량을 화주별로 나눈다.
//   ① 사전기입 → ② 작업비·생산내역 → ③ 배분 → 확정 시 (생산내역 × 화주) 만큼 입고·LOT 생성.
//
// 왜 LOT을 화주별로 쪼개나: 이 시스템은 전부 LOT 단위로 돈다(재고 조회·출고·이동·가공·원가).
// 화주를 LOT 속성으로 붙이면 나머지 로직이 그대로 작동한다. 반대로 LOT 1개에 지분만 붙이면
// 출고할 때마다 지분이 재계산돼 모든 계산을 뜯어야 한다.
//
// ⚠ 현재 화면 프로토타입 — 배분 저장·확정은 미연결(화주 마스터/Airtable 필드 미신설).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { readSession, isSessionExpired, isAdminRole } from '@/lib/session';
import { toast } from '@/lib/toast';
import { getWorkSettlementDetail } from '@/app/actions/admin/master-work-settlement';
import { formatNum } from '@/lib/number-format';
import {
  WS_CSS, BOX_LABEL, USE_LABEL, pn, fmt,
  OWNERS_TEMP, OWNER_DEFAULT_RATIO, allocateByRatio,
  type DetailLine, type DetailCost,
} from '../../_shared';

type Hdr = { date: string; startTime: string; endTime: string; catchAmount: number; shipId: string };

export default function WorkSettlementSplitPage() {
  const params = useParams<{ id: string }>();
  const settlementId = String(params?.id ?? '');

  const [, setWorkerId] = useState('');
  const [authError, setAuthError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [no, setNo] = useState('');
  const [status, setStatus] = useState('');
  const [hdr, setHdr] = useState<Hdr | null>(null);
  const [lines, setLines] = useState<DetailLine[]>([]);
  const [costs, setCosts] = useState<DetailCost[]>([]);

  const owners = OWNERS_TEMP;
  // 비율은 문자열 상태 — 입력 중 빈칸을 허용하려고(숫자로 강제하면 지울 수가 없음).
  const [ratios, setRatios] = useState<string[]>(() => owners.map((_, i) => String(OWNER_DEFAULT_RATIO[i] ?? 0)));
  // alloc[lineIndex][ownerIndex] = 배분 박스수(문자열)
  const [alloc, setAlloc] = useState<string[][]>([]);

  useEffect(() => {
    const s = readSession();
    if (!s || isSessionExpired(s)) return setAuthError('로그인이 필요합니다.');
    if (!isAdminRole(s)) return setAuthError('관리자 전용 화면입니다.');
    setWorkerId(s.workerId);
    void (async () => {
      const d = await getWorkSettlementDetail(s.workerId, settlementId);
      if (!d.success) { toast(d.error ?? '정산 조회 실패', 'error'); return; }
      setNo(d.data.no);
      setStatus(d.data.status);
      setHdr(d.data.header);
      setLines(d.data.lines);
      setCosts(d.data.costs);
      setLoaded(true);
    })();
  }, [settlementId]);

  // 실단가 = 수매단가 + 작업단가. 2단계와 **같은 방식**으로 계산해야 화면끼리 숫자가 어긋나지 않는다.
  const costTotal = useMemo(() => costs.reduce((s, c) => s + (c.amount || 0), 0), [costs]);
  const boxTotal = useMemo(() => lines.reduce((s, l) => s + (l.quantity || 0), 0), [lines]);
  const workUnit = boxTotal ? Math.round(costTotal / boxTotal) : 0;

  // 초기 배분 — 불러온 직후 기본 비율로 한 번 채운다.
  useEffect(() => {
    if (!loaded) return;
    setAlloc(lines.map((l) => allocateByRatio(l.quantity || 0, ratios.map((r) => pn(r))).map((n) => String(n))));
    // ratios는 의도적으로 제외 — 비율을 고칠 때마다 손으로 조정한 값이 날아가면 안 된다([적용] 버튼으로만).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, lines]);

  const applyRatio = () => {
    const rs = ratios.map((r) => pn(r));
    if (rs.reduce((a, b) => a + b, 0) <= 0) { toast('비율을 입력하세요.', 'error'); return; }
    setAlloc(lines.map((l) => allocateByRatio(l.quantity || 0, rs).map((n) => String(n))));
    toast('기본 비율로 배분했습니다. 줄마다 직접 조정할 수 있습니다.', 'success');
  };

  const patchAlloc = (li: number, oi: number, val: string) =>
    setAlloc((prev) => prev.map((row, i) => (i !== li ? row : row.map((v, j) => (j === oi ? val : v)))));

  const rowSum = (li: number) => (alloc[li] ?? []).reduce((s, v) => s + pn(v), 0);
  const ownerTotals = useMemo(
    () => owners.map((_, oi) => lines.reduce((s, _l, li) => s + pn(alloc[li]?.[oi] ?? ''), 0)),
    [owners, lines, alloc],
  );
  const ownerAmounts = useMemo(
    () => owners.map((_, oi) => lines.reduce((s, l, li) => s + pn(alloc[li]?.[oi] ?? '') * (l.purchaseUnitPrice + workUnit), 0)),
    [owners, lines, alloc, workUnit],
  );
  const allMatch = useMemo(
    () => lines.length > 0 && lines.every((l, li) => rowSum(li) === (l.quantity || 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, alloc],
  );

  const ratioSum = ratios.reduce((s, r) => s + pn(r), 0);

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

  return (
    <div className="ws-page">
      <div className="page">
        <header>
          <Link href={`/admin/master/work-settlement/${settlementId}`} className="backlink">← 작업비 · 생산내역</Link>
          <div className="title-row"><h1>화주 배분 {no ? `· ${no}` : ''}</h1></div>
          <div className="steps">
            <span>① 사전기입</span><span className="sep">→</span>
            <span>② 작업비 · 생산내역</span><span className="sep">→</span>
            <span className="on">③ 배분</span>
          </div>
          <p className="lede">
            생산내역 물량을 <b>화주별로 나눕니다.</b> 기본 비율로 채운 뒤 <b>박스 수를 직접 조정</b>하세요(“더 끊어주기”).
            각 줄의 합계가 전체수량과 맞아야 확정됩니다. 확정 시 <b>생산내역 × 화주</b>만큼 입고·LOT이 생성됩니다.
          </p>
        </header>

        {/* 맥락 (읽기 전용) */}
        <div className="ctxbar">
          <div className="ci"><span className="ck">작업일</span><span className="cv">{hdr?.date || '—'}</span></div>
          <div className="ci"><span className="ck">총 박스</span><span className="cv">{fmt(boxTotal)} 박스</span></div>
          <div className="ci"><span className="ck">작업단가</span><span className="cv">{fmt(workUnit)} 원/박스</span></div>
          <div className="ci"><span className="ck">생산내역</span><span className="cv">{lines.length} 줄</span></div>
        </div>

        {status && status !== '임시저장' && (
          <p className="cap" style={{ color: 'var(--amber-ink)' }}>이 정산은 ‘{status}’ 상태입니다. 배분·확정할 수 없습니다.</p>
        )}

        {/* 기본 비율 */}
        <section className="wsblock">
          <div className="sec-title"><h2>기본 배분 비율</h2><span className="sub">고정값이 아닙니다 · 매 정산 조정 · [적용]은 아래 표를 전부 다시 채웁니다</span></div>
          <div className="ratiobar">
            {owners.map((o, i) => (
              <div className="ri" key={o}>
                <span className="rk">{o}</span>
                <input className="rv" value={ratios[i] ?? ''} inputMode="numeric"
                  onChange={(e) => setRatios((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))} />
                <span className="rp">%</span>
              </div>
            ))}
            <span className={`rsum ${ratioSum === 100 ? 'ok' : 'warn'}`}>합 {ratioSum}</span>
            <button className="btn" onClick={applyRatio}>적용</button>
          </div>
          <p className="cap">비율 합이 100이 아니어도 됩니다 — 비율대로 나눈 뒤 박스 우수리는 큰 쪽부터 채웁니다(합계는 항상 전체수량과 일치).</p>
        </section>

        {/* 배분 표 */}
        <section className="wsblock">
          <div className="sec-title"><h2>배분</h2><span className="sub">왼쪽은 생산내역 그대로(읽기 전용) · 오른쪽 화주 칸만 입력</span></div>
          <div className="table-wrap">
            <table id="split">
              <colgroup>
                <col style={{ width: 84 }} /><col style={{ width: 72 }} /><col style={{ width: 68 }} /><col style={{ width: 58 }} />
                <col style={{ width: 76 }} /><col style={{ width: 76 }} /><col style={{ width: 72 }} /><col style={{ width: 88 }} />
                <col style={{ width: 60 }} />
                {owners.map((o) => <col key={o} style={{ width: 76 }} />)}
                <col style={{ width: 60 }} />
              </colgroup>
              <thead><tr>
                <th>품목명</th><th>구분</th><th>규격 <span className="dim">(미수)</span></th><th className="ni">중량 <span className="dim">(kg)</span></th>
                <th className="n">수매단가</th><th className="n">실단가</th><th>용도</th><th>비고</th>
                <th className="n">전체수량</th>
                {owners.map((o) => <th key={o} className="oi">{o}</th>)}
                <th className="n">합계</th>
              </tr></thead>
              <tbody>
                {lines.map((l, li) => {
                  const real = l.purchaseUnitPrice + workUnit;
                  const sum = rowSum(li);
                  const ok = sum === (l.quantity || 0);
                  return (
                    <tr className="p-row" key={li}>
                      <td className="txt">{l.productName || '—'}</td>
                      <td className="txt">{BOX_LABEL[l.boxType] ?? l.boxType ?? '—'}</td>
                      <td className="txt">{l.spec || '—'}{l.misu ? ` (${l.misu})` : ''}</td>
                      <td className="n">{l.weightKg ? formatNum(l.weightKg, 'kg') : '—'}</td>
                      <td className="n">{formatNum(l.purchaseUnitPrice, '원')}</td>
                      <td className="n">{formatNum(real, '원')}</td>
                      <td className="txt">{USE_LABEL[l.usage] ?? l.usage ?? '—'}</td>
                      <td className="txt dimtxt" title={l.memo}>{l.memo || '—'}</td>
                      <td className="n">{formatNum(l.quantity || 0, '박스')}</td>
                      {owners.map((o, oi) => (
                        <td className="oc" key={o}>
                          <input className="oin" inputMode="numeric" value={alloc[li]?.[oi] ?? ''}
                            onChange={(e) => patchAlloc(li, oi, e.target.value)} />
                        </td>
                      ))}
                      <td className={`n ${ok ? 'okn' : 'badn'}`}>{formatNum(sum, '박스')}</td>
                    </tr>
                  );
                })}
                {lines.length === 0 && (
                  <tr><td colSpan={9 + owners.length + 1} className="empty">
                    생산내역이 없습니다. <Link href={`/admin/master/work-settlement/${settlementId}`}>2단계</Link>에서 먼저 채우세요.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          {!allMatch && lines.length > 0 && (
            <p className="cap" style={{ color: 'var(--danger-ink)' }}>합계가 전체수량과 다른 줄이 있습니다. 박스가 생기거나 사라지지 않도록 맞춰야 확정됩니다.</p>
          )}
        </section>

        {/* 화주별 요약 */}
        <section className="wsblock">
          <div className="sec-title"><h2>화주별 합계</h2><span className="sub">금액 = Σ (배분 박스 × 실단가) · 각 화주가 지는 재고원가</span></div>
          <div className="ownsum">
            {owners.map((o, oi) => (
              <div className="oscard" key={o}>
                <div className="osn">{o}</div>
                <div className="osb">{fmt(ownerTotals[oi] ?? 0)} <span className="osu">박스</span></div>
                <div className="osw">{fmt(ownerAmounts[oi] ?? 0)} <span className="osu">원</span></div>
              </div>
            ))}
            <div className="oscard total">
              <div className="osn">합계</div>
              <div className="osb">{fmt(ownerTotals.reduce((a, b) => a + b, 0))} <span className="osu">박스</span></div>
              <div className="osw">{fmt(ownerAmounts.reduce((a, b) => a + b, 0))} <span className="osu">원</span></div>
            </div>
          </div>
        </section>

        <div className="actions">
          <Link href={`/admin/master/work-settlement/${settlementId}`} className="btn">← 돌아가기</Link>
          <button className="btn primary" disabled={!allMatch} onClick={() => toast('배분 저장·확정은 아직 미연결입니다(화주 마스터·Airtable 필드 신설 후).', 'info')}>
            확정 (LOT 생성)
          </button>
        </div>
        <p className="cap">⚠ 화면 프로토타입입니다 — 배분 저장과 LOT 생성은 아직 연결되지 않았습니다.</p>
      </div>

      <style>{WS_CSS}</style>
      {/* 이 블록은 .ws-page 안쪽이라 _shared.ts가 선언한 로컬 var()를 그대로 쓴다.
          색은 전부 거기서 오고, 여기에 hex를 다시 적지 않는다(DESIGN §2-1). */}
      <style>{`
        .ws-page .ratiobar { display:flex; align-items:center; gap:14px; flex-wrap:wrap; padding:10px 0 4px; }
        .ws-page .ratiobar .ri { display:flex; align-items:center; gap:6px; }
        .ws-page .ratiobar .rk { font-size:12px; color:var(--muted); }
        .ws-page .ratiobar .rv { width:56px; text-align:right; font-variant-numeric:tabular-nums;
          border:1px solid var(--line); border-radius:6px; padding:4px 6px; font-size:14px; }
        .ws-page .ratiobar .rp { font-size:12px; color:var(--muted); }
        .ws-page .ratiobar .rsum { font-size:12px; padding:2px 8px; border-radius:10px; }
        .ws-page .ratiobar .rsum.ok { background:var(--green-soft); color:var(--green-ink); }
        .ws-page .ratiobar .rsum.warn { background:var(--amber-soft); color:var(--amber-ink); }
        .ws-page #split th.oi { text-align:center; color:var(--accent-ink); }
        .ws-page #split td.oc { text-align:center; }
        .ws-page #split td.oc .oin { width:64px; text-align:right; font-variant-numeric:tabular-nums;
          border:1px solid var(--line); border-radius:6px; padding:4px 6px; font-size:14px; background:var(--band); }
        .ws-page #split td.n, .ws-page #split th.n { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
        .ws-page #split th.ni { text-align:right; }
        .ws-page #split .okn { color:var(--green-ink); }
        .ws-page #split .badn { color:var(--danger-ink); font-weight:600; }
        .ws-page #split td.dimtxt { color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ws-page #split td.empty { text-align:center; color:var(--muted); padding:22px 0; }
        .ws-page .ownsum { display:flex; gap:10px; flex-wrap:wrap; padding-top:8px; }
        .ws-page .oscard { border:1px solid var(--line); border-radius:10px; padding:10px 14px; min-width:150px; }
        .ws-page .oscard.total { background:var(--band); }
        .ws-page .oscard .osn { font-size:12px; color:var(--muted); margin-bottom:4px; }
        .ws-page .oscard .osb { font-size:16px; font-weight:600; font-variant-numeric:tabular-nums; }
        .ws-page .oscard .osw { font-size:14px; color:var(--muted); font-variant-numeric:tabular-nums; margin-top:2px; }
        .ws-page .oscard .osu { font-size:11px; font-weight:400; color:var(--muted); }
        .ws-page .actions { display:flex; gap:10px; justify-content:flex-end; padding:14px 0 4px; }
      `}</style>
    </div>
  );
}
