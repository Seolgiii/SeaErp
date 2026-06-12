'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  ViewColumnsIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from '@/lib/toast';
import { NAV_GROUPS } from './_nav';

/**
 * 라우트 탭바 — 방문한 admin 화면을 크롬 탭처럼 쌓아 빠르게 전환.
 *
 * - 사이드바 클릭/딥링크/drill-down 어떤 경로로든 방문하면 탭으로 쌓임 (이미 있으면 그 탭 활성)
 * - 탭마다 마지막 URL(쿼리 포함)을 기억 → 전환 시 검색·필터·기간 상태 복원 (URL 동기화 화면 기준)
 * - X·가운데 클릭으로 닫기, 드래그로 순서 변경, 사이드바 항목을 끌어다 놓으면 열기, + = 홈(새 탭)
 * - 새 창 분리(tear-off): 탭을 창 밖으로 드래그하거나 ↗ 아이콘 → 화면 우측 절반 새 창으로 이동
 *   (더블 스크린 참조용 — 세션은 localStorage 공유라 새 창에서도 로그인 유지)
 * - 창 안 분할(⊞ 아이콘): 같은 창 안에서 우측을 iframe 칸으로 띄워 좌우 더블스크린 (한 모니터용, onSplit)
 * - localStorage 영속 → 새로고침해도 탭 구성 유지
 *
 * UI는 크롬 라이트 테마를 따름: 균등 폭 수축(100~200px), 활성 탭 하단 S-커브(코너 조각),
 * 비활성 탭 사이 구분선(활성 탭 옆은 숨김), 호버 필. 진짜 MDI(탭별 동시 mount)가 아니라
 * 라우트 즐겨찾기+빠른 전환: 전환 시 데이터는 재조회된다.
 */

type WorkTab = {
  href: string; // pathname — 탭 식별자
  url: string; // 마지막 방문 URL(쿼리 포함) — 전환 시 상태 복원용
  label: string;
};

const TABS_KEY = 'seafood-erp:admin-tabs';

// 크롬 라이트 테마 팔레트 — 스트립/활성 탭(=본문 배경)/호버
const STRIP_BG = '#DEE1E6';
const TAB_BG = '#F2F4F6'; // admin 본문 배경과 동일 — 활성 탭이 본문과 "이어진" 느낌
const CORNER = 8; // 활성 탭 하단 S-커브 반경(px) = rounded-t-lg

// href → 라벨. nav에 없는 drill-down 라우트는 EXTRA로 보강.
const EXTRA_LABELS: Record<string, string> = {
  '/admin/master': '홈',
  '/admin/master/lot-timeline': 'LOT 생애주기',
};
const NAV_LABELS: Record<string, string> = {
  ...EXTRA_LABELS,
  ...Object.fromEntries(NAV_GROUPS.flatMap((g) => g.items.map((it) => [it.href, it.label]))),
};

const labelFor = (pathname: string) =>
  NAV_LABELS[pathname] ??
  decodeURIComponent(pathname.split('/').filter(Boolean).pop() ?? '화면');

function loadTabs(): WorkTab[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(TABS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (t): t is WorkTab =>
        !!t &&
        typeof t.href === 'string' &&
        typeof t.url === 'string' &&
        typeof t.label === 'string',
    );
  } catch {
    return [];
  }
}

