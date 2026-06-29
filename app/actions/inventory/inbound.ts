"use server";
import { log, logError, logWarn } from '@/lib/logger';

// ─────────────────────────────────────────────────────────────────────────────
// 입고 신청 처리 모듈
// 직원이 물품 입고를 신청하면 이 파일의 함수들이 순서대로 실행되어
// Airtable(온라인 데이터베이스)에 입고 기록과 재고 기록을 생성합니다.
// ─────────────────────────────────────────────────────────────────────────────

import { revalidatePath } from "next/cache";
import { AIRTABLE_TABLE } from "@/lib/airtable-schema";
import { AuthError, requireWorker } from "@/lib/server-auth";
import { InputValidationError, sanitizeText } from "@/lib/input-sanitize";
import { generateUniqueLotNumber } from "@/lib/lot-sequence";
import { fetchAirtable, patchAirtableRecord } from "@/lib/airtable";

export type InventoryCreatePayload = {
  /** YYYY-MM-DD 또는 YYYY/MM/DD 입고일자 */
  입고일자?: string;
  품목명?: string;
  규격?: string;
  미수?: string;
  /** 입고 수량(BOX) */
  "입고수량(BOX)"?: number | string;
  수매가?: number | string;
  storageRecordId?: string;
  원산지?: string;
  매입처?: string;
  매입처RecordId?: string;
  /** 매입자 작업자 record ID — 비면 작업자(입력자)로 폴백 */
  매입자RecordId?: string;
  선박명?: string;
  비고?: string;
  /** true면 품목마스터에 없을 때 인라인 생성하지 않고 실패 (PC 직접 등록 — 마스터에서만 생성) */
  disallowProductCreate?: boolean;
  /** 작업자 record ID — 서버에서 권한 검증용 */
  작업자: string;
  /** 호환성: 일부 폼이 영어 키로 보내는 필드(현재 서버는 무시) */
  [extra: string]: unknown;
};

// Airtable 접속에 필요한 인증 키와 데이터베이스 ID (환경변수에서 읽어옴)
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

/** 입고 관리 테이블 — env 우선, fallback은 테이블명 */
function inboundTablePath(): string {
  return encodeURIComponent(
    process.env.AIRTABLE_INBOUND_TABLE?.trim() || "입고 관리"
  );
}

// Airtable 각 테이블의 필드(열) 이름 상수 정의
const LOT_INBOUND_LINK_FIELD = "입고관리링크";       // LOT별 재고 테이블에서 입고 관리를 연결하는 필드
const INBOUND_WORKER_FIELD = "작업자";               // 입고 신청한 작업자
const INBOUND_PRODUCT_MASTER_FIELD = "품목마스터";   // 입고 품목을 품목 마스터 테이블에 연결하는 필드
const LOT_TABLE_LOT_NUMBER_FIELD = "LOT번호";        // LOT별 재고 테이블의 LOT 번호 필드
const LOT_TABLE_STOCK_FIELD = "재고수량";            // LOT별 재고 테이블의 현재 재고 수량 필드

/**
 * 주어진 문자열이 Airtable 레코드 ID 형식인지 확인합니다.
 * Airtable의 모든 행(레코드)은 "rec"으로 시작하는 고유 ID를 가집니다.
 */
function isRecordId(id: string): boolean {
  return /^rec[a-zA-Z0-9]+$/.test(id);
}

/**
 * 서울 시간(KST=UTC+9) 기준 영업일 반환.
 * 오전 9시 이전이면 전날을 영업일로 처리.
 */
