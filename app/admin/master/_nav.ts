/**
 * IA 6 카테고리(2026-05-28 결정) 기반 admin 사이드바 nav 정의.
 *
 * URL은 일단 모두 /admin/master/* 유지 (admin shell 재사용 위함) — phase 3 후반에
 * 카테고리별 디렉터리(/admin/approval, /admin/transactions, /admin/cost, /admin/ops)로
 * 일괄 이전 예정.
 *
 * enabled=false 항목은 catch-all `[...slug]/page.tsx`가 ComingSoonPage로 받아낸다.
 */

export type NavItem = {
  href: string;
  label: string;
  enabled: boolean;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: '결재',
    items: [
      { href: '/admin/master/approval/inbox', label: '결재 수신함', enabled: true },
      // 수신함이 대기/완료 탭 + 다중선택 일괄을 모두 담당 → '일괄 처리 표' 제거(기능 중복).
      // 과거 결재 검색은 거래 이력의 결재상태 필터로 흡수 → '결재 이력·검색' 제거('이력' 명사 충돌 해소).
    ],
  },
  {
    title: '재고',
    items: [
      { href: '/admin/master/lots', label: '재고 조회', enabled: true },
      { href: '/admin/master/inventory-summary', label: '재고 집계', enabled: true },
      // 2026-07-29: 소진 LOT을 재고 조회에서 분리. 상태 칩(활성/소진/전체)은 함께 제거.
      //   ① 재고장 인쇄 안전 — 재고 조회는 인쇄해서 재고장이 되는데, 칩을 '전체'로 바꾸면
      //      소진 LOT까지 선택·인쇄할 수 있었다. 화면을 갈라 구조로 막는다.
      //   ② 소진은 영구히 쌓인다 — 서버 scope로 걸러 재고 조회가 안 무거워지게.
      //   명칭: '재고 이력'을 검토했으나 아래 '거래 이력' 그룹(입고/출고/이동/지출 이력)과
      //   헷갈려 기각했다. 과거 '결재 이력·검색'을 없앤 것과 같은 이유(§8-2 '이력' 명사 충돌).
      //   '소진'은 LOT 상태값이자 재고 집계 토글이 이미 쓰는 말이라 새 용어가 아니다.
      { href: '/admin/master/lots-depleted', label: '소진 LOT', enabled: true },
      // LOT 생애주기는 메뉴에서 제외 — 재고 조회·소진 LOT 행 클릭으로 진입하는 drill-down 상세.
      //   라우트(/admin/master/lot-timeline)는 그대로 존재하며 ?lot= 으로 자동 조회.
      //   ⚠ 소진 LOT을 분리한 덕에 소진된 LOT의 생애주기도 LOT 단위로 찾아갈 수 있게 됐다.
      //     (전에는 재고 조회 칩을 바꾸거나 거래 이력에서 출고 건을 찾아 들어가야 했다.)
      // 음수·이상 LOT 모니터는 시스템·운영 카테고리로 이동.
    ],
  },
  {
    // 재고를 생성·변환하는 등록 작업 — 거래 이력(읽기 전용 원장)과 성격이 다르다.
    // 작업 정산=원물 매입 정산→LOT 생성 / 가공 거래=원물→가공품 변환.
    title: '재고 작업',
    items: [
      { href: '/admin/master/work-settlement', label: '작업 정산', enabled: true },
      { href: '/admin/master/processing', label: '가공 거래', enabled: true },
    ],
  },
  {
    title: '거래 이력',
    items: [
      { href: '/admin/master/transactions/inbound', label: '입고 이력', enabled: true },
      { href: '/admin/master/transactions/outbound', label: '출고 이력', enabled: true },
      { href: '/admin/master/transactions/transfer', label: '이동 이력', enabled: true },
      // 2026-07-31: 비용 관리를 회계 프로그램으로 이관하기로 해 진입 경로만 숨김(기능·라우트는 유지).
      //   enabled:false(준비중 배지)는 안 쓴다 — 미완성이 아니라 의도적 비활성화라 의미가 다르다.
      // { href: '/admin/master/transactions/expense', label: '지출 이력', enabled: true },
      { href: '/admin/master/transactions/pdf-reissue', label: 'PDF 재발행', enabled: false },
    ],
  },
  {
    title: '원가·손익',
    items: [
      // 집계·분석 전용. 개별 LOT 원가는 재고 조회 → LOT 상세 drill-down으로,
      //   보관처 비용 이력은 기준정보라 마스터로 이동 → 'LOT 누적 비용'·'보관비 이력' 제거.
      { href: '/admin/master/cost/profit-trend', label: '손익 추이', enabled: true },
      { href: '/admin/master/cost/purchase-stats', label: '매입 통계', enabled: true },
      { href: '/admin/master/cost/erp-export', label: '외부 ERP export', enabled: false },
    ],
  },
  {
    title: '마스터',
    items: [
      { href: '/admin/master/products', label: '제품', enabled: true },
      { href: '/admin/master/suppliers', label: '매입처', enabled: true },
      { href: '/admin/master/storage', label: '보관처', enabled: true },
      // 2026-07-28: 보관처 비용 이력·가공비 단가는 별도 화면을 두지 않고
      //   보관처 마스터 안으로 흡수했다(구분 덩어리별 우측 표).
      //   비용 이력은 보관처의 속성이고 가공비 단가는 가공공장의 속성이라 그쪽이 제자리다.
      { href: '/admin/master/workers', label: '작업자', enabled: true },
      { href: '/admin/master/ships', label: '선박', enabled: true },
      { href: '/admin/master/materials', label: '부자재·경비', enabled: true },
    ],
  },
  {
    title: '시스템·운영',
    items: [
      { href: '/admin/master/health', label: '음수·이상 LOT 모니터', enabled: true },
      // '운영 건강도 실시간' 제거 — 위 음수·이상 LOT 모니터(/health)가 이미 실시간 건강도 화면.
      { href: '/admin/master/ops/daily-report', label: '일일 보고서 화면', enabled: false },
      { href: '/admin/master/ops/integrity-log', label: 'INTEGRITY 로그', enabled: false },
      { href: '/admin/master/ops/cron-history', label: 'cron 실행 이력', enabled: false },
      { href: '/admin/master/ops/schema-sync', label: 'SCHEMA 동기화', enabled: false },
      // 제일 아래 — 용어·개념 위키(누구나 검색·학습용). 살아있는 문서 docs/업무프로세스.md와 동기화.
      { href: '/admin/master/ops/wiki', label: '용어 위키', enabled: true },
    ],
  },
];

/** href → 카테고리/라벨 lookup. catch-all 페이지에서 placeholder 안내 표시용. */
export function findNavItem(
  href: string,
): { category: string; label: string; enabled: boolean } | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href === href) {
        return { category: group.title, label: item.label, enabled: item.enabled };
      }
    }
  }
  return null;
}
