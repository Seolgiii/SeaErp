"use server";

import { logError } from "@/lib/logger";
import { fetchAirtable } from "@/lib/airtable";
import { AIRTABLE_TABLE, WORKER_FIELDS } from "@/lib/airtable-schema";
import { ensureAdmin, type Result } from "./_master-helpers";

/**
 * LOT 생애주기 (Phase 3 PC 관리 화면용) 서버 액션.
 *
 * LOT번호로 입고 → 이동 → 출고 모든 이벤트를 시간순으로 모은다.
 *
 * 데이터 흐름:
 *  - LOT.입고관리링크 → 입고 1건 (transfer로 생성된 LOT은 이동 입고로 동일 위치)
 *  - LOT.재고이동(출처 LOT) → 이 LOT을 출처로 한 이동들 (transfer-out)
 *  - LOT.재고이동(신규 LOT) → 이 LOT이 결과로 생성된 이동 (transfer-in)
 *  - 입고관리.출고 관리 → 이 LOT의 입고관리를 차감한 출고들
 */

const TAG = "master-lot-timeline";
const LOTS_PATH = encodeURIComponent(AIRTABLE_TABLE.lots);
const INBOUND_PATH = encodeURIComponent(AIRTABLE_TABLE.inbound);
const OUTBOUND_PATH = encodeURIComponent(AIRTABLE_TABLE.outbound);
const TRANSFER_PATH = encodeURIComponent(AIRTABLE_TABLE.transfer);
const STORAGE_PATH = encodeURIComponent(AIRTABLE_TABLE.storageMaster);
const WORKERS_PATH = encodeURIComponent(AIRTABLE_TABLE.workers);

export type LifecycleEventType =
  | "inbound"
  | "transfer-out"
  | "transfer-in"
  | "outbound";

export type LifecycleEvent = {
  recordId: string;
  type: LifecycleEventType;
  date: string;
  qty: number;
  storageFrom: string;
  storageTo: string;
  workerName: string;
  buyer: string;
  approvalStatus: string;
  pdfUrl: string;
};

export type LotLifecycleData = {
  lotRecordId: string;
  lotNumber: string;
  productName: string;
  spec: string;
  misu: string;
  currentStockQty: number;
  initialQty: number;
  approvalStatus: string;
  firstInboundDate: string;
  events: LifecycleEvent[];
};

const asString = (v: unknown): string => {
  if (Array.isArray(v)) return String(v[0] ?? "").trim();
  return String(v ?? "").trim();
};

