'use client';

// ─────────────────────────────────────────────────────────────────────────────
// 작업 정산 등록 — 3단계: 화주 배분. 생산내역 물량을 화주별로 나눈다.
//   ① 사전기입 → ② 작업비·생산내역 → ③ 배분 → 확정 시 (생산내역 × 화주) 만큼 입고·LOT 생성.
//
// 왜 LOT을 화주별로 쪼개나: 이 시스템은 전부 LOT 단위로 돈다(재고 조회·출고·이동·가공·원가).
// 화주를 LOT 속성으로 붙이면 나머지 로직이 그대로 작동한다. 반대로 LOT 1개에 지분만 붙이면
// 출고할 때마다 지분이 재계산돼 모든 계산을 뜯어야 한다.
//
// ⚠ 2026-08-03 현재 — **확정은 연결됐고 배분 저장만 미연결**이다(화주 마스터/Airtable 화주 필드 미신설).
//    즉 확정을 누르면 생산내역 줄당 LOT 1개가 생기고, 위에서 나눈 화주별 박스는 반영되지 않는다.
//    배분표는 지금 '검산용'이다. 화주별 LOT 분할은 화주 마스터 신설 후.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { readSession, isSessionExpired, isAdminRole } from '@/lib/session';
import { toast } from '@/lib/toast';
import {
  getWorkSettlementDetail,
  confirmWorkSettlement,
} from '@/app/actions/admin/master-work-settlement';
import { formatNum } from '@/lib/number-format';
import {
  WS_CSS, BOX_LABEL, USE_LABEL, pn, fmt,
  OWNERS_TEMP, OWNER_DEFAULT_RATIO, allocateByRatio,
  type DetailLine, type DetailCost,
} from '../../_shared';

type Hdr = { date: string; startTime: string; endTime: string; catchAmount: number; shipId: string };

