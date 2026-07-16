import { describe, it, expect } from "vitest";
import {
  DANGA_WON_GROUPS,
  allocateByRatio,
  buildFreezeRows,
  buildInoutRows,
  defaultGroups,
  emptyProd,
  isFeeExemptUse,
  sumByBoxType,
  type ProdRow,
  type StorageFee,
} from "./_shared";

/**
 * Airtable '작업 정산 작업비'.그룹 singleSelect가 가져야 할 옵션 (2026-07-16 확인).
 * 여기 없는 이름을 보내면 저장이 422로 죽는다 — Airtable에 새 옵션 생성 권한이 없어서.
 * 실제로 Airtable 옵션이 '탈팬료'(팬) 오타여서 임시저장이 전부 실패했다 → UI에서 '탈펜료'로 rename.
 *
 * ⚠ 이 테스트는 **코드 내부 일관성만** 검증한다(Airtable에 붙지 않음).
 *    Airtable 쪽 옵션명이 다시 어긋나면 여기서 못 잡고 런타임 422로만 드러난다.
 */
const AIRTABLE_GROUP_CHOICES = [
  "수수료", "노임", "운임", "동결비", "입출고비", "박스", "내피", "탈펜료", "기타",
];

describe("작업비 그룹명 ↔ Airtable 옵션", () => {
  it("defaultGroups가 만드는 그룹명은 전부 Airtable 옵션에 있다", () => {
    for (const g of defaultGroups()) {
      expect(AIRTABLE_GROUP_CHOICES, `그룹 '${g.name}'`).toContain(g.name);
    }
  });

  it("DANGA_WON_GROUPS도 실재하는 그룹명만 가리킨다", () => {
    for (const n of DANGA_WON_GROUPS) {
      expect(AIRTABLE_GROUP_CHOICES, `단가표기 그룹 '${n}'`).toContain(n);
    }
  });
});

