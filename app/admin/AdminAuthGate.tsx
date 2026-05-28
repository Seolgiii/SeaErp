'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readSession, isSessionExpired, isAdminRole } from '@/lib/session';

/**
 * /admin/* 클라이언트 권한 게이트 — 기존 layout에서 분리.
 *
 * server layout(app/admin/layout.tsx)이 metadata를 export하려면 'use client'를
 * 쓸 수 없으므로 권한 검증 로직만 떼서 client 컴포넌트로. 동작은 기존 그대로:
 * 세션 없음·만료 → /login, ADMIN/MASTER 아님 → /, 통과 시 children 렌더.
 */
export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace('/login');
      return;
    }
    if (!isAdminRole(session)) {
      router.replace('/');
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!allowed) return null;

  return <>{children}</>;
}
