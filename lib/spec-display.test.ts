import { describe, expect, test } from 'vitest';
import { formatSpecKgMisu, formatLotSpecDisplayLine } from './spec-display';

describe('formatSpecKgMisu', () => {
  test('규격 + 미수: "11kg (42/44미)"', () => {
    expect(formatSpecKgMisu('11', '42/44')).toBe('11kg (42/44미)');
  });

  test('★미수가 이미 "미"로 끝나면 중복 안 붙인다 (52/54미 → 미미 방지)', () => {
    expect(formatSpecKgMisu('11', '52/54미')).toBe('11kg (52/54미)');
  });

  test('규격에 이미 kg가 있으면 중복 안 붙인다', () => {
    expect(formatSpecKgMisu('11kg', '26')).toBe('11kg (26미)');
  });

  test('규격만 있으면 규격만', () => {
    expect(formatSpecKgMisu('11', '')).toBe('11kg');
  });

  test('미수만 있으면 미수만', () => {
    expect(formatSpecKgMisu('', '26')).toBe('(26미)');
  });

  test('미수만 + 이미 "미"로 끝남', () => {
    expect(formatSpecKgMisu('', '150미')).toBe('(150미)');
  });

  test('둘 다 비거나 "-"이면 "-"', () => {
    expect(formatSpecKgMisu('', '')).toBe('-');
    expect(formatSpecKgMisu('-', '-')).toBe('-');
  });
});

describe('formatLotSpecDisplayLine', () => {
  test('미수 필드가 이미 "미"로 끝나도 중복 안 됨', () => {
    expect(formatLotSpecDisplayLine({ 규격: '11', 미수: '52/54미' })).toBe('11kg (52/54미)');
  });

  test('상세규격_표기를 미수보다 우선 사용', () => {
    expect(formatLotSpecDisplayLine({ 규격: '13', 상세규격_표기: '100' })).toBe('13kg (100미)');
  });
});
