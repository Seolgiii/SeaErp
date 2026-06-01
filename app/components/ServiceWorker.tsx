'use client';

import { useEffect } from 'react';

export default function ServiceWorker() {
  useEffect(() => {
    // 프로덕션에서만 등록 — dev는 _next/static 청크 URL이 재사용되는데 내용은 바뀌어,
    // sw.js의 cache-first가 옛 청크를 돌려줘 일반 새로고침 시 예전 화면이 뜨는 문제가 있다.
    // (프로덕션은 청크 파일명에 해시가 붙어 새 URL=캐시미스=최신이라 무해)
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {})
        .catch(() => {});
    }
  }, []);

  return null;
}
