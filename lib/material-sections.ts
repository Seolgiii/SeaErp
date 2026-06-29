/**
 * 부자재·경비 마스터의 4개 고정 섹션.
 *
 * 'use server' 파일(master-materials.ts)에서는 const를 export할 수 없어
 * (STORAGE_KINDS와 동일 제약) 여기 분리한다. 서버 액션과 클라이언트 페이지가 공유.
 * Airtable '부자재·경비 마스터'.분류 singleSelect 옵션과 1:1.
 */
export const MATERIAL_SECTIONS = ["아이스팩", "박스", "내피", "진공팩"] as const;

export type MaterialSection = (typeof MATERIAL_SECTIONS)[number];
