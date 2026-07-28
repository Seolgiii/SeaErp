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
  /**
   * **「말줄임 금지」의 예외** — 이 컬럼만 상한 폭 + 말줄임(…) + title 툴팁.
   *
   * 자유 텍스트(비고·메모)처럼 **최댓값을 예측할 수 없는** 컬럼에만 쓴다.
   * 그런 컬럼은 실측 최댓값을 그대로 수용하면 ① 한 컬럼이 표 폭을 지배하고
   * ② 그 최댓값마저 언제든 갱신돼 옆 칸으로 넘친다 — 둘 다 상한이 있어야 막힌다.
   *
   * ⚠ 값이 유한하고 예측 가능한 컬럼(LOT번호·거래처명·규격 등)에는 쓰지 말 것.
   *   그쪽은 폭을 키워 전부 보여주는 게 원칙이다.
   */
  clamp?: boolean;
};

/**
 * 표 minWidth = 컬럼 폭의 합.  이보다 좁아지면 축소가 아니라 가로 스크롤.
 *
 * 스페이서(아래 `spacer`)는 `cols`에 넣지 않으므로 이 합계에 **구조적으로 포함되지 않는다.**
 * 스페이서는 남는 폭을 먹는 칸이지 확보해야 할 최소 폭이 아니다.
 */
export function tableMinWidth(cols: readonly TableCol[]): number {
  return cols.reduce((sum, c) => sum + c.px, 0);
}

/**
 * colgroup.  `spacer` 여부로 남는 폭 처리가 갈린다.
 *
 * · spacer 없음(기본) — px를 %로 환산. 화면이 넓어지면 **모든 컬럼이 비례해 늘어난다.**
 *   컬럼이 많고 합계가 화면 폭에 가까운 표(거래 이력 등)에 맞다.
 *
 * · `spacer` — 컬럼은 설계 px 그대로 두고, **맨 끝 빈 `<col />`이 남는 폭을 전부 흡수한다.**
 *   컬럼이 적어 합계가 화면 폭보다 훨씬 작은 표(마스터 목록 등)에 맞다.
 *   비례 확대에 맡기면 배지 한 개짜리 컬럼이 200px씩 벌어져 값이 빈 공간에 떠 보인다.
 *   (손익 추이·매입 통계가 쓰던 패턴을 공통화한 것)
 *
 * ⚠ spacer를 쓰면 헤더 행 끝에 대응하는 빈 셀이 필요하다 → `<SpacerCell as="th" />`.
 */
export function TableColGroup({
  cols,
  spacer = false,
}: {
  cols: readonly TableCol[];
  spacer?: boolean;
}) {
  if (spacer) {
    return (
      <colgroup>
        {cols.map((c) => (
          <col key={c.key} style={{ width: c.px }} />
        ))}
        {/* 폭 미지정 = 남는 폭 전부 */}
        <col />
      </colgroup>
    );
  }
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
 * 스페이서 컬럼의 셀 — 내용이 없는 레이아웃 전용 칸이라 보조기기에서 숨긴다.
 * 행 배경·테두리가 스페이서 영역까지 이어지도록 tbody 행에도 넣는다.
 */
export function SpacerCell({ as = 'td' }: { as?: 'td' | 'th' }) {
  const Tag = as;
  return <Tag aria-hidden="true" className="p-0" />;
}

/**
 * 셀 클래스 빌더 — 화면마다 다른 좌우 패딩(px-3 / px-4)을 하나로 고정해 쓴다.
 * 컬럼 간격은 이 패딩 하나로만 맞춘다(가운데정렬로 간격 맞추기 금지).
 */
export function makeCellClasses(paddingX: string, paddingY = 'py-3') {
  return {
    /** 헤더·텍스트 값 셀 — 줄바꿈 없음, 잘림 없음. */
    cell: (extra = '') => `whitespace-nowrap ${paddingX} ${paddingY} ${extra}`.trim(),
    /**
     * clamp 컬럼(자유 텍스트) 전용 — 상한 폭에서 말줄임(…).
     * 이 셀에는 반드시 `title`로 전문을 달아 값을 잃지 않게 할 것.
     */
    clamp: (extra = '') => `truncate ${paddingX} ${paddingY} ${extra}`.trim(),
    /** 패딩만 — NumCell/NumHead(이미 nowrap·우측정렬)와 tfoot 빈 칸용. */
    pad: (extra = '') => `${paddingX} ${paddingY} ${extra}`.trim(),
  };
}
