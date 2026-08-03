# STYLE-MIGRATION.md

`CLAUDE.md`의 "스타일 정리 원칙 (점진적 적용)" 진행 관리 파일이다.
일괄 치환 대상 목록이 아니라, **다른 작업으로 파일을 열 때 함께 정리**하기 위한 체크리스트다.

## 사용법

- 어떤 이유로든 아래 목록의 파일을 열어 수정하게 되면, `CLAUDE.md`의 적용 범위·제외 규칙에 맞는 곳만 함께 정리한다.
- 정리를 마치면 체크(`[x]`)하고, 괄호 안 개수를 실제 정리한 개수로 갱신한다(전량 정리 못 했으면 잔여 개수를 남긴다).
- **⚠ 표시 파일은 정리 대상이 30곳을 넘는다.** CLAUDE.md 규칙상 임의로 진행하지 말고 먼저 사용자에게 확인한다.
- 새로 발견한 하드코딩은 이 목록에 없어도 같은 방식으로 정리하고, 파일이 없으면 항목을 추가한다.

## 집계 기준

2026-07-31 정적 검색 기준(코드 미수정, 조사만):

- **사이즈** — `text-[Npx]` 형태의 Tailwind 임의값
- **색상** — `bg-[#hex]` / `text-[#hex]` / `border-[#hex]` 형태의 Tailwind 임의값

인라인 `style`의 색상·폰트·크기 지정, 폰트명 직접 지정은 이 정적 검색에 안 잡힌다(패턴이 다양해 자동 집계가 어려움) — 파일을 열었을 때 눈으로 같이 확인한다.

**플레인 CSS도 안 잡힌다(2026-08-03 발견).** 작업 정산 3화면은 Tailwind가 아니라 `_shared.ts`의
`WS_CSS` 템플릿 리터럴 + 페이지별 `<style>` 블록으로 스타일을 준다(`.ws-page` 접두사).
`font-size:13px` / `color:#6A7480` 형태라 `text-[13px]` / `text-[#…]` 정규식에 하나도 걸리지
않았고, 그래서 아래 57개 목록에 **아예 없었다.** 자체 팔레트(`--ink`/`--muted`/`--accent` 19종)와
자체 타입 스케일을 따로 굴리던 가장 큰 단일 부채였는데 집계에서 빠져 있었던 셈이다.
같은 형태가 또 있는지는 `grep -l "<style" app/**/*.tsx`로 확인한다.

**제외 대상**(`CLAUDE.md` 고정, 목록에 없음 — 애초에 이 검색 패턴에 해당 사항 없음):
`<col style={{width}}>` 사용처, `lib/generate-pdf.server.tsx`, `components/ExpensePDF.tsx`(별도 렌더링 엔진), `lib/daily-report.ts`(이메일 클라이언트용). 이 셋은 Tailwind 클래스 자체를 안 쓰는 렌더러라 아래 검색에 원래 걸리지 않았다.

## 진행 현황

전체 **61개 파일 · 934곳** · 완료 **8파일 · 210곳**

> 2026-08-03에 작업 정산 4파일(118곳)을 목록에 추가했다 — 위 「집계 기준」의 플레인 CSS
> 사각지대에 걸려 원래 57파일·816곳 집계에 없던 파일들이다.

> **집계가 실제보다 적다.** 2026-07-31 실제 정리에서 파일마다 집계 밖 항목이 나왔다.
> 정적 검색 정규식이 `border-t/l/r/b-[#…]`·`ring-[#…]`를 빼먹었고, Tailwind **기본** 크기 클래스
> (`text-lg` 18px 등)는 임의값이 아니라 아예 대상이 아니었는데 스케일 위반은 똑같다.
> 남은 파일도 표의 숫자보다 몇 곳 더 나온다고 보는 게 맞다.

