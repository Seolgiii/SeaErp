"use server";

import { revalidatePath } from "next/cache";
import { logError } from "@/lib/logger";
import {
  fetchAirtable,
  createAirtableRecord,
  patchAirtableRecord,
} from "@/lib/airtable";
import { AIRTABLE_TABLE } from "@/lib/airtable-schema";
import { RATE_BASES, type RateBasis } from "@/lib/processing-rate-basis";
import { ensureAdmin, type Result } from "./_master-helpers";

/**
 * 가공비 단가 마스터 서버 액션.
 *
 * 가공공장(보관처 마스터, 구분=가공공장) × 가공품(품목마스터, 품목구분=필렛)별
 * 임가공 단가표. 보관처 비용 이력 패턴 — 적용기간으로 시세 변동 흡수(종료일 빈값=현재).
 * 기준: ONE-Frozen=투입kg당 / TWO-Frozen=산출kg당.
 * 가공 거래(추후)에서 공장+가공품으로 현재 적용 단가 자동 조회에 사용.
 */

const TABLE_PATH = encodeURIComponent(AIRTABLE_TABLE.processingRates);
const TAG = "master-processing-rates";

export type ProcessingRate = {
  id: string;
  factoryId: string;
  factoryName: string;
  productId: string;
  price: number; // 원, '기준' 단위당
  basis: RateBasis | "";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD, 빈값=현재 적용
  memo: string;
};

export type ProcessingRateInput = {
  factoryId: string;
  factoryName: string;
  productId: string;
  price: number;
  basis: RateBasis;
  startDate: string;
  endDate?: string;
  memo?: string;
};

/** singleSelect는 {id,name} 객체로 옴 → name만 추출. */
function selectName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) {
    return String((v as { name: unknown }).name ?? "").trim();
  }
  return String(v ?? "").trim();
}

/** 링크 필드는 record ID 배열 → 첫 ID(단일 운용). */
function firstLinkId(v: unknown): string {
  return Array.isArray(v) && v.length > 0 ? String(v[0]) : "";
}

function parseRate(rec: { id: string; fields?: Record<string, unknown> }): ProcessingRate {
  const f = rec.fields ?? {};
  const basis = selectName(f["기준"]);
  return {
    id: rec.id,
    factoryId: firstLinkId(f["가공공장"]),
    factoryName: String(f["가공공장명"] ?? "").trim(),
    productId: firstLinkId(f["가공품"]),
    price: Number(f["단가"]) || 0,
    basis: (RATE_BASES as readonly string[]).includes(basis) ? (basis as RateBasis) : "",
    startDate: String(f["적용시작일"] ?? "").trim(),
    endDate: String(f["적용종료일"] ?? "").trim(),
    memo: String(f["비고"] ?? "").trim(),
  };
}

function buildFields(input: ProcessingRateInput): Record<string, unknown> {
  return {
    가공공장: input.factoryId ? [input.factoryId] : [],
    가공공장명: (input.factoryName ?? "").trim(),
    가공품: input.productId ? [input.productId] : [],
    단가: Number(input.price) || 0,
    기준: input.basis, // singleSelect — 옵션명 문자열 그대로
    적용시작일: input.startDate || null,
    적용종료일: input.endDate ? input.endDate : null, // 빈값 → 종료일 클리어(현재 적용)
    비고: (input.memo ?? "").trim(),
  };
}

function validate(input: ProcessingRateInput): string | null {
  if (!input.factoryId) return "가공공장을 선택하세요.";
  if (!input.productId) return "가공품을 선택하세요.";
  if (!(RATE_BASES as readonly string[]).includes(input.basis)) return "기준을 선택하세요.";
  if (!Number.isFinite(Number(input.price)) || Number(input.price) < 0) {
    return "단가를 올바르게 입력하세요.";
  }
  if (!input.startDate) return "적용시작일을 입력하세요.";
  if (input.endDate && input.endDate < input.startDate) {
    return "적용종료일은 시작일 이후여야 합니다.";
  }
  return null;
}

export async function listProcessingRates(
  adminWorkerId: string,
): Promise<Result<ProcessingRate[]>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    const items: ProcessingRate[] = [];
    let offset: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      const data = (await fetchAirtable(`${TABLE_PATH}?${params}`)) as {
        records?: { id: string; fields?: Record<string, unknown> }[];
        offset?: string;
      };
      for (const rec of data.records ?? []) items.push(parseRate(rec));
      offset = data.offset;
    } while (offset);
    return { success: true, data: items };
  } catch (e) {
    logError(`[${TAG}] 조회 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

export async function createProcessingRate(
  adminWorkerId: string,
  input: ProcessingRateInput,
): Promise<Result<{ id: string }>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  const err = validate(input);
  if (err) return { success: false, error: err };

  try {
    const { id } = await createAirtableRecord(TABLE_PATH, buildFields(input));
    revalidatePath("/admin/master/processing-rates");
    return { success: true, data: { id } };
  } catch (e) {
    logError(`[${TAG}] 생성 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "생성 실패" };
  }
}

export async function updateProcessingRate(
  adminWorkerId: string,
  id: string,
  input: ProcessingRateInput,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };
  const err = validate(input);
  if (err) return { success: false, error: err };

  try {
    await patchAirtableRecord(TABLE_PATH, id, buildFields(input));
    revalidatePath("/admin/master/processing-rates");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 수정 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "수정 실패" };
  }
}

export async function deleteProcessingRate(
  adminWorkerId: string,
  id: string,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    await fetchAirtable(`${TABLE_PATH}/${id}`, { method: "DELETE" });
    revalidatePath("/admin/master/processing-rates");
    return { success: true, data: undefined };
  } catch (e) {
    logError(`[${TAG}] 삭제 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "삭제 실패" };
  }
}
