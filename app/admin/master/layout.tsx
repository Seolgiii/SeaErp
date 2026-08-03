'use client';

import { Suspense, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldExclamationIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  Bars3Icon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired, clearSession } from '@/lib/session';
import { isWorkerAllowedPath } from '@/lib/admin-access';
import { NAV_GROUPS } from './_nav';
import AdminTabBar from './_tab-bar';

const ROLE_LABEL: Record<string, string> = {
  MASTER: '마스터',
  ADMIN: '관리자',
  WORKER: '작업자',
};

const NAV_COLLAPSE_KEY = 'seafood-erp:nav-collapsed';
const NAV_RAIL_KEY = 'seafood-erp:nav-rail';
// 자주 안 보는 카테고리는 기본 접힘 — 첫 진입 시 사이드바 짧게.
const DEFAULT_COLLAPSED = ['마스터', '시스템·운영'];

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

function MasterAdminLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [workerName, setWorkerName] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(DEFAULT_COLLAPSED));
  // 사이드바 전체 접기(rail). railPinned=접힘 고정 / hovering=접힌 상태에서 마우스 올림(임시 펼침).
  const [railPinned, setRailPinned] = useState(false);
  const [hovering, setHovering] = useState(false);

  // 임베드(맨몸) 모드 — 분할 칸(iframe)으로 자기 자신을 띄울 때 사이드바·탭바 없이 본문만.
  // pane=1로 진입하나 칸 내부 필터 변경 시 useSyncQueryParams가 쿼리를 통째로 새로 써 pane=1이
  // 날아갈 수 있어 sessionStorage로 고정(sticky). 최상위 창은 self===top 가드로 절대 맨몸 안 됨.
  const embedParam = searchParams.get('pane') === '1';
  const [embed, setEmbed] = useState(embedParam);

  // 창 안 분할 — 오른쪽 칸에 띄울 화면(없으면 분할 안 함) + 좌우 폭 비율 + 드래그 상태
  const [split, setSplit] = useState<{ url: string; label: string } | null>(null);
  const [ratio, setRatio] = useState(0.5); // 왼쪽 칸 폭 비율 (0.2~0.8)
  const [dragging, setDragging] = useState(false);
  const splitRowRef = useRef<HTMLDivElement | null>(null);

  const openSplit = useCallback((url: string, label: string) => {
    setSplit({ url, label });
  }, []);

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace('/login');
      return;
    }
    // /admin은 기본 ADMIN/MASTER 전용. 단 WORKER도 '작업 정산'만은 들어온다(2026-08-03) —
    // 현장에서 다 같이 채우는 기록이라서다. 허용 경로는 _nav.ts가 단일 출처.
    const admin = session.role === 'ADMIN' || session.role === 'MASTER';
    setAuthorized(admin || isWorkerAllowedPath(pathname));
    setWorkerName(session.workerName ?? '');
    setRole(session.role ?? '');
  }, [router, pathname]);

  // 접힘 상태 복원 — localStorage 저장 키가 있으면 우선
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NAV_COLLAPSE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) setCollapsed(new Set(arr.filter((x): x is string => typeof x === 'string')));
    } catch {
      /* 기본값 유지 */
    }
  }, []);

  // 현재 페이지가 속한 카테고리는 강제 펼침 (사이드바에서 활성 항목이 안 보이는 모순 방지)
  useEffect(() => {
    const owner = NAV_GROUPS.find((g) => g.items.some((it) => it.href === pathname));
    if (!owner) return;
    setCollapsed((prev) => {
      if (!prev.has(owner.title)) return prev;
      const next = new Set(prev);
      next.delete(owner.title);
      try { window.localStorage.setItem(NAV_COLLAPSE_KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }, [pathname]);

  // rail 접힘 상태 복원
  useEffect(() => {
    try {
      setRailPinned(window.localStorage.getItem(NAV_RAIL_KEY) === '1');
    } catch {
      /* 기본값 유지 */
    }
  }, []);

  // 임베드 판정 — iframe 안에서만, pane 파라미터 또는 sticky 플래그로. 최상위 창은 항상 풀 레이아웃.
  useEffect(() => {
    let framed = false;
    try {
      framed = window.self !== window.top;
    } catch {
      framed = true; // 접근 차단 = 프레임 안으로 간주
    }
    if (!framed) {
      setEmbed(false);
      return;
    }
    if (embedParam) {
      try { window.sessionStorage.setItem('seafood-erp:pane', '1'); } catch {}
      setEmbed(true);
      return;
    }
    try {
      setEmbed(window.sessionStorage.getItem('seafood-erp:pane') === '1');
    } catch {
      /* 무시 */
    }
  }, [embedParam]);

  // 분할 구분선 드래그 — 좌우 비율 조절. iframe이 마우스 이벤트를 삼키므로 드래그 중 칸 pointer-events 차단.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const row = splitRowRef.current;
      if (!row) return;
      const rect = row.getBoundingClientRect();
      const r = (e.clientX - rect.left) / rect.width;
      setRatio(Math.min(0.8, Math.max(0.2, r)));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  const setRail = (next: boolean) => {
    setRailPinned(next);
    try {
      window.localStorage.setItem(NAV_RAIL_KEY, next ? '1' : '0');
    } catch {
      /* 무시 */
    }
  };

  const toggleCollapse = (title: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      try { window.localStorage.setItem(NAV_COLLAPSE_KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  // WORKER는 허용된 항목만 사이드바에 보인다 — 못 여는 화면을 목록에 남겨두면
  // 클릭할 때마다 '권한 없음'을 만나 길이 막힌 것처럼 느껴진다.
  const navGroups = useMemo(() => {
    const admin = role === 'ADMIN' || role === 'MASTER';
    if (admin) return NAV_GROUPS;
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((it) => isWorkerAllowedPath(it.href)),
    })).filter((g) => g.items.length > 0);
  }, [role]);

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
        <p className="text-gray-500 font-medium text-center">
          이 화면은 관리자 권한이 필요합니다. 작업자는 &lsquo;작업 정산&rsquo;만 이용할 수 있습니다.
        </p>
        <Link
          href="/"
          className="mt-4 px-8 py-3.5 bg-[#191F28] text-white font-bold text-[16px] rounded-2xl active:scale-95 transition-transform"
        >
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  // 임베드(분할 칸) — 사이드바·탭바·분할 없이 본문만 꽉 채워 렌더 (중첩 크롬 방지).
  if (embed) {
    return (
      <div className="min-h-screen bg-[#F2F4F6]">
        {children}
      </div>
    );
  }

  // 접힘 고정이 아니거나(펼침) 마우스를 올린 동안(임시 펼침) 펼쳐서 보여준다.
  const expanded = !railPinned || hovering;

  return (
    // data-surface="admin" — DESIGN.md §2-5·§6-1의 표면별 값(radius·컨트롤 높이)을
    // 이 서브트리에 적용한다. 값 정의는 app/globals.css. 토큰을 안 쓰는 화면에는 영향 없음.
    <div
      data-surface="admin"
      className="min-h-screen bg-[#F2F4F6] flex"
    >
      {/* 사이드바 — rail 접기 지원: 우상단 토글로 접힘 고정, 접힌 상태에서 마우스 올리면 임시 펼침(flyout).
          aside는 폭만 차지하는 스페이서(접힘 w-12 / 펼침 w-60), 실제 패널은 absolute라 flyout이 본문을 밀지 않고 덮는다. */}
      <aside
        className={`shrink-0 sticky top-0 h-screen z-40 transition-[width] duration-200 ${railPinned ? 'w-12' : 'w-60'}`}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div
          className={`absolute inset-y-0 left-0 h-screen bg-white border-r border-gray-100 flex flex-col transition-[width] duration-200 ${
            expanded ? 'w-60' : 'w-12'
          } ${railPinned && hovering ? 'shadow-2xl' : ''}`}
        >
          {!expanded ? (
            // 접힘(rail) — 펼치기 버튼만. 마우스 올리면(hovering) 아래 펼침 분기로 전환.
            <div className="flex flex-col items-center py-4">
              <button
                type="button"
                onClick={() => setRail(false)}
                title="사이드바 펼치기"
                aria-label="사이드바 펼치기"
                className="p-2 rounded-lg text-gray-400 hover:text-[#3182F6] hover:bg-gray-50 active:scale-95 transition-all"
              >
                <Bars3Icon className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href="/admin/master" className="text-[18px] font-black text-gray-900 hover:text-[#3182F6] transition-colors">
                    SEAERP
                  </Link>
                  <p className="text-[12px] font-bold text-gray-400 mt-1">관리자 시스템</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (railPinned) {
                      setRail(false); // flyout에서 고정 펼치기
                    } else {
                      setRail(true);
                      setHovering(false); // 마우스가 위에 있어도 즉시 접힘
                    }
                  }}
                  title={railPinned ? '사이드바 고정 펼치기' : '사이드바 접기'}
                  aria-label={railPinned ? '사이드바 고정 펼치기' : '사이드바 접기'}
                  className="shrink-0 p-1.5 -mr-1.5 rounded-lg text-gray-400 hover:text-[#3182F6] hover:bg-gray-50 active:scale-95 transition-all"
                >
                  {railPinned ? (
                    <ChevronDoubleRightIcon className="w-5 h-5" />
                  ) : (
                    <ChevronDoubleLeftIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1">
          {navGroups.map((group) => {
            const isCollapsed = collapsed.has(group.title);
            const activeChild = group.items.some((it) => it.href === pathname);
            return (
              <div key={group.title}>
                <button
                  type="button"
                  onClick={() => toggleCollapse(group.title)}
                  aria-expanded={!isCollapsed}
                  className={`w-full px-3 py-2 flex items-center justify-between rounded-lg text-[13px] font-black tracking-tight transition-colors ${
                    activeChild
                      ? 'text-[#191F28]'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{group.title}</span>
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>
                {!isCollapsed && (
                  <div className="mt-0.5 mb-2 ml-2 pl-2 border-l border-gray-100 space-y-0.5">
                    {group.items.map((item) => {
                      const active = pathname === item.href;
                      // 모든 항목을 동일 구조로 렌더: flex 컨테이너 + 좌측 라벨 + (선택) 우측 칩.
                      // 이전엔 enabled/disabled가 별도 className으로 분기돼 좌측 정렬이 미세하게 달라보였음.
                      const cls = !item.enabled
                        ? active
                          ? 'bg-amber-50 text-amber-700 font-medium'
                          : 'text-gray-400 hover:bg-gray-50 hover:text-gray-500 font-medium'
                        : active
                          ? 'bg-[#3182F6]/10 text-[#3182F6] font-bold'
                          : 'text-gray-600 hover:bg-gray-50 font-medium';
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={!item.enabled ? '준비 중 — 클릭하면 안내 화면이 표시됩니다' : undefined}
                          draggable
                          onDragStart={(e) => {
                            // 탭바로 끌어다 놓으면 탭으로 열림 (_tab-bar.tsx handleDrop)
                            e.dataTransfer.setData(
                              'application/x-nav-item',
                              JSON.stringify({ href: item.href, label: item.label }),
                            );
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] transition-colors ${cls}`}
                        >
                          <span className="truncate">{item.label}</span>
                          {!item.enabled && (
                            <span
                              className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ml-2 ${active ? 'bg-amber-200 text-amber-800' : 'bg-gray-100 text-gray-400'}`}
                            >
                              준비중
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
            </>
          )}
        </div>
      </aside>

      {/* 본문 — 상단 라우트 탭바(크롬식 화면 전환) + children (+ 창 안 분할 시 우측 iframe 칸) */}
      <main className="flex-1 min-w-0">
        {/* useSearchParams를 쓰는 클라이언트 컴포넌트는 Suspense 경계 필요 (next build 요구) */}
        <Suspense fallback={<div className="h-[42px] bg-[#DEE1E6]" />}>
          <AdminTabBar onSplit={openSplit} />
        </Suspense>
        {split ? (
          <div
            ref={splitRowRef}
            className={`flex h-[calc(100vh-42px)] ${dragging ? 'select-none' : ''}`}
          >
            {/* 왼쪽 — 실제 라우트 화면 */}
            <div
              className="h-full overflow-auto"
              style={{ width: `calc(${ratio * 100}% - 3px)` }}
            >
              {children}
            </div>
            {/* 구분선 — 드래그로 폭 조절 */}
            <div
              onMouseDown={() => setDragging(true)}
              title="드래그하여 폭 조절"
              className={`w-1.5 shrink-0 cursor-col-resize transition-colors ${
                dragging ? 'bg-[#3182F6]/60' : 'bg-gray-200 hover:bg-[#3182F6]/40'
              }`}
            />
            {/* 오른쪽 — 분할 칸(iframe, 독립 화면) */}
            <div
              className="h-full min-w-0 flex flex-col"
              style={{ width: `calc(${(1 - ratio) * 100}% - 3px)` }}
            >
              <div className="flex h-9 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3">
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-gray-700">
                  {split.label}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const w = Math.max(720, Math.floor(window.screen.availWidth / 2));
                    const win = window.open(
                      split.url,
                      '_blank',
                      `width=${w},height=${window.screen.availHeight},left=${window.screen.availWidth - w},top=0`,
                    );
                    if (win) setSplit(null);
                  }}
                  title="새 창으로 꺼내기"
                  aria-label="분할 칸을 새 창으로 꺼내기"
                  className="shrink-0 rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSplit(null)}
                  title="분할 닫기"
                  aria-label="분할 닫기"
                  className="shrink-0 rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              <iframe
                key={split.url}
                src={split.url + (split.url.includes('?') ? '&' : '?') + 'pane=1'}
                title={split.label}
                className="min-h-0 flex-1 w-full border-0"
                style={dragging ? { pointerEvents: 'none' } : undefined}
              />
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

export default function MasterAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
        </div>
      }
    >
      <MasterAdminLayoutInner>{children}</MasterAdminLayoutInner>
    </Suspense>
  );
}