> **검증 방법(2026-07-31 신설).** 브라우저를 띄워 실제 렌더링을 측정한다 — 타입 스케일 밖 폰트,
> 컬럼 넘침, 헤더 중앙 쏠림, 가로 스크롤. 13→14px 확대가 컬럼을 깨뜨리는지 눈이 아니라 수치로 잡는다.
> (측정 스크립트는 세션 임시본이라 저장소에 없다.)
>
> **측정 항목 3종 추가(2026-08-03).** 작업 정산 검증에서 쓴 것 — 남겨두면 다음 화면에서 재사용한다.
> ① `th.scrollWidth > th.clientWidth`로 **헤더 잘림**을 직접 판정한다(폭 비교보다 확실하다).
> ② `.ws-page *`의 `getComputedStyle().fontFamily`를 Set으로 모아 **1종인지** 확인한다(§3).
> ③ `boxShadow !== 'none'`인 요소를 세어 장식 그림자 잔존을 잡는다(§2-6).
> WSL에서 브라우저가 안 뜨면 `sudo npx playwright install-deps chromium`(libnss3·libnspr4·libasound2).

---

### ⚠ 30곳 초과 — 정리 전 먼저 확인 (9개 파일)

- [x] `app/admin/master/work-settlement/_shared.ts` — 75곳 정리 완료 (색상 30 · 사이즈 43 · 폰트명 2) · 잔여 7
      ※ 사용자 지시로 30곳 초과 예외 진행(2026-08-03). `WS_CSS`는 등록·상세·배분 **3화면 공유**라 한 번에 셋이 바뀐다.
      ※ 로컬 변수 **이름은 유지하고 값만** 토큰에 맞췄다(`--ink`→`--text` 값 등). 이름까지 바꾸려면 `var()` 참조 200곳을 함께 고쳐야 한다.
      ※ 잔여 7 = `.ws-combo-portal`/`.ws-combo-opt` 5곳(`document.body` 포털이라 `.ws-page` 스코프 밖 → 로컬 `var()` 사용 불가, DESIGN §6-5) + 채움 위 흰 글자 `#fff` 2곳(정당).
      ※ 동반 변경: 소수점 px 8곳 제거(15.5·13.5·12.5×2·11.5×2·10.5×3, §3 금지) / 표 본문 13→14 · 표 헤더 11→14(`--t-table-head`) / `font-family` 선언 2곳 삭제(§3 "전역 폰트는 하나") / 장식 `box-shadow` 3곳 삭제(§2-6) / `--faint` 오용 10곳을 `--muted`로(§2-2 "정보를 담은 텍스트에 쓰지 않는다").
      ※ **실측(Chromium 1440·1280px, 3화면)**: 스케일 밖 폰트 0 · `fontFamily` 1종 · 잔존 그림자 0 · 페이지 가로 스크롤 0 · 잘린 헤더 0 · 잘린 셀 0. **폰트 확대에도 `min-width` 재계산은 불필요했다** — `#prod` 자연폭이 1120px으로 기존 하드코딩값과 일치. 근거는 `_shared.ts` `#prod` 규칙 위 주석에 남겼다.
- [x] `app/admin/master/work-settlement/[id]/split/page.tsx` — 34곳 정리 완료 (색상 23 · 사이즈 11) · 잔여 0
      ※ 사용자 지시로 30곳 초과 예외 진행(2026-08-03). 페이지 자체 `<style>`은 `.ws-page` 안쪽이라 `_shared.ts`가 선언한 로컬 `var()`를 그대로 쓰게 바꿨다(hex 0).
      ※ **대비 미달 실수정**: `#8A9099`(흰 배경 3.22)가 비고·빈 상태·단위 문구에 쓰이고 있었다 → `--muted`(5.36). §2-4 미달이라 §0 "발견 즉시" 예외.
- [ ] `app/inventory/outbound/page.tsx` — 53곳 (사이즈 33 · 색상 20)
- [ ] `app/admin/master/lot-timeline/page.tsx` — 51곳 (사이즈 41 · 색상 10)
- [ ] `app/inventory/transfer/page.tsx` — 49곳 (사이즈 32 · 색상 17)
- [ ] `app/inventory/record/page.tsx` — 43곳 (사이즈 35 · 색상 8)
- [ ] `app/admin/master/approval/inbox/page.tsx` — 39곳 (사이즈 27 · 색상 12)
- [ ] `app/my-requests/page.tsx` — 35곳 (사이즈 24 · 색상 11)
- [x] `app/admin/master/ops/wiki/page.tsx` — 34곳 정리 완료 (사이즈 30 · 색상 4) · 잔여 0
      ※ 사용자 지시로 30곳 초과 예외 진행(2026-07-31). 집계 32곳 대비 +2 — `ring-[#3182F6]` 1곳(정규식 밖)과 `text-lg` 1곳(Tailwind 기본 클래스라 임의값 검색에 안 잡힘, 18px로 스케일 밖).
      ※ 크기 변경 동반: h1 22→20, 소수점 px 3곳(11.5→11)·1곳(12.5→12) 해소(§3 금지), 13→14, 10→11, 15→16(카드 제목 역할), 18→16.