export default function WorkSettlementSplitPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const settlementId = String(params?.id ?? '');

  const [, setWorkerId] = useState('');
  // 확정 버튼 노출용(관리자만). 실제 차단은 서버 confirmWorkSettlement → requireAdmin.
  const [canConfirm, setCanConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    // 작성은 전원 개방(2026-08-03) — 확정만 관리자, 삭제만 MASTER.
    setCanConfirm(isAdminRole(s));
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

  const editable = status === '임시저장' || status === '';

  /**
   * 확정 — 생산내역 한 줄마다 입고관리 1행 + 재고(LOT) 1개를 만든다.
   *
   * 2026-08-03: ② 작업비·생산내역에 있던 확정 버튼을 이리로 옮겼다. 실무 흐름이
   * ①→②→③이고 확정은 마지막에 오는데, ②에 확정이 배분과 나란히 있으면 무엇이 다른지
   * 읽히지 않았다(확정 이력 0건 — 실제로 아무도 안 눌렀다).
   *
   * ⚠ 위 배분표는 **아직 저장되지 않는다.** 화주 마스터·Airtable 화주 필드가 없어서
   *   확정은 화주 구분 없이 줄당 LOT 1개를 만든다. 배분한 대로 쪼개진 걸로 오해하면
   *   재고가 틀어지므로 확인 문구에 그 사실을 반드시 넣는다.
   */
  const doConfirm = async () => {
    const s = readSession();
    if (!s || isSessionExpired(s)) return toast('로그인이 필요합니다.', 'error');
    if (!lines.length) return toast('생산내역이 없습니다. ② 단계에서 먼저 채우세요.', 'error');
    if (
      !confirm(
        `확정하면 생산내역 ${lines.length}줄마다 재고(LOT)가 생성됩니다.\n\n` +
          '⚠ 위 화주별 배분은 아직 저장되지 않습니다 — 화주 구분 없이 줄당 LOT 1개가 생깁니다.\n\n' +
          '진행할까요?',
      )
    ) return;
    setSubmitting(true);
    try {
      const res = await confirmWorkSettlement(s.workerId, settlementId);
      if (res.success) {
        toast(`확정 완료 — LOT ${res.data.lotCount}개 생성`, 'success');
        router.push('/admin/master/work-settlement');
      } else toast(res.error ?? '확정 실패', 'error');
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

  return (
    <div className="ws-page">
      <div className="page">
        <header>
          <Link href={`/admin/master/work-settlement/${settlementId}`} className="backlink">← 작업비 · 생산내역</Link>
          <div className="title-row"><h1>화주 배분 {no ? `· ${no}` : ''}</h1></div>
          <div className="steps">
            <span>① 사전기입</span><span className="sep">→</span>
            <span>② 작업비 · 생산내역</span><span className="sep">→</span>
            {/* 화주가 여럿일 때만 거치는 선택 단계 — 2단계 스텝 표기와 맞춘다. */}
            <span className="on">③ 배분 (선택)</span>
          </div>
          <p className="lede">
            생산내역 물량을 <b>화주별로 나눕니다.</b> 기본 비율로 채운 뒤 <b>박스 수를 직접 조정</b>하세요(“더 끊어주기”).
            각 줄의 합계가 전체수량과 맞는지 검산하세요.
            {' '}<b>지금은 배분이 저장되지 않아</b> 확정 시 생산내역 <b>한 줄당 LOT 하나</b>가 생깁니다(화주 구분 없음).
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
            {/* ⚠ 아래 colgroup 폭은 **실제와 다르다.** 이 표는 table-fixed가 아니라
                auto-layout이므로 브라우저가 내용에 맞춰 늘린다 — 지금은 그게 더 잘 맞아 그대로 둔다.
                2026-08-03 실측(필요폭, 패딩 10px 포함):
                  품목명 92 · 구분 87 · 규격 89 · 중량 79 · 수매단가 86 · 실단가 86 ·
                  용도 79 · 비고 96 · 전체수량 90 · 화주 114/101/83 · 합계 90  → 합 1172
                배정 합은 942라 전 컬럼이 7~38px씩 모자란다. DESIGN §7-4는 입력칸이 있는 표에
                table-fixed를 요구하는데(이 표엔 화주 입력칸이 있다), 그때 이 값이 실제로 구속하므로
                위 실측치로 갈아야 한다. 그러면 총폭이 1170을 넘어 래퍼 안 가로 스크롤이 생긴다. */}
            <table id="split">
              <colgroup>
                <col style={{ width: 84 }} /><col style={{ width: 72 }} /><col style={{ width: 68 }} /><col style={{ width: 58 }} />
                <col style={{ width: 76 }} /><col style={{ width: 76 }} /><col style={{ width: 72 }} /><col style={{ width: 88 }} />
                <col style={{ width: 60 }} />
                {owners.map((o) => <col key={o} style={{ width: 76 }} />)}
                <col style={{ width: 60 }} />
              </colgroup>
              <thead><tr>
                <th>품목명</th><th>구분</th><th>규격 <span className="dim">(미수)</span></th><th className="ni">단위</th>
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
          <Link href={`/admin/master/work-settlement/${settlementId}`} className="btn ghost">← 작업비 · 생산내역</Link>
          {!canConfirm && editable && (
            <span className="cap" style={{ margin: 0 }}>확정은 관리자가 합니다.</span>
          )}
          {canConfirm && (
            <button
              className="btn primary"
              onClick={() => void doConfirm()}
              disabled={submitting || !editable || !lines.length}
            >
              {submitting ? '확정 중…' : '확정 등록 →'}
            </button>
          )}
        </div>
        <p className="cap">
          확정하면 생산내역 한 줄마다 재고(LOT)가 생깁니다.
          {' '}⚠ <b>위 화주별 배분은 아직 저장되지 않습니다</b> — 화주 마스터·Airtable 화주 필드가 신설되기 전까지는
          {' '}화주 구분 없이 줄당 LOT 1개로 생성됩니다. 지금 배분표는 <b>검산용</b>입니다.
        </p>
      </div>

      <style>{WS_CSS}</style>
      {/* 이 블록은 .ws-page 안쪽이라 _shared.ts가 선언한 로컬 var()를 그대로 쓴다.
          색은 전부 거기서 오고, 여기에 hex를 다시 적지 않는다(DESIGN §2-1). */}
      <style>{`
        .ws-page .ratiobar { display:flex; align-items:center; gap:14px; flex-wrap:wrap; padding:10px 0 4px; }
        .ws-page .ratiobar .ri { display:flex; align-items:center; gap:6px; }
        .ws-page .ratiobar .rk { font-size:12px; color:var(--muted); }
        /* 비율은 두 자리(40·20)가 기본. 실측 14px tabular: 2자리 19.7 / 3자리 29.5,
           padding 8 + border 2 = 10 → 42px면 2자리는 넉넉하고 100(3자리)도 잘리지 않는다. */
        .ws-page .ratiobar .rv { width:42px; text-align:center; font-variant-numeric:tabular-nums;
          border:1px solid var(--line); border-radius:6px; padding:4px; font-size:14px; }
        .ws-page .ratiobar .rp { font-size:12px; color:var(--muted); }
        .ws-page .ratiobar .rsum { font-size:12px; padding:2px 8px; border-radius:10px; }
        .ws-page .ratiobar .rsum.ok { background:var(--green-soft); color:var(--green-ink); }
        .ws-page .ratiobar .rsum.warn { background:var(--amber-soft); color:var(--amber-ink); }
        .ws-page #split th.oi { text-align:center; color:var(--accent-ink); }
        .ws-page #split td.oc { text-align:center; }
        /* 배분 박스수는 네 자리(1,000박스대)까지. 실측 4자리 39.3 + padding 8 + border 2 = 49.3
           → 54px(여유 4.7). 실제 값은 대개 3자리라 그만큼 헐렁해 보이던 것을 줄였다. */
        .ws-page #split td.oc .oin { width:54px; text-align:center; font-variant-numeric:tabular-nums;
          border:1px solid var(--line); border-radius:6px; padding:4px; font-size:14px; background:var(--band); }
        /* 읽기 전용 평문 셀에 좌우 패딩 — WS_CSS의 tbody td는 padding:0이고 입력칸·.roval이
           안에서 패딩을 갖는 구조다. 배분표 왼쪽 절반은 평문이라 값이 셀 경계에 딱 붙어,
           우측정렬 숫자와 좌측정렬 텍스트가 만나는 자리에서 '57,495원원프로즌'처럼 붙어 읽혔다.
           헤더(thead th)가 좌우 10px이므로 같은 10px로 맞춰 헤더-값 세로선을 일치시킨다.
           컬럼 간격은 가운데 정렬이 아니라 패딩으로 맞춘다(CLAUDE.md 표 규칙 §여백). */
        .ws-page #split tbody td.txt, .ws-page #split tbody td.n { padding:10px; white-space:nowrap; }
        .ws-page #split td.n, .ws-page #split th.n { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
        .ws-page #split th.ni { text-align:right; }

        /* 지시 정렬(2026-08-03) — 구분·규격·단위·용도·비고는 헤더와 값을 함께 가운데로,
           합계는 헤더만 가운데(값은 다른 숫자 컬럼과 우측선을 맞춘다).
           DESIGN §7-6은 중앙 정렬을 금하지만, 이 컬럼들은 값 길이가 짧고 일정해 자릿수가
           깨지지 않는다는 판단 — 2026-07-31 작업 정산 목록에서 이미 허용한 좁은 예외와 같다.
           td.txt/td.n이 여러 컬럼에 겹쳐 붙어 있어 클래스로는 못 고르므로 nth-child로 짚는다. */
        .ws-page #split thead th:nth-child(2), .ws-page #split tbody td:nth-child(2),
        .ws-page #split thead th:nth-child(3), .ws-page #split tbody td:nth-child(3),
        .ws-page #split thead th:nth-child(4), .ws-page #split tbody td:nth-child(4),
        .ws-page #split thead th:nth-child(7), .ws-page #split tbody td:nth-child(7),
        .ws-page #split thead th:nth-child(8), .ws-page #split tbody td:nth-child(8) { text-align:center; }
        .ws-page #split thead th:last-child { text-align:center; }
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
