import { describe, expect, test } from "vitest";
import { store } from "./airtable-store";
import { ALL_MASTERS, WORKER_ADMIN, WORKER_MASTER, WORKER_NORMAL } from "./fixtures";

/**
 * 지출 PC 직접 등록 (createExpenseDirect)
 *
 * 입고·출고·이동과 동일: 입력 관리자가 곧 결정자. createExpenseRecord(승인 대기) →
 * updateApprovalStatus("EXPENSE","승인 완료") 연쇄.
 *
 * 100만원 룰: 서버가 ≥100만원 + 비MASTER 즉시 승인을 차단 → ADMIN이 등록하면
 * '승인 대기'로 남고(committed=false), MASTER는 즉시 승인 가능.
 */

const seed = () => store.seed("사용자", ALL_MASTERS.workers);

describe("지출 PC 직접 등록", () => {
  test("commit=true, 100만원 미만 → 즉시 승인 완료 + 신청자=입력 관리자", async () => {
    seed();
    const { createExpenseDirect } = await import(
      "@/app/actions/admin/master-transactions"
    );
    const res = await createExpenseDirect({
      adminWorkerId: WORKER_ADMIN.id,
      date: "2026-05-06",
      title: "사무용품 구입",
      amount: 500_000,
      commit: true,
    });

    expect(res.success).toBe(true);
    expect(res.committed).toBe(true);

    const exp = store.list("지출결의")[0];
    expect(exp.fields.승인상태).toBe("승인 완료");
    expect(exp.fields.금액).toBe(500_000);
    expect(exp.fields.신청자).toEqual([WORKER_ADMIN.id]);
  });

  test("commit=true, 100만원 이상, ADMIN → 즉시 승인 차단 → 승인 대기", async () => {
    seed();
    const { createExpenseDirect } = await import(
      "@/app/actions/admin/master-transactions"
    );
    const res = await createExpenseDirect({
      adminWorkerId: WORKER_ADMIN.id, // ADMIN (비MASTER)
      date: "2026-05-06",
      title: "대형 비품",
      amount: 2_000_000,
      commit: true,
    });

    // 레코드는 저장되지만 즉시 승인은 안 됨
    expect(res.success).toBe(true);
    expect(res.committed).toBe(false);
    expect(store.list("지출결의")[0].fields.승인상태).toBe("승인 대기");
  });

  test("commit=true, 100만원 이상, MASTER → 즉시 승인 완료", async () => {
    seed();
    const { createExpenseDirect } = await import(
      "@/app/actions/admin/master-transactions"
    );
    const res = await createExpenseDirect({
      adminWorkerId: WORKER_MASTER.id, // MASTER
      date: "2026-05-06",
      title: "대형 비품",
      amount: 2_000_000,
      commit: true,
    });

    expect(res.success).toBe(true);
    expect(res.committed).toBe(true);
    expect(store.list("지출결의")[0].fields.승인상태).toBe("승인 완료");
  });

  test("비관리자(WORKER)는 거부 — 레코드 미생성", async () => {
    seed();
    const { createExpenseDirect } = await import(
      "@/app/actions/admin/master-transactions"
    );
    const res = await createExpenseDirect({
      adminWorkerId: WORKER_NORMAL.id,
      date: "2026-05-06",
      title: "x",
      amount: 10_000,
      commit: true,
    });

    expect(res.success).toBe(false);
    expect(store.list("지출결의")).toHaveLength(0);
  });
});
