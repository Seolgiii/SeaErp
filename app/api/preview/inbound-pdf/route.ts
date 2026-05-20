import { NextResponse } from "next/server";
import { generateInboundPdf, type InboundPdfData } from "@/lib/generate-pdf.server";

/**
 * 입고증 PDF 디자인 프리뷰 (개발 전용)
 *
 * GET /api/preview/inbound-pdf
 *
 * 실제 입고 데이터·승인 절차 없이 양식·푸터를 즉시 시각 확인할 수 있도록
 * mock 데이터로 generateInboundPdf()를 호출해 PDF 바이너리를 inline 반환합니다.
 * 회사 정보 푸터는 .env.local의 COMPANY_* 값을 그대로 사용합니다.
 *
 * production 환경에서는 항상 404.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const mock: InboundPdfData = {
    lotNumber: "260520-MC1-11-26-0001",
    productName: "민어",
    spec: "11",
    detailSpec: "26",
    quantity: 120,
    storage: "군산 자사창고",
    origin: "국내산",
    purchasePrice: 1200000,
    date: "2026-05-20",
    requester: "권수석",
    supplier: "한수 수산주식회사",
    purchaser: "홍길동",
    shipName: "제11동한호",
    memo: "운송 중 일부 박스 외포장 손상 — 내용물 양호",
  };

  const pdf = await generateInboundPdf(mock);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"inbound-preview.pdf\"",
    },
  });
}
