// ─────────────────────────────────────────────────────────────────────────────
// 작업 정산 등록 2단계 공유 — CSS·상수·타입·헬퍼·기본 작업비·초안 복원
//   Step1(/new): 사전기입 헤더 → 임시저장 → Step2. Step2(/[id]): 작업비·생산내역 → 확정.
//   목업 CSS는 .ws-page 접두사 플레인 스타일(Tailwind 충돌 회피: 고정행 클래스는 'wsfix').
// ─────────────────────────────────────────────────────────────────────────────

import { formatNum } from '@/lib/number-format';

// 박스종류: 내부값(에어테이블 구분 옵션) ↔ 표시라벨(목업)
export const BOX_INTERNAL = ['사료팬', '베이트大', '베이트小'] as const;
export const BOX_LABEL: Record<string, string> = { 사료팬: '사료(팬)', 베이트大: '베이트(大)', 베이트小: '베이트(小)' };
export const USES = ['원물동결', '원프로즌 가공', '생물'];
// 표시 라벨(저장값은 그대로) — '원프로즌 가공'이 칸에서 너무 길어 축약
export const USE_LABEL: Record<string, string> = { 원물동결: '원물동결', '원프로즌 가공': '원프로즌', 생물: '생물' };
// 단가에 '원' 표기하는 그룹(노임·기타 제외) — 스크롤 시 단가 칸 식별
// ⚠ 그룹명은 Airtable '작업 정산 작업비'.그룹 singleSelect 옵션과 **정확히** 일치해야 한다.
//    안 맞으면 저장이 422(INVALID_MULTIPLE_CHOICE_OPTIONS)로 죽는다 — 새 옵션 생성 권한이 없어서.
//    2026-07-16: Airtable 옵션이 '탈팬료'(팬) 오타여서 임시저장이 전부 실패하고 있었다.
//    '탈펜료'(펜)가 올바른 표기(사용자 확인) → Airtable 옵션명을 UI에서 rename해 맞췄다.
//    (Airtable Update field API는 name·description만 지원 — select choices는 코드로 못 고침.)
export const DANGA_WON_GROUPS = ['수수료', '운임', '동결비', '입출고비', '박스', '내피', '탈펜료'];
export const COMMISSION_RATE = 0.033;
export const TIMES: string[] = [];
for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 10) TIMES.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

