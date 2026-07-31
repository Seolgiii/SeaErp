"use server";

import { revalidatePath } from "next/cache";
import { logError } from "@/lib/logger";
import {
  fetchAirtable,
  createAirtableRecord,
  patchAirtableRecord,
  getAirtableRecord,
  getWorkersTablePath,
} from "@/lib/airtable";
import { WORKER_FIELDS } from "@/lib/airtable-schema";
import { hashPin } from "@/lib/pin-hash";
import {
  AuthError,
  invalidateWorkerCache,
  requireAdmin,
} from "@/lib/server-auth";
import { ensureAdmin, type Result } from "./_master-helpers";

/**
 * 작업자 마스터 (Phase 3 PC 관리 화면용) 서버 액션.
 *
 * 보안 정책:
 *  - PIN 입력은 평문으로 받고 즉시 hashPin → pin_hash에 저장. 평문 PIN 필드는 비움.
 *  - 자기 자신의 권한 강등·비활성·삭제 차단 (시스템 잠김 방지).
 *  - 마지막 활성 MASTER의 강등·비활성·삭제 차단 (모든 MASTER 사라지면 권한 변경 불가).
 *  - 모든 액션은 requireAdmin (ADMIN/MASTER) 권한 재검증.
 *  - hard delete는 link 무결성 위험 → 비활성 토글 우선. delete는 명시적 옵션.
 */

const TAG = "master-workers";
const PIN_HASH_FIELD = "pin_hash";
const PIN_FAIL_COUNT_FIELD = "pin_fail_count";
const PIN_LOCKED_UNTIL_FIELD = "pin_locked_until";

export type WorkerRole = "WORKER" | "ADMIN" | "MASTER";

export type Worker = {
  id: string;
  name: string;
  role: WorkerRole;
  active: boolean;
  hasHashedPin: boolean;
  hasPlainPin: boolean;
  pinFailCount: number;
  pinLockedUntil: number;
  isLocked: boolean;
  // 인사 정보 (2026-07-31 추가)
  affiliation: string;
  position: string;
  hireDate: string;
  birthDate: string;
  terminationDate: string;
  phone: string;
  emergencyPhone: string;
  memo: string;
};

export type WorkerInput = {
  name: string;
  role: WorkerRole;
  active: boolean;
  affiliation?: string;
  position?: string;
  hireDate?: string;
  birthDate?: string;
  terminationDate?: string;
  phone?: string;
  emergencyPhone?: string;
  memo?: string;
};

export type CreateWorkerInput = WorkerInput & {
  pin: string;
};

const ROLE_VALUES: readonly WorkerRole[] = ["WORKER", "ADMIN", "MASTER"];

function isActiveValue(v: unknown): boolean {
  return v === 1 || v === true || v === "1" || String(v).toLowerCase() === "true";
}

function parseWorker(rec: { id: string; fields?: Record<string, unknown> }): Worker {
  const f = rec.fields ?? {};
  const rawRole = String(f[WORKER_FIELDS.role] ?? "WORKER").trim().toUpperCase();
  const role: WorkerRole = (ROLE_VALUES as readonly string[]).includes(rawRole)
    ? (rawRole as WorkerRole)
    : "WORKER";
  const pinHash = String(f[PIN_HASH_FIELD] ?? "").trim();
  const pinPlain = String(f[WORKER_FIELDS.pin] ?? "").trim();
  const failCount = Number(f[PIN_FAIL_COUNT_FIELD] ?? 0) || 0;
  const lockedUntil = Number(f[PIN_LOCKED_UNTIL_FIELD] ?? 0) || 0;
  return {
    id: rec.id,
    name: String(f[WORKER_FIELDS.name] ?? "").trim(),
    role,
    active: isActiveValue(f[WORKER_FIELDS.active]),
    hasHashedPin: pinHash.startsWith("scrypt:"),
    hasPlainPin: pinPlain.length > 0,
    pinFailCount: failCount,
    pinLockedUntil: lockedUntil,
    isLocked: lockedUntil > Date.now(),
    affiliation: String(f[WORKER_FIELDS.affiliation] ?? "").trim(),
    position: String(f[WORKER_FIELDS.position] ?? "").trim(),
    hireDate: String(f[WORKER_FIELDS.hireDate] ?? "").trim(),
    birthDate: String(f[WORKER_FIELDS.birthDate] ?? "").trim(),
    terminationDate: String(f[WORKER_FIELDS.terminationDate] ?? "").trim(),
    phone: String(f[WORKER_FIELDS.phone] ?? "").trim(),
    emergencyPhone: String(f[WORKER_FIELDS.emergencyPhone] ?? "").trim(),
    memo: String(f[WORKER_FIELDS.memo] ?? "").trim(),
  };
}

