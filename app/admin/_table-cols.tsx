// ─────────────────────────────────────────────────────────────────────────────
// 목록 테이블 폭·넘침 표준 (2026-07-28) — /admin PC 데이터 화면 공통
//
// 정책: **잘라내지 않는다.** 모든 컬럼이 데이터 최댓값을 그대로 보여주고,
//       표 총폭이 화면을 넘으면 컨테이너에서 가로 스크롤한다.
//   · 컬럼 폭 = 실측 데이터 최댓값 + 여유 8px + 셀 좌우 패딩
//   · 말줄임(truncate)·title 툴팁 없음 — 값은 항상 전부 보인다
//   · 줄바꿈 없음(whitespace-nowrap) → 행 높이는 모든 행에서 동일
//
// 필수 3종 세트(하나라도 빠지면 정책이 깨진다):
//   <div className="overflow-x-auto">                    ← 가로 스크롤은 여기서만
//     <table className="w-full table-fixed"              ← w-full: 넓은 화면에선 비례 확대
//            style={{ minWidth: tableMinWidth(COLS) }}>  ← 좁아지면 축소 대신 스크롤
//       <TableColGroup cols={COLS} />                    ← % 는 px에서 자동 환산
//
//   · table-fixed — 검색·필터로 행이 바뀌어도 컬럼 폭이 재계산되지 않는다(흔들림 방지).
//   · minWidth를 tableMinWidth()로 뽑는 게 핵심. 예전엔 colgroup 합계와 minWidth를
//     따로 적어서(입고 이력 1340 vs 1276) 좁은 창에서 브라우저가 전 컬럼을 95%로
//     축소했고, 그래서 선언한 폭이 지켜지지 않았다. 이제 구조적으로 어긋날 수 없다.
//   · thead·tbody가 같은 <table> 안에 있으므로 가로 스크롤 시 헤더가 컬럼과 함께 움직인다.
//     (헤더를 별도 테이블로 빼면 어긋난다 — 그렇게 하지 말 것.)
//
// ⚠ 실측 최댓값보다 긴 값이 새로 들어오면 그 셀은 잘리는 대신 옆 칸으로 넘쳐 보인다.
//   말줄임을 버린 대가다. 자유 텍스트 컬럼(비고 등)은 주기적으로 폭을 재측정할 것.
// ─────────────────────────────────────────────────────────────────────────────

export type TableCol = {
  key: string;
  label: string;
  /** 폭(px) = 실측 내용 최댓값 + 8 + 셀 좌우 패딩. 헤더 폭보다 작으면 안 된다. */
  px: number;
  /** 수량·중량·금액·단가 — 헤더는 NumHead, 값은 NumCell(우측 정렬). */
  numeric?: boolean;
};

/** 표 minWidth = 컬럼 폭의 합. 이보다 좁아지면 축소가 아니라 가로 스크롤. */
export function tableMinWidth(cols: readonly TableCol[]): number {
  return cols.reduce((sum, c) => sum + c.px, 0);
}

/**
 * colgroup — px를 %로 환산해 넣는다.
 * minWidth에서는 설계 px 그대로, 더 넓은 화면에서는 각 컬럼이 같은 비율로 늘어난다.
 */
export function TableColGroup({ cols }: { cols: readonly TableCol[] }) {
  const total = tableMinWidth(cols);
  return (
    <colgroup>
      {cols.map((c) => (
        <col key={c.key} style={{ width: `${((c.px / total) * 100).toFixed(4)}%` }} />
      ))}
    </colgroup>
  );
}

/**
 * 셀 클래스 빌더 — 화면마다 다른 좌우 패딩(px-3 / px-4)을 하나로 고정해 쓴다.
 * 컬럼 간격은 이 패딩 하나로만 맞춘다(가운데정렬로 간격 맞추기 금지).
 */
export function makeCellClasses(paddingX: string, paddingY = 'py-3') {
  return {
    /** 헤더·텍스트 값 셀 — 줄바꿈 없음, 잘림 없음. */
    cell: (extra = '') => `whitespace-nowrap ${paddingX} ${paddingY} ${extra}`.trim(),
    /** 패딩만 — NumCell/NumHead(이미 nowrap·우측정렬)와 tfoot 빈 칸용. */
    pad: (extra = '') => `${paddingX} ${paddingY} ${extra}`.trim(),
  };
}
