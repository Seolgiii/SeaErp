import { describe, expect, test } from "vitest";
import { formatPhone } from "./phone-format";

describe("formatPhone", () => {
  test("하이픈 없는 휴대폰 번호를 010-XXXX-XXXX로 변환한다", () => {
    expect(formatPhone("01041474071")).toBe("010-4147-4071");
  });

  test("이미 하이픈이 있으면 그대로 유지된다", () => {
    expect(formatPhone("010-4147-4071")).toBe("010-4147-4071");
  });

  test("서울 지역번호(02)는 2-4-4로 변환한다", () => {
    expect(formatPhone("0212345678")).toBe("02-1234-5678");
  });

  test("서울 지역번호 9자리는 2-3-4로 변환한다", () => {
    expect(formatPhone("021234567")).toBe("02-123-4567");
  });

  test("10자리 일반 번호는 3-3-4로 변환한다", () => {
    expect(formatPhone("0311234567")).toBe("031-123-4567");
  });

  test("빈 값은 빈 문자열을 반환한다", () => {
    expect(formatPhone("")).toBe("");
  });

  test("입력 중(자릿수 부족)에도 에러 없이 부분 포맷을 반환한다", () => {
    expect(formatPhone("010")).toBe("010");
    expect(formatPhone("0104")).toBe("010-4");
  });
});
