"use server";

import { logError } from "@/lib/logger";
import { fetchAirtable } from "@/lib/airtable";
import { AIRTABLE_TABLE, WORKER_FIELDS } from "@/lib/airtable-schema";
import { ensureAdmin, type Result } from "./_master-helpers";

/**
 * 운영 건강도 (Phase 3 PC 관리 화면용) 서버 액션.
 *
 * daily-report의 fetchHealthMetrics와 동일 데이터를 사용하지만, count만 반환하는
 * 이메일 보고서와 달리 실제 위반 레코드 상세까지 가져온다 (admin이 조치할 수 있어야 함).
 *
 * 5개 지표:
 *  1. 음수 재고 LOT — LOT.재고수량 < 0
 *  2. 잔여수량 정합성 깨진 입고관리 — 잔여수량 < 0 OR > 입고수량
 *  3. 출고시점 비용 NULL — 승인 완료 출고 중 출고시점 판매원가가 0/blank (E1 가드 실패 조기 발견)
 *  4. 잠긴 PIN — 활성 작업자 중 pin_locked_until > now
 *  5. 어제 throughput — daily-report의 RequestItem 기반이라 별도 호출 (이번엔 생략, 추후)
 */

const TAG = "master-health";

const LOTS_PATH = encodeURIComponent(AIRTABLE_TABLE.lots);
const INBOUND_PATH = encodeURIComponent(AIRTABLE_TABLE.inbound);
const OUTBOUND_PATH = encodeURIComponent(AIRTABLE_TABLE.outbound);
const WORKERS_PATH = encodeURIComponent(AIRTABLE_TABLE.workers);
const STORAGE_PATH = encodeURIComponent(AIRTABLE_TABLE.storageMaster);

export type NegativeStockLot = {
  id: string;
  lotNumber: string;
  productName: string;
  storageName: string;
  stockQty: number;
  approvalStatus: string;
};

export type InvalidRemainingInbound = {
  id: string;
  inboundDate: string;
  productName: string;
  inboundQty: number;
  remaining: number;
  approvalStatus: string;
};

export type OutboundCostNullItem = {
  id: string;
  outboundDate: string;
  productName: string;
  buyer: string;
  qty: number;
  salePriceSnapshot: number;
};

export type LockedWorker = {
  id: string;
  name: string;
  role: string;
  pinFailCount: number;
  pinLockedUntil: number;
};

export type HealthSummary = {
  negativeStockLots: number;
  invalidRemainingInbound: number;
  outboundCostNull: number;
  lockedWorkers: number;
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

function firstLinkId(val: unknown): string | null {
  if (Array.isArray(val) && val.length > 0) {
    const s = String(val[0] ?? "").trim();
    if (/^rec[a-zA-Z0-9]+$/.test(s)) return s;
  }
  return null;
}

async function fetchByFormula<T = Record<string, unknown>>(
  tablePath: string,
  formula: string,
): Promise<{ id: string; fields?: T }[]> {
  const items: { id: string; fields?: T }[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({
      filterByFormula: formula,
      pageSize: "100",
    });
    if (offset) params.set("offset", offset);
    const data = (await fetchAirtable(`${tablePath}?${params}`)) as {
      records?: { id: string; fields?: T }[];
      offset?: string;
    };
    for (const rec of data.records ?? []) items.push(rec);
    offset = data.offset;
  } while (offset);
  return items;
}

async function fetchStorageNameMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  try {
    const data = (await fetchAirtable(
      `${STORAGE_PATH}?fields[]=${encodeURIComponent("보관처명")}&pageSize=100`,
      { next: { revalidate: 300 } },
    )) as { records?: { id: string; fields?: Record<string, unknown> }[] };
    for (const rec of data.records ?? []) {
      map[rec.id] = asString(rec.fields?.["보관처명"]);
    }
  } catch {
    /* fallback to empty map */
  }
  return map;
}

