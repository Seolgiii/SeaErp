'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { readSession, isSessionExpired, isAdminRole } from '@/lib/session';
import { isWorkerAllowedPath } from '@/lib/admin-access';

/**
 * /admin/* 클라이언트 권한 게이트 — 기존 layout에서 분리.
 *
 * server layout(app/admin/layout.tsx)이 metadata를 export하려면 'use client'를
 * 쓸 수 없으므로 권한 검증 로직만 떼서 client 컴포넌트로. 동작은 기존 그대로:
 * 세션 없음·만료 → /login, ADMIN/MASTER 아님 → /, 통과 시 children 렌더.
 *
 * 2026-08-03: WORKER도 '작업 정산'만은 통과시킨다(lib/admin-access.ts).
 * 이 게이트는 /admin/* 전체를 감싸고, 그 아래 /admin/master/layout.tsx가 셸·사이드바를
 * 한 겹 더 거른다 — 두 곳이 같은 규칙을 봐야 한다.
 */
export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace('/login');
      return;
    }
    if (!isAdminRole(session) && !isWorkerAllowedPath(pathname)) {
      router.replace('/');
      return;
    }
    setAllowed(true);
  }, [router, pathname]);

  if (!allowed) return null;

  return <>{children}</>;
}
