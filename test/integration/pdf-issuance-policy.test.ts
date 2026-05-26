import { beforeEach, describe, expect, test, vi } from "vitest";
import { store } from "./airtable-store";
import { generateInboundPdf, generateOutboundPdf } from "@/lib/generate-pdf.server";
import {
  ALL_MASTERS,
  PDF_POLICY_STORAGES,
  PRODUCT_MACKEREL,
  STORAGE_COST_HANRIM,
  STORAGE_EXTERNAL,
  STORAGE_HANRIM,
  STORAGE_OWN,
  STORAGE_OWN_B,
  STORAGE_PROCESSING,
  WORKER_ADMIN,
  WORKER_NORMAL,
  makeApprovedInboundRecord,
  makeInStockLot,
} from "./fixtures";

/**
 * 입출고증 발행 정책 — 자사창고 끝점 분기 (lib/storage.ts:isOwnStorage)
 *
 * 2026-05-19 도입: 자사창고가 *끝점*일 때만 우리(SeaERP)가 PDF를 발행한다.
 * 외부창고/가공공장/기타는 해당 시설이 자체 발급. 미분류(빈 `구분`)는 default true.
 *
 * CLAUDE.md 7가지 케이스 매트릭스를 그대로 못박는다 (+ 미분류 회귀 1건):
 *
 *   | 시나리오                  | 입고증 | 출고증 |
 *   |--------------------------|:-----:|:-----:|
 *   | 1. 자사창고 입고          |   O   |   –   |
 *   | 2. 외부창고 입고          |   X   |   –   |
 *   | 3. 자사 → 자사 이동       |   O   |   O   |
 *   | 4. 자사 → 외부 이동       |   X   |   O   |
 *   | 5. 외부 → 자사 이동       |   O   |   X   |
 *   | 6. 외부 → 외부(가공) 이동 |   X   |   X   |
 *   | 7. 거래처 출고            |   –   |   O   | (보관처 무관, 현 동작 유지)
 *   | 8. 미분류 입고 (회귀)     |   O   |   –   | (default true 보호)
 *
 * 발행 여부 단언은 두 신호로 한다 (골든 테스트와 동일 + 발행 결정 직접 검증):
 *   (a) 레코드의 PDF URL 필드 세팅 여부 (end-to-end: 결정→생성→업로드→저장)
 *   (b) generateInboundPdf / generateOutboundPdf mock 호출 횟수 (발행 *결정* 자체)
 *
 * production 코드는 손대지 않음 — 신규 테스트 + fixture 추가만.
 */

const BLOB_URL = /^https:\/\/mock-blob\.vercel-storage\.com\//;
const LOT_NUMBER = "260415-MC1-11-26-0001";

function urlOf(value: unknown): string {
  return String(value ?? "");
}

/** 입고 신청 → 승인. 승인 후 입고 관리 레코드를 반환. */
async function approveInbound(storageRecordId: string) {
  const { createInventoryRecord } = await import(
    "@/app/actions/inventory/inbound"
  );
  const result = await createInventoryRecord({
    작업자: WORKER_NORMAL.id,
    품목명: PRODUCT_MACKEREL.fields.품목명 as string,
    입고일자: "2026-05-06",
    규격: "11",
    미수: "26",
    "입고수량(BOX)": 100,
    수매가: 50000,
    storageRecordId,
  });
  expect(result.success).toBe(true);

  const inbound = store.list("입고 관리")[0];
  const { updateApprovalStatus } = await import("@/app/actions/admin/admin");
  const approval = await updateApprovalStatus(
    WORKER_ADMIN.id,
    inbound.id,
    "INBOUND",
    "승인 완료",
  );
  expect(approval.success).toBe(true);

  return store.get("입고 관리", inbound.id)!;
}

