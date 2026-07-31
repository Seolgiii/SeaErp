// ─────────────────────────────────────────────────────────────────────────────
// <LotLink> — LOT 생애주기 진입 단일 창구 (2026-07-30)
//
// **LOT 생애주기로 들어가는 길은 이 컴포넌트 하나뿐이다.** 화면별 `router.push` 금지.
//
// 왜 행 클릭이 아니라 링크인가 (2026-07-30 결정):
//   행 전체 클릭은 타겟이 크지만 비용이 구조적이다 —
//     ① 셀 안 텍스트를 드래그해 복사하면 손 뗄 때 페이지가 이동한다(재고 조회 실제 버그였음)
//     ② `router.push`는 Ctrl+클릭·우클릭 '새 탭에서 열기'가 안 된다.
//        이 앱엔 탭바·창 안 분할이 있어 "원장은 왼쪽, LOT은 오른쪽"이 실제로 쓰이는 환경이다
//     ③ 12컬럼 행의 아무 데나 눌러 한 곳으로 가므로 목적지가 표면에 안 보인다
//     ④ 행이 나중에 다른 액션을 못 갖는다
//   링크의 유일한 단점(작은 타겟)은 **셀 전체를 링크로 만들면** 해소된다 → 아래 `block` + 패딩.
//
// ⚠ 그래서 이 링크는 `<td>`의 패딩을 대신 갖는다. 호출부는 `<td className="p-0">`로 두고
//   패딩을 `className`으로 넘긴다(표마다 px-3 py-3 / px-4 py-2로 달라 강제하지 않는다).
//   패딩을 td에 남기면 링크가 내용 상자만 덮어 세로 타겟이 20px로 얇아진다.
//
// `draggable={false}` — 링크는 기본적으로 드래그 시 이동이 시작돼 텍스트 선택을 방해한다.
//   LOT번호는 복사해서 쓰는 값이므로(카톡·엑셀) 선택을 살린다.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';

/** LOT 생애주기 URL. `?lot=`으로 넘기면 그 화면이 자동 조회한다. */
export function lotTimelineHref(lotNumber: string): string {
  return `/admin/master/lot-timeline?lot=${encodeURIComponent(lotNumber)}`;
}

export interface LotLinkProps {
  /** LOT번호. 빈 값이면 링크가 아니라 `empty`를 그대로 렌더한다. */
  lotNumber: string | null | undefined;
  /** 패딩·글자 굵기 등 표별 클래스. 색(`text-link`)은 이 컴포넌트가 고정한다. */
  className?: string;
  /**
   * LOT번호 뒤에 함께 담을 것(재고 조회의 상태 배지 등).
   *
   * ⚠ **LOT번호 텍스트를 `inline-flex`/`inline-block`으로 감싸지 말 것.**
   * text-decoration은 그런 원자 상자 안으로 전파되지 않아 hover 밑줄이 조용히 사라진다.
   * 정렬·간격이 필요하면 감싸지 말고 옆 요소에 margin을 준다.
   */
  children?: React.ReactNode;
  /** LOT번호가 없을 때 표시할 값. 표마다 `—`/`-`가 달라 주입받는다. */
  empty?: string;
  /** 툴팁. 화면에 따라 원가 노출 여부가 달라 문구를 바꾼다. */
  title?: string;
}

export function LotLink({
  lotNumber,
  className = '',
  children,
  empty = '—',
  title = '클릭해 LOT 생애주기·원가 보기',
}: LotLinkProps) {
  if (!lotNumber) {
    // 링크가 아닌 행도 패딩은 같아야 한다 — 안 그러면 그 행만 높이가 다르다.
    return <span className={`block text-text-muted ${className}`.trim()}>{empty}</span>;
  }

  return (
    <Link
      href={lotTimelineHref(lotNumber)}
      title={title}
      draggable={false}
      className={`block text-link hover:underline ${className}`.trim()}
    >
      {children ?? lotNumber}
    </Link>
  );
}
