"use server";

import {
  AuthError,
  requireAdmin,
  requireMaster,
  requireWorker,
  type VerifiedWorker,
} from "@/lib/server-auth";
import { logWarn } from "@/lib/logger";

/**
 * Master 페이지 server actions 공유 헬퍼.
 * 권한 게이트 + Result type을 통일해 master-products / suppliers / storage / lots에서 재사용.
 */

export type Result<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

/** AuthError를 Result로 접는 공통 게이트. 그 외 예외는 그대로 던진다. */
async function gate(
  verify: () => Promise<VerifiedWorker>,
  tag: string,
): Promise<Result<VerifiedWorker>> {
  try {
    return { success: true, data: await verify() };
  } catch (e) {
    if (e instanceof AuthError) {
      logWarn(`[${tag}] 권한 거부:`, e.code, e.message);
      return { success: false, error: e.message };
    }
    throw e;
  }
}

/** ADMIN/MASTER 권한 게이트 — 거부 시 사용자에게 표시할 메시지를 Result로 반환. */
export async function ensureAdmin(
  workerId: string,
  tag: string,
): Promise<Result> {
  const r = await gate(() => requireAdmin(workerId), tag);
  return r.success ? { success: true, data: undefined } : r;
}

/**
 * 활성 사용자면 통과(WORKER 포함) — 권한 구분 없이 '로그인했는가'만 본다.
 *
 * 검증된 사용자를 그대로 돌려준다. 호출부가 role을 알아야 하는 경우가 있어서다
 * (작업 정산: 작성·수정은 전원, 확정은 관리자 — 한 화면 안에서 갈린다).
 */
export async function ensureWorker(
  workerId: string,
  tag: string,
): Promise<Result<VerifiedWorker>> {
  return gate(() => requireWorker(workerId), tag);
}

/**
 * MASTER 전용 게이트. ADMIN도 거부한다.
 *
 * 되돌리기 어려운 파괴적 액션에만 쓴다 — 공동 편집(전원 수정 가능) 구조에서
 * 삭제까지 열어두면 남의 기록이 조용히 사라진다.
 */
export async function ensureMaster(
  workerId: string,
  tag: string,
): Promise<Result> {
  const r = await gate(() => requireMaster(workerId), tag);
  return r.success ? { success: true, data: undefined } : r;
}
