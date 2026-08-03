import { describe, expect, test } from "vitest";
import type { AirtableRecord } from "./airtable-store";
import { store } from "./airtable-store";
import {
  ALL_MASTERS,
  PRODUCT_MACKEREL,
  STORAGE_OWN,
  WORKER_ADMIN,
  WORKER_MASTER,
  WORKER_NORMAL,
} from "./fixtures";

/**
 * 작업 정산 등록 골든패스 — 정산서형 매입·원가 폼.
 *
 * 시나리오:
 *   생산내역 2줄(사료팬 규격11 30박스 @수매단가 10,000 / 베이트大 규격13 20박스 @8,000)
 *   + 작업비 총 500,000(수수료 330,000 + 박스 170,000).
 *   → 확정 시 생산내역 1줄마다 입고관리 1행 + LOT 1개 생성.
 *
 *   총박스수 = 50 → 작업단가 = 500,000 ÷ 50 = 10,000/박스
 *   실단가 = 수매단가 + 작업단가 → 20,000 / 18,000
 *   입고관리.수매가 = 수매단가(순수 매입) / LOT.수매가 = 실단가(재고원가)
 *   매입액 = 10,000×30 + 8,000×20 = 460,000 / 재고원가합 = 460,000 + 500,000 = 960,000
 */

const SUPPLIER: AirtableRecord = {
  id: "recSUPPLIERWS0001",
  fields: { 매입처명: "제주수협" },
};

const STORAGE_COST_OWN: AirtableRecord = {
  id: "recSTGCOSTWS00001",
  fields: {
    보관처명: "자사제1냉동",
    적용시작일: "2026-01-01",
    적용종료일: "",
    냉장료: 1500,
    입출고비: 500,
    노조비: 200,
  },
};

function seedBase() {
  store.seed("사용자", ALL_MASTERS.workers);
  store.seed("품목마스터", [PRODUCT_MACKEREL]);
  store.seed("보관처 마스터", [STORAGE_OWN]);
  store.seed("보관처 비용 이력", [STORAGE_COST_OWN]);
  store.seed("매입처 마스터", [SUPPLIER]);
}

const saveInput = {
  header: {
    date: "2026-04-15",
    supplierId: SUPPLIER.id,
    catchAmount: 10_000_000,
    workplaceId: STORAGE_OWN.id,
  },
  lines: [
    {
      productId: PRODUCT_MACKEREL.id,
      productName: "고등어",
      boxType: "사료팬",
      spec: "11",
      misu: "26",
      quantity: 30,
      purchaseUnitPrice: 10_000,
      usage: "원물동결",
      destinationId: STORAGE_OWN.id,
    },
    {
      productId: PRODUCT_MACKEREL.id,
      productName: "고등어",
      boxType: "베이트大",
      spec: "13",
      misu: "20",
      quantity: 20,
      purchaseUnitPrice: 8_000,
      usage: "원물동결",
      destinationId: STORAGE_OWN.id,
    },
  ],
  costs: [
    { group: "수수료", itemName: "수수료", amount: 330_000 },
    { group: "박스", itemName: "펜사용료", count: 30, unitPrice: 350, amount: 170_000 },
  ],
};

const lotBySpec = (spec: string) =>
  store.list("LOT별 재고").find((r) => String(r.fields.규격) === spec);
const inboundBySpec = (spec: string) =>
  store.list("입고 관리").find((r) => String(r.fields.규격) === spec);