/** 작업일 입력 → YYYY-MM-DD */
export function normDate(s: string): string {
  const t = s.trim().replace(/[.\s]/g, '-').replace(/\//g, '-');
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(t.replace(/-/g, ''));
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return s;
}
/** 시간 입력 → HH:MM */
export function normTime(s: string): string {
  const t = s.trim();
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(t);
  if (m) return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
  const d = t.replace(/\D/g, '');
  if (/^\d{3,4}$/.test(d)) return `${d.slice(0, d.length - 2).padStart(2, '0')}:${d.slice(-2)}`;
  return s;
}

export const pn = (s: string) => parseInt(String(s ?? '').replace(/[^0-9-]/g, ''), 10) || 0;
/** 표 숫자 표기 통일 — 천 단위 콤마(단위는 자리별로 dangaWon 등에서 덧붙임). */
export const fmt = (n: number) => formatNum(n);
let idSeq = 0;
export const nid = () => `k${idSeq++}`;

/** 단가 값 → "N원" 표기(숫자 있을 때만). 단위는 값 뒤에 공백 없이. */
export const dangaWon = (v: string) => {
  const n = pn(v);
  return n ? `${fmt(n)}원` : v;
};

export type CostRow = {
  id: string;
  fixed: boolean;
  boxType?: string; // 내부 박스종류 키(박스/탈펜료 자동연동)
  name: string; // 항목명(고정행은 표시라벨)
  cells: [string, string, string, string, string]; // 회수, 단가, 금액, 지급처, 비고
  /** 회수·단가 칸을 아예 안 보이게(비율성 항목: 수수료=총매입액×3.3%). */
  noRateCells?: boolean;
  /** 생산내역(행선지×구분×수량)에서 자동 산출 — 읽기전용(동결비·입출고비). */
  auto?: boolean;
  /** 금액 = 회수 × 단가 × 작업시간(여노임). 회수는 인원수라 작업시간은 비고에만 표기한다. */
  hourly?: boolean;
};
export type CostGroup = { name: string; rows: CostRow[] };
export type ProdRow = {
  id: string;
  name: string; // 품목명(입력 텍스트)
  productId: string;
  gubun: string; // 내부 박스종류
  fat: string;
  spec: string;
  weight: string;
  qty: string;
  price: string;
  use: string;
  dest: string; // 행선지 텍스트
  memo: string;
};

// 기본 작업비 그룹(목업 GROUP_CONFIG)
export function defaultGroups(): CostGroup[] {
  const box = (bt: string, danga: string, dogam: string, bigo = ''): CostRow => ({
    id: nid(), fixed: true, boxType: bt, name: BOX_LABEL[bt], cells: ['', danga, '', dogam, bigo],
  });
  const fx = (name: string, danga = '', dogam = '', bigo = '', noRate = false, hourly = false): CostRow => ({
    id: nid(), fixed: true, name, cells: ['', danga, '', dogam, bigo],
    ...(noRate && { noRateCells: true }), ...(hourly && { hourly: true }),
  });
  return [
    { name: '수수료', rows: [fx('수수료', '', '', '총 매입액의 3.3%', true), fx('작업장수수료', '2,000원', '센터', '박스당 2,000원')] },
    // 회수 칸 = 작업 인원수(사용자 입력). 남·현장은 인원×단가, 여는 인원×단가×작업시간(hourly).
    { name: '노임', rows: [fx('남', '150,000/일'), fx('여', '15,000/시간', '', '', false, true), fx('현장노임', '150,000/일')] },
    { name: '운임', rows: [{ id: nid(), fixed: false, name: '', cells: ['', '', '', '', ''] }] },
    // 동결비·입출고비: 생산내역(행선지×구분×수량)에서 자동 산출 → buildFreezeRows/buildInoutRows
    { name: '동결비', rows: [] },
    { name: '입출고비', rows: [] },
    { name: '박스', rows: [box('사료팬', '350원', '센터', '재고→펜사용료'), box('베이트大', '1,100원', '센터'), box('베이트小', '900원', '센터')] },
    { name: '내피', rows: [fx('내피', '170원', '협회')] },
    { name: '탈펜료', rows: [box('사료팬', '350원', '김대현 노조반장'), box('베이트大', '350원', '김대현 노조반장'), box('베이트小', '200원', '김대현 노조반장')] },
    { name: '기타', rows: [fx('식대'), fx('간식')] },
  ];
}
export const emptyProd = (): ProdRow => ({ id: nid(), name: '', productId: '', gubun: '', fat: '', spec: '', weight: '', qty: '', price: '', use: '원물동결', dest: '', memo: '' });

/** 박스종류(구분)별 박스수 합. 넘기는 rows를 걸러 '전 용도' / '원프로즌 제외' 두 벌을 만든다. */
export function sumByBoxType(rows: ProdRow[]): Record<string, number> {
  const m: Record<string, number> = Object.fromEntries(BOX_INTERNAL.map((b) => [b, 0]));
  for (const r of rows) if (r.gubun in m) m[r.gubun] += pn(r.qty);
  return m;
}

// ── 화주 배분 (3단계) ────────────────────────────────────────────────────────
/**
 * 이번 정산의 화주(재고 소유자) 목록.
 *
 * ⚠ 임시 상수. 화주 조합은 작업마다 바뀐다(정산서 시절 한라·태봉·대경·J.P → 현재 한라·대경·FPC).
 * 그래서 3단계 화면은 **이 배열 길이만큼 컬럼을 만든다** — 셋으로 박아두지 않는다.
 * 차후 '화주 마스터' 신설 후 이번 참여자를 골라 넣는 것으로 교체(화면 구조는 그대로 재사용).
 */
export const OWNERS_TEMP: readonly string[] = ['한라에스앤에프', '대경트레이딩', 'FPC'];

/** 배분 비율 기본값(참고). **고정 아님** — 매 정산 그 자리서 조정("더 끊어준다"). */
export const OWNER_DEFAULT_RATIO: readonly number[] = [40, 40, 20];

/**
 * 총 박스를 비율대로 **정수** 배분. 최대잉여법(소수부 큰 쪽부터 1박스씩).
 * 단순 반올림은 합이 어긋난다(49를 40:40:20 → 19.6/19.6/9.8 → 반올림 20/20/10 = 50박스).
 * 이 함수는 **합계가 항상 total과 같음**을 보장한다 → 49 → 20/19/10.
 */
export function allocateByRatio(total: number, ratios: readonly number[]): number[] {
  const pos = ratios.map((r) => (r > 0 ? r : 0));
  const sum = pos.reduce((a, b) => a + b, 0);
  if (!(total > 0) || !(sum > 0)) return ratios.map(() => 0);
  const raw = pos.map((r) => (total * r) / sum);
  const out = raw.map((v) => Math.floor(v));
  let rest = total - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; rest > 0 && k < order.length; k++, rest--) out[order[k].i] += 1;
  return out;
}