function getBizDateSeoul(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  if (kst.getUTCHours() < 9) {
    kst.setUTCDate(kst.getUTCDate() - 1);
  }
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 입고일자 문자열을 Airtable에 저장 가능한 날짜 형식(YYYY-MM-DD)으로 변환합니다.
 * 예: "2024.3.5" → "2024-03-05"
 */
function inboundDateForAirtable(raw: unknown): string {
  const s = String(raw ?? "").trim();
  const normalized = s.replace(/\./g, "/").replace(/\s/g, "");
  const dashed = normalized.replace(/\//g, "-");
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dashed)) {
    const [y, m, d] = dashed.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return dashed;
}

/**
 * 품목명으로 품목마스터 id + 품목코드 + 품목구분 + 기존 LOT 링크 배열 확보.
 * 없으면 신규 품목마스터를 먼저 생성.
 */
async function resolveProductMasterForInbound(formData: InventoryCreatePayload): Promise<{
  masterId: string;
  productCode: string;
  productCategory: string;
  lotIds: string[];
} | null> {
  const name = String(formData?.["품목명"] ?? "").trim();
  if (!name) {
    logError("[createInventoryRecord] 품목명 없음");
    return null;
  }
  const escaped = name.replace(/'/g, "\\'");
  const masterTable = encodeURIComponent("품목마스터");
  // 동일 품목명이 이미 있는지 조회
  const formula = encodeURIComponent(`{품목명}='${escaped}'`);
  let data: { records?: { id: string; fields?: Record<string, unknown> }[] };
  try {
    data = await fetchAirtable(`${masterTable}?filterByFormula=${formula}&maxRecords=1`);
  } catch (e) {
    logError("[createInventoryRecord] 품목마스터 조회 실패:", e instanceof Error ? e.message : e);
    return null;
  }
  // 기존 품목마스터 레코드가 있으면 해당 ID와 연결된 LOT 목록 반환
  const existing = data.records?.[0];
  if (existing?.id && isRecordId(existing.id)) {
    const rawLots = existing.fields?.["LOT별 재고"];
    const lotIds = Array.isArray(rawLots)
      ? rawLots.filter((x): x is string => typeof x === "string" && isRecordId(x))
      : [];
    const productCode = String(existing.fields?.["품목코드"] ?? "").trim();
    const productCategory = String(existing.fields?.["품목구분"] ?? "").trim();
    return { masterId: existing.id, productCode, productCategory, lotIds };
  }

  // 인라인 신규 생성 차단(PC 직접 등록 등) — 마스터에 없으면 생성하지 않고 실패시킨다.
  // (마스터 데이터는 마스터 화면에서만 만든다는 원칙)
  if (formData?.["disallowProductCreate"]) {
    logWarn("[createInventoryRecord] 품목마스터 미존재 + 인라인 생성 차단:", name);
    return null;
  }

  // 기존 품목마스터가 없으면 신규 생성 (처음 입고되는 품목)
  let created: { id?: string; fields?: Record<string, unknown> };
  try {
    created = await fetchAirtable(masterTable, {
      method: "POST",
      body: JSON.stringify({
        fields: {
          품목명: name,
          "품목구분": "미분류",
          권장표기: formData?.["규격"],
          원산지: formData?.["원산지"],
        },
      }),
    });
  } catch (e) {
    logError("[createInventoryRecord] 품목마스터(신규) POST 실패:", e instanceof Error ? e.message : e);
    return null;
  }
  if (!created.id || !isRecordId(created.id)) {
    logError("[createInventoryRecord] 품목마스터(신규) record id 없음:", created);
    return null;
  }
  const productCode = String(created.fields?.["품목코드"] ?? "").trim();
  const productCategory = String(created.fields?.["품목구분"] ?? "").trim();
  log("[createInventoryRecord] 품목마스터 신규 생성:", { masterId: created.id, productCode });
  return { masterId: created.id, productCode, productCategory, lotIds: [] };
}

/**
 * LOT번호를 서버에서 직접 조합: YYMMDD-품목코드-규격-[미수숫자-]전체일련번호
 *
 * - 미수: "미" 글자 제거 후 빈 값이면 해당 세그먼트 생략
 * - seq: 전체 LOT 통틀어 최대 일련번호 + 1
 * 예: 260417-MC1-11-26-0001 / 260417-FMC-24-0003
 */
function buildLotNumber(opts: {
  bizDate: string;
  productCode: string;
  spec: string;
  misu: string;
  seq: number;
}): string {
  const yymmdd = opts.bizDate.replace(/-/g, "").slice(2);
  const seqStr = String(opts.seq).padStart(4, "0");
  const misuClean = opts.misu.replace(/미$/, "").trim();
  const parts: string[] = [yymmdd, opts.productCode || "NOCODE", opts.spec || "-"];
  if (misuClean) parts.push(misuClean);
  parts.push(seqStr);
  return parts.join("-");
}

/**
 * 입고 신청 메인 함수
 *
 * 직원이 입고 신청 폼을 제출하면 이 함수가 실행됩니다.
 * 아래 순서로 Airtable에 데이터를 저장합니다:
 *   1. 입고 관리 레코드 생성 (승인 대기 상태, LOT번호는 잠시 비워둠)
 *   2. Airtable Auto ID를 읽어 LOT번호를 조합
 *   3. 방금 만든 입고 관리 레코드에 LOT번호를 업데이트(PATCH)
 *   4. LOT별 재고 레코드 생성 (재고수량=0, 승인 후 실제 수량 반영)
 *   5. 품목마스터에 새 LOT 연결
 */
export async function createInventoryRecord(formData: InventoryCreatePayload) {
  try {
    // 환경변수(API키, 데이터베이스ID) 누락 시 오류 반환
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      logError("[createInventoryRecord] AIRTABLE_API_KEY / BASE_ID 미설정");
      return { success: false, message: "서버 환경 설정 오류" };
    }

    // 작업자 권한 검증 (Airtable 조회 — 활성 작업자 확인)
    const rawWorker = String(formData?.["작업자"] ?? "").trim();
    let workerRecordId: string;
    try {
      const verified = await requireWorker(rawWorker);
      workerRecordId = verified.id;
    } catch (e) {
      if (e instanceof AuthError) {
        logWarn("[createInventoryRecord] 권한 거부:", e.code, e.message);
        return { success: false, message: e.message };
      }
      throw e;
    }

    // 입고 수량 유효성 검사 (0 이하 불가)
    const qty = Number(formData?.["입고수량(BOX)"]);
    if (!Number.isFinite(qty) || qty <= 0) {
      return { success: false, message: "입고 수량이 올바르지 않습니다." };
    }

    // 품목마스터 확인 또는 신규 생성
    const productMaster = await resolveProductMasterForInbound(formData);
    if (!productMaster) {
      return {
        success: false,
        message: formData?.["disallowProductCreate"]
          ? "품목 마스터에 없는 품목입니다. 품목 마스터에서 먼저 등록하세요."
          : "품목마스터를 확인할 수 없습니다.",
      };
    }

    const bizDate = inboundDateForAirtable(formData?.["입고일자"]);
    const spec = String(formData?.["규격"] ?? "").trim();
    const misu = String(formData?.["미수"] ?? "").trim();
    const purchasePrice = Number(formData?.["수매가"]);

    // 자유 텍스트 필드 정규화·길이 검사 (비고 200자 / 선박명 30자)
    let memo: string;
    let shipName: string;
    try {
      memo = sanitizeText(formData?.["비고"], "inboundMemo", "비고");
      shipName = sanitizeText(formData?.["선박명"], "shipName", "선박명");
    } catch (e) {
      if (e instanceof InputValidationError) return { success: false, message: e.message };
      throw e;
    }

    const supplierRecordId = String(formData?.["매입처RecordId"] ?? "").trim();
    // 매입자는 작업자(입력자)와 별개 — 비면 작업자로 폴백 (모바일 카트는 미전달 → 기존 동작 유지)
    const purchaserRecordId = String(formData?.["매입자RecordId"] ?? "").trim();
    const purchaserId = isRecordId(purchaserRecordId) ? purchaserRecordId : workerRecordId;

    // ── 1. 입고 관리 생성 (LOT번호는 아직 비움) ──
    const inboundFields: Record<string, unknown> = {
      입고일: bizDate,
      미수: misu,
      규격: spec,
      입고수량: qty,
      잔여수량: qty,
      원산지: String(formData?.["원산지"] ?? ""),
      [INBOUND_WORKER_FIELD]: [workerRecordId],
      매입자: [purchaserId],
      [INBOUND_PRODUCT_MASTER_FIELD]: [productMaster.masterId],
      승인상태: "승인 대기",
      ...(Number.isFinite(purchasePrice) && purchasePrice > 0 && { 수매가: purchasePrice }),
      ...(isRecordId(supplierRecordId) && { 매입처: [supplierRecordId] }),
      ...(shipName && { 선박명: shipName }),
      ...(isRecordId(String(formData?.["storageRecordId"] ?? "")) && { 보관처: [String(formData?.["storageRecordId"])] }),
    };
    let inboundRecordId: string;
    try {
      const createdInbound = await fetchAirtable(inboundTablePath(), {
        method: "POST",
        body: JSON.stringify({ fields: inboundFields }),
      });
      inboundRecordId = createdInbound?.id;
    } catch (e) {
      logError("[createInventoryRecord] 입고 관리 POST 실패:", e instanceof Error ? e.message : e);
      return { success: false, message: "입고 관리 등록 실패" };
    }
    if (!isRecordId(inboundRecordId)) {
      logError("[createInventoryRecord] 입고 관리 record id 없음");
      return { success: false, message: "입고 관리 등록 실패" };
    }

    // ── 2. 영업일 + 전체 일련번호 → LOT번호 생성 (동시성 방어 재시도 포함) ──
    const lotBizDate = getBizDateSeoul();
    const lotNumber = await generateUniqueLotNumber((seq) =>
      buildLotNumber({
        bizDate: lotBizDate,
        productCode: productMaster.productCode,
        spec,
        misu,
        seq,
      }),
    );
    log("[createInventoryRecord] LOT번호 생성:", lotNumber);

    // ── 3. LOT별 재고 생성 (재고수량=0; 승인 후 실제 수량으로 PATCH) ──
    // 입고관리.LOT번호는 Lookup 필드(LOT별 재고 2 → LOT별 재고.LOT번호)로 전환됨.
    // LOT별 재고를 입고관리링크와 함께 생성하면 양방향 link 자동 동기화로
    // 입고관리.LOT번호 lookup이 자동 채워진다 (별도 PATCH 불필요).
    // 수매가·비고는 입고 관리 테이블에 필드가 없으므로 여기서만 저장
    // 재고수량은 아직 0으로 설정 — 관리자 승인 후 createLotOnInboundApproval()에서 실제 수량으로 변경됨
    const lotFields: Record<string, unknown> = {
      [LOT_INBOUND_LINK_FIELD]: [inboundRecordId],
      [LOT_TABLE_LOT_NUMBER_FIELD]: lotNumber,
      [LOT_TABLE_STOCK_FIELD]: 0,
      품목명: String(formData?.["품목명"] ?? "").trim(),
      규격: spec,
      미수: misu,
      원산지: String(formData?.["원산지"] ?? "").trim(),
      최초입고일: bizDate,
      ...(isRecordId(String(formData?.["storageRecordId"] ?? "")) && { 보관처: [String(formData?.["storageRecordId"])] }),
      "입고수량(BOX)": qty,
      ...(isRecordId(supplierRecordId) && { 매입처: [supplierRecordId] }),
      승인상태: "승인 대기",
      상태: "승인 대기",
    };
    if (Number.isFinite(purchasePrice) && purchasePrice > 0) {
      lotFields["수매가"] = purchasePrice;
    }
    if (memo) {
      lotFields["비고"] = memo;
    }

    let createdLot: { id?: string };
    try {
      createdLot = await fetchAirtable("LOT별%20재고", {
        method: "POST",
        body: JSON.stringify({ fields: lotFields }),
      });
    } catch (e) {
      logError("[createInventoryRecord] LOT별 재고 POST 실패:", e instanceof Error ? e.message : e);
      return { success: false, message: "재고 등록 실패" };
    }
    const newLotId = createdLot.id;
    if (!newLotId || !isRecordId(newLotId)) {
      logError("[createInventoryRecord] LOT record id 없음");
      return { success: false, message: "재고 등록 실패" };
    }

    // ── 5. 품목마스터 LOT 연결 ──
    // 품목마스터 레코드에 방금 생성한 LOT 재고 레코드를 연결합니다
    const masterTable = encodeURIComponent("품목마스터");
    try {
      await patchAirtableRecord(masterTable, productMaster.masterId, {
        // 기존 LOT 목록에 새 LOT ID를 추가 (덮어쓰지 않도록 기존 목록 유지)
        "LOT별 재고": [...productMaster.lotIds, newLotId],
      });
    } catch (e) {
      // 비치명적: LOT 자체는 생성됐고 연결만 실패 → 로그만 남기고 진행 (기존 동작 보존)
      logError("[createInventoryRecord] 품목마스터 LOT 연결 PATCH 실패:", e instanceof Error ? e.message : e);
    }

    // 재고 현황 페이지와 관리자 대시보드 캐시 초기화 (최신 데이터 반영)
    revalidatePath("/inventory/status");
    revalidatePath("/admin/dashboard");
    // inboundRecordId·lotNumber 반환 (PC 직접 등록에서 즉시 승인 연쇄에 사용; 기존 호출부는 무시)
    return { success: true, inboundRecordId, lotNumber };
  } catch (error) {
    logError("[createInventoryRecord] 예외:", error);
    return { success: false };
  }
}

/**
 * 보관처 마스터 테이블에서 보관처 목록을 반환합니다.
 */
export async function getStorageOptions(): Promise<{ id: string; name: string }[]> {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) return [];

  try {
    const data = await fetchAirtable(
      `${encodeURIComponent("보관처 마스터")}?fields[]=${encodeURIComponent("보관처명")}&pageSize=100`,
      { next: { revalidate: 300 } },
    );
    return (data.records ?? [])
      .map((r: { id: string; fields?: Record<string, unknown> }) => ({ id: r.id, name: String(r.fields?.["보관처명"] ?? "") }))
      .filter((o: { id: string; name: string }) => o.name);
  } catch (e) {
    logError("[getStorageOptions] 예외:", e);
    return [];
  }
}

