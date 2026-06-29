import { describe, expect, test } from "vitest";
import { store } from "./airtable-store";
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
 * 이동 PC 직접 등록 (createTransferDirect)
 *
 * 입고·출고와 동일: 입력 관리자가 곧 결정자. createTransferRecord(승인 대기) →
 * updateApprovalStatus("TRANSFER","승인 완료")(approveTransfer: 새 입고관리/LOT 생성·
 * 원본 차감) 연쇄. 신규 도메인 로직 없음.
 */

const seed = () => {
  store.seed("작업자", ALL_MASTERS.workers);
  store.seed("품목마스터", ALL_MASTERS.products);
  store.seed("보관처 마스터", ALL_MASTERS.storages);
  store.seed("보관처 비용 이력", ALL_MASTERS.storageCosts);
  const inbound = makeApprovedInboundRecord({
    id: "recINBOUNDORIG001",
    lotNumber: "260415-MC1-11-26-0001",
    qty: 100,
    remaining: 100,
    storageId: STORAGE_HANRIM.id,
  });
  const lot = makeInStockLot({
    id: "recLOTORIGINAL001",
    lotNumber: "260415-MC1-11-26-0001",
    stockQty: 100,
    inboundRecordId: inbound.id,
    storageId: STORAGE_HANRIM.id,
  });
  store.seed("입고 관리", [inbound]);
  store.seed("LOT별 재고", [lot]);
  return { inbound, lot };
};

describe("이동 PC 직접 등록", () => {
  test("commit=true → 즉시 승인 + 새 LOT 생성 + 원본 차감", async () => {
    const { lot } = seed();

    const { createTransferDirect } = await import(
      "@/app/actions/admin/master-transactions"
    );
    const res = await createTransferDirect({
      adminWorkerId: WORKER_ADMIN.id,
      item: {
        lotRecordId: lot.id,
        lotNumber: lot.fields.LOT번호 as string,
        이동수량: 30,
        이동후보관처RecordId: STORAGE_BUSAN.id,
        이동일: "2026-05-06",
      },
      commit: true,
    });

    expect(res.success).toBe(true);
    expect(res.committed).toBe(true);

    // 재고 이동 레코드 승인 완료 + 작업자 = 입력 관리자
    const transfer = store.list("재고 이동")[0];
    expect(transfer.fields.승인상태).toBe("승인 완료");
    expect(transfer.fields.작업자).toEqual([WORKER_ADMIN.id]);

    // 새 LOT 생성(원본 + 신규 = 2) + 새 보관처 + 원본 차감
    const lots = store.list("LOT별 재고");
    expect(lots).toHaveLength(2);
    const newLot = lots.find((r) => r.id !== lot.id)!;
    expect(newLot.fields.재고수량).toBe(30);
    expect(newLot.fields.보관처).toEqual([STORAGE_BUSAN.id]);
    expect(store.get("LOT별 재고", lot.id)!.fields.재고수량).toBe(70);
  });

  test("commit=false → 승인 대기, 새 LOT 없음", async () => {
    const { lot } = seed();

    const { createTransferDirect } = await import(
      "@/app/actions/admin/master-transactions"
    );
    const res = await createTransferDirect({
      adminWorkerId: WORKER_ADMIN.id,
      item: {
        lotRecordId: lot.id,
        이동수량: 30,
        이동후보관처RecordId: STORAGE_BUSAN.id,
        이동일: "2026-05-06",
      },
      commit: false,
    });

    expect(res.success).toBe(true);
    expect(res.committed).toBe(false);

    expect(store.list("재고 이동")[0].fields.승인상태).toBe("승인 대기");
    // 승인 전 — 새 LOT 없고 원본 그대로
    expect(store.list("LOT별 재고")).toHaveLength(1);
    expect(store.get("LOT별 재고", lot.id)!.fields.재고수량).toBe(100);
  });

  test("비관리자(WORKER)는 거부 — 레코드 미생성", async () => {
    const { lot } = seed();

    const { createTransferDirect } = await import(
      "@/app/actions/admin/master-transactions"
    );
    const res = await createTransferDirect({
      adminWorkerId: WORKER_NORMAL.id,
      item: {
        lotRecordId: lot.id,
        이동수량: 10,
        이동후보관처RecordId: STORAGE_BUSAN.id,
        이동일: "2026-05-06",
      },
      commit: true,
    });

    expect(res.success).toBe(false);
    expect(store.list("재고 이동")).toHaveLength(0);
  });
});
