import { z } from "zod";
import { logError } from "@/lib/logger";

/**
 * Airtable 응답 공통 zod 스키마 헬퍼
 *
 * Airtable의 특수성:
 *  - 빈 필드는 응답에서 누락됨 (모든 필드는 옵셔널)
 *  - linked record 필드는 string ID 배열
 *  - lookup/rollup 필드는 배열로 오지만 단일값 케이스도 있음
 *  - number 필드가 가끔 string으로 직렬화되어 옴
 *  - boolean(체크박스)도 1/0/true/"true"/"1" 등 다양한 표현
 */

/** Airtable linked record 필드 — 배열 또는 단일 string */
export const LinkedRecord = z.union([
  z.array(z.string()),
  z.string(),
]).optional();

/** Lookup/Rollup 필드 — 보통 배열, 가끔 단일값 */
export const LookupValue = z.union([
  z.array(z.union([z.string(), z.number()])),
  z.string(),
  z.number(),
]).optional();

/** 숫자 필드 — Airtable이 string으로 반환할 수 있음 */
export const NumberLike = z.union([z.number(), z.string()]).optional();

/** 체크박스/활성 필드 — boolean / 1/0 / "true" 등 */
export const Activeish = z
  .union([z.boolean(), z.number(), z.string()])
  .optional();

/** Airtable attachment 배열 (파일 업로드 필드) */
export const AttachmentArray = z
  .array(
    z
      .object({
        id: z.string().optional(),
        url: z.string().optional(),
        filename: z.string().optional(),
        type: z.string().optional(),
        size: z.number().optional(),
      })
      .loose(),
  )
  .optional();

/**
 * Airtable 레코드 wrapper (id + createdTime + fields)
 *
 * @example
 * const WorkerRecord = airtableRecordSchema(WorkerFieldsSchema);
 */
export function airtableRecordSchema<T extends z.ZodTypeAny>(fieldsSchema: T) {
  return z
    .object({
      id: z.string(),
      createdTime: z.string().optional(),
      fields: fieldsSchema,
    })
    .loose();
}

/**
 * Airtable 목록 응답 ({ records, offset })
 */
export function airtableListSchema<T extends z.ZodTypeAny>(recordSchema: T) {
  return z
    .object({
      records: z.array(recordSchema).optional(),
      offset: z.string().optional(),
    })
    .loose();
}

/**
 * 검증 결과 모니터링 헬퍼.
 *
 * safeParse 후 실패한 issue들을 한 줄 로그로 남기되 throw하지 않음.
 * 호출자는 원본 데이터를 그대로 사용 — 1차 도입은 모니터링 모드.
 */
export function reportSchemaIssue(
  context: string,
  recordId: string | undefined,
  error: z.ZodError,
): void {
  // 너무 길어지지 않게 처음 3개 issue만
  const issues = error.issues.slice(0, 3).map((i) => {
    const path = i.path.length ? i.path.join(".") : "(root)";
    return `${path}: ${i.message}`;
  });
  // 운영자 grep용 prefix.
  //
  // ⚠ **`logWarn`을 쓰면 안 된다.** logger.ts 정책상 log/logWarn은 개발 환경에서만
  //   출력되므로, 그걸 쓰면 이 [SCHEMA-MISMATCH]가 production에서 사라진다 —
  //   운영에서 스키마 드리프트를 잡자고 만든 로그인데 정반대가 된다.
  //   전 환경에서 출력되는 래퍼는 `logError` 하나뿐이라 그걸 쓴다.
  //   (2026-08-05: 실제로 logWarn으로 바꿨다가 시나리오 18 통합 테스트가 깨져서 되돌렸다.
  //    심각도가 아니라 **출력 환경**을 기준으로 고른 것이다.)
  //
  // 종전 주석의 "logger 의존성 순환 방지" 는 사실이 아니었다 — lib/logger.ts는
  // 아무것도 import하지 않아 순환이 생길 수 없다(2026-08-05 확인).
  logError(
    `[SCHEMA-MISMATCH] ${context}${recordId ? ` (${recordId})` : ""}:`,
    issues.join(" | "),
    error.issues.length > 3 ? `(+${error.issues.length - 3} more)` : "",
  );
}