/** 종료−시작 시간(시간, 소수 1자리). */
export function computeWorkHours(start: string, end: string): number {
  const sh = /(\d{1,2}):(\d{2})/.exec(start ?? '');
  const eh = /(\d{1,2}):(\d{2})/.exec(end ?? '');
  if (!sh || !eh) return 0;
  let mins = (+eh[1] * 60 + +eh[2]) - (+sh[1] * 60 + +sh[2]);
  if (mins < 0) mins += 1440;
  return Math.round((mins / 60) * 10) / 10;
}

// ── 초안 복원 ────────────────────────────────────────────────────────────────
export type DetailLine = {
  productId: string; productName: string; boxType: string; fatRatio: number; spec: string;
  misu: string; weightKg: number; quantity: number; purchaseUnitPrice: number; usage: string;
  destinationId: string; memo: string;
};
export type DetailCost = {
  group: string; itemName: string; count: number; unitPrice: number; amount: number; payee: string; memo: string;
};

/** 초안 생산내역 라인 → ProdRow[]. destName: 행선지 id→이름 해석(클라이언트 보관처 목록). */
export function prodRowsFromLines(lines: DetailLine[], destName: (id: string) => string): ProdRow[] {
  if (!lines.length) return [emptyProd(), emptyProd()];
  return lines.map((l) => ({
    id: nid(),
    name: l.productName,
    productId: l.productId,
    gubun: l.boxType,
    fat: l.fatRatio ? String(l.fatRatio) : '',
    spec: l.spec,
    weight: l.weightKg ? String(l.weightKg) : '',
    qty: l.quantity ? fmt(l.quantity) : '',
    price: l.purchaseUnitPrice ? fmt(l.purchaseUnitPrice) : '',
    use: l.usage || '원물동결',
    dest: l.destinationId ? destName(l.destinationId) : '',
    memo: l.memo,
  }));
}

/** 초안 작업비 → CostGroup[]. 기본 그룹 위에 저장분을 병합(고정행은 이름 매칭, 그 외 추가행). */
export function groupsFromCosts(costs: DetailCost[]): CostGroup[] {
  const groups = defaultGroups();
  if (!costs.length) return groups;
  const byName = new Map(groups.map((g) => [g.name, g]));
  const usedFixed = new Set<string>();
  for (const c of costs) {
    if (c.group === '동결비' || c.group === '입출고비') continue; // 생산내역에서 자동 재생성 → 재구성 스킵
    const cells: CostRow['cells'] = [
      c.count ? fmt(c.count) : '',
      c.unitPrice ? fmt(c.unitPrice) : '',
      c.amount ? fmt(c.amount) : '',
      c.payee || '',
      c.memo || '',
    ];
    const g = byName.get(c.group) ?? byName.get('기타')!;
    const fixedRow = g.rows.find((r) => r.fixed && r.name === c.itemName && !usedFixed.has(r.id));
    if (fixedRow) {
      fixedRow.cells = cells;
      usedFixed.add(fixedRow.id);
    } else {
      g.rows.push({ id: nid(), fixed: false, name: c.itemName, cells });
    }
  }
  return groups;
}