/** 거래처 출고 신청 → 승인. 승인 후 출고 관리 레코드를 반환. */
async function approveOutbound(storageId: string) {
  const inbound = makeApprovedInboundRecord({
    id: "recINBOUNDAPPROVED",
    lotNumber: LOT_NUMBER,
    qty: 100,
    remaining: 100,
    purchasePrice: 50000,
    storageId,
  });
  const lot = makeInStockLot({
    id: "recLOTINSTOCK001",
    lotNumber: LOT_NUMBER,
    stockQty: 100,
    inboundRecordId: inbound.id,
    purchasePrice: 50000,
    storageId,
  });
  store.seed("입고 관리", [inbound]);
  store.seed("LOT별 재고", [lot]);

  const { createOutboundRecord } = await import(
    "@/app/actions/inventory/outbound"
  );
  const result = await createOutboundRecord({
    workerRecordId: WORKER_NORMAL.id,
    lotRecordId: lot.id,
    inboundRecordId: inbound.id,
    quantity: 30,
    date: "2026-05-06",
    seller: "○○수산",
    salePrice: 55000,
  });
  expect(result.success).toBe(true);

  const outbound = store.list("출고 관리")[0];
  const { updateApprovalStatus } = await import("@/app/actions/admin/admin");
  const approval = await updateApprovalStatus(
    WORKER_ADMIN.id,
    outbound.id,
    "OUTBOUND",
    "승인 완료",
  );
  expect(approval.success).toBe(true);

  return store.get("출고 관리", outbound.id)!;
}

/** 이동 신청 → 승인. 신규 입고 관리 + 재고 이동 레코드를 반환. */
async function approveTransferFlow(sourceStorageId: string, destStorageId: string) {
  const originalInbound = makeApprovedInboundRecord({
    id: "recINBOUNDORIG001",
    lotNumber: LOT_NUMBER,
    qty: 100,
    remaining: 100,
    storageId: sourceStorageId,
  });
  const originalLot = makeInStockLot({
    id: "recLOTORIGINAL001",
    lotNumber: LOT_NUMBER,
    stockQty: 100,
    inboundRecordId: originalInbound.id,
    storageId: sourceStorageId,
  });
  store.seed("입고 관리", [originalInbound]);
  store.seed("LOT별 재고", [originalLot]);

  const { createTransferRecord } = await import(
    "@/app/actions/inventory/transfer"
  );
  const transferResult = await createTransferRecord({
    lotRecordId: originalLot.id,
    이동수량: 30,
    이동후보관처RecordId: destStorageId,
    이동일: "2026-05-06",
    workerId: WORKER_NORMAL.id,
  });
  expect(transferResult.success).toBe(true);

  const transfer = store.list("재고 이동")[0];
  const { updateApprovalStatus } = await import("@/app/actions/admin/admin");
  const approval = await updateApprovalStatus(
    WORKER_ADMIN.id,
    transfer.id,
    "TRANSFER",
    "승인 완료",
  );
  expect(approval.success).toBe(true);

  const newInbound = store
    .list("입고 관리")
    .find((r) => r.id !== originalInbound.id)!;
  const transferAfter = store.get("재고 이동", transfer.id)!;
  return { newInbound, transferAfter };
}

