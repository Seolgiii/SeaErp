// ─────────────────────────────────────────────────────────────────────────────
// 거래 이력(원장) 표 컬럼 정의 — 입고·출고·이동·지출 이력이 공유
//
// 폭·넘침 정책은 app/admin/_table-cols.tsx(표준)를 그대로 따른다:
//   잘라내지 않고 전부 표시 + 총폭이 화면을 넘으면 가로 스크롤.
//
// 아래 px = **실측 기준**(2026-07-28, Airtable 입고 관리 200건 전량의 표시 문자열 길이)
//   px = 내용 최댓값 + 여유 8 + 좌우 패딩 24(CELL_X = px-3)
//
// ⚠ 2026-07-30: 표 본문을 13px → `text-body`(14px)로 올렸다. 13px은 DESIGN.md §3 타입
//   스케일에 없는 값이었고, 이 표만 재고 조회·마스터 7화면(14px)보다 1px 작아 보였다.
//   아래 '내용 최댓값'은 그래서 **13px 실측값 × 14/13 산술 환산**이고, 4의 배수로 올림했다.
//   → **재실측이 아니므로 육안 확인이 필요하다.** 어긋나면 넘치는 게 아니라 옆 칸으로
//     밀려 보인다(§7-2 말줄임 폐지의 대가). 원 실측값은 각 줄 주석에 13px 기준으로 남겼다.
//   배지 컬럼(status)만 그대로다 — 배지 글자는 text-[12px] 하드코딩이라 표 폰트와 무관하다.
//   총폭 1480 → 1564px. DESIGN §10 "입고 이력 재발 가능"(컨테이너가 총폭을 넘으면 브라우저가
//   전 컬럼을 비례 확대)의 임계가 그만큼 뒤로 밀렸다 — 위험이 커진 게 아니라 줄었다.
//
// ⚠ 2026-07-30: 헤더도 text-[12px] font-bold(700) → text-table-head(14px/500)로 바뀌었다.
//   대부분 컬럼은 내용이 하한이라 무관하지만, `worker`(작업자, 3자 라벨)는 내용 최댓값(42)에
//   거의 붙어 있어 헤더가 새로 하한이 될 수 있었다 — 76→84로 안전 마진을 더 뒀다(총폭 1572px).
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
  /** max 68→74 `2026-07-27` */
  date: col({ key: 'date', label: '입고일', px: 108 }),
  /** max 206→222 `251002-MA1-21.5/22-점70/80-0008` — 잘리지 않게 전부 수용 */
  lotNumber: col({ key: 'lotNumber', label: 'LOT번호', px: 256 }),
  /** max 111→120 `사료 (BOAR FISH)` */
  product: col({ key: 'product', label: '품목', px: 152 }),
  /** max 59→64 `11.5~12kg` */
  spec: col({ key: 'spec', label: '규격', px: 96 }),
  /** max 62→67 `80/120G미` */
  misu: col({ key: 'misu', label: '미수', px: 100 }),
  /** max 59→64 `1,000박스` */
  qty: col({ key: 'qty', label: '수량', px: 96, numeric: true }),
  /** max 60→65 `466,712원` */
  unitPrice: col({ key: 'unitPrice', label: '수매가', px: 100, numeric: true }),
  /** max 86→93 `115,783,629원` */
  amount: col({ key: 'amount', label: '매입액', px: 128, numeric: true }),
  /** max 161→174 `CORNELIS VROLI JK B.V` — 외국 거래처까지 전부 수용 */
  partner: col({ key: 'partner', label: '매입처', px: 208 }),
  /** max 98→106 `신우농수산2공장` */
  storage: col({ key: 'storage', label: '보관처', px: 140 }),
  /** max 39→42(3자 이름). 76→84(2026-07-30, 헤더 14px 전환으로 헤더가 다시 하한권) */
  worker: col({ key: 'worker', label: '작업자', px: 84 }),
  /** `승인 완료` 배지 = 글자 56 + 배지 px-2 16 = 72. 배지는 12px 고정이라 환산 대상 아님 */
  status: col({ key: 'status', label: '상태', px: 104 }),
};