export async function getHealthSummary(
  adminWorkerId: string,
): Promise<Result<HealthSummary>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    const now = Date.now();
    const [neg, inv, costNull, locked] = await Promise.all([
      fetchByFormula(LOTS_PATH, "{재고수량}<0"),
      fetchByFormula(INBOUND_PATH, "OR({잔여수량}<0,{잔여수량}>{입고수량})"),
      fetchByFormula(
        OUTBOUND_PATH,
        `AND({승인상태}="승인 완료",OR({출고시점 판매원가}=0,{출고시점 판매원가}=BLANK()))`,
      ),
      fetchByFormula(WORKERS_PATH, `AND({활성}=1,{pin_locked_until}>${now})`),
    ]);

    return {
      success: true,
      data: {
        negativeStockLots: neg.length,
        invalidRemainingInbound: inv.length,
        outboundCostNull: costNull.length,
        lockedWorkers: locked.length,
      },
    };
  } catch (e) {
    logError(`[${TAG}] summary 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

export async function getNegativeStockLots(
  adminWorkerId: string,
): Promise<Result<NegativeStockLot[]>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    const [records, storageMap] = await Promise.all([
      fetchByFormula(LOTS_PATH, "{재고수량}<0"),
      fetchStorageNameMap(),
    ]);
    return {
      success: true,
      data: records.map((rec) => {
        const f = rec.fields ?? {};
        const storageId = firstLinkId(f["보관처"]);
        return {
          id: rec.id,
          lotNumber: asString(f["LOT번호"]),
          productName: asString(f["품목명"]),
          storageName: storageId ? (storageMap[storageId] ?? "") : "",
          stockQty: asNumber(f["재고수량"]),
          approvalStatus: asString(f["승인상태"]),
        };
      }),
    };
  } catch (e) {
    logError(`[${TAG}] negativeStock 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

export async function getInvalidRemainingInbounds(
  adminWorkerId: string,
): Promise<Result<InvalidRemainingInbound[]>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    const records = await fetchByFormula(
      INBOUND_PATH,
      "OR({잔여수량}<0,{잔여수량}>{입고수량})",
    );
    return {
      success: true,
      data: records.map((rec) => {
        const f = rec.fields ?? {};
        return {
          id: rec.id,
          inboundDate: asString(f["입고일"] ?? f["입고일자"]),
          productName: asString(f["품목명"]),
          inboundQty: asNumber(f["입고수량"]),
          remaining: asNumber(f["잔여수량"]),
          approvalStatus: asString(f["승인상태"]),
        };
      }),
    };
  } catch (e) {
    logError(`[${TAG}] invalidRemaining 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

export async function getOutboundCostNullList(
  adminWorkerId: string,
): Promise<Result<OutboundCostNullItem[]>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    const records = await fetchByFormula(
      OUTBOUND_PATH,
      `AND({승인상태}="승인 완료",OR({출고시점 판매원가}=0,{출고시점 판매원가}=BLANK()))`,
    );
    return {
      success: true,
      data: records.map((rec) => {
        const f = rec.fields ?? {};
        return {
          id: rec.id,
          outboundDate: asString(f["출고일"]),
          productName: asString(f["품목명"]),
          buyer: asString(f["판매처"]),
          qty: asNumber(f["출고요청수량"]),
          salePriceSnapshot: asNumber(f["출고시점 판매원가"]),
        };
      }),
    };
  } catch (e) {
    logError(`[${TAG}] outboundCostNull 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

export async function getLockedWorkers(
  adminWorkerId: string,
): Promise<Result<LockedWorker[]>> {
  const auth = await ensureAdmin(adminWorkerId, TAG);
  if (!auth.success) return { success: false, error: auth.error };

  try {
    const now = Date.now();
    const records = await fetchByFormula(
      WORKERS_PATH,
      `AND({활성}=1,{pin_locked_until}>${now})`,
    );
    return {
      success: true,
      data: records.map((rec) => {
        const f = rec.fields ?? {};
        return {
          id: rec.id,
          name: asString(f[WORKER_FIELDS.name]),
          role: asString(f[WORKER_FIELDS.role]),
          pinFailCount: asNumber(f["pin_fail_count"]),
          pinLockedUntil: asNumber(f["pin_locked_until"]),
        };
      }),
    };
  } catch (e) {
    logError(`[${TAG}] lockedWorkers 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}