describe("allocateByRatio — 화주 배분", () => {
  it("합계는 항상 total과 같다 (반올림으로 박스가 생기거나 사라지지 않음)", () => {
    // 49를 40:40:20 → 19.6/19.6/9.8. 단순 반올림이면 20/20/10 = 50박스(1박스 증발 반대)
    expect(allocateByRatio(49, [40, 40, 20])).toEqual([20, 19, 10]);
    for (const t of [1, 7, 12, 24, 466, 647, 1821, 4391]) {
      expect(allocateByRatio(t, [40, 40, 20]).reduce((a, b) => a + b, 0)).toBe(t);
    }
  });

  it("딱 떨어지면 비율 그대로", () => {
    expect(allocateByRatio(100, [40, 40, 20])).toEqual([40, 40, 20]);
  });

  it("비율이 0인 화주는 0박스", () => {
    expect(allocateByRatio(50, [50, 50, 0])).toEqual([25, 25, 0]);
  });

  it("수량 0 · 비율 합 0이면 전부 0 (0으로 나누지 않음)", () => {
    expect(allocateByRatio(0, [40, 40, 20])).toEqual([0, 0, 0]);
    expect(allocateByRatio(10, [0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("화주 수가 바뀌어도 동작한다 (컬럼 하드코딩 금지 계약)", () => {
    expect(allocateByRatio(10, [50, 50]).reduce((a, b) => a + b, 0)).toBe(10);
    expect(allocateByRatio(10, [25, 25, 25, 25])).toEqual([3, 3, 2, 2]);
  });
});

// 원프로즌 가공 라인의 동결비 이중계상 가드.
// 원프로즌 = 선어를 통에 담아 가공공장으로 보내 거기서 가공·동결 → 그 동결비는 '가공비 단가'에
// 이미 포함돼 가공 거래가 가공원가로 반영한다. 작업 정산에서 또 걷으면 같은 비용을 두 번 문다.

const WAREHOUSE = "sto_warehouse";
const PLANT = "sto_plant";

// 두 보관처 모두 단가는 등록돼 있다 — 제외가 '단가 없음' 때문이 아니라 용도 때문임을 분명히.
const FEES: Record<string, StorageFee> = {
  [WAREHOUSE]: {
    name: "한림수협",
    inOutFee: 400,
    freeze: { 사료팬: 1400, 베이트大: 1200, 베이트小: 1100 },
  },
  [PLANT]: {
    name: "가공공장",
    inOutFee: 400,
    freeze: { 사료팬: 1400, 베이트大: 1200, 베이트小: 1100 },
  },
};

const resolveId = (name: string) =>
  name === "한림수협" ? WAREHOUSE : name === "가공공장" ? PLANT : "";

const row = (patch: Partial<ProdRow>): ProdRow => ({ ...emptyProd(), ...patch });

describe("isFeeExemptUse", () => {
  it("원프로즌 가공만 면제 — 원물동결·생물은 종전대로 걷는다", () => {
    expect(isFeeExemptUse("원프로즌 가공")).toBe(true);
    expect(isFeeExemptUse("원물동결")).toBe(false);
    expect(isFeeExemptUse("생물")).toBe(false);
  });
});

describe("buildFreezeRows — 원프로즌 제외", () => {
  it("원프로즌 라인만 있으면 동결비 행을 만들지 않는다", () => {
    const rows = buildFreezeRows(
      [row({ gubun: "베이트大", qty: "100", dest: "가공공장", use: "원프로즌 가공" })],
      resolveId,
      FEES,
    );
    expect(rows).toEqual([]);
  });

  it("한 정산서에 섞여 있으면 원물동결 박스만 회수에 잡힌다", () => {
    const rows = buildFreezeRows(
      [
        row({ gubun: "베이트大", qty: "100", dest: "한림수협", use: "원물동결" }),
        row({ gubun: "베이트大", qty: "40", dest: "한림수협", use: "원프로즌 가공" }),
      ],
      resolveId,
      FEES,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cells[0]).toBe("100"); // 회수 — 140이면 원프로즌 40박스가 섞인 것
    expect(rows[0].cells[2]).toBe("120,000"); // 100박스 × 1,200원
  });
});

describe("sumByBoxType — 박스는 전 용도 / 탈펜료는 원프로즌 제외", () => {
  // 박스·탈펜료 회수는 이 두 벌로 갈린다([id]/page.tsx). 한 벌로 합치면 둘 중 하나가 틀어진다.
  const prod = [
    row({ gubun: "베이트小", qty: "1000", use: "원물동결" }),
    row({ gubun: "베이트小", qty: "500", use: "원프로즌 가공" }),
    row({ gubun: "사료팬", qty: "450", use: "원물동결" }),
  ];

  it("전 용도 합 — 박스가 쓰는 값", () => {
    expect(sumByBoxType(prod)).toEqual({ 사료팬: 450, 베이트大: 0, 베이트小: 1500 });
  });

  it("원프로즌 제외 합 — 탈펜료가 쓰는 값", () => {
    const ex = sumByBoxType(prod.filter((r) => !isFeeExemptUse(r.use)));
    expect(ex).toEqual({ 사료팬: 450, 베이트大: 0, 베이트小: 1000 });
  });

  it("구분이 비었거나 모르는 값이면 어느 쪽에도 안 잡힌다", () => {
    expect(sumByBoxType([row({ gubun: "", qty: "45" }), row({ gubun: "통", qty: "9" })]))
      .toEqual({ 사료팬: 0, 베이트大: 0, 베이트小: 0 });
  });
});

describe("buildInoutRows — 원프로즌 제외", () => {
  it("원프로즌 라인만 있으면 입출고비 행을 만들지 않는다", () => {
    const rows = buildInoutRows(
      [row({ gubun: "베이트大", qty: "100", dest: "가공공장", use: "원프로즌 가공" })],
      resolveId,
      FEES,
    );
    expect(rows).toEqual([]);
  });

  it("한 정산서에 섞여 있으면 원물동결 박스만 회수에 잡힌다", () => {
    const rows = buildInoutRows(
      [
        row({ gubun: "베이트大", qty: "100", dest: "한림수협", use: "원물동결" }),
        row({ gubun: "베이트大", qty: "40", dest: "한림수협", use: "원프로즌 가공" }),
      ],
      resolveId,
      FEES,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cells[0]).toBe("100");
    expect(rows[0].cells[2]).toBe("40,000"); // 100박스 × 400원
  });

  it("입출고비는 구분(박스종류)이 없어도 걷는다 — 동결비와 달리 박스종류 무관", () => {
    const rows = buildInoutRows(
      [row({ gubun: "", qty: "45", dest: "한림수협", use: "생물" })],
      resolveId,
      FEES,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cells[0]).toBe("45");
  });
});
