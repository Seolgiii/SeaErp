'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShieldExclamationIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired, clearSession } from '@/lib/session';
import { NAV_GROUPS } from './_nav';

const ROLE_LABEL: Record<string, string> = {
  MASTER: '마스터',
  ADMIN: '관리자',
  WORKER: '작업자',
};

/**
 * /admin/master/* 공통 레이아웃 (PC PWA 관리 화면).
 *
 * - 좌측 사이드바 nav: IA 6 카테고리(결재/재고/거래 이력/원가·손익/마스터/시스템·운영).
 *   미구현 항목은 ComingSoonPage placeholder로 안내 ([...slug]/page.tsx)
 * - 상단 권한 게이트 (ADMIN/MASTER) — dashboard 패턴 재사용
 * - 본문 영역은 children 슬롯
 *
 * 모바일 BottomTabBar/PageHeader 패턴과 분리. PC 전용 시작 (반응형은 추후).
 */

export default function MasterAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [workerName, setWorkerName] = useState<string>('');
  const [role, setRole] = useState<string>('');

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace('/login');
      return;
    }
    setAuthorized(session.role === 'ADMIN' || session.role === 'MASTER');
    setWorkerName(session.workerName ?? '');
    setRole(session.role ?? '');
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

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
          <Link href="/admin/master" className="text-[18px] font-black text-gray-900 hover:text-[#3182F6] transition-colors">
            SEAERP
          </Link>
          <p className="text-[12px] font-bold text-gray-400 mt-1">관리자 시스템</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-1.5 text-[11px] font-black text-gray-400 tracking-wider uppercase">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const base = 'block px-3 py-2 rounded-xl text-[13px] font-bold transition-colors';
                  const active = pathname === item.href;
                  if (!item.enabled) {
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title="준비 중 — 클릭하면 안내 화면이 표시됩니다"
                        className={`${base} flex items-center justify-between ${
                          active
                            ? 'bg-amber-50 text-amber-700'
                            : 'text-gray-400 hover:bg-gray-50 hover:text-gray-500'
                        }`}
                      >
                        <span>{item.label}</span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${active ? 'bg-amber-200 text-amber-800' : 'bg-gray-100 text-gray-400'}`}
                        >
                          준비중
                        </span>
                      </Link>
                    );
                  }
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
              </div>
            </div>
          ))}
        </nav>
        {/* 사용자 메뉴 — 작업자명 + 로그아웃 */}
        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50">
            <div className="w-8 h-8 rounded-full bg-[#3182F6] flex items-center justify-center text-white text-[13px] font-black shrink-0">
              {workerName ? workerName[0] : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-gray-800 truncate">{workerName || '—'}</p>
              <p className="text-[10px] font-bold text-gray-400">{ROLE_LABEL[role] ?? role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="로그아웃"
              aria-label="로그아웃"
              className="p-1.5 rounded-lg text-gray-400 hover:text-[#FF3B30] hover:bg-white active:scale-95 transition-all shrink-0"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="px-3 mt-2 text-[10px] font-bold text-gray-300">
            Phase 3 IA 미정착 — URL은 phase 후반 정리
          </p>
        </div>
      </aside>

      {/* 본문 */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
