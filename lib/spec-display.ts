/**
 * 규격만 단독 표기: "11" → "11kg", "11kg" → "11kg", 빈 값/"-" → "-".
 * 분리된 컬럼(규격/미수 두 열) 표시용.
 */
export function formatSpec(specRaw: string): string {
  const t = (specRaw ?? '').trim();
  if (!t || t === '-') return '-';
  return /kg\s*$/i.test(t) ? t : `${t}kg`;
}

/**
 * 미수만 단독 표기: "42/44" → "42/44미", "26" → "26미", "52/54미" → "52/54미" (중복 방지).
 */
export function formatMisu(misuRaw: string): string {
  const t = (misuRaw ?? '').trim();
  if (!t || t === '-') return '-';
  return t.endsWith('미') ? t : `${t}미`;
}

/**
 * LOT 사이즈(마리당 g) 표기.
 *
 * 규칙:
 * - 미수가 1~2자리: "박스당 N마리"로 해석. spec(kg)을 N으로 나눠 마리당 g 계산.
 *   - 단일 (예: spec="11", misu="26") → "약 423g"
 *   - 범위 (예: spec="11", misu="42/44") → "약 250~261g" (작은 값~큰 값)
 * - 미수가 3자리 이상: 이미 g 단위로 입력된 사이즈로 해석. 계산 없이 그대로 표시.
 *   - 단일 (예: misu="300") → "약 300g"
 *   - 범위 (예: misu="300/400") → "약 300~400g"
 * - 미수가 비었거나 "-", 계산에 필요한 spec이 없으면 "-".
 */
export function formatSize(specRaw: string, misuRaw: string): string {
  const m = (misuRaw ?? '').trim();
  if (!m || m === '-') return '-';

  // 미수에서 숫자 부분만 추출 (예: "42/44미" → ["42","44"], "300/400" → ["300","400"])
  const parts = m
    .split('/')
    .map((p) => p.replace(/[^\d]/g, ''))
    .filter((p) => p.length > 0);
  if (parts.length === 0) return '-';

  const nums = parts.map((p) => Number(p)).filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return '-';

  // 첫 토큰이 3자리 이상이면 이미 g 단위로 간주
  const alreadyGrams = parts[0].length >= 3;

  let grams: number[];
  if (alreadyGrams) {
    grams = nums;
  } else {
    const s = Number((specRaw ?? '').replace(/[^\d.]/g, ''));
    if (!Number.isFinite(s) || s <= 0) return '-';
    // 마리 수가 많을수록 한 마리는 가벼움 — 자연스러운 범위 표시를 위해 정렬은 아래서 처리
    grams = nums.map((n) => Math.round((s * 1000) / n));
  }

  const lo = Math.min(...grams);
  const hi = Math.max(...grams);
  if (lo === hi) return `약 ${lo}g`;
  return `약 ${lo}~${hi}g`;
}

/**
 * 규격·미수(상세규격) UI/API 표기: `11kg (42/44미)` 형식.
 * DB 값은 그대로 두고 표시용으로만 접미사를 붙입니다.
 */
export function formatSpecKgMisu(specRaw: string, misuRaw: string): string {
  const specT = specRaw.trim();
  const misuT = misuRaw.trim();
  const spec = specT === "-" ? "" : specT;
  const misu = misuT === "-" ? "" : misuT;

  const specKg =
    spec === ""
      ? ""
      : /kg\s*$/i.test(spec)
        ? spec
        : `${spec}kg`;

  // 미수 값이 이미 "미"로 끝나면(예: "52/54미") 접미사를 또 붙이지 않는다 (중복 "미미" 방지).
  const misuLabel = misu === "" ? "" : misu.endsWith("미") ? misu : `${misu}미`;

  if (specKg && misuLabel) return `${specKg} (${misuLabel})`;
  if (specKg) return specKg;
  if (misuLabel) return `(${misuLabel})`;
  return "-";
}

/** LOT별 재고 등 레코드에서 규격·상세(미수) 필드명 차이를 흡수해 표시 한 줄로 만듭니다. */
export function firstLotStringField(
  fields: Record<string, unknown>,
  keys: readonly string[]
): string {
  for (const key of keys) {
    const v = fields[key];
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

export function formatLotSpecDisplayLine(
  fields: Record<string, unknown>
): string {
  const spec = firstLotStringField(fields, ["규격표시", "규격"]);
  const detail = firstLotStringField(fields, [
    "상세규격_표기",
    "상세규격",
    "미수",
  ]);
  return formatSpecKgMisu(spec, detail);
}