const asNumber = (v: unknown): number => {
  if (Array.isArray(v)) v = v[0];
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function linkIds(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .map((v) => String(v ?? "").trim())
    .filter((s) => /^rec[a-zA-Z0-9]+$/.test(s));
}

function escapeFormula(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function fetchRecord(
  tablePath: string,
  id: string,
): Promise<{ id: string; fields?: Record<string, unknown> } | null> {
  try {
    const data = (await fetchAirtable(`${tablePath}/${id}`)) as {
      id: string;
      fields?: Record<string, unknown>;
    };
    return data;
  } catch {
    return null;
  }
}

async function fetchManyByIds(
  tablePath: string,
  ids: string[],
): Promise<{ id: string; fields?: Record<string, unknown> }[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(ids.map((id) => fetchRecord(tablePath, id)));
  return results.filter((r): r is { id: string; fields?: Record<string, unknown> } => r !== null);
}

async function fetchNameMap(
  tablePath: string,
  primaryField: string,
  ids: string[],
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  if (ids.length === 0) return map;
  const unique = Array.from(new Set(ids));
  const records = await fetchManyByIds(tablePath, unique);
  for (const rec of records) {
    map[rec.id] = asString(rec.fields?.[primaryField]);
  }
  return map;
}

export async function fetchLotLifecycle(
  adminWorkerId: string,
  lotNumber: string,
): Promise<Result<LotLifecycleData | null>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  const trimmed = lotNumber.trim();
  if (!trimmed) return { success: false, error: "LOT번호를 입력하세요." };

  try {
    // 1. LOT 조회
    const formula = encodeURIComponent(
      `{LOT번호}='${escapeFormula(trimmed)}'`,
    );
    const lotData = (await fetchAirtable(
      `${LOTS_PATH}?filterByFormula=${formula}&maxRecords=1`,
    )) as { records?: { id: string; fields?: Record<string, unknown> }[] };
    const lotRec = lotData.records?.[0];
    if (!lotRec) return { success: true, data: null };

    const lf = lotRec.fields ?? {};
    const inboundIds = linkIds(lf["입고관리링크"]);
    const transferOutIds = linkIds(lf["재고이동(출처 LOT)"]);
    const transferInIds = linkIds(lf["재고이동(신규 LOT)"]);

    // 2. 관련 레코드 병렬 조회
    const [inboundRecs, transferOutRecs, transferInRecs] = await Promise.all([
      fetchManyByIds(INBOUND_PATH, inboundIds),
      fetchManyByIds(TRANSFER_PATH, transferOutIds),
      fetchManyByIds(TRANSFER_PATH, transferInIds),
    ]);

    // 출고: 입고관리.출고 관리 link에서 가져옴
    const outboundIds: string[] = [];
    for (const ib of inboundRecs) {
      outboundIds.push(...linkIds(ib.fields?.["출고 관리"]));
    }
    const outboundRecs = await fetchManyByIds(OUTBOUND_PATH, outboundIds);

    // 3. 이름 lookup용 ID 수집
    const storageIds: string[] = [];
    const workerIds: string[] = [];
    const collect = (rec: { fields?: Record<string, unknown> }) => {
      storageIds.push(...linkIds(rec.fields?.["보관처"]));
      storageIds.push(...linkIds(rec.fields?.["이동 전 보관처"]));
      storageIds.push(...linkIds(rec.fields?.["이동 후 보관처"]));
      workerIds.push(...linkIds(rec.fields?.["작업자"]));
    };
    for (const r of inboundRecs) collect(r);
    for (const r of transferOutRecs) collect(r);
    for (const r of transferInRecs) collect(r);
    for (const r of outboundRecs) collect(r);

    const [storageMap, workerMap] = await Promise.all([
      fetchNameMap(STORAGE_PATH, "보관처명", storageIds),
      fetchNameMap(WORKERS_PATH, WORKER_FIELDS.name, workerIds),
    ]);

    const storageName = (val: unknown): string => {
      const ids = linkIds(val);
      return ids[0] ? (storageMap[ids[0]] ?? "") : "";
    };
    const workerName = (val: unknown): string => {
      const ids = linkIds(val);
      return ids[0] ? (workerMap[ids[0]] ?? "") : "";
    };

    // 4. 이벤트 빌드
    const events: LifecycleEvent[] = [];

    // 4-A. 신규 LOT으로 등록된 이동 (가장 처음) — 있다면 입고 대신 transfer-in로 표시
    const isTransferLot = transferInRecs.length > 0;

    if (isTransferLot) {
      for (const rec of transferInRecs) {
        const f = rec.fields ?? {};
        events.push({
          recordId: rec.id,
          type: "transfer-in",
          date: asString(f["이동일"]),
          qty: asNumber(f["이동수량"]),
          storageFrom: storageName(f["이동 전 보관처"]),
          storageTo: storageName(f["이동 후 보관처"]),
          workerName: workerName(f["작업자"]),
          buyer: "",
          approvalStatus: asString(f["승인상태"]),
          pdfUrl: "",
        });
      }
    } else {
      // 4-B. 일반 입고
      for (const rec of inboundRecs) {
        const f = rec.fields ?? {};
        events.push({
          recordId: rec.id,
          type: "inbound",
          date: asString(f["입고일"] ?? f["입고일자"]),
          qty: asNumber(f["입고수량"]),
          storageFrom: "",
          storageTo: storageName(f["보관처"]),
          workerName: workerName(f["작업자"]),
          buyer: "",
          approvalStatus: asString(f["승인상태"]),
          pdfUrl: asString(f["입고증URL"]),
        });
      }
    }

    // 4-C. 출처 LOT 이동들 (이 LOT에서 다른 곳으로)
    for (const rec of transferOutRecs) {
      const f = rec.fields ?? {};
      events.push({
        recordId: rec.id,
        type: "transfer-out",
        date: asString(f["이동일"]),
        qty: asNumber(f["이동수량"]),
        storageFrom: storageName(f["이동 전 보관처"]),
        storageTo: storageName(f["이동 후 보관처"]),
        workerName: workerName(f["작업자"]),
        buyer: "",
        approvalStatus: asString(f["승인상태"]),
        pdfUrl: asString(f["출고증 URL"]),
      });
    }

    // 4-D. 출고
    for (const rec of outboundRecs) {
      const f = rec.fields ?? {};
      events.push({
        recordId: rec.id,
        type: "outbound",
        date: asString(f["출고일"]),
        qty: asNumber(f["출고요청수량"]),
        storageFrom: storageName(f["보관처"]),
        storageTo: "",
        workerName: workerName(f["작업자"]),
        buyer: asString(f["판매처"]),
        approvalStatus: asString(f["승인상태"]),
        pdfUrl: asString(f["출고증URL"]),
      });
    }

    // 시간순 정렬 (날짜 ASC)
    events.sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      data: {
        lotRecordId: lotRec.id,
        lotNumber: asString(lf["LOT번호"]) || trimmed,
        productName: asString(lf["품목명"]),
        spec: asString(lf["규격표시"]) || asString(lf["규격"]),
        misu: asString(lf["상세규격_표기"]) || asString(lf["미수"]),
        currentStockQty: asNumber(lf["재고수량"]),
        initialQty: asNumber(lf["입고수량(BOX)"]),
        approvalStatus: asString(lf["승인상태"]),
        firstInboundDate: asString(lf["최초입고일"]),
        events,
      },
    };
  } catch (e) {
    logError(`[${TAG}] fetchLotLifecycle 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}
