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
 * 매입처 마스터 (Phase 3 PC 관리 화면용) 서버 액션.
 * 1필드(매입처명)만 — 가장 단순한 master.
 */

const TABLE_PATH = encodeURIComponent(AIRTABLE_TABLE.suppliers);
const TAG = "master-suppliers";

export type Supplier = {
  id: string;
  name: string;
};

export type SupplierInput = {
  name: string;
};

function parseSupplier(rec: { id: string; fields?: Record<string, unknown> }): Supplier {
  return {
    id: rec.id,
    name: String(rec.fields?.["매입처명"] ?? "").trim(),
  };
}

function buildFields(input: SupplierInput): Record<string, unknown> {
  return { 매입처명: input.name.trim() };
}

export async function listSuppliers(
  adminWorkerId: string,
): Promise<Result<Supplier[]>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    const items: Supplier[] = [];
    let offset: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      const data = (await fetchAirtable(`${TABLE_PATH}?${params}`)) as {
        records?: { id: string; fields?: Record<string, unknown> }[];
        offset?: string;
      };
      for (const rec of data.records ?? []) items.push(parseSupplier(rec));
      offset = data.offset;
    } while (offset);
    return { success: true, data: items };
  } catch (e) {
    logError(`[${TAG}] 조회 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

export async function createSupplier(
  adminWorkerId: string,
  input: SupplierInput,
): Promise<Result<{ id: string }>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  if (!input.name?.trim()) return { success: false, error: "매입처명은 필수입니다." };

  try {
    const { id } = await createAirtableRecord(TABLE_PATH, buildFields(input));
    revalidatePath("/admin/master/suppliers");
    return { success: true, data: { id } };
  } catch (e) {
    logError(`[${TAG}] 생성 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "생성 실패" };
  }
}

export async function updateSupplier(
  adminWorkerId: string,
  id: string,
  input: SupplierInput,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  if (!input.name?.trim()) return { success: false, error: "매입처명은 필수입니다." };

  try {
    await patchAirtableRecord(TABLE_PATH, id, buildFields(input));
    revalidatePath("/admin/master/suppliers");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 수정 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "수정 실패" };
  }
}

export async function deleteSupplier(
  adminWorkerId: string,
  id: string,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    await fetchAirtable(`${TABLE_PATH}/${id}`, { method: "DELETE" });
    revalidatePath("/admin/master/suppliers");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 삭제 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "삭제 실패" };
  }
}
