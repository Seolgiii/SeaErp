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
 * 일괄 승인 정책 (B안 — 부분 성공 허용)
 *
 * server action: updateApprovalStatusBulk (app/actions/admin/admin.ts)
 * - 순차 호출 (LOT 일련번호 등 자원 경합 회피)
 * - 부분 성공 허용 (첫 실패 시 중단 X, 끝까지 순회)
 * - 결과는 항목별 success/message로 반환
 *
 * 관련 결정: obsidian-vault/40_결정기록/출고이동_카트_UX_통일.md
 * (admin/dashboard 측 일괄 승인 UX 통일 — 2026-05-18 추가)
 */

type Spec = {
  id: string;
  inboundId: string;
  lotNumber: string;
  stockQty: number;
};

function seedMasters(): void {
  store.seed("작업자", ALL_MASTERS.workers);
  store.seed("품목마스터", ALL_MASTERS.products);
  store.seed("보관처 마스터", ALL_MASTERS.storages);
  store.seed("보관처 비용 이력", ALL_MASTERS.storageCosts);
}

function seedLots(specs: Spec[]): void {
  for (const s of specs) {
    const inbound = makeApprovedInboundRecord({
      id: s.inboundId,
      lotNumber: s.lotNumber,
      qty: 100,
      remaining: s.stockQty,
    });
    const lot = makeInStockLot({
      id: s.id,
      lotNumber: s.lotNumber,
      stockQty: s.stockQty,
      inboundRecordId: inbound.id,
    });
    store.seed("입고 관리", [inbound]);
    store.seed("LOT별 재고", [lot]);
  }
}

async function submitOutboundForSpec(spec: Spec, qty: number): Promise<string> {
  const { createOutboundRecord } = await import(
    "@/app/actions/inventory/outbound"
  );
  const result = await createOutboundRecord({
    workerRecordId: WORKER_NORMAL.id,
    lotRecordId: spec.id,
    inboundRecordId: spec.inboundId,
    quantity: qty,
    date: "2026-05-18",
    seller: "○○수산",
    salePrice: 55000,
  });
  if (!result.success) throw new Error(`출고 신청 실패: ${result.error}`);
  // store에서 방금 만든 출고 record id 추출 (가장 최근에 lotRecordId로 매핑된 것)
  const records = store.list("출고 관리");
  const matched = records.filter(
    (r) => String(r.fields.LOT재고레코드ID) === spec.id,
  );
  return matched[matched.length - 1].id;
}

