"use server";

import { logError } from "@/lib/logger";
import { fetchAirtable } from "@/lib/airtable";
import { AIRTABLE_TABLE, WORKER_FIELDS } from "@/lib/airtable-schema";
import { calculateLotCostBasis } from "@/lib/cost-calc";
import { seoulDateString } from "@/lib/date";
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
  /** 이 이벤트가 속한 LOT번호 — 조상(이동 전) LOT의 이벤트면 현재 LOT과 다름 */
  lotNumber: string;
  /** 이동 이벤트의 LOT 전이: 원본 LOT번호. 비이동 이벤트는 빈 문자열. */
  fromLot: string;
  /** 이동 이벤트의 LOT 전이: 신규 LOT번호. 비이동 이벤트는 빈 문자열. */
  toLot: string;
  /**
   * 이 이벤트 직후 해당 LOT의 잔여재고(박스). 입고·승인 완료 출고에만 채움.
   * null이면 표시 안 함(이동 이벤트, 반려·대기 출고 — 실제 재고 변동 없음).
   */
  balanceAfter: number | null;
};

type AirRec = { id: string; createdTime?: string; fields?: Record<string, unknown> };

/**
 * LOT 원가 분해 (오늘 기준 박스당) + 현재 재고 평가액.
 *
 * "지금 이 LOT을 출고한다면 박스당 얼마인가"를 분해 — 출고 스냅샷(calculateOutboundCost)과
 * 동일 합산식. PC 화면에 원가를 노출하는 첫 지점(가격·원가는 그동안 일일정산 이메일 only였음).
 */
export type LotCostInfo = {
  /** 냉장료 보관일수 기준일 (이동입고일 ?? 최초입고일) */
  inboundDate: string;
  /** 보관일수 (기준일 ~ 오늘) */
  daysHeld: number;
  /** 박스당 분해 (원/박스) */
  purchasePerBox: number;
  refrigerationPerBox: number;
  inOutPerBox: number;
  unionPerBox: number;
  freezePerBox: number;
  /** 박스당 이월비용 (전 보관처에서 이월, 이동 안 된 LOT은 0) */
  carriedPerBox: number;
  /** 박스당 총원가 */
  totalPerBox: number;
  /** 현재 재고 평가액 (원) = 박스당 총원가 × 현재 재고수량 */
  stockValuation: number;
  /** 비용 데이터가 하나라도 있는지 (전부 0이면 미입력으로 보고 카드 숨김 판단) */
  hasData: boolean;
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
  cost: LotCostInfo;
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
): Promise<AirRec | null> {
  try {
    const data = (await fetchAirtable(`${tablePath}/${id}`)) as AirRec;
    return data;
  } catch {
    return null;
  }
}