/** 인사 정보 필드를 Airtable PATCH/생성 payload로 변환. select·date는 빈 값이면 null(클리어), 나머지는 빈 문자열 허용. */
function hrFields(input: WorkerInput): Record<string, unknown> {
  return {
    [WORKER_FIELDS.affiliation]: input.affiliation?.trim() || null,
    [WORKER_FIELDS.position]: input.position?.trim() || null,
    [WORKER_FIELDS.hireDate]: input.hireDate?.trim() || null,
    [WORKER_FIELDS.birthDate]: input.birthDate?.trim() || null,
    [WORKER_FIELDS.terminationDate]: input.terminationDate?.trim() || null,
    [WORKER_FIELDS.phone]: input.phone?.trim() ?? "",
    [WORKER_FIELDS.emergencyPhone]: input.emergencyPhone?.trim() ?? "",
    [WORKER_FIELDS.memo]: input.memo?.trim() ?? "",
  };
}

function validatePin(pin: string): string | null {
  const digits = pin.replace(/\D/g, "");
  if (digits.length !== 4) return "PIN은 숫자 4자리여야 합니다.";
  return null;
}

function validateName(name: string): string | null {
  const n = name.trim();
  if (!n) return "작업자명은 필수입니다.";
  if (n.length > 30) return "작업자명은 30자 이하여야 합니다.";
  return null;
}

async function listAllWorkers(): Promise<Worker[]> {
  const table = getWorkersTablePath();
  const items: Worker[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    const data = (await fetchAirtable(`${table}?${params}`)) as {
      records?: { id: string; fields?: Record<string, unknown> }[];
      offset?: string;
    };
    for (const rec of data.records ?? []) items.push(parseWorker(rec));
    offset = data.offset;
  } while (offset);
  return items;
}

/**
 * 본인이 본인을 위험하게 변경하려는지 또는 마지막 활성 MASTER를 잃을 위험이 있는지 검사.
 * targetId의 다음 상태(nextRole, nextActive)로 가는 것이 안전한지 확인.
 */
async function ensureSafeMutation(args: {
  adminWorkerId: string;
  targetId: string;
  intent: "update" | "delete";
  nextRole?: WorkerRole;
  nextActive?: boolean;
}): Promise<string | null> {
  const { adminWorkerId, targetId, intent, nextRole, nextActive } = args;

  if (adminWorkerId === targetId) {
    if (intent === "delete") return "본인 계정은 삭제할 수 없습니다.";
    if (nextActive === false) return "본인 계정은 비활성으로 바꿀 수 없습니다.";
    if (nextRole && nextRole !== "MASTER") {
      // 본인의 MASTER 권한을 다른 권한으로 내리려는 경우 차단 (권한 잠금 방지)
      const me = await getAirtableRecord(getWorkersTablePath(), adminWorkerId);
      const myRole = String(me.fields?.[WORKER_FIELDS.role] ?? "")
        .trim()
        .toUpperCase();
      if (myRole === "MASTER") {
        return "본인의 MASTER 권한은 다른 MASTER가 변경해야 합니다.";
      }
    }
  }

  const goingAway =
    intent === "delete" ||
    nextActive === false ||
    (nextRole !== undefined && nextRole !== "MASTER");
  if (!goingAway) return null;

  const all = await listAllWorkers();
  const target = all.find((w) => w.id === targetId);
  if (!target) return null;
  if (target.role !== "MASTER") return null;
  if (!target.active && intent !== "delete") return null;

  const otherActiveMasters = all.filter(
    (w) => w.id !== targetId && w.active && w.role === "MASTER",
  );
  if (otherActiveMasters.length === 0) {
    return "마지막 활성 MASTER입니다. 다른 작업자에게 MASTER 권한을 먼저 부여하세요.";
  }
  return null;
}

