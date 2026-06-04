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
      // LOT 생애주기는 메뉴에서 제외 — 재고 조회 행 클릭으로 진입하는 drill-down 상세.
      //   라우트(/admin/master/lot-timeline)는 그대로 존재하며 ?lot= 으로 자동 조회.
      // 음수·이상 LOT 모니터는 시스템·운영 카테고리로 이동.
    ],
  },
  {
    title: '거래 이력',
    items: [
      { href: '/admin/master/transactions/inbound', label: '입고 이력', enabled: false },
      { href: '/admin/master/transactions/outbound', label: '출고 이력', enabled: false },
      { href: '/admin/master/transactions/transfer', label: '이동 이력', enabled: false },
      { href: '/admin/master/transactions/expense', label: '지출 이력', enabled: false },
      { href: '/admin/master/transactions/pdf-reissue', label: 'PDF 재발행', enabled: false },
    ],
  },
  {
    title: '원가·손익',
    items: [
      // 집계·분석 전용. 개별 LOT 원가는 재고 조회 → LOT 상세 drill-down으로,
      //   보관처 비용 이력은 기준정보라 마스터로 이동 → 'LOT 누적 비용'·'보관비 이력' 제거.
      { href: '/admin/master/cost/profit-trend', label: '손익 추이', enabled: true },
      { href: '/admin/master/cost/purchase-stats', label: '매입 통계', enabled: false },
      { href: '/admin/master/cost/erp-export', label: '외부 ERP export', enabled: false },
    ],
  },
  {
    title: '마스터',
    items: [
      { href: '/admin/master/products', label: '제품', enabled: true },
      { href: '/admin/master/suppliers', label: '매입처', enabled: true },
      { href: '/admin/master/storage', label: '보관처', enabled: true },
      // 보관처 비용 이력 = 단가 시점 이력(기준정보) → 원가·손익에서 마스터로 이동.
      { href: '/admin/master/cost/storage-history', label: '보관처 비용 이력', enabled: false },
      { href: '/admin/master/workers', label: '작업자', enabled: true },
      { href: '/admin/master/ships', label: '선박', enabled: true },
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
