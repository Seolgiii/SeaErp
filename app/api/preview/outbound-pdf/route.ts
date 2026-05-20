import { NextRequest, NextResponse } from "next/server";
import { generateOutboundPdf, type OutboundPdfData } from "@/lib/generate-pdf.server";

/**
 * 출고증 PDF 디자인 프리뷰 (개발 전용)
 *
 * GET /api/preview/outbound-pdf         일반 출고증 (판매처)
 * GET /api/preview/outbound-pdf?transfer=1  이동 출고증 (이동처, 자사창고 → 외부)
 *
 * 실제 출고 승인 없이 양식을 즉시 시각 확인합니다.
 * 회사 정보 푸터는 .env.local의 COMPANY_* 값을 그대로 사용합니다.
 *
 * production 환경에서는 항상 404.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const isTransfer = req.nextUrl.searchParams.get("transfer") === "1";

  const mock: OutboundPdfData = {
    lotNumber: "260520-MC1-11-26-0001",
    productName: "민어",
    spec: "11",
    detailSpec: "26",
    quantity: 50,
    origin: "국내산",
    storage: "군산 자사창고",
    buyer: isTransfer ? "부산 외부창고" : "㈜한바다 수산",
    date: "2026-05-20",
    requester: "권수석",
    memo: isTransfer
      ? "재고 이동"
      : "운송 중 일부 박스 외포장 손상 — 내용물 양호",
  };

  const pdf = await generateOutboundPdf(mock, isTransfer);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="outbound-preview${isTransfer ? "-transfer" : ""}.pdf"`,
    },
  });
}
