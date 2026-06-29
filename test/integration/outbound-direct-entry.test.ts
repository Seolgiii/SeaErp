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
 * 출고 PC 직접 등록 (createOutboundDirect)
 *
 * 입고와 동일: 입력하는 관리자가 곧 결정자. createOutboundRecord(승인 대기) →
 * updateApprovalStatus("OUTBOUND","승인 완료")(잔여수량·LOT 재고 차감 + 출고시점 비용
 * 스냅샷 + 출고증 PDF) 연쇄. 신규 도메인 로직 없음. inboundRecordId는 LOT의
 * 입고관리링크에서 자동 조회.
 */

const seed = () => {
  store.seed("작업자", ALL_MASTERS.workers);
  store.seed("품목마스터", ALL_MASTERS.products);
  store.seed("보관처 마스터", ALL_MASTERS.storages);
  store.seed("보관처 비용 이력", ALL_MASTERS.storageCosts);
  const inbound = makeApprovedInboundRecord({
    id: "recINBOUNDAPPROVED",
    lotNumber: "260415-MC1-11-26-0001",
    qty: 100,
    remaining: 100,
    purchasePrice: 50000,
  });
  const lot = makeInStockLot({
    id: "recLOTINSTOCK001",
    lotNumber: "260415-MC1-11-26-0001",
    stockQty: 100,
    inboundRecordId: inbound.id,
    purchasePrice: 50000,
  });
  store.seed("입고 관리", [inbound]);
  store.seed("LOT별 재고", [lot]);
  return { inbound, lot };
};

describe("출고 PC 직접 등록", () => {
  test("commit=true → 즉시 승인 완료 + 잔여수량/LOT 재고 차감", async () => {
    const { inbound, lot } = seed();

    const { createOutboundDirect } = await import(
      "@/app/actions/admin/master-transactions"
    );
    const res = await createOutboundDirect({
      adminWorkerId: WORKER_ADMIN.id,
      item: {
        lotRecordId: lot.id,
        lotNumber: lot.fields.LOT번호 as string,
        quantity: 30,
        date: "2026-05-06",
        seller: "○○수산",
        salePrice: 55000,
      },
      commit: true,
    });

    expect(res.success).toBe(true);
    expect(res.committed).toBe(true);

    const out = store.list("출고 관리")[0];
    expect(out.fields.승인상태).toBe("승인 완료");
    expect(out.fields.출고요청수량).toBe(30);
    // 작업자 = 입력 관리자
    expect(out.fields.작업자).toEqual([WORKER_ADMIN.id]);
    // 커밋의 부수효과 — 잔여수량/LOT 재고 차감
    expect(store.get("입고 관리", inbound.id)!.fields.잔여수량).toBe(70);
    expect(store.get("LOT별 재고", lot.id)!.fields.재고수량).toBe(70);
  });

  test("commit=false → 승인 대기, 재고 차감 없음", async () => {
    const { inbound, lot } = seed();

    const { createOutboundDirect } = await import(
      "@/app/actions/admin/master-transactions"
    );
    const res = await createOutboundDirect({
      adminWorkerId: WORKER_ADMIN.id,
      item: {
        lotRecordId: lot.id,
        quantity: 30,
        date: "2026-05-06",
        seller: "○○수산",
        salePrice: 55000,
      },
      commit: false,
    });

    expect(res.success).toBe(true);
    expect(res.committed).toBe(false);

    const out = store.list("출고 관리")[0];
    expect(out.fields.승인상태).toBe("승인 대기");
    // 차감은 승인 시점 — 아직 그대로
    expect(store.get("입고 관리", inbound.id)!.fields.잔여수량).toBe(100);
    expect(store.get("LOT별 재고", lot.id)!.fields.재고수량).toBe(100);
  });

  test("비관리자(WORKER)는 거부 — 레코드 미생성", async () => {
    const { lot } = seed();

    const { createOutboundDirect } = await import(
      "@/app/actions/admin/master-transactions"
    );
    const res = await createOutboundDirect({
      adminWorkerId: WORKER_NORMAL.id,
      item: {
        lotRecordId: lot.id,
        quantity: 10,
        date: "2026-05-06",
        seller: "○○수산",
        salePrice: 55000,
      },
      commit: true,
    });

    expect(res.success).toBe(false);
    expect(store.list("출고 관리")).toHaveLength(0);
  });
});