// ── 동결비·입출고비 자동 산출 (행선지 보관처 기준) ─────────────────────────────
export type StorageFee = { name: string; inOutFee: number; freeze: Record<string, number> };

/**
 * 동결비·입출고비·탈펜료를 걷지 않는 용도.
 *
 * 원프로즌 가공 = 냉동되지 않은 선어를 **통에 담아** 가공공장으로 바로 보내 거기서 가공·동결한다.
 * - 동결비: 그 동결비는 '가공비 단가'에 이미 포함돼 가공 거래가 가공원가로 반영한다
 *   (4단 사다리: 작업 정산=재고원가 / 가공 거래=가공원가) → 여기서 또 걷으면 이중계상.
 * - 입출고비: 창고를 거치지 않는다.
 * - 탈펜료: 팬에 담기지 않으니 팬에서 뺄 일이 없다. (2026-07-16 추가)
 *
 * ※ **박스는 제외 대상이 아니다** — 박스·탈펜료 중 박스만 전 용도 그대로 걷는다(사용자 확정).
 */
const FEE_EXEMPT_USES: readonly string[] = ['원프로즌 가공'];
export const isFeeExemptUse = (use: string) => FEE_EXEMPT_USES.includes(use);

/** 생산내역 → 동결비 자동 행. (행선지, 구분) 조합마다 1행: 회수=박스합, 단가=행선지 동결비(구분). */
export function buildFreezeRows(
  prod: ProdRow[],
  resolveId: (name: string) => string,
  fees: Record<string, StorageFee>,
): CostRow[] {
  const agg = new Map<string, { destId: string; gubun: string; boxes: number }>();
  for (const r of prod) {
    if (isFeeExemptUse(r.use)) continue;
    if (!(BOX_INTERNAL as readonly string[]).includes(r.gubun)) continue;
    const destId = resolveId(r.dest);
    const boxes = pn(r.qty);
    if (!destId || boxes <= 0) continue;
    const key = `${destId}|${r.gubun}`;
    const cur = agg.get(key) ?? { destId, gubun: r.gubun, boxes: 0 };
    cur.boxes += boxes;
    agg.set(key, cur);
  }
  return [...agg.values()].map(({ destId, gubun, boxes }) => {
    const fee = fees[destId];
    const rate = fee?.freeze[gubun] ?? 0;
    return {
      id: `frz-${destId}-${gubun}`,
      fixed: false,
      auto: true,
      name: BOX_LABEL[gubun],
      cells: [
        fmt(boxes),
        rate ? `${fmt(rate)} 원` : '',
        rate ? fmt(boxes * rate) : '',
        fee?.name ?? '',
        fee && !rate ? '단가 미등록(보관처 비용 이력)' : '',
      ] as CostRow['cells'],
    };
  });
}

/** 생산내역 → 입출고비 자동 행. 행선지마다 1행: 회수=총박스, 단가=행선지 입출고비. */
export function buildInoutRows(
  prod: ProdRow[],
  resolveId: (name: string) => string,
  fees: Record<string, StorageFee>,
): CostRow[] {
  const agg = new Map<string, number>();
  for (const r of prod) {
    if (isFeeExemptUse(r.use)) continue;
    const destId = resolveId(r.dest);
    const boxes = pn(r.qty);
    if (!destId || boxes <= 0) continue;
    agg.set(destId, (agg.get(destId) ?? 0) + boxes);
  }
  return [...agg.entries()].map(([destId, boxes]) => {
    const fee = fees[destId];
    const rate = fee?.inOutFee ?? 0;
    return {
      id: `io-${destId}`,
      fixed: false,
      auto: true,
      name: '입출고비',
      cells: [
        fmt(boxes),
        rate ? `${fmt(rate)} 원` : '',
        rate ? fmt(boxes * rate) : '',
        fee?.name ?? '',
        fee && !rate ? '단가 미등록(보관처 비용 이력)' : '',
      ] as CostRow['cells'],
    };
  });
}