/**
 * 품목마스터 테이블에서 품목명 + 품목구분 목록을 반환한다.
 * 품목명 드롭다운 및 선택 시 품목구분 자동 채우기에 사용.
 */
export async function getProductOptions(): Promise<{ id: string; name: string; category: string }[]> {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) {
    logError("[getProductOptions] API KEY 또는 BASE ID 미설정");
    return [];
  }

  try {
    const tableName = "품목마스터";
    const table = encodeURIComponent(tableName);
    const fieldParams = ["품목명", "품목구분"]
      .map((f) => `fields[]=${encodeURIComponent(f)}`)
      .join("&");
    const allRecords: { id: string; name: string; category: string }[] = [];
    let offset: string | undefined;
    let pageNum = 0;

    log(`[getProductOptions] 쿼리 시작 — 테이블명: "${tableName}" (인코딩: "${table}")`);

    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      const path = `${table}?${fieldParams}&${params}`;
      log(`[getProductOptions] 페이지 ${++pageNum} 요청: ${path}`);

      let data: { records?: { id: string; fields?: Record<string, unknown> }[]; offset?: string };
      try {
        data = await fetchAirtable(path);
      } catch (e) {
        logError("[getProductOptions] 조회 실패:", e instanceof Error ? e.message : e);
        break;
      }
      const pageRecords = data.records ?? [];
      log(`[getProductOptions] 페이지 ${pageNum} 결과: ${pageRecords.length}건, 샘플:`, pageRecords.slice(0, 2).map((r) => ({ id: r.id, fields: r.fields })));

      for (const rec of pageRecords) {
        const name = String(rec.fields?.["품목명"] ?? "").trim();
        if (name) {
          allRecords.push({
            id: rec.id,
            name,
            category: String(rec.fields?.["품목구분"] ?? "").trim(),
          });
        }
      }
      offset = data.offset;
    } while (offset);

    log(`[getProductOptions] 완료 — 총 ${allRecords.length}건`);
    return allRecords;
  } catch (e) {
    logError("[getProductOptions] 예외:", e);
    return [];
  }
}

