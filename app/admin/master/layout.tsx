'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';

/**
 * /admin/master/* 공통 레이아웃 (PC PWA 관리 화면).
 *
 * - 좌측 사이드바 nav (제품/공급업체/보관처/LOT) — 이번 phase에서는 제품만 활성, 나머지는 placeholder
 * - 상단 권한 게이트 (ADMIN/MASTER) — dashboard 패턴 재사용
 * - 본문 영역은 children 슬롯
 *
 * 모바일 BottomTabBar/PageHeader 패턴과 분리. PC 전용 시작 (반응형은 추후).
 */

const NAV_ITEMS = [
  { href: '/admin/master/products', label: '제품 마스터', enabled: true },
  { href: '/admin/master/suppliers', label: '매입처 마스터', enabled: true },
  { href: '/admin/master/storage', label: '보관처 마스터', enabled: true },
  { href: '/admin/master/lots', label: 'LOT 마스터', enabled: true },
] as const;

export default function MasterAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace('/login');
      return;
    }
    setAuthorized(session.role === 'ADMIN' || session.role === 'MASTER');
  }, [router]);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center gap-5 px-6">
        <ShieldExclamationIcon className="w-16 h-16 text-gray-300" />
        <h1 className="text-[22px] font-bold text-gray-800">접근 권한이 없습니다</h1>
        <p className="text-gray-500 font-medium text-center">관리자 시스템은 ADMIN 권한이 필요합니다.</p>
        <Link
          href="/"
          className="mt-4 px-8 py-3.5 bg-[#191F28] text-white font-bold text-[16px] rounded-2xl active:scale-95 transition-transform"
        >
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F2F4F6] flex"
      style={{ fontFamily: "'Spoqa Han Sans Neo', sans-serif" }}
    >
      {/* 사이드바 */}
      <aside className="w-60 bg-white border-r border-gray-100 shrink-0 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <Link href="/" className="text-[18px] font-black text-gray-900 hover:text-[#3182F6] transition-colors">
            SEAERP
          </Link>
          <p className="text-[12px] font-bold text-gray-400 mt-1">마스터 관리</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const base = 'block px-3 py-2.5 rounded-xl text-[14px] font-bold transition-colors';
            if (!item.enabled) {
              return (
                <div
                  key={item.href}
                  className={`${base} text-gray-300 cursor-not-allowed flex items-center justify-between`}
                  title="준비 중"
                >
                  <span>{item.label}</span>
                  <span className="text-[11px] font-bold text-gray-300">준비중</span>
                </div>
              );
            }
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${base} ${
                  active
                    ? 'bg-[#3182F6]/10 text-[#3182F6]'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <Link
            href="/admin/dashboard"
            className="block px-3 py-2.5 rounded-xl text-[14px] font-bold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            ← 결재 수신함
          </Link>
        </div>
      </aside>

      {/* 본문 */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
