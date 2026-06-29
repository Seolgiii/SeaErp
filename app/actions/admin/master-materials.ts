"use server";

import { revalidatePath } from "next/cache";
import { logError } from "@/lib/logger";
import {
  fetchAirtable,
  createAirtableRecord,
  patchAirtableRecord,
} from "@/lib/airtable";
import { AIRTABLE_TABLE } from "@/lib/airtable-schema";
import { MATERIAL_SECTIONS, type MaterialSection } from "@/lib/material-sections";
import { ensureAdmin, type Result } from "./_master-helpers";

/**
 * 부자재·경비 마스터 (판매원가 산정용) 서버 액션.
 *
 * 4개 고정 섹션(분류 singleSelect: 아이스팩/박스/내피/진공팩) + 행 자유 추가.
 * 단가는 박스당 원가 기준 — Phase 2에서 박스당 재고원가에 합산해 판매원가 도출.
 */

const TABLE_PATH = encodeURIComponent(AIRTABLE_TABLE.materials);
const TAG = "master-materials";

export type Material = {
  id: string;
  section: MaterialSection | "";
  name: string;
  price: number; // 박스당 원가(원)
  unit: string;
  active: boolean;
  memo: string;
};

export type MaterialInput = {
  section: MaterialSection;
  name: string;
  price: number;
  unit?: string;
  active?: boolean;
  memo?: string;
};

/** singleSelect는 {id,name} 객체로 오므로 name만 추출. */
function selectName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) {
    return String((v as { name: unknown }).name ?? "").trim();
  }
  return String(v ?? "").trim();
}

function parseMaterial(rec: { id: string; fields?: Record<string, unknown> }): Material {
  const f = rec.fields ?? {};
  const section = selectName(f["분류"]);
  return {
    id: rec.id,
    section: (MATERIAL_SECTIONS as readonly string[]).includes(section)
      ? (section as MaterialSection)
      : "",
    name: String(f["품명"] ?? "").trim(),
    price: Number(f["단가"]) || 0,
    unit: String(f["단위"] ?? "").trim(),
    active: f["활성"] === true,
    memo: String(f["비고"] ?? "").trim(),
  };
}

function buildFields(input: MaterialInput): Record<string, unknown> {
  return {
    분류: input.section, // singleSelect — 옵션명 문자열 그대로
    품명: input.name.trim(),
    단가: Number(input.price) || 0,
    단위: (input.unit ?? "박스당").trim(),
    활성: input.active ?? true,
    비고: (input.memo ?? "").trim(),
  };
}

function validate(input: MaterialInput): string | null {
  if (!(MATERIAL_SECTIONS as readonly string[]).includes(input.section)) {
    return "분류가 올바르지 않습니다.";
  }
  if (!input.name?.trim()) return "품명은 필수입니다.";
  if (!Number.isFinite(Number(input.price)) || Number(input.price) < 0) {
    return "단가를 올바르게 입력하세요.";
  }
  return null;
}

export async function listMaterials(
  adminWorkerId: string,
): Promise<Result<Material[]>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    const items: Material[] = [];
    let offset: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      const data = (await fetchAirtable(`${TABLE_PATH}?${params}`)) as {
        records?: { id: string; fields?: Record<string, unknown> }[];
        offset?: string;
      };
      for (const rec of data.records ?? []) items.push(parseMaterial(rec));
      offset = data.offset;
    } while (offset);
    return { success: true, data: items };
  } catch (e) {
    logError(`[${TAG}] 조회 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

export async function createMaterial(
  adminWorkerId: string,
  input: MaterialInput,
): Promise<Result<{ id: string }>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  const err = validate(input);
  if (err) return { success: false, error: err };

  try {
    const { id } = await createAirtableRecord(TABLE_PATH, buildFields(input));
    revalidatePath("/admin/master/materials");
    return { success: true, data: { id } };
  } catch (e) {
    logError(`[${TAG}] 생성 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "생성 실패" };
  }
}

export async function updateMaterial(
  adminWorkerId: string,
  id: string,
  input: MaterialInput,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  const err = validate(input);
  if (err) return { success: false, error: err };

  try {
    await patchAirtableRecord(TABLE_PATH, id, buildFields(input));
    revalidatePath("/admin/master/materials");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 수정 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "수정 실패" };
  }
}

export async function deleteMaterial(
  adminWorkerId: string,
  id: string,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    await fetchAirtable(`${TABLE_PATH}/${id}`, { method: "DELETE" });
    revalidatePath("/admin/master/materials");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 삭제 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "삭제 실패" };
  }
}