export default function AdminTabBar({
  onSplit,
}: {
  onSplit?: (url: string, label: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // lazy init으로 저장된 탭 즉시 복원 — 렌더 출력은 mounted 이후에만 (SSR/CSR 불일치 방지)
  const [tabs, setTabs] = useState<WorkTab[]>(loadTabs);
  const [mounted, setMounted] = useState(false);
  const [dragHref, setDragHref] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // 현재 라우트 upsert — 새 경로면 탭 추가, 기존 탭이면 마지막 URL 갱신
  useEffect(() => {
    const qs = searchParams.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    setTabs((prev) => {
      const i = prev.findIndex((t) => t.href === pathname);
      if (i === -1) return [...prev, { href: pathname, url, label: labelFor(pathname) }];
      if (prev[i].url === url) return prev;
      const next = [...prev];
      next[i] = { ...next[i], url };
      return next;
    });
  }, [pathname, searchParams]);

  // 영속 — 탭 구성이 바뀔 때마다 저장
  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
    } catch {
      /* 무시 */
    }
  }, [tabs, mounted]);

  const focusTab = (t: WorkTab) => {
    if (t.href === pathname) return;
    router.push(t.url);
  };

  const closeTab = (href: string) => {
    const i = tabs.findIndex((t) => t.href === href);
    if (i === -1) return;
    const next = tabs.filter((t) => t.href !== href);
    setTabs(next);
    // 활성 탭을 닫으면 오른쪽 이웃(없으면 왼쪽)으로, 마지막 탭이면 홈으로
    if (href === pathname) {
      const neighbor = next[i] ?? next[i - 1];
      router.push(neighbor ? neighbor.url : '/admin/master');
    }
  };

  // 새 창으로 분리(tear-off) — 화면 우측 절반에 새 창을 열고 이쪽 탭은 닫는다 (이동 시맨틱)
  const detachTab = (t: WorkTab) => {
    const w = Math.max(720, Math.floor(window.screen.availWidth / 2));
    const h = window.screen.availHeight;
    const left = window.screen.availWidth - w;
    // 'noopener'는 성공해도 null을 반환해 팝업 차단 감지가 불가 → 같은 origin 앱 창이므로 미사용
    const win = window.open(t.url, '_blank', `width=${w},height=${h},left=${left},top=0`);
    if (!win) {
      toast('팝업이 차단되어 새 창을 열 수 없습니다. 이 주소의 팝업을 허용해주세요.', 'error');
      return;
    }
    closeTab(t.href);
  };

  // 드래그 정렬 — 드래그 중인 탭이 다른 탭 위를 지나면 그 위치로 이동 (라이브 정렬)
  const reorderOver = (overHref: string) => {
    if (!dragHref || dragHref === overHref) return;
    setTabs((prev) => {
      const from = prev.findIndex((t) => t.href === dragHref);
      const to = prev.findIndex((t) => t.href === overHref);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  // 사이드바 항목 드롭 → 탭 열기 (이미 있으면 그 탭의 마지막 상태로 포커스)
  const handleDrop = (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData('application/x-nav-item');
    if (!raw) return;
    e.preventDefault();
    try {
      const { href, label } = JSON.parse(raw) as { href?: string; label?: string };
      if (typeof href !== 'string' || !href.startsWith('/admin/master')) return;
      const existing = tabs.find((t) => t.href === href);
      if (existing) {
        focusTab(existing);
        return;
      }
      setTabs((prev) => [
        ...prev,
        { href, url: href, label: typeof label === 'string' && label ? label : labelFor(href) },
      ]);
      router.push(href);
    } catch {
      /* 무시 */
    }
  };

  return (
    <div className="sticky top-0 z-30" style={{ backgroundColor: STRIP_BG }}>
      <div
        className="flex h-[42px] items-end overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onDragOver={(e) => {
          if (dragHref || e.dataTransfer.types.includes('application/x-nav-item'))
            e.preventDefault();
        }}
        onDrop={handleDrop}
      >
        {mounted &&
          tabs.map((t, i) => {
            const active = t.href === pathname;
            const prevActive = tabs[i - 1]?.href === pathname;
            return (
              <div
                key={t.href}
                draggable
                onDragStart={(e) => {
                  setDragHref(t.href);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={(e) => {
                  // 창 밖에서 드래그를 놓으면 tear-off — 크롬의 탭 분리 제스처.
                  // dropEffect 'none'(유효 드롭 없음) + 좌표가 viewport 밖일 때만 (ESC 취소는 좌표가 안쪽).
                  const out =
                    e.clientX < 0 ||
                    e.clientY < 0 ||
                    e.clientX > window.innerWidth ||
                    e.clientY > window.innerHeight;
                  if (out && e.dataTransfer.dropEffect === 'none') detachTab(t);
                  setDragHref(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  reorderOver(t.href);
                }}
                onClick={() => focusTab(t)}
                onAuxClick={(e) => {
                  if (e.button === 1) closeTab(t.href); // 가운데 클릭 닫기
                }}
                title={t.label}
                className={`group relative flex h-[34px] min-w-[100px] max-w-[200px] flex-[1_1_200px] cursor-pointer select-none items-center ${
                  active ? 'rounded-t-lg' : ''
                } ${dragHref === t.href ? 'opacity-50' : ''}`}
                style={active ? { backgroundColor: TAB_BG } : undefined}
              >
                {/* 활성 탭 하단 S-커브 — 양옆 코너 조각(quarter-circle cutout)으로 본문과 이어붙임 */}
                {active && (
                  <>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute bottom-0"
                      style={{
                        left: -CORNER,
                        width: CORNER,
                        height: CORNER,
                        background: `radial-gradient(circle at 0 0, transparent ${CORNER - 0.5}px, ${TAB_BG} ${CORNER}px)`,
                      }}
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute bottom-0"
                      style={{
                        right: -CORNER,
                        width: CORNER,
                        height: CORNER,
                        background: `radial-gradient(circle at 100% 0, transparent ${CORNER - 0.5}px, ${TAB_BG} ${CORNER}px)`,
                      }}
                    />
                  </>
                )}
                {/* 비활성 탭 사이 구분선 — 활성 탭 양옆은 숨김 (크롬 규칙) */}
                {i > 0 && !active && !prevActive && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-4 w-px -translate-y-1/2 bg-gray-400/50"
                  />
                )}
                {/* 비활성 탭 호버 필 — 탭 영역 안쪽의 라운드 사각형 하이라이트 */}
                {!active && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-1 inset-y-[3px] rounded-lg transition-colors group-hover:bg-white/50"
                  />
                )}
                <div className="relative z-10 flex w-full min-w-0 items-center gap-1.5 px-3">
                  <span
                    className={`min-w-0 flex-1 truncate text-[12.5px] ${
                      active ? 'font-bold text-[#191F28]' : 'font-medium text-gray-600'
                    }`}
                  >
                    {t.label}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      detachTab(t);
                    }}
                    title="새 창으로 이동 (더블 스크린)"
                    aria-label={`${t.label} 새 창으로 이동`}
                    className="shrink-0 rounded-full p-0.5 text-gray-500 opacity-0 transition-all hover:bg-gray-400/30 hover:text-gray-800 group-hover:opacity-100"
                  >
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                  </button>
                  {onSplit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSplit(t.url, t.label);
                      }}
                      title="이 창 안에서 좌우로 분할 (더블 스크린)"
                      aria-label={`${t.label} 창 안 분할`}
                      className="shrink-0 rounded-full p-0.5 text-gray-500 opacity-0 transition-all hover:bg-gray-400/30 hover:text-gray-800 group-hover:opacity-100"
                    >
                      <ViewColumnsIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(t.href);
                    }}
                    aria-label={`${t.label} 탭 닫기`}
                    className={`shrink-0 rounded-full p-0.5 text-gray-500 transition-all hover:bg-gray-400/30 hover:text-gray-800 ${
                      active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        {/* + 새 탭 — 크롬의 새 탭처럼 홈을 연다 */}
        {mounted && (
          <button
            type="button"
            onClick={() => router.push('/admin/master')}
            title="새 탭 (홈)"
            aria-label="새 탭 (홈)"
            className="ml-1 shrink-0 self-center rounded-full p-1.5 text-gray-600 transition-colors hover:bg-white/50 hover:text-gray-800"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
