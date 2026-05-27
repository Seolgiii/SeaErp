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
