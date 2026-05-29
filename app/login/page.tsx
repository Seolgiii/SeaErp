import type { Viewport } from "next";
import LoginShell from "@/components/LoginShell";

/**
 * 로그인 페이지 전용 viewport — 모바일 헤더의 #3182F6 파란색이
 * iOS Safari status bar(시계·배터리 영역)까지 자연스럽게 이어지도록 합니다.
 * 다른 페이지는 root layout의 themeColor(#F2F4F6)를 그대로 사용합니다.
 * PC 화면은 좌측 파노라마 영역이 동일 톤이라 색감 충돌 없음.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3182F6",
};

export default function LoginPage() {
  return <LoginShell />;
}
