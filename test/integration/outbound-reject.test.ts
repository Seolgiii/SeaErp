import { describe, expect, test } from "vitest";
import { store } from "./airtable-store";
import {
  ALL_MASTERS,
  WORKER_ADMIN,
  WORKER_NORMAL,
  makeApprovedInboundRecord,
  makeInStockLot,
} from "./fixtures";

/**
 * 시나리오 7 — 출고 반려 시 재고 복구
 *
 * 정책 (admin.ts restoreStockOnOutboundReject):
 *   - 승인 완료 → 반려 시:
 *     - 입고관리.잔여수량 += 출고요청수량 (복구)
 *     - LOT별 재고.재고수량 += 출고요청수량 (복구)
 *     - 출고시점 비용 7개 필드 null로 클리어 (손익 보고서 제외)
 */

async function setupApprovedOutbound() {
  store.seed("사용자", ALL_MASTERS.workers);
  store.seed("품목마스터", ALL_MASTERS.products);
  store.seed("보관처 마스터", ALL_MASTERS.storages);
  store.seed("보관처 비용 이력", ALL_MASTERS.storageCosts);

  const inbound = makeApprovedInboundRecord({
    id: "recINBOUNDORIG001",
    lotNumber: "260415-MC1-11-26-0001",
    qty: 100,
    remaining: 100,
  });
  const lot = makeInStockLot({
    id: "recLOTINSTOCK001",
    lotNumber: "260415-MC1-11-26-0001",
    stockQty: 100,
    inboundRecordId: inbound.id,
  });
  store.seed("입고 관리", [inbound]);
  store.seed("LOT별 재고", [lot]);

  const { createOutboundRecord } = await import(
    "@/app/actions/inventory/outbound"
  );
  const { updateApprovalStatus } = await import("@/app/actions/admin/admin");

  // 출고 신청 + 승인
  await createOutboundRecord({
    workerRecordId: WORKER_NORMAL.id,
    lotRecordId: lot.id,
    inboundRecordId: inbound.id,
    quantity: 30,
    date: "2026-05-06",
    seller: "○○수산",
    salePrice: 55000,
  });
  const outbound = store.list("출고 관리")[0];

  await updateApprovalStatus(WORKER_ADMIN.id, outbound.id, "OUTBOUND", "승인 완료");
  // 차감 확인
  expect(store.get("입고 관리", inbound.id)!.fields.잔여수량).toBe(70);
  expect(store.get("LOT별 재고", lot.id)!.fields.재고수량).toBe(70);
  expect(Number(store.get("출고 관리", outbound.id)!.fields["출고시점 판매원가"]))
    .toBeGreaterThan(0);

  return { inbound, lot, outbound, updateApprovalStatus };
}

describe("시나리오 7 — 출고 반려 시 재고 복구", () => {
  test("승인 완료 → 반려: 잔여수량/LOT재고 +30 복구 + 출고시점 비용 7필드 null", async () => {
    const { inbound, lot, outbound, updateApprovalStatus } =
      await setupApprovedOutbound();

    const rejectResult = await updateApprovalStatus(
      WORKER_ADMIN.id,
      outbound.id,
      "OUTBOUND",
      "반려",
      "판매처 변경 요청",
    );
    expect(rejectResult.success).toBe(true);

    // 잔여수량 복구
    expect(store.get("입고 관리", inbound.id)!.fields.잔여수량).toBe(100);
    // LOT 재고 복구
    expect(store.get("LOT별 재고", lot.id)!.fields.재고수량).toBe(100);

    // 출고시점 비용 6개 클리어 + 판매원가 보존 (2026-05-18 정책)
    // 보존: 출고시점 판매원가 ("이 정도 금액에 시도했었다" 지표)
    // 클리어: 단가/냉장료/입출고비/노조비/동결비/손익
    // 제거된 컬럼: 출고시점 판매금액 (판매금액 formula로 대체)
    const outAfter = store.get("출고 관리", outbound.id)!;
    expect(outAfter.fields.승인상태).toBe("반려");
    expect(outAfter.fields["출고시점 단가"]).toBeNull();
    expect(outAfter.fields["출고시점 냉장료"]).toBeNull();
    expect(outAfter.fields["출고시점 입출고비"]).toBeNull();
    expect(outAfter.fields["출고시점 노조비"]).toBeNull();
    expect(outAfter.fields["출고시점 동결비"]).toBeNull();
    expect(outAfter.fields["출고시점 손익"]).toBeNull();
    // 판매원가는 보존 — 신청 시도 cost basis 분석용
    expect(Number(outAfter.fields["출고시점 판매원가"])).toBeGreaterThan(0);
    // 반려사유
    expect(outAfter.fields.반려사유).toBe("판매처 변경 요청");
  });

  test("출고 반려 후 재승인 → 다시 차감 (멱등성)", async () => {
    const { inbound, lot, outbound, updateApprovalStatus } =
      await setupApprovedOutbound();

    // 반려
    await updateApprovalStatus(WORKER_ADMIN.id, outbound.id, "OUTBOUND", "반려");
    expect(store.get("LOT별 재고", lot.id)!.fields.재고수량).toBe(100);

    // 반려 상태에서는 formula가 0을 낸다 (실물 Airtable과 동일)
    const outRejected = store.get("출고 관리", outbound.id)!;
    expect(outRejected.fields["실출고수량"]).toBe(0);
    expect(outRejected.fields["판매금액"]).toBe(0);

    // 재승인
    await updateApprovalStatus(WORKER_ADMIN.id, outbound.id, "OUTBOUND", "승인 완료");
    expect(store.get("입고 관리", inbound.id)!.fields.잔여수량).toBe(70);
    expect(store.get("LOT별 재고", lot.id)!.fields.재고수량).toBe(70);

    const outAfter = store.get("출고 관리", outbound.id)!;
    expect(Number(outAfter.fields["출고시점 판매원가"])).toBeGreaterThan(0);

    // ── 회귀 방지 (2026-08-05) ────────────────────────────────────────────
    // deductStockOnOutboundApproval은 승인상태 PATCH보다 **먼저** 실행된다.
    // 그래서 재승인 시점에 레코드의 승인상태는 아직 '반려'이고, 판매금액 formula
    // (= 판매가 × 실출고수량)는 0을 낸다. 그 0을 손익 계산에 쓰면
    // 손익 = 0 − 원가 = **−원가 전액**이 스냅샷된다. PATCH로 저장되는 값이라
    // 나중에 자동으로 바로잡히지 않는다.
    //
    // 그래서 admin.ts는 판매금액 formula가 아니라 판매가 × 출고요청수량으로
    // 직접 계산한다. 아래 단언이 그 계약이다.
    //   판매가 55,000 × 30박스 = 1,650,000원
    const profit = Number(outAfter.fields["출고시점 손익"]);
    const saleCost = Number(outAfter.fields["출고시점 판매원가"]);
    expect(profit).toBe(1_650_000 - saleCost);
    // 매출을 0으로 읽었다면 손익이 정확히 −원가가 된다 — 그 상태를 배제한다.
    // (손익 자체는 음수일 수 있다. 이 fixture는 판매가 55,000 < 박스당 원가라
    //  정상적으로 적자다 — 부호가 아니라 **매출을 0으로 읽었는지**가 판정 기준이다.)
    expect(profit).not.toBe(-saleCost);
    expect(profit).toBeGreaterThan(-saleCost);

    // 승인상태 PATCH가 끝난 뒤에는 formula도 정상 복귀
    expect(outAfter.fields["실출고수량"]).toBe(30);
    expect(outAfter.fields["판매금액"]).toBe(1_650_000);
  });
});
