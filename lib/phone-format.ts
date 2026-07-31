/**
 * 전화번호 입력을 하이픈 형식으로 정규화한다.
 * "01041474071" → "010-4147-4071". 이미 "010-4147-4071"처럼 하이픈이 있어도
 * 숫자만 추출해 같은 자릿수 규칙으로 재구성하므로 결과가 그대로 유지된다.
 *
 * 02(서울) = 2-3-4(9자리) / 2-4-4(10자리), 그 외 지역·휴대폰 = 3-3-4(10자리) / 3-4-4(11자리).
 */
export function formatPhone(raw: string): string {
  const all = (raw ?? "").replace(/\D/g, "");
  if (!all) return "";

  if (all.startsWith("02")) {
    const digits = all.slice(0, 10);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  const digits = all.slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