/**
 * 매입처 마스터 테이블에서 매입처명 + record ID 목록을 반환한다.
 * 테이블이 없거나 오류 시 빈 배열 반환.
 */
export async function getSupplierOptions(): Promise<{ id: string; name: string }[]> {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) {
    logError("[getSupplierOptions] API KEY 또는 BASE ID 미설정");
    return [];
  }

  // 1. 매입처 마스터 테이블 우선 시도
  const masterTableName = AIRTABLE_TABLE.suppliers;
  log(`[getSupplierOptions] 쿼리 시작 — 테이블명: "${masterTableName}"`);
  try {
    const table = encodeURIComponent(masterTableName);
    const fieldParams = `fields[]=${encodeURIComponent("매입처명")}`;
    const allRecords: { id: string; name: string }[] = [];
    let offset: string | undefined;
    let masterOk = true;
    let pageNum = 0;

    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      const path = `${table}?${fieldParams}&${params}`;
      log(`[getSupplierOptions] 매입처 마스터 페이지 ${++pageNum} 요청: ${path}`);

      let data: { records?: { id: string; fields?: Record<string, unknown> }[]; offset?: string };
      try {
        data = await fetchAirtable(path);
      } catch (e) {
        logWarn("[getSupplierOptions] 매입처 마스터 조회 실패:", e instanceof Error ? e.message : e);
        masterOk = false;
        break;
      }
      const pageRecords = data.records ?? [];
      log(`[getSupplierOptions] 매입처 마스터 페이지 ${pageNum} 결과: ${pageRecords.length}건, 샘플:`, pageRecords.slice(0, 2).map((r) => ({ id: r.id, fields: r.fields })));

      for (const rec of pageRecords) {
        const name = String(rec.fields?.["매입처명"] ?? "").trim();
        if (name) allRecords.push({ id: rec.id, name });
      }
      offset = data.offset;
    } while (offset);

    if (masterOk && allRecords.length > 0) {
      log(`[getSupplierOptions] 완료 — 총 ${allRecords.length}건`);
      return allRecords;
    }
    logWarn(`[getSupplierOptions] 매입처 마스터에서 0건 조회됨 — 폴백으로 전환`);
  } catch (e) {
    logWarn("[getSupplierOptions] 매입처 마스터 예외:", e);
  }

  // 2. 폴백: 입고 관리 테이블의 매입처 필드에서 unique 값 수집 (ID 없음)
  const fallbackTableName = process.env.AIRTABLE_INBOUND_TABLE?.trim() || "입고 관리";
  log(`[getSupplierOptions] 폴백 — 테이블명: "${fallbackTableName}"`);
  try {
    const table = encodeURIComponent(fallbackTableName);
    const fieldParams = `fields[]=${encodeURIComponent("매입처")}`;
    const nameSet = new Set<string>();
    let offset: string | undefined;

    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      const path = `${table}?${fieldParams}&${params}`;
      let data: { records?: { id: string; fields?: Record<string, unknown> }[]; offset?: string };
      try {
        data = await fetchAirtable(path);
      } catch (e) {
        logError("[getSupplierOptions] 폴백 조회 실패:", e instanceof Error ? e.message : e);
        break;
      }
      for (const rec of data.records ?? []) {
        const name = String(rec.fields?.["매입처"] ?? "").trim();
        if (name) nameSet.add(name);
      }
      offset = data.offset;
    } while (offset);

    const results = [...nameSet].sort().map((name) => ({ id: "", name }));
    log(`[getSupplierOptions] 폴백 완료 — 총 ${results.length}건`);
    return results;
  } catch (e) {
    logError("[getSupplierOptions] 폴백 예외:", e);
    return [];
  }
}
