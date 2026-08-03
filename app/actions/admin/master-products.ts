"use server";

import { revalidatePath } from "next/cache";
import { logError, logWarn } from "@/lib/logger";
import { AuthError, requireAdmin } from "@/lib/server-auth";
import {
  fetchAirtable,
  createAirtableRecord,
  patchAirtableRecord,
} from "@/lib/airtable";
import { AIRTABLE_TABLE } from "@/lib/airtable-schema";
import { ensureWorker } from "./_master-helpers";

/**
 * 제품 마스터 (Phase 3 PC 관리 화면용) 서버 액션.
 * - listProducts: 전체 조회 (페이지네이션)
 * - createProduct / updateProduct / deleteProduct: 단건 CRUD
 *
 * 모든 액션은 requireAdmin으로 ADMIN/MASTER 권한 재검증.
 * Airtable 필드명은 운영 베이스 기준 직접 문자열 사용 (PRODUCT_FIELDS는 일부 stale).
 */

const TABLE_PATH = encodeURIComponent(AIRTABLE_TABLE.products);

export type Product = {
  id: string;
  name: string;
  code: string;
  category: string;
  spec: string;
  detailSpec: string;
  origin: string;
};

export type ProductInput = {
  name: string;
  code?: string;
  category?: string;
  spec?: string;
  detailSpec?: string;
  origin?: string;
};

type Result<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function parseProduct(rec: { id: string; fields?: Record<string, unknown> }): Product {
  const f = rec.fields ?? {};
  const str = (v: unknown) => String(v ?? "").trim();
  return {
    id: rec.id,
    name: str(f["품목명"]),
    code: str(f["품목코드"]),
    category: str(f["품목구분"]),
    spec: str(f["권장표기"]),
    detailSpec: str(f["상세규격_표기"]),
    origin: str(f["원산지"]),
  };
}

function buildFields(input: ProductInput): Record<string, unknown> {
  const fields: Record<string, unknown> = { 품목명: input.name.trim() };
  if (input.code?.trim()) fields["품목코드"] = input.code.trim();
  if (input.category?.trim()) fields["품목구분"] = input.category.trim();
  if (input.spec?.trim()) fields["권장표기"] = input.spec.trim();
  if (input.detailSpec?.trim()) fields["상세규격_표기"] = input.detailSpec.trim();
  if (input.origin?.trim()) fields["원산지"] = input.origin.trim();
  return fields;
}

async function ensureAdmin(adminWorkerId: string): Promise<Result> {
  try {
    await requireAdmin(adminWorkerId);
    return { success: true, data: undefined };
  } catch (e) {
    if (e instanceof AuthError) {
      logWarn("[master-products] 권한 거부:", e.code, e.message);
      return { success: false, error: e.message };
    }
    throw e;
  }
}

/**
 * 품목 목록 — 읽기 전용이라 WORKER도 허용한다(2026-08-03).
 *
 * 작업 정산이 전원 개방되면서 그 폼의 품목 콤보가 이 목록을 쓴다. 생성·수정·삭제는
 * 그대로 ADMIN 이상이다 — 여는 건 '어떤 품목이 있는지' 뿐이다.
 */
export async function listProducts(adminWorkerId: string): Promise<Result<Product[]>> {
  const auth = await ensureWorker(adminWorkerId, "master-products");
  if (!auth.success) return { success: false, error: auth.error };

  try {
    const products: Product[] = [];
    let offset: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      const data = (await fetchAirtable(`${TABLE_PATH}?${params}`)) as {
        records?: { id: string; fields?: Record<string, unknown> }[];
        offset?: string;
      };
      for (const rec of data.records ?? []) {
        products.push(parseProduct(rec));
      }
      offset = data.offset;
    } while (offset);
    return { success: true, data: products };
  } catch (e) {
    logError("[listProducts] 실패:", e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

export async function createProduct(
  adminWorkerId: string,
  input: ProductInput,
): Promise<Result<{ id: string }>> {
  const auth = await ensureAdmin(adminWorkerId);
  if (!auth.success) return { success: false, error: auth.error };
  if (!input.name?.trim()) return { success: false, error: "품목명은 필수입니다." };

  try {
    const { id } = await createAirtableRecord(TABLE_PATH, buildFields(input));
    revalidatePath("/admin/master/products");
    return { success: true, data: { id } };
  } catch (e) {
    logError("[createProduct] 실패:", e);
    return { success: false, error: e instanceof Error ? e.message : "생성 실패" };
  }
}

export async function updateProduct(
  adminWorkerId: string,
  productId: string,
  input: ProductInput,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId);
  if (!auth.success) return { success: false, error: auth.error };
  if (!input.name?.trim()) return { success: false, error: "품목명은 필수입니다." };

  try {
    await patchAirtableRecord(TABLE_PATH, productId, buildFields(input));
    revalidatePath("/admin/master/products");
    return { success: true, data: undefined };
  } catch (e) {
    logError("[updateProduct] 실패:", e);
    return { success: false, error: e instanceof Error ? e.message : "수정 실패" };
  }
}

export async function deleteProduct(
  adminWorkerId: string,
  productId: string,
): Promise<Result> {
  const auth = await ensureAdmin(adminWorkerId);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    // Airtable DELETE — 응답 { deleted: true, id } 반환
    await fetchAirtable(`${TABLE_PATH}/${productId}`, { method: "DELETE" });
    revalidatePath("/admin/master/products");
    return { success: true, data: undefined };
  } catch (e) {
    logError("[deleteProduct] 실패:", e);
    return { success: false, error: e instanceof Error ? e.message : "삭제 실패" };
  }
}
