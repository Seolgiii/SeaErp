import { describe, expect, test, vi } from 'vitest';
import { runBulkSubmit, type BulkSubmitItem } from './bulk-submit';

/**
 * runBulkSubmit 정책 단위 테스트 — Step 0(출고 묶음 신청 B안)의 client 동작 회귀 안전망.
 *
 * 배경: test/integration/outbound-bulk-policy.test.ts 는 서버 액션을 루프로 호출해
 * "서버가 부분 성공을 견딘다"만 검증한다. 정작 client가 cart를 끝까지 순회하는지
 * (= A안 abort로 회귀하지 않았는지)는 그 테스트가 잡지 못한다. 본 테스트가 그 공백을 메운다.
 */

function item(cartId: string, lotNumber = `LOT-${cartId}`): BulkSubmitItem {
  return { cartId, lotNumber };
}

describe('runBulkSubmit — 묶음 제출 정책 (B안: 부분 성공 허용)', () => {
  test('전체 성공: 모든 cartId가 success, 실패 0', async () => {
    const items = [item('a'), item('b'), item('c')];
    const submit = vi.fn(async () => ({ success: true }));

    const result = await runBulkSubmit(items, submit);

    expect(result.successCartIds).toEqual(['a', 'b', 'c']);
    expect(result.failures).toEqual([]);
    expect(submit).toHaveBeenCalledTimes(3);
  });

  test('★회귀 가드 — 첫 항목이 실패해도 나머지를 끝까지 시도 (A안 abort 차단)', async () => {
    const items = [item('a'), item('b'), item('c')];
    const submit = vi.fn(async (it: BulkSubmitItem) =>
      it.cartId === 'a' ? { success: false, error: '잔여수량 부족' } : { success: true },
    );

    const result = await runBulkSubmit(items, submit);

    // 핵심: 첫 실패에서 멈추지 않고 3건 모두 호출되어야 한다.
    // 누군가 루프에 early return을 넣어 A안으로 되돌리면 이 단언이 깨진다.
    expect(submit).toHaveBeenCalledTimes(3);
    expect(result.successCartIds).toEqual(['b', 'c']);
    expect(result.failures).toEqual([
      { cartId: 'a', lotNumber: 'LOT-a', reason: '잔여수량 부족' },
    ]);
  });

  test('중간 실패: 성공/실패가 입력 순서대로 분리되고 전건 시도', async () => {
    const items = [item('a'), item('b'), item('c'), item('d'), item('e')];
    const submit = vi.fn(async (it: BulkSubmitItem) =>
      it.cartId === 'c' ? { success: false, error: '잔여수량 부족' } : { success: true },
    );

    const result = await runBulkSubmit(items, submit);

    expect(submit).toHaveBeenCalledTimes(5);
    expect(result.successCartIds).toEqual(['a', 'b', 'd', 'e']);
    expect(result.failures.map((f) => f.cartId)).toEqual(['c']);
  });

  test('전체 실패: success 0, 모든 항목이 failures (순서 보존)', async () => {
    const items = [item('a'), item('b')];
    const submit = vi.fn(async () => ({ success: false, error: '잔여수량 부족' }));

    const result = await runBulkSubmit(items, submit);

    expect(result.successCartIds).toEqual([]);
    expect(result.failures.map((f) => f.cartId)).toEqual(['a', 'b']);
  });

  test("error 메시지 없는 실패는 '알 수 없는 오류'로 채운다", async () => {
    const submit = vi.fn(async () => ({ success: false }));

    const result = await runBulkSubmit([item('a')], submit);

    expect(result.failures[0].reason).toBe('알 수 없는 오류');
  });

  test('빈 cart: 둘 다 빈 배열이고 submit은 호출되지 않는다', async () => {
    const submit = vi.fn(async () => ({ success: true }));

    const result = await runBulkSubmit([], submit);

    expect(result.successCartIds).toEqual([]);
    expect(result.failures).toEqual([]);
    expect(submit).not.toHaveBeenCalled();
  });
});
