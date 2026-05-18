# 출고이동_카트_UX_통일

## 상태
✅ 확정

## 한 줄 요약
출고·이동 카트 UX를 통일 (다건 일괄 + 동일 디자인 grid-cols-2)

## 결정 내용
재고 조회에서 카트에 담은 LOT을 출고/이동 어느 쪽으로도 이관 가능. 부분 실패 결과는 B안(성공·실패 분리 결과 화면)으로 사용자가 즉시 인지.

## 영향받는 모듈
- [[출고_관리]]
- [[재고_이동]]
- [[재고_조회]]

## 영향받는 시나리오
- [[50_시나리오/A2_출고_골든패스]]
- [[50_시나리오/A3_재고이동_보관처_변경]]
- [[50_시나리오/A5_재고_조회_3단계_플로우]]

## 2026-05-12 후속 확인

진단 보고서에서 다음을 발견:

- status (handleBulkOutbound): B안 정상 구현 ✅
- outbound (handleSubmitAll): B안 미적용 ❌ (backport 누락)
- transfer: 추후 확인 필요

원인: 결정 노트 4/28 도입 후 outbound는 21회 수정되었으나 B안 패턴은 backport되지 않음. 의도된 차이 아닌 누락 상태.

해결: Phase 1 Step 0에서 outbound 정렬 작업 진행 예정.

추가 명확화:
- "B안" = 부분 성공 허용 + 결과 화면 명시
- 트랜잭션 전체 롤백 방식(B'안)이 아님
- 출고는 각 LOT가 독립 거래이므로 부분 성공 허용이 도메인에 적합
- 한 번에 묶음으로 처리되는 거래(예: 계좌이체)와 다른 성격

## 2026-05-18 BulkSubmitSheet 제거 + sessionStorage 핸드오프로 카트 UX 진짜 통일

사용자 보고: 재고 조회 → [재고 이동]/[출고 요청] 클릭 시 BulkSubmitSheet bottom sheet가 떠서 "동일 보관처/판매처로 모든 LOT 일괄 처리" → "잊은 LOT 검색해서 추가" 불가능. 의도된 UX 아님.

원인: 결정 노트의 "카트 UX 통일" 표현이 status가 자체 BulkSubmitSheet으로 일괄 처리하는 형태로 구현돼 있었음. 진짜 통일은 카트 페이지 공유.

조치:
- `components/BulkSubmitSheet.tsx` 삭제. status 페이지의 관련 state/handler 제거.
- `lib/pending-cart-lots.ts` 신설 (sessionStorage 핸드오프 키 + 헬퍼).
- 요약 단계 [재고 이동]/[출고 요청] → `PendingCartLot[]` sessionStorage 저장 후 `/inventory/transfer` 또는 `/inventory/outbound` navigate.
- 카트 페이지(transfer/outbound) mount 시 1회 hydrate → 첫 LOT 자동 selectedLot + 수량 자동 입력 → + 추가 후 다음 pending LOT 자동 이어짐 → 큐 비면 일반 검색 모드 (잊은 LOT 검색 가능).
- 대기 LOT 칩 UI 상단에 표시 (현재 처리 LOT 강조 + 임의 선택 가능 + 큐 제거 가능).

결과: 재고 조회 → 출고/이동 단일 경로. LOT마다 다른 판매처/판매가/보관처 부여 가능. "잊은 LOT 검색해서 추가" UX 성립.