async function fetchManyByIds(
  tablePath: string,
  ids: string[],
): Promise<AirRec[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(ids.map((id) => fetchRecord(tablePath, id)));
  return results.filter((r): r is AirRec => r !== null);
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

/** 한 LOT의 입고/이동(출처·신규)/출고 레코드를 한 묶음으로 조회 */
type LotBundle = {
  rec: AirRec;
  lotNumber: string;
  inboundRecs: AirRec[];
  transferInRecs: AirRec[];
  transferOutRecs: AirRec[];
  outboundRecs: AirRec[];
};

async function fetchLotBundle(rec: AirRec): Promise<LotBundle> {
  const lf = rec.fields ?? {};
  const [inboundRecs, transferOutRecs, transferInRecs] = await Promise.all([
    fetchManyByIds(INBOUND_PATH, linkIds(lf["입고관리링크"])),
    fetchManyByIds(TRANSFER_PATH, linkIds(lf["재고이동(출처 LOT)"])),
    fetchManyByIds(TRANSFER_PATH, linkIds(lf["재고이동(신규 LOT)"])),
  ]);
  const outboundIds: string[] = [];
  for (const ib of inboundRecs) outboundIds.push(...linkIds(ib.fields?.["출고 관리"]));
  const outboundRecs = await fetchManyByIds(OUTBOUND_PATH, outboundIds);
  return {
    rec,
    lotNumber: asString(lf["LOT번호"]),
    inboundRecs,
    transferInRecs,
    transferOutRecs,
    outboundRecs,
  };
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

    // 2. 조상(이동 전) LOT 체인 추적.
    //    이동 입고 LOT은 "원본 LOT번호" 링크로 직전 원본을 가리킨다 → 일반 입고(루트)에
    //    닿을 때까지 거슬러 올라간다. chainRecs[0]=현재 LOT, [1]=직전 원본, ...
    //    이렇게 하면 LOT번호가 바뀌기 전(원본 LOT)의 입고·출고 기록도 타임라인에 포함된다.
    //
    //    [성능] 부모 추적은 순차일 수밖에 없으나(부모 ID가 현재 LOT의 이동 레코드에 의존),
    //    LOT별 입고/이동/출고 묶음(무거운 조회)은 체인 수집 후 병렬로 일괄 조회한다.
    //    → 부모 추적은 LOT당 경량 2회(이동 1 + 부모 LOT 1)만, 번들은 Promise.all 한 번.
    const chainRecs: AirRec[] = [];
    const visited = new Set<string>();
    let cursor: AirRec | null = lotRec;
    for (let depth = 0; cursor && depth < 12; depth++) {
      if (visited.has(cursor.id)) break;
      visited.add(cursor.id);
      chainRecs.push(cursor);
      // 직전 원본 LOT 추적: LOT.재고이동(신규 LOT) → 이동.원본 LOT번호.
      //   (LOT 레코드에 이미 신규 LOT 링크가 있으므로 이동 1건만 추가 조회하면 부모 ID를 얻음)
      const transferInId = linkIds(cursor.fields?.["재고이동(신규 LOT)"])[0];
      if (!transferInId) break; // 일반 입고(루트) → 더 거슬러 갈 곳 없음
      const transferRec = await fetchRecord(TRANSFER_PATH, transferInId);
      const parentId = linkIds(transferRec?.fields?.["원본 LOT번호"])[0];
      cursor = parentId ? await fetchRecord(LOTS_PATH, parentId) : null;
    }

    // LOT별 입고/이동/출고 묶음을 병렬 조회 (체인이 길어도 한 라운드에).
    const chain: LotBundle[] = await Promise.all(
      chainRecs.map((rec) => fetchLotBundle(rec)),
    );

    // 3. 이름 lookup용 ID 수집 (체인 전체)
    const storageIds: string[] = [];
    const workerIds: string[] = [];
    const lotIds: string[] = []; // 이동의 원본/신규 LOT번호 → LOT번호 표시용
    // 같은 날짜 이벤트의 인과 순서 보정용: recordId → createdTime.
    const createdTimeById: Record<string, string> = {};
    const collect = (rec: AirRec) => {
      storageIds.push(...linkIds(rec.fields?.["보관처"]));
      storageIds.push(...linkIds(rec.fields?.["이동 전 보관처"]));
      storageIds.push(...linkIds(rec.fields?.["이동 후 보관처"]));
      workerIds.push(...linkIds(rec.fields?.["작업자"]));
      lotIds.push(...linkIds(rec.fields?.["원본 LOT번호"]));
      lotIds.push(...linkIds(rec.fields?.["신규 LOT번호"]));
      if (rec.createdTime) createdTimeById[rec.id] = rec.createdTime;
    };
    for (const b of chain) {
      for (const r of b.inboundRecs) collect(r);
      for (const r of b.transferInRecs) collect(r);
      for (const r of b.transferOutRecs) collect(r);
      for (const r of b.outboundRecs) collect(r);
    }

    const [storageMap, workerMap, lotNumberMap] = await Promise.all([
      fetchNameMap(STORAGE_PATH, "보관처명", storageIds),
      fetchNameMap(WORKERS_PATH, WORKER_FIELDS.name, workerIds),
      fetchNameMap(LOTS_PATH, "LOT번호", lotIds),
    ]);
    // 체인 LOT 번호는 이미 알고 있으니 보강 (조회 누락 대비)
    for (const b of chain) lotNumberMap[b.rec.id] = b.lotNumber;

    const storageName = (val: unknown): string => {
      const ids = linkIds(val);
      return ids[0] ? (storageMap[ids[0]] ?? "") : "";
    };
    const workerName = (val: unknown): string => {
      const ids = linkIds(val);
      return ids[0] ? (workerMap[ids[0]] ?? "") : "";
    };
    const lotName = (val: unknown): string => {
      const ids = linkIds(val);
      return ids[0] ? (lotNumberMap[ids[0]] ?? "") : "";
    };

    // 4. LOT별 잔여재고(박스) 계산 — 각 LOT의 모든 재고 변동을 createdTime 순으로 replay.
    //    입고/이동 입고 +수량, 이동 출고 −수량, 출고는 승인 완료만 −수량(반려·대기는 무변동).
    //    한 이동 레코드는 보내는 LOT(−)·받는 LOT(+) 양쪽 잔여에 모두 잡히므로 키를
    //    `LOT레코드ID|이벤트레코드ID`로 분리 — 같은 이동이 0180엔 잔여 0, 0181엔 잔여 10.
    //    (LOT 단위 정확값: 화면에 안 보이는 분기 이동이 있으면 잔여가 더 줄어 보일 수 있으나
    //     그 LOT의 실제 잔여라 정확.)
    const balanceAfterById: Record<string, number> = {};
    for (const b of chain) {
      const moves: { id: string; delta: number; t: string }[] = [];
      const creationRecs =
        b.transferInRecs.length > 0 ? b.transferInRecs : b.inboundRecs;
      for (const rec of creationRecs) {
        const f = rec.fields ?? {};
        const qty =
          b.transferInRecs.length > 0
            ? asNumber(f["이동수량"])
            : asNumber(f["입고수량"]);
        moves.push({ id: rec.id, delta: qty, t: rec.createdTime ?? "" });
      }
      for (const rec of b.transferOutRecs) {
        moves.push({
          id: rec.id,
          delta: -asNumber(rec.fields?.["이동수량"]),
          t: rec.createdTime ?? "",
        });
      }
      for (const rec of b.outboundRecs) {
        const f = rec.fields ?? {};
        const approved = asString(f["승인상태"]) === "승인 완료";
        moves.push({
          id: rec.id,
          delta: approved ? -asNumber(f["출고요청수량"]) : 0,
          t: rec.createdTime ?? "",
        });
      }
      moves.sort((x, y) => x.t.localeCompare(y.t));
      let bal = 0;
      for (const mv of moves) {
        bal += mv.delta;
        balanceAfterById[`${b.rec.id}|${mv.id}`] = bal;
      }
    }

    // 5. 이벤트 빌드 (체인의 각 LOT별). 각 LOT을 통장처럼 — 생성(입고/이동 입고)부터
    //    모든 재고 변동을 그 LOT 관점에서 출력한다.
    //    - 입고(루트) 또는 이동 입고(transfer-in): LOT 생성, +수량.
    //    - 이동 출고(transfer-out, 모든 LOT): 이 LOT에서 다른 LOT으로 나간 분, −수량.
    //      → 체인 이동 1건은 보내는 LOT의 이동 출고 + 받는 LOT의 이동 입고, 두 줄로 나타난다.
    //    - 출고: 판매 출고, −수량(승인 완료만 잔여 반영).
    //    잔여는 LOT별이라 balanceAfterById를 `LOT레코드ID|이벤트레코드ID`로 조회.
    const bkey = (b: LotBundle, recId: string) => `${b.rec.id}|${recId}`;
    const buildBundleEvents = (b: LotBundle): LifecycleEvent[] => {
      const evs: LifecycleEvent[] = [];
      const isTransferLot = b.transferInRecs.length > 0;

      if (isTransferLot) {
        for (const rec of b.transferInRecs) {
          const f = rec.fields ?? {};
          evs.push({
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
            lotNumber: b.lotNumber,
            fromLot: lotName(f["원본 LOT번호"]),
            toLot: lotName(f["신규 LOT번호"]),
            balanceAfter: balanceAfterById[bkey(b, rec.id)] ?? null,
          });
        }
      } else {
        for (const rec of b.inboundRecs) {
          const f = rec.fields ?? {};
          evs.push({
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
            lotNumber: b.lotNumber,
            fromLot: "",
            toLot: "",
            balanceAfter: balanceAfterById[bkey(b, rec.id)] ?? null,
          });
        }
      }

      // 이동 출고 — 모든 LOT에서 수집(이 LOT이 보낸 분). 보내는 LOT 관점의 잔여를 표시.
      for (const rec of b.transferOutRecs) {
        const f = rec.fields ?? {};
        evs.push({
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
          lotNumber: b.lotNumber,
          fromLot: lotName(f["원본 LOT번호"]),
          toLot: lotName(f["신규 LOT번호"]),
          balanceAfter: balanceAfterById[bkey(b, rec.id)] ?? null,
        });
      }

      for (const rec of b.outboundRecs) {
        const f = rec.fields ?? {};
        evs.push({
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
          lotNumber: b.lotNumber,
          fromLot: "",
          toLot: "",
          // 승인 완료 출고만 실제 재고 차감 → 잔여 표시. 반려·대기는 미표시(null).
          balanceAfter:
            asString(f["승인상태"]) === "승인 완료"
              ? (balanceAfterById[bkey(b, rec.id)] ?? null)
              : null,
        });
      }

      return evs;
    };

    const rawEvents: LifecycleEvent[] = [];
    for (const b of chain) rawEvents.push(...buildBundleEvents(b));

    // 중복 제거: 한 이동 레코드는 (보내는 LOT의 이동 출고) + (받는 LOT의 이동 입고)로
    //   의도적으로 두 번 나타나므로 recordId+type 기준으로 dedup(같은 면이 두 번 안 나오게).
    const seen = new Set<string>();
    const events: LifecycleEvent[] = [];
    for (const ev of rawEvents) {
      const k = `${ev.recordId}|${ev.type}`;
      if (seen.has(k)) continue;
      seen.add(k);
      events.push(ev);
    }
    // 1차: 업무일(입고일/출고일/이동일) 오름차순. 2차: 같은 날이면 레코드 생성시각(createdTime)
    //   오름차순 — 같은 날 발생한 입고→이동→출고의 인과 순서를 보존(예: 0180→0181 이동이
    //   0181→0182 이동보다 먼저). 3차: 한 이동의 출고/입고 두 줄(같은 레코드 = 같은 시각)은
    //   보내는 쪽(이동 출고)을 먼저 — 재고가 빠져나간 뒤 들어오는 순서.
    const createdAt = (id: string) => createdTimeById[id] ?? "";
    const sideRank = (t: LifecycleEventType) => (t === "transfer-out" ? 0 : t === "transfer-in" ? 1 : 0);
    events.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        createdAt(a.recordId).localeCompare(createdAt(b.recordId)) ||
        sideRank(a.type) - sideRank(b.type),
    );

    // 5. 원가 분해 (오늘 기준 박스당) — admin.ts 출고 스냅샷과 동일 input 매핑.
    //    냉장료 보관일수는 이동입고일(있으면) 우선, 없으면 최초입고일.
    const currentStockQty = asNumber(lf["재고수량"]);
    const inboundDate =
      asString(lf["이동입고일"]) || asString(lf["최초입고일"]);
    const basis = calculateLotCostBasis({
      purchasePrice: asNumber(lf["수매가"]),
      refrigerationFeePerUnit: asNumber(lf["냉장료단가"]),
      inOutFee: asNumber(lf["입출고비"]),
      unionFee: asNumber(lf["노조비"]),
      freezeFee: asNumber(lf["동결비"]),
      carriedRefrigeration: asNumber(lf["이월냉장료"]),
      carriedInOutFee: asNumber(lf["이월입출고비"]),
      carriedUnionFee: asNumber(lf["이월노조비"]),
      carriedFreezeFee: asNumber(lf["이월동결비"]),
      inboxQty: asNumber(lf["입고수량(BOX)"]),
      inboundDate,
      asOfDate: seoulDateString(),
    });
    const cost: LotCostInfo = {
      inboundDate,
      daysHeld: basis.daysHeld,
      purchasePerBox: basis.purchasePerBox,
      refrigerationPerBox: basis.refrigerationPerBox,
      inOutPerBox: basis.inOutPerBox,
      unionPerBox: basis.unionPerBox,
      freezePerBox: basis.freezePerBox,
      carriedPerBox: basis.carriedPerBox,
      totalPerBox: basis.totalPerBox,
      stockValuation: Math.round(basis.totalPerBox * Math.max(0, currentStockQty)),
      hasData: basis.totalPerBox > 0,
    };

    return {
      success: true,
      data: {
        lotRecordId: lotRec.id,
        lotNumber: asString(lf["LOT번호"]) || trimmed,
        productName: asString(lf["품목명"]),
        spec: asString(lf["규격표시"]) || asString(lf["규격"]),
        misu: asString(lf["상세규격_표기"]) || asString(lf["미수"]),
        currentStockQty,
        initialQty: asNumber(lf["입고수량(BOX)"]),
        approvalStatus: asString(lf["승인상태"]),
        firstInboundDate: asString(lf["최초입고일"]),
        cost,
        events,
      },
    };
  } catch (e) {
    logError(`[${TAG}] fetchLotLifecycle 실패:`, e);
    return { success: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}
