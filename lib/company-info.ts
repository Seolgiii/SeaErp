import "server-only";

/**
 * 회사 정보 — PDF 푸터에 표시되는 발행자 정보.
 *
 * 환경변수 주입. 값 변경 시 Vercel env에 동일 키 등록 + .env.local 갱신.
 * 비어 있는 값은 PDF 렌더링 시 자동 생략된다.
 */
export type CompanyInfo = {
  name: string;
  representative: string;
  businessNumber: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
};

export function getCompanyInfo(): CompanyInfo {
  return {
    name: (process.env.COMPANY_NAME ?? "").trim(),
    representative: (process.env.COMPANY_REPRESENTATIVE ?? "").trim(),
    businessNumber: (process.env.COMPANY_BUSINESS_NUMBER ?? "").trim(),
    address: (process.env.COMPANY_ADDRESS ?? "").trim(),
    phone: (process.env.COMPANY_PHONE ?? "").trim(),
    fax: (process.env.COMPANY_FAX ?? "").trim(),
    email: (process.env.COMPANY_EMAIL ?? "").trim(),
  };
}
