// ─────────────────────────────────────────────────────────────────────────────
// /admin 접근 허용 규칙 — WORKER 예외 경로의 단일 출처 (2026-08-03)
//
// /admin은 원래 ADMIN/MASTER 전용이다. '작업 정산'만 현장에서 다 같이 채우는
// 기록이라 WORKER에게도 열었다.
//
// 게이트가 **두 겹**이라 여기 한 곳에 둔다:
//   app/admin/AdminAuthGate.tsx   — /admin/* 전체 (통과 못 하면 '/'로 튕김)
//   app/admin/master/layout.tsx   — /admin/master/* 셸 + 사이드바 항목 필터
// 한쪽만 고치면 다른 쪽에서 막혀 '왜 안 열리지'가 된다. 실제로 그렇게 한 번 막혔다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WORKER에게 열어주는 /admin 경로.
 *
 * ⚠ 여기 경로를 추가하는 건 **작업자 전원에게 그 화면을 여는 것**이다.
 *   원가·마스터 데이터·결재는 넣지 말 것.
 * ⚠ 화면이 열려도 그 안의 파괴적 액션까지 열리는 건 아니다 —
 *   확정은 ADMIN, 삭제·취소는 MASTER로 서버가 따로 막는다.
 */
export const WORKER_ALLOWED_PREFIXES: readonly string[] = [
  '/admin/master/work-settlement',
];

/** 이 경로를 WORKER가 볼 수 있는가. prefix 매칭이라 하위 경로(/new, /[id], /split)도 함께 열린다. */
export function isWorkerAllowedPath(pathname: string): boolean {
  return WORKER_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
