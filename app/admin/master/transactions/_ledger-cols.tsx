// ─────────────────────────────────────────────────────────────────────────────
// 거래 이력(원장) 표 컬럼 정의 — 입고·출고·이동·지출 이력이 공유
//
// 폭·넘침 정책은 app/admin/_table-cols.tsx(표준)를 그대로 따른다:
//   잘라내지 않고 전부 표시 + 총폭이 화면을 넘으면 가로 스크롤.
//
// 아래 px = **실측 기준**(2026-07-28, Airtable 입고 관리 200건 전량의 표시 문자열 길이)
//   px = 내용 최댓값 + 여유 8 + 좌우 패딩 24(CELL_X = px-3)
// ─────────────────────────────────────────────────────────────────────────────

import {
  makeCellClasses,
  tableMinWidth,
  TableColGroup,
  type TableCol,
} from '@/app/admin/_table-cols';

/** 전 셀 좌우 패딩 — 컬럼 간격은 이 값 하나로만 맞춘다. */
export const CELL_X = 'px-3';
/** CELL_X 좌우 합 — 아래 px가 '내용 최댓값 + 8 + 24'로 잡힌 근거. */
export const CELL_PAD = 24;

export type LedgerCol = TableCol;

const cls = makeCellClasses(CELL_X);
/** 헤더·텍스트 값 셀 (줄바꿈·잘림 없음). */
export const ledgerCell = cls.cell;
/** 패딩만 — NumCell/NumHead(이미 nowrap·우측정렬)·tfoot 빈 칸용. */
export const ledgerPad = cls.pad;

export const ledgerMinWidth = tableMinWidth;
export const LedgerColGroup = TableColGroup;

/**
 * 공통 컬럼 스펙. 화면마다 라벨이 다르면(입고일/출고일, 매입처/판매처)
 * `{ ...LEDGER_COL.date, label: '출고일' }` 로 덮어쓴다 — 폭은 그대로 공유.
 */
const col = (c: LedgerCol): LedgerCol => c;
export const LEDGER_COL = {
  /** max 68 `2026-07-27` */
  date: col({ key: 'date', label: '입고일', px: 100 }),
  /** max 206 `251002-MA1-21.5/22-점70/80-0008` — 잘리지 않게 전부 수용 */
  lotNumber: col({ key: 'lotNumber', label: 'LOT번호', px: 240 }),
  /** max 111 `사료 (BOAR FISH)` */
  product: col({ key: 'product', label: '품목', px: 144 }),
  /** max 59 `11.5~12kg` */
  spec: col({ key: 'spec', label: '규격', px: 92 }),
  /** max 62 `80/120G미` */
  misu: col({ key: 'misu', label: '미수', px: 96 }),
  /** max 59 `1,000박스` */
  qty: col({ key: 'qty', label: '수량', px: 92, numeric: true }),
  /** max 60 `466,712원` */
  unitPrice: col({ key: 'unitPrice', label: '수매가', px: 92, numeric: true }),
  /** max 86 `115,783,629원` */
  amount: col({ key: 'amount', label: '매입액', px: 120, numeric: true }),
  /** max 161 `CORNELIS VROLI JK B.V` — 외국 거래처까지 전부 수용 */
  partner: col({ key: 'partner', label: '매입처', px: 196 }),
  /** max 98 `신우농수산2공장` */
  storage: col({ key: 'storage', label: '보관처', px: 132 }),
  /** max 39(3자 이름) — 헤더('작업자' 39)가 하한 */
  worker: col({ key: 'worker', label: '작업자', px: 72 }),
  /** `승인 완료` 배지 = 글자 56 + 배지 px-2 16 = 72 */
  status: col({ key: 'status', label: '상태', px: 104 }),
};
