/**
 * 앱 버전 — package.json 단일 출처. next.config.ts가 빌드 시
 * NEXT_PUBLIC_APP_VERSION 으로 주입한다.
 *
 * 시멘틱 버저닝 (MAJOR.MINOR.PATCH):
 *  - PATCH: 버그 수정·소규모 보정
 *  - MINOR: 기능·화면 추가 (현 개발 단계 기본)
 *  - MAJOR: 정식 출시·아키텍처 전환
 * 0.x = 정식 출시 전.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
