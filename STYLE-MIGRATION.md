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

**제외 대상**(`CLAUDE.md` 고정, 목록에 없음 — 애초에 이 검색 패턴에 해당 사항 없음):
`<col style={{width}}>` 사용처, `lib/generate-pdf.server.tsx`, `components/ExpensePDF.tsx`(별도 렌더링 엔진), `lib/daily-report.ts`(이메일 클라이언트용). 이 셋은 Tailwind 클래스 자체를 안 쓰는 렌더러라 아래 검색에 원래 걸리지 않았다.

## 진행 현황

전체 **57개 파일 · 816곳** (사이즈 521 · 색상 295) · 완료 **4파일 · 92곳**

> **집계가 실제보다 적다.** 2026-07-31 실제 정리에서 파일마다 집계 밖 항목이 나왔다.
> 정적 검색 정규식이 `border-t/l/r/b-[#…]`·`ring-[#…]`를 빼먹었고, Tailwind **기본** 크기 클래스
> (`text-lg` 18px 등)는 임의값이 아니라 아예 대상이 아니었는데 스케일 위반은 똑같다.
> 남은 파일도 표의 숫자보다 몇 곳 더 나온다고 보는 게 맞다.

> **검증 방법(2026-07-31 신설).** 브라우저를 띄워 실제 렌더링을 측정한다 — 타입 스케일 밖 폰트,
> 컬럼 넘침, 헤더 중앙 쏠림, 가로 스크롤. 13→14px 확대가 컬럼을 깨뜨리는지 눈이 아니라 수치로 잡는다.
> (측정 스크립트는 세션 임시본이라 저장소에 없다.)

---

### ⚠ 30곳 초과 — 정리 전 먼저 확인 (7개 파일)

- [ ] `app/inventory/outbound/page.tsx` — 53곳 (사이즈 33 · 색상 20)
- [ ] `app/admin/master/lot-timeline/page.tsx` — 51곳 (사이즈 41 · 색상 10)
- [ ] `app/inventory/transfer/page.tsx` — 49곳 (사이즈 32 · 색상 17)
- [ ] `app/inventory/record/page.tsx` — 43곳 (사이즈 35 · 색상 8)
- [ ] `app/admin/master/approval/inbox/page.tsx` — 39곳 (사이즈 27 · 색상 12)
- [ ] `app/my-requests/page.tsx` — 35곳 (사이즈 24 · 색상 11)
- [x] `app/admin/master/ops/wiki/page.tsx` — 34곳 정리 완료 (사이즈 30 · 색상 4) · 잔여 0
      ※ 사용자 지시로 30곳 초과 예외 진행(2026-07-31). 집계 32곳 대비 +2 — `ring-[#3182F6]` 1곳(정규식 밖)과 `text-lg` 1곳(Tailwind 기본 클래스라 임의값 검색에 안 잡힘, 18px로 스케일 밖).
      ※ 크기 변경 동반: h1 22→20, 소수점 px 3곳(11.5→11)·1곳(12.5→12) 해소(§3 금지), 13→14, 10→11, 15→16(카드 제목 역할), 18→16.

### 체크리스트 (50개 파일, 개수 많은 순)

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
