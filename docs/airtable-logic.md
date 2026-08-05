# Airtable formula · Automation

이 문서는 PostgreSQL 이전 시 재구현 대상 목록이다. Airtable formula·Automation은 저장소 밖이라 git·테스트·감사가 보지 못한다.

조회일: 2026-08-05 · base `appUY0ZQ5L67FzySd` · MCP 실물 조회

수식은 Airtable이 반환한 **원문 그대로**다. 줄바꿈·공백·필드 ID 표기를 손대지 않았다.
필드 ID는 사람이 읽을 수 없으므로 각 항목 아래에 **ID → 필드명 대응표**를 붙였다(수식 자체의 요약이 아니다).

---

## 1. formula 필드 (7개)

### 1-1. LOT별 재고 · `총중량` (`fldYAayZUnIFNnKn3`)

테이블 `LOT별 재고` (`tblOIopD8g6eE9WK3`) · 결과 number(precision 0)

```
IF(
  AND({fldhPrqPTtVamcpjG}, {fldYUJF7NjIgTvtYE}),
  VALUE({fldhPrqPTtVamcpjG} & "") * {fldYUJF7NjIgTvtYE},
  0
)
```

| 필드 ID | 필드명 |
|---|---|
| `fldhPrqPTtVamcpjG` | 규격 |
| `fldYUJF7NjIgTvtYE` | 입고수량(BOX) |

**코드에서 읽는 곳**
- `app/actions/admin/master-lots.ts:69`
- `app/actions/admin/admin.ts:728`
- `lib/airtable-schema.ts:75` (`totalWeight`)
- `lib/cost-calc.ts:38` (타입 주석)

---

### 1-2. LOT별 재고 · `단가` (`fldrFIfvvfsnWas2u`)

테이블 `LOT별 재고` (`tblOIopD8g6eE9WK3`) · 결과 number(precision 0) · 필드 설명 "kg당"

```
IF(
  AND({fldxO9zXNSK1FoIsl}, {fldYUJF7NjIgTvtYE}, {fldYAayZUnIFNnKn3}, {fldYAayZUnIFNnKn3} > 0),
  {fldxO9zXNSK1FoIsl} * {fldYUJF7NjIgTvtYE} / {fldYAayZUnIFNnKn3},
  0
)
```

| 필드 ID | 필드명 |
|---|---|
| `fldxO9zXNSK1FoIsl` | 수매가 |
| `fldYUJF7NjIgTvtYE` | 입고수량(BOX) |
| `fldYAayZUnIFNnKn3` | 총중량 (formula, 1-1) |

**코드에서 읽는 곳**: 없음.
`"단가"`로 검색되는 코드는 전부 다른 테이블의 동명 필드다 — `가공비 단가.단가`(`master-processing-rates.ts:70`) · `부자재·경비 마스터.단가`(`master-materials.ts:60`) · `작업 정산 작업비.단가`(`master-work-settlement.ts:835`) · `master-processing.ts:159`.

---

### 1-3. LOT별 재고 · `판매원가` (`fldhUS4qzcZ5u38hk`)

테이블 `LOT별 재고` (`tblOIopD8g6eE9WK3`) · 결과 number(precision 0)

```
IF(
  AND({fldxO9zXNSK1FoIsl}, {fldYAayZUnIFNnKn3}, {fldYAayZUnIFNnKn3} > 0),
  ({fldxO9zXNSK1FoIsl} * {fldYUJF7NjIgTvtYE} / {fldYAayZUnIFNnKn3})
  + IF(
      AND(IF({fldHWsL7Yh4UJC3kd}, {fldHWsL7Yh4UJC3kd}, {fld8nQwhLomCkggdd}), {fldEyIMXsaGfFlXyy}, {fldEyIMXsaGfFlXyy} > 0),
      DATETIME_DIFF(TODAY(), IF({fldHWsL7Yh4UJC3kd}, {fldHWsL7Yh4UJC3kd}, {fld8nQwhLomCkggdd}), 'days') * {fldEyIMXsaGfFlXyy} * {fldYUJF7NjIgTvtYE} / {fldYAayZUnIFNnKn3},
      0
    )
  + ({fldm9nGUv4llShZOI} + {fld7eWKkjJBCLKj0R} + {fldt3CwYfqJi0q8bH}) * {fldYUJF7NjIgTvtYE} / {fldYAayZUnIFNnKn3}
  + ({fldsTp7vrv6jMm9nY} + {fldDrwvdVWxthYcN6} + {fldOAHTbyBU7treLI} + {fldrGNBGrH6u60q3B}) / {fldYAayZUnIFNnKn3},
  0
)
```

