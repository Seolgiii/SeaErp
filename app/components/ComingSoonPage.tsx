'use client';

import { ClockIcon } from '@heroicons/react/24/outline';

interface Props {
  /** 사이드바에서 누른 항목 이름 (예: "결재 이력·검색"). */
  label?: string;
  /** IA 카테고리 (예: "결재"). */
  category?: string;
  /** 현재 URL path (디버그용 표시). */
  path?: string;
}

/**
 * Phase 3 IA 6 카테고리 미구현 화면 공통 placeholder.
 *
 * 사이드바에는 6 카테고리 전체가 노출되어 있어 IA 구도를 시각적으로 확인할 수 있고,
 * 미구현 항목을 누르면 이 페이지가 떠서 "준비중"임을 명확히 안내한다.
 */
export default function ComingSoonPage({ label, category, path }: Props) {
  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center text-center">
      <div className="bg-amber-100 rounded-full p-5 mb-5">
        <ClockIcon className="w-12 h-12 text-amber-700" />
      </div>
      {category && (
        <p className="text-[12px] font-black text-gray-400 tracking-wider uppercase mb-2">
          {category}
        </p>
      )}
      <h1 className="text-[22px] font-black text-gray-900 mb-2">
        {label ? `${label} — 준비 중입니다` : '준비 중입니다'}
      </h1>
      <p className="text-[14px] text-gray-500 max-w-md leading-relaxed">
        이 화면은 Phase 3 IA 카테고리에 정의되어 있으나 아직 구현되지 않았습니다.
        다음 카테고리에서 작업할 예정입니다.
      </p>
      {path && (
        <code className="mt-4 px-3 py-1.5 bg-gray-100 rounded-lg font-mono text-[12px] text-gray-500">
          {path}
        </code>
      )}
    </div>
  );
}