describe("작업 정산 등록 골든패스", () => {
  test("임시저장 → 확정: 생산내역별 입고관리+LOT 생성 + 원가 배선", async () => {
    seedBase();
    const { saveWorkSettlement, confirmWorkSettlement } = await import(
      "@/app/actions/admin/master-work-settlement"
    );

    // ── 임시저장 (초안, LOT 미생성) ──
    const saved = await saveWorkSettlement(WORKER_ADMIN.id, saveInput);
    expect(saved.success).toBe(true);
    if (!saved.success) return;
    expect(saved.data.no).toBe("WS-260415-0001");
    expect(store.list("작업 정산 생산내역")).toHaveLength(2);
    expect(store.list("작업 정산 작업비")).toHaveLength(2);
    // 임시저장 단계엔 재고 미생성
    expect(store.list("LOT별 재고")).toHaveLength(0);
    expect(store.get("작업 정산", saved.data.settlementId)!.fields.상태).toBe("임시저장");

    // ── 확정 ──
    const confirmed = await confirmWorkSettlement(WORKER_ADMIN.id, saved.data.settlementId);
    expect(confirmed.success).toBe(true);
    if (!confirmed.success) return;
    expect(confirmed.data.lotCount).toBe(2);
    expect(store.get("작업 정산", saved.data.settlementId)!.fields.상태).toBe("확정");

    // ── LOT 검증: 수매가 = 실단가(재고원가) ──
    const lot11 = lotBySpec("11")!.fields;
    const lot13 = lotBySpec("13")!.fields;
    expect(lot11.수매가).toBe(20_000); // 10,000 + 작업단가 10,000
    expect(lot13.수매가).toBe(18_000); // 8,000 + 10,000
    expect(lot11.재고수량).toBe(30);
    expect(lot13.재고수량).toBe(20);
    expect(lot11.보관처).toEqual([STORAGE_OWN.id]);
    expect(lot11.상태).toBe("승인 완료");
    expect(lot11.상태사유).toBe("신규 입고");
    // 이중계상 방지: 작업 정산 LOT은 동결비/입출고비/노조비/이월=0, 냉장료만
    expect(lot11.동결비).toBe(0);
    expect(lot11.입출고비).toBe(0);
    expect(lot11.노조비).toBe(0);
    expect(lot11.이월냉장료).toBe(0);
    expect(lot11.냉장료단가).toBe(1500); // 행선지 보관처 비용 이력에서

    // ── 입고관리 검증: 수매가 = 수매단가(순수 매입, 매입통계 원천) ──
    const inb11 = inboundBySpec("11")!.fields;
    const inb13 = inboundBySpec("13")!.fields;
    expect(inb11.수매가).toBe(10_000); // 실단가 아님!
    expect(inb13.수매가).toBe(8_000);
    expect(inb11.잔여수량).toBe(30);
    expect(inb11.비고).toBe("원물동결"); // 용도 태그(매입통계 세그먼트)
    expect(inb11.승인상태).toBe("승인 완료");
    expect(inb11.매입처).toEqual([SUPPLIER.id]);

    // ── 매입액 vs 재고원가 ──
    const 매입액 = 10_000 * 30 + 8_000 * 20; // 460,000 (순수 매입)
    const 재고원가합 = Number(lot11.수매가) * 30 + Number(lot13.수매가) * 20; // 960,000
    expect(매입액).toBe(460_000);
    expect(재고원가합).toBe(960_000);
    expect(재고원가합).toBe(매입액 + 500_000); // 작업비총액 흡수

    // ── 생산내역 역기록 ──
    const line11 = store
      .list("작업 정산 생산내역")
      .find((r) => String(r.fields.규격) === "11")!.fields;
    expect(line11.실단가).toBe(20_000);
    expect(line11.실금액).toBe(600_000);
    expect(Array.isArray(line11.LOT)).toBe(true);
    expect(Array.isArray(line11.입고관리)).toBe(true);
  });

  test("확정 취소 → LOT·입고관리 soft delete + 상태 취소", async () => {
    seedBase();
    const { saveWorkSettlement, confirmWorkSettlement, cancelWorkSettlement } = await import(
      "@/app/actions/admin/master-work-settlement"
    );
    const saved = await saveWorkSettlement(WORKER_ADMIN.id, saveInput);
    expect(saved.success).toBe(true);
    if (!saved.success) return;
    await confirmWorkSettlement(WORKER_ADMIN.id, saved.data.settlementId);

    // 취소는 MASTER 전용(2026-08-03) — ADMIN으로는 안 된다.
    const rc = await cancelWorkSettlement(WORKER_MASTER.id, saved.data.settlementId);
    expect(rc.success).toBe(true);

    for (const lot of store.list("LOT별 재고")) {
      expect(lot.fields.재고수량).toBe(0);
      expect(lot.fields.승인상태).toBe("취소");
    }
    for (const inb of store.list("입고 관리")) {
      expect(inb.fields.잔여수량).toBe(0);
      expect(inb.fields.승인상태).toBe("취소");
    }
    expect(store.get("작업 정산", saved.data.settlementId)!.fields.상태).toBe("취소");
  });

  test("확정 취소 가드 — 생성 재고 일부 출고 시 차단", async () => {
    seedBase();
    const { saveWorkSettlement, confirmWorkSettlement, cancelWorkSettlement } = await import(
      "@/app/actions/admin/master-work-settlement"
    );
    const saved = await saveWorkSettlement(WORKER_ADMIN.id, saveInput);
    expect(saved.success).toBe(true);
    if (!saved.success) return;
    await confirmWorkSettlement(WORKER_ADMIN.id, saved.data.settlementId);

    // 한 LOT을 일부 출고한 것처럼 재고수량 차감(입고수량과 불일치)
    const someLot = store.list("LOT별 재고")[0];
    store.patch("LOT별 재고", someLot.id, { 재고수량: 5 });

    const rc = await cancelWorkSettlement(WORKER_MASTER.id, saved.data.settlementId);
    expect(rc.success).toBe(false);
    // 헤더는 확정 유지(취소 차단)
    expect(store.get("작업 정산", saved.data.settlementId)!.fields.상태).toBe("확정");
  });

  // ── 권한 경계 (2026-08-03) ────────────────────────────────────────────────
  // 작업 정산은 전원이 같이 채우는 기록으로 열렸다. 열린 만큼 경계가 중요해져서
  // '누가 무엇을 못 하는가'를 여기서 못 박는다.
  describe("권한 경계 — 작성 전원 / 확정 관리자 / 삭제 MASTER", () => {
    test("WORKER도 작성·임시저장할 수 있다", async () => {
      seedBase();
      const { saveWorkSettlement } = await import(
        "@/app/actions/admin/master-work-settlement"
      );
      const saved = await saveWorkSettlement(WORKER_NORMAL.id, saveInput);
      expect(saved.success).toBe(true);
      if (!saved.success) return;
      const h = store.get("작업 정산", saved.data.settlementId)!.fields;
      expect(h.상태).toBe("임시저장");
      // 최초 작성자·작성일시가 남는다
      expect(h.작업자).toEqual([WORKER_NORMAL.id]);
      expect(typeof h.작성일시).toBe("string");
      expect(h.최종수정자).toEqual([WORKER_NORMAL.id]);
    });

    test("WORKER는 확정할 수 없다 (입고·LOT 미생성)", async () => {
      seedBase();
      const { saveWorkSettlement, confirmWorkSettlement } = await import(
        "@/app/actions/admin/master-work-settlement"
      );
      const saved = await saveWorkSettlement(WORKER_NORMAL.id, saveInput);
      expect(saved.success).toBe(true);
      if (!saved.success) return;

      const rc = await confirmWorkSettlement(WORKER_NORMAL.id, saved.data.settlementId);
      expect(rc.success).toBe(false);
      expect(store.get("작업 정산", saved.data.settlementId)!.fields.상태).toBe("임시저장");
      expect(store.list("LOT별 재고").length).toBe(0);
    });

    test("ADMIN은 삭제·취소할 수 없다 (MASTER 전용)", async () => {
      seedBase();
      const { saveWorkSettlement, cancelWorkSettlement } = await import(
        "@/app/actions/admin/master-work-settlement"
      );
      const saved = await saveWorkSettlement(WORKER_ADMIN.id, saveInput);
      expect(saved.success).toBe(true);
      if (!saved.success) return;

      const rc = await cancelWorkSettlement(WORKER_ADMIN.id, saved.data.settlementId);
      expect(rc.success).toBe(false);
      // 임시저장 그대로 살아 있어야 한다 — 거부인데 지워지면 최악이다.
      expect(store.get("작업 정산", saved.data.settlementId)!.fields.상태).toBe("임시저장");
    });

    test("WORKER도 삭제할 수 없다", async () => {
      seedBase();
      const { saveWorkSettlement, cancelWorkSettlement } = await import(
        "@/app/actions/admin/master-work-settlement"
      );
      const saved = await saveWorkSettlement(WORKER_NORMAL.id, saveInput);
      expect(saved.success).toBe(true);
      if (!saved.success) return;

      const rc = await cancelWorkSettlement(WORKER_NORMAL.id, saved.data.settlementId);
      expect(rc.success).toBe(false);
      expect(store.get("작업 정산", saved.data.settlementId)!.fields.상태).toBe("임시저장");
    });

    test("남이 만든 건을 다른 사람이 고쳐도 최초 작성자는 안 바뀐다", async () => {
      seedBase();
      const { saveWorkSettlement } = await import(
        "@/app/actions/admin/master-work-settlement"
      );
      const created = await saveWorkSettlement(WORKER_NORMAL.id, saveInput);
      expect(created.success).toBe(true);
      if (!created.success) return;
      const createdAt = String(
        store.get("작업 정산", created.data.settlementId)!.fields.작성일시,
      );

      // 다른 사람이 이어서 수정
      const edited = await saveWorkSettlement(WORKER_ADMIN.id, {
        ...saveInput,
        header: { ...saveInput.header, settlementId: created.data.settlementId },
      });
      expect(edited.success).toBe(true);

      const h = store.get("작업 정산", created.data.settlementId)!.fields;
      expect(h.작업자).toEqual([WORKER_NORMAL.id]); // 최초 작성자 보존
      expect(h.작성일시).toBe(createdAt); // 작성일시도 보존
      expect(h.최종수정자).toEqual([WORKER_ADMIN.id]); // 최종 수정자만 바뀐다
    });
  });
});
