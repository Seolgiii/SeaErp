// ─────────────────────────────────────────────────────────────────────────────
// 한국어 일시 표기 — "8월 3일 09시 30분"
//
// lib/date.ts와 나란한 형제지만 이 파일은 "server-only"가 아니다.
// 작업 정산 목록·상세가 클라이언트 컴포넌트라 브라우저에서도 호출된다.
//
// 서버·클라이언트 어디서 부르든 같은 문자열이 나와야 하므로 표시 시각대를
// Asia/Seoul로 고정한다. toLocaleString의 기본값(실행 환경 시각대)에 맡기면
// Vercel(UTC)과 사용자 브라우저(KST)가 9시간 어긋난 값을 보여준다.
// ─────────────────────────────────────────────────────────────────────────────

const TZ = "Asia/Seoul";

function parts(iso: string): Record<string, string> | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) out[p.type] = p.value;
  return out.year ? out : null;
}

/**
 * ISO 8601 → "8월 3일 09시 30분".
 *
 * 올해가 아니면 앞에 연도를 붙인다("2025년 12월 4일 09시 30분") — 연도가 없으면
 * 작년 기록과 올해 기록이 화면에서 구분되지 않는다.
 * 월·일은 앞 0을 떼고(8월 3일), 시·분은 붙인다(09시 30분) — 자릿수가 흔들리면
 * 목록에서 세로로 어긋나 읽기 어렵다.
 *
 * @param iso  Airtable dateTime 값. 빈 값·파싱 실패 시 `empty`를 그대로 돌려준다.
 * @param now  '올해' 판정 기준(테스트 주입용). 기본값은 현재 시각.
 */
export function formatKoreanDateTime(
  iso: string | null | undefined,
  empty = "—",
  now: Date = new Date(),
): string {
  if (!iso) return empty;
  const p = parts(iso);
  if (!p) return empty;

  const thisYear = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" })
    .formatToParts(now)
    .find((x) => x.type === "year")?.value;

  const body = `${Number(p.month)}월 ${Number(p.day)}일 ${p.hour}시 ${p.minute}분`;
  return p.year === thisYear ? body : `${p.year}년 ${body}`;
}

/** "작성자" 같은 이름과 함께 한 줄로. 이름이 없으면 일시만 돌려준다. */
export function formatStamp(
  iso: string | null | undefined,
  name: string | null | undefined,
  empty = "—",
): string {
  const when = formatKoreanDateTime(iso, "", undefined);
  const who = (name ?? "").trim();
  if (!when && !who) return empty;
  if (!when) return who;
  if (!who) return when;
  return `${when} · ${who}`;
}