export async function listWorkers(
  adminWorkerId: string,
): Promise<Result<Worker[]>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  try {
    return { success: true, data: await listAllWorkers() };
  } catch (e) {
    logError(`[${TAG}] 조회 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

export async function createWorker(
  adminWorkerId: string,
  input: CreateWorkerInput,
): Promise<Result<{ id: string }>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  const nameErr = validateName(input.name);
  if (nameErr) return { success: false, error: nameErr };
  if (!(ROLE_VALUES as readonly string[]).includes(input.role)) {
    return { success: false, error: "권한 값이 올바르지 않습니다." };
  }
  const pinErr = validatePin(input.pin);
  if (pinErr) return { success: false, error: pinErr };

  try {
    const pinHash = await hashPin(input.pin.replace(/\D/g, ""));
    const { id } = await createAirtableRecord(getWorkersTablePath(), {
      [WORKER_FIELDS.name]: input.name.trim(),
      [WORKER_FIELDS.role]: input.role,
      [WORKER_FIELDS.active]: input.active,
      [PIN_HASH_FIELD]: pinHash,
      [PIN_FAIL_COUNT_FIELD]: 0,
      [PIN_LOCKED_UNTIL_FIELD]: 0,
      ...hrFields(input),
    });
    revalidatePath("/admin/master/workers");
    return { success: true, data: { id } };
  } catch (e) {
    logError(`[${TAG}] 생성 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "생성 실패" };
  }
}

export async function updateWorker(
  adminWorkerId: string,
  id: string,
  input: WorkerInput,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  const nameErr = validateName(input.name);
  if (nameErr) return { success: false, error: nameErr };
  if (!(ROLE_VALUES as readonly string[]).includes(input.role)) {
    return { success: false, error: "권한 값이 올바르지 않습니다." };
  }

  const guard = await ensureSafeMutation({
    adminWorkerId,
    targetId: id,
    intent: "update",
    nextRole: input.role,
    nextActive: input.active,
  });
  if (guard) return { success: false, error: guard };

  try {
    await patchAirtableRecord(getWorkersTablePath(), id, {
      [WORKER_FIELDS.name]: input.name.trim(),
      [WORKER_FIELDS.role]: input.role,
      [WORKER_FIELDS.active]: input.active,
      ...hrFields(input),
    });
    invalidateWorkerCache(id);
    revalidatePath("/admin/master/workers");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 수정 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "수정 실패" };
  }
}

export async function resetWorkerPin(
  adminWorkerId: string,
  id: string,
  newPin: string,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  const pinErr = validatePin(newPin);
  if (pinErr) return { success: false, error: pinErr };

  try {
    const pinHash = await hashPin(newPin.replace(/\D/g, ""));
    await patchAirtableRecord(getWorkersTablePath(), id, {
      [PIN_HASH_FIELD]: pinHash,
      [WORKER_FIELDS.pin]: "",
      [PIN_FAIL_COUNT_FIELD]: 0,
      [PIN_LOCKED_UNTIL_FIELD]: 0,
    });
    invalidateWorkerCache(id);
    revalidatePath("/admin/master/workers");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] PIN 재설정 실패:`, e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "PIN 재설정 실패",
    };
  }
}

export async function unlockWorkerPin(
  adminWorkerId: string,
  id: string,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    await patchAirtableRecord(getWorkersTablePath(), id, {
      [PIN_FAIL_COUNT_FIELD]: 0,
      [PIN_LOCKED_UNTIL_FIELD]: 0,
    });
    invalidateWorkerCache(id);
    revalidatePath("/admin/master/workers");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 잠금 해제 실패:`, e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "잠금 해제 실패",
    };
  }
}

export async function deleteWorker(
  adminWorkerId: string,
  id: string,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  const guard = await ensureSafeMutation({
    adminWorkerId,
    targetId: id,
    intent: "delete",
  });
  if (guard) return { success: false, error: guard };

  try {
    await fetchAirtable(`${getWorkersTablePath()}/${id}`, { method: "DELETE" });
    invalidateWorkerCache(id);
    revalidatePath("/admin/master/workers");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 삭제 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "삭제 실패" };
  }
}

/**
 * 현재 로그인된 작업자가 본인 자신을 식별할 수 있도록 verified worker ID를 반환.
 * UI에서 본인 행에 "본인" 배지를 표시하고 위험 액션을 disable하기 위함.
 */
export async function getMyVerifiedId(
  adminWorkerId: string,
): Promise<Result<{ id: string; role: WorkerRole }>> {
  try {
    const me = await requireAdmin(adminWorkerId);
    return { success: true, data: { id: me.id, role: me.role } };
  } catch (e) {
    if (e instanceof AuthError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}