describe("일괄 승인 정책 (B안)", () => {
  test("시나리오 A — 3건 모두 승인 성공: LOT 재고 모두 차감", async () => {
    seedMasters();
    const specs: Spec[] = [
      { id: "recLOTBULKA001", inboundId: "recINBULKA001", lotNumber: "260518-MC1-11-26-0001", stockQty: 100 },
      { id: "recLOTBULKA002", inboundId: "recINBULKA002", lotNumber: "260518-MC1-11-26-0002", stockQty: 100 },
      { id: "recLOTBULKA003", inboundId: "recINBULKA003", lotNumber: "260518-MC1-11-26-0003", stockQty: 100 },
    ];
    seedLots(specs);

    const outboundIds: string[] = [];
    for (const s of specs) outboundIds.push(await submitOutboundForSpec(s, 30));

    const { updateApprovalStatusBulk } = await import(
      "@/app/actions/admin/admin"
    );
    const result = await updateApprovalStatusBulk(
      WORKER_ADMIN.id,
      outboundIds.map((id) => ({ recordId: id, type: "OUTBOUND" as const })),
    );

    expect(result.successCount).toBe(3);
    expect(result.failCount).toBe(0);
    expect(result.results.every((r) => r.success)).toBe(true);

    // 모든 LOT 재고가 100 - 30 = 70으로 차감되어야 함
    for (const spec of specs) {
      const lot = store.get("LOT별 재고", spec.id);
      expect(Number(lot?.fields.재고수량)).toBe(70);
    }
    // 모든 출고 record가 승인 완료 상태
    for (const id of outboundIds) {
      const out = store.get("출고 관리", id);
      expect(out?.fields.승인상태).toBe("승인 완료");
    }
  });

  test("시나리오 B — 3건 중 2번째만 재고 부족: 1, 3은 승인, 2는 실패", async () => {
    seedMasters();
    const specs: Spec[] = [
      { id: "recLOTBULKB001", inboundId: "recINBULKB001", lotNumber: "260518-MC1-11-26-0011", stockQty: 100 },
      { id: "recLOTBULKB002", inboundId: "recINBULKB002", lotNumber: "260518-MC1-11-26-0012", stockQty: 100 },
      { id: "recLOTBULKB003", inboundId: "recINBULKB003", lotNumber: "260518-MC1-11-26-0013", stockQty: 100 },
    ];
    seedLots(specs);

    const outboundIds: string[] = [];
    for (const s of specs) outboundIds.push(await submitOutboundForSpec(s, 30));

    // 2번째 LOT의 재고를 인위적으로 0으로 만들어 일괄 승인 시점에 재고 부족 유발
    store.patch("LOT별 재고", specs[1].id, { 재고수량: 0 });
    store.patch("입고 관리", specs[1].inboundId, { 잔여수량: 0 });

    const { updateApprovalStatusBulk } = await import(
      "@/app/actions/admin/admin"
    );
    const result = await updateApprovalStatusBulk(
      WORKER_ADMIN.id,
      outboundIds.map((id) => ({ recordId: id, type: "OUTBOUND" as const })),
    );

    expect(result.successCount).toBe(2);
    expect(result.failCount).toBe(1);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(false);
    expect(result.results[2].success).toBe(true);

    // 1, 3번째 LOT은 30 차감되어 70 — 2번째는 그대로 0
    expect(Number(store.get("LOT별 재고", specs[0].id)?.fields.재고수량)).toBe(70);
    expect(Number(store.get("LOT별 재고", specs[1].id)?.fields.재고수량)).toBe(0);
    expect(Number(store.get("LOT별 재고", specs[2].id)?.fields.재고수량)).toBe(70);
  });

  test("시나리오 C — 첫 항목 실패에도 나머지 계속 처리 (early-abort 방지)", async () => {
    seedMasters();
    const specs: Spec[] = [
      { id: "recLOTBULKC001", inboundId: "recINBULKC001", lotNumber: "260518-MC1-11-26-0021", stockQty: 100 },
      { id: "recLOTBULKC002", inboundId: "recINBULKC002", lotNumber: "260518-MC1-11-26-0022", stockQty: 100 },
      { id: "recLOTBULKC003", inboundId: "recINBULKC003", lotNumber: "260518-MC1-11-26-0023", stockQty: 100 },
    ];
    seedLots(specs);

    const outboundIds: string[] = [];
    for (const s of specs) outboundIds.push(await submitOutboundForSpec(s, 30));

    // 첫 번째 LOT의 재고를 0으로
    store.patch("LOT별 재고", specs[0].id, { 재고수량: 0 });
    store.patch("입고 관리", specs[0].inboundId, { 잔여수량: 0 });

    const { updateApprovalStatusBulk } = await import(
      "@/app/actions/admin/admin"
    );
    const result = await updateApprovalStatusBulk(
      WORKER_ADMIN.id,
      outboundIds.map((id) => ({ recordId: id, type: "OUTBOUND" as const })),
    );

    expect(result.successCount).toBe(2);
    expect(result.failCount).toBe(1);
    // 1번째 실패, 2, 3번째 성공 (early-abort 안 함을 검증)
    expect(result.results[0].success).toBe(false);
    expect(result.results[1].success).toBe(true);
    expect(result.results[2].success).toBe(true);
  });

  test("시나리오 D — WORKER가 일괄 승인 호출 시 권한 거부 (모두 실패)", async () => {
    seedMasters();
    const specs: Spec[] = [
      { id: "recLOTBULKD001", inboundId: "recINBULKD001", lotNumber: "260518-MC1-11-26-0031", stockQty: 100 },
    ];
    seedLots(specs);

    const outboundIds: string[] = [];
    for (const s of specs) outboundIds.push(await submitOutboundForSpec(s, 30));

    const { updateApprovalStatusBulk } = await import(
      "@/app/actions/admin/admin"
    );
    // WORKER_NORMAL은 ADMIN 권한 없음 — updateApprovalStatus 내부에서 차단
    const result = await updateApprovalStatusBulk(
      WORKER_NORMAL.id,
      outboundIds.map((id) => ({ recordId: id, type: "OUTBOUND" as const })),
    );

    expect(result.successCount).toBe(0);
    expect(result.failCount).toBe(1);
    expect(result.results[0].success).toBe(false);
    // LOT 재고 변동 없음
    expect(Number(store.get("LOT별 재고", specs[0].id)?.fields.재고수량)).toBe(100);
  });
});