| 필드 ID | 필드명 |
|---|---|
| `fldxO9zXNSK1FoIsl` | 수매가 |
| `fldYAayZUnIFNnKn3` | 총중량 (formula, 1-1) |
| `fldYUJF7NjIgTvtYE` | 입고수량(BOX) |
| `fldHWsL7Yh4UJC3kd` | 이동입고일 |
| `fld8nQwhLomCkggdd` | 최초입고일 |
| `fldEyIMXsaGfFlXyy` | 냉장료단가 |
| `fldm9nGUv4llShZOI` | 입출고비 |
| `fld7eWKkjJBCLKj0R` | 노조비 |
| `fldt3CwYfqJi0q8bH` | 동결비 |
| `fldsTp7vrv6jMm9nY` | 이월냉장료 |
| `fldDrwvdVWxthYcN6` | 이월입출고비 |
| `fldOAHTbyBU7treLI` | 이월노조비 |
| `fldrGNBGrH6u60q3B` | 이월동결비 |

**코드에서 읽는 곳**
- `app/components/stock-status-shared.ts:40` (`salePrice`)
- `lib/airtable-schema.ts:88` (`salePrice`)
- `app/admin/master/ops/wiki/page.tsx:104,285` (용어 위키 표시)

**이전 시 주의** — 이 수식은 `TODAY()`를 쓴다. 저장된 값이 아니라 **조회 시점마다 재계산되는 값**이다.

---

### 1-4. LOT별 재고 · `누적냉장료` (`fldstEUTKCovVihqZ`)

테이블 `LOT별 재고` (`tblOIopD8g6eE9WK3`) · 결과 number(precision 0)

```
IF(
  AND(IF({fldHWsL7Yh4UJC3kd}, {fldHWsL7Yh4UJC3kd}, {fld8nQwhLomCkggdd}), {fldEyIMXsaGfFlXyy}, {fldEyIMXsaGfFlXyy} > 0),
  DATETIME_DIFF(TODAY(), IF({fldHWsL7Yh4UJC3kd}, {fldHWsL7Yh4UJC3kd}, {fld8nQwhLomCkggdd}), 'days') * {fldEyIMXsaGfFlXyy},
  0
)
```

| 필드 ID | 필드명 |
|---|---|
| `fldHWsL7Yh4UJC3kd` | 이동입고일 |
| `fld8nQwhLomCkggdd` | 최초입고일 |
| `fldEyIMXsaGfFlXyy` | 냉장료단가 |

**코드에서 읽는 곳**
- `app/actions/inventory/transfer.ts:352` (`refrigerationCostAccum`)
- `lib/cost-calc.ts:212` (타입 주석)

**이전 시 주의** — 1-3과 같은 `TODAY()` 의존.

---

### 1-5. 출고 관리 · `실출고수량` (`fld1deHWMO0Pz1Hik`)

테이블 `출고 관리` (`tblxMY70YesbgOdrB`) · 결과 number(precision 0)

```
IF({fldxRcyn9qFsiQNwZ}='반려', 0, {fldSEw03AURKo6qsv})
```

| 필드 ID | 필드명 |
|---|---|
| `fldxRcyn9qFsiQNwZ` | 승인상태 |
| `fldSEw03AURKo6qsv` | 출고요청수량 |

**코드에서 읽는 곳**
- `app/actions/admin/master-transactions.ts:682` — ⚠ 아래 §3-1 참조

---

### 1-6. 출고 관리 · `판매금액` (`fld8k79yljDgwq06L`)

테이블 `출고 관리` (`tblxMY70YesbgOdrB`) · 결과 number(precision 0)

```
{fldcoJMKBEKPtboW4} * {fldSEw03AURKo6qsv}
```

| 필드 ID | 필드명 |
|---|---|
| `fldcoJMKBEKPtboW4` | 판매가 |
| `fldSEw03AURKo6qsv` | 출고요청수량 |

**코드에서 읽는 곳**
- `app/actions/admin/admin.ts:724` (`saleAmount` — 출고 승인 시 손익 스냅샷)
- `lib/daily-report.ts:343` (일일 정산 메일 매출 합계)
- `app/actions/admin/master-transactions.ts:684` (출고 이력 합계)
- `app/admin/master/transactions/outbound/page.tsx:144` (CSV 헤더)
- `lib/airtable-schema.ts:177` (`saleAmount`) · `lib/cost-calc.ts:58` (타입 주석)

---

### 1-7. 사용자 · `RECORD` (`fld9AOyagvT40NACm`)

테이블 `사용자` (`tblFfYyiQqxK1kxys`) · 결과 singleLineText

