import { describe, expect, test } from "vitest";
import { store } from "./airtable-store";
import {
  ALL_MASTERS,
  PRODUCT_MACKEREL,
  STORAGE_HANRIM,
  WORKER_ADMIN,
  WORKER_NORMAL,
} from "./fixtures";

/**
 * 입고 PC 직접 등록 (createInboundDirect)
 *
 * 모바일(작업자 신청 → 관리자 승인 2단계)과 달리, PC 입력자는 이미 승인 권한자다.
 * createInboundDirect는 기존 두 함수(createInventoryRecord + updateApprovalStatus)를
 * 이어 호출해 "입력 = 즉시 커밋"을 구현한다. 신규 도메인 로직 없음.
 *
 * 검증 포인트:
 *   1. commit=true  → 입고 관리 승인 완료 + LOT 재고 반영 + 매입자 분리(작업자≠매입자)
 *   2. commit=false → 승인 대기로만 저장(LOT 재고 0) + 매입자 폴백(=입력자)
 *   3. 비관리자(WORKER) → 게이트 차단(레코드 미생성)
 */

const seedMasters = () => {
  store.seed("사용자", ALL_MASTERS.workers);
  store.seed("품목마스터", ALL_MASTERS.products);
  store.seed("보관처 마스터", ALL_MASTERS.storages);
  store.seed("보관처 비용 이력", ALL_MASTERS.storageCosts);
};

describe("입고 PC 직접 등록", () => {
  test("commit=true → 즉시 승인 완료 + LOT 재고 반영 + 매입자 분리", async () => {
    seedMasters();

    const { createInboundDirect } = await import(
      "@/app/actions/admin/master-transactions"
    );
    const res = await createInboundDirect({
      adminWorkerId: WORKER_ADMIN.id, // 입력자 = 관리자
      매입자RecordId: WORKER_NORMAL.id, // 매입자 = 다른 사람
      품목명: PRODUCT_MACKEREL.fields.품목명 as string,
      입고일자: "2026-05-06",
      규격: "11",
      미수: "26",
      "입고수량(BOX)": 80,
      수매가: 40000,
      storageRecordId: STORAGE_HANRIM.id,
      commit: true,
    });

    expect(res.success).toBe(true);
    expect(res.committed).toBe(true);
    expect(res.lotNumber).toMatch(/^\d{6}-MC1-11-26-\d{4}$/);

    // 입고 관리 — 승인 완료 + 작업자/매입자 분리
    const inbound = store.list("입고 관리")[0];
    expect(inbound.fields.승인상태).toBe("승인 완료");
    expect(inbound.fields.작업자).toEqual([WORKER_ADMIN.id]);
    expect(inbound.fields.매입자).toEqual([WORKER_NORMAL.id]);

    // LOT — 재고수량이 입고수량으로 채워짐(커밋의 부수효과)
    const lot = store.list("LOT별 재고")[0];
    expect(lot.fields.재고수량).toBe(80);
  });

  test("commit=false → 승인 대기로만 저장(LOT 재고 0) + 매입자 폴백", async () => {
    seedMasters();

    const { createInboundDirect } = await import(
      "@/app/actions/admin/master-transactions"
    );
    const res = await createInboundDirect({
      adminWorkerId: WORKER_ADMIN.id,
      품목명: PRODUCT_MACKEREL.fields.품목명 as string,
      입고일자: "2026-05-06",
      규격: "11",
      미수: "26",
      "입고수량(BOX)": 50,
      commit: false,
    });

    expect(res.success).toBe(true);
    expect(res.committed).toBe(false);

    const inbound = store.list("입고 관리")[0];
    expect(inbound.fields.승인상태).toBe("승인 대기");
    // 매입자RecordId 미지정 → 입력 관리자로 폴백
    expect(inbound.fields.매입자).toEqual([WORKER_ADMIN.id]);

    const lot = store.list("LOT별 재고")[0];
    expect(lot.fields.재고수량).toBe(0);
  });

  test("비관리자(WORKER)는 거부 — 레코드 미생성", async () => {
    seedMasters();

    const { createInboundDirect } = await import(
      "@/app/actions/admin/master-transactions"
    );
    const res = await createInboundDirect({
      adminWorkerId: WORKER_NORMAL.id, // WORKER 권한
      품목명: PRODUCT_MACKEREL.fields.품목명 as string,
      입고일자: "2026-05-06",
      "입고수량(BOX)": 10,
      commit: true,
    });

    expect(res.success).toBe(false);
    expect(res.committed).toBe(false);
    // 게이트가 create 이전에 차단 → 입고 관리/LOT 레코드가 없어야 함
    expect(store.list("입고 관리")).toHaveLength(0);
    expect(store.list("LOT별 재고")).toHaveLength(0);
  });

  test("마스터에 없는 품목은 인라인 생성 없이 거부", async () => {
    seedMasters();

    const { createInboundDirect } = await import(
      "@/app/actions/admin/master-transactions"
    );
    const res = await createInboundDirect({
      adminWorkerId: WORKER_ADMIN.id,
      품목명: "존재하지않는품목XYZ", // 품목마스터에 없음
      입고일자: "2026-05-06",
      "입고수량(BOX)": 10,
      commit: true,
    });

    expect(res.success).toBe(false);
    // 품목마스터가 새로 생기지 않아야 함 (seed된 1건 그대로) + 입고/LOT 미생성
    expect(store.list("품목마스터")).toHaveLength(1);
    expect(store.list("입고 관리")).toHaveLength(0);
    expect(store.list("LOT별 재고")).toHaveLength(0);
  });
});
