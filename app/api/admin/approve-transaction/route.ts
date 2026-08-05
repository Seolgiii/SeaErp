import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin-auth";
import { approveOutboundTransaction } from "@/lib/approval-service";

/**
 * X-Idempotency-Key 예외 경로 (CLAUDE.md 「권한·보안」).
 *
 * 헤더 멱등을 쓰지 않는 대신 **도메인 수준 가드 2겹**이 중복 처리를 막는다:
 *   ① app/actions/admin/admin.ts — 승인상태가 이미 "승인 완료"면 재처리하지 않는다.
 *   ② deductStockOnOutboundApproval — "출고시점 단가 > 0"이면 이미 차감된 것으로 보고 건너뛴다.
 *      (판매원가가 아니라 단가로 판정한다. 판매원가는 반려 시 보존돼서 가드로 쓰면
 *       재승인이 영구 차단된다 — 2026-05-18 변경)
 *
 * 헤더 멱등과 달리 이 가드들은 5분 창이 아니라 **레코드 상태 자체**를 보므로 만료가 없다.
 * 가드를 손대면 이 주석도 함께 고친다.
 */
export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const body = (await request.json()) as { transactionId?: string };
    const id =
      typeof body.transactionId === "string" ? body.transactionId.trim() : "";
    if (!id.startsWith("rec")) {
      return NextResponse.json({ error: "transactionId required" }, { status: 400 });
    }
    const result = await approveOutboundTransaction(id);
    return NextResponse.json(result);
  } catch (e) {
    const admin = adminErrorResponse(e);
    if (admin) return admin;
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
