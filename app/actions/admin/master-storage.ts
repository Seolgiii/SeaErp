"use server";

import { revalidatePath } from "next/cache";
import { logError } from "@/lib/logger";
import {
  fetchAirtable,
  createAirtableRecord,
  patchAirtableRecord,
} from "@/lib/airtable";
import { AIRTABLE_TABLE } from "@/lib/airtable-schema";
import { ensureAdmin, type Result } from "./_master-helpers";

/**
 * 보관처 마스터 (Phase 3 PC 관리 화면용) 서버 액션.
 * 2필드: 보관처명 + 구분(자사창고/외부창고/가공공장/기타).
 * 구분은 입출고증 발행 주체 분기(isOwnStorage) 기준 — 2026-05-19 신설.
 */

const TABLE_PATH = encodeURIComponent(AIRTABLE_TABLE.storageMaster);
const TAG = "master-storage";

export const STORAGE_KINDS = ["자사창고", "외부창고", "가공공장", "기타"] as const;
export type StorageKind = (typeof STORAGE_KINDS)[number] | "";

export type Storage = {
  id: string;
  name: string;
  kind: StorageKind;
};

export type StorageInput = {
  name: string;
  kind?: StorageKind;
};

function parseStorage(rec: { id: string; fields?: Record<string, unknown> }): Storage {
  const f = rec.fields ?? {};
  const rawKind = String(f["구분"] ?? "").trim();
  return {
    id: rec.id,
    name: String(f["보관처명"] ?? "").trim(),
    kind: (STORAGE_KINDS as readonly string[]).includes(rawKind)
      ? (rawKind as StorageKind)
      : "",
  };
}

function buildFields(input: StorageInput): Record<string, unknown> {
  const fields: Record<string, unknown> = { 보관처명: input.name.trim() };
  if (input.kind) fields["구분"] = input.kind;
  return fields;
}

export async function listStorages(
  adminWorkerId: string,
): Promise<Result<Storage[]>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    const items: Storage[] = [];
    let offset: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      const data = (await fetchAirtable(`${TABLE_PATH}?${params}`)) as {
        records?: { id: string; fields?: Record<string, unknown> }[];
        offset?: string;
      };
      for (const rec of data.records ?? []) items.push(parseStorage(rec));
      offset = data.offset;
    } while (offset);
    return { success: true, data: items };
  } catch (e) {
    logError(`[${TAG}] 조회 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

export async function createStorage(
  adminWorkerId: string,
  input: StorageInput,
): Promise<Result<{ id: string }>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  if (!input.name?.trim()) return { success: false, error: "보관처명은 필수입니다." };

  try {
    const { id } = await createAirtableRecord(TABLE_PATH, buildFields(input));
    revalidatePath("/admin/master/storage");
    return { success: true, data: { id } };
  } catch (e) {
    logError(`[${TAG}] 생성 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "생성 실패" };
  }
}

export async function updateStorage(
  adminWorkerId: string,
  id: string,
  input: StorageInput,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  if (!input.name?.trim()) return { success: false, error: "보관처명은 필수입니다." };

  try {
    await patchAirtableRecord(TABLE_PATH, id, buildFields(input));
    revalidatePath("/admin/master/storage");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 수정 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "수정 실패" };
  }
}

export async function deleteStorage(
  adminWorkerId: string,
  id: string,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    await fetchAirtable(`${TABLE_PATH}/${id}`, { method: "DELETE" });
    revalidatePath("/admin/master/storage");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 삭제 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "삭제 실패" };
  }
}