describe("입출고증 발행 정책 — 자사창고 끝점 분기", () => {
  beforeEach(() => {
    store.seed("작업자", ALL_MASTERS.workers);
    store.seed("품목마스터", ALL_MASTERS.products);
    store.seed("보관처 마스터", PDF_POLICY_STORAGES.storages);
    store.seed("보관처 비용 이력", PDF_POLICY_STORAGES.storageCosts);
  });

  // ── 입고 (admin INBOUND) ──

  test("1. 자사창고 입고 → 입고증 발행 O", async () => {
    const inbound = await approveInbound(STORAGE_OWN.id);

    expect(urlOf(inbound.fields.입고증URL)).toMatch(BLOB_URL);
    expect(vi.mocked(generateInboundPdf)).toHaveBeenCalledTimes(1);
  });

  test("2. 외부창고 입고 → 입고증 발행 X (외부 자체 발급)", async () => {
    const inbound = await approveInbound(STORAGE_EXTERNAL.id);

    expect(urlOf(inbound.fields.입고증URL)).toBe("");
    expect(vi.mocked(generateInboundPdf)).not.toHaveBeenCalled();
  });

  // ── 이동 (transfer) ──

  test("3. 자사 → 자사 이동 → 입고증 O + 출고증 O", async () => {
    const { newInbound, transferAfter } = await approveTransferFlow(
      STORAGE_OWN.id,
      STORAGE_OWN_B.id,
    );

    expect(urlOf(newInbound.fields.입고증URL)).toMatch(BLOB_URL);
    expect(urlOf(transferAfter.fields["출고증 URL"])).toMatch(BLOB_URL);
    expect(vi.mocked(generateInboundPdf)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(generateOutboundPdf)).toHaveBeenCalledTimes(1);
  });

  test("4. 자사 → 외부 이동 → 입고증 X + 출고증 O", async () => {
    const { newInbound, transferAfter } = await approveTransferFlow(
      STORAGE_OWN.id,
      STORAGE_EXTERNAL.id,
    );

    expect(urlOf(newInbound.fields.입고증URL)).toBe("");
    expect(urlOf(transferAfter.fields["출고증 URL"])).toMatch(BLOB_URL);
    expect(vi.mocked(generateInboundPdf)).not.toHaveBeenCalled();
    expect(vi.mocked(generateOutboundPdf)).toHaveBeenCalledTimes(1);
  });

  test("5. 외부 → 자사 이동 → 입고증 O + 출고증 X (외부 자체 출고증)", async () => {
    const { newInbound, transferAfter } = await approveTransferFlow(
      STORAGE_EXTERNAL.id,
      STORAGE_OWN.id,
    );

    expect(urlOf(newInbound.fields.입고증URL)).toMatch(BLOB_URL);
    expect(urlOf(transferAfter.fields["출고증 URL"])).toBe("");
    expect(vi.mocked(generateInboundPdf)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(generateOutboundPdf)).not.toHaveBeenCalled();
  });

  test("6. 외부 → 외부(가공공장) 이동 → 입고증 X + 출고증 X", async () => {
    const { newInbound, transferAfter } = await approveTransferFlow(
      STORAGE_EXTERNAL.id,
      STORAGE_PROCESSING.id,
    );

    expect(urlOf(newInbound.fields.입고증URL)).toBe("");
    expect(urlOf(transferAfter.fields["출고증 URL"])).toBe("");
    expect(vi.mocked(generateInboundPdf)).not.toHaveBeenCalled();
    expect(vi.mocked(generateOutboundPdf)).not.toHaveBeenCalled();
  });

  // ── 거래처 출고 (admin OUTBOUND) — 보관처 구분 무관하게 항상 발행 ──

  test("7. 거래처 출고 → 출고증 O (LOT이 외부창고라도 발행)", async () => {
    // 외부창고 LOT으로 출고해도 거래처 출고증은 우리가 발행 (현 동작 유지)
    const outbound = await approveOutbound(STORAGE_EXTERNAL.id);

    expect(urlOf(outbound.fields.출고증URL)).toMatch(BLOB_URL);
    expect(vi.mocked(generateOutboundPdf)).toHaveBeenCalledTimes(1);
  });

  // ── 미분류 회귀 — `구분` 빈 값은 default true (운영 점진 분류 중 회귀 방지) ──

  test("8. 미분류(`구분` 빈 값) 입고 → 입고증 O (default true 회귀 보호)", async () => {
    // STORAGE_HANRIM은 `구분` 미설정 — 분류 전 운영 보관처 86건과 동일 상태
    store.seed("보관처 마스터", [STORAGE_HANRIM]);
    store.seed("보관처 비용 이력", [STORAGE_COST_HANRIM]);

    const inbound = await approveInbound(STORAGE_HANRIM.id);

    expect(urlOf(inbound.fields.입고증URL)).toMatch(BLOB_URL);
    expect(vi.mocked(generateInboundPdf)).toHaveBeenCalledTimes(1);
  });
});
