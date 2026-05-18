import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { store } from "./airtable-store";
import { clearFaults, injectFault } from "./fetch-mock";
import {
  ALL_MASTERS,
  STORAGE_BUSAN,
  STORAGE_HANRIM,
  WORKER_ADMIN,
  WORKER_NORMAL,
  makeApprovedInboundRecord,
  makeInStockLot,
} from "./fixtures";

/**
 * TRANSFER 반려 partial failure 보상 트랜잭션 (출고 반려와 대칭)
 *
 * 정책 (transfer.ts revertTransferOnReject):
 *  - 단계 1: 원본 LOT.재고수량 +이동수량 (실패 → 즉시 return false, 보상 불필요)
 *  - 단계 2: 원본 입고관리.잔여수량 +이동수량 (실패 → 원본 LOT 원복 → return false)
 *  - 단계 3: 신규 LOT.재고수량 = 0 (실패 → 원본 LOT/입고관리 원복 → return false)
 *  - 단계 4: 신규 입고관리 잔여수량=0/승인상태=반려 (실패 → 원본 LOT/입고관리 원복 + 신규 LOT 복원 → return false)
 *
 * admin.ts가 success:false를 받으면 반려 처리(승인상태 PATCH)를 진행하지 않아
 * 데이터가 "승인 완료 + 모두 차감" 상태로 유지됨 → 사용자가 반려 재시도 가능.
 *
 * 2026-05-18 도입 — 출고 반려와 비대칭 해소.
 */

async function seedAndApproveTransfer() {
  store.reset();
  store.seed("작업자", ALL_MASTERS.workers);
  store.seed("품목마스터", ALL_MASTERS.products);
  store.seed("보관처 마스터", ALL_MASTERS.storages);
  store.seed("보관처 비용 이력", ALL_MASTERS.storageCosts);

  const originalInbound = makeApprovedInboundRecord({
    id: "recINBOUNDPF0001",
    lotNumber: "260415-MC1-11-26-7001",
    qty: 100,
    remaining: 100,
    storageId: STORAGE_HANRIM.id,
  });
  const originalLot = makeInStockLot({
    id: "recLOTPFORIG0001",
    lotNumber: "260415-MC1-11-26-7001",
    stockQty: 100,
    inboundRecordId: originalInbound.id,
    storageId: STORAGE_HANRIM.id,
  });
  store.seed("입고 관리", [originalInbound]);
  store.seed("LOT별 재고", [originalLot]);

  const { createTransferRecord } = await import(
    "@/app/actions/inventory/transfer"
  );
  const tfRes = await createTransferRecord({
    lotRecordId: originalLot.id,
    이동수량: 20,
    이동후보관처RecordId: STORAGE_BUSAN.id,
    이동일: "2026-05-18",
    workerId: WORKER_NORMAL.id,
  });
  expect(tfRes.success).toBe(true);

  const transfer = store.list("재고 이동")[0];
  const { updateApprovalStatus } = await import("@/app/actions/admin/admin");
  const apRes = await updateApprovalStatus(
    WORKER_ADMIN.id,
    transfer.id,
    "TRANSFER",
    "승인 완료",
  );
  expect(apRes.success).toBe(true);

  const allLots = store.list("LOT별 재고");
  const allInbounds = store.list("입고 관리");
  const newLot = allLots.find((r) => r.id !== originalLot.id)!;
  const newInbound = allInbounds.find((r) => r.id !== originalInbound.id)!;

  // 차감 상태 확인 (원본 100 → 80, 신규 20)
  expect(Number(store.get("LOT별 재고", originalLot.id)!.fields.재고수량)).toBe(80);
  expect(Number(store.get("입고 관리", originalInbound.id)!.fields.잔여수량)).toBe(80);
  expect(Number(store.get("LOT별 재고", newLot.id)!.fields.재고수량)).toBe(20);

  return { transfer, originalLot, originalInbound, newLot, newInbound, updateApprovalStatus };
}