```
RECORD_ID()
```

**코드에서 읽는 곳**: 없음.

---

## 2. Automation (5개 — 배포 3 / 미배포 2)

전부 `updateRecord` 또는 `findRecords` 단일 노드다. 스크립트 액션은 없다.

### 2-1. `Automation 1 : 식대` (`wfleXsCYrE2uWadWq`) — **deployed**

트리거 `recordMatchesConditions` · 테이블 `지출결의` (`tbl0nHpKrY7kq0jh1`)

조건(OR):
```
isEmpty({fldfDZiduBaVMJs0X})
contains({fldYhhydNgQGdQRBB}, "점심")
contains({fldYhhydNgQGdQRBB}, "커피")
contains({fldYhhydNgQGdQRBB}, "식사")
contains({fldYhhydNgQGdQRBB}, "저녁")
```

액션 `updateRecord` (`wacsPJVGoOmt7a0jY`) — 트리거 레코드 자신에게:
```
fldfDZiduBaVMJs0X = selrBrKLWGKiLr5kB
```

| ID | 이름 |
|---|---|
| `fldfDZiduBaVMJs0X` | 지출결의.카테고리 |
| `fldYhhydNgQGdQRBB` | 지출결의.자동화_분류원문 |
| `selrBrKLWGKiLr5kB` | 카테고리 선택지 `식대` |

### 2-2. `Automation 2 : 유류비` (`wflNLd16fgBWBAB88`) — **deployed**

트리거 `recordMatchesConditions` · 테이블 `지출결의` (`tbl0nHpKrY7kq0jh1`)

조건(OR):
```
isEmpty({fldfDZiduBaVMJs0X})
contains({fldYhhydNgQGdQRBB}, "주유소")
contains({fldYhhydNgQGdQRBB}, "기름")
contains({fldYhhydNgQGdQRBB}, "주유")
contains({fldYhhydNgQGdQRBB}, "충전")
```

액션 `updateRecord` (`wacPiv9qJUSTXv4nh`):
```
fldfDZiduBaVMJs0X = seldbOfiXQOlW0954     (= 카테고리 '유류비')
```

### 2-3. `Automation 3 : 소모품비` (`wflAa6SqDUphY3Pyg`) — **deployed**

트리거 `recordMatchesConditions` · 테이블 `지출결의` (`tbl0nHpKrY7kq0jh1`)

조건(OR):
```
isEmpty({fldfDZiduBaVMJs0X})
contains({fldYhhydNgQGdQRBB}, "비품")
contains({fldYhhydNgQGdQRBB}, "문구")
contains({fldYhhydNgQGdQRBB}, "인천문화당")
```

액션 `updateRecord` (`wacVW5Kbtuhy8vhtm`):
```
fldfDZiduBaVMJs0X = selsnAs2PnvM1kVqc     (= 카테고리 '소모품비')
```

### 2-4. `Automation 1` (`wfllOP195RUReQLoS`) — **undeployed**

트리거 `recordMatchesConditions` · 테이블 `입고 관리` (`tbl0Uish1tcDAf6Lu`)

조건(AND):
```
{fld0ZwTEcFpUChGQS} = selTgcSAWXqcE3ZCm
```
(`fld0ZwTEcFpUChGQS` = 입고 관리.승인상태 / `selTgcSAWXqcE3ZCm` = 선택지 `승인 완료`)

액션 `findRecords` (`wacNpRhiBVQHApUVQ`) · 대상 테이블 `LOT별 재고` (`tblOIopD8g6eE9WK3`) · limit 1000
```
{fldpI39PWNU6DIR9Z} =        (피연산자 1개 — 비교 대상이 비어 있음)
```

배포되지 않았고 조건도 미완성이다.

### 2-5. `Automation 2` (`wfltZQyig6SytPgqF`) — **undeployed**

트리거 없음 · 노드 없음. 빈 껍데기.

---

## 3. 필드 설명 ↔ 실제 동작 대조 — 어긋난 것

### 3-1. ⚠ `실출고수량`이 반려 시 0으로 만든 값을 코드가 되돌린다

`app/actions/admin/master-transactions.ts:682`
```js
const qty = num(f["실출고수량"]) || num(f["출고요청수량"]);
```

formula(1-5)는 승인상태가 `반려`면 **의도적으로 0**을 낸다. 그런데 JS `||`가 `0`을 falsy로 보고 `출고요청수량`으로 폴백해, **반려된 출고의 신청 수량이 되살아난다.**

