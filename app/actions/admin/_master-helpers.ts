"use server";

import { AuthError, requireAdmin } from "@/lib/server-auth";
import { logWarn } from "@/lib/logger";

/**
 * Master 페이지 server actions 공유 헬퍼.
 * 권한 게이트 + Result type을 통일해 master-products / suppliers / storage / lots에서 재사용.
 */

export type Result<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

/** ADMIN/MASTER 권한 게이트 — 거부 시 사용자에게 표시할 메시지를 Result로 반환. */
export async function ensureAdmin(
  workerId: string,
  tag: string,
): Promise<Result> {
  try {
    await requireAdmin(workerId);
    return { success: true, data: undefined };
  } catch (e) {
    if (e instanceof AuthError) {
      logWarn(`[${tag}] 권한 거부:`, e.code, e.message);
      return { success: false, error: e.message };
    }
    throw e;
  }
}
