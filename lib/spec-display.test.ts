import { describe, expect, test } from 'vitest';
import {
  formatSpecKgMisu,
  formatLotSpecDisplayLine,
  formatSpec,
  formatMisu,
  formatSize,
} from './spec-display';

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

describe('formatSpec (단독 컬럼)', () => {
  test('숫자만 → kg 접미', () => {
    expect(formatSpec('11')).toBe('11kg');
  });

  test('이미 kg → 중복 안 붙임', () => {
    expect(formatSpec('11kg')).toBe('11kg');
  });

  test('빈 값/하이픈 → "-"', () => {
    expect(formatSpec('')).toBe('-');
    expect(formatSpec('-')).toBe('-');
  });
});

describe('formatMisu (단독 컬럼)', () => {
  test('숫자만 → 미 접미', () => {
    expect(formatMisu('26')).toBe('26미');
  });

  test('범위 → "42/44미"', () => {
    expect(formatMisu('42/44')).toBe('42/44미');
  });

  test('이미 미로 끝남 → 중복 안 붙임', () => {
    expect(formatMisu('52/54미')).toBe('52/54미');
  });

  test('빈 값/하이픈 → "-"', () => {
    expect(formatMisu('')).toBe('-');
    expect(formatMisu('-')).toBe('-');
  });
});

describe('formatSize (마리당 g)', () => {
  test('단일 미수 → spec(kg)/N으로 g 계산', () => {
    // 11kg / 26마리 = 423.07g/마리
    expect(formatSize('11', '26')).toBe('약 423g');
  });

  test('범위 미수 → 작은~큰 (마리 수 多 → g 少)', () => {
    // 11000/42 = 261.9→262, 11000/44 = 250.0 → 작은값=250, 큰값=262
    expect(formatSize('11', '42/44')).toBe('약 250~262g');
  });

  test('"미" 접미 포함 미수도 처리', () => {
    expect(formatSize('11', '52/54미')).toBe('약 204~212g');
  });

  test('★ 3자리 이상 미수는 이미 g로 간주 (계산 생략)', () => {
    expect(formatSize('11', '300')).toBe('약 300g');
    expect(formatSize('11', '300/400')).toBe('약 300~400g');
    // spec 무관 — g 단위 그대로
    expect(formatSize('', '350')).toBe('약 350g');
  });

  test('범위 단일 값 (300/300) → 단일 표시', () => {
    expect(formatSize('11', '300/300')).toBe('약 300g');
  });

  test('미수 비어있으면 "-"', () => {
    expect(formatSize('11', '')).toBe('-');
    expect(formatSize('11', '-')).toBe('-');
  });

  test('미수 1~2자리인데 spec 없으면 계산 불가 → "-"', () => {
    expect(formatSize('', '26')).toBe('-');
    expect(formatSize('-', '42/44')).toBe('-');
  });

  test('spec에 kg가 붙어있어도 숫자만 파싱', () => {
    expect(formatSize('11kg', '26')).toBe('약 423g');
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