### 체크리스트 (52개 파일, 개수 많은 순)

- [x] `app/admin/master/work-settlement/[id]/page.tsx` — 5곳 정리 완료 (색상 3 · 사이즈 2) · 잔여 0
      ※ 인라인 `style` 뿐. 권한 오류 블록은 `.ws-page` 밖이라 로컬 `var()`가 없어 Tailwind 토큰 클래스로 바꿨다.
- [x] `app/admin/master/work-settlement/new/page.tsx` — 4곳 정리 완료 (색상 2 · 사이즈 2) · 잔여 0
      ※ 위와 동일한 권한 오류 블록. 안내 문구가 `#9AA4B0`(= `--text-faint`, 대비 2.61)이었다 → `text-text-muted`.

- [ ] `app/admin/master/layout.tsx` — 29곳 (사이즈 12 · 색상 17)
- [ ] `app/admin/dashboard/page.tsx` — 29곳 (사이즈 18 · 색상 11)
- [ ] `app/admin/master/page.tsx` — 28곳 (사이즈 11 · 색상 17)
- [ ] `app/admin/master/cost/profit-trend/page.tsx` — 23곳 (사이즈 1 · 색상 22)
- [x] `app/admin/master/inventory-summary/page.tsx` — 23곳 정리 완료 (사이즈 11 · 색상 12) · 잔여 0
      ※ 집계엔 22곳이었으나 `border-t-[#3182F6]` 1곳이 정적 검색 정규식(`border-[#…`)에 안 잡혀 있었다. 다른 파일에도 `border-t/l/r/b-[#…`가 있을 수 있다.
      ※ 크기 변경 동반: h1 22→20px(`text-page`), 표 본문 13→14px(`text-body`), 표 헤더 12→14px(`text-table-head`), 빈 상태 15→14px. 굵기도 토큰값을 따라 내려갔다(font-black/bold 제거).
