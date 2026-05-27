/**
 * 묶음(cart) 제출 정책 — B안 (부분 성공 허용).
 *
 * 결정 노트: obsidian-vault/40_결정기록/출고이동_카트_UX_통일.md
 *
 * cart 전체를 끝까지 순회하며 각 항목을 제출한다. 중간 항목이 실패해도
 * abort 하지 않고 나머지를 계속 시도하며, 성공/실패를 입력 순서대로 분리해 반환한다.
 *
 * ⚠ 핵심 정책: 중간 실패 시 early return(abort) 금지.
 *    A안(첫 실패에서 멈춤)으로 되돌리면 이미 처리된 건이 사용자에게 고지되지
 *    않아 중복 신청 → 중복 차감 위험이 생긴다. 회귀 시 lib/bulk-submit.test.ts 가 잡는다.
 *
 * client(app/inventory/outbound/page.tsx)의 handleSubmitAll에서 호출.
 * React 의존이 없는 순수 함수라 단위 테스트로 정책 자체를 직접 검증할 수 있다.
 */

export type BulkSubmitOutcome = { success: boolean; error?: string };

export type BulkSubmitItem = {
  cartId: string;
  lotNumber: string;
};

export type BulkSubmitResult = {
  successCartIds: string[];
  failures: { cartId: string; lotNumber: string; reason: string }[];
};

/**
 * items를 끝까지 순회하며 submit을 호출해 성공/실패를 분리 누적한다.
 * @param items   cartId·lotNumber를 가진 항목들 (그 외 필드는 submit 콜백이 사용)
 * @param submit  항목 1건을 제출하고 성공 여부를 반환하는 비동기 함수
 */
export async function runBulkSubmit<T extends BulkSubmitItem>(
  items: readonly T[],
  submit: (item: T) => Promise<BulkSubmitOutcome>,
): Promise<BulkSubmitResult> {
  const successCartIds: string[] = [];
  const failures: BulkSubmitResult['failures'] = [];

  for (const item of items) {
    const result = await submit(item);
    if (result.success) {
      successCartIds.push(item.cartId);
    } else {
      failures.push({
        cartId: item.cartId,
        lotNumber: item.lotNumber,
        reason: result.error ?? '알 수 없는 오류',
      });
    }
  }

  return { successCartIds, failures };
}
