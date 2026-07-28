const LOCALE = "ko-KR" as const;

/** 화면 표시용: 정수 천 단위 콤마 */
export function formatIntKo(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.trunc(n).toLocaleString(LOCALE);
}

/**
 * 수량·잔여 등: 정수는 그룹핑, 소수는 최대 3자리까지 정리 후 정수부만 그룹핑.
 */
export function formatQtyKo(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return n.toLocaleString(LOCALE);
  const s = n.toFixed(3).replace(/\.?0+$/, "");
  const [ip, fp] = s.split(".");
  const intNum = Number.parseInt(ip, 10) || 0;
  const intFmt = intNum.toLocaleString(LOCALE);
  return fp != null && fp.length > 0 ? `${intFmt}.${fp}` : intFmt;
}

/**
 * 표(테이블) 숫자 셀 공통 포맷 — 천 단위 콤마 + 단위를 값 뒤에 붙인다(공백 없음).
 *   formatNum(12165160, '원')  → "12,165,160원"
 *   formatNum(1000, '박스')     → "1,000박스"
 *   formatNum(12.34, { unit: '%', decimals: 1 }) → "12.3%"
 *   formatNum(null, { empty: '—' }) → "—"
 *
 * 정렬(우측)·tabular-nums는 표시 쪽 책임 → app/admin/_num-cell.tsx 의 NumCell / NumHead.
 * 소수 옵션이 없으면 반올림한 정수(기존 화면들의 `formatIntKo(Math.round(n))` 동작과 동일).
 */
export type NumFormatOptions = {
  /** 값 뒤에 공백 없이 붙일 단위 (원·박스·kg·일·건·% 등). */
  unit?: string;
  /** 고정 소수 자릿수 (예: 마진율 1 → "12.3%"). */
  decimals?: number;
  /** 소수 최대 자릿수 (끝자리 0 제거). decimals가 있으면 decimals 우선. */
  maxDecimals?: number;
  /** 값 없음(null·undefined·NaN·Infinity) 표시. 기본 "-". */
  empty?: string;
};

export function formatNum(
  value: number | null | undefined,
  unitOrOptions?: string | NumFormatOptions,
): string {
  const opts: NumFormatOptions =
    typeof unitOrOptions === "string" ? { unit: unitOrOptions } : (unitOrOptions ?? {});
  if (value == null || !Number.isFinite(value)) return opts.empty ?? "-";

  let body: string;
  if (opts.decimals != null) {
    body = value.toLocaleString(LOCALE, {
      minimumFractionDigits: opts.decimals,
      maximumFractionDigits: opts.decimals,
    });
  } else if (opts.maxDecimals != null) {
    body = value.toLocaleString(LOCALE, { maximumFractionDigits: opts.maxDecimals });
  } else {
    body = Math.round(value).toLocaleString(LOCALE);
  }
  // -0.4 반올림 등에서 나오는 "-0" / "-0.0" 은 부호 제거
  if (/^-0(?:\.0+)?$/.test(body)) body = body.slice(1);

  return opts.unit ? `${body}${opts.unit}` : body;
}

/**
 * 정수만 (입고·출고 수량 입력창). 콤마 표시, API는 value.
 */
export function fromGroupedIntegerInput(raw: string): { display: string; value: number } {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return { display: "", value: 0 };
  const normalized = digits.replace(/^0+(?=\d)/, "") || "0";
  const v = Number.parseInt(normalized, 10);
  if (!Number.isFinite(v)) return { display: "", value: 0 };
  return { display: v.toLocaleString(LOCALE), value: v };
}

/**
 * 선택적 정수 (수매가). 빈 입력 → value null (미전송).
 */
export function fromGroupedOptionalIntInput(raw: string): {
  display: string;
  value: number | null;
} {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return { display: "", value: null };
  const normalized = digits.replace(/^0+(?=\d)/, "") || "0";
  const v = Number.parseInt(normalized, 10);
  if (!Number.isFinite(v) || v < 0) return { display: "", value: null };
  return { display: v.toLocaleString(LOCALE), value: v };
}

/**
 * 출고 수량 등: 정수부에 콤마, 소수부 최대 3자리(선택).
 */
export function fromGroupedQtyInputAllowDecimal(raw: string): {
  display: string;
  value: number;
} {
  const cleaned = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!cleaned) return { display: "", value: 0 };

  const dot = cleaned.indexOf(".");
  let head: string;
  let tail: string;
  if (dot < 0) {
    head = cleaned;
    tail = "";
  } else {
    head = cleaned.slice(0, dot);
    tail = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 3);
  }

  const trailingDot = dot >= 0 && cleaned.endsWith(".") && tail === "";

  head = head.replace(/^0+(?=\d)/, "");
  if (head === "" && tail === "" && dot < 0) return { display: "", value: 0 };

  if (trailingDot) {
    const intNum = Number.parseInt(head || "0", 10) || 0;
    return {
      display: `${intNum.toLocaleString(LOCALE)}.`,
      value: intNum,
    };
  }

  const intNorm = head === "" && tail !== "" ? "0" : head || "0";
  const norm = tail.length > 0 ? `${intNorm}.${tail}` : intNorm;
  const value = Number.parseFloat(norm);
  if (!Number.isFinite(value)) return { display: "", value: 0 };

  if (norm.includes(".")) {
    const [a, b] = norm.split(".");
    const intNum = Number.parseInt(a || "0", 10) || 0;
    return {
      display: `${intNum.toLocaleString(LOCALE)}.${b}`,
      value,
    };
  }
  const intNum = Number.parseInt(norm, 10) || 0;
  return { display: intNum.toLocaleString(LOCALE), value };
}
