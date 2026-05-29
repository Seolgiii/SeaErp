"use client";

import { useEffect, useState } from "react";
import { WorkerPinLogin } from "./WorkerPinLogin";
import { WorkerPinLoginDesktop } from "./WorkerPinLoginDesktop";

/**
 * 뷰포트 분기 — 1024px 이상이면 PC split-screen, 미만이면 모바일.
 *
 * matchMedia 결정이 끝나기 전(첫 render)에는 둘 다 mount하지 않고 빈 화면을 잠깐
 * 보여준다. 두 컴포넌트를 동시 mount하면 /api/workers를 두 번 부르고, bottom sheet
 * portal이 PC에서도 DOM에 생성되는 등 부작용이 있어 단일 mount가 깔끔.
 *
 * 약간의 첫 페인트 지연(보통 한 frame)은 흰 배경으로 자연스럽게 흡수.
 */
export default function LoginShell() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (isDesktop === null) {
    return <div className="min-h-screen bg-[#F2F4F6]" />;
  }
  return isDesktop ? <WorkerPinLoginDesktop /> : <WorkerPinLogin />;
}