- [ ] `components/WorkerPinLoginDesktop.tsx` — 21곳 (사이즈 15 · 색상 6)
- [ ] `app/components/StockStatusForm.tsx` — 18곳 (사이즈 15 · 색상 3)
- [ ] `app/admin/master/health/page.tsx` — 18곳 (사이즈 16 · 색상 2)
- [ ] `app/admin/master/processing/page.tsx` — 18곳 (사이즈 16 · 색상 2)
- [ ] `components/WorkerPinLogin.tsx` — 16곳 (사이즈 10 · 색상 6)
- [x] `app/admin/master/work-settlement/page.tsx` — 18곳 정리 완료 (사이즈 12 · 색상 6) · 잔여 0
      ※ 집계 16곳 대비 +2 — `border-t-[#…]`×2가 정규식 밖이었다.
      ※ 행 액션 링크가 `#3182F6`(흰 배경 대비 3.71, §2-4 미달)이었다 → `text-link`(#1C6CE0)로 교체.
- [ ] `app/inventory/lot/[lotNumber]/page.tsx` — 15곳 (사이즈 10 · 색상 5)
- [ ] `app/page.tsx` — 14곳 (사이즈 10 · 색상 4)
- [ ] `app/admin/master/cost/purchase-stats/page.tsx` — 14곳 (사이즈 2 · 색상 12)
- [ ] `app/components/StockStatusSummary.tsx` — 13곳 (사이즈 12 · 색상 1)
- [ ] `app/lot/[lotNumber]/page.tsx` — 13곳 (사이즈 10 · 색상 3)
- [ ] `app/components/ApprovalCard.tsx` — 13곳 (사이즈 6 · 색상 7)
- [x] `app/admin/master/materials/page.tsx` — 17곳 정리 완료 (사이즈 10 · 색상 7) · 잔여 0
      ※ 집계 13곳 대비 +4 — `border-t-[#…]`×2·`ring-[#…]`·`accent-[#…]`가 정규식 밖이었다. `bg-[#1c6ce0]`는 accent-fill-hover 값을 직접 적어둔 것.
      ※ 잔여(정리 안 함): Tailwind 기본 `text-sm`×3·`text-xs`×1 — 14/12px이라 스케일 안이고 임의값도 아니라 대상 밖. 토큰 통일을 원하면 별도 판단.
- [ ] `app/components/StockStatusResults.tsx` — 12곳 (사이즈 11 · 색상 1)
- [ ] `app/admin/ledger/page.tsx` — 12곳 (사이즈 9 · 색상 3)
- [ ] `app/components/OutboundCartSheet.tsx` — 11곳 (사이즈 9 · 색상 2)
- [ ] `app/admin/master/transactions/outbound/page.tsx` — 11곳 (사이즈 2 · 색상 9)
- [ ] `app/admin/master/transactions/expense/page.tsx` — 11곳 (사이즈 2 · 색상 9)
- [ ] `app/admin/master/transactions/inbound/page.tsx` — 11곳 (사이즈 2 · 색상 9)
- [ ] `app/components/TransferCartSheet.tsx` — 10곳 (사이즈 8 · 색상 2)
- [ ] `app/admin/master/transactions/transfer/page.tsx` — 10곳 (사이즈 2 · 색상 8)
- [ ] `app/admin/master/processing/new/page.tsx` — 10곳 (사이즈 5 · 색상 5)
- [ ] `app/error.tsx` — 8곳 (사이즈 5 · 색상 3)
- [ ] `app/components/ConfirmBottomSheet.tsx` — 8곳 (사이즈 4 · 색상 4)
- [ ] `app/components/CompletedItemActionSheet.tsx` — 7곳 (사이즈 7 · 색상 0)
- [ ] `app/components/ApprovalLogisticsBody.tsx` — 6곳 (사이즈 6 · 색상 0)
- [ ] `app/admin/master/transactions/outbound/new/page.tsx` — 6곳 (사이즈 3 · 색상 3)
- [ ] `app/admin/master/transactions/transfer/new/page.tsx` — 6곳 (사이즈 3 · 색상 3)
- [ ] `app/components/ApprovalExpenseBody.tsx` — 5곳 (사이즈 4 · 색상 1)
- [ ] `app/admin/master/transactions/inbound/new/page.tsx` — 5곳 (사이즈 0 · 색상 5)
- [ ] `components/Toaster.tsx` — 4곳 (사이즈 1 · 색상 3)
- [ ] `app/components/ComingSoonPage.tsx` — 4곳 (사이즈 4 · 색상 0)
- [ ] `components/LotProductSpec.tsx` — 2곳 (사이즈 2 · 색상 0)
- [ ] `components/BottomTabBar.tsx` — 2곳 (사이즈 1 · 색상 1)
- [ ] `components/PageHeader.tsx` — 2곳 (사이즈 2 · 색상 0)
- [ ] `app/components/SessionExpiryBanner.tsx` — 2곳 (사이즈 2 · 색상 0)
- [ ] `app/admin/master/_tab-bar.tsx` — 2곳 (사이즈 1 · 색상 1)
- [ ] `app/components/RejectBottomSheet.tsx` — 2곳 (사이즈 2 · 색상 0)
- [ ] `app/expense/list/page.tsx` — 2곳 (사이즈 2 · 색상 0)
- [ ] `app/admin/master/transactions/_ledger-cols.tsx` — 2곳 (사이즈 2 · 색상 0)
- [ ] `app/admin/master/_lot-table.tsx` — 2곳 (사이즈 2 · 색상 0)
- [ ] `app/expense/new/page.tsx` — 2곳 (사이즈 1 · 색상 1)
- [ ] `app/admin/master/transactions/expense/new/page.tsx` — 2곳 (사이즈 0 · 색상 2)
- [ ] `components/LoginShell.tsx` — 1곳 (사이즈 0 · 색상 1)
- [ ] `app/layout.tsx` — 1곳 (사이즈 0 · 색상 1)
