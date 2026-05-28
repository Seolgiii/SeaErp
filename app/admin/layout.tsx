import type { Metadata } from 'next';
import AdminAuthGate from './AdminAuthGate';

/**
 * /admin/* 공통 server layout — Phase 3 PC PWA 분리용 metadata override.
 *
 * 같은 도메인에서 워커(/manifest.json)와 관리자(/admin-manifest.json) PWA를
 * 별개로 설치 가능. Chrome/Edge가 manifest 단위로 install prompt를 띄움 →
 * 관리자는 PC 바탕화면에 "SEAERP 관리자" 아이콘으로 별도 설치, start_url에서
 * 곧장 마스터 화면 열림. scope=/admin/이라 워커 페이지로 가면 새 브라우저 창에서 열림.
 *
 * 권한 게이트는 client 컴포넌트(AdminAuthGate)로 분리 — server layout이
 * metadata를 export하려면 'use client' 사용 불가하기 때문. 동작은 기존 그대로.
 */
export const metadata: Metadata = {
  title: 'SEAERP 관리자',
  manifest: '/admin-manifest.json',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthGate>{children}</AdminAuthGate>;
}