export const WS_CSS = `
.ws-page{--bg:#FFFFFF;--surface:#FFFFFF;--line:#E7EBF0;--line-2:#D9DFE7;--ink:#1E2530;--muted:#6A7480;--faint:#9AA4B0;--accent:#2E75B6;--accent-ink:#1B4E7F;--accent-soft:#EAF2FA;--green-soft:#E4F3E9;--green-ink:#256B3E;--amber-soft:#FBF0DA;--amber-ink:#8A5A00;--auto:#F4F7FA;--footer:#EFF5FB;--hover:#F5F7F9;--band:#F7F9FB;--shadow:0 1px 2px rgba(20,30,45,.06),0 6px 20px rgba(20,30,45,.05);background:var(--bg);color:var(--ink);font-family:var(--font-pretendard),"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",-apple-system,sans-serif;}
.ws-page *{box-sizing:border-box;}
.ws-page .page{max-width:1180px;margin:0 auto;padding:22px 4px 90px;}
.ws-page .title-row{display:flex;align-items:center;gap:12px;margin:8px 0 2px;}
.ws-page h1{font-size:24px;font-weight:750;letter-spacing:-.01em;margin:0;}
.ws-page .lede{color:var(--muted);font-size:13px;max-width:82ch;margin:8px 0 0;}
.ws-page .lede b{color:var(--ink);font-weight:600;}
.ws-page .fields{display:grid;grid-template-columns:repeat(4,1fr);gap:2px 0;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:6px 4px;margin:18px 0 6px;box-shadow:var(--shadow);}
.ws-page .f{display:flex;flex-direction:column;gap:2px;padding:9px 14px;min-width:0;}
.ws-page .f label{font-size:11px;font-weight:600;color:var(--faint);}
.ws-page .f label .dim{font-weight:400;}
.ws-page .f > input, .ws-page .f select{border:0;background:transparent;color:var(--ink);font:inherit;font-size:14px;font-weight:600;padding:3px 2px;border-radius:5px;width:100%;outline:none;transition:background .1s;}
.ws-page .f > input:hover, .ws-page .f select:hover{background:var(--hover);}
.ws-page .f > input:focus, .ws-page .f select:focus{background:var(--accent-soft);box-shadow:inset 0 0 0 1.5px var(--accent);}
.ws-page .f > input::placeholder{color:var(--faint);font-weight:400;}
.ws-page .time-range{display:flex;align-items:center;gap:5px;padding-top:2px;}
.ws-page .time-range input{flex:1;min-width:0;border:0;background:transparent;color:var(--ink);font:inherit;font-size:14px;font-weight:600;padding:3px 2px;border-radius:5px;outline:none;}
.ws-page .time-range input:hover{background:var(--hover);}
.ws-page .time-range input:focus{background:var(--accent-soft);box-shadow:inset 0 0 0 1.5px var(--accent);}
.ws-page .time-range .tl{color:var(--muted);font-weight:600;font-size:13px;}
.ws-page .chk{display:inline-flex;align-items:center;gap:9px;cursor:pointer;padding-top:4px;user-select:none;}
.ws-page .chk input{position:absolute;opacity:0;width:1px;height:1px;}
.ws-page .chk-box{width:20px;height:20px;border:1.5px solid var(--line-2);border-radius:6px;display:inline-flex;align-items:center;justify-content:center;background:var(--surface);flex:none;}
.ws-page .chk input:checked + .chk-box{background:var(--accent);border-color:var(--accent);}
.ws-page .chk input:checked + .chk-box::after{content:"";width:5px;height:9px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg);margin-top:-2px;}
.ws-page .chk-txt{font-size:14px;font-weight:700;color:var(--ink);min-width:12px;}
.ws-page .cap{font-size:11px;color:var(--faint);margin:8px 4px 26px;}
.ws-page .wsblock{margin:0 0 24px;}
.ws-page .sec-title{display:flex;align-items:baseline;gap:9px;margin:0 2px 11px;flex-wrap:wrap;}
.ws-page .sec-title h2{font-size:15.5px;font-weight:700;margin:0;letter-spacing:-.005em;}
.ws-page .sec-title .sub{font-size:12px;color:var(--faint);font-weight:500;}
.ws-page .table-wrap{background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow-x:auto;box-shadow:var(--shadow);}
.ws-page table{border-collapse:collapse;width:100%;font-size:13px;}
.ws-page #prod{min-width:1120px;}
.ws-page #cost{min-width:820px;}
.ws-page thead th{background:var(--surface);text-align:left;font-size:11px;font-weight:600;color:var(--muted);padding:11px 10px 9px;border-bottom:1px solid var(--line-2);white-space:nowrap;}
.ws-page th.n{text-align:right;}
.ws-page th.ni{text-align:center;}
.ws-page th .dim{font-weight:400;color:var(--faint);}
.ws-page tbody td{border-bottom:1px solid var(--line);padding:0;vertical-align:middle;}
.ws-page tr.p-row:hover,.ws-page tr.c-row:hover{background:var(--hover);}
.ws-page td.txt input, .ws-page td.n input{border:0;background:transparent;color:var(--ink);font:inherit;font-size:13px;width:100%;padding:10px 11px;outline:none;transition:box-shadow .1s,background .1s;}
.ws-page td.n input{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;padding:10px 10px;}
.ws-page td.txt input{font-weight:500;}
.ws-page td input:hover{background:var(--hover);}
.ws-page td input:focus{box-shadow:inset 0 0 0 1.6px var(--accent);background:var(--accent-soft);}
.ws-page td input::placeholder{color:var(--faint);font-weight:400;}
.ws-page td.auto{background:var(--auto);text-align:right;font-variant-numeric:tabular-nums;padding:10px 10px;color:var(--ink);font-weight:600;white-space:nowrap;}
.ws-page td.auto.em{color:var(--accent-ink);}
.ws-page td.del-cell{text-align:center;padding:0 4px;}
.ws-page .del{border:0;background:transparent;color:var(--faint);cursor:pointer;font-size:16px;line-height:1;width:26px;height:26px;border-radius:6px;opacity:0;transition:opacity .1s,background .1s,color .1s;}
.ws-page tr:hover .del{opacity:1;}
.ws-page .del:hover{background:#e5484d1a;color:#e5484d;}
.ws-page td.pct-cell{padding:0;}
.ws-page .pctw{display:flex;align-items:center;justify-content:center;padding:8px 4px;gap:1px;}
.ws-page .pct-in{border:0;background:transparent;color:var(--ink);font:inherit;font-size:13px;font-weight:500;outline:none;padding:2px 3px;border-radius:5px;text-align:center;max-width:44px;transition:background .1s;}
.ws-page .pct-in:hover{background:var(--hover);}
.ws-page .pct-in:focus{box-shadow:inset 0 0 0 1.6px var(--accent);background:var(--accent-soft);}
.ws-page .pct{color:var(--faint);font-size:12px;font-weight:600;}
/* 텍스트 컬럼은 목업대로 가운데. 숫자 컬럼(중량·수량·단가·금액)은 우측 정렬 통일 —
   앱 전체 표 규칙과 동일(우측 정렬 + tabular-nums + 천단위 콤마 + 단위 값 뒤). */
.ws-page #prod thead th{text-align:center;}
.ws-page #prod thead th.n, .ws-page #prod thead th.ni{text-align:right;}
.ws-page #prod td.txt input{text-align:center;}
.ws-page #cost thead th{text-align:center;}
.ws-page #cost thead th.n, .ws-page #cost thead th.ni{text-align:right;}
.ws-page #cost td.txt input, .ws-page #cost td .combo > input{text-align:center;}
.ws-page #cost td.fixed-name .fx{text-align:center;}
.ws-page td .roval{display:block;padding:10px 10px;font-size:13px;text-align:center;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap;}
.ws-page td.n .roval{text-align:right;}
.ws-page td .roval.robigo{color:var(--amber-ink);font-size:11px;font-weight:600;white-space:normal;}
.ws-page #cost .phcell{padding:14px;text-align:center;color:var(--faint);font-size:12px;}
.ws-page #cost .phcell b{color:var(--muted);font-weight:600;}
.ws-page .autotag{font-size:10.5px;font-weight:600;color:var(--accent);}
.ws-page td.use, .ws-page td.gubun{padding:0;}
.ws-page td.use select, .ws-page td.gubun select{margin:6px 8px;width:calc(100% - 16px);border:0;font:inherit;font-size:11.5px;font-weight:700;padding:5px 6px;border-radius:7px;cursor:pointer;outline:none;}
.ws-page select.u-frozen{background:var(--accent-soft);color:var(--accent-ink);}
.ws-page select.u-proc{background:var(--amber-soft);color:var(--amber-ink);}
.ws-page select.u-fresh{background:var(--green-soft);color:var(--green-ink);}
.ws-page select.u-none{background:var(--band);color:var(--faint);}
.ws-page td.gubun select{background:var(--band);color:var(--ink);}
.ws-page td.io-dogam, .ws-page td .io-dogam{width:calc(100% - 4px);margin:4px 2px;border:0;background:var(--band);color:var(--ink);font:inherit;font-size:12px;font-weight:600;padding:8px 8px;border-radius:7px;outline:none;cursor:pointer;}
.ws-page td.fixed-name{background:var(--band);}
.ws-page tr.c-row > td:first-child{box-shadow:inset 3px 0 0 var(--accent);background:var(--band);}
.ws-page td.fixed-name .fx{display:block;padding:10px 12px;font-weight:600;color:var(--ink);font-size:13px;white-space:nowrap;}
.ws-page tr.grp td{background:var(--band);padding:0;border-bottom:1px solid var(--line);}
.ws-page .grp-bar{display:flex;justify-content:space-between;align-items:center;padding:9px 13px 8px;}
.ws-page .grp-name{font-size:12px;font-weight:700;color:var(--ink);}
.ws-page .grp-sub{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;}
.ws-page .grp-sub b{color:var(--ink);font-weight:700;font-size:14px;}
.ws-page tr.grp-add td{padding:3px 8px 9px;border-bottom:2px solid var(--line-2);}
.ws-page .add-in{border:0;background:transparent;color:var(--accent);font:inherit;font-size:12px;font-weight:600;padding:4px 9px;border-radius:6px;cursor:pointer;}
.ws-page .add-in:hover{background:var(--accent-soft);}
.ws-page #cost tbody{counter-reset:runno;}
.ws-page tr.c-row[data-g="운임"]{counter-increment:runno;}
.ws-page tr.c-row[data-g="운임"] > td:first-child > input{padding-left:30px;}
.ws-page tr.c-row[data-g="운임"] > td:first-child{position:relative;}
.ws-page tr.c-row[data-g="운임"] > td:first-child::before{content:counter(runno,decimal) ".";position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--accent);font-weight:700;font-size:13px;pointer-events:none;}
.ws-page .add{margin:9px 2px 0;border:1px dashed var(--line-2);background:transparent;color:var(--muted);font:inherit;font-size:12.5px;font-weight:600;padding:7px 14px;border-radius:8px;cursor:pointer;}
.ws-page .add:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-soft);}
.ws-page .summary{display:flex;flex-wrap:wrap;gap:2px;background:var(--footer);border:1px solid var(--line-2);border-radius:13px;padding:6px;margin:6px 0 22px;box-shadow:var(--shadow);}
.ws-page .sum-item{flex:1 1 150px;display:flex;flex-direction:column;gap:5px;padding:15px 18px;position:relative;}
.ws-page .sum-item + .sum-item::before{content:"";position:absolute;left:0;top:16px;bottom:16px;width:1px;background:var(--line-2);}
.ws-page .sum-item .k{font-size:11.5px;font-weight:600;color:var(--muted);}
.ws-page .sum-item .k em{font-style:normal;color:var(--faint);font-weight:500;font-size:10.5px;}
.ws-page .sum-item .v{font-size:20px;font-weight:750;font-variant-numeric:tabular-nums;letter-spacing:-.01em;}
.ws-page .sum-item.hl .v{color:var(--accent);}
.ws-page .sum-item.hl .v .u{font-size:12px;font-weight:600;color:var(--faint);margin-left:3px;}
.ws-page .actions{display:flex;justify-content:flex-end;gap:10px;align-items:center;}
.ws-page .btn{font:inherit;font-size:13.5px;font-weight:650;padding:10px 20px;border-radius:9px;cursor:pointer;transition:.12s;}
.ws-page .btn.ghost{background:var(--surface);border:1px solid var(--line-2);color:var(--ink);}
.ws-page .btn.ghost:hover{background:var(--hover);border-color:var(--accent);color:var(--accent);}
.ws-page .btn.primary{background:var(--accent);border:1px solid var(--accent);color:#fff;}
.ws-page .btn.primary:hover{filter:brightness(1.06);}
.ws-page .btn:disabled{opacity:.5;cursor:default;}
.ws-page .backlink{font-size:12.5px;font-weight:600;color:var(--muted);text-decoration:none;}
.ws-page .backlink:hover{color:var(--accent);}
.ws-page .ctxbar{display:flex;flex-wrap:wrap;gap:18px;align-items:center;background:var(--band);border:1px solid var(--line);border-radius:11px;padding:12px 16px;margin:12px 0 22px;}
.ws-page .ctxbar .ci{display:flex;flex-direction:column;gap:2px;}
.ws-page .ctxbar .ck{font-size:10.5px;font-weight:600;color:var(--faint);}
.ws-page .ctxbar .cv{font-size:14px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums;}
.ws-page .ctxbar .edit{margin-left:auto;border:0;background:transparent;font:inherit;font-size:12px;font-weight:600;color:var(--accent);text-decoration:none;cursor:pointer;padding:0;}
.ws-page .ctxbar .edit:hover{opacity:.75;}
.ws-page .ctx-edit{margin:10px 0 22px;}
.ws-page .ctx-edit .fields{margin:0;}
.ws-page .fields-actions{grid-column:1/-1;display:flex;justify-content:flex-end;padding:10px 14px 6px;margin-top:4px;border-top:1px solid var(--line);}
.ws-page .steps{display:flex;gap:8px;align-items:center;font-size:12px;font-weight:600;color:var(--faint);margin:10px 0 0;}
.ws-page .steps .on{color:var(--accent);}
.ws-page .steps .sep{color:var(--line-2);}
.ws-page .steps a{color:var(--accent);text-decoration:underline;text-underline-offset:3px;}
.ws-page .steps a:hover{opacity:.7;}
.ws-page .combo{position:relative;width:100%;}
.ws-page .combo > input{border:0;background:transparent;color:var(--ink);font:inherit;font-size:14px;font-weight:600;padding:3px 2px;border-radius:5px;width:100%;outline:none;transition:background .1s;}
.ws-page .combo > input:hover{background:var(--hover);}
.ws-page .combo > input:focus{background:var(--accent-soft);box-shadow:inset 0 0 0 1.5px var(--accent);}
.ws-page .combo > input::placeholder{color:var(--faint);font-weight:400;}
.ws-page .time-range{gap:4px;}
.ws-page .time-range .combo{flex:none;width:60px;}
.ws-page td .combo > input{font-size:13px;font-weight:500;padding:10px 11px;}
.ws-combo-portal{z-index:9999;background:#fff;border:1px solid #D9DFE7;border-radius:9px;box-shadow:0 8px 24px rgba(20,30,45,.14);max-height:172px;overflow-y:auto;max-width:280px;padding:4px;font-family:var(--font-pretendard),"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",-apple-system,sans-serif;}
.ws-combo-opt{padding:7px 11px;font-size:13px;font-weight:600;border-radius:6px;cursor:pointer;color:#1E2530;white-space:nowrap;font-variant-numeric:tabular-nums;}
.ws-combo-opt:hover,.ws-combo-opt.active{background:#EAF2FA;color:#1B4E7F;}
@media (max-width:720px){.ws-page .fields{grid-template-columns:repeat(2,1fr);}.ws-page h1{font-size:21px;}}
`;
