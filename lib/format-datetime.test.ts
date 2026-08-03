import { describe, expect, test } from "vitest";

import { formatKoreanDateTime, formatStamp } from "./format-datetime";

// 기준 '지금' — 2026년. 연도 표기 분기를 결정론적으로 검사하려고 주입한다.
const NOW = new Date("2026-08-03T00:00:00Z");

describe("formatKoreanDateTime", () => {
  test("올해면 연도를 생략한다", () => {
    // 2026-08-03T00:30:00Z = KST 09:30
    expect(formatKoreanDateTime("2026-08-03T00:30:00.000Z", "—", NOW)).toBe("8월 3일 09시 30분");
  });

  test("올해가 아니면 연도를 붙인다", () => {
    expect(formatKoreanDateTime("2025-12-04T00:30:00.000Z", "—", NOW)).toBe(
      "2025년 12월 4일 09시 30분",
    );
  });

  test("월·일은 앞 0을 떼고 시·분은 붙인다", () => {
    // 자릿수를 섞는 건 의도된 것 — 목록에서 시각 부분이 세로로 맞아야 읽힌다.
    expect(formatKoreanDateTime("2026-01-05T00:05:00.000Z", "—", NOW)).toBe("1월 5일 09시 05분");
  });

  test("UTC 자정 직전 값도 KST로 넘겨 읽는다 (날짜가 하루 밀린다)", () => {
    // 이 케이스가 시각대 고정의 존재 이유다. 로컬 시각대로 포맷하면
    // Vercel(UTC)은 '8월 2일 23시', 사용자 브라우저(KST)는 '8월 3일 08시'로 갈린다.
    expect(formatKoreanDateTime("2026-08-02T23:00:00.000Z", "—", NOW)).toBe("8월 3일 08시 00분");
  });

  test("빈 값·파싱 실패는 empty를 그대로 돌려준다", () => {
    expect(formatKoreanDateTime("", "—", NOW)).toBe("—");
    expect(formatKoreanDateTime(null, "—", NOW)).toBe("—");
    expect(formatKoreanDateTime(undefined, "—", NOW)).toBe("—");
    expect(formatKoreanDateTime("아무말", "—", NOW)).toBe("—");
    expect(formatKoreanDateTime("", "없음", NOW)).toBe("없음");
  });
});

describe("formatStamp", () => {
  test("일시와 이름을 가운뎃점으로 잇는다", () => {
    expect(formatStamp("2026-08-03T00:30:00.000Z", "QA테스트")).toMatch(/^8월 3일 .+ · QA테스트$/);
  });

  test("이름만 있으면 이름만 (일시 없는 옛 레코드)", () => {
    // 2026-08-03 이전 레코드는 작성일시가 비어 있다 — 이름이라도 보여준다.
    expect(formatStamp("", "QA테스트")).toBe("QA테스트");
  });

  test("일시만 있으면 일시만", () => {
    expect(formatStamp("2026-08-03T00:30:00.000Z", "")).toMatch(/^8월 3일 /);
  });

  test("둘 다 없으면 empty", () => {
    expect(formatStamp("", "")).toBe("—");
    expect(formatStamp(null, null, "기록 없음")).toBe("기록 없음");
  });

  test("이름의 앞뒤 공백은 값으로 치지 않는다", () => {
    expect(formatStamp("", "   ")).toBe("—");
  });
});