같은 블록 `:684`의 `saleTotal`도 이어서 그 `qty`를 쓴다. 그리고 바로 아래(`:686`)가 `byStatus[approvalStatus]`로 **반려를 포함한 상태 히스토그램**을 만들고 있으므로, 이 루프에 반려 레코드가 들어온다는 뜻이다.

영향 범위: 출고 이력 화면의 수량 합계·판매금액 합계.
**미확인**: 이 집계가 화면에서 실제로 반려를 포함해 보여주는지, 상위에서 거르는지는 확인하지 않았다.

### 3-2. ⚠ `판매금액` formula가 반려를 거르지 않는다 — `실출고수량`과 비대칭

`실출고수량`(1-5)은 반려 시 0인데, `판매금액`(1-6)은 같은 `출고요청수량`을 쓰면서 **반려 조건이 없다.** 반려된 출고도 판매금액이 그대로 남는다.

`lib/daily-report.ts:343-345`가 이 값을 **반려 여부를 보지 않고** 매출 합계에 더한다.
```js
const saleAmount = num(item.raw["판매금액"]);
const salePrice  = num(item.raw["판매가"]);
const qty        = num(item.raw["출고요청수량"]);
salesTotal += saleAmount > 0 ? saleAmount : salePrice * qty;
```
폴백 경로도 `실출고수량`이 아니라 `출고요청수량`이라 어느 쪽으로 가도 반려가 안 걸러진다.

**미확인**: 일일 정산 메일 쿼리가 상위에서 반려를 거르는지 확인하지 않았다.

### 3-3. `판매금액` 필드 설명이 없어진 필드를 가리킨다

현재 설명: *"판매가 × 출고수량 (자동 계산). **출고 승인 시 출고시점 판매금액으로 스냅샷.**"*

`출고 관리`에 `출고시점 판매금액` 필드는 **없다**(현재 출고시점 필드는 단가·냉장료·입출고비·노조비·동결비·판매원가·손익 7종). currency 컬럼이 제거되고 이 formula로 대체됐는데 설명만 남았다.

또 "출고수량"은 2026-05-18에 `출고요청수량`으로 rename된 옛 이름이다.

### 3-4. 지출결의 `카테고리`에 **이름이 빈 선택지**가 하나 있다

```
식대 / 소모품비 / 원자재 매입 / 유류비 / 기타 / ""   ← selVZeMSn2jiuxYKy, name 빈 문자열
```

Automation 3종이 전부 `isEmpty({카테고리})`를 OR 조건에 넣고 있어, 이 빈 이름 선택지가 들어간 레코드가 `isEmpty`로 잡히는지 아닌지에 따라 자동 분류 동작이 갈린다. **미확인** — 이 선택지를 쓰는 레코드가 있는지 세지 않았다.

### 3-5. Automation 3종의 조건이 서로 겹친다

셋 다 첫 조건이 `isEmpty({카테고리})`다. 카테고리가 비어 있는 레코드는 **세 Automation 모두의 조건을 만족**한다. 실행 순서에 따라 최종 카테고리가 달라진다(마지막에 실행된 것이 이긴다).

키워드 조건이 아니라 이 `isEmpty`가 fallback으로 들어가 있어서 생긴 구조다. **미확인** — Airtable이 동시 트리거를 어떤 순서로 처리하는지 확인하지 않았다.

### 이상 없음으로 확인한 것

| 필드 | 설명 | formula | 판정 |
|---|---|---|---|
| 출고 관리.`실출고수량` | "승인상태가 '반려'면 0, 그 외는 출고수량 그대로" | `IF({승인상태}='반려', 0, {출고요청수량})` | ✅ 일치 |
| LOT별 재고.`단가` | "kg당" | `수매가 × 입고박스 ÷ 총중량` → 원/kg | ✅ 일치 |
| LOT별 재고.`판매원가`·`누적냉장료` | (설명 없음) | 둘 다 `IF({이동입고일}, {이동입고일}, {최초입고일})` 기준일 | ✅ CLAUDE.md 「LOT」 규칙과 일치 |

---

## 4. 이 문서의 범위 밖

- **lookup / rollup 필드** — formula가 아니라 링크 참조라 여기 넣지 않았다. `입고 관리.LOT번호`·`품목명`, `출고 관리.LOT번호`·`품목명`, `LOT별 재고.품목구분`, `지출결의.소속`·`직급` 등이 있다. 이전 시에는 JOIN으로 바뀔 대상이다.
- **Airtable Interface** — 조회하지 않았다.
- **Airtable 뷰 필터·정렬** — 조회하지 않았다. 코드는 `filterByFormula`로 직접 거르므로 뷰에 의존하지 않는 것으로 보이나 확인하지 않았다.
