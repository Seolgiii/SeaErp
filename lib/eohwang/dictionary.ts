import "server-only";
// ─────────────────────────────────────────────────────────────────────────────
// 어황일보 번역 사전 (Airtable) 어댑터
// - 봇이 어황일보 사진을 읽을 때 참고하는 한글→일본어 어종/상태 사전.
// - source of truth = Airtable 테이블 '어황일보 번역 사전'.
// - 프로젝트 규칙(인라인 fetch 금지)에 따라 lib/airtable.ts 헬퍼만 사용.
// ─────────────────────────────────────────────────────────────────────────────
import {
  fetchAirtable,
  createAirtableRecord,
  patchAirtableRecord,
  tablePathSegment,
} from "@/lib/airtable";

/** 사전 한 줄 */
export type DictEntry = {
  id: string;
  korean: string; // 원문 표기(조회 키), 예: 빅아이
  japanese: string; // 일본어 표기, 예: メバチ
  kind: string; // 구분: 어종 | 상태
};

// 기본 테이블 ID (2026-07-13 생성). env로 override 가능.
const DEFAULT_DICT_TABLE = "tblVMMNSbT4GqrUfm";

const F = {
  korean: "한글품목명",
  japanese: "일본품목명",
  kind: "구분",
} as const;

function dictTablePath(): string {
  return tablePathSegment(
    process.env.AIRTABLE_EOHWANG_DICT_TABLE?.trim() || DEFAULT_DICT_TABLE
  );
}

/** 사전 전체를 읽어옵니다 (페이지네이션 포함). */
export async function loadDictionary(): Promise<DictEntry[]> {
  const table = dictTablePath();
  const out: DictEntry[] = [];
  let offset: string | undefined;

  do {
    const q = offset
      ? `${table}?pageSize=100&offset=${encodeURIComponent(offset)}`
      : `${table}?pageSize=100`;
    const data = await fetchAirtable(q);
    const records: { id: string; fields: Record<string, unknown> }[] =
      data.records ?? [];
    for (const r of records) {
      const f = r.fields ?? {};
      const korean = String(f[F.korean] ?? "").trim();
      if (!korean) continue;
      out.push({
        id: r.id,
        korean,
        japanese: String(f[F.japanese] ?? "").trim(),
        kind: String(f[F.kind] ?? "").trim(),
      });
    }
    offset = data.offset;
  } while (offset);

  return out;
}

/**
 * 새 어종을 사전에 추가하거나(없으면) 기존 어종의 일본어명을 갱신합니다.
 * 반환: "created" | "updated"
 */
export async function upsertTerm(
  korean: string,
  japanese: string,
  kind: string = "어종"
): Promise<"created" | "updated"> {
  const k = korean.trim();
  const j = japanese.trim();
  if (!k || !j) throw new Error("upsertTerm: 빈 값");

  const table = dictTablePath();
  const dict = await loadDictionary();
  const existing = dict.find((d) => d.korean === k);

  if (existing) {
    await patchAirtableRecord(table, existing.id, { [F.japanese]: j });
    return "updated";
  }
  await createAirtableRecord(table, {
    [F.korean]: k,
    [F.japanese]: j,
    [F.kind]: kind,
  });
  return "created";
}
