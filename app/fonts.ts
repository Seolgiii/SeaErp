import localFont from 'next/font/local';

/**
 * 전역 폰트 — Pretendard Variable (2026-07-30, DESIGN.md §3/§10 결정 반영).
 *
 * next/font/local로 self-host한다 — 이전 Spoqa는 spoqa.github.io 원격 @import라
 * 그 호스트가 막히면 전 화면이 브라우저 기본 폰트로 떨어지는 위험이 있었다.
 * 변수 폰트 1개(woff2, 굵기 45~920 전 구간)로 static 5벌을 안 받아도 된다.
 *
 * `variable`로 CSS 커스텀 프로퍼티를 노출한다 — globals.css의 `body`와
 * work-settlement/_shared.ts의 로컬 font-family 선언이 **같은 값**을 참조하게 하기 위해서다.
 * (이전엔 후자가 "Pretendard"라는, 아무 데서도 로드된 적 없는 이름을 가리키고 있었다.)
 */
export const pretendard = localFont({
  src: '../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
});
