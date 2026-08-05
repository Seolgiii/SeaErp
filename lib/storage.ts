import "server-only";
import { fetchAirtable } from "@/lib/airtable";
import { logWarn } from "@/lib/logger";

/**
 * 보관처 구분 — 보관처 마스터의 `구분` singleSelect 필드와 1:1 매칭.
 *
 * 운영상 분류:
 *  - 자사창고 / 외부창고 / 가공공장 (2026-07-28 '기타' 폐지, 구분 필수)
 *
 * 입출고증 발행 정책:
 *  - 자사창고                    → 자사 운영 시설 = 우리가 발행 (isOwnStorage true)
 *  - 외부창고 / 가공공장        → 외부 시설 = 외부가 자체 발행 (false)
 *    · 가공공장은 위탁 가공이라 출고증은 가공공장 측이 발행. 자사창고에서 가공공장으로
 *      나갈 때(자사창고가 발행 주체)와 가공공장에서 자사창고로 들어올 때(역시 자사창고가
 *      발행 주체)는 우리 PDF 발행 — 즉 *자사창고 끝점*이 기준임.
 *
 * 영어 매핑 (storage_kind): own / external / processing
 */
export type StorageKind = "자사창고" | "외부창고" | "가공공장";

const STORAGE_KIND_FIELD = "구분";
const STORAGES_TABLE =
  process.env.AIRTABLE_STORAGES_TABLE?.trim() || "보관처 마스터";

/** Airtable singleSelect 응답은 { id, name, color } 객체 형태 — name 추출 */
function extractSelectName(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw.trim() || null;
  if (typeof raw === "object" && raw !== null) {
    const name = (raw as { name?: unknown }).name;
    if (typeof name === "string") return name.trim() || null;
  }
  return null;
}

/**
 * 보관처의 구분 카테고리 조회.
 * 미분류(빈 값)·조회 실패 시 null 반환.
 */
export async function getStorageKind(
  storageRecordId: string,
): Promise<StorageKind | null> {
  if (!storageRecordId) return null;
  try {
    const data = (await fetchAirtable(
      `${encodeURIComponent(STORAGES_TABLE)}/${storageRecordId}`,
    )) as { fields?: Record<string, unknown> };
    const name = extractSelectName(data.fields?.[STORAGE_KIND_FIELD]);
    if (!name) return null;
    if (
      name === "자사창고" ||
      name === "외부창고" ||
      name === "가공공장"
    ) {
      return name;
    }
    return null;
  } catch (e) {
    logWarn("[getStorageKind] 조회 실패:", storageRecordId, e);
    return null;
  }
}

/**
 * 자사창고 여부 (입출고증 발행 주체 판별).
 *
 * 발행 정책 — 보관처가 *자사창고*인 끝점에서만 우리(SeaERP)가 PDF 발행:
 *   - 자사창고로 *입고/이동 입고*  → 우리 입고증 발행
 *   - 자사창고에서 *이동 출고*    → 우리 출고증 발행 (자사 → 가공공장/외부 포함)
 *   - 거래처 출고는 보관처 무관하게 우리가 발행 (현 동작 유지)
 *   - 외부창고/가공공장에서 자사창고로 들어올 때 → 출고증은 외부가 자체 발행
 *
 * 미분류(null) 처리:
 *   - 2026-07-28부터 구분은 **필수**다(앱 화면에서 강제, Airtable 선택지도 3값뿐).
 *     따라서 정상 경로에서는 null이 나오지 않는다.
 *   - 다만 Airtable에서 직접 값을 비우면 여전히 null이 될 수 있고, 그때는 default true —
 *     즉 외부 시설이 자사창고로 오인돼 우리 이름으로 입출고증이 나간다.
 *     안전한 쪽으로 뒤집으려면 이 줄을 false로 바꾸면 된다(현재는 기존 동작 유지).
 */
export async function isOwnStorage(storageRecordId: string): Promise<boolean> {
  if (!storageRecordId) return false;
  const kind = await getStorageKind(storageRecordId);
  if (kind === null) return true; // 미분류 default
  return kind === "자사창고";
}