describe("TRANSFER 반려 partial failure 보상", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    clearFaults();
  });

  test("단계 2 (원본 입고관리 잔여수량) PATCH 실패 → 원본 LOT 원복 → 모두 차감 상태", async () => {
    const { transfer, originalLot, originalInbound, newLot, newInbound, updateApprovalStatus } =
      await seedAndApproveTransfer();

    // 원본 입고관리 PATCH(잔여수량) 1회 실패 주입
    injectFault({
      table: "입고 관리",
      method: "PATCH",
      recordId: originalInbound.id,
      fieldKey: "잔여수량",
    });

    const r = await updateApprovalStatus(
      WORKER_ADMIN.id,
      transfer.id,
      "TRANSFER",
      "반려",
      "테스트용",
    );
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/원본 입고관리|복구|보상/);

    // 보상: 원본 LOT 원복되어 80 (차감 상태)
    expect(Number(store.get("LOT별 재고", originalLot.id)!.fields.재고수량)).toBe(80);
    // 원본 입고관리는 PATCH 실패로 변경 없음 = 80 (차감 상태)
    expect(Number(store.get("입고 관리", originalInbound.id)!.fields.잔여수량)).toBe(80);
    // 신규는 그대로 활성
    expect(Number(store.get("LOT별 재고", newLot.id)!.fields.재고수량)).toBe(20);
    expect(Number(store.get("입고 관리", newInbound.id)!.fields.잔여수량)).toBe(20);
    // 재고 이동.승인상태 = 그대로 (반려 처리 안 됨)
    expect(store.get("재고 이동", transfer.id)!.fields.승인상태).toBe("승인 완료");
  });

  test("단계 3 (신규 LOT 0) PATCH 실패 → 원본 LOT/입고관리 원복", async () => {
    const { transfer, originalLot, originalInbound, newLot, newInbound, updateApprovalStatus } =
      await seedAndApproveTransfer();

    // 신규 LOT PATCH(재고수량) 1회 실패 — 단계 3 진입 시점에 fault 매칭
    injectFault({
      table: "LOT별 재고",
      method: "PATCH",
      recordId: newLot.id,
      fieldKey: "재고수량",
    });

    const r = await updateApprovalStatus(
      WORKER_ADMIN.id,
      transfer.id,
      "TRANSFER",
      "반려",
      "테스트용",
    );
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/신규 LOT|soft delete|보상/);

    // 보상: 원본 모두 차감 상태로 원복
    expect(Number(store.get("LOT별 재고", originalLot.id)!.fields.재고수량)).toBe(80);
    expect(Number(store.get("입고 관리", originalInbound.id)!.fields.잔여수량)).toBe(80);
    // 신규는 fault로 변경 안 됨 = 활성 (20)
    expect(Number(store.get("LOT별 재고", newLot.id)!.fields.재고수량)).toBe(20);
    expect(Number(store.get("입고 관리", newInbound.id)!.fields.잔여수량)).toBe(20);
    expect(store.get("재고 이동", transfer.id)!.fields.승인상태).toBe("승인 완료");
  });

  test("단계 4 (신규 입고관리 soft delete) PATCH 실패 → 원본·신규 LOT 모두 원복", async () => {
    const { transfer, originalLot, originalInbound, newLot, newInbound, updateApprovalStatus } =
      await seedAndApproveTransfer();

    // 신규 입고관리 PATCH(승인상태) 1회 실패 — 단계 4
    injectFault({
      table: "입고 관리",
      method: "PATCH",
      recordId: newInbound.id,
      fieldKey: "승인상태",
    });

    const r = await updateApprovalStatus(
      WORKER_ADMIN.id,
      transfer.id,
      "TRANSFER",
      "반려",
      "테스트용",
    );
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/신규 입고관리|보상/);

    // 보상: 원본 LOT/입고관리 + 신규 LOT 모두 차감 상태로 원복
    expect(Number(store.get("LOT별 재고", originalLot.id)!.fields.재고수량)).toBe(80);
    expect(Number(store.get("입고 관리", originalInbound.id)!.fields.잔여수량)).toBe(80);
    // 신규 LOT는 단계 3에서 0이 됐다가 보상으로 20 복원
    expect(Number(store.get("LOT별 재고", newLot.id)!.fields.재고수량)).toBe(20);
    // 신규 입고관리는 fault로 변경 안 됨 (잔여수량 20, 승인 완료)
    expect(Number(store.get("입고 관리", newInbound.id)!.fields.잔여수량)).toBe(20);
    expect(store.get("재고 이동", transfer.id)!.fields.승인상태).toBe("승인 완료");
  });

  test("정상 흐름 (fault 없음) — 모든 단계 성공, 자동 복구 완료", async () => {
    const { transfer, originalLot, originalInbound, newLot, newInbound, updateApprovalStatus } =
      await seedAndApproveTransfer();

    const r = await updateApprovalStatus(
      WORKER_ADMIN.id,
      transfer.id,
      "TRANSFER",
      "반려",
      "테스트용",
    );
    expect(r.success).toBe(true);

    // 원본 복구
    expect(Number(store.get("LOT별 재고", originalLot.id)!.fields.재고수량)).toBe(100);
    expect(Number(store.get("입고 관리", originalInbound.id)!.fields.잔여수량)).toBe(100);
    // 신규 soft delete
    expect(Number(store.get("LOT별 재고", newLot.id)!.fields.재고수량)).toBe(0);
    expect(Number(store.get("입고 관리", newInbound.id)!.fields.잔여수량)).toBe(0);
    expect(store.get("입고 관리", newInbound.id)!.fields.승인상태).toBe("반려");
    // 재고 이동.승인상태 = 반려
    expect(store.get("재고 이동", transfer.id)!.fields.승인상태).toBe("반려");
  });
});
