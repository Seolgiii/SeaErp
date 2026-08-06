# SEAERP 작업 일지

기간: 2026-04-24 ~ 2026-05-06 (14일, 활동 8일, 70개 커밋)

---

### 2026-04-24

**완료한 작업**
- 입고 폼 섹션화 + 품목구분 기반 원산지 조건부 노출
- 라우트 전환 시 홈 스켈레톤 플래시 제거 (`app/loading.tsx` 삭제)
- 메인 화면 Hero(4:3) + Secondary 그리드로 재구성
- 메뉴 아이콘 이모지 → Heroicons 통일 + SEAERP 로고 추가
- 메인 KPI 카드 신설 (오늘 입고/출고/결재 대기) → 이후 전용 스트립으로 분리
- 공통 컴포넌트 도입: `PageHeader`(토스 스타일 얇은 헤더), `BottomTabBar`(floating pill)
- 신청 내역/결재 수신함 탭을 상단 → 하단 고정 탭바로 이동
- 본문/입력 폰트 1~2px 축소, "지출결의" → "지출" 축약

**결정 사항**
- 디자인 언어를 토스 스타일로 통일 — 모바일 위주 사용성 + 일관된 컴포넌트 라이브러리
- BottomTabBar는 화면 떠 있는 floating pill 섬 형태 (시각적 분리감 + 키보드 영향 적음)

**미해결 이슈**
- 페이지마다 헤더 디자인이 제각각이었던 부분 정리 미완료 (다음 단계로)

**다음 작업 후보**
- 출고 검색 UX 정확도 개선
- 재고 이동(LOT 보관처 변경) 기능 신규
- 재고 조회 화면 흐름 재설계

---

### 2026-04-25

**완료한 작업**
- 출고 검색 정확도 + UX 개선 + 기존 재고 마이그레이션 사전 준비

**결정 사항**
- 출고 검색은 LOT번호 일련번호와 품목명만 매칭 (중간 토큰 우연 매칭 차단)

**미해결 이슈**
- 기존 재고(`비고="기존 재고"`)가 결재 흐름에 들어오면 안 되는 케이스

**다음 작업 후보**
- 보관처 Link 필드 통일 + 기존 재고 마이그레이션
- 재고 이동 도메인 신규

---

### 2026-04-27

**완료한 작업**
- 보관처 전 테이블 Link 필드 통일 + 기존 재고 마이그레이션
- 결재 수신함 2주 필터 + 기존 재고/이동 신청 제외 (이중 필터)
- 재고 이동 기능 신규 구현 (LOT을 다른 보관처로, 새 입고관리/LOT 자동 생성, 원본 차감)
- 재고 이동 승인 중복 생성 + 대시보드 버그 수정
- 검색 버튼 화면 이탈 수정 (`flex min-w-0 + shrink-0`)
- 메인 헤더 인사말 제거, 사용자명 표시
- 헤더 배경 제거 + 로그아웃 버튼 삭제 (UX 단순화)
- `theme-color`을 앱 배경색(#F2F4F6)으로 통일
- ESLint `any` 타입 빌드 오류 수정

**결정 사항**
- 재고 이동은 새로운 입고관리 레코드를 만들어 비고="재고 이동"으로 마킹 — 기존 입고 흐름과 동일 처리
- 보관처 텍스트 필드 → Link로 마이그레이션 (정합성 + 비용 이력 조인 가능)
- 결재 수신함은 펜딩 + 최근 14일 완료분만 표시

**미해결 이슈**
- 기존 재고 200건 비용 일괄 업데이트 (보관처 Link 통일로 일부 해결됐을 수 있음 — 사용자 확인 필요)

**다음 작업 후보**
- 재고 조회 화면 3단계 플로우 (B안)
- 다건 출고/이동 (UX 통일)
- QR 스캔 입력

---

### 2026-04-28

**완료한 작업**
- 재고 조회 B안 구현 (조건 검색 → LOT 수량 선택 → 견적 요약 3단계)
- Phase 2: 품목명 자동완성 + 결과없음 UX + 출고/이동 연동
- 다건 이동 지원 + 출고 페이지와 카트 UX 통일 (`grid-cols-2`)
- QR 스캔 (출고와 동일 구조) + 헤더 미니버튼으로 통합
- 토스트 시스템 도입 (`lib/toast.ts` + `Toaster.tsx`)
- 입고 카트화 + 오프라인 감지 + pull-to-refresh
- `console.log` → `lib/logger.ts` 운영 로거로 일괄 교체 (production 노출 차단)
- 로그인 화면 리디자인 — 블루 헤더 + 물고기 워터마크 + 카드형 작업자 목록
- `"use server"` 디렉티브 최상단 이동 (빌드 오류 수정)

**결정 사항**
- 재고 조회는 단계별 플로우(B안) 채택 — 한 화면에 다 넣지 않고 단계 구분
- 출고·이동 카트 UX를 통일 (다건 일괄 처리 + 동일 디자인)
- 토스트 도입 — alert 일괄 교체는 후속 작업
- production console 노출 0 정책 — 모든 로그는 logger 통과

**미해결 이슈**
- alert이 폼 검증/오류 처리에 여전히 다수 남아 있음
- 단위 테스트 미도입 (테스트 인프라 자체가 없음)

**다음 작업 후보**
- vitest 도입 + 핵심 도메인 단위 테스트
- 서버 액션 권한 재검증 (현재는 클라이언트 의존)

---

### 2026-05-02

**완료한 작업**
- 로그인 블루 헤더 minHeight 185 → 259 (1.4배)

**결정 사항**
- 로그인 첫 인상 강화 (브랜딩 영역 확대)

**미해결 이슈**
- 물고기 워터마크가 다소 장난스러워 보인다는 피드백 (잠재)

**다음 작업 후보**
- 로그인 워드마크 강화 / 워터마크 추상화

---

### 2026-05-04

**완료한 작업**
- 로그인 물고기 워터마크 제거 + 추상 웨이브 + 워드마크 강화
- 재고 조회: 전체기간 토글 + 풀수량 체크박스 + 묶음 출고/이동 바텀시트
- LOT 카드 컴팩트화 + 입력 영역 리디자인
- 메인: 카드 desc 차별화 + KPI 결재대기 2-카드 + 탭 딥링크
- **서버 액션 권한 검증** (`requireWorker`/`requireAdmin` — Airtable에서 직접 role 조회) **+ PIN 무차별 대입 방지** (5회 5분→30분 escalation, 인-메모리)
- 묶음 부분 실패 결과 화면 (B안) + 운영 개선
- **vitest 도입** + 입력 sanitize + 운영 로거 정리 + 비용 계산 모듈 분리
- 단위 테스트 첫 도입: server-auth / input-sanitize / number-format / cost-calc / pin-rate-limit (총 103건)

**결정 사항**
- vitest 채택 (Jest 대비 가벼움 + ESM 지원 좋음)
- PIN rate limit은 인-메모리로 1차 도입 (Vercel 분산 환경 한계 인지하되 운영 규모상 무방)
- 묶음 부분 실패는 B안(성공·실패 분리 결과 화면)으로 — 사용자가 어떤 LOT이 실패했는지 즉시 인지

**미해결 이슈**
- PIN 평문 저장 (Airtable에 그대로) — 보안 점검 필요
- rate limit 인-메모리 한계 — 인스턴스 분리 시 우회 가능
- API 라우트들의 권한 검증 누락 (`/api/outbound-complete` 등 — 클라이언트가 보낸 ID만 신뢰)

**다음 작업 후보**
- API 라우트 권한 검증 보강 (Critical)
- 결재 반려 시 재고 자동 복구 (현재 단순 상태만 변경 → 유령 재고)
- LOT 일련번호 동시성 보호

---

### 2026-05-05

**완료한 작업**
- PIN 키패드 백스페이스 ⌫ 유니코드 → SVG 아이콘 + 키 톤 통일

**결정 사항**
- PIN 키패드 12개 키 시각·동작 일관성 (SVG / 동일 색·크기 / disabled 페이드 통일)

**미해결 이슈**
- 5/4에서 발견한 보안·정합성 항목들 그대로 누적

**다음 작업 후보**
- 본격적 보안 패치 (Critical 4건)
- 결재 반려 정합성

---

### 2026-05-06

**완료한 작업** (15 커밋, 단일 날짜 최다)

보안 (3건):
- **Critical 4건 패치**: ADMIN_SECRET 강제 / 디버그 API production 차단 / `/api/outbound-complete`·`/api/inbound-receive` 신원 검증
- **PIN scrypt 해시화** + 자동 점진 마이그레이션 + rate limit **Airtable 영속화**
- POST 라우트 **idempotency** (X-Idempotency-Key + 5분 메모리 dedup)

정합성 (3건):
- **결재 양방향 변경**: 승인 ↔ 반려 토글 시 재고 자동 복구 (입고 soft delete, 출고 +outQty, 비용 7필드 null)
- **LOT 일련번호 동시성** 낙관적 재시도 (~99% 보호)
- 출고 승인 **멱등 가드** (출고시점 판매원가 > 0 시 차단) + EXPENSE **100만원 권한 서버 재검증**

UX (3건):
- 자동 로그아웃 **5분 전 배너** + "로그인 연장" 버튼
- **alert → toast 일괄 교체** (23개) + 로그인 iOS status bar 색(#3182F6)
- 검색 필터 **URL 쿼리 동기화** (재고 조회/신청 내역/결재 수신함, 디바운스 300ms)

운영 (2건):
- **일일 정산 이메일 cron** (Resend + Vercel Cron, 매일 09:00 KST) — 어제 처리분 상세 + 손익 추정 + 결재 대기 분리
- pin-rate-limit `let → const` lint 수정 + 누적 경고 정리 (Vercel 빌드 실패 fix)

타입·테스트 (2건):
- **Airtable 응답 zod 검증** (모니터링 모드, 9개 스키마 + TRANSFER 보강) + `[SCHEMA-MISMATCH]` 로그
- **통합 테스트 21개 시나리오** (Vitest, in-memory store + fetch 모킹, 12 files / 45 pass)

**결정 사항**
- 모든 신규 검증은 **모니터링 모드 우선** (실패해도 기존 흐름 그대로) — 운영 회귀 위험 0
- 정합성 위험 지점에 `[INTEGRITY-ALERT]` prefix 로깅 (운영자가 grep으로 추적)
- TRANSFER 반려 자동 복구는 **미구현** (LOT 중복 생성 위험) — 수동 보정 + 명시 로그
- LOT 동시성 race window 1ms 미만은 **솔직히 문서화** (옵션 A — Airtable 자동번호 도입은 향후)
- 100% 보호보다 **외부 의존성 0 + 1인 운영 환경 적합성** 우선
- 일일 보고서 기준일 = 입고일/출고일/이동일/지출일 (createdTime 아님)
- alert을 무조건 toast로 바꾸지 않고 **메시지 무게에 맞게 분리** (toast / 인라인 / 모달)

**미해결 이슈**
- TRANSFER 반려 자동 복구 (의도된 미구현, 수동 보정)
- 인라인 폼 에러 메시지화는 부분 (toast 통일까지만 1차 완료)
- LOT 동시성 1ms race window (Airtable 자동번호 도입 시 100% 해결)
- PWA 홈 화면 추가 시 status bar 색은 iOS 제약상 유지 (사용자 합의)
- 4월 진행 중 메모 3건(갈치/200건/품목마스터) — CLAUDE.md에서 사용자 확인 필요로 표시

**다음 작업 후보**
- GitHub Actions에 `npm run test:all` 통합 (PR마다 자동 검증)
- TRANSFER 반려 자동 복구 (사용 빈도 낮으나 운영 부담 시)
- Vercel KV 도입으로 idempotency·LOT 동시성 100% 보호
- FIFO 평단가 시스템 (장기)
- 부자재 재고 확장 (장기)
- 검색 결과 자동 트리거 (URL 복원 시 검색 자동 실행 옵션)

---

### 2026-05-07

**완료한 작업**
- 일일 보고서 deliverability 디버깅 — Vercel Cron 정상 발화(00:27 UTC)·Resend API 200 응답 확인. 미도착 원인은 발송 도메인(`onboarding@resend.dev`)과 본문 링크 도메인(`seafood-erp.vercel.app`) mismatch로 인한 spam 필터 트리거. Resend Insights "Needs attention" 경고로 확정.
- 일일 보고서 본문 CTA 링크 제거 (`fix(cron)` — 44aac2c) + `NEXT_PUBLIC_BASE_URL` 사용 분기 / JSDoc 정리
- 입고 폼 라벨 단순화: `매입처 (출발)` → `매입처`, `보관처 (도착)` → `보관처` (`app/inventory/record/page.tsx`)
- 종합 점검 분석 5섹션 — 미해결 이슈 / 안정성 점검 / 운영 모니터링 / 사용자 가이드 / 핵심 지표 (개발자 관점, 본인 참고용)
- 첫 운영 회의 자료 HTML 작성 (`meeting-2026-05-07.html`) — 시스템 처음 보는 팀원용. Part A 시스템 소개(용어 12개 + 데이터 흐름 다이어그램) + Part B 기능 설명서(9개 카드) + Part C 운영 결정 의제 10개
- 회의 자료 글로서리·인쇄 CSS 수정 — PIN 4자리, 수매가 "박스당 가격", 판매원가 누적냉장료. 인쇄 시 헤더+목차 1면 / 각 Part 새 페이지 / 카드 단위 끊김 방지
- SEAERP Obsidian vault 구조화 — 모듈 20 / 결정 41 (확정 22 / 미해결 19) 노트 일괄 생성 (`30_모듈별_상세/`, `40_결정기록/`)
- 모듈 ↔ 결정 양방향 [[wiki-link]] 연결 — 모듈 노트 19개 + 결정 노트 33개 편집 (PWA 모듈·meta 결정 8건은 매핑 없음으로 의도적 보류)
- 코드 vs 노트 정합성 점검 — 분석 표의 "재고 조회" 코드 위치 `app/inventory/lookup/`은 오기, 실제 `app/inventory/status/page.tsx`로 정정
- 재고조회 ↔ 출고 관계 코드 검증 — 두 페이지가 별도 UI지만 `createOutboundRecord` 서버 액션을 공유, UI 카트 상태는 미공유 (`app/inventory/status/page.tsx:235`)
- 옵시디언 vault 시나리오 **23개** 발굴 (A7+B4+C3+D4+E2+F3, E3는 입고증 재출력 코드 검증 0건으로 미생성) + 6 카테고리 분류
- 모듈 노트 21개에 `## 등장하는 시나리오` 섹션 추가 (102 링크), 결정 노트 49개에 `## 영향받는 시나리오` 섹션 추가 (84 링크), 시나리오 ↔ 시나리오 64개 (32쌍 양방향)
- QR 트리거 코드 검증 — `lib/generate-pdf.server.tsx:306-322 generateInboundPdf`에서만 QR 생성. 출고증/지출결의서 PDF는 QR 없음 (사용자 메모와 반대 사실 — 결정 노트에 정확히 반영)
- QR 통일안 반영 — `QR_LOT_식별자_통합` 신규 결정 (입고 시 생성 / LOT 평생 식별자 / 통합 랜딩 페이지로 라우팅 / 구현 미정), 기존 2개 (`QR_스캔_재고조회_전용` 보강, `QR_스캔_라우팅_변경_검토` 미해결→확정)
- `/wrap-up` 명령에 옵시디언 동기화 단계 4.5 추가 (4.5-A: CLAUDE.md→00 / 4.5-B: z.Mission→01 / 4.5-C: journal→10_작업일지/{날짜}) + 격리 안전장치 (vault 없거나 sub-step 실패해도 1~7단계 흐름 정상 진행)
- A5 시나리오 사용자 수정 반영 — 거치는 모듈에서 `재고_이동` 제거, BulkSubmitSheet 직접 출고 흐름 명시
- A6 시나리오에 F3 흡수 — PIN 평문→scrypt 해시 자동 마이그레이션을 별도 시나리오 X, A6 6번 단계로 통합

**결정 사항**
- 도메인 mismatch 임시 조치 = CTA 링크 제거 — 자체 도메인 구매 전까지 유지. 이상적 fix는 도메인 인증 후 발신/링크 도메인 통일이지만 현재 구매 계획 없음
- 종합 점검 분석은 비개발자용 회의 자료와 분리 — 개발자 측면(PIN 해시화 / Idempotency / zod / [INTEGRITY-ALERT] 등) 디테일은 회의 자료에서 모두 제외, 본인 참고로만
- 회의 자료 의제 10개는 모두 "왜 결정해야 하는가" + "무엇을 결정할지" 분리 구조 — 시스템 자체 설명과 의사결정 항목을 명확히 구분
- 회의 자료 인쇄는 4파트 분리 (헤더+목차 → Part A → Part B → Part C → 결정 사항) — 각 시작이 새 페이지
- QR 스캔 = 재고 조회 전용으로 책임 한정 — 다중 출고는 카트 UX, QR은 출고증 정보 빠른 조회. 다중 LOT QR 연속 스캔 흐름은 만들지 않음
- vault 노트 형식 = 모듈(역할 / 코드 위치 / 현재 상태 / 관련 결정사항 / 의존 모듈) + 결정(상태 / 한 줄 요약 / 결정 내용 / 영향받는 모듈) — 양방향 링크가 그래프뷰에 그려지도록 통일
- vault 파일명 규칙 = 한글 + 언더스코어, 공백·특수문자 금지
- PWA 모듈은 세션·자동로그아웃과 분리, 상태 = "계획 단계"로 표기 — 향후 실제 앱 제작 시 재검토
- QR = LOT 평생 식별자 — 입고 시 생성 → 출고/조회 모두 같은 QR. 스캔 시 통합 LOT 랜딩 페이지(/lot/{번호})로 라우팅 후 권한·상태별 액션 분기 (조회 / 출고 / 이동). 구현 시점 미정
- 시나리오 노트 형식 = 트리거 / 흐름(번호 매김) / 모듈 간 데이터 흐름 / 관련 결정사항 / 미해결 결정의 영향 / 영향받는 코드 파일 / 구현 상태 / 관련 시나리오 — 양방향 wiki-link로 그래프뷰 형성
- 시나리오 안에서 모듈/결정 가리킴은 폴더 prefix `[[30_모듈별_상세/...]]` / `[[40_결정기록/...]]`, 시나리오끼리는 `[[50_시나리오/...]]` — 그래프뷰에서 카테고리별 시각 분리
- /wrap-up 옵시디언 동기화는 **격리 실행** — vault 없으면 조용히 스킵, sub-step 실패해도 echo 경고만 stderr로 내고 1~7단계 흐름 정상 진행 (운영 회귀 위험 0)
- 메타·UI 9개 결정은 시나리오 직접 매핑 X — `(직접 매핑되는 시나리오 없음)` 명시 (그래프뷰 시각화 시 의도적 isolated 노드)

**미해결 이슈**
- 5/8 09:00 KST 일일 보고서 자동 도착 여부 확인 필요 — CTA 제거 효과 검증
- 자체 도메인 구매 검토 — 구매 시 발신 도메인 인증 + 본문 링크 도메인 통일로 deliverability 100% 해결
- 입고 승인 멱등 가드 추가 — idempotency cold start 시나리오에서 LOT 중복 생성 위험 (출고는 멱등 가드 있음)
- `ApprovalButtons`의 idempotency-key 생성 로직 검증 — 양방향 변경 시 매 요청 새 key 보장 여부
- 운영 회의 진행 후 마스터 데이터 cleanup (갈치 품목코드 / 보관처 비용 이력 누락 200건 / 매입처·보관처 마스터 정리 등)
- 사용자 가이드 누락 항목 (PIN 잠금 / 양방향 변경 / QR 스캔 / 자동 로그아웃 경고) 안내 방법 결정
- QR 스캔 라우팅 변경 검토 — 출고증 PDF QR이 `/inventory/outbound?lot=...`인데 "재고 조회 전용" 결정에 따라 `/inventory/status?lot=...`로 변경할지 미정 (`lib/generate-pdf.server.tsx:311`)
- vault 시나리오 발굴 미진행 — 사용자 액션 / 데이터 흐름 / 의사결정 의존 / 결재·권한 / 인쇄·문서 / 자동화 6유형으로 모듈 간 흐름 정리 작업이 검토 단계에서 /wrap-up으로 중단
- QR 통합 LOT 랜딩 페이지(/lot/{번호}) 신규 개발 — 결정은 ✅ 확정이지만 구현 미진행
- 출고증 PDF에 QR 추가 — 현재 입고증에만 QR (코드 검증 결과). 통일안 적용 시 출고증 QR도 추가 필요
- 빈 폴더(20_단기과제_완료 / 21_중기과제_진행중 / 22_장기과제_예정 / 60_관계도) 활용 전략 수립 — 시나리오는 50에 채워졌으나 나머지 4개 폴더 아직 빈 채

**다음 작업 후보**
- 내일 아침 일일 보고서 도착 확인 후 다음 단계 (도메인 검토 / 추가 조치)
- 운영 회의 진행 + 합의된 cleanup 작업 (갈치 LOT 사후 처리 / 비용 이력 보충 / 매입처 마스터 정리)
- 입고 승인 멱등 가드 추가 (출고와 동일한 안전장치)
- GitHub Actions에 `npm run test:all` 통합
- vault 시나리오 발굴 (모듈 간 흐름 6유형) 재개 + 검토 후 시나리오 노트 작성 (모듈·결정과 양방향 링크)
- /wrap-up 4.5 동기화 dry run 검증 후 운영 적용 — 다음 wrap-up부터 옵시디언도 자동 sync
- QR 통합 LOT 페이지 구현 착수 시점 결정 (운영 회의 후)
- 빈 폴더(20/21/22/60) 활용 전략 — 단기·중기·장기 과제 별도 카드화 vs 미해결 결정으로 통합 운영 검토
- 옵시디언 그래프뷰 시각 검증 — 시나리오 노드 분포·고립 노드(메타 결정 등) 확인

---

### 2026-05-08

**완료한 작업**
- `/wrap-up` 회사 PC dry run 검증 — vault 경로 불일치(`~/seafood-erp/` 하드코드) 발견. `git rev-parse --show-toplevel` 기반 상대경로로 환경 독립화 (mac `seafood-erp` / Windows `.seaerp` 양쪽 동작) (`a9fb1ff`)
- 옵시디언 vault 빈 폴더 4개 생성 (`20_단기과제_완료` / `21_중기과제_진행중` / `22_장기과제_예정` / `60_관계도`)
- `60_관계도/` Mermaid 시범 3종 작성 — `ERP_핵심구조_큰그림.md`(graph TD subgraph 분류), `LOT_의존성_상세.md`(LOT 중심 의존), `입고_시나리오_플로우.md`(sequenceDiagram + flowchart)
- `/wrap-up` 4.5-D 단계 신설 — 60_관계도/ 자동 갱신 (`98fe242`)
  - 4.5-D-1: ERP_핵심구조_큰그림.md (3그룹 subgraph, mermaid 큰 그림)
  - 4.5-D-2: 시나리오_플로우/{A1~A5}.md (sequenceDiagram 자동 생성, 트리거 첫 단어 → first actor 추출, `## 흐름` numbered step 파싱, link 없는 step은 `Note over` 폴백)
  - 동일 내용 시 write 스킵(idempotent), 격리 안전장치(`sync_relations` 함수)
- 큰 그림에 `조회 → 출고`, `조회 → 이동` edge 누락 보강 (A2/A3/A5 등장 흐름) (`8ef535f`)
- 큰 그림 인프라 subgraph에 Airtable 노드(cylinder DB shape) + LOT/결재 점선 edge 추가 (`4f37755`)

**결정 사항**
- vault 경로는 `git rev-parse --show-toplevel` 기반 — `~/seafood-erp/` 하드코드 제거. 어느 환경에서든 ERP 루트 자동 감지
- 4.5-D-1은 **create-if-missing** 정책 — 파일이 있으면 절대 건드리지 않음. 사용자 수동 편집 보존이 자동 갱신보다 우선 (시스템 구조 변경은 직접 파일 편집)
- 4.5-D-2는 `## 흐름` 변경 감지 시만 갱신 — write_if_changed로 git diff 0 보장
- first actor는 트리거 첫 줄 "X가/이 Y" 패턴 추출 (예: "작업자가 입고 폼 제출" → "작업자"). 흐름 step에 다른 actor 등장 시 추가 participant
- Airtable은 `[(...)]` cylinder shape (DB 의미)로 인프라 subgraph에 표현. 모든 허브(LOT/결재) 점선 edge로 데이터 의존 표시

**미해결 이슈**
- 60_관계도 prototype 2개(`LOT_의존성_상세.md`, `입고_시나리오_플로우.md`)와 자동 생성 `시나리오_플로우/A1_*.md` 일부 중복 — 정리 검토 필요
- B/C/D/E/F 시나리오는 시퀀스 다이어그램 자동화 미적용 (현재 A1~A5만)
- 모듈 노트에서 Airtable 명시적 [[link]] 매핑 부재 (현재 plain text only)
- `현재 진행 중` 4월 메모 3건(갈치/200건/품목마스터) 여전히 누적

**다음 작업 후보**
- 운영 회의 진행 + 합의된 cleanup (갈치 LOT 사후 처리 / 비용 이력 보충 / 매입처 마스터)
- B/C/D/E/F 시나리오도 4.5-D-2 자동화 확장
- 60_관계도 prototype 정리 (시나리오_플로우와 중복 제거)
- 입고 승인 멱등 가드 추가 (출고와 동일 안전장치)
- GitHub Actions에 `npm run test:all` 통합
- QR 통합 LOT 페이지(/lot/{번호}) 구현 착수 시점 결정

---

### 2026-05-11

**완료한 작업**
- 1~2주 테스트 운영 직전 종합 점검 — 5개 fork 병렬 (미해결 이슈 / 안정성 / 모니터링 / 사용자 가이드 / 운영 지표). 운영 차단 후보 5건, 안정성 위험 [중] 4건(E1~E4), 사용자 안내 시급 5건, 회고 5질문 정리
- 점검 결과 HTML 보고서 작성 — `pre-launch-audit-2026-05-11.html` (42KB, 토스 스타일 #3182F6/#191F28, 7 섹션 + D-1 체크리스트 17개 항목, 인쇄 친화 CSS + 모바일 반응형, 체크박스 동작)
- QR 스캔 단일화 영향 범위 분석 — 5개 fork 병렬 (BarcodeScanner 사용처 / 출고·이동 폼 영향 / 메인 화면 위치 / LOT 상세 페이지 현황 / PDF QR URL + callbackUrl 패턴)
- 의사결정 5건 수합 — 옛 PDF redirect / 옵션 A 메인만 / PC도 표시+안내 / 재고 정보만(이력 X) / NEXT_PUBLIC_BASE_URL 도입
- 0단계 스키마 확인 — `잔여수량`/`매입자`/`선박명` 모두 입고관리 테이블에만 존재 (LOT엔 `매입처` link만). LOT.입고관리링크 (LinkedRecord)로 join 가능 확인
- 작업 5단계 순서 task 등록 — LOT 상세 페이지·API → PDF URL → 메인 QR → 폼 정리 → callbackUrl 보강
- **QR 단일화 5단계 완료** (커밋 `392f6b7`) — `lib/lot-detail.ts` join 헬퍼 + `app/api/inventory/lot/[lotNumber]/route.ts` + `app/inventory/lot/[lotNumber]/page.tsx` 신규 / `lib/base-url.ts` + `NEXT_PUBLIC_BASE_URL` 도입, PDF QR URL 교체 / 메인 헤더 QR 버튼 + 옛 `?lot=` redirect / 출고·이동 폼 BarcodeScanner 제거 / WorkerPinLogin callbackUrl 보강 (`safeCallbackUrl` open-redirect 차단)
- 출고/이동 검색 라벨·예시 통일 (커밋 `a64d2b9`) — "품목명 또는 LOT번호" / "예: 고등어, 0001"
- 페이지 일관성 정리 8건 (커밋 `be70dae`) — HIGH 3 (라벨 명사형 / "~하기" 제거 / "BOX"→"박스") + MED 4 (placeholder "예 :" → "예:" / 지출 submit cursor-not-allowed / 이동 헤더 의문형 / admin 빈결과·로딩 문구) + LOW 1 (`window.confirm` 4곳 → `useConfirm()` BottomSheet, 신규 `app/components/ConfirmBottomSheet.tsx` Context/Provider 도입)
- E1~E4 안정성 가드 plan 수령 — Plan agent로 audit + 의사코드 + 우선순위표(E1·E4 1·2순위 / E3 3순위 / E2 모니터링만) + 통합테스트 4개 신규 권장

**결정 사항**
- QR 스캔 용도 = "재고 정보 빠른 조회" 단일화 — 출고/이동 폼 QR 버튼 제거, 메인 화면 우측 상단에 글로벌 QR 버튼 추가. 앱 내 스캔 + 아이폰 기본 카메라 모두 동일 URL(`/inventory/lot/{lotNumber}`)로 라우팅
- QR 버튼 글로벌 범위 = 옵션 A (메인 화면만) — PageHeader 확장은 운영 후 필요시 추가. BottomTabBar 재고 조회 진입점이 이미 있어 1탭 비용 수용 가능
- PC 처리 = 옵션 B (항상 표시) — 클릭 시 "모바일에서 사용 가능" 안내 메시지. hasCamera 가드로 숨김 안 함
- LOT 상세 정보 = 재고 정보 8필드만 (입출고 이력 미포함) — LOT번호+QR 이미지 / 품목명 / 규격·미수 / 보관처 / 재고수량·입고수량 / 입고일 / 누적 보관일수 / 매입처·매입자·선박명
- 잔여수량·매입자·선박명 접근 = 코드 join — Airtable lookup 필드 추가 X. API에서 LOT 조회 → 입고관리링크 ID로 입고관리 fetch → 매입자(LinkedRecord)로 작업자 fetch. 실시간 동기화 + Airtable 조작 0
- NEXT_PUBLIC_BASE_URL 도입 — PDF QR URL 호스트 분리 (Production: `https://seafood-erp.vercel.app`, 개발/스테이징 환경 분리 가능)
- 옛 PDF 인쇄본 호환 = `/inventory/outbound?lot=...` 진입 시 자동 redirect — outbound page useEffect로 LOT 상세로 이동
- callbackUrl 흐름 = open-redirect 차단 추가 — `safeCallbackUrl()` 헬퍼로 절대 path만 허용, decode 실패·외부 URL·protocol-relative URL 모두 null 반환. WorkerPinLogin 이미 로그인 + `/login?callbackUrl=...` 직접 방문 시도 존중
- HTML 보고서는 위험도 색 시스템(critical/high/medium/low/info/pending)을 `meeting-2026-05-07.html`과 일관
- 출고/이동 검색 라벨 = "품목명 또는 LOT번호" 통일 — "LOT 일련번호"는 끝자리만 의미하는 뉘앙스가 있어 "LOT번호"가 정확. 검색 로직(LOT번호 끝자리 숫자 + 품목명 substring)은 이미 동일
- 버튼 문구 = 명사형 통일 — "~하기" 제거, "+ X 목록에 추가" / "X 신청 (N건)" 입고·출고·이동·지출 4개 폼 동일 패턴
- 단위 표기 = "박스" 한글 통일 — "BOX" 영문은 사용자 친숙도 낮음. Airtable 필드명("입고수량(BOX)")은 데이터 호환 위해 유지, UI만 한글화
- `window.confirm` 대체 = Promise 기반 BottomSheet — 새 `ConfirmBottomSheet` Context로 `await confirm({title, accent, ...})` 인터페이스. chained confirm(승인 → 중간승인 생략) 지원. RejectBottomSheet와 디자인 토큰 일관
- LOW 9·10 (rounded 위계 / gray 톤) = 유지 — 디자인 토큰 작업이라 별도 세션 권장, 운영 직전 회귀 위험 회피
- E1~E4 적용 정책 = minimal patch + 모니터링 모드 우선 — Plan agent 권장. E1·E4는 실제 사용 경로(승인/반려 토글)라 가드 즉시 가치, E2는 1인 운영 빈도 낮아 mutex 도입 대신 race 모니터링 로그만, E3는 PWA 코너 케이스

**미해결 이슈**
- **🔴 E1~E4 안정성 가드 적용 대기** — Plan agent로 audit + 의사코드 완료. **다음 세션 시작 지점**. 적용 범위 옵션 4개 사용자 결정 대기:
  - (a) **E1만** — 2~3h. 이중 차감 가드(가장 위험 높은 1건) 후 검증
  - (b) **E1 + E4** — 5~7h. 실제 사용 경로(승인·반려 토글) 두 곳 보완
  - (c) **E1 + E3 + E4 (권장)** — 6~9h. 코너 케이스(idempotency body hash) 추가. E2는 모니터링 후 결정
  - (d) **4건 전부** — 10~15h. E2 mutex 도입 포함 (회귀 위험 있음)
  - 각 건당 통합 테스트 신규 1개씩 권장 (`outbound-cost-patch-fail.test.ts` / `outbound-reject-lot-fail.test.ts` / `idempotency-payload-mismatch.test.ts` / `outbound-bulk-race.test.ts`)
  - 영향 파일: `app/actions/admin/admin.ts` (E1·E2·E4), `lib/idempotency.ts` (E3)
- legacy 페이지 정리 대기 — `app/admin/approvals/page.tsx` (메뉴 없음, 토이 로그아웃), `app/expense/record/page.tsx` ("원물 입고 등록" 타이틀, 사용 여부 불확실)
- 운영 D-1 체크리스트 17개 항목 전체 미시작 — 갈치 LOT 16건 / 200건 보관처 비용 / 품목마스터 / 매입처·매입자·선박명 폼 필드 불일치 (CLAUDE.md ↔ `InboundForm.tsx`)
- 일일 보고서 5항목 추가 미진행 — INTEGRITY-ALERT 카운트 / 음수 재고 / 잠긴 PIN / 결재 평균 소요시간 / 출고시점 비용 NULL (E1 조기 발견)
- 사용자 안내 시급 5건 사내 공지 미작성 — PIN 잠금 escalation / 자동 로그아웃 메커니즘 / QR 스캔 / 폼 필드 / 신청 결과 알림
- "동결비" 필드 처리 의도 결정 미완 — 결정 노트 부재 (사용자 확인 필요)
- Airtable view 4개 미생성 — 음수 재고 / 24h stale / 잔여수량&gt;입고수량 / 잠긴 PIN
- LOW 9·10 정리 보류 — rounded 위계 / text-gray-* 톤 디자인 토큰 작업 (별도 세션)

**다음 작업 후보**
- **🔴 1순위: E1~E4 안정성 가드 적용** (다음 세션 시작 지점)
  - 진입: 사용자에게 옵션 4개 (a/b/c/d) 중 적용 범위 결정 받기 → 적용 진행
  - E1 (admin.ts:598-606): `await patchRecord(...)` 반환값 미검사 → 실패 시 재고 원복 + INTEGRITY-ALERT
  - E4 (admin.ts:627-748): 출고 반려 LOT 복구 실패 시 입고 잔여 보상 트랜잭션(원복) 추가
  - E3 (lib/idempotency.ts:59-115): body SHA256 hash 비교, mismatch 시 409 `payload_mismatch`
  - E2 (admin.ts:550-579): per-record in-memory mutex + before/after race 감지 모니터링 로그
  - 통합 테스트 4개 신규 (E2는 mutex 도입 시에만)
  - 권장: (c) E1 + E3 + E4 — 실 경로 보완 + 코너 케이스 디펜스, E2는 1인 운영 빈도 낮음
- 2순위: 일일 보고서 5항목 추가 (`lib/daily-report.ts`) — E1 조기 발견 알람
- 3순위: legacy 페이지 정리 — `app/admin/approvals/page.tsx`, `app/expense/record/page.tsx` 라우팅 확인 후 제거
- 운영 D-1 데이터 작업 (Airtable 직접) — 갈치 LOT backfill / 200건 보관처 비용 / 품목마스터 / 폼 필드 정합성
- 사용자 안내 사내 공지 1장 작성 후 직원 배포
- `pre-launch-audit-2026-05-11.html` 운영 회의에서 공유

---

### 2026-05-12

**완료한 작업**
- E1~E4 운영 안정성 가드 4건 일괄 적용 (커밋 `1455484`) — E1 출고비용 PATCH 실패 가드 + E4 출고 반려 LOT 복구 보상 트랜잭션 + E3 idempotency body SHA256 hash 비교(다른 body → 409 `payload_mismatch`) + E2 출고 결재 race 모니터링 모드 (`[OUTBOUND-RACE-MON]` 로그, mutex 도입 X). 통합 테스트 12건 신규 (`outbound-cost-patch-fail`/`outbound-reject-lot-fail`/`idempotency-payload-mismatch`/`outbound-bulk-race`) + `injectFault()`/`clearFaults()` 테스트 인프라
- legacy 페이지 2개 정리 (커밋 `b9474dc`) — `app/admin/approvals/page.tsx` (옛 프로토타입, 메뉴 없음) + `app/expense/record/page.tsx` (URL `/expense/record`인데 타이틀이 "원물 입고 등록"으로 모순, 한글 필드명 리팩터링 반영 안 됨). 외부 참조 0건 확인 후 제거
- PWA 설치 가능 완성 (커밋 `6c35d42`, **Phase 0 완료**) — Android Chrome 192/512 아이콘 + apple-touch-icon 180×180 정규화 + favicon 32×32 + manifest theme_color #F2F4F6 통일 + sharp 기반 아이콘 재생성 스크립트
- 모바일 PWA + PC PWA 분리 아키텍처 방향성 결정 (커밋 `f5c8dc9`) — CLAUDE.md에 단일 코드베이스/두 PWA 구조 명시 + `docs/ROADMAP.md` 신규 (Phase 0~5+ 상세 계획)
- 최소 수정 원칙 의미 명확화 (커밋 `1705194`) — "잘 작동하는 기능은 건드리지 않음" 항목을 최소 수정 원칙에 흡수 통합, 계획된 변경 vs 의도하지 않은 변경 구분, 원칙 유래(AI 과잉 리팩토링 경험) 기록
- Phase 1 Step 0 — outbound 정책 정렬 (커밋 `25293e1` 계획 → `e26873b` 1단계 → `59d7a5f` 2단계) — `test/integration/outbound-bulk-policy.test.ts` 4 시나리오 안전망 신규 (자연 거절 활용, fault injection 미사용) → `app/inventory/outbound/page.tsx` `handleSubmitAll` status 패턴 정렬 (첫 실패 abort 제거, successCartIds/failures 분리 누적, 결과 패널 inline, 실패 N건 재시도)

**결정 사항**
- E1~E4 적용 범위 = 4건 전부 (옵션 d), 단 E2는 모니터링 모드만 도입 — mutex 도입은 회귀 위험 + 1인 운영 빈도 낮아 보류
- 프로젝트 아키텍처 방향 = 단일 Next.js 코드베이스 + 두 개의 PWA (모바일=작업자, PC=관리자) — Airtable이 하던 마스터 데이터 관리 역할을 PC PWA로 흡수, PostgreSQL 이전은 조건부 미래 단계
- Phase 0~5+ 로드맵 신규 작성 (`docs/ROADMAP.md`) — Phase 0 ✅ / Phase 1 모바일 UX 다듬기 / Phase 2 백엔드 부채 / Phase 3 PC 화면 신설 / Phase 4 시범 출시 + 피드백 / Phase 5+ 조건부 (PostgreSQL 등)
- Phase 1 Step 0 = outbound handleSubmitAll 정렬 (UI 작업 전 회계 안전 우선) — B안 = 부분 성공 허용 + 결과 화면 표시 (전체 롤백 아님)
- Step 0 분할 = 1단계 회귀 방지 안전망 통합 테스트 4건 → 2단계 client 코드 정렬 — 1단계 코드 변경 0건 원칙 준수, 2단계는 안전망 위에서 진행
- BulkResultsPanel 컴포넌트 추출 = Phase 1 Step 1로 분리 — outbound + status 페이지 결과 패널 inline JSX 일괄 추출 예정 (Step 0에서는 도메인 차이 유지 + outbound에 inline 패턴 그대로 복제)
- 최소 수정 원칙 정의 = "계획된 작업은 가능 / 작업 범위 밖 코드는 손대지 않음" — 잘 작동하는 기능은 우선 보호, 리팩토링 필요 시 별도 작업으로 분리 제안

**미해결 이슈**
- Phase 1 Step 1 — `BulkResultsPanel` 컴포넌트 추출 대기 (outbound + status 중복 JSX 일괄 처리)
- Phase 1 본격 모바일 UX 다듬기 항목 미시작 — 우선순위 정리 필요
- 일일 보고서 5항목 추가 미진행 — `[INTEGRITY-ALERT]` / `[OUTBOUND-RACE-MON]` 카운트 / 음수 재고 / 잠긴 PIN / 결재 평균 소요시간
- 운영 D-1 체크리스트 데이터 작업 17개 항목 — 갈치 LOT 16건 / 200건 보관처 비용 / 품목마스터 / 매입처·매입자·선박명 폼 필드 정합성
- 사용자 안내 시급 5건 사내 공지 미작성 — PIN 잠금 / 자동 로그아웃 / QR 스캔 / 폼 필드 / 신청 결과 알림
- "동결비" 필드 처리 의도 결정 미완 (사용자 확인 필요)
- Airtable view 4개 미생성 — 음수 재고 / 24h stale / 잔여수량>입고수량 / 잠긴 PIN
- LOW 9·10 (rounded 위계 / gray 톤) 디자인 토큰 정리 보류

**다음 작업 후보**
- Phase 1 Step 1 — `BulkResultsPanel` 컴포넌트 추출 (outbound + status 공통화, props로 accent 색만 분기)
- Phase 1 본격 진행 — 모바일 UX 다듬기 항목 우선순위 정리 후 착수
- 일일 보고서 5항목 추가 (`lib/daily-report.ts`) — E1/E2 조기 발견 알람
- 운영 D-1 데이터 작업 (Airtable 직접) — 갈치 LOT backfill / 200건 보관처 비용 / 품목마스터 / 폼 필드 정합성
- 사용자 안내 사내 공지 1장 작성 후 직원 배포

---

### 2026-05-13

**완료한 작업**
- Airtable MCP 서버 연결 — 세션 시작 시 인증·연결. 이번 세션의 인프라 전제. 베이스 `appUY0ZQ5L67FzySd` (운영 "수산업 ERP")를 MCP로 직접 조작 (테이블 스키마 조회, 신규 필드 6건 생성, 필드명 rename, formula 2건 갱신, LOT 197건 batch PATCH 마이그레이션·롤백). UI 우회로 운영 데이터 직접 검증·정리 가능했음.
- 동결비 통합 (1단계) — 입고 승인 시 보관처 비용 이력에서 동결비를 LOT에 PATCH + 입고 반려 시 null 클리어 + 출고 승인 시 출고시점 동결비 스냅샷 + 출고 반려 시 null 복구. `lib/storage-cost.ts` / `lib/cost-calc.ts` / `lib/schemas/outbound.ts` / `app/actions/admin/admin.ts` 4곳 수정. `lib/cost-calc.test.ts`에 동결비 합산 케이스 추가.
- 가공품 분기 전체 제거 (2단계) — Airtable에 실제 필드가 없는 `기준단위_재고`/`상세단위_재고` 코드 분기 12파일 정리. 박스 단위 / 재고수량 단일화. `stock-deduction.ts` 단순화, `shipment-plan.ts` mode/PBO 분기 제거, `OutboundQtyModal.tsx` mode 토글/수율오차 UI 제거. 가공품 흐름이 필요해지면 별도 모듈로 설계할 것 (메모리 저장).
- 옵션 B 완성 (3단계) — 재고 이동 시 새 LOT의 최초입고일은 원본에서 복사 + 이동입고일은 이동일 + 이월 4개(냉장료/입출고비/노조비/동결비)는 비례 분할로 분리 저장. `cost-calc.ts`에 `calculateTransferPricing` 신규 함수 추가, `transfer.ts:approveTransfer` 새 LOT 필드 정리.
- 누적 경비 계산 (4단계) — `calculateOutboundCost`에 이월 4개 합산 추가, Airtable formula 두 개(`판매원가`/`누적냉장료`)를 MCP로 직접 갱신 — 이동입고일 ?? 최초입고일 fallback + 이월 4개 합산.
- 기존 데이터 마이그레이션 (5단계) — Airtable LOT 197건 batch PATCH로 이동입고일 채움 → 사용자 의도 재확인 후 196건 롤백 (이동입고일 = null). 이동된 적 있는 LOT 1건(`recfFhdj2rVdHSgiR`)은 그대로 유지하고 최초입고일을 2026-04-13(원본 LOT 기준)으로 정정.
- 통합 테스트 7건 신규 (6단계, `test/integration/cost-carryover.test.ts`) — 입고 동결비 저장 / 입고 반려 동결비 null / 출고시점 동결비 / 출고 반려 동결비 복구 / 이동 시 이월 비례 분할 + 최초입고일 보존 / D1 재이동 누적 / 이동 후 출고 판매원가 합산.
- 운영 검증 체크리스트 신규 (`docs/CHECKLIST-COST-CARRYOVER.md`) — 6 시나리오 운영 환경 골든패스 검증용.
- 운영 골든패스 6 시나리오 검증 완료 — 입고/출고/이동/입고반려/출고반려/D1 재이동. 핵심 검증 통과: 이동입고일 빈칸 / 이월 4개 비례 분할 / 최초입고일 보존 / 출고시점 동결비 신규 PATCH·null 복구 / D1 재이동 이월 누적(289, 239 정확).
- 운영 검증 중 사전 존재 버그 4건 발견 + 모두 fix (5월 13일 추가 커밋):
  - `0e63896` `app/actions/inventory/inbound.ts` + `app/api/inventory/lot-search/route.ts` — LOT POST·검색 formula에서 "입고일자" → "최초입고일" rename 반영 누락. 이번 작업의 필드명 변경 후속 누락.
  - `037cbf0` `app/actions/inventory/inbound.ts` — LOT.품목구분이 운영 베이스에서 lookup으로 변경됐는데 코드가 텍스트 PATCH 시도 → 422 INVALID_VALUE_FOR_COLUMN. PATCH 제거 (lookup은 자동 계산).
  - `48ae928` `app/actions/inventory/transfer.ts` — 이동 새 LOT 생성 시 입고수량(BOX)/규격/미수 누락 → 총중량 formula = 0 → 판매원가 formula = 0. 옵션 B 이전부터 잠재, 이동 LOT 판매원가 계산이 정확해야 하면서 부각.
  - `f2f9974` `app/actions/inventory/transfer.ts` — 이동 새 LOT에 품목 link/품목명 누락 → LOT 검색·표시 시 품목명 빈 채. 재이동(D1) 시 원본도 비어있으면 품목마스터에서 fallback 조회.

**결정 사항**
- 동결비 입력 방식 = 옵션 b (보관처 비용 이력 테이블에 저장 + 입고 시 LOT으로 복사). 1회 발생 (입출고비/노조비/동결비) vs 일당 발생 (냉장료) 구분 유지.
- 이동 이력 추적은 별도 필드 없이 원본LOT 체인 + 이동입고일로 코드에서 동적 생성 (PC 화면 도입 시 구현). 데이터 중복 회피.
- 가공품 흐름은 단순 필드 추가가 아닌 별도 모듈로 설계 — 원물 → 가공공장 출고 → 가공 → 재입고(필렛) 체인은 새 시스템 필요.
- 이월 4개 필드 타입은 number → currency로 변환 (다른 비용 필드 일관성). `_tmp_삭제대상` suffix로 임시 rename 후 새 필드 생성, UI에서 수동 삭제.
- 최초입고일 = 진짜 처음 입고일 (모든 LOT). 이동입고일 = 이동 시에만 채움 (이동 안 된 LOT은 null). 코드/formula 모두 `이동입고일 ?? 최초입고일` fallback 패턴.
- 출고시점 이월 4개의 별도 스냅샷은 미추가 (총합으로 판매원가에 합산되므로 분해 저장 불필요). 출고시점 동결비만 신규.

**미해결 이슈**
- **알려진 flaky test — `test/integration/security.test.ts` pin_hash 시나리오** — 단독 실행 시 통과, 전체 동시 실행 시 가끔 fail. cost-carryover 제외하고 실행해도 동일 재현 → 사전 존재 이슈. 운영 코드 영향 없음. 별도 작업으로 디버깅 예정.
- `recfFhdj2rVdHSgiR` LOT의 이월 4개는 0 (옵션 B 도입 이전 이동분이라 추적 불가). 운영상 영향 작음 — 손익 과소 추정 가능. 최초입고일은 2026-04-13으로 정정 완료.
- **출고시점 판매금액 = 0 버그** — 운영 출고관리 테이블에 `판매금액` 필드가 없고 `판매가`만 있는데 `admin.ts:deductStockOnOutboundApproval`이 `outFields["판매금액"]`을 읽음 → 0. 손익 계산 부정확 (시나리오 2 검증에서 발견). 사전 존재, 옵션 B와 무관. 별도 작업.
- **재고 이동 반려 시 부분 복구 동작 관찰** — CLAUDE.md엔 "자동 복구 미구현"이라 명시했지만 시나리오 검증에서 LOT/입고관리 잔여수량이 +3 복구되는 동작 관찰됨. 정확한 출처 미파악. 코드 점검 + 문서 갱신 필요.
- **옛 이동 LOT 0180 (`recfFhdj2rVdHSgiR`) 품목 link/품목명 누락** — 신규 코드(f2f9974)는 fix지만 기존 LOT은 수동 정리 필요. 사용자 결정 사항.
- **운영 검증으로 생긴 테스트 LOT 정리 필요** — 0182~0188 LOT 7건 + 0183 출고건(recK4KpdNBItsqRi8, 의도 확인 필요) + 이동 반려 + 출고 반려로 데이터 흐름 복잡. 운영 사용 전 정리 (반려 또는 폐기) 권장.

**다음 작업 후보**
- 출고시점 판매금액 버그 fix (출고관리.판매금액 필드 추가 또는 코드를 `판매가 × 수량`으로 변경) — 손익 정확도 회복
- 재고 이동 반려 자동 복구 코드 점검 + 정합성 검증 + 문서 갱신
- 0180 + 운영 검증 테스트 LOT(0182~0188) 정리
- security.test.ts flaky 디버깅
- Phase 1 Step 1 — `BulkResultsPanel` 컴포넌트 추출

---

### 2026-05-14

**완료한 작업**
- 출고시점 판매금액 = 0 버그 fix (`0e113de`) — 출고관리 테이블에 `판매금액` formula 필드 신설, fetch-mock에 `applyFormulas()` 추가, cost-carryover 통합 +2 시나리오. 미해결 1건 해결.
- 이동 새 LOT 생성 시 link 필드명 오타 fix (`ac98602`) — `품목` → `품목마스터` (LOT별 재고 테이블 실제 필드명). f2f9974에서 잘못 적은 필드명 때문에 이동 승인이 매번 422 실패하던 것 정정.
- TRANSFER 반려 자동 복구 도입 (`d453208`, `revertTransferOnReject`) — 안전 가드 3종 (a) 신규 LOT 재고 == 이동수량 (b) 신규 LOT 원본 활성 재이동 없음 (c) 신규 입고관리 활성 출고 없음. 통과 시 원본 +이동수량 / 신규 soft delete (재고수량 0 + 잔여수량 0 + 승인상태 반려). 차단 시 [INTEGRITY-ALERT] + 반려 처리 자체 차단(수동 보정 유도). admin.ts:1027 분기 갱신. 통합 +3 시나리오 (`transfer-revert.test.ts`).
- 이동 새 LOT/입고관리 매입정보 복사 (`8cda11f`) — 그동안 빈칸으로 남던 매입자/입고자/선박명/원산지/비고를 원본 입고관리·LOT에서 fallback 패턴으로 복사. 입고관리.매입자는 workerId(이동 처리자)로 잘못 채워지던 것을 원본 매입자로 정정. 통합 +2 시나리오 (`transfer-copy-fields.test.ts`).
- D4 시나리오 + 결정기록 갱신 (자동 복구 ✅ 해결로 전환).

**결정 사항**
- TRANSFER 반려 시 신규 LOT은 hard delete가 아닌 soft delete (재고수량 0). 입고 반려와 일관성, link 깨질 위험 회피, 데이터 추적 보존. 화면에서는 재고수량 0이라 안 보임.
- 자동 복구 가드 실패 시 반려 처리 자체를 차단 (출고 반려 패턴과 동일). UX보다 정합성 우선.
- 옵션 B 이월 4개는 별도 클리어 없음 — 신규 LOT 재고수량 0이면 손익 계산상 의미 없음. 원본 LOT 이월값은 이동 시 손대지 않았으므로 그대로.
- 이동 시 매입자/입고자/선박명/원산지/비고는 매입 시점에 결정된 정보로 보고 원본 그대로 복사 (비고는 LOT별 재고에만 — 입고관리는 "재고 이동" 고정). 작업자는 이동 처리자.
- 이동 폼에 비고 입력 칸 추가 검토 — 현재는 원본 비고만 복사. 차후 사용자 입력으로 대체 또는 합성 가능.

**미해결 이슈**
- **0181 입고관리 고스트 레코드 2건** — 사용자 시나리오 검증 중 `품목` 오타로 LOT 생성 실패하면서 입고관리만 먼저 만들어진 흔적 (recbnR2SiMUyurHKk, reclDhxjSzoStxTGJ). 운영 LOT 정리 시 같이 폐기.
- **운영 검증 테스트 LOT 정리** — 0182~0188 LOT 7건 + 0181 고스트 2건 + 출고/이동 반려 데이터 흐름 복잡. 운영 사용 전 정리 권장.
- **알려진 flaky `security.test.ts` PIN 마이그레이션** — 전체 실행 시 가끔 fail. 별도 작업.

**다음 작업 후보**
- 0180 + 0182~0188 + 0181 고스트 운영 LOT 정리
- security.test.ts flaky 디버깅
- Phase 1 Step 1 — `BulkResultsPanel` 컴포넌트 추출

---

### 2026-05-15

**완료한 작업**
- C안 + 동결비 특례 — 수매가 절반 버그 + 박스당/총액 단위 일관성 fix (`72414e2`). `lib/cost-calc.ts` 두 함수(`calculateTransferPricing`, `calculateOutboundCost`) 재설계: 수매가 박스당 보존(이전엔 ratio로 절반화) / 이월 4개 박스당×이동박스수(총액) / sourceInboxQty(원본 입고박스수) 분모 — 이동 사이 출고 끼는 케이스도 정확 / 동결비 특례: 이동된 LOT 동결비=0 + 이월동결비는 원본 cost basis 박스당 보존(N단계 일관). Airtable LOT.판매원가 formula 갱신(박스당 비용 × 입고수량). cost-carryover 11 시나리오(기존 5 수정 + 신규 6 — 수매가 보존/동결비 특례/D2 chained/sourceInboxQty/D3 등).
- 일일 보고서 운영 건강도 5항목 추가 (`012ceaf`, 🩺 섹션). `lib/daily-report.ts`: 음수 재고 LOT / 잔여수량 정합성(잔여<0 or >입고) / 출고시점 비용 NULL(E1 가드 실패 조기 발견) / 잠긴 PIN(활성 작업자 중 pin_locked_until>now) / 어제 신청 당일 처리율. HTML 보고서 별도 섹션 + 빨강(>0)/초록(0) 색 코딩. 결재 평균 소요시간은 정확 산출(승인일시 필드 4개)로 분리 — 후에 미실행 결정.
- LOT별 재고 상태 관리 필드 7개 추가 (Airtable MCP) + 198건 backfill. 상태(5옵션)/상태사유(8옵션)/승인상태(4옵션, 입고관리와 통일)/결정자(singleCollaborator)/결정일시(dateTime, Asia/Seoul)/반려사유(5옵션)/반려메모(multilineText). 영어 매핑 description 기록(PostgreSQL 이전 대비). 분류 규칙: 수량>0 → 승인 완료/신규 입고 (195건) / 수량=0+비용 있음 → 소진/출고 완료 (1건) / 수량=0+비용 없음 → 승인 대기 (1건, 0182).
- 옵션 A — mock store lookup 시뮬레이션 + PATCH 잔재 제거 (`f8fd191`). `test/integration/fetch-mock.ts`: `syncBidirectionalLinks`(양방향 link sync) + `rebuildAllLookups`(lookup auto-fill, 2-pass transitive) 헬퍼. 입고관리.LOT별 재고 2 ↔ LOT별 재고.입고관리링크 양방향 등록. `inbound.ts:323-339`/`transfer.ts:425-426` LOT번호 PATCH 코드 제거(옵션 2 후 422 실패 무용 코드). 미사용 상수 `INBOUND_LOT_NUMBER_FIELD` 제거. 단위 110 / 통합 76 통과 + 회귀 0건, 디버깅 사이클 0.
- Airtable reverse link 15개 rename — 작업자/보관처/매입처/품목마스터의 헷갈리는 link 명확화. 예: 작업자.`입고 관리`→`입고 (작업자)` vs `입고 관리 2`→`입고 (매입자)`, 보관처 마스터.`재고 이동`→`이동 (이동 전)` vs `재고 이동 2`→`이동 (이동 후)`. 코드 참조 0건 검증 후 진행.
- 운영 테스트 LOT/입고관리/이동 5건 일괄 삭제. `recw08Nzrrf9ErFOW`(이동) + `recfvdCNReJqO7koZ`(0180) + `recpW6WRPZ18lSKWk`(0181) + 입고관리 2건. journal에 미해결로 남아있던 운영 테스트 LOT 정리 완료. `recfFhdj2rVdHSgiR`·0181 고스트 2건은 사용자가 이미 정리한 상태 확인.
- 지출결의.`지출항목_원문` → `자동화_분류원문` rename + description 명시. Airtable Automation source임이 발견되어 "⚠ 삭제 금지" description 추가. 향후 잘못된 description("삭제후보") 오해 차단.
- 입고관리.`LOT별 재고` (text 잔재) description 갱신 — 데이터 0건이지만 사용자가 삭제 시 출고관리 영향 보고. Automation 의존 가능성 배제 못해 유지 결정. 사용자 hide 처리.

**결정 사항**
- 수매가는 박스당으로 그대로 유지(이동 시 비례 분할 X). 이월 4개는 총액(박스당×이동박스수). 한 LOT 안에 단위 두 종류 공존이지만 사용자 멘탈모델("현재=박스당 협상가, 과거=확정 지출액")과 일치.
- 동결비 특례 — 이동된 LOT의 현재 동결비=0 (이미 동결된 재고이므로 새 보관처에서 부과 X). 이월동결비는 원본 박스당 cost basis × 이동박스수로 보존 → 같은 박스가 N단계 이동돼도 동결비 박스당 단위 일관.
- `sourceInboxQty`(원본 입고박스수)를 분모로 — `currentStock`(재고박스수) 대신. 이동 사이에 출고가 끼는 경우(예: 5박스 입고 → 1박스 출고 → 3박스 이동)에도 박스당 cost basis 정확히 보존.
- 결재 평균 소요시간은 어제 신청 당일 처리율(throughput)로 대체 — 정확 산출용 승인일시 필드 4개 도입은 동기 약해져 미실행. 일일 보고서에서 동기 사라지면 별도 task 재신청.
- Airtable 잔재 정리 원칙 — 데이터 0건 + lookup·formula·코드 참조 0건 검증된 필드만 삭제 대상. 자동화 source / 의존성 가능성은 description 정정·hide 처리로 안전 우선.
- 입고관리.LOT번호(lookup) + LOT별 재고 2(link) 둘 다 유지 — SQL 정규화 관점에선 link 단독이 정답이지만 Airtable 운영 편의(자동 표시) 우선. PostgreSQL 이전 시 마이그레이션 스크립트가 자동 정규화(컬럼 중복 무시).
- mock store 강화는 운영-mock 환경 정합성 확보 목적. 양방향 link + lookup 자동 동기화를 mock에서도 재현 → 향후 lookup 추가 시 LOOKUPS 매핑 한 줄로 일관 처리.

**미해결 이슈**
- 알려진 flaky `security.test.ts` PIN 마이그레이션 — 전체 실행 시 가끔 fail (사전 존재 이슈).
- Phase 1 Step 1 — `BulkResultsPanel` 컴포넌트 추출 (outbound + status 중복 JSX).
- 운영 D-1 데이터 작업 — 갈치 LOT 16건 / 200건 보관처 비용 / 품목마스터 / 매입처·매입자·선박명 폼 필드 정합성. 시간 들이는 작업.
- 사용자 안내 사내 공지 5건 미작성 — PIN 잠금 / 자동 로그아웃 / QR 스캔 / 폼 필드 / 신청 결과 알림.
- Airtable 잔재 필드 사용자 수동 정리 — 작업자 2(`입출고 내역`/`입출고내역`) / 출고 관리 1(`입고 관리` 공백 포함) / 선박 정보 마스터 2 / LOT별 재고 2(`원물LOT번호`/`From field: 원물LOT번호`). hide 또는 삭제 사용자 판단.
- Airtable Automation 수동 설정 — LOT 상태 변경 트리거 7종(입고 승인/반려, 이동 승인/반려 새 LOT, 출고 완료, 이동 출고, 수동 취소). MCP로 자동화 생성 불가, UI 직접 설정.
- 0182 테스트 LOT 정리 (사용자 본인 인지).

**다음 작업 후보**
- Phase 1 Step 1 — `BulkResultsPanel` 추출
- security.test.ts flaky 디버깅
- 운영 D-1 데이터 작업 (별도 세션)
- 사용자 안내 사내 공지 작성
- Airtable Automation 설정 (LOT 상태 자동화)
- 0182 테스트 LOT 정리

---

### 2026-05-18

**완료한 작업**
- 재고조회 → 카트 페이지 핸드오프 통일 (`e263bca`). `components/BulkSubmitSheet.tsx` 제거 (동일 보관처/판매처 강제 일괄 처리 제거) + `lib/pending-cart-lots.ts` 신설 (sessionStorage 핸드오프 헬퍼). 재고 조회 요약 단계 [재고이동]/[출고요청] 클릭 시 선택 LOT을 sessionStorage 저장 후 `/inventory/transfer`·`/inventory/outbound` navigate. 카트 페이지 mount 시 첫 LOT 자동 selectedLot + 수량 자동 입력 + 다음 LOT 자동 이어짐 + 대기 칩 UI(임의 선택·제거 가능). LOT마다 다른 판매처/판매가/보관처 부여 가능 + 잊은 LOT 검색해서 cart 추가 가능.
- Airtable 출고 관리 컬럼 정리 (`e263bca`). `출고수량` → `출고요청수량` rename (신청 의미 명확화, 반려해도 보존) — Airtable rename + 코드 8곳(admin.ts/outbound.ts/my-requests.ts/daily-report.ts/schemas/outbound.ts/cost-calc.ts 주석) + 테스트 fixture 3건 갱신. `실출고수량` formula 컬럼 신설 (`IF({승인상태}='반려', 0, {출고요청수량})`) — Airtable UI에서 반려된 출고도 5로 남던 헷갈림 해결. `출고시점 판매금액`(currency) 폐기 — `판매금액` formula(판매가 × 출고요청수량)와 중복이라 코드 PATCH/clear 제거 + Airtable 컬럼 description에 "수동 삭제 권장" 안내.
- 반려 시 출고시점 비용 보존 정책 변경 (`e263bca`). 보존: `출고시점 판매원가` ("이 정도 금액에 시도했었다" cost basis 지표). 클리어: 단가/냉장료/입출고비/노조비/동결비/손익 (분해 비용 분석 가치 낮음 + LOT에서 재계산 가능). 멱등 가드 기준 변경: `출고시점 판매원가>0` → `출고시점 단가>0` — 판매원가 보존과 호환 (단가는 반려 시 null 클리어).
- admin/dashboard 일괄 승인 기능 (`e263bca`). `updateApprovalStatusBulk` server action (순차 처리, 부분 성공 허용 — B안). PENDING + INBOUND/OUTBOUND/TRANSFER 카드 좌측 체크박스 + 선택 시 하단 검정 floating bar + 일괄 승인 결과 모달 (성공/실패 분리 + 실패 사유). EXPENSE는 100만원 권한 분기로 일괄 대상 제외. 통합 테스트 4 시나리오(`bulk-approve-policy.test.ts`) 추가.
- outbound.ts LOT 보관처 fallback (`e263bca`). 옛 입고관리 record 22%가 보관처 link 누락 상태 — 출고 신청 시 `getStorageIdFromLot` 헬퍼로 LOT.보관처 fallback. 영구 안전망. 운영 출고 4건(recZsizv3LZQzWXBD/recmf2IcFVjuJuoUt/recauQUco5TdLgqDz/recHL5E8GMYzbpn3w) 보관처 즉시 PATCH 완료.
- 옛 입고관리·LOT link 일괄 backfill 스크립트 (`d114b44`). `scripts/backfill-inbound-product-storage.mjs` 신설 — 품목마스터 137건 → {품목명: id} 매핑, LOT 198건/입고관리 199건 분석, 누락 link 일괄 PATCH. 운영 실행 결과: LOT 품목마스터 180건 + 입고관리 보관처/품목마스터 179건 backfill 완료. 출고관리.품목명 transitive lookup 자동 갱신 검증 완료 (사용자가 본 6건 모두 "고등어" 채워짐). 자동 처리 불가 17건(갈치 16건 + 빈 record 1건)은 수동 안내.
- transfer-revert partial failure 보상 트랜잭션 (`748fc53`). 출고 반려(`restoreStockOnOutboundReject`)는 LOT PATCH 실패 시 입고 잔여수량 원복 보상이 있어 정합 유지하지만, 이동 반려(`revertTransferOnReject`)는 비대칭 — 단계 3/4 실패가 success:true 반환되어 admin.ts가 반려 PATCH 진행 → 신규 LOT 활성인데 승인상태=반려 = 모순 상태 진입 위험(CRITICAL). `rollbackToCharged` 헬퍼 추가 + 단계 2/3/4 모두 보상 패턴 적용 (출고 반려와 완전 대칭). 통합 테스트 4 시나리오(`transfer-revert-partial-fail.test.ts`) 추가.

**결정 사항**
- BulkSubmitSheet 제거 = 카트 UX 진짜 통일. 기존 결정 노트(`출고이동_카트_UX_통일`)는 status 자체 일괄 처리로 구현돼 있어서 실질적으로 통일 아니었음 → status는 navigation만, 카트 페이지를 공유.
- 출고요청수량(신청 의미 보존) + 실출고수량 formula(반려 시 0 자동 표시) 분리. PostgreSQL 이전 시 formula 컬럼은 SQL view로 마이그레이션 — 현재 시점 비용 X.
- 반려 시 손익은 의미 없음 (사용자 의견 "거래 미발생"). 판매원가만 "시도했던 금액" 지표로 보존. 비용 분해는 LOT.* + 출고일에서 재계산 가능.
- 멱등 가드: 판매원가 보존하면 가드 발동되어 재승인 시 차감 안 됨 → 단가로 변경 (반려 시 null 클리어 + 차감 시 LOT 단가 기반 양수). race 방어 효과 동일.
- 일괄 승인 EXPENSE 제외 — 100만원 권한 분기를 일괄에서 검증하기 복잡 + ADMIN이 일괄 실행 시 100만원+ EXPENSE는 어차피 실패. 체크박스 비활성화로 명확화.
- 옛 데이터 backfill 자동 + 코드 fallback 동시 적용. fallback이 향후 사고 방지 안전망, backfill은 옛 데이터 정리 — 둘 다 필요.
- transfer-revert 옵션 B (완전 대칭). 옵션 A(단계 2만 보상)는 단계 3/4 CRITICAL 위험 잔존. admin.ts가 success:false 받으면 반려 처리 중단 → 정합 유지.

**미해결 이슈**
- 갈치 LOT 16건 — 품목마스터에 "갈치" 미등록 (CLAUDE.md `갈치 품목코드 확정` 메모와 동일 케이스). 등록 후 `node scripts/backfill-inbound-product-storage.mjs --execute` 재실행 시 자동 backfill 가능 (스크립트 멱등).
- 입고관리 `recFbuYf7BgUj4fy9` 1건 — LOT link + 입고일 모두 없는 빈 record. 수동 점검 필요 (삭제 or 데이터 입력).
- Airtable 출고관리 `출고시점 판매금액`(currency) 컬럼 — 사용자 수동 삭제 권장. description에 폐기 안내 표시됨, 코드는 더 이상 read/write 안 함.
- security.test.ts PIN 마이그레이션 flaky — 전체 실행 시 가끔 fail (단독 9/9 통과). 사전 존재.
- Phase 1 Step 1 — `BulkResultsPanel` 추출. status는 BulkSubmitSheet 제거되며 같이 사라졌지만 outbound 페이지 인라인 결과 패널은 남음.
- 사용자 안내 사내 공지 5건 미작성 (PIN 잠금 / 자동 로그아웃 / QR 스캔 / 폼 필드 / 신청 결과 알림).

**다음 작업 후보**
- 갈치 품목마스터 등록 후 backfill 재실행 (16건 완료)
- recFbuYf7BgUj4fy9 빈 record 정리
- 출고시점 판매금액 currency 컬럼 사용자 수동 삭제
- security.test.ts flaky 디버깅
- Phase 1 Step 1 — `BulkResultsPanel` 추출
- 사용자 안내 사내 공지 작성

---

### 2026-05-19

**완료한 작업**
- Airtable 승인상태 색상 5개 테이블 통일 (LOT별 재고/입고 관리/출고 관리/재고 이동/지출결의). Bright 톤 노랑=대기 / 초록=완료 / 빨강=반려 / 회색=취소 + 지출결의의 주황=최종 승인 대기. 5가지 페이로드 변형으로 PATCH 시도했으나 Airtable Web API가 singleSelect choices 변경을 422로 거부 (공식 문서상 name/description/options.formula만 지원) → 사용자 UI 수동 작업 + `get_table_schema`로 결과 검증 완료.
- LOT별 재고 상태 필드 7개 코드 연결 (`0dbaca6`). 5/15 backfill 이후 dead였던 6개(상태/상태사유/결정자/결정일시/반려사유/반려메모)를 채우는 쪽만 활성. 두 세트 — A(상태+상태사유=lifecycle), B(승인상태+결정자+결정일시+반려사유+반려메모=workflow). inbound 신청(승인 대기) / inbound 승인(승인 완료/신규 입고/결정일시/반려메타 클리어) / inbound 반려(반려/입고 반려/반려메모) / outbound 승인으로 LOT 재고 0(소진/출고 완료) / outbound 반려 복구(소진→승인 완료, 상태사유는 보존) / transfer 새 LOT(승인 완료/이동 입고) / transfer 원본 0(소진/이동 출고) / transfer 반려 신규 LOT(반려/이동 반려). `lib/schemas/lot.ts`에 6개 zod 추가(optional, 모니터링 모드). CLAUDE.md "Airtable 테이블 구조" 섹션에 세트 구조·트리거·제약 명시.
- Vercel 빌드 fix (`2c36b4b`). `e263bca`에서 들어온 `let { currentQty: currentRemain, storageId }` 가 currentRemain 재할당 없어 ESLint `prefer-const` 위반 → currentRemain은 const 분리, storageId만 let.
- 결정자 필드 활성화 (`d677a61`). Airtable에서 결정자 타입을 singleCollaborator → 작업자 link(multipleRecordLinks, 단일)로 변경 (UI 수동). 4개 진입점(`createLotOnInboundApproval` / `revertLotOnInboundReject` / `approveTransfer` / `revertTransferOnReject`) 시그니처에 `adminWorkerId` 인자 추가, `updateApprovalStatus`에서 검증된 `admin.id` 전달. PATCH 시 `결정자: [adminWorkerId]` 형태.
- 반려사유 옵션 5종 칩 UI (`c6166b8`). `RejectBottomSheet` — textarea 단독에서 (옵션 칩 5종 + 메모 textarea)로 확장. 옵션: 수량 불일치/품질 이상/서류 미비/검역 문제/기타. "기타" 선택 시 메모 필수, 나머지는 메모 선택. `onSubmit(reasonCode, reasonNote)` 두 인자 분리. `updateApprovalStatus`에 6번째 인자 `rejectReasonCode` 추가, `revertLotOnInboundReject` / `revertTransferOnReject`에도 전달. LOT.반려사유(singleSelect) = code 그대로, LOT.반려메모 = note, 입고관리/출고관리/이동.반려사유(multilineText) = `${code} — ${note}` 합성.
- origin remote URL 갱신. GitHub repo가 `seafood-erp` → `SeaErp`로 변경된 안내가 push 시 떴어서 `git remote set-url origin https://github.com/Seolgiii/SeaErp.git` 실행.
- security.test.ts PIN 마이그레이션 flaky 해소 (`a3743d7`). `verifyWorkerPin`의 fire-and-forget `void hashPin().then(patch)`를 `next/server.after()`로 전환. Vercel runtime이 응답 후 background task 완료까지 함수 유지 — 평문 PIN 영구 잔존 위험 해소 + 테스트 10/10 PASS. 테스트 환경엔 `vi.mock('next/server')`로 callback 큐잉 + `drainAfter()` 헬퍼.
- `recFbuYf7BgUj4fy9` 빈 record 정리 (사용자 직접 삭제). 마킹 → 검증 → 삭제 흐름.
- 사내 공지 5건 + A4 인쇄용 HTML 시안 (`6f7832a`). `docs/notices/*.md` 5건 (PIN 보호 / 30분 자동 로그아웃 / QR 스캔 / 카트 신청 통일 / 신청 결과 확인) + `preview.html`. 직원 연령대·아날로그 친화 톤·비관 회피 가이드 적용. 메모리 저장 `feedback_employee_notices.md`.
- 입고증·이동 출고증 발행 정책 + 자사창고 분기 도입 (`c0e9cf7`). Airtable: 보관처 마스터에 `구분` singleSelect 4분류(자사창고/외부창고/가공공장/기타) + 재고이동에 `출고증 URL` (url) 필드 신설. 코드: `lib/storage.ts` 신설(`getStorageKind`, `isOwnStorage` — 미분류 default true, 자사창고만 true, 가공공장은 외부 취급), `admin.ts:generateAndSaveInboundPdf`에 자사 조건 분기, `transfer.ts:approveTransfer`에 이동 입고증·이동 출고증 발행 트리거, `lib/generate-pdf.server.tsx:OutboundPDF`에 `isTransfer` prop 추가(판매처→이동처 라벨 + 판매금액 행 제거) + QR 코드 추가.

**결정 사항**
- Airtable singleSelect choice color 변경은 API 자동화 불가능 (PAT 권한은 충분하지만 엔드포인트가 미지원). 다음에 비슷한 작업 → 수동 가이드 + 검증 코드 패턴 재사용.
- LOT 상태 7개 필드는 두 세트로 명확히 구분 — A(라이프사이클)는 derived 가능, B(결재 워크플로우)는 영구 필드. 현재 phase에서는 "채우는 쪽만 활성, 읽는 쪽은 차후 PC phase"로 진행 — 코드 의존도 낮추고 PostgreSQL 이전 시 derived/materialized로 재설계 여지 보존.
- 결정자는 singleCollaborator(Airtable user 매칭 불가) 대신 작업자 link로. PostgreSQL 이전 시에도 worker FK로 자연 매핑.
- 반려사유는 옵션명을 LOT.반려사유(singleSelect)에 직접 저장 + 입고관리/출고관리/이동에는 합성 텍스트. 옵션 추가 시 양쪽 모두 갱신해야 하는 부담은 있지만, lookup pollution 회피 + 화면 표시 일관성 우선.
- 자사창고 분류 = `구분` singleSelect 4분류(자사창고/외부창고/가공공장/기타). 가공공장은 위탁 가공이라 출고증·입고증 발행 주체 X(자사창고 끝점이 기준).
- 미분류(`구분` 빈 값) default = `true` — 운영 분류 점진 진행 중 회귀 방지. 분류 완료 후 외부 시설 자연스럽게 발행 X로 전환.
- **입고증·출고증 발행 시나리오 정립** (오늘의 핵심 결정) — 자사창고 끝점이 있을 때만 우리(SeaERP)가 PDF 발행. 7가지 케이스 매트릭스: 자사창고 입고=입O출-, 외부 입고=입X출-, 자사→자사 이동=입O출O, 자사→외부 이동=입X출O, 외부→자사 이동=입O출X(외부 자체 출고증), 외부→외부 이동=입X출X, 거래처 출고=입-출O(현 동작 유지). 이전엔 모든 입출고에 일괄 발행되던 단일 정책에서 자사 끝점 기준 분기로 전환.
- 이동 출고증 = `generateOutboundPdf(data, isTransfer=true)`로 일반 출고증과 PDF 양식 공유. 라벨 "판매처"→"이동처" + "판매금액" 행 제거. 출고증·입고증 모두 QR 포함(`/inventory/lot/{LOT번호}`).

**미해결 이슈**
- 옛 LOT 198건의 상태/상태사유는 5/15 backfill 시점 상태로 박제 — 이미 출고로 재고가 0이 된 LOT인데 "승인 완료"로 남아있을 가능성. 큰 운영 위험은 없음 (새 LOT부터 자동 갱신). 필요 시 일회성 cleanup 스크립트.
- 갈치 LOT 16건 — 품목마스터에 "갈치" 미등록 (5/18 이슈 그대로). 등록 후 `node scripts/backfill-inbound-product-storage.mjs --execute` 재실행 시 자동 backfill.
- C·D 결정 필요 — QR 외부 페이지 신설 검토. 거래처가 QR 스캔하면 현재 SeaERP 로그인 차단됨. (C) 외부 노출 정보 범위 / (D) 인증 방식(공개 URL · 토큰 · 화이트리스트) 별도 의사결정 라운드.
- 재고 부착용 태그 신규 PDF — 라벨 크기·포함 필드·인쇄 형식 결정 필요 (~3h, 별도 세션).
- 자사 분기 시나리오 통합 테스트 미작성 — 코드는 작성·회귀 0 확인됐으나 새 시나리오 명시 케이스(외부창고 입고 시 입고증 X / 자사→외부 이동 출고증 등) 미커버.
- 보관처 마스터 86건 `구분` 분류 — 사용자가 운영 환경에서 직접 분류 (자사창고·가공공장 식별). 분류 전엔 default true로 현 동작 유지.

**다음 작업 후보**
- C·D 결정 (외부 페이지 노출 정보 범위 + 인증 방식) — 외부 LOT 공개 페이지 진입점
- 외부 LOT 공개 페이지 신설 (~2h)
- 재고 부착용 태그 PDF (~3h)
- 보관처 86건 `구분` 분류 (운영 작업)
- 자사 분기 시나리오 통합 테스트 추가 (~1h)
- B. 기존 재고 200건 비용 일괄 업데이트 (CLAUDE.md "현재 진행 중" 메모)
- C. 갈치 품목코드 16건 (사용자 데이터 입력 → backfill 재실행)
- D. Phase 1 모바일 사용성 다듬기 진입 (BulkResultsPanel 추출 부터)

---

### 2026-05-20

**완료한 작업**
- QR 외부 공개 페이지 신설 (`a06d81f`). 어제 미해결 C·D 분석·결정·구현 완료. (C) 옵션 B = LOT번호/품목명/규격·미수/원산지/입고일+경과일 5필드만 노출, 자사 영업정보(보관처/매입처/매입자/선박명/재고수량) 외부 차단. (D) 옵션 1 = 공개 URL. `/lot/{LOT번호}` 라우트 신설(`app/lot/[lotNumber]/page.tsx`), `lib/lot-detail.ts:LotDetail.origin` 추가(LOT 우선 → 입고관리 fallback), `SessionGuard.tsx` PUBLIC_PATHS에 `/lot` 추가, 옛 PDF의 `/inventory/lot/{LOT}` QR이 미인증 진입 시 `/lot/{LOT}`으로 자동 리다이렉트(데이터 마이그레이션 0 + PDF 회수 불필요), `generate-pdf.server.tsx` 신규 PDF QR URL을 `/inventory/lot` → `/lot`로 교체.
- 다국어 트랙 명확화 (메모리 저장 `project_export_label_i18n.md` + `project_qr_public_page.md`). 입고증/출고증 PDF는 국내+내부 문서라 다국어 X. **재고 부착용 재고표(라벨) PDF**가 진짜 다국어 대상 — 판매처가 외국이면 그 나라 언어로 자동 출력해서 작업자가 라벨 붙인 채 그대로 수출. 어제 미해결 "재고 부착용 태그 신규 PDF" 항목의 진짜 범위가 명확해짐. 판매처 마스터(CLAUDE.md 마스터 4개 목록에도 없음) 신설이 선행 조건.
- 입고증 PDF 양식 재구성 (`4819204`). 누락 5필드(미수/선박명/매입자/매입처/비고) 추가 — "입고 신청 시 입력한 내용이 입고증에 전부 기입" 원칙. `InboundPdfData` 타입 5필드 확장 (detailSpec/supplier/purchaser/shipName/memo). `admin.ts:generateAndSaveInboundPdf`에 `resolveSupplierName` 헬퍼 신설 + Promise.all로 5개 lookup 묶음. `transfer.ts:approveTransfer` 이동 입고증도 같은 5필드 매핑 (매입처/매입자 이름 해석 + memo는 "재고 이동" 고정).
- 입고증 양식 옵션 A (4컬럼 2-윈) 적용. 표1 = 라벨-값-라벨-값 4컬럼 × 5행 (18%/32%/18%/32%), 표2 = 매입처·매입자 / 선박명+빈셀 + 비고 full-width. 라벨(th, thHalf) `textAlign: center`로 가운데 정렬, 값(td)은 좌측 그대로. 타이틀 "입 고 증" fontSize 28pt (20 → 28) + marginBottom 36pt (28 → 36, 1.3배). 단위 접미사 자동 부착: 규격(kg), 미수(미), 입고수량(ct). "신청자" → "입고자" 라벨 변경.
- 회사 정보 푸터 도입. `lib/company-info.ts` 신설 — 환경변수 7개(COMPANY_NAME/REPRESENTATIVE/BUSINESS_NUMBER/ADDRESS/PHONE/FAX/EMAIL) 주입. `.env.local` 7개 키 추가(한라에스앤에프(주) 정보) + `.env.local.example` placeholder 추가. Vercel env 3환경(production/preview/development) 7키 등록 + redeploy 완료(사용자 직접). CompanyFooter를 `position: absolute, left/right:0, bottom:110, fixed`로 A4 페이지 하단 고정 — bottom:0 시 QR과 ~230pt 어색해 절반(~120pt)으로 절충. 표↔QR / QR↔회사 사이 `s.divider` 구분선(0.5pt #ccc, 18pt margin/padding) 양쪽 일관 적용.
- Dev preview API 신설 (`app/api/preview/inbound-pdf/route.ts`). `/api/preview/daily-report` 패턴 follow + production 가드 + mock 데이터로 generateInboundPdf 호출 → 즉시 PDF 시각 검증. 입고 신청·승인 흐름 없이 양식 변경 결과 즉시 확인 가능.
- 통합 테스트 22 files / 85 pass (회귀 0). mock 시그니처가 `async () => Buffer`라 PDF 데이터 타입 5필드 확장 영향 X.
- **출고증·이동출고증 양식을 입고증 동일 패턴으로 통일**. 어제 미해결 "출고증 양식 통일" 결정 완료. `OutboundPDF` 컴포넌트를 4컬럼 2-윈 표1(5행: 출고일/LOT, 출고자/품목, 규격(kg)/미수(미), 출고수량(ct)/원산지, 판매처(또는 이동처)/보관처) + 표2 비고 full-width로 재작성. `OutboundPdfData` 타입 5필드 확장(spec/detailSpec/origin/storage/memo) + `saleAmount` 제거(영업 정보 외부 노출 차단). "신청자" → "출고자" 라벨 변경, 옛 푸터 텍스트("위 내용으로 출고가 승인되었음") 제거. `admin.ts:generateAndSaveOutboundPdf`에 출고관리.규격/미수/원산지 직접 사용 + 보관처 resolveStorageName + **입고관리.비고 lookup**(출고관리에 비고 필드 없음 대응). `transfer.ts:approveTransfer`의 이동 출고증 호출부도 5필드 추가(memo="재고 이동"). Dev preview API `/api/preview/outbound-pdf` 신설(`?transfer=1`로 이동 출고증 분기).
- CompanyFooter divider 좌우 폭 통일. `position: absolute, left: 0, right: 0`은 page border 기준이라 표↔QR divider(페이지 padding 안쪽, 499pt)보다 좌우 길었음. `left: 48, right: 48`로 변경해 페이지 padding과 동일하게 맞춤 → 세 PDF(입고증/출고증/이동출고증) 양쪽 divider 좌우 길이 완전 통일.
- `.env.local` COMPANY_* 7키 값 입력 (한라에스앤에프(주) / 이병철 / 616-81-47134 / 제주특별자치도 제주시 원남6길 42 / 064-721-6442 / 064-721-6443 / halla6441@hanmail.net). 어제 Vercel env 등록 시 키만 만들고 값이 빈 채로 들어간 상태 발견 — `vercel env pull`로 받았더니 length=2(`""`) 확인.
- **Vercel env sensitive → encrypted 재등록** (production/preview 14건). CLI `vercel env add --value`가 Claude Code 비-TTY 환경에서 값 못 받아 모두 빈 값으로 등록됨 + 어제 등록 시 type=sensitive로 들어가서 PATCH로 value 갱신 불가(응답에 `value:""` 그대로 반환) → Vercel REST API로 DELETE 14건 + POST 14건(type="encrypted") 진행, HTTP 201 전부 성공. Production env pull로 length 5~23 정상 입력 확인. development 7건은 이미 값 있어 손대지 않음. 다음 git push 시 자동 재배포로 운영 PDF 푸터 적용.
- 통합 22 / 85 pass + 단위 110 pass (회귀 0, 출고증 통일 후 재확인).
- 보조 인프라 — CLI 3종 도입(`jq` 1.8.1 / `vercel` 54.2.0 / `cloudflared` 2026.5.0). 운영 로그 grep / Airtable 응답 디버깅 / 모바일 PWA HTTPS 터널 용도. WSL2 Ubuntu 26.04.

**결정 사항**
- QR 외부 공개 페이지 노출 정보 = **옵션 B (최소 + 원산지)**. 5필드는 거래처가 받은 PDF에 이미 박혀 있는 트레이서빌리티 정보 → 보안 ROI 낮음. 자사 영업 정보(보관처/매입처/매입자/선박명/재고수량)는 외부 차단. 추후 정보 확대 시 토큰 도입 재검토(코드 변경 작음).
- QR 인증 방식 = **옵션 1 (공개 URL)**. 토큰 URL은 향후 정보 확대를 대비한 보험. 수출 다국어 시나리오에선 옵션 1이 명확히 우월 — 외국 통관/리테일/소비자가 QR 즉시 검증 가능 + 다국어 라우팅 단순(`/lot/{LOT}?lang=`) + LOT 수명 길어도 토큰 만료 우려 없음 + 트레이서빌리티 공개가 마케팅 자산.
- 옛 PDF QR 호환 = SessionGuard 분기로 `/inventory/lot/{LOT}` 미인증 진입 시 `/lot/{LOT}`로 리다이렉트. 거래처가 가진 PDF 회수·재배포 불가 → 라우팅 호환만 보장. 데이터 마이그레이션 0건.
- 입고증/출고증 PDF 다국어 확장 = **불필요** (국내+내부 문서). 진짜 다국어 대상은 재고표 라벨 PDF. 입고증·출고증에 다국어 끼우지 말 것.
- 회사 정보 = `lib/company-info.ts` + 환경변수 주입 (상수 파일에 박지 않음). 운영 값 변경 시 코드 배포 없이 Vercel env edit + redeploy로 끝. `.env.local`은 gitignored.
- 입고증 양식 구조 = **옵션 A (4컬럼 2-윈)**. 표 가로폭 효과적 사용 + 정보 밀도 ↑ + 거래명세서·세금계산서에서 익숙한 패턴. 보관처는 표1에 포함 (입고증 정의에 부합). 비고는 full-width 별행.
- 라벨만 가운데 정렬, 값은 좌측. 한국어 거래 문서의 일반적 정렬 규약.
- 회사 정보 위치 = `position: absolute, bottom: 110`. 사용자 1차 요구("A4 제일 아래") + 2차 피드백("QR↔회사 간격 절반으로") 절충. 페이지 끝에서 158pt 위 = QR과 ~120pt 간격.
- **출고증 양식 = 입고증 동일 패턴**(옵션 1, 권장). 출고증도 거래처가 받는 정식 문서라 LOT 식별 정보(규격/미수/원산지/보관처) 풍부함 유지. 표 구조·라벨·단위·푸터·구분선 모두 통일 → "PDF 한 묶음"으로 보이는 일관성. 이동 출고증은 5번째 행만 "이동처/보관처(출발지)"로 자동 분기.
- **출고증에 판매가·판매금액 표시 X** (사용자 결정). 판매처에 보내는 출고증에 거래 금액을 박지 않음 — 영업 정보의 외부 PDF 노출 차단. Airtable의 판매가/판매금액 필드는 그대로 유지(formula+formula), PDF에서만 제거.
- 출고증 비고 = **입고관리.비고 lookup**. 출고관리 테이블에 비고 필드 없는 대응책 3안 중 lookup 선택. 의미상 입고 시점 비고가 그대로 출고 표시 (거래 시점 비고가 필요해지면 출고관리에 별도 필드 신설).
- CompanyFooter divider 좌우 폭 = 페이지 padding과 동일(48pt). `position: absolute, left:0/right:0`은 page border 기준이라 표↔QR divider보다 좌우 더 길게 그려졌던 버그. 이제 세 PDF 모두 동일 폭.
- **Vercel env 표준 type = `encrypted`**. CLI 5/19 자동 등록 시 sensitive로 들어가 read-back/PATCH 갱신이 막혔음. sensitive는 보안상 의미 있지만 운영 편의(`vercel env pull`로 dev 동기화) 손실이 크다 → encrypted로 전환. 추후 사용자 직접 추가 시에도 sensitive flag 끄도록 주의.

**미해결 이슈**
- 판매처 마스터 신설 — CLAUDE.md 마스터 4개 목록에도 없는 신규 테이블. 거래처 단위로 국가/언어 컬럼 필요. 재고표 다국어 자동 분기의 선행 조건.
- 재고 부착용 재고표 PDF (다국어 자동 출력 포함) — 판매처 마스터 이후 진입 (~3-4h).
- development 환경 COMPANY_* 7건 type=sensitive로 잔존. 운영 영향 0 (dev pull에서만 차이) — 일관성 위해 추후 encrypted로 재등록 권장(production/preview 패턴 따라).
- 갈치 LOT 16건 — 품목마스터 등록 후 backfill 재실행 (5/19와 동일).
- 옛 LOT 198건 상태/상태사유 박제 (5/15 backfill 시점) — 큰 운영 위험 0 (5/19와 동일).
- 자사 분기 시나리오 통합 테스트 미작성 (5/19와 동일).
- 보관처 마스터 86건 `구분` 분류 (5/19와 동일).
- `pre-launch-audit-2026-05-11.html` 여전히 untracked — 이번 작업 결과물 아니라 일관되게 제외 중.

**다음 작업 후보**
- 판매처 마스터 신설 (국가/언어 컬럼) → 재고표 PDF → 다국어 자동 분기 (3단계 작업)
- 자사 분기 시나리오 통합 테스트 추가 (~1h)
- 갈치 LOT 16건 — 품목마스터 등록 후 backfill 재실행
- 보관처 86건 `구분` 분류 (운영 작업)
- B. 기존 재고 200건 비용 일괄 업데이트 (CLAUDE.md "현재 진행 중" 메모)
- D. Phase 1 모바일 사용성 다듬기 진입 (BulkResultsPanel 추출 부터)

---

### 2026-05-26

**완료한 작업**
- 작업 일지(707줄) 전체 정독 + 미해결 항목 코드 교차검증 후 할 일 5트랙 정리 — 5/20 이후 6일 공백. 해결분(security flaky / 빈 record / 사내공지 / 출고시점 판매금액 / 테스트 LOT 정리 / 출고증 통일 / QR 외부 페이지) 제외하고 실제 열린 항목만: 다국어 라벨 / 자사 분기 테스트 / Phase 1 / 운영 데이터 / 마이너. `BulkResultsPanel` 미추출·판매처 마스터 부재·자사 분기 테스트 부재를 코드로 확인.
- **입출고증 발행 정책 통합 테스트 신규** (`test/integration/pdf-issuance-policy.test.ts`, 8 케이스). 5/19 도입한 `isOwnStorage`(`lib/storage.ts`) PDF 발행 분기에 테스트 0건이던 공백을 메움. CLAUDE.md 7케이스 매트릭스 + 미분류 회귀 1: 자사 입고(O) / 외부 입고(X) / 자사→자사(O+O) / 자사→외부(X+O) / 외부→자사(O+X) / 외부→외부 가공공장(X+X) / 거래처 출고(보관처 무관 O) / 미분류 default true(O). 발행 단언은 PDF URL 필드(입고증URL·출고증URL·재고이동.출고증 URL) + `generateInboundPdf`/`generateOutboundPdf` mock 호출 횟수 두 신호.
- `test/integration/fixtures.ts`에 `구분` 분류된 보관처 fixture 4종(STORAGE_OWN/OWN_B/EXTERNAL/PROCESSING) + 비용이력 + `PDF_POLICY_STORAGES` 묶음 추가. ALL_MASTERS 미변경(기존 테스트 회귀 0). production 코드 0줄 수정.
- 검증: 단위 110 / 통합 93 (이전 85 → +8, 회귀 0), ESLint 0 / `tsc --noEmit` 0.
- **보관처 마스터 `구분` 분류 운영 적용** (Airtable MCP, 85건 전부 분류, 미분류 0). 회사 정체성(한라에스앤에프㈜ / 대표 이병철 / 사업자 616-81-47134 / 제주 도남동 161-2)과 대조해 자사창고 식별. 자사창고 4건(한라에스앤에프 · 나림통상 · 사무실 · 한라양식수협), 외부창고 81건. 5/19·5/20 미해결 "보관처 86건 구분 분류" 완료.

**결정 사항**
- 다음 작업 첫 트랙 = 자사 분기 테스트 — 5/19 출시 발행 분기에 안전망 0 + "회계 영향 코드는 테스트 보강 후 작업" 원칙 + 1h 순수 코드라 6일 공백 후 워밍업 적합.
- 발행 정책 fixture는 ALL_MASTERS에 안 넣고 별도 `PDF_POLICY_STORAGES`로 분리 — 기존 골든 테스트(STORAGE_HANRIM/BUSAN = 구분 없음 = default true) 영향 차단.
- 보관처 분류 단순화 = "자사창고만 골라내고 나머지 전부 외부창고" — PDF 발행엔 자사냐 아니냐만 중요(외부창고/가공공장/기타 동일 취급). 86건 4분류 대신 자사 식별만. 가공공장 정밀 분류는 PDF 무관이라 가공 모듈 시점으로 미룸.
- 한라양식수협 자사 유지 = 사용자가 직접 설정한 값 존중(수협이라 직관과 반대지만 사용자 판단). 중복 `한라에스앤에프㈜`는 같은 회사라 자사 방향이 안전(자사=발행, 외부=스킵→외부로 두면 입고증 누락)했으나 작업 중 사용자가 삭제(86→85건)로 해소.
- 동시 편집 충돌 회피 = 일괄 쓰기 전 신선 재읽기 — 첫 update가 삭제된 중복 ID로 422(Airtable 일괄 원자성)나자 현재 상태 재조회 후 정확 ID로 재적용. 운영 데이터 무결성 우선.

**미해결 이슈**
- **#4 발행 정책 테스트 미커밋** — `pdf-issuance-policy.test.ts` + `fixtures.ts` 작업트리에만 존재. docs 일일 정리 커밋과 별도 `test:` 커밋 필요.
- **발행 분기 즉시 효력** — 보관처 분류로 외부창고(81/85) 입고는 이제 입고증 발행 안 됨(런타임 Airtable 데이터, 배포 불필요). 재고 대부분이 외부 냉동창고라 사실상 입고증이 거의 안 나오는 동작. 5/19 의도 정책이지만 실제 업무 흐름과 일치하는지(외부 보관분 입고증 불필요) 사용자 확인 필요.
- 쓰레기 보관처 3건(`.` / `동ㅇ원통영수산` / `㈜해원냉장`, 04-27 중복 임포트) 외부창고로 분류만 됨 — 삭제 권장(PDF 영향 0).
- 판매처 마스터 신설 → 재고표 다국어 라벨 PDF (3단계 트랙, 미착수).
- Phase 1 모바일 — `BulkResultsPanel`/공통 `LotCard` 추출 미착수.
- 갈치 LOT 16건(품목마스터 등록 후 backfill) / 기존 재고 200건 비용(4월 메모).

**다음 작업 후보**
- 다국어 수출 라벨 트랙 — 판매처 마스터(국가/언어) 설계부터
- Phase 1 모바일 — 공통 `LotCard`/`BulkResultsPanel` 추출
- 쓰레기 보관처 3건 삭제 정리
- 갈치 LOT 16건 / 기존 재고 200건 비용 (운영 데이터)

---

### 2026-05-27

**완료한 작업**
- 보관처 마스터 정리(Airtable MCP) — `동ㅇ원통영수산`(빈 중복) 삭제 + `㈜해원냉장`을 원본 `해원냉장`으로 병합(활성 LOT 3건=149박스 보관처 재지정 후 중복 삭제 → LOT↔입고 보관처 불일치도 동시 해소). 85→83건. `.`(활성 800박스 LOT 보유)는 실제 보관처명 불명이라 보류.
- dev 환경 `COMPANY_*` encrypted 재등록 트랙 — REST API로 21건(7키×3환경) 전부 `type:encrypted` 확정. 저널의 "dev sensitive 잔존"은 stale로 판명 → 작업 불필요.
- **Step 0 안전망** — 출고 묶음 신청 cart 순회 정책(B안 부분성공)을 `lib/bulk-submit.runBulkSubmit` 순수 함수로 추출 + 단위 테스트 6건(첫 항목 실패해도 전건 시도 = A안 abort 회귀 가드, `lib/bulk-submit.test.ts`). 변이 테스트로 효능 증명(A안 주입 시 3건 실패 → 복구 시 6/6). `handleSubmitAll`이 호출하도록 교체(컴포넌트 −9줄).
- **Step 1(inc1)** — `components/LotProductSpec.tsx` 신설(품목명+규격/미수, `formatSpecKgMisu` 재사용). 출고 3곳(검색결과/선택/cart) 규격·미수 표기 통일, 로컬 `formatMisuDisplay` 제거.
- 도그푸딩 fix 3건 — `formatSpecKgMisu` 중복 '미'(`52/54미`→`52/54미미`) 가드 + `lib/spec-display.test.ts` 9건 / "다시 검색" 검색어·결과 유지(결과 리스트 복귀) / 판매처·판매가 필수(미입력 시 추가 차단 + 라벨 `*`).
- **출고 #4 카트 UX** — `app/components/OutboundCartSheet.tsx` 신설. 헤더 🛒+건수 뱃지 + 하단바 "출고 목록 N건"→시트, 인라인 목록 제거, 제출은 시트 안에서(확인 후 출고), 담을 때 토스트. 아이콘 여백 10px(`mr-2.5`). 출고 수량 재고 초과 시 최대 재고 자동 클램프.
- **재고 이동 미러** — 출고 변경 전부 적용: `TransferCartSheet` 신설, `LotProductSpec`(미미 fix 동시), "다시 검색" 결과 복귀, 수량 클램프, 헤더 🛒+시트, 묶음 신청 A안→B안(`runBulkSubmit`+결과 패널) 전환.
- 검증: 단위 **125**(110→+15: bulk-submit 6 + spec-display 9) / 통합 **93**, tsc 0, eslint 0. 커밋 7건 push(`d5e4974`~`8d370bb`).

**결정 사항**
- 보관처 `.`은 삭제·rename 모두 보류 — 활성 800박스 + 실제명 불명(추측 위험). "쓰레기 3건" 전제가 조사 결과 2건 활성으로 뒤집힘(데이터 정합성 우선, 삭제 전 참조 확인 원칙).
- `㈜해원냉장` 병합 방향 = `해원냉장` — LOT 보관처와 입고 기록 보관처가 불일치였고 LOT을 입고와 맞추는 게 정합. 04-27 중복 임포트 split-brain 해소.
- Step 0 공백 닫기(사용자 결정) — 통합 테스트가 서버 계약만 덮고 client 순회 정책은 미보호(A안 회귀 못 잡음). 순수 함수+단위 테스트로 안전망. "회계 영향 코드는 테스트 보강 후" 원칙 부합.
- LotProductSpec 범위 = 품목명+규격/미수만 — 세 화면이 LOT번호를 컨트롤 사이에 끼워 배치해 묶으면 레이아웃 변경 필요(외형 유지 위배). 통짜 LotCard는 god-component 위험 → 작은 표시 primitive로 한정(과추상 회피).
- 카트 제출을 시트 안에서 — "확인 후 출고/이동" 강제로 오발송 전 전체 확인(회계 안전). 제출 2탭 비용 감수.
- 재고 이동 B안 전환 — A안(첫 실패 abort+미고지)은 부분 처리 후 모르고 재신청 → 중복 이동 위험. 출고와 동일 B안+결과 패널로 차단.
- "다시 검색" = 직전 결과 리스트 복귀(검색 재실행 X, 저장된 결과 사용). 검색 1건 자동선택 유지(사용자 결정) — LOT번호 검색=대부분 1건이라 흔한 경로 탭 절약, "다시 검색"으로 재선택 가능해 부담 해소.

**미해결 이슈**
- Step 1 나머지 — 재고조회(status: `toLocaleString` 8곳→`formatIntKo` + LotProductSpec) / 결재함(dashboard, 승인카드라 신중히) 미적용.
- `해원냉동(구좌)`(`recA60Blo26Hxi5oE`) 빈 보관처 — 원래 3건 목록 밖이라 미처리, 정리 후보.
- `.` 보관처 실제명 확인 후 rename (사용자 입력 대기).
- 발행 정책 즉시 효력(외부창고 입고증 미발행)이 실제 업무와 맞는지 사용자 확인 (5/26 이월).
- `OutboundCartSheet`↔`TransferCartSheet` 거의 동일 — 추후 generic 추출 여지(별도 리팩토링).
- 갈치 LOT 16건 / 기존 재고 200건 비용(4월 메모) · 판매처 마스터→다국어 라벨(미착수).

**다음 작업 후보**
- Step 1 재고조회(status) — `LotProductSpec` + `formatIntKo` 통일 (저위험)
- Step 1 결재함(dashboard) — `LotProductSpec` (승인카드 신중)
- 도그푸딩 후속 피드백 반영
- `해원냉동(구좌)` 빈 보관처 삭제 정리
- 다국어 라벨 트랙 / 운영 데이터(갈치·재고 비용)

---

### 2026-05-28

**완료한 작업**
- **Phase 1 Step 1** (`b3638a0`) — 재고조회·결재함 규격·미수 표기 통일. status `toLocaleString` 8곳 → `formatIntKo`, `LotProductSpec` + `formatSpecKgMisu` 적용. 결재함은 규격:/미수: 두 줄 → 한 줄 + **LOT번호 "있으면 표시"((나))**로 입고 대기 "LOT 미부여" 문구 제거.
- **Phase 1 Step 3+4** (`09a6978`, 10파일 +929/-678) — 재고조회 591줄 → 오케스트레이터 177줄 + 3컴포넌트(StockStatusForm/Results/Summary 각 140~198줄) + 공유 타입 51줄. 결재함 renderCard 186 → 19줄, ApprovalCard 셸 + LogisticsBody/ExpenseBody 분해(헤더 중복 32줄 동시 제거). sub-route 분리는 보류(Step 3 lite, dogfooding 후 결정).
- **Phase 2 stage 1 완료** (6 커밋 `75c6069`~`1bca5f8`) — `app/actions/`의 inline fetch **42 → 0**(8파일). lib/airtable.ts 헬퍼 4종(fetchAirtable/createAirtableRecord/patchAirtableRecord/getAirtableRecord) 통일. 헬퍼에 `init.next` 옵션 존중 1줄 보강(5분 캐시 케이스 backward-compatible). 모든 silent-swallow는 try/catch로 보존. 누적 -234줄.
- **Phase 2 stage 2 완료** (`bae377f`) — `lib/airtable-schema.ts`에 6 테이블 FIELDS 상수(INBOUND/OUTBOUND/EXPENSE/TRANSFER/STORAGE/SUPPLIER) + AIRTABLE_TABLE에 5개 테이블명 추가 → **총 11 테이블 등록**. zod schema와 1:1 매핑. ROADMAP "모든 Airtable 테이블 schema 등록" 완료 기준 충족.
- **Phase 3 시작 — 제품 마스터 + 마스터 셸** (`5b926c2`, 4파일 +753줄) — `app/admin/master/layout.tsx`(사이드바·권한 게이트) + `products/page.tsx`(CRUD 표·정렬·검색) + `ProductEditModal` + `master-products.ts`(서버 액션 4종). PC PWA 관리자 첫 화면.
- **PC PWA 분리** (`37b99e4`) — `public/admin-manifest.json`(name "SEAERP 관리자", start_url `/admin/master/products`, scope `/admin/`) + `app/admin/layout.tsx`를 server 재작성(metadata.manifest override) + `AdminAuthGate.tsx` client 분리 + dashboard PageHeader rightSlot에 "마스터" 링크. PC 바탕화면에 별도 standalone 아이콘 설치 가능.
- **Phase 3 마스터 3화면 추가** (`a1baad5`, 10파일 +1412줄) — 매입처(CRUD 1필드) + 보관처(CRUD 2필드 + 구분 select·필터 칩 4종) + LOT(read-only 7컬럼·상태 필터). `_master-helpers.ts` 공통 추출(ensureAdmin + Result type). LOT은 보관처 link → 이름 join(5분 캐시).
- **보관처 마스터 500 fix** (`e91cecf`) — `master-storage.ts`('use server')의 `STORAGE_KINDS` const export → Next.js 서버 액션 제약 위반. 상수·타입을 `lib/storage-kinds.ts`로 분리. 다른 'use server' 파일 전수 스캔 → 동일 패턴 0건.
- **IA 6 카테고리 + 재무회계 보류 결정 기록** — `docs/ROADMAP.md` Phase 3 본문 확장(IA 트리·현 매핑·신설 후보 명시) + 신규 "명시적 보류 항목(재무회계 영역)" 섹션 + 핵심 결정 2줄. `CLAUDE.md` "■ 의도된 비범위" 섹션 + 작업 원칙에 IA 1줄.
- **Phase 3 마스터 5 (워커·선박) 화면 추가** — 작업자 마스터(`/admin/master/workers`, CRUD + PIN 재설정/잠금해제 + 본인 보호·마지막 MASTER 보호) + 선박 마스터(`/admin/master/ships`, 9필드 CRUD, 어업종류는 옵션 미정으로 폼 제외). schema에 ships 테이블 등록. `master-workers.ts`·`master-ships.ts` server action 2종 + `WorkerEditModal`·`ShipEditModal` 신설.
- **Phase 3 재고 3화면 추가** — 재고 현황 집계(`/admin/master/inventory-summary`, 3뷰 토글: 보관처×품목 / 보관처 합계 / 품목 합계 + 보관처 필터) + LOT 생애주기 추적(`/admin/master/lot-timeline`, LOT번호 검색 → 입고/이동/출고 시간순 타임라인 + PDF 링크) + 음수·이상 LOT 모니터(`/admin/master/health`, daily-report 5지표 카드 + 위반 레코드 상세 펼침). `master-health.ts`·`master-lot-timeline.ts` server action 신설.
- **IA 6 카테고리 사이드바 shell** — `app/admin/master/_nav.ts` NAV_GROUPS 분리(6 카테고리 27 슬롯) + `[...slug]/page.tsx` catch-all → `ComingSoonPage` placeholder(준비중 안내·카테고리/항목명/URL 표시) + master/layout 카테고리 그룹화(준비중 항목도 클릭 가능, 노란 "준비중" 배지). 현재 14 활성 / 13 준비중.
- **CLAUDE.md "선박 정보 마스터(예정)" 표기 정정** — 실재 테이블 확인 (`tblZiVhtJU4aOsBAb`, 9필드, 빈 레코드 3건). 데이터는 비어있으나 테이블은 존재.

**결정 사항**
- **Phase 1 Step 3 = "Step 3 lite"** — 라우팅 분리(sub-route + sessionStorage/Context) 대신 컴포넌트 추출만. 회계 진입점 위험 최소화, hardware 뒤로가기 필요성은 dogfooding 후 결정. (나)→(다) 점진 접근과 일관.
- **Phase 1 Step 4 = shell+body** — ROADMAP의 2-full-cards 대신 ApprovalCard 셸 + Body 슬롯. 헤더 32줄 사전 중복도 함께 제거.
- **결재함 LOT번호 (나) "있으면 표시"** — 입고 대기는 자동 안 보임, 출고/이동·완료 입고는 그대로. 완전 삭제(다)는 dogfooding 후.
- **편집 정책 = 모달** — 첫 PC 화면에 인라인 풀세트는 구현 부담·디버깅 큼. ConfirmBottomSheet 패턴 재사용. dogfooding 후 필요성 확인 시 인라인 업그레이드.
- **테이블 라이브러리 = 커스텀 HTML** — 데이터 ~수백 건 충분, 의존성 0. 4화면 누적 후 공통 패턴 보고 TanStack 재검토.
- **Phase 3 세션 범위 = A** (products 풀 CRUD + 셸) — 셸 1회 작성 = 다음 세션 시간 절약.
- **PC PWA = start_url `/admin/master/products`, 같은 아이콘 재사용** — 이름 "SEAERP 관리자"로만 구분. 별도 아이콘은 dogfooding 후.
- **lots = read-only first** — LOT은 입고 승인 시 자동 생성, admin 직접 수정 거의 없음. 편집은 dogfooding 후 추가.
- **관리자 PC IA = 6 카테고리** — 결재 / 재고 / 거래 이력 / 원가·손익 / 마스터 / 시스템·운영. 결재를 별도 1번으로 분리(표준 ERP "구매·판매" 분류는 결재 흐름과 안 맞음). 4번 명칭은 *"원가·손익"* (관리회계 한정, 재무회계는 비범위).
- **재무회계 영역 명시적 보류** — 분개·전표·부가세·전자세금계산서·결산. 사유: 매년 세법 변경·세무 리스크 큼 + 더존·이카운트 전문 영역 + 1인 개발 비현실적. 외부 ERP export(IA 4번 하위)가 연결 다리.
- **'use server' 파일 export 제약 학습** — async function만 export 가능. 상수·타입은 별도 모듈로 분리 필수.
- **IA 진행 = 카테고리별 단계적** — 전체 만들고 dogfooding 대신 카테고리 1개씩 완성 → 일주일 사용 후 다음. 사유: (a) 1인 개발 × 22 화면 한꺼번에 회귀 추적 어려움 (b) 1~2개월 후에야 첫 피드백 → UI 패턴 후반 발전 시 초반 화면 구식화 위험 (c) 카테고리 완료 즉시 "Airtable에서 그 영역 벗어남" 가치 확정.
- **IA 진행 순서 = 마스터 → 재고 → 거래 → 결재 확장 → 원가·손익 → 시스템** — 마스터 먼저: 패턴 동일·다른 카테고리가 마스터 link 참조하므로 먼저 잠그는 게 안전.
- **본인 계정 위험 변경 차단** — 작업자 마스터에서 본인의 비활성·삭제 차단 + MASTER 본인이 자기 권한 강등 차단 + 마지막 활성 MASTER 보호. 시스템 잠금 방지.
- **선박 어업종류 폼 제외** — Airtable singleSelect choices 0개라 임의 텍스트 전송 시 422 위험. dogfooding 중 옵션 정해지면 schema에 등록 후 활성화.
- **URL 일단 `/admin/master/*` 통일** — IA 카테고리 디렉터리(`/admin/approval`, `/admin/transactions`, ...) 분리는 phase 3 후반 일괄. `_nav.ts` 코멘트로 명시.
- **준비중 항목 = catch-all placeholder** — `[...slug]/page.tsx`가 미구현 URL 받아 `ComingSoonPage`. 사용자가 사이드바에서 IA 전체 구도 클릭하며 시각화 가능. nav는 회색 + 노란 "준비중" 배지로 명확 구분.

**미해결 이슈**
- **🔴 1주 dogfooding 시작 대기** — PC "SEAERP 관리자" PWA 설치 후 마스터 5 + 재고 4 화면 실사용. 메모할 것: lots 편집 필요성 / 표 UX·정렬·반응 / 삭제 안전성 / 모바일 240px 사이드바 어색함 / 결재함↔마스터 동선 / 130건 품목·85건 보관처·~200건 LOT 로딩 속도 / 음수·이상 모니터 새로고침 주기.
- `PRODUCT_FIELDS.category` stale — `"품목 구분"`(공백있음)이 stale, 실제 Airtable은 `"품목구분"`. `lib/schemas/product.ts` zod에도 동일. 새 코드(master-products·inbound)는 직접 문자열로 우회. 별도 작업으로 정정.
- 헬퍼 자체 로깅 (`lib/airtable.ts`의 `console.log`) → `logger` 통일 — CLAUDE.md "production console 0" 정책과 어긋남(사전 존재 부채). Phase 2 작업 중 발견, 분리 보류.
- Master 페이지 6개 코드 중복 — Table/Modal primitive 추출 후보. dogfooding 후 패턴 안착 시 검토.
- **Phase 3 잔여 IA 슬롯 13개** — 결재 확장 2 / 거래 이력 5 / 원가·손익 5 / 시스템·운영 5. catch-all + ComingSoonPage placeholder로 노출 중.
- 외부 ERP export 미구현 — IA 4번 핵심 약속. 수신 시스템(더존/이카운트/etc) + 포맷(CSV·전표·세금계산서 XML) 결정 필요.
- **선박 마스터 어업종류 옵션 미정** — Airtable singleSelect choices 비어있음. 옵션 결정 시 schema STORAGE_KINDS 패턴으로 `lib/ship-fishing-types.ts` 분리 후 폼 활성화.
- **선박 마스터 빈 레코드 3건** — 4/16 생성, 데이터 0. 사용자가 마스터 화면에서 인지 후 정리 가능.
- **admin shell 통합 필요** — master/layout만 사이드바 표시, `/admin/dashboard`로 가면 사이드바 사라짐. phase 3 후반에 admin 루트 layout으로 통합.
- 장기 유지: 갈치 LOT 16건(품목마스터 등록 후 backfill) / 기존 재고 200건 비용 / 판매처 마스터→다국어 라벨 PDF / Airtable view 4개·Automation 7종 / LOW 9·10 디자인 토큰 / `.` 보관처 실제명 / `해원냉동(구좌)` 빈 보관처 / GitHub Actions CI(`test:all` 통합).

**다음 작업 후보**
- **1주 dogfooding** 후 발견 이슈 반영 (마스터 5 + 재고 3 신설분)
- Phase 3 다음 카테고리 — IA 3번 거래 이력 5화면 (입고/출고/이동/지출 admin 표 + PDF 재발행)
- 또는 IA 1번 결재 확장 2화면 (이력·검색 + 일괄 처리 표)
- 외부 ERP export 1차 (CSV 출력) — IA 4번 핵심 약속
- `PRODUCT_FIELDS.category` stale 정정 (작은 정리)
- 어업종류 옵션 결정 → 선박 폼 활성화
- Master 페이지 패턴 안착 후 Table/Modal primitive 추출
- 운영 데이터 정리 (갈치 16건 / 빈 보관처 / 200건 비용 / 빈 선박 3건)
- 다국어 라벨 트랙 시작 (판매처 마스터 → 재고표 PDF → 다국어)

---

### 2026-05-29

**완료한 작업**
- **재고 조회 표 정리** (`2afa2bb`) — LOT번호 mono+blue → 품목명과 동일한 bold gray로 통일 / 규격·미수 한 컬럼 → 두 컬럼 분리 (xxkg / xx미) / 상태 컬럼: 승인상태(워크플로우) → 상태사유(라이프사이클). 색은 status에 매핑 (승인 완료=초록 / 소진=회색 / 반려=빨강 / 취소=연빨강). inventory-summary 연쇄 수정: status in ('승인 완료', '소진').
- **PC 결재 수신함 신설** (`e143e2c`, 2 files +770) — `/admin/master/approval/inbox` 표 일람 + 다중선택 일괄 처리. 백엔드(updateApprovalStatus[Bulk], getMyRequests) 모바일과 100% 공유. 모바일 `/admin/dashboard` 무손상. 탭(대기/완료) + 타입 필터(전체/입고/출고/이동/지출) URL 동기화. 일괄 승인 + 일괄 반려(같은 사유 순차 호출). 완료 탭 행 인라인 '반려로/승인으로' 토글. EXPENSE 100만원 분기 동일. 사이드바 _nav 링크 신규 경로로 교체.
- **PC 진입 UX 통합** (`353a87a`, 5 files +947) — (1) PC 전용 로그인 split-screen: 좌 브랜드 파노라마(#3182F6→#0F4FB0 그라디언트 + SEAERP 72pt + 기능 캘러우트 + 상하 웨이브) / 우 작업자 4열 그리드 → 클릭 시 PIN 입력으로 swap. 키보드 입력 네이티브(0-9/Backspace/Esc). (2) `LoginShell.tsx` matchMedia(1024px) 분기 단일 mount. (3) `/admin/master` 관리자 홈: KPI 4장(결재 대기/오늘 입출고/위험 알림 drill-down) + 6 카테고리 카드(준비중 회색 칩). (4) `defaultLanding(role)`: ADMIN/MASTER → /admin/master, WORKER → /. (5) 사이드바 SEAERP → /admin/master + 하단 사용자 메뉴(아바타+이름+역할+로그아웃).
- **사이드바 IA 정리** (`290616d`) — 카테고리 접기/펼치기 도입(chevron + 헤더 클릭 토글, 기본 접힘: 마스터/시스템·운영). localStorage 'seafood-erp:nav-collapsed' 보존. 현재 페이지 속한 카테고리는 자동 펼침. 카테고리 vs 항목 시각 위계 강화(13px font-black + 우측 chevron, 항목 ml-2 + border-l 들여쓰기). enabled/disabled 항목 좌측 정렬 통일(단일 flex 구조 + 조건부 칩).
- **재고 현황 집계 dogfooding fix** (`7cc692a`, 5 files +268) — 규격·미수 한 컬럼 → 두 컬럼 분리 + 사이즈 컬럼 신규(`formatSize` 마리당 g 환산: 미수 1~2자리 → spec/N 계산, 3자리 이상 → g 그대로). 보관처/품목 swap-on-click(asc/desc 정렬 무의미 → primary swap, ↔ 아이콘 강조). table-fixed + colgroup으로 컬럼 너비 고정(swap 시 흔들림 0). 라벨 'LOT 조회' → '재고 조회'(사이드바 + 페이지 h1). spec-display.ts에 formatSpec/formatMisu/formatSize 공유 추출 + 단위 테스트 +11 케이스(단위 140 통과).
- **재고 집계 컬럼 너비 자동·대칭화** — 보관처·품목 컬럼을 table-fixed 220px 고정 → table-auto + 내용 자연너비 측정 후 더 긴 쪽으로 둘 통일(useEffect equalize). 남는 폭 안 채우는 콤팩트 + swap해도 폭 동일. swap 흔들림은 px-2로 줄였던 셀 패딩을 px-3(`a41d16f` 상태)로 복원해 해결.
- **관리자 IA 비중복 재정리 (b+a, 4파일)** — 재고 라벨 통일(재고 조회→재고(LOT별) / 재고 현황 집계→재고 집계). LOT 생애주기 메뉴 제외 → 재고(LOT별) 행클릭 drill-down(lot-timeline `?lot=` 자동조회 + lots 행 onClick). 음수·이상 LOT 모니터 재고→시스템·운영. placeholder 정리: 결재 '일괄 처리 표'·'결재 이력·검색' 제거, 원가 'LOT 누적 비용' 제거·'보관비 이력'→마스터(보관처 비용 이력), 시스템 '운영 건강도 실시간' 제거. 최종 6카테고리 22항목/활성 9. catch-all·ComingSoonPage null-safe·제거 href 외부 참조 0 확인.

**결정 사항**
- **상태 컬럼 = 상태사유(라이프사이클)** — 재고 조회 맥락에선 `승인상태`(워크플로우 대기/완료/반려)보다 `상태사유`(신규입고/이동입고/출고완료/이동출고/입고반려/이동반려/취소)가 본질적. 색은 `상태`에 매핑.
- **PC 결재 수신함 = 표 일람** — 모바일 카드 그대로 포팅 대신 PC가 잘하는 표·체크박스·sticky 액션바·되돌리기 인라인. 메일앱 split, 카드 그리드 옵션 검토 후 표 채택.
- **PC ↔ 모바일 결재 동시 사용 = 서버 멱등 가드 + 보상 트랜잭션으로 충돌 0** — 신규 화면 출시해도 모바일 결재함 무손상. 같은 건 동시 클릭 시 한쪽은 no-op.
- **PC 로그인 = Split-screen (A안)** — 메인 카드(B), 팀 보드 그리드(C) 옵션 중 Stripe/Linear 스타일 split이 일과 사용에 적합 + 키보드 입력으로 PC 이점 활용.
- **viewport 분기 = 단일 mount** — 두 컴포넌트 동시 mount 시 /api/workers 중복 호출 + bottom sheet portal 부작용. matchMedia 결정 전엔 빈 배경으로 한 frame 흡수.
- **관리자 홈 구성 = KPI + 카테고리 카드 둘 다** — KPI만(메트릭 중심)과 카테고리만(공간 단순) 옵션 중 추천안 채택. "오늘 뭐부터" + "어디로 갈지" 동시 제공.
- **역할별 진입 분기 = defaultLanding(role)** — ADMIN/MASTER → /admin/master, WORKER → /. callbackUrl이 있으면 그게 우선(보안 검증 유지).
- **카테고리 접기 = 마스터/시스템·운영 기본 접힘** — 첫 진입 시 사이드바 짧게 + 사용자 선택 localStorage 보존. 현재 페이지 속한 카테고리는 자동 펼침(활성 항목 숨김 모순 방지).
- **카테고리 활성 시그널 = 작은 점 제거 + 글자색 강조** — 위치 변동 없이 신호만 유지(text-[#191F28] vs gray-700). 점은 1×1px이라 정보 전달 약함.
- **항목 좌측 정렬 통일 = 단일 flex 구조** — enabled/disabled가 별도 className으로 분기돼 시각 차이 발생하던 것을 단일 `<a flex>`로 통합. 칩은 조건부 + shrink-0.
- **사이즈 컬럼 규칙** — 미수 1~2자리는 박스당 마리수로 해석해 spec(kg)/N 계산. 3자리 이상은 이미 g 단위로 간주(계산 생략). "약 xxxg" / "약 xxx~xxxg" 형식 + 작은~큰 자연 정렬.
- **swap on click = 보관처 알파벳 정렬보다 자연** — 같은 데이터를 두 관점(보관처 우선 / 품목 우선)으로 보는 게 진짜 목적. asc/desc 무의미.
- **table-fixed + colgroup = swap 흔들림 0** — 보관처/품목 220px 동일, 나머지 명시 너비. truncate + title로 220px 초과 hover 풀텍스트.
- **PC 누수 엣지 = 1번(현 상태 유지)** — PC ADMIN/MASTER 자연 흐름은 모바일 UI 0. PC WORKER 로그인(/)·URL 직접 타이핑은 엣지. 권한 분리 시 자연 해소.
- **'LOT' 라벨은 내부 식별자만** — 사용자 노출 라벨은 '재고'로 일관. URL `/admin/master/lots`는 phase 3 후반 IA 정리 때 함께 이전.
- **IA 비중복 원칙 = "형제 메뉴는 서로 다른 질문"** — 한쪽이 다른 쪽의 상세·필터·합계면 메뉴(형제)가 아니라 drill-down/탭/필터로 들어간다. LOT 생애주기·LOT 누적비용을 형제에서 빼 LOT 상세로, 결재 일괄/이력을 수신함·거래이력으로 흡수.
- **재고 컬럼 너비 = 내용 최소 + 둘 같게** — MAX(남는 폭 채움)·작은 고정 옵션 중 swap 시 여백 통일감 때문에 "내용 자연너비 측정 후 더 긴 쪽으로 통일" 채택. 순수 CSS 불가라 측정 equalize.
- **세부 가격·원가·출처 = LOT 상세 귀속** — 수매가·경비·판매원가·매입자·선박명 등은 per-LOT라 집계 불가 + 표 컬럼도 부적합(18컬럼). 재고(LOT별)→LOT 상세 drill-down. 기간 손익 집계만 원가·손익 카테고리.

**미해결 이슈**
- **🔴 가격·원가가 PC 관리 화면에 안 보임** — 손익·가격은 현재 일일 정산 이메일(+`/api/preview/daily-report`)에서만. 재고/집계/생애주기 화면 가격 표시 0. 데이터·cost-calc·스키마는 존재, 표시만 미구현.
- **🔴 1주 PC dogfooding 본격 시작** — 로그인 split + 관리자 홈 + 결재 수신함 + 사이드바 카테고리 접기 + 재고 조회/집계 + LOT 생애주기 등 진입 가능 14화면 실사용 메모. 카테고리 IA 동선·결재함 검색·KPI 정확성 확인.
- **재무회계 PC IA 잔여 13 슬롯** — 거래 이력 5 / 원가·손익 5 / 시스템·운영 5 (catch-all + ComingSoonPage placeholder). 결재 확장 2.
- **품목/규격에 따른 사이즈 표시 검증** — 실 데이터(130 품목 × 다양한 spec/misu) dogfooding 중 g 환산 정확도·"약" 접두 합리성 체크.
- 장기 유지 항목은 5/28 그대로 — 갈치 LOT 16건 / 기존 재고 200건 비용 / 판매처 마스터→다국어 / Airtable view 4·Automation 7 / `.` 보관처·`해원냉동(구좌)` 정리 / GitHub Actions CI / `PRODUCT_FIELDS.category` stale 정정.

**다음 작업 후보**
- **🔴 (1순위) LOT 상세에 '비용 내역' 섹션 추가** — lot-detail.ts/master-lot-timeline.ts에 수매가·누적냉장료·동결비·입출고비·노조비·이월경비·판매원가 매핑 + 생애주기 화면 비용 카드 + 출고 이벤트에 출고시점 판매원가/손익. 재고(LOT별) 클릭 → LOT 가격 즉시 노출.
- **(2순위) 원가·손익 카테고리 화면화** — 손익 추이(일일정산 이메일 손익을 화면으로) / 매입 통계.
- **1주 dogfooding** 후 결재함·홈·재고 화면 fix
- 모바일 로그아웃 진입점 (PC는 사이드바에 추가됨, 모바일은 `/`나 `/admin/dashboard` 우상단 후보)
- Phase 3 다음 카테고리 — IA 3번 거래 이력 5화면 (입고/출고/이동/지출 admin 표 + PDF 재발행, 결재상태 필터로 결재 이력 검색 흡수)
- 외부 ERP export 1차 (CSV 출력) — IA 4번 핵심 약속
- 어업종류 옵션 결정 → 선박 폼 활성화
- Master 페이지 패턴 안착 후 Table/Modal primitive 추출
- 다국어 라벨 트랙 시작 (판매처 마스터 → 재고표 PDF → 다국어)

---

### 2026-06-01

**완료한 작업**
- **LOT 상세 '판매원가' 카드 신설** — `lib/cost-calc.ts`에 `calculateLotCostBasis` 순수함수(오늘 기준 박스당 누적: 수매가+냉장료+입출고비+노조비+동결비+이월) + 단위 테스트 5케이스(단위 140→145). master-lot-timeline cost 반환 + lot-timeline 페이지 CostCard. **PC 화면 첫 원가 노출**.
- **생애주기 조상 LOT 체인 추적** — 이동 입고 LOT을 재고이동.`원본 LOT번호`로 루트 입고까지 거슬러 올라가, LOT번호 바뀌기 전 원본의 입고·출고 기록까지 한 타임라인에 포함. 이벤트별 LOT 배지. 부모 추적(경량 2회/LOT) + 번들 `Promise.all` 병렬화(≈6s→3.4s).
- **생애주기 정렬·표현 개선** — 정렬 2차키 `createdTime`(같은 날 인과 순서 보정: 0180→0181이 0181→0182보다 먼저). 이동을 **이동 출고(−)/이동 입고(+) 두 줄로 분리** + 각 LOT 잔여재고(통장식). 부호·색(입고·이동입고 +파랑 / 출고·이동출고 −빨강). 헤더 LOT번호 색 검정 통일.
- **LOT 상세 2단 레이아웃** — 좌: 재고정보+판매원가 스택 / 우: 이벤트 타임라인. '원가'→'판매원가' 라벨. 재고정보 카드 내부 세로 정리.
- **재고 조회 컬럼 대폭 보강** — 최초입고일을 LOT번호 뒤로 이동 + 수매가·총중량(현재 재고 기준)·판매원가·평가액·보관일수 컬럼 추가. 평가액 합계 부제 + **맨 아래 합계 행**(재고수량·총중량·평가액, 선택 시 선택분/없으면 전체). '재고(LOT별)'→'재고 조회' 라벨.
- **재고장 다중선택 출력** — `/admin/ledger` A4 인쇄 라우트(사이드바 밖, 권한 게이트 유지) + 체크박스 다중선택/툴바 + CSV(BOM+이스케이프) + localStorage 핸드오프 새 탭.
- **재고 조회 필터** — 상태칩 맨 오른쪽 이동 + 필터 패널(입고기간/규격/미수/원산지/보관처(datalist 드롭다운검색)/보관일수) `flex-grow` 폭 균등. 품목명은 밖 검색과 중복이라 필터 제외.
- **ServiceWorker prod-only 등록**(`app/components/ServiceWorker.tsx`) — dev에서 cache-first SW가 옛 청크 서빙해 일반 새로고침 시 화면 깨지던 것 해소. **사이드바 틀고정**(sticky h-screen + min-h-0: 헤더 고정/카테고리만 스크롤).
- 측정 무게 "kg" 띄어쓰기("33 kg"). 메모리 저장: PC 원가 노출 정책.
- **(오후) 재고 화면 개선 5건 논의 → 1·3·4 채택, 2·5 보류** — 사용자와 재고 조회/집계 개선 아이디어 의논 후 즉시 구현.
- **생애주기 세대 구분선**(#1) — 이벤트 타임라인에서 입고·이동 입고(새 LOT 생성 순간) 직전에 `GenerationDivider` 라벨 구분선(📦 신규 입고 / 🔁 이동 입고 + LOT번호). 조상 체인이 섞인 타임라인의 세대 경계를 한눈에. `Fragment` 도입.
- **재고 조회 비고 컬럼 + 상태 점 축소**(#3) — `Lot.memo`(비고, `str(f["비고"])`) 신설(맨 오른쪽 컬럼, max-w truncate+tooltip). 상태는 `승인 완료`(대다수)는 조용한 초록 점+사유 tooltip, 예외(소진/반려/취소/대기)만 배지. Airtable 비고 채움률 65%(128건, 라벨색·재포장·구물·상환 메모 등) 확인 후 추가 결정.
- **재고 집계 보관처 합계 비용 컬럼**(#4A) — 보관비(Σ(박스당 판매원가−수매가)×재고)·평가액(Σ 판매원가×재고) 컬럼 + 합계 행. storage-only 뷰 한정, 현재고 기준 누적(오늘 기준). 헤더 tooltip로 "기간 발생액 아님" 명시.
- 검증: `tsc --noEmit` 0 오류 + 3 화면(lots/inventory-summary/lot-timeline) 200 + 컴파일 경고 0.

**결정 사항**
- **PC 관리자 화면 원가 노출 OK / 모바일·작업자 숨김** — 기존 "가격·원가 PC 미노출"을 재해석: 그 원칙은 고객 근처인 모바일·작업자 한정, 게이트된 `/admin/*`는 관리회계 도구라 원가 노출이 정상. (CLAUDE.md 2026-05-29 메모의 옛 문구는 dated 기록으로 보존)
- **이동은 두 줄(출고/입고)로** — 한 이동이 두 LOT의 재고를 반대로 바꾸므로, 통장식으로 각 LOT이 0이 되는지 추적·점검하려면 양쪽이 필요. 단일 줄은 "한 이동에 잔액 2개" 모순.
- **잔여재고 = LOT별 + 반려 출고 미반영**(실제 차감 X). 정렬 = 업무일 1차 + createdTime 2차.
- **재고장 = 현재 보유 스냅샷**(이동 이력 묶음 아님). 출력은 A4 인쇄 + CSV.
- **필터에서 품목명 제외** — 밖 검색(LOT번호·품목명)이 담당 + 필터와 AND로 결합되므로 중복.
- **규격 "11kg"는 공유 포매터(formatSpec)라 그대로** — 모바일·PDF까지 영향이라 측정 무게(총중량 등)만 "xx kg" 띄움.
- **원가·손익을 거래 이력보다 약간 당겨 진행** — dogfooding 중 "원가 안 보여 답답"이 실제로 드러남. 단 "한 번에 하나 → 1주 사용 → 다음" 원칙은 유지(전부 만들고 dogfooding은 비추).
- ServiceWorker는 prod-only 등록(표준 방식).
- **예측형 분석(2 판매가·수매가 추세 / 5 악성재고 패턴 마이닝)은 PC 모드 안정화 후로 보류** — 더 큰 그림에서 봐야 채널 설계가 산다. 지금은 기존 자산 재활용 가능한 1·3·4(퀵윈)만.
- **#4 보관처 비용은 누적(4A) 먼저 → 기간 발생액(4B) 다음** — 냉장료는 flow(일자 적산)·입출고/노조/동결은 1회성이라 기간 정산은 LOT 체류구간 적산이 필요. 4A는 "현재고에 묶인 보관비(오늘 기준)" 근사.
- **#3은 교체 아닌 역할 분리** — 상태(재고수량·활성/소진 필터와 중복 → 점으로 축소) + 비고(운영 플래그 → 컬럼). 비고 채움률 데이터(65%)로 컬럼 추가 정당화.

**미해결 이슈**
- **기존 등록된 SW는 코드만으론 안 사라짐** — 사용자가 DevTools(Application→Service Workers→Unregister + Clear site data) 1회 정리 필요. 이후 dev에선 재등록 안 됨.
- **재고 조회/재고장 1주 dogfooding** — 컬럼 14열 가로 스크롤·필터 동선·합계 정확성·재고장 인쇄 레이아웃 실사용 확인.
- 장기 유지 항목 5/29 그대로 — 갈치 LOT 16건 / 기존 재고 200건 비용 / 판매처 마스터→다국어 / Airtable view·Automation / `.`·`해원냉동(구좌)` 보관처 정리 / GitHub Actions CI / `PRODUCT_FIELDS.category` stale.
- **#4B 기간별 보관처 발생액 미구현** — LOT 체류구간 적산 필요(다음 단계).
- **비고는 화면 표만** — CSV·재고장 인쇄 미반영(선택). 보관비/평가액 컬럼 정렬 미지원(선택).
- **1·3·4 퇴근 후 dogfooding** — 구분선 위치·상태 점·보관비 라벨 실사용 확인 예정.

**다음 작업 후보**
- 재고장 출력·CSV에 수매가·보관일수 동기화 여부 (현재 판매원가·평가액만)
- 오래된 재고 색 강조 — 보관일수 임계값(냉동/선어 기준 미정) 정해지면 적용
- 재고 조회 1주 dogfooding 후 → 거래 이력(입고 이력) 또는 원가·손익 다음 화면
- 이동 두 줄 시각적 페어링(선택) / 원가·손익 화면화(손익 추이·매입 통계) / 거래 이력 5화면 / 어업종류 옵션 → 선박 폼 / Table·Modal primitive 추출 / 다국어 트랙
- **#4B 보관처 기간별 발생 비용**(체류구간 적산) / 비고·보관비 컬럼을 CSV·재고장에 동기화 / 보관비·평가액 정렬
- **(PC 모드 안정화 후)** 2 판매가·수매가 분석 채널 + 5 악성재고 워치리스트·패턴 분석

---

### 2026-06-02

**완료한 작업**
- **재고장 출력 대폭 보강** — 수매가·보관일수 컬럼(A4+CSV) + 원산지 컬럼(미수↔보관처 사이) + **가로(landscape) 기본 출력** + 출력일시(좌상단)·타이틀 가운데정렬·페이지번호(@page counter). 텍스트 컬럼 가운데·숫자 우측 정렬.
- **PC 화면 글씨체 통일** — `font-mono` 일괄 제거(재고장 LOT번호 + lot-timeline 5곳·health·ships·products·dashboard 2곳 = 10곳/5파일). 모바일 작업자 공용 컴포넌트는 미변경(별도 트랙).
- **재고 집계 개선** — 총중량(kg) 컬럼 3뷰 추가 + 품목 헤더 정렬 가능 + 부제 "승인 완료·소진" + 그룹 키 `JSON.stringify`(이어붙이기 충돌 방지).
- **LOT 생애주기·툴팁** — 타임라인 마지막 이벤트 커넥터 선 제거(isLast) + 보관일수(최초입고 기준)/냉장료(이동입고일 기준) 차이 툴팁.
- **재고 조회 UX** — 체크박스 **드래그 선택**(mousedown+mouseenter 범위, snapshot 기반) + **LOT번호 컬럼 sticky 고정** + `whitespace-nowrap`(가로 좁아도 한 줄).
- **사이드바 rail 접기** — 우상단 토글 접힘 고정(localStorage) + 접힌 상태 호버 시 임시 flyout(absolute, 본문 안 밀고 덮음) + 접기 클릭 즉시 접힘(hovering=false) + rail "S" 제거.
- **매입처 마스터 대청소** — 276 → 149 (127건 삭제: 비수산 102 + 확인필요 17 + 추가 비수산 7 + 한국인테리어가구 1). 역링크로 미사용 판정 + 이름·업태·종목 분류 + 백업 JSON(`tmp-매입처_삭제백업_276to149.json` 127건). Airtable MCP 일괄 삭제.
- **버전 관리(시멘틱 버저닝) 도입** — `package.json` 0.5.0 단일 출처 → `next.config.ts`가 `NEXT_PUBLIC_APP_VERSION` 주입 → `lib/version.ts:APP_VERSION`. 로그인 좌하단(연도 옆)·`/admin/master` 좌하단 v노출. 로그인 기능문구 3개 삭제(+`FeatureItem` 정리).

**결정 사항**
- **dogfooding 단위 = 카테고리 챕터당 1주**(기능 1개씩→챕터 단위로 변경, 진행 속도 위해). 메모리 저장.
- **버저닝 3규칙** — ① 버전=변경 종류(작업량 아님) ② 눈에 보이는 변화 배포 시 1릴리스=bump 1회, 등급은 최상위(docs·리팩토링·WIP skip) ③ Phase 4=1.0.0, 0.x=출시 전. 오늘=MINOR → 0.4.0(어제 앵커)→**0.5.0**.
- **재고장 정렬** — LOT번호 좌측/텍스트 가운데/숫자 우측. 세로 점선(그룹 경계)은 시도 후 **롤백**.
- **매입처** — 미사용≠불필요(잠재 거래처), 비수산만 정리·삭제 전 백업 필수·수산(사조오양 등) 보존. 지출 vendor가 매입처에 혼입된 정황 확인 → 추후 분리 과제.
- 페이지번호는 @page counter best-effort(Chrome 미렌더 가능 → 인쇄 대화상자 머리글/바닥글 fallback). 폰트 통일은 PC만(모바일 미변경).

**미해결 이슈**
- 이번 세션 변경(재고 챕터 + 사이드바 + 버저닝) **미커밋** — 이 wrap-up이 첫 버전 커밋(0.5.0).
- 재고장 **페이지번호 브라우저 인쇄 렌더 검증** 필요(CSS 페이지 카운터 미지원 가능).
- 재고 챕터 **1주 dogfooding** 계속 — 사이드바 flyout·드래그 선택·LOT sticky·총중량 유용성 실사용 확인.
- 오래된 재고 색 강조 — 보관일수 임계값(냉동/선어) 팀 상의 후 적용 보류.
- 임시파일 — `tmp-매입처_삭제백업_276to149.json`(보관 권장) / `tmp-매입처_미사용_분석.csv`(삭제 가능). 매입처 sticky 셀 행 hover 흰색 유지(사소).

**다음 작업 후보**
- 재고 챕터 dogfooding 후 → **원가·손익 챕터**(손익 추이 / 매입 통계 / #4B 보관처 기간 발생액 / 외부 ERP export CSV).
- 거래 이력 5화면(입고/출고/이동/지출 admin 표 + PDF 재발행).
- **매입처-지출처 분리**(지출 vendor 혼입 정리 후속).
- 재고장 CSV·출력에 비고 동기화 / 보관비·평가액 정렬 / 이동 두 줄 시각 페어링.

---

### 2026-06-04

**완료한 작업**
- **원가·손익 챕터 1번 화면 '손익 추이' 신설** — `app/admin/master/cost/profit-trend/page.tsx` + server action `app/actions/admin/master-cost.ts:getProfitTrend(from,to)`. `_nav.ts` 손익 추이 `enabled:true` 활성화(준비중 노란 배지 → 파란 활성). 버전 **0.5.0 → 0.6.0**(MINOR=화면 추가).
- **두 층 손익 병행 표시**(사용자 결정 "둘 다") — ① 매출총이익(매칭 COGS)=출고 승인 시 스냅샷된 `출고시점 손익` 기간 집계(진짜 마진) / ② 현금흐름=매출−수매−지출(daily-report 공식의 기간 확장). 매출은 공유, 차이는 각주로 명시.
- **전용 날짜범위 조회**(getMyRequests 14일 한계 회피) — 출고/입고/지출을 `filterByFormula`(승인완료 + `DATETIME_PARSE` 경계) + 코드 재필터 + 페이지네이션으로 직접 조회. 일별 버킷 + 품목별/판매처별 분해 + 합계. 입고는 `비고`=재고이동·기존재고 제외(실제 매입 아님).
- **화면 구성** — 요약 카드 4장(매출/매출원가/매출총이익+마진율/현금흐름) + 추이 표(CSS 이익 바, 양수 초록·음수 빨강) + 합계 행 + CSV 출력 + 원가 미기록 출고 경고 배너 + 정의 차이 각주.
- **422 버그 fix** — 지출결의 테이블에 `결재상태` 필드 없음(`승인상태`만 존재) → formula 참조 시 `INVALID_FILTER_BY_FORMULA`. formula에서 `{결재상태}` 제거(코드 레벨 fallback 유지). Airtable REST 직접 발사로 세 쿼리 200 + `지출일` 채움 검증.
- **dogfooding UX 보강 3건**(사용자 피드백 반영) — (a) 컨트롤 바를 라벨로 분리: "조회 기간"(범위, 프리셋 활성 하이라이트 + 날짜 직접수정 시 프리셋 해제) ⟂ "묶음 단위"(일별/주별/월별). (b) 분해 표에 품목/판매처 **검색 박스**(탭별 placeholder 전환, 즉시 필터). (c) 본문 블록 순서 교체 — 분해표를 추이표 위로(요약 → 분해 → 추이표 → 설명).
- **손익 추이 검색창 다듬기**(`b1369f3`, v0.6.1 PATCH) — 글자 스타일 다른 관리자 검색창과 통일(text-[14px] font-bold + 포커스 ring) + placeholder '품목명/판매처명 검색'(~명 표기 통일) + 돋보기 좌여백·아이콘↔글자 간격 조정.
- **원가·손익 챕터 2번 화면 '매입 통계' 신설**(`/admin/master/cost/purchase-stats` + `master-cost.ts:getPurchaseStats`) — 승인완료 입고만(재고이동·기존재고 제외), 매입처/품목/선박별 분해 + 일별 버킷 + 일별×품목(규격·미수) `productDays`. `fetchNameMap`으로 매입처·품목 link resolve(입고관리.품목명 lookup 우선). `_nav.ts` 활성화, 버전 **0.7.0**(MINOR).
- **원가·손익 표 스타일을 재고 조회와 통일**(손익 추이 + 매입 통계) — 전 컬럼 좌측 정렬, 금액 `₩` 접두사 → `1,234원` 접미사, 수량 `N박스`, 13px/px-4 py-3, 첫 컬럼·핵심값 bold. `table-fixed` + colgroup 고정 폭으로 검색 타이핑 시 헤더 흔들림 해소.
- **매입 통계 검색-우선 품목 분석 UX**(dogfooding 다발) — 품목별 탭 기본+탭 순서(품목별|매입처별|선박별), 품목+**규격+미수** 분리 집계(가중평균 단가), 검색해야 분포 표시(검색 전 빈 표+안내), 비중=검색 품목 내 분포, 분해 표 합계 행(표시 행 기준), 추이 표 품목 스코프(검색 전 숨김·합계/CSV 연동), 요약 카드 전부 삭제(분해 합계와 중복), **사이즈별 단가 추이 SVG 라인 차트** 신설(맨 아래, 규격·미수 조합 상위 6개, 기간 가중평균 수매가, 매입 없는 구간 선 끊김, 호버 툴팁). 컬럼 순서 매입액→수량→평균단가→비중→건, 최근 입고 컬럼 제거, 매입 추이 막대 트랙 2/3·셀 좌측 이동, 품목 컬럼 17% 고정.

**결정 사항**
- **손익 정의 = 둘 다 표시** — 매출총이익(매칭 원가, `출고시점 손익` 재사용)이 진짜 마진이라 메인, 현금흐름(daily-report 방식)은 보조. 기간 매칭 방식이 달라 의미가 다름을 각주로 분리.
- **차트 라이브러리 미도입**(최소 수정) — CSS 이익 바로 시각화.
- **버전 0.6.0**(MINOR) — 눈에 보이는 새 화면 1릴리스 = bump 1회, 등급은 최상위(화면 추가).
- **컨트롤은 두 축으로 분리** — "얼마나 볼지(범위)" vs "어떻게 묶을지(단위)"가 헷갈린다는 피드백 → 라벨·구분선·활성 하이라이트로 역할 시각화.
- **품목 집계 단위 = 품목+규격+미수** — 수산물은 같은 품목도 규격·미수에 따라 단가가 크게 달라 품목명 평균은 왜곡(사용자 지적). 분해·차트 모두 이 단위.
- **매입 통계 = 검색-우선 품목 분석 도구** — 규격·미수 분리 후 전체 나열은 노이즈 → 검색 전 빈 화면, 검색하면 그 품목의 분포·추이·단가 차트로 화면 전체가 좁혀짐. 요약 카드는 분해 표 합계와 중복이라 전부 삭제.
- **사이즈별 단가 차트는 SVG 직접 구현** — 차트 라이브러리 미도입 원칙 유지. 데이터는 추이 필터용 `productDays` 재사용이라 server 추가비용 0.
- **최근 입고 컬럼 제거** — 조회 기간으로 잘린 화면에서 기간 끝 날짜만 반복, "마지막 거래 시점"은 통계가 아닌 거래 이력의 질문.

**미해결 이슈**
- 이번 세션 변경(손익 추이 화면 + 422 fix + UX) 커밋은 이 wrap-up이 처리.
- **품목별 전체 추이 스코프 미구현** — 현재 품목 검색은 분해 표 안 필터(find-in-list). "특정 품목 하나로 화면 전체(요약·기간표) 좁히기"는 server action 품목 필터 필요(지출은 품목 단위 아니라 그땐 현금흐름 지출 제외 처리 필요) — 사용자 확인 후 후속.
- **임시파일 2개 미정리** — `tmp-매입처_삭제백업_276to149.json`(보관 권장) / `tmp-매입처_미사용_분석.csv`(삭제 가능). .gitignore 또는 정리 필요.
- 손익 추이 **1주 dogfooding** — 마진율·현금흐름 정합성(특히 `출고시점 손익` 채움률), 주/월 집계 라벨 가독성, 분해 검색 유용성 실사용 확인.
- **매입 통계 코드 미커밋** — 신설 화면 + getPurchaseStats + 표 스타일 통일 + 0.7.0 bump가 작업 트리에만 존재. feat 커밋 필요.
- **매입 통계 실데이터 dogfooding** — 사이즈별 단가 차트 실데이터 검증(수매가 채움률), table-fixed colgroup 폭 비율 적합성, 규격·미수 분리 후 행 granularity 체감.

**다음 작업 후보**
- 매입 통계 dogfooding 후 → 원가·손익 챕터 **③ 외부 ERP export CSV**.
- **품목 스코프 손익 추이**(server action 품목 필터로 화면 전체 좁히기) — 매입 통계 검색-우선 패턴을 손익 추이에도 적용할지 검토.
- **#4B 보관처 기간 발생액**(LOT 체류구간 적산).
- 거래 이력 5화면 / 매입처-지출처 분리.

---

### 2026-06-05

**완료한 작업**
- **매입 통계 전면 개편 (v0.8.0 MINOR)** — "이 배는 뭘 얼마나 잡나"형 개체 분석으로 재구조화. 3탭(품목/매입처/선박) 완전 대칭: 검색 전 **랭킹 모드**(개체별 일람, 행 클릭→상세 진입) ↔ 검색 시 **상세 모드**(그 개체의 품목·규격·미수 분포). 서버 `productDays` 버킷에 supplier·ship 차원 + `priceMissingCount` 추가(일×품목×규격×미수×매입처×선박 최소 단위 분해).
- **상세 모드 보강** — 매칭 칩("분석 대상 선박 2척 (합산): …" — 부분일치 합산을 명시, 칩 클릭으로 좁히기), 수매가 미기록 경고를 검색 스코프 기준으로 전환, 추이 표 스코프 연동, 탭 전환 시 검색어 초기화.
- **구성 도넛 차트 신설**(매입처·선박 상세) — 단가 추이 차트는 품목 전용으로 되돌리고(품목이 섞이면 시리즈 의미 약함) 선박="어획 구성"/매입처="매입 구성" SVG 도넛(10색+기타, 호버 툴팁, 중앙 합계) + **매입액/중량 기준 토글**.
- **총중량 컬럼 신설** — `lib/spec-display.ts:parseSpecKg` 추가(+단위 테스트 5, 총 150 pass). 규격(kg)×박스 환산, 분포 표·합계·CSV·도넛(중량 기준) 공용. 규격 미상 건은 제외(각주 명시).
- **묶음 단위(일/주/월) 토글 제거** — 기간 길이로 자동 결정(≤31일=일별/≤120일=주별/그 외=월별) + 추이 표 헤더에 "(월별)" 표기. 퇴화 조합(지난 달+월별=1행, 올해+일별=150행) 차단. 새로고침 버튼은 헤더 CSV 옆으로. 손익 추이는 토글 유지(추이-중심 화면).
- **URL 쿼리 동기화** — `useSyncQueryParams` 재사용, `?tab=ship&q=금양호&from=…&to=…` 북마크·새로고침 복원. 프리셋 활성 판정을 state→파생값으로 단순화.
- **CSV 개편** — 분포 표+추이 표 2섹션 단일 파일, 파일명에 탭·검색어 포함(`매입통계_선박별_금양호_….csv`).
- **분석 화면 가로 벌어짐 해결(A+D안)** — 원가·손익 2화면(매입 통계·손익 추이)에 `max-w-[1200px] mx-auto` + 표 colgroup %→px 고정(잔여 폭은 맨 끝/막대 컬럼이 흡수, min-w+가로 스크롤 안전망). **결재 수신함·재고 집계·마스터 5종(제품/매입처/보관처/작업자/선박)에도 max-w 적용 — 총 9화면**. 재고 조회·재고장은 full width 유지(컬럼 많음).
- **크롬식 라우트 탭바 신설** — `app/admin/master/_tab-bar.tsx` + layout 연결. 방문한 화면이 상단 탭으로 쌓임(기존 탭은 포커스), 탭별 마지막 URL(쿼리 포함) 기억→전환 시 검색·필터 상태 복원, X·가운데 클릭 닫기, 드래그 라이브 정렬, 사이드바 항목 드래그로 열기, + 새 탭(홈), localStorage 영속. UI 크롬 충실 재현 — 균등 폭 수축(100~200px), 활성 탭 하단 S-커브(radial-gradient 코너 조각), 비활성 탭 사이 구분선(활성 옆 숨김), 호버 필, sticky 고정.
- **탭 tear-off(새 창 분리, 더블 스크린 A안)** — 탭을 창 밖으로 드래그하거나 호버 ↗ 아이콘 → 화면 우측 절반 새 창으로 "이동"(원래 탭 닫힘). 세션 localStorage 공유로 재로그인 불필요, 팝업 차단 시 toast 안전망(탭 보존).
- 검증 — tsc·eslint·단위 150·통합 93·`next build` 48페이지(레이아웃 Suspense 경계 포함) 전부 통과.

**결정 사항**
- **선박·매입처 탭도 검색-우선 분석 포맷으로 통일** — 사용자 목적이 "선박별로 잡힌 품목·규격·미수 비중". 발견성 보완으로 검색 전엔 랭킹 리스트(행 클릭=검색 자동 입력) — 배 이름을 외우지 않아도 진입 가능.
- **선박/매입처 상세 차트 = 단가 추이 대신 구성 도넛**(사용자 제안) — 개체 분석의 질문은 "단가가 어디로 가나"가 아니라 "뭘 얼마나 잡나/파나". 도넛 기본 기준은 매입액(분포 표 비중과 일치), 물량 관점은 중량 토글로.
- **묶음 단위는 자동이 맞다**(사용자 문제 제기 수용) — 매입 통계는 구성-중심이라 토글 제거, 추이-중심인 손익 추이는 유지. 화면 성격별 비대칭 허용.
- **가로 벌어짐 해법 = A(페이지 max-w) + D(숫자 컬럼 px 고정)** — B(표별 폭 제한)는 카드 끝선 들쭉, C(2단 그리드)는 작업량 커서 보류, E(사용자 토글)는 1인 단계에 과함. 탭 좌측/검색 우측 배치는 유지(차원 선택→개체 지정의 인과 순서 + 랭킹 도입으로 검색이 보조 수단화).
- **탭바 클릭 시맨틱 = 클릭=탭 열기/포커스**(이카운트식 (a)안) — 크롬식 (b)(드래그/Ctrl+클릭만 새 탭)보다 클릭 한 번 동선. 진짜 MDI(탭별 동시 mount)는 App Router와 충돌해 배제, "라우트 즐겨찾기+빠른 전환"으로 정의(전환 시 데이터 재조회, URL 상태만 복원).
- **더블 스크린 = A안(진짜 창 분리) 먼저** — B안(in-app split view)은 화면들의 URL 상태 동기화와 구조적으로 충돌해 iframe pane이 유일한 해법이나 작업량 커서, A 실사용으로 필요성 검증 후 결정. 새 창은 `noopener` 미사용(성공/차단 감지 위해 — 같은 origin 앱 창이라 무해).

**미해결 이슈**
- **오늘 전체 코드 미커밋 + dogfooding 대기** — 매입 통계 개편(0.8.0)·폭 제한 9화면·탭바·tear-off 전부 작업 트리에만 존재. dogfooding 후 채택/롤백 결정(특히 max-w 가운데 정렬 vs 좌측 정렬, 랭킹 모드 기본 진입감).
- **선박명 free text 표기 흔들림** — 입고.선박명이 텍스트 필드라 "금양호/금양 호"가 통계를 fragment. 선박 마스터 link화(또는 정규화)는 데이터 마이그레이션 포함 별도 작업으로 분리.
- 마스터 5종 화면 URL 동기화 없음 — 탭바 전환 시 검색창 상태 소실. 아쉬운 화면부터 추가 예정.
- tear-off 후 두 창이 같은 localStorage 탭 목록 공유(마지막 쓰기 우선) — 거슬리면 창별 분리 검토.
- profit-trend 기존 lint 경고 1건(breakdown useMemo) — 이번 미수정 영역이라 보류.
- 임시파일 2개(`tmp-매입처_*`) 정리 보류 지속.

**다음 작업 후보**
- 오늘 작업 dogfooding → feat 커밋(v0.8.0) 또는 부분 롤백.
- **B안 in-app split view(iframe pane)** — 새 창 분리 실사용 후 단일 모니터 "참조하며 입력" 패턴이 잦으면 착수.
- 매입 통계 drill-down 링크 연결(선박 마스터→`?tab=ship&q=` 등, URL 동기화 기반).
- 기간 비교(작년 동기, 어기 시즌) / 선박 평균단가의 전체 시세 대비 ±% 컬럼.
- 원가·손익 챕터 ③ 외부 ERP export CSV.

---

### 2026-06-11

**완료한 작업**
- 작업 방식·스타일 자가 점검 — 비개발자 1인 운영 + Claude Code 협업 모델의 구조적 위험 3종 정리 및 #1 대응 적용(프로세스/문서).
- 탭바 '창 안 분할(B안)' 신설 — `_tab-bar.tsx` ⊞ 버튼 + `layout.tsx` 분할 컨테이너. 한 창 안에서 우측을 iframe 칸으로 띄워 좌우 더블스크린(드래그 리사이저·칸 헤더 ↗새창/✕닫기). 새 창 분리(↗)는 그대로 둬 **둘 다** 제공. 임베드(맨몸) 모드(`pane=1` + sessionStorage sticky + `self≠top` 가드)로 중첩 크롬 차단. tsc·lint·`next build` exit 0(master 화면 정적 prerender 유지).
- 분할 칸 세션 배너 중복 fix — `SessionGuard`가 framed(iframe)일 땐 배너·카운트다운·만료 리다이렉트를 위쪽 창에 위임하고 활동 감지(`touchSession`)만 유지. 전역 컴포넌트라 일반 화면(`isFramed=false`)은 기존 경로 그대로(회귀 안전).
- 매입 통계 기간 프리셋 정리 — 최근 30일(↔이번 달 겹침) 제거 → **이번 달/지난 달/올해**, 기본 진입 이번 달(`shiftDate` dead code 제거).
- 매입 통계 인쇄 신설 — CSV 옆 '인쇄'(A4 가로, 화면 그대로). `#ps-print` isolation으로 사이드바·탭바·버튼 숨김, 섹션(분포/차트/추이) 독립 페이지(인접형제 `break-before:page`), 선택 탭만, `*` 설명·검색창 인쇄 제외, 표 헤더 페이지마다 반복. 가로 잘림 없음(사용자 확인).
- 손익 추이 동일 적용 — 프리셋(최근30일 제거+이번달 기본) + 인쇄(`#pt-print`, 요약카드=1p/분해표=2p/추이표=3p). 경고 배너가 요약↔분해 사이라 인접형제 대신 **섹션마다 항상 `break-before:page`**.

**고려한 위험 (정직한 자가 평가)**
1. **코드를 스스로 감사 못 하는 구조적 약점** — 테스트·도그푸딩·저널이 닿지 않는 곳(드문 분기 정합성 버그·보안 엣지·미검증 가정)은 조용히 생존. 실제로 테스트는 백엔드 도메인 로직(원가·이동·정합성)에 몰려 있고 최근 다수인 UI 변경(사이드바·탭바·표)은 전량 손 도그푸딩 → 주 사각지대.
2. **Airtable + 낙관적 재시도 한계** — LOT 일련번호 동시성 ~99%, race window 잔여. 저빈도라 현재 OK지만 '미뤄둔 빚'. 상환 시점을 사고가 아니라 계획이 정해야 함.
3. **프로세스 과부하** — CLAUDE.md/journal이 길어지며 기록이 제작 시간을 잠식할 임계점. 저널은 '결정과 왜' 중심으로, 단순 작업 나열은 축소.

**적용한 대응 (위험 #1, 오늘부터)**
- 개발 원칙에 **'검증 사각지대 명시'** 신설(CLAUDE.md) — Claude가 코드 변경마다 [테스트 안 된 부분 / 검증 안 된 가정 / 도그푸딩으로 안 잡힐 사각지대]를 먼저 밝히도록 표준화. 비개발자가 못 보는 '두 번째 눈'을 구조적으로 강제.
- 위험 #2·#3은 인지·기록만(미뤄둔 빚으로 명시), 즉시 대응 보류. 이 정리 자체가 #3을 의식해 CLAUDE.md엔 원칙 1줄만 추가(최근 변경 항목 미추가).

**결정 사항**
- 더블 스크린 = B안(창 안 분할)도 추가, A안(새 창)과 **둘 다** 제공(두 모니터=↗ / 한 모니터=⊞). iframe이 'URL 상태 충돌'(App Router 단일 URL)을 비껴가 B안 핵심 난관을 해소 — 칸은 자기만의 주소·필터·데이터를 가짐.
- 분할 칸 = 세션 UI/리다이렉트는 위쪽 창 단독 담당(`self≠top` 판정). 배너 1개·칸 독립 튕김 제거 + 활동은 공유 세션 연장 유지.
- 기간 프리셋 = 달력 기준(이번달/지난달/올해)이 롤링 30일보다 매입·손익 리뷰에 자연스러움. 트레이드오프(월 경계 무관 직전 30일 뷰 상실)는 수용.
- 인쇄 섹션 분리 = 매입통계는 인접형제 break(경고가 첫 섹션 앞), 손익추이는 항상-break(경고가 요약↔분해 사이라 인접형제 깨짐). 둘 다 '섹션 독립 페이지' 달성.

**미해결 이슈**
- **v0.8.0 전체 미커밋 지속** — 매입통계 개편·max-w 9화면·탭바(새창+창안분할)·SessionGuard·프리셋·인쇄까지 작업 트리에만. dogfooding 후 `next build`→커밋.
- 인쇄 레이아웃은 Ctrl+P 미리보기로만 검증(자동 테스트 없음) — 손익 추이 3페이지 분리·선택탭·가로 잘림 확인 대기(매입통계는 가로 OK 확인).
- profit-trend 기존 `breakdown` useMemo lint 경고 — 미수정 영역이라 보류.
- 임시파일 2개(`tmp-매입처_*`) 정리 보류 지속.

**다음 작업 후보**
- 손익 추이 인쇄 dogfooding → 확인되면 `next build` + **v0.8.0 커밋 정리**(① 기능 묶음+창안분할 ② 자가점검 docs, tmp 제외).
- 오늘부터 새 원칙('검증 사각지대 명시') 실사용 — 코드 변경마다 사각지대 먼저 고지.
- (이월) 매입 통계 drill-down 링크 · 기간 비교(작년 동기) · 외부 ERP export CSV.

---

### 2026-06-12

**완료한 작업**
- 거래 이력 챕터 1번 화면 '입고 이력' 신설 (`/admin/master/transactions/inbound` + `app/actions/admin/master-transactions.ts:getInboundHistory`) — 개별 입고 건 원장(read-only). 상태 무관 전체 조회(승인 완료·대기·반려), 재고이동·기존재고 포함, 입고일 내림차순. 매입처·품목·보관처·매입자 link를 마스터 이름 map으로 resolve.
- 기간 프리셋(전체 기본·이번 달·지난 달·올해) + 상태 필터 칩(전체/완료/대기/반려) + 통합 검색(LOT·품목·매입처·선박·보관처) + 합계 행 + CSV(15컬럼 풀세트).
- LOT번호 클릭 드릴다운 → `/admin/master/lot-timeline?lot=` (재고 조회 기존 패턴 일관). 승인 대기 등 LOT 없는 행은 `—` 비활성.
- 표 정렬 다듬기 — `table-fixed` + `colgroup` 11컬럼 폭 고정, 숫자 우측 정렬·`tabular-nums`, 긴 텍스트(품목·매입처·보관처) `truncate`+툴팁, `min-width:1180` 가로 스크롤.
- `_nav.ts` 입고 이력 `enabled:true`. 커밋 `69772fe` → `local-work-mac` 브랜치 푸시.
- (세션 시작) `git pull` origin/main fast-forward(다른 PC 06-05·06-11 docs 수신) + dev 서버 기동.

**결정 사항**
- **별도 브랜치 `local-work-mac` 분기** — journal의 v0.8.0(탭바·창 안 분할·매입통계 개편·인쇄)은 다른 PC에 미커밋으로 남아 있고 이 PC엔 0.7.0 코드만 존재함을 확인(stash·브랜치·reflog 전수). 이 PC 작업이 다른 PC v0.8.0과 안 섞이게 별도 브랜치로 진행, 추후 main에 v0.8.0 올라오면 rebase 합류.
- 거래 이력 진행 = 입고 하나 먼저(CLAUDE.md '1개씩 → dogfooding → 다음' 원칙), PDF 재발행 제외. 출고/이동/지출은 dogfooding 후 동일 패턴 확장.
- 거래 이력 성격 = 개별 건 '원장'(원가·손익은 집계). 그래서 상태 무관 전체·재고이동/기존재고 포함(실제 일어난 거래라 audit 관점에서 모두 노출).
- LOT번호 컬럼 = 드롭 대신 드릴다운 링크 — LOT 형식에 날짜·품목·규격·미수가 인코딩돼 다른 컬럼과 중복이지만, 유일키·화면 간 교차참조 키라 클릭 내비게이션으로 가치 전환.
- 버전 미bump — `package.json` 0.7.0 유지. v0.8.0 합류 시 충돌 방지 위해 bump는 합류/릴리스 시점에.
- 서버 헬퍼(fetchInRange/fetchNameMap/firstId) = master-cost와 안 엮이게 별도 복제(최소 수정 원칙, 기존 inline 스타일과 일관).

**미해결 이슈**
- 입고 이력 **데이터 렌더링 dogfooding 미검증**(검증 사각지대) — link resolve(매입처/보관처/매입자 이름 표기), 특히 보관처가 link인지 텍스트인지 실데이터 확인, `품목명` lookup 존재 여부, 날짜 경계, '전체' 프리셋의 전건 페이지네이션 성능.
- 컬럼 폭(특히 LOT번호 184px) 실데이터로 잘림 확인 필요.
- 다른 PC v0.8.0 실재 확인 후 main 합류 + 버전 정리 대기.

**다음 작업 후보**
- 입고 이력 dogfooding → 확인되면 출고/이동/지출 이력 동일 패턴 확장.
- 다른 PC v0.8.0 → origin/main 푸시 후 이 브랜치 rebase 합류(package.json 버전 정리).
- (이월) 매입 통계 drill-down · 기간 비교 · 외부 ERP export CSV.

---

### 2026-06-15

**완료한 작업**
- (세션 시작 06-12) 다른 PC의 v0.8.0 묶음을 이 PC 작업트리에서 커밋·푸시 — `98ed168 feat(admin): v0.8.0`(탭바 창 안 분할·매입통계/손익추이 기간 프리셋·인쇄 등 16파일, `package.json` 0.7.0→0.8.0). 임시파일 `tmp-매입처_*` 2건 제외.
- 맥북 `local-work-mac` 브랜치(입고 이력 `69772fe`+`851f680`)를 main에 머지·푸시 — `c6bae2d` 머지 커밋. v0.8.0 파일 ↔ 입고이력 파일 무충돌 통합, origin/main 단일화(ahead/behind 0/0). 06-12 결정('v0.8.0 합류 시 rebase')의 후속 마무리.
- 입고 이력 화면에 **작업자 컬럼 신설** — `master-transactions.ts`에 `worker` 필드(입고 신청·등록한 작업자, `작업자` link) 추가, 기존 `workerNames` 맵 재사용(추가 Airtable 조회 0). 표(보관처↔상태 사이)·검색·CSV 반영 + colSpan 12칸 조정. `tsc --noEmit` 0 에러. **미커밋(dogfooding 대기)**.

**결정 사항**
- v0.8.0/입고이력 통합은 rebase 대신 **merge 커밋** — 양쪽 다 이미 origin에 푸시돼 이력 보존·되돌리기 쉬운 merge 선택(파일 무충돌 확인 후). 솔로 워크플로 main 직접 반영 유지.
- 입고 이력 '작업자'는 `매입자`(이미 CSV 보유)와 **별개 필드로 표시** — `작업자`=입고 친 사람 / `매입자`=산 사람. 생성 시 디폴트 매입자=신청자라 값이 같을 수 있으나 개념 분리.
- 작업자는 표에 추가, 매입자는 일단 CSV에만 유지(표 과밀 방지) — 실사용서 매입자를 따로 쓰면 표에도 추가 검토.

**미해결 이슈**
- 입고 이력 작업자/링크 resolve **실데이터 dogfooding 미검증**(검증 사각지대) — 특히 재고이동으로 자동 생성된 입고 건은 `작업자`가 비거나 '이동 처리자'로 들어가 `—` 표시될 수 있음(이동 흐름은 매입자·입고자 복사만 명시).
- `local-work-mac` 브랜치 잔존 — main 합류 완료라 삭제 가능(`git push origin --delete local-work-mac`) 대기.
- `package.json` 0.8.0 — 입고이력(맥북 '0.9.0 내용')은 버전 미반영, 릴리스 시 0.9.0 bump 필요.
- 임시파일 2건(`tmp-매입처_*`) 정리 보류 지속.

**다음 작업 후보**
- 입고 이력(작업자 포함) dogfooding → 확인되면 매입자 표 노출 여부 결정 + 출고/이동/지출 이력 동일 패턴 확장.
- 0.9.0 bump(입고 이력 릴리스) + `local-work-mac` 브랜치 삭제.
- (이월) 매입 통계 drill-down · 기간 비교 · 외부 ERP export CSV.

---

### 2026-06-29

**완료한 작업**
- 입고 이력 '작업자' 컬럼 커밋 + v0.9.0 (`f249002`) — 06-15 미커밋분 정리.
- **입고 PC 직접 등록** 신설 v0.10.0 (`50200eb`) — `/admin/master/transactions/inbound/new`. 입력 관리자=결정자(바로 승인 토글), `createInboundDirect`(createInventoryRecord→updateApprovalStatus("INBOUND") 연쇄, 신규 도메인 로직 0). 매입처·보관처·매입자·품목 타이핑+자동완성, 원산지 국내산(기본)/일본산 칩, 연속 입력(배치 맥락 유지), 매입자를 작업자와 분리(`매입자RecordId`). 통합 4종.
- 품목도 **인라인 생성 차단** (`5ea6d84`) — PC 경로 `disallowProductCreate` 플래그(폼+백엔드 2중). 모바일 작업자 입고는 자동 생성 유지.
- **빈 env 404 fix** (`6403895`) — `AIRTABLE_INBOUND_TABLE`/`OUTBOUND_TABLE`이 빈 문자열일 때 `??`가 폴백 못함 → `||`로 교체(입고·출고·LOT상세 7곳). 입고 PC 등록 첫 도그푸딩서 발견된 잠복 버그.
- **거래 이력 출고·이동·지출 이력 화면** 신설 (`ace858b`) — `getOutboundHistory`/`getTransferHistory`/`getExpenseHistory` + 페이지 3종(입고 이력 동일 패턴: 기간 프리셋·상태칩·검색·합계·CSV), nav 활성. 서브에이전트 3 병렬 작성.
- **출고·이동 PC 일괄 등록** (`c100e37`/`59d9c5e`) — 워크리스트(LOT 검색→담기→행별 입력→일괄 등록+승인, 부분 실패 허용). 출고: 수량·판매처·판매가. 이동: 이동수량·이동후보관처(드롭다운). `createOutboundDirect`/`createTransferDirect`, `createOutbound/TransferRecord`가 레코드ID 반환하도록 보강. 통합 각 3종.
- **지출 PC 직접 등록** (`3c0e63c`) — 단순 폼, 100만원 권한(서버 재검증 — ADMIN ≥100만원은 승인대기로). 통합 4종.
- **재고원가 라벨 변경** (`832e9ef`) — 재고 상태 '판매원가'→'재고원가'(LOT생애주기·재고조회·재고장·재고집계). 매출 맥락 `출고시점 판매원가` 필드는 유지.
- **부자재·경비 마스터** 신설 (`3078dc6`) — Airtable 테이블 MCP 생성(분류 4섹션 아이스팩·박스·내피·진공팩, 품명·단가·단위·활성·비고), CRUD(`master-materials.ts`) + 4섹션 페이지 + nav. `MATERIAL_SECTIONS`는 `lib/material-sections.ts`로 분리('use server' const export 제약).
- **LOT 생애주기 판매원가 계산기** (`a175277`) — 재고원가 카드 아래 그리드, 부자재 칩 선택 → 판매원가 = 박스당 재고원가 + Σ(선택 박스당 단가) + ×재고수량 총액. 계산기형(비저장).
- 테스트 단위 150 / 통합 107(직접등록 통합 13개 신규). tsc 0, 전 구간 그린.
- **판매원가 카드 UI 다듬기** (`275969a`) — 영수증식 분해(선택 항목 줄줄이)·섹션별 드롭다운 단일선택(칩 전체노출 폐기)·재고원가 카드와 폭 정렬(좌측 칸)·**kg단가 환산**(판매원가÷규격, parseSpecKg)·중복 '판매원가/박스' 줄 삭제.
- **업무 프로세스 문서화 시작** (`a70cc1d`, `docs/업무프로세스.md` v0.1) — 수산물 유통 가치사슬 단계별(매입→입고→보관→가공→이동→판매→정산) + ❓(미확인). 코드에 고객 마스터·주문·견적·수출 엔티티 **없음 확인** → 현 시스템=재고·원가 시스템, **판매 앞단(고객·주문·가격·수출·운임) 공백**.

**결정 사항**
- PC 거래 등록 공통 정책 — **입력 관리자가 곧 결정자**(바로 승인 ON 기본). 결재는 권한분리 게이트일 뿐 아니라 커밋 트리거(LOT·재고·PDF)라, PC 관리자 입력은 "입력=즉시 커밋"이 맞음. 기존 createXxx→updateApprovalStatus 연쇄만, 신규 도메인 로직 0.
- **인라인 마스터 생성 전면 금지** — 매입처·보관처·매입자·품목 모두 기존에서만 선택(오타로 마스터 오염 방지, 276→149 청소 취지). 새 항목은 각 마스터에서 먼저. 모바일 작업자 입고만 품목 자동생성 유지(현장 대응 보호).
- 출고·이동=일괄 워크리스트 / 입고·지출=단건 폼 — 출고/이동은 기존 LOT 선택이라 표 기반 다건이 자연스러움.
- 원가 용어 — 재고 상태=재고원가, 판매=매출원가(`출고시점 판매원가` 필드 유지), 제조원가는 안 씀(유통업). 판매원가(생애주기)=재고원가+부자재·경비. (메모리 cost-terminology)
- 부자재 단가는 박스당 통일(판매원가 합산 단순화), 테이블은 MCP로 생성. 판매원가는 계산기형(비저장) 먼저.
- **판매 2모드 정리**(메모리 sales-modes-cost) — 소포장(고가·소량: 재고원가+부자재+운임) / 벌크 컨테이너(저가·대량: 재고원가+운임, 부자재≈0). 운임=변동 입력(부자재 마스터 아님). 고가 냉동 소량은 박스·아이스팩·내피, 저가 대량은 재고 그대로+운임이 핵심.
- **'원가 계산' 화면을 원가·손익에 신설하는 방향** — 여러 재고 판매원가·마진 일괄. 부자재 적용은 행별 수동보다 품목/규격 템플릿 검토. 생애주기 계산기(1건 점검)와 공존.
- **업무를 docs로 문서화해 "맞는 것"을 만드는 기준 삼기** — Claude가 프로세스를 정확히 알면 효율↑. 사용자 답변으로 ❓ 채울 예정.

**미해결 이슈**
- **PC 입력 폼 4종(출고·이동·지출 등록) + 부자재 마스터 + 판매원가 계산기 브라우저 도그푸딩 미검증** — 컴파일·라우트 200까지만. 입고 등록만 실사용 검증(거기서 404 버그 발견·수정).
- 이력 백엔드 필드명은 생성 코드 기준 추론 — 특히 이동 이력(원본 LOT번호·이동 전/후 보관처 link resolve) 실데이터 렌더 미확인.
- PDF 재발행 — 거래 이력 챕터 마지막 1칸(준비중).
- 판매원가 — 운임 반영 방식(목적지·물량 변동이라 고정 칩 부적합), 필렛수 단위(미확정), 저장형 전환.
- 11커밋 미푸시(이번 wrap-up에서 푸시) + `local-work-mac` 브랜치 잔존 + tmp-매입처 2건(이월).
- **업무 프로세스 ❓ 미답** — 판매 앞단 8문항(판매가 산정·주문 흐름·국내/수출·운임·가공·이동 이유·매입 발주·조직) **다음 세션 답변 예정**(메모리 process-doc-pending-answers — 그 주제 나오면 질문 재제시).
- kg단가는 총중량(규격) 기준 — 아이스팩·박스 무게 차감 미반영(실 알맹이 단가보다 낮게 나옴, 부자재 마스터에 무게 필드 추가 시 보정 가능).

**다음 작업 후보**
- 출고·이동·지출 등록 + 부자재 마스터 + 판매원가 계산기 **도그푸딩**(최우선).
- PDF 재발행(거래 이력 마지막 화면).
- 판매원가 운임·필렛 확장 / 저장형 검토.
- 릴리스 버전 정리(0.10.0 이후 다수 화면 추가분) + `local-work-mac` 삭제.
- **업무 프로세스 ❓ 답변 수집** → 문서 갱신 → 그 기반으로 **'원가 계산' 화면 설계**(판매 2모드·마진).

---

### 2026-06-30

**완료한 작업**
- **업무 프로세스 8문항 답변 수집·반영** (업무프로세스 v0.2→v0.4) — 핵심 통찰: 회사가 단순 유통이 아니라 **가공 중심**(선별→외주 임가공→재입고→소분→판매). 판매=원가 기반 건별 협상(가격표 없음·시세 변동). 필렛 2종 ONE-Frozen(제주 24h)/TWO-Frozen(부산·해외 1~2달, 수출 후 재수입). 수입+부산↔제주 물류. 운임 자사·수출 CIF. 이전 ERP=씨오버(Seaover).
- **원가·가공 모델 A~E 확정** — A 원가 4단 사다리(재고원가→가공원가→판매원가→매출원가, '제조원가' 폐기·'가공원가' 채택) / B 가공=별도 거래(N원물→1가공품) / C 수율=실측(총비용÷산출kg) / D 수입부대비 단가 직접 포함(현행 유지) / E 임가공비=가공거래에만+가공공장 단가 마스터 자동(이중계상 차단).
- **용어 위키** 신설 (`/admin/master/ops/wiki`, `8fd4231`) — 검색 + 개념 카드(가치사슬·원가 4단 사다리·ONE/TWO-Frozen·판매 2모드)·용어집·한글 앵커. 정적 페이지, docs/업무프로세스.md 미러.
- **가공비 단가 마스터** 신설 (`/admin/master/processing-rates`, `aa3bf6c`) — 가공공장×가공품 단가표(기준 투입/산출kg당·적용기간, 보관처 비용 이력 패턴). Airtable '가공비 단가' 테이블 MCP 생성 + master-processing-rates.ts.
- **가공 거래 기능** 신설 (`/admin/master/processing`, `2cba3ec`) — 2단계 WIP: ㉠투입(원물 차감→가공 중, 부분 투입·단가 스냅샷) → ㉡완료(실측 총중량→가공품 LOT 생성+가공원가 롤업) + 취소(원물 복구/가공품 무효화 가드) + 워크리스트 UI·재공품 뷰. Airtable '가공 거래'+'가공 투입' 테이블, master-processing.ts, 순수함수 calculateProcessingCost(cost-calc.ts).
- LOT별 재고.상태사유에 '가공 투입'·'가공 입고' 옵션 추가(사용자 수동).
- 테스트 단위 154(+4 가공원가 롤업) / 통합 109(+2 가공 골든패스 ㉠→㉡ 88,286원 + 취소 복구). tsc 0 전 구간 그린.
- **가공 투입 UI 전체 페이지 워크리스트화** (`1699ae5`) — 도그푸딩 중 모달이 답답하다는 피드백 → 이동 등록 패턴으로 리팩토링. 모달→전체 페이지(`/admin/master/processing/new`): ① 가공 정보 → ② 원물 LOT 검색(백엔드 searchTransferLot) → ③ 작업목록 카드. **검색 결과=작업목록 동일 표 양식**(공통 colgroup, LOT번호/품목/규격/미수/재고/보관처) → '＋담기' 시 같은 모양으로 아래 쌓임. 메인 페이지 투입 모달 제거→링크. LOT번호 산세리프 통일(font-mono 제거).

**결정 사항**
- '제조원가' 폐기·'가공원가' 채택 — 정식 제조원가회계(명세서·간접비 배부) 기대 회피 + 가공 중심 반영. 4단 사다리로 원물·제품 둘 다 취급 반영.
- 가공 = 입고·출고·이동과 나란한 **4번째 재고 사건(변환)** → 별도 거래. 이유: 수율로 이동의 1:1 반려 가드(나온 양=들어간 양) 깨짐 + N원물→1가공품(N:1). 테스트된 출고·이동 로직 무수정, 원가 이월 장치만 재사용.
- **2단계 WIP(가공 중 재공품)** — TWO-Frozen 1~2달 떠 있어도 장부 가시화로 오판매 방지. ONE·TWO 공통(혼합 X, 코드 한 갈래).
- 산출=실측 총중량(kg) 직접 입력(박스 역산 X — 가공품 무게·피스 가변). 가공품 LOT은 명목 규격 아닌 실측 총중량 보유.
- 가공품 입고관리 **수매가=0** (가공품 재입고는 '매입' 아님 — 원물은 자기 입고 시점에 이미 계상) → 매입 집계 0 기여로 이중계상 회피, 테스트된 집계 코드(master-cost 등) 무수정.
- 빌드 순서=단가 마스터→가공 거래(테이블→㉠→㉡→UI→취소), 도메인 로직엔 통합 테스트 동반.
- 가공 투입 UI = **이동 등록(전체 페이지 워크리스트) 패턴** 채택 — 모달은 폼+검색+행이 좁아 답답. 검색 결과를 작업목록과 동일 표 양식으로 통일(담기=같은 모양으로 아래 쌓임). 완료(㉡)는 필드 4개 작은 폼이라 모달 유지. 백엔드 검색(searchTransferLot 재사용)으로 전체 LOT 로드 회피.

**미해결 이슈**
- **#4 원가 계산 화면** 미빌드 (원가·손익 카테고리, 판매 2모드·마진 일괄) — 마지막 남은 빌드.
- 가공 거래 **브라우저 육안 도그푸딩 미검증** (라우트 200·테스트까지). 실데이터 1건 ㉠→㉡ 돌려보기 필요.
- ㉠ 다건 차감 부분실패 시 [INTEGRITY-ALERT] 로깅만(전체 롤백 X).
- 가공품 입고관리 수매가=0 → 입고 이력에 0원 표시(재무 무해, cosmetic). 원하면 비고 '가공 입고' 제외로 숨김.
- ONE-Frozen 묶음 단위(한 통=1LOT vs 한 공장분=1LOT) 비즈니스 협의 미정.
- 품목구분 일부 오분류(연어 필렛·명태포·명태민찌가 '원물') 청소.
- tmp 매입처 2파일·`local-work-mac` 브랜치 잔존. 릴리스 버전 0.10.0 그대로(정리 대기).

**다음 작업 후보**
- 가공 거래 **브라우저 도그푸딩** (가공공장·단가 채우고 1건 ㉠→㉡ 실행).
- **#4 원가 계산 화면** 빌드 (가공원가·부자재·운임 → 판매원가·마진 일괄).
- 가공 생애주기 추적 화면(가공품 → 원물 조상 체인).
- 판매원가 운임·필렛수 단위 확장 / 저장형.
- 릴리스 버전 정리(0.10.0 이후 다수 화면 추가분) + `local-work-mac` 삭제.

---

### 2026-07-01

**완료한 작업**
- UI 사소 3-fix (가공·이동·출고 워크리스트) — placeholder `≤ N`→`최대 N`, 삭제버튼 `tabIndex=-1`(Tab이 삭제 건너뛰고 다음 입력칸으로), 정렬 불일치 정리.
- CLAUDE.md 「데이터 테이블/목록 화면 규칙」(노션풍) 신설(■ UI/UX) — 여러 차례 정련: PC(/admin) 한정·숫자 우측+헤더=셀 정렬·표시숫자는 셀 왼쪽 고정폭 상자(우측 끝 정렬)/입력칸은 고정폭+중앙 헤더·위계(설정<도구<결과물)·solid CTA 1개·컬럼폭 내용비례·min-width 인라인 스타일 권장.
- 가공 투입 페이지 노션풍 전면 재설계(레퍼런스) — 카드 최소·여백 우선, 섹션 제목 아이콘+텍스트, 소프트 필드, 작업목록 앵커 카드, 행 hover+삭제 hover-reveal, 재고 숫자 정렬(NumBox), 투입박스 고정폭+중앙 헤더.
- 숫자 세로 정렬 버그 원인규명·해결 — Tailwind v3 임의 rem값(`min-w-[3.5rem]`)이 dev HMR에서 CSS 누락 → 인라인 `style={{ minWidth }}`로 확실 적용.
- 가공 투입 '사료' 품목 제외(가공 전용, 공유 검색 무영향) + ① 필드 가운데 정렬 + select `— 선택 —`→`선택`.
- 공유 프리미티브 모듈 `app/admin/master/_lot-table.tsx` 신설(NumBox·NumInputHeader·SectionTitle·softField·numCellInput·cellField·labelClass) + 가공 리팩터로 검증.
- 이동 등록·출고 등록 노션풍 복제(가공과 동일 룩·정렬, 공유 모듈 사용). 로직 무변경. tsc 0 · 3페이지 HTTP 200.

**결정 사항**
- 데이터 테이블 톤 = 노션풍, **PC(/admin) 한정** — 모바일 작업자 PWA는 토스 유지(표면 달라 충돌 아님).
- 표시숫자·입력칸 헤더 정렬을 **의도적으로 다르게** — 표시숫자=우측선(테두리 없는 값)/입력칸=중앙(경계 상자 위 라벨).
- min-width는 **인라인 스타일 권장** — Tailwind 임의 rem값이 dev HMR에서 CSS 누락된 실사례(px 임의값은 무방).
- **LotCols 공유 안 함** — 3페이지 컬럼 상이(출고엔 보관처 없음). 진짜 공유 가치인 프리미티브만 `_lot-table.tsx`로 추출.
- 방식 = 가공 먼저(레퍼런스) → 이동/출고 복제. 검색 결과 표현은 가공만 표/이동·출고 리스트 유지(표 통일은 별도).
- 스코프 확장(이동/출고=잘 도는 페이지)은 사용자 명시 승인 하에 진행.

**미해결 이슈**
- 이동/출고 노션풍 **브라우저 육안 미검증**(가공만 확인) — 재고 정렬·중앙 헤더·출고 판매가 칸 폭(`w-24`, 큰 금액 시 좁을 수) 확인 필요.
- 앱 전체 다른 admin 표(재고 조회·집계·손익·매입 통계 등) 신 스펙 미준수 — 발견 시 보고만(일괄 개조 아님).
- 검색 결과 리스트→표 통일(이동/출고)은 별도 과제.
- 오늘 코드 전량 미커밋(정리 시점) + tmp 매입처 2파일·`local-work-mac` 잔존.
- (이월) 가공 거래 실데이터 도그푸딩 미검증, #4 원가 계산 화면 미빌드.

**다음 작업 후보**
- 이동/출고 노션풍 브라우저 도그푸딩 → 판매가 칸 폭 등 미세 조정.
- (필요 시) 다른 admin 표 노션풍 점진 이관(규칙 기준).
- 가공 거래 실데이터 도그푸딩(㉠→㉡) + #4 원가 계산 화면.
- 릴리스 버전 정리(0.10.0 이후) + `local-work-mac`·tmp 정리.

---

### 2026-07-04

**완료한 작업**
- `git pull origin main` 충돌 해소 — 로컬 미커밋(입고 이력 콜그룹 컬럼폭 고정 WIP)을 stash → origin 27커밋(v0.9.0 작업자 컬럼 ~ v0.10.0 입고 PC등록·거래이력·가공·원가 묶음) fast-forward → `inbound/page.tsx` 병합: 콜그룹에 작업자 col 추가(11→12열·minWidth 1180→1276) + 매입처/보관처/작업자 셀 truncate 통합. tsc 통과.
- Turbopack 워크스페이스 루트 오인식 fix — 홈의 고아 `/Users/ma/package-lock.json`(81B 빈 lockfile)이 루트를 `/Users/ma`로 잡아 Tailwind CSS가 부분 누락 → 맥에서 CSS 깨져 보이던 원인. `next.config.ts`에 `turbopack:{root:process.cwd()}` 추가 + `.next` 캐시 정리·재시작(멀티 lockfile 경고 소멸 확인).
- 로그인 모바일/PC 기기 판별 기준 교체 — 창 폭(`min-width:1024px`) → 입력 장치(`any-pointer:fine`=마우스·트랙패드→PC / 터치만→모바일). `LoginShell.tsx`. 노트북 zoom·작은 창에서 모바일로 오판하던 문제 제거. tsc 통과.

**결정 사항**
- 모바일/PC 분기는 창 폭이 아니라 포인터 종류로 — 폭은 zoom·창 크기에 취약(맥북 실사례). iPad+트랙패드·마우스 없는 터치 데스크톱 같은 경계 기기는 극소수라 수동 토글 없이 순수 자동 유지(사용자 확인).
- Turbopack 루트는 stray lockfile 유무와 무관하게 프로젝트로 명시 고정(config). 홈 고아 lockfile은 삭제 보류(프로젝트 밖 파일·config 고정으로 무력화).

**미해결 이슈**
- 코드 3파일 미커밋 — `inbound/page.tsx`·`next.config.ts`·`LoginShell.tsx` (이번 docs 정리 커밋과 별개).
- 포인터 기반 기기 판별 실물 검증 — 맥북·폰 외 터치겸용 윈도우 노트북은 실물 육안 확인 필요(기기 판별 테스트 없음).
- (이월) 이동/출고 노션풍 육안 미검증, 가공 거래 실데이터 도그푸딩, #4 원가 계산 화면.

**다음 작업 후보**
- 미커밋 3파일 커밋 + 맥북 PC 로그인·CSS 정상 육안 확인.
- (이월) 파일럿 3화면 노션풍 도그푸딩 → 스펙 확정.
- (이월) 가공 거래 실데이터 도그푸딩(㉠→㉡) + #4 원가 계산 화면.

---

### 2026-07-06

**완료한 작업**
- 앱 아이콘 새 물고기 로고로 전면 교체 — 사용자 제공 남색 물고기 로고(1024² PNG). 오전 초안(sharp, 흰 여백 트림→80% 재패딩→흰 배경 flatten)에서 시작.
- 오후 디자인 반복 → **최종 확정 = 흰 라운드 카드 + 얇은 회색 hairline 테두리(#CED2D8) + 큰 남색 물고기(프레임 90%)**. 시안 경로: 남색 타일(반려) → 흰 배경 큰 물고기(0.95) → 모서리 라운딩(radius 15%) → 투명 모서리가 흰/밝은 UI에서 안 보이는 문제 발견 → 흰 카드+테두리로 해결. PIL(Pillow) 생성, apple-touch만 불투명 흰 정사각(iOS 자체 마스킹). 5종(`app/icon.png`·`app/favicon.ico`·`apple-touch-icon`·`icon-192`·`icon-512`) + Chrome 라이브 `SEAERP.ico` 갱신.
- 탭 파비콘 누락 fix — `layout.tsx` `icons`가 `apple`만 정의 → `<link rel="icon">` 미출력 → 루트 `/favicon.ico` 404 → 탭 아이콘 없음(기존 구멍). `app/favicon.ico` 신설(16/32/48/64) + `layout.tsx`에 `icon: '/favicon.ico'` 명시. 로컬 `/favicon.ico` 200 + head link 출력 확인.
- SW 캐시 stale 해소 — `sw.js`가 아이콘·매니페스트를 cache-first로 물고 `CACHE_NAME` 고정이라 배포된 새 아이콘이 설치 PWA에 미반영. `CACHE_NAME` v1→v2→v3(아이콘 바뀔 때마다 bump). 배포 서버 아이콘 신버전 정상 확인(icon-192 17KB/512 48KB, 캐시 우회 200).
- 커밋 4개 + 버전 0.10.0→**0.10.4** — 935f3e0(아이콘)·8b33b9d(favicon)·80a7349(SW캐시)·abf861a(카드+테두리).

**결정 사항**
- 배경 흰색 유지(사용자 재확인, 남색 타일 반려) + 물고기 크게(요청) + 모서리 살짝 둥글게(요청). 원본 그대로 축소 대신 트림·재패딩 — 원본은 물고기가 캔버스 가운데 작게 있어 직접 축소 시 32px에서 너무 작아짐.
- 흰 배경인데 어디서나 둥글게 보이려면 **타일에 시각 요소 필요** — 흰 라운드 모서리는 투명이라 작업표시줄·시작메뉴 등 밝은 UI 위에서 안 보이고 네모처럼 인식됨(진단: 배경별 렌더 비교). → 얇은 회색 테두리 채택(사용자 선택 A).
- SW는 민감 부품(prod-only·전 자산 캐시)이라 최소 수정(캐시 bump)만. 근본 개선(매니페스트·아이콘 stale-while-revalidate)은 별도 작업으로 분리 제안.
- 아이콘 변경도 눈에 보이는 변화 → PATCH bump(0.10.1~0.10.4). 임시 생성 스크립트는 실행 후 즉시 제거(리포 무흔적).

**미해결 이슈**
- 배포본 실제 아이콘 모양 육안 미검증 — Vercel 빌드 후 확인 필요(로컬 PIL 렌더로만 검증). 설치 PWA 반영엔 삭제→재설치 필요.
- 아이콘 URL 고정 + cache-first → **아이콘 변경마다 SW `CACHE_NAME` bump 수동 필요**. stale-while-revalidate 개선 미적용.
- 16px(작업표시줄 최소)에선 테두리 옅어짐 + 두 물고기 디테일 뭉침(로고 구조적 한계).
- (이월) 코드 3파일 미커밋(inbound/page·next.config·LoginShell), 이동/출고 노션풍 육안 미검증, 가공 실데이터 도그푸딩, #4 원가 계산 화면.

**다음 작업 후보**
- 배포 후 아이콘 실기기/탭 육안 확인 + PWA 삭제·재설치.
- (선택) `sw.js` 매니페스트·아이콘 stale-while-revalidate 개선(아이콘 변경 자동 반영).
- (이월) 미커밋 코드 3파일 커밋, 파일럿 3화면 노션풍 도그푸딩, 가공 실데이터 도그푸딩(㉠→㉡) + #4 원가 계산 화면.

---

### 2026-07-09

**완료한 작업**
- 매입 통계(사이즈별 단가 추이, 월 단위) 축 개선 — 매입 있던 달만 축에 올라오던 것을 **조회 기간 전체 달 연속 축**으로. 라벨 `2026-05` → **`N월`**(같은 해면 `5월`, 여러 해 걸치면 첫 달·매년 1월에만 연도 붙여 disambiguate). 빈 달은 값 없음(선 끊김·간격)으로 계절 공백 노출. `enumerateMonths` 헬퍼 신설 + `sizeTrend`에서 `granularity==='month'`일 때만 적용(`from`/`to` deps 추가). 일·주 단위(이번 달/지난 달)는 종전 유지.
- 재고 집계 '보관처 × 품목' 교차표 뷰 **비활성화** — `VIEW_OPTIONS` 주석 처리(타입·`storage-product` 분기·swap·pairW 측정은 dormant로 보존, 되살리기 쉽게) + 기본 뷰 `storage-only`로 변경 + 뷰 선택 grid 3열→2열. 두 합계(보관처/품목)만 노출.
- 재고 집계 여백 정리 3건 — 합계 표를 `w-full table-fixed` → `text-[13px]`(table-auto·내용폭)로 바꿔 이름 컬럼이 남는 폭 흡수해 벌어지던 여백 제거 / 흰 카드에 `w-fit max-w-full min-w-[360px]` 추가로 표 오른쪽 빈 흰 여백 제거 / 뷰 선택 버튼 `w-fit`로 전체 폭 반씩 채우던 버튼을 내용 폭(동일 폭·좌측 정렬)으로 축소.

**결정 사항**
- 매입 통계 월 축 = 연속(빈 달 포함) 채택 — 품목마다 축이 재배치되지 않고 고정 + 계절 공백(안 산 달)이 정보로 보임(사용자 직감 채택). 요약(합계)은 못 되살리는 joint를 축이 그대로 보여줌.
- 일 단위(이번 달/지난 달)는 채우지 않음 — 하루 단위는 매입이 드물어 빈 날을 채우면 null로 **선이 끊겨 추세를 잃음**(월과 데이터 밀도 정반대). 피킹·실사는 데이터 있는 날만+선 연결이 더 읽기 좋음.
- 재고 집계 교차표는 삭제 아닌 **비활성화**(dormant 유지) — 사용자 요청, 되살리기 쉽게. 존재 의의 재검토 결과: 특정 (보관처,품목) 조합은 '재고 조회'의 보관처+품목 필터가 대체(LOT 단위라 실사·피킹엔 더 상세). 교차표의 유일한 남은 가치는 '전체 분포 한눈'뿐 → 안 쓰면 뺌. 두 합계는 재고 조회가 못 주는 '차원별 전체 요약'이라 유지.

**미해결 이슈**
- 두 화면 모두 **육안 도그푸딩 미완** — 세션(PIN) 필요해 tsc·컴파일(200)만 확인. 매입 통계 월 축 렌더(빈 달 간격·라벨 겹침) + 재고 집계 여백/버튼 폭/`w-fit`+grid 동일폭은 브라우저 확인 필요.
- 여러 해 걸친 '전체' 프리셋 월 축 연도 라벨은 로직상 맞으나 실데이터 미검증 + `labelStep`(x축 라벨 최대 8개)으로 다년시 일부 달 라벨 생략 가능.
- 오늘 코드 2파일 미커밋(purchase-stats·inventory-summary, 도그푸딩 후 커밋). + (이월) 6/06 미커밋 3파일, 이동/출고 노션풍 육안검증, 가공 실데이터 도그푸딩, #4 원가 계산 화면.

**다음 작업 후보**
- 두 화면 브라우저 육안 확인(매입 통계 월 축 / 재고 집계 여백·버튼) 후 코드 2파일 커밋.
- (선택) 재고 집계 뷰 선택 버튼 줄 폭을 표 폭과 정확히 맞추기 / 합계 표 컬럼 폭(보관비·평가액 140px 등) 미세조정.
- (이월) #4 원가 계산 화면, 미커밋 코드 커밋, 파일럿 3화면 노션풍 도그푸딩, 가공 실데이터 도그푸딩(㉠→㉡).

---

### 2026-07-13

**완료한 작업**
- **입고 타이밍 쟁점 해결(대표님↔사용자)** — 실제 정산서(해금호 8/30) 분석으로 결론: **LOT은 동결·선별 후 생성**(대표님 안), **원물 매입은 '작업 정산 등록'이 사이즈별로 기록**(사용자 통계 우려 해소, LOT과 별개), **가공거래(기존 코드)는 폐기 아닌 '창고 재가공'용으로 자리 이동**, **물품 입고(냉동 완제품 매입)는 별개 입구 유지**, 각 라인 **용도 태그**(원물동결/원프로즌 가공/생물)로 통계 추적. 사용자 흐름도 자체가 이미 LOT을 입고(동결 후)에 두고 있음이 결정타.
- **'작업 정산 등록' PC 폼 HTML 목업 설계·반복(v1→v17, 아티팩트)** — 헤더 + **작업비(9그룹)** + **생산내역(사이즈별 매입)** 마스터-디테일. 정산서형: 금액=회수/수량×단가 자동 / **포장별 단가**(동결비·박스·탈펜료를 사료팬·베이트大·베이트小 줄로 합산) / **단가 고정 기본값** + 차후 경비 마스터 / **노임 3항목**(남·여·현장, 수동·여는 작업시간 자동) / **동결비·입출고비 지급처=보관처 선택 시 단가 자동**(에어테이블 연동) / **생산내역 구분(박스 종류)→작업비 수량 자동 합산** / 용도별 행선지(보관처/가공공장/판매처) / 지방도 라인별·규격(미수)·임시저장·운임 항목 자동번호·먹이유무 체크박스·시작~종료 콤보 등.
- **업무 프로세스 개요 + A4 가로 인쇄용 아티팩트** — 스마트폰(작업자)/PC(관리자) 단계별 입력값 + 흐름도(2입구→LOT→출고→판매, 재고사건, 정산). 인쇄용은 세로로 길던 문제 해결(가로 1페이지). 흐름 반영: 매입입고↔재고 사이 **원프로즌 가공**('가공·동결-제품입고'), **냉동물은 재고 직행**, **정산·분석은 판매/수출에서 파생**.
- **에어테이블 조회** — 선박 정보 마스터(비어있음 확인), 보관처 비용 이력의 입출고비 6곳(양식수협400 등)·동결비(한림수협 팬1400/대1200/소900).

**결정 사항**
- LOT은 동결 후 생성(대표님) ⊕ 원물 매입은 작업 정산이 기록(사용자) — 둘을 분리하니 양립. "매입 기록 ≠ LOT". 정산서 = 작업 정산 등록의 실체.
- 단가는 폼에 **고정 기본값**으로 두되 차후 **'경비 단가 마스터'**(관리자 인라인 수정)로 이전 — 단가는 작업마다 안 바뀌므로.
- **노임은 자동계산 제외**(여노임 교통비 등 변동), 여노임 회수만 종료−시작(작업시간) 자동.
- **구분='박스 종류'(포장) / 규격(미수)='박스당 마리수'** — '규격'이 '단위'보다 정확한 표현(사용자 확정). 중량은 별도 중량(kg) 칸.
- 정산·분석은 **판매/수출에서 파생**(손익=판매−원가)이라 흐름도상 그 갈래로 이동.

**미해결 이슈**
- **실제 설계는 다음 세션** — 오늘은 목업·설계 확정까지(리포 코드 미변경). Airtable 테이블 신설(작업정산 헤더/생산내역/작업비 + 경비단가 마스터 + 선박 마스터 채우기) + Next.js 화면 + 매입통계 원천 재배선이 남음.
- 작업비 **원가 풀 포함/제외 규칙 미확정**(노임=협회부담, 박스 재고분 617,900 등 → 정산서 풀 29,123,670 vs 전액합 상이).
- 선박 정보 마스터 비어있음(채워야 드롭다운 실동작), 경비 단가 마스터 신설 필요, 가공공장 마스터 '삼다' 1곳뿐.
- (이월) 07-09 미커밋 2파일(purchase-stats·inventory-summary) 도그푸딩 후 커밋 + 그 외 이월분.

**다음 작업 후보**
- **'작업 정산 등록' 실제 설계 착수** — Airtable 3테이블(헤더/생산내역/작업비) + 경비단가·선박 마스터 + Next.js 화면. (상세: memory `work-settlement-registration.md`)
- 작업비 원가 풀 포함/제외(부담·패스스루) 규칙 확정.
- (이월) 매입통계·재고집계 미커밋 2파일 도그푸딩·커밋.

---

### 2026-07-14

**완료한 작업**
- **작업 정산 등록 실제 구현 착수→UI까지 완주** — 설계 문서(`docs/작업정산등록-설계.md`) + Airtable 3테이블 신설(작업 정산 `tblJveECFrCyHuq5j`/생산내역 `tblT9nWqCpEHf0nk4`/작업비 `tblGwbRPveFitLwJZ`) + `lib/airtable-schema.ts` 상수.
- **원가 로직** — `cost-calc.ts:calculateWorkSettlementCost`(작업단가=작업비총액÷총박스수·실단가=수매단가+작업단가) + `lib/work-settlement-rates.ts`(작업비 기본단가 A안 하드코딩) + 단위 테스트.
- **서버 액션** `app/actions/admin/master-work-settlement.ts` — save/confirm/cancel/list + `getWorkSettlementDetail`(초안 이어작성) + `saveWorkSettlementHeader`(헤더만) + `getStorageBoxTypeFees`(행선지 동결비/입출고비 조회) + `toIsoDate`(날짜 422 방어). **확정 시 생산내역 1줄→입고관리 1행+LOT 1개.** 통합 테스트 3종(`work-settlement-golden`, 골든/취소/가드).
- **등록 화면** — 처음엔 목업 안 보고 텍스트로만 만들어 구조가 전혀 달랐음 → **claude.ai 아티팩트 실물 WebFetch로 대조 후 v17 목업 구조로 전면 재작성**. 작업비 9그룹 밴드+그룹소계 / 생산내역 full 컬럼 / styled-jsx 스코프 실패→**플레인 `<style>`+`.ws-page` 접두사**.
- **2단계 흐름 분리** — step1(`/new` 사전기입 헤더→'다음' 임시저장) → step2(`/[id]` 생산내역 위·작업비 아래→확정), 이력 '이어서 작성'. 공유 `_shared.ts`+`_combo.tsx`.
- **5행 스크롤 콤보**(긴 드롭다운) — 표 셀 overflow 클리핑을 `document.body` 포털+고정위치로 해결, **키보드 조작(↑↓·Enter 선택 후 다음 칸 이동·Esc)**.
- **★동결비·입출고비 자동 산출** — 생산내역(행선지×구분×수량)에서 자동 생성(`buildFreezeRows`/`buildInoutRows`), 행선지 보관처마다 단가 다름을 반영(단일 지급처의 부정확 해소). 자동 읽기전용.
- UI 다듬기 다수 — 수수료=총매입액×3.3%·작업장수수료/내피 총박스 자동·단가 ' 원' 표기·작업비 가운데정렬·전 행 파란선+회색배경·고정항목 삭제 가능·용도 '원프로즌' 축약·매입처 삭제·YYYY-MM-DD/HH:MM 정규화 등.
- **사이드바 IA 재구성** — 신설 카테고리 **'재고 작업'**(재고 다음)으로 작업 정산·가공 거래 이동, 거래 이력은 읽기 전용 원장(입고/출고/이동/지출 + PDF 재발행)만 남김. `_nav.ts`, IA 7카테고리(결재/재고/재고 작업/거래 이력/원가·손익/마스터/시스템·운영).

**결정 사항**
- **작업 정산·가공 거래 = 신설 '재고 작업' 카테고리로 분리** — 거래 이력=읽기전용 원장(조회)인데 두 화면은 재고를 생성·변환하는 '작업'이라 성격이 다름(7→5개로 거래 이력 정리). 이름은 '작업 관리'보다 **'재고 작업'** 채택(재고 직결·'재고 보기↔재고 작업' 대비 명확·'작업'은 포괄적이라 모호).
- **미결 3종 확정(사용자)** — 작업비 **전부 원가 포함**(사료팬=한라에스앤에프 재고·선별공장=FPC, 전부 자사 자원)/**확정 때만 LOT 생성**(임시저장=초안)/**공동배분 v1 스코프아웃**.
- 생산내역 1줄→입고관리+LOT 스포너(가공 완료 패턴 재사용). **입고관리.수매가=수매단가**(매입통계)/**LOT.수매가=실단가**(재고원가). 작업정산 LOT은 동결비/입출고비/노조비/이월=0(이중계상 방지, 냉장료만).
- 동결비·입출고비 **자동 산출**(행선지마다 달라 단일 지급처는 부정확) — 사용자 통찰 채택.
- 작업비 기본단가 **A안(코드 하드코딩)로 시작** — 매 정산 수정 가능, 자주 바뀌면 차후 마스터화.
- 클라 컴포넌트 스타일은 **스코프 접두사 플레인 `<style>`**이 안전(styled-jsx 별도 컴포넌트 스코프 미스매치·Tailwind `.fixed` 충돌 교훈).

**미해결 이슈**
- **전량 미커밋 + 화면 육안 도그푸딩 대기** — tsc/lint/빌드/통합테스트/라우트200까지 확인, 실제 클릭·입력 흐름은 앱 띄워 눈으로 봐야(모든 UI 손 도그푸딩).
- **발견: `storage-cost.ts`가 옛 단일 `동결비` 필드 참조** — 라이브 보관처 비용 이력은 박스종류별 3열(팬/베이트大/소)이라 기존 입고 동결비가 null로 빠질 수 있음. 작업정산 범위 밖이라 미수정, memo `freeze-fee-split-mismatch`(별도 상의).
- 매입처 삭제로 매입통계 supplier 차원 빈값(사용자 수용). 선박 마스터 여전히 비어있음.

**다음 작업 후보**
- 실제 정산서 하나로 **확정까지 도그푸딩**(생산내역별 LOT 생성·행선지별 동결비 검증).
- 매입통계 **용도(처리구분) 세그먼트 보강**(Strategy A — 입고관리 그대로 읽되 원물 입구만 작업정산으로).
- **선박 마스터 데이터 채우기**(드롭다운 실동작).
- 동결비 3열 분리 불일치(`storage-cost.ts`) 별도 상의·수정.
- 경비 단가 마스터 테이블화(도그푸딩 후).

---

### 2026-07-16

**완료한 작업**
- **작업 정산 등록 배포(v0.11.0)** — 07-14의 미커밋 전량을 main에 푸시(`19e5853`). 어황일보 봇(`app/api/telegram/`·`lib/eohwang/`·`@anthropic-ai/sdk`)은 구현 중이라 **로컬 잔류**(package.json 버전 bump만 커밋, sdk 의존성·lockfile은 워킹트리에). 별도 워크트리에서 **실제 `next build` + 3라우트 생성 확인 후** 푸시(`'use server'` const export류는 tsc가 못 잡아서). 함께 배포: 재고 집계 교차표 비활성화 + 매입 통계 월 축 연속화(`f522b26`, 07-09 대기분).
- **★탈펜료 422 버그 해결(운영 영향)** — 도그푸딩 중 임시저장이 계속 422로 실패하고 있었음(로그에서 우연히 발견). 원인=Airtable `작업 정산 작업비`.그룹 옵션이 **`탈팬료`(팬) 오타**인데 코드는 `탈펜료`(펜) 전송 → 새 옵션 생성 권한 없어 거부. 그룹 순서상 내피 다음에서 죽어 **작업비가 반만 저장**(C1~C10, 탈펜료 3줄 누락)되고 있었음. 사용자가 Airtable UI에서 `탈팬료`→`탈펜료` rename(옵션 ID 보존=데이터 무손상) → 코드 `탈펜료` 유지. 재저장으로 탈펜료 3줄 복구·작업단가 정정 확인.
- **노임 계산 수정(4건)** — 여노임 회수 칸에 자동으로 `N시간`이 박히던 것 제거→**빈칸(작업 인원수 입력 자리)**, 작업시간은 **비고에 `N시간 작업`** 표기. 금액 자동 산출: 남·현장=`인원×150,000`, 여=`인원×15,000×작업시간`. **단가 직접 수정 시 그 값으로 재계산**(`15,000/시간`→`20,000/시간` 등, `pn`이 숫자만 파싱). 원인=노임 그룹의 `noauto` 플래그(설계 초기 '금액 수동' 잔재) 제거. 육안 검증 완료.
- **원프로즌 가공 용도 → 경비 자동 제외** — (a) **동결비·입출고비**: 원프로즌은 통에 담아 가공공장 직행, 그 동결비는 `가공비 단가`에 이미 포함돼 가공 거래가 가공원가로 반영 → 작업 정산에서 또 걷으면 이중계상. (b) **탈펜료**: 팬에 담기지 않으니 팬에서 뺄 일 없음. (c) **박스는 제외 안 함**(전 용도, 사용자 확정). 구현=`FEE_EXEMPT_USES`(동결·입출고) + `sumByBoxType` 두 벌(박스=전 용도 / 탈펜료=원프로즌 제외). 동결비 제외는 실데이터로 확인(초안에서 베이트小 500박스=원프로즌이 빠져 동결비 회수 2,150 vs 박스 2,650).
- **3단계 화주 배분 화면 신설** — `app/admin/master/work-settlement/[id]/split/page.tsx`. 생산내역 물량을 화주별로 나누는 화면(2단계 확정에서 배분을 떼어냄). 기본 비율 [적용]→자동 채움 + **박스 직접 수정('더 끊어주기')** + 각 줄 합계=전체수량 검산(불일치 시 확정 차단) + 화주별 박스·금액 요약. `allocateByRatio`(최대잉여법, 합계 항상 total 보존: 49→20/19/10) + **화주 컬럼 동적**(`OWNERS_TEMP` 배열 길이만큼, 조합 바뀌어도 안 뜯음). 2단계 스텝바에 `③ 배분` 링크(+`.steps a` 스타일).
- **테스트 +16(단위 187 / 통합 112)** — `_shared.test.ts` 신설: 그룹명↔Airtable 옵션 일치 가드(탈펜료 재발 방지·단 코드 내부 일관성만) / `allocateByRatio`(합계 보존·화주 수 가변) / `sumByBoxType`(박스 전 용도 vs 탈펜료 원프로즌 제외) / 원프로즌 동결·입출고 제외(변이 테스트로 규칙 효능 증명).

**결정 사항**
- **원프로즌 가공비에 동결비 포함 확정** — 냉동 안 된 선어를 가공공장에서 가공·동결하므로 동결비가 임가공비에 녹아 있음. → 작업 정산 용도=원프로즌이면 동결비·입출고비·탈펜료 자동 제외. (가공공장 동결비를 가공비 단가에 별도로 더 합칠지는 **별건 보류** — 이미 포함됐을 가능성 확인 중.)
- **폐기된 최초 가설** — "원프로즌 가공비가 원물동결 품목 원가에 녹아든다"는 틀림. **가공비는 작업 정산 소관이 아님**(가공 거래가 담당, 4단 사다리: 작업 정산=재고원가 / 가공 거래=가공원가, 설계 §1 스코프아웃). 붙일 라인 자체가 없음.
- **화주 배분 = LOT을 화주별로 쪼갬**(지분 아님) — 시스템이 전부 LOT 단위라 화주를 LOT 속성으로 붙이면 재고·출고·이동·가공·원가가 그대로 작동. LOT 1개+지분이면 출고마다 지분 재계산돼 전 로직을 뜯어야 함. 배분은 **확정 직전 별도 3단계**(LOT 생성은 맨 마지막이라 그 전엔 되돌리기 자유).
- **배분 비율은 유동** — 40/40/20(한라/대경/FPC)은 기본값일 뿐 고정 아님("더 끊어준다"=박스 단위 조정). 화주 조합도 작업마다 바뀜(정산서엔 한라·태봉·대경·J.P였음) → 하드코딩 금지. **빚(잔고)은 안 남김**(배분 차이는 상호 양해, 누적 잔고 미도입).
- **FPC 도입 맥락** — FPC=냉동창고+선별기+작업 주체. 모든 재고 열람 필요하나 화주 개념 유지 → 한 베이스+화주 축(격리도 별도 베이스도 아님). 마스터 활성/비활성 논의는 이 다화주 구조로 확장됨(§미해결).

**미해결 이슈**
- **★통(桶) 구분 미비 — 최우선(사용자 요청)** — 원프로즌은 베이트/팬이 아니라 **큰 통에 담아 운반**하는데 `작업 정산 생산내역`.구분에 통 옵션이 없음. 초안엔 원프로즌 500박스가 **베이트小로 잘못 저장**돼 있음. **핵심 미결: 통 '수량'이 통 개수냐 박스 환산이냐** — `작업단가 = 작업비총액 ÷ 총박스수`의 분모라 전 품목 작업단가에 영향. 정해야 통 추가 가능(순서: Airtable 옵션 추가 먼저→코드). 메모 `work-settlement-tub-gubun`.
- **커밋·배포됨(v0.11.1 `780e67c`)** — 노임 4건·원프로즌 제외(동결·입출고·탈펜료)·3단계 화면·`_shared.test.ts`·스텝 링크. 연차(1주) 로컬 유실 방지로 push(워크트리 실빌드+split 라우트 확인). 봇 트랙은 로컬 잔류. **미검증: 3단계 화면 육안(컬럼 13개 레이아웃) — 프로토타입이라 저장·확정 미연결·무해**. 노임·원프로즌 제외는 육안 확인됨.
- **3단계 저장·확정 미연결** — 화주 마스터도 Airtable 화주 필드도 미신설. 확정 버튼=안내 토스트만. 화주는 임시상수 `OWNERS_TEMP`. LOT 화주별 분할 확정 로직 미구현.
- **작업단가 균등배분 정밀도** — 작업단가가 전 라인 균등 가산이라 라인별 실발생비와 1~2% 어긋남(종이 정산서도 동일). 수수료(값어치 비례)·운임⑨(특정 품목 전용)이 특히 오귀속. **상의 중·미결정.** 실측치 메모 `work-settlement-cost-allocation`.
- **생물 동결비 제외** — 생물도 동결 안 하니 제외가 맞다는 데 동의했으나 **상의 중**(정리되면 `FEE_EXEMPT_USES`에 '생물' 추가, 단 입출고비까지 뺄지는 갈라 결정).
- **saveWorkSettlement 보상 트랜잭션 부재** — 자식 라인 삭제 후 재생성인데 중간 실패 시 옛 라인 소실+새 라인 반쯤(이번 탈펜료 사고로 노출). 초안이라 피해=재입력이나 구조적 취약. 범위 밖 미수정.
- **`lib/work-settlement-rates.ts` 죽은 코드** — 자기 테스트만 import(라이브는 `_shared.ts` 사용). 이중 정의라 단가 수정 시 혼란 + 그쪽엔 여노임 옛 버그(회수=작업시간)가 그대로. 초록불이 실제보다 든든해 보임. 삭제 또는 통합 필요(별건).
- storage-cost.ts 옛 단일 `동결비` 참조(`freeze-fee-split-mismatch`) — 별도 상의 대기. 선박 마스터 여전히 빈 상태.

**다음 작업 후보**
- **통 구분 결정 후 반영** — 수량 단위(개수/박스환산)+내피·작업장수수료 부과 여부 확정 → Airtable 구분에 '통' 옵션 추가(UI) → `BOX_INTERNAL`/`BOX_LABEL` → 초안 500박스 정정.
- **미커밋 커밋** — 3단계 화면 육안 확인 후 노임·원프로즌 제외·3단계·테스트 묶어 커밋.
- **3단계 저장·확정 배선** — 화주 마스터 신설 → LOT 화주별 분할 확정 로직 → Airtable LOT/입고관리 화주 필드.
- 매입통계 용도(처리구분) 세그먼트 보강. 마스터 활성/비활성(자동 숨김+검색 노출, FPC 다화주와 함께). 생물 동결비 제외 결정. work-settlement-rates.ts 정리.

---

### 2026-07-25

**완료한 작업**
- **재고 조회 컬럼 재정렬** — 최초입고일을 정체성 묶음(LOT·품목·규격·미수) 앞에서 **보관처↔보관일수 사이로** 이동 → 품목명이 자동으로 2번째(LOT번호 바로 옆)로. tfoot 합계 colSpan 6→5 + 공백칸 1 보정(정렬 어긋남 방지). 정렬·필터·CSV 로직 무변경, tsc 통과. `lots/page.tsx`.
- **LOT 생애주기 이동 3덩어리 → 1카드 병합(A+C)** — 이동 출고·구분선·이동 입고 3줄을 한 '이동' 카드로. 서버(검증된 잔여 계산·정렬) 무손상, 화면에서 `foldTransfers`로 같은 recordId 짝을 접음(인접 무관·한쪽만 있어도 안전). 카드=원본→신규 LOT·보관처 전이·수량 + **양쪽 잔여(원본/신규)**. 가운데 "이동 입고로 신규 LOT 생성" 구분선 제거(세대 경계는 카드가 대신), 세대 구분선은 신규 입고만. `TransferItem` 신설. tsc·ESLint 클린.
- **신청자/승인자 워딩 정리(1차)** — 생애주기 이벤트 `작업자:` → `신청자:`(EventItem·TransferItem). 승인자는 데이터 부재로 보류(아래 결정).
- **탭바 새 창 분리(tear-off, A안) 휴면 비활성화** — `ENABLE_TEAROFF=false` 플래그로 ↗ 버튼 + 창 밖 드래그 발동 잠금(순서변경 드래그 중 오발동·팝업 차단 문제). `detachTab`·아이콘 정적 보존(ESLint 0), 플래그만 true로 부활. 창 안 분할(⊞, B안)만 남겨 단순화.

**결정 사항**
- **재고 조회 = LOT-우선 유지** — 원장은 고유키(LOT)를 맨 앞·sticky로 두는 게 관례(품목 앞세우면 첫 컬럼 중복 범벅). "품목으로 보고 싶다"는 재고 집계가 담당. 절충으로 품목명만 2번째로 끌어와 인식성 확보. 최초입고일은 LOT 앞 6자리(YYMMDD)와 중복이라 뒤로.
- **생애주기 이동 = A+C(한 카드+잔여)** — 잔여는 이동 카드가 원래 표시 안 했어서 병합 손실 작음(중복 두 카드만 합침). 방향 부호(±) 대신 중립 "N박스"(자리이동).
- **생애주기 순서 과거→현재 유지** — '생애주기'는 서사(태어남→현재)+통장식 잔여 누적 구조라 최신-위가 안 맞음. 이벤트 수 적어 스크롤 부담 없고 최신 상태는 상단 요약 카드가 이미 보여줌.
- **승인자(결정자)는 별도 작업(A안)으로 연기** — 확인 결과 `결정자`는 `LOT별 재고`에만 기록되고 입고관리/출고관리/재고이동 이벤트 레코드엔 없음(스키마에도 없음). 지금 넣으면 승인자 빈칸 도배 → `작업자`→`신청자` 라벨만 정직하게. 제대로 하려면 `updateApprovalStatus`가 소스에도 `결정자` 기록 + Airtable 필드 3종 신설(과거분은 빈칸).
- **tear-off 삭제 대신 휴면** — 재고집계 교차표 비활성화(07-09)와 동일 dormant 패턴. 듀얼 모니터 필요 시 부활 여지 남김(B안은 물리 모니터 2개 못 걸침).

**미해결 이슈**
- **미커밋 5파일** — `lot-timeline/page.tsx`·`lots/page.tsx`·`_tab-bar.tsx`·`LoginShell.tsx`·`next.config.ts`. 이번 /wrap-up은 docs만 커밋. 육안 확인 후 성격별 묶어 커밋 예정.
- **생애주기 이동 병합 브라우저 육안 미검증** — 정적 검증(tsc·lint·수동 트레이스 0181→0183→0185)만. 실LOT(0183)로 원본/신규 잔여 숫자 실제 대조, 연쇄 이동·동일보관처 이동·반려 이동 엣지 확인 필요(읽기전용이라 최악=오표시).
- **재고 조회 컬럼 재정렬 육안 미검증** — 헤더/셀/합계 15열 정렬은 코드로 확인, 실제 렌더 눈으로 필요.
- **승인자 A안(별도 작업)** — Airtable 입고관리/출고관리/재고이동에 `결정자` 필드 신설 + 승인 시 소스 기록. 과거 레코드 백필 없음.
- (이월) 통 구분·3단계 저장배선·작업단가 배분 정밀도 등 07-16 미해결 지속.

**다음 작업 후보**
- **0183 등 실LOT로 생애주기 이동 병합 육안 검증** → 잔여 숫자 어긋나면 즉시 수정.
- **미커밋 5파일 커밋** — 성격별(맥 환경 fix 2 / UI 정리 3 등) 묶음.
- **승인자 A안** — Airtable 필드 3종 + `updateApprovalStatus` 소스 기록.
- (이월) 통 구분 반영, 3단계 화주 배분 저장·확정 배선.

---

### 2026-07-27

**완료한 작업**
- **어황일보 번역 텔레그램 봇 신설·배포 (v0.12.0→0.12.1)** — 조업보고서 사진→바이어용 일본어 안내문. `app/api/telegram/route.ts`(웹훅·`after()`로 무거운 작업·secret 검증) + `lib/eohwang/translate.ts`(claude-opus-4-8 비전·adaptive thinking·상자×60kg 환산·혼획비율·체크섬) + `dictionary.ts`(Airtable 사전 어댑터) + `telegram.ts`(sendMessage/downloadImage). `@anthropic-ai/sdk` 의존성 추가.
- **로컬 도그푸딩 하네스**(`scripts/test-eohwang-translate.mjs`)로 실촬영 폰 사진(90° 회전·비닐 반사·손글씨) 번역 품질 검증 — 25행 판독·환산·경고 정상.
- **go-live** — Vercel env 4개 등록(사용자)→git push 자동배포→텔레그램 `setWebhook`(secret_token·drop_pending) 등록·`getWebhookInfo` 검증. 실사진 2건(7/26·7/27) 라이브 번역 성공.
- **사전 등록 기능 검증** — 봇에 `등록 매가리=小アジ` 전송 → Airtable 사전 upsert 정상, 매가리 추가.
- **번역 출력 2개 개선(v0.12.1)** — ①각 행 순번(1.2.3…)+바이어용 일본어 안내(`行番号でお知らせください`) ②하단 손글씨 `c/s`(위판장 24kg박스 실입하)를 '불일치 오류' 경고→참고치로만(허위 경보 제거).
- `sendMessage` 4096자 초과 분할 추가. tmp 임시파일 2개 삭제 + `.gitignore`에 `tmp-*`.
- **UI 디자인 규칙 신설** — CLAUDE.md에 `## 규칙`(UI 작업 시 DESIGN.md 먼저 읽고 토큰 따를 것 · 색/폰트/간격 임의지정 금지) 명시. DESIGN.md는 옵시디언 vault에 신설됨(사용자, 182줄 v0.1 — 쿨그레이 중립+파스텔 액센트·8px 그리드·tabular 숫자·CSS 변수 방식). Windows 경로 + WSL 경로 병기.

**결정 사항**
- **'야간' 오류는 봇 아닌 내 오독** — 실제는 '약간'(→少々가 정답). 저화질 회전 사진 판독 사각지대 실증 → 임시 추가했던 야간 규칙 원복.
- **선단명 한 글자 오독(한성/한창 등)은 인쇄 OCR 한계** — 프롬프트로 못 고침. 설계상 '사람 검수 후 발송' 단계가 담당(봇은 손글씨·흐림만 ⚠️ 플래그).
- **바이어 선단 지목 = 행 순번** — 콜넘버(같은 선단 하루 중복 출현)보다 순번이 유일·언어무관.
- **c/s 실입하량 = 한국어 검수란 참고치로만 유지** — 바이어 본문엔 미노출(단위·집계가 60kg 표와 달라 원래 불일치, 완전 생략 대신 참고 보존).
- **프로덕션 도메인 = `seafood-erp.vercel.app`** (seaerp 아님, projectName=seafood-erp).
- **DESIGN 적용은 페이지 스코프 토큰(`.lp`)으로 트라이얼** — 재고 조회 페이지에 로직 무변경·프레젠테이션만 재스타일해 시연 후 사용자 롤백(보류). 전역 파일 미변경이라 되돌리기 쉬움. **숫자 정렬 충돌**(DESIGN=우측 vs CLAUDE 07-01 표규칙=좌측 상자)은 오늘 규칙대로 DESIGN 우선 적용했으나 정합 미정.

**미해결 이슈**
- **노출 토큰·키 재발급 미완** — BotFather 봇 토큰 + Anthropic 키. 기능 지장 없으나 보안 권장(재발급→`.env.local`+Vercel 교체→재배포).
- 4096자 실제 분할·긴 보고서 라이브 미검증(코드만). 사전 '소매가리' 등급 처리 미결.
- **DESIGN 토큰·폰트 전역 미설치** — globals.css에 토큰 없음, Pretendard/JetBrains 미로딩. 채택 시 전역 승격 필요. 숫자 정렬 규칙(DESIGN 우측 ↔ CLAUDE 07-01 좌측) 정합 미정.
- **Node 20→22 업그레이드 권장** — Claude Code 최신(2.1.220)이 Node≥22 요구(EBADENGINE). 현 Node v20.20.2. NodeSource apt로 업그레이드(전역 npm 패키지는 `~/.npm-global`이라 유지, `claude`/`vercel` 안 깨짐).
- (이월) 07-25 미커밋 5파일, 승인자 A안, 통 구분·3단계 배선·작업단가 배분 정밀도.

**다음 작업 후보**
- 토큰·키 재발급 + env 교체 + 재배포.
- 사전 표기변형 보강(매가리류·상태어 등) 실사용 중 축적.
- Phase 2 입고 자동채움(어황일보 파싱행↔입고, 매칭키=운반선 선명) 별도 챕터.
- **DESIGN 토큰 전역 승격 여부 결정** — 채택 시 globals.css 토큰+폰트 로드, 숫자 정렬 규칙 정합 후 재고 조회부터 재적용.
- (이월) 07-25 5파일 커밋·승인자 A안 등.

---

### 2026-07-28

**완료한 작업**
- **숫자 셀 표기 통일** — `lib/number-format.ts`에 `formatNum(값, 단위|옵션)` 신설(천단위·단위 후치·`-0` 방지·decimals/maxDecimals/empty) + `app/admin/_num-cell.tsx`(`NumCell`/`NumHead`/`Num`, `tabular-nums`+우측정렬+`nowrap`). 수량·중량·금액·단가 셀 전량 교체, 화면별 중복 구현 제거. 단위 테스트 +16(총 196).
- **목록 테이블 넘침 처리 표준화** — `app/admin/_table-cols.tsx` 신설(`TableCol`·`tableMinWidth`·`TableColGroup`·`SpacerCell`·`makeCellClasses`) + `transactions/_ledger-cols.tsx`(원장 5화면 공유 스펙). truncate 폐지 → **실측 최대치+8px 폭으로 전량 표시 + 넘치면 가로 스크롤**(헤더 동반 스크롤). 입고 이력 12컬럼 = 1480px.
- **표 관련 버그 3건 fix** — ①colgroup 합계(1340) > 선언 minWidth(1276)라 브라우저가 전 컬럼을 95%로 축소하던 것 ②`'승인완료'`(공백 없음) 비교가 Airtable 실제값 `'승인 완료'`와 영영 불일치(`ApprovalButtons.tsx`·`expense/list` — 승인된 지출이 파란 '대기' 배지로 표시·완료건 가드 미작동, 서버 멱등 가드 덕에 데이터 손상은 없었음) ③목록 높이 5행→8행·재고↔보관처 컬럼 swap.
- **비고 컬럼 240px 상한 + truncate·title 예외화** — 자유 텍스트라 최댓값 예측 불가. 나머지 컬럼의 말줄임 금지 정책은 유지.
- **DESIGN.md 감사(코드 무수정)** — 하드코딩 스타일·상태 배지·폼/입력·빈/로딩/오류·반응형·용어 6영역을 실제 파일 근거로 조사해 추가 규칙 후보 보고. 근거 없는 항목은 '확인 못 함'으로 표기.
- **디자인 토큰 도입** — `tailwind.config.ts`에 색(surface/border/text/accent/danger/warn/info/success/scrim)·타이포(page/section/body/label/caption, weight 내장)·radius(control/card/sheet/pill)·높이(control) 토큰 정의, `app/globals.css`에 **표면별 값**(기본=모바일 / `[data-surface='admin']`=PC). 화면 코드는 `rounded-card`·`h-control`만 쓴다.
- **공통 컴포넌트 5종 신설**(`app/components/ui/`) — `Button`(primary/secondary/ghost × default/danger)·`EmptyState`·`LoadingState`(표 스켈레톤)·`SortIcon`(none/asc/desc 전부 Arrow 계열 통일, `aria-sort` 헬퍼 포함)·`Modal`(§6-5 헤더/본문/푸터 간격·파괴적 액션 좌측 강제).
- **토큰 시범 적용 → 확산** — 보관처(storage) 1개로 시범 후 마스터 4화면(products/ships/workers/suppliers)+모달 5종에 확산. 매입처는 정렬 컬럼 1개뿐이라 정렬 제거. 표 스페이서 컬럼(끝 빈 `<col />`)으로 폭 비례 확대 차단, 카드 폭 상한 도입.
- **★보관처 마스터 3덩어리 재구성** — 자사창고/외부창고/가공공장 세로 3섹션. **'보관처 비용 이력'·'가공비 단가' 별도 화면을 흡수**(`processing-rates/` 디렉터리 삭제, `_nav.ts` 2항목 제거, `ProcessingRateEditModal` 추출). `listCurrentStorageCosts` 신설(오늘 유효한 행만 노출, 유효성 판정은 `lib/storage-cost.ts`와 동일 규칙). 좌측 필터 레일(sticky)+본문 구분선, 섹션별 개별 정렬, 소제목화.
- **Airtable 데이터 정리** — 보관처 마스터↔비용 이력 이름 불일치 8→2·고아 7→0(6건 rename). **동원통영수산·해원냉장이 조용히 null이던 원가 데이터를 되찾음.** 구분 '기타' 폐지(사용자)+구분 필수화(미분류는 `isOwnStorage` 기본 true라 외부 시설에 우리 PDF가 나갈 위험).
- **radius 조정** — `[data-surface='admin']`의 `--r-card` 10→12, `--r-sheet` 12→16. DESIGN.md §2-5 반영 + 변경 이력 표 깨짐(v0.3 행이 3줄로 쪼개져 있던 것) 무손실 복구 + v0.4.1 기록.

**결정 사항**
- **말줄임 금지 + 가로 스크롤**을 목록 표준으로 — 회계 화면에서 잘린 숫자·이름은 오독으로 직결. 폭은 실측 최대치 기준이라 근거가 남는다. 비고만 예외.
- **좌측 첫 컬럼 sticky는 미적용** — 요청대로 장단점만 보고(가로 스크롤 시 행 식별은 좋아지나 `position:sticky`가 `table-fixed`·스페이서와 얽혀 폭 계산이 흔들림).
- **스페이서 컬럼 방식** — 남는 폭은 마지막 빈 `<col />`이 흡수하고 실제 컬럼은 설계 px 고정. `tableMinWidth()`에서 스페이서는 구조적으로 제외해 이중 계산 차단.
- **토큰 이름은 tailwind.config.ts, 값은 globals.css CSS 변수** — 얼마나 둥근지·큰지는 "어느 표면에 놓였는지"가 결정. /admin만 `data-surface="admin"`으로 덮어쓴다.
- **`<Modal>`은 일부러 포털하지 않음** — 포털하면 `[data-surface="admin"]` 서브트리를 벗어나 PC 화면인데 모바일 토큰(radius 16/높이 44)을 받는다.
- **가공비 단가는 전용 화면이 과했다** — 공장 1곳·단가 1건인데 화면 하나. 단가는 "그 공장의 속성"이라 공장 옆이 제자리. 보관처 마스터로 흡수.
- **레일↔본문 구분은 `border-border` 1px** — 사용자가 제안한 그라데이션 음영은 DESIGN §1(장식적 요소 금지)·§2-6(레이어 구분은 border) 위배라 반려하고 그 근거를 코드 주석에 남김.
- **`나림통상 copy`는 중복이 아님** — 2025년 행에 이어지는 2026년 단가(2026-01-01~2027-01-01, 값 4개) 보유. 삭제하려던 것을 rename으로 전환(삭제했다면 라이브 데이터 소실).
- 사이드바 레일이 "안 들어간다"고 했던 내 판단은 오류 — `max-w-[1200px]`은 **내가 건 상한**이지 뷰포트가 아니었다(레일 접으면 ~1870px 가용). 상한 제거 후 정상 배치.

**미해결 이슈**
- **오늘 작업분 다수 미커밋** — 수정 13파일 + 신규 2파일(`ProcessingRateEditModal`·`Modal`). 커밋 3건도 `origin/main` 미푸시.
- **`package.json` 0.12.1 그대로** — 화면 재구성·토큰 도입은 MINOR라 0.13.0 bump 필요(미실행).
- **토큰 확산 미완** — 재고 조회·재고 집계·거래 이력·원가·손익·매입 통계 등 나머지 표는 아직 구 규칙. 숫자 정렬 규칙 정합(DESIGN=우측 ↔ CLAUDE 07-01 표규칙=좌측 상자)도 여전히 미정.
- **앱 루트 마운트 오버레이 2종**(`ConfirmBottomSheet`·`Toaster`)은 /admin에서 열려도 DOM상 admin 밖이라 모바일 토큰을 받는다(globals.css 주석에 기록).
- 품목마스터 `권장표기`·`상세규격_표기` 필드가 Airtable에 실재하지 않아 해당 2컬럼은 항상 빈칸.
- 보관처 비용 이력은 83행 중 12행만 값 보유(노조비는 1행). 동결비 3열 분리 ↔ `storage-cost.ts` 단일 필드 참조 불일치는 그대로(`freeze-fee-split-mismatch`).
- Pretendard 폰트 교체·`<StatusBadge>`·다크모드는 이번 범위에서 제외(미착수).
- (이월) 노출 토큰·키 재발급, 07-25 미커밋 5파일, 통(桶) 구분, 작업단가 배분 정밀도, Node 20→22.

**다음 작업 후보**
- 오늘 작업분 커밋 + `0.13.0` bump + 푸시.
- 남은 목록 화면에 토큰·공통 컴포넌트 확산(재고 조회 → 재고 집계 → 거래 이력 → 원가·손익 순).
- `<StatusBadge>` 신설 — 동시에 `'승인 완료'` 같은 상태 문자열을 상수로 뽑아 오늘 같은 오타 버그를 구조적으로 차단.
- 오버레이 2종 토큰화(표면 상속 문제 동시 해결).
- Pretendard 폰트 교체 여부 결정.
- (이월) 토큰·키 재발급, 통 구분, Node 22 업그레이드.

---

### 2026-07-29

**완료한 작업**
- **ROADMAP.md 현행화** — 2026-05-12자에 멈춰 약 2개월치 진행이 미반영이었다. 실측 대조로 Phase 상태 정정(Phase 1 부분 2/5 — Step 1·3·4 파일 확인 결과 미착수 / Phase 2 완료 — inline fetch 0건 재확인 / Phase 3 19-25 화면 / Phase 4 미착수). Phase 3 완료 기준 '미충족' 명시(마스터 데이터 정리는 여전히 Airtable UI 의존). IA 6→7 카테고리 반영(07-14 '재고 작업' 신설) + 최초 IA에서 흡수·제거된 6항목 사유 기록.
- **「현장 발생 트랙」 신설**(ROADMAP + CLAUDE.md) — 중기·장기 목표에도 Phase 표에도 없었으나 업무 요구로 만들어져 핵심이 된 5갈래(원가·가공 모델 / 어황일보 번역 봇 / 디자인 시스템 / PC 셸·출력 / 개발 인프라). 계획된 단계가 아니므로 Phase 번호를 붙이지 않고 Phase 0~5 블록 뒤에 독립 배치.
- **CLAUDE.md 현행화** — 테스트 수치 실측 갱신(단위 5f·103 → **9f·196**, 통합 12f·45 → **29f·112**). 중기 목표 3건 완료 정정(입고 폼·PDF 폰트·PWA) → 남은 건 기기별 고정 로그인·팩스 2건. 장기 목표 '부자재 재고 확장' 완료 표기(06-29). 헤더 날짜·IA 참조 번호(4→5) 정정.
- **★재고 조회 DESIGN.md 적용**(v0.4.1, 토큰 확산 2번째 화면) — hex 리터럴·`text-[Npx]`·gray/blue/green 팔레트·`.5` 간격·shadow **전부 0건**. 버튼 7개→`<Button>`, 인라인 스피너→`<LoadingState>`(표 스켈레톤), `py-20`→`<EmptyState>`. 정렬 헤더(§7-8) `<th onClick>`→`<button>`+`aria-sort`(키보드 조작 불가였음), 숫자 컬럼은 아이콘을 라벨 왼쪽에 둬 우측선 일치.
- **`<StatusBadge>`·`lib/status.ts` 신설** — §6-1 표에서 유일한 미구현 항목이었다. 전역 단일 색 매핑(반려=danger / 취소=중립으로 색군 분리), 정상 판정 주입식(화면마다 정상의 뜻이 다르다). 상태 문자열 상수화로 07-28 `'승인완료'`(공백 없음) 오타 버그를 **런타임 오작동 → 컴파일 오류**로 전환(§8-3).
- **★소진 LOT 화면 분리**(`/admin/master/lots-depleted`, **v0.14.0**) — 재고 조회는 활성 전용. `listLots(workerId, scope)` 서버 `filterByFormula` 도입(active/depleted/all, 기본 all이라 재고 집계 무영향). 상태 칩 제거, 검색·필터를 제목 줄 우측으로 옮겨 컨트롤 행 하나 제거. 검색 빈손 시 "소진된 LOT일 수 있습니다" + 검색어 전달(`?q=`).
- **색 운용**(§2-3 액센트 최대 2종) — 재고수량 `accent-ink`(값 컬럼 중 유일한 액센트, 이전 `#3182F6`은 대비 3.71로 미달), 보관일수 90/180일 임계 `warn-ink`/`danger-ink`. 나머지는 중립 위계. 이전 버전 대비 미달 3건(빈값 1.47 / 빈 상태 문구 2.54 / 숫자 3.71) 해소.
- **컬럼 재정렬** — 좌측(텍스트) 묶음 → 우측(숫자) 묶음 → 비고. 좌우 전환 **3회 → 1회**. 07-25 journal에 기록됐다 유실된 재정렬 의도(품목을 LOT번호 옆으로)도 함께 복원. 재고 조회 1992→1936px, 소진 LOT 1308px(§7-9 스페이서).
- **버그 3건 fix** — ①sticky LOT번호 칸이 `bg-white` 고정이라 행 hover가 끊겨 가로 스크롤 시 그 칸만 잘려 보이던 것(§7-3) ②서버 원문(`result.error`)을 토스트에 그대로 노출(§6-4) ③표 헤더 '품목명'→'품목'(§8-2 용어 사전, CSV 헤더는 호환 위해 유지).
- **DESIGN.md v0.4.1 → v0.4.2** — §10 "`aria-sort`는 코드베이스 전체 0건"이 사실과 달라짐(5화면 적용, 남은 정렬 화면은 재고 집계 1개). `<StatusBadge>` 실물 신설 기록.
- 커밋 3건(`e68578e` 문서 현행화 / `a11a0cb` DESIGN 적용 / `b1ca872` 소진 LOT 분리). `tsc` 0, 단위 196 + 통합 112 전부 통과.

**결정 사항**
- **「현장 발생 트랙」에 Phase 번호를 붙이지 않는다** — Phase는 순차적으로 *계획된* 단계인데 번호를 붙이면 "3과 4 사이에 계획된 것"으로 읽힌다. 목록의 쓸모는 "계획이 놓쳤는데 업무는 필요로 했던 게 뭔지" 패턴을 보는 것 — 지금까지는 원가·정산의 실제 업무 절차와 바이어 커뮤니케이션이 그 자리였다.
- **상세는 ROADMAP 단일 출처, CLAUDE.md는 요약+포인터** — 오늘 고친 게 두 문서가 따로 놀며 stale해진 문제였다. 같은 내용을 양쪽에 다 적으면 같은 일이 반복된다.
- **'소진 LOT' 명칭 — '재고 이력' 기각** — 바로 아래 '거래 이력' 그룹(입고/출고/이동/지출 이력)과 헷갈린다. 과거 '결재 이력·검색'을 없앤 것과 같은 이유. '소진'은 LOT 상태값이자 재고 집계 토글이 이미 쓰는 말이라 새 용어가 아니다(§8-2).
- **소진 LOT 화면에 재고장 인쇄를 두지 않는다** — 이 분리의 핵심 이득. 전엔 상태 칩을 '전체'로 바꾸면 소진까지 선택·인쇄할 수 있었다. CSV는 유지(이력 감사용, 재고장으로 오인될 물건이 아님).
- **보관일수·재고원가·상태 컬럼도 소진 화면에서 제외** — 앞 둘은 `asOfDate`(오늘) 기준이라 소진된 LOT에서 숫자가 계속 커진다. 소진 시점 값이 아니라 오독을 부른다. 상태는 거의 전부 '소진' 한 값이라 열이 통째로 빈칸처럼 읽힌다.
- **반려·취소는 소진 화면에서 오류가 아니라 분류** — 재고 조회에서는 반려 LOT에 재고가 남아 있으면 진짜 오류라 경고색을 쓰지만, 재고 0 목록에서는 '0이 된 사유가 다를 뿐'이다. 경고색 배너 → 중립 안내 + 필터로 톤 하향(§2-3 분류 배지 예외).
- **보관처는 좌측 정렬 유지, 순서로 해결** — §7-6이 거래처류를 좌측으로 못 박았고, 200행 세로 스캔 시 왼쪽 시작선이 들쭉날쭉해진다. 위화감의 원인은 정렬이 아니라 배치였다.
- **이상 상태 배지를 sticky LOT번호 칸으로** — 전엔 14번째 컬럼(x=1640px)이라 §1의 최소 지원 폭 1280px에서 화면 밖이었다. **스크롤해야 보이는 오류 표시는 오류를 못 잡는다.** 정상 행은 점도 없이 완전히 조용해졌다.
- **LOT번호에 `--link` 토큰을 쓰지 않는다** — 클릭 대상이 셀이 아니라 행 전체다. 링크색을 주면 그 칸만 눌러야 하는 것처럼 읽힌다. 대신 가장 진한 중립으로 앵커 복구.
- **불일치가 항상 나쁜 것은 아니다**(사용자 지적 수용) — 구조가 달라서 생기는 차이는 드리프트가 아니다. 검색·필터를 제목 줄 우측으로 옮긴 것, 두 화면의 이상 표시 방식이 다른 것 모두 목적 차이에서 나온 의도된 차이다.

**미해결 이슈**
- **⚠️ 2026-07-25 작업 유실 확인** — journal엔 '미커밋 5파일'로 이월돼 있으나 워킹트리·stash·전 브랜치 어디에도 없다(`ENABLE_TEAROFF` 코드 이력 0건, `_tab-bar.tsx` 최종 변경 06-12). **탭바 tear-off 오발동(↗·창밖 드래그)은 현재 활성 상태 — 재작업 필요.** 같은 날 기록된 컬럼 재정렬은 오늘 작업에 함께 복원됐다.
- **컬럼 폭이 산술 환산값** — 셀 글자를 13px→`text-body`(14px)로 올리며 실측 폭을 1.077배 했다. 브라우저 재실측이 아니다. 말줄임 금지 정책이라 모자라면 옆 칸으로 넘친다. LOT번호(320px, 배지 자리 포함)·평가액(136px)이 실측 최댓값에 가깝다. **육안 확인 필요.**
- **보관일수 90/180일 임계는 업무 규칙 미확정** — 코드베이스에 악성재고 기준이 없어(daysHeld는 냉장료 계산 전용) 필터 placeholder '예: 90'에서 땄다. 실제 기준이 정해지면 `DAYS_WARN`/`DAYS_DANGER` 두 줄만 고친다.
- **서버 `filterByFormula` 빈 재고수량 처리 미검증** — 이론상 Airtable에서 blank는 0으로 비교돼 소진 쪽에 떨어진다. 로그인 후 건수로 확인 필요.
- **소진 시점 원가 미노출** — 소진 화면에서 재고원가를 뺐으므로, 필요하면 출고관리의 '출고시점 판매원가' 스냅샷을 봐야 한다(별도 작업).
- **재고 집계는 아직 구 규칙** — 토큰·정렬 헤더 미적용. `pairW` DOM 측정 로직과 충돌해 별도 작업(DESIGN §10). 거래 이력·원가·손익도 미확산.
- **검색·필터 우측 상단은 재고 조회·소진 LOT만** — 보관처·제품·작업자·선박은 좌측이다. 목록 화면 전체 정책으로 정해 일괄 이동할지 결정 필요.
- `origin/main` 미푸시 — 오늘 커밋 3건 + 어제 것 포함.
- (이월) 노출 토큰·키 재발급, 통(桶) 구분, Node 20→22, `freeze-fee-split-mismatch`, 품목마스터 `권장표기`·`상세규격_표기` 필드 부재, 오버레이 2종 표면 상속, Pretendard 교체.

**다음 작업 후보**
- **브라우저 육안 확인** — 컬럼 넘침(특히 LOT번호+배지), 서버 필터 건수, 소진 화면 스페이서 여백.
- 07-25 tear-off 휴면화 **재작업**(유실분).
- 재고 집계 표준화 — 토큰 + `pairW` 제거 + 정렬 헤더(DESIGN §10의 마지막 정렬 화면).
- 거래 이력 4종 → 원가·손익 순으로 토큰 확산.
- 목록 화면 검색·필터 위치 일괄 정책 결정.
- 보관일수 임계 업무 규칙 확정.
- (이월) 토큰·키 재발급, 통 구분, Node 22, 오버레이 2종 토큰화, Pretendard 교체.

---

### 2026-07-30

**완료한 작업**
- **LOT 생애주기 진입 경로 통일** — 입고·출고·이동 이력은 LOT번호 클릭, 재고 조회·소진 LOT는 행 전체 클릭으로 갈려 있던 것을 **LOT번호 링크**로 통일. `app/admin/_lot-link.tsx` 신설(진입 창구 단일화), 5화면 적용. 재고 조회 체크박스의 `stopPropagation` 가드도 행 클릭이 없어져 함께 제거(죽은 코드 정리).
- **재고 조회 밑줄 버그 fix** — LOT번호를 `inline-flex`로 감싸 배지를 붙였더니 `text-decoration`이 그 안으로 전파되지 않아 hover 밑줄이 사라져 있었다. LOT번호를 링크 직계 텍스트로 되돌리고 배지 간격은 `ml-2`로.
- **링크색 토큰 `--link`(#1C6CE0) 신설** — 옛 하드코딩 `#3182F6`은 흰 배경 대비 3.71로 §2-4(4.5:1) 미달이었다.
- **Pretendard 폰트 self-host 전환** — `next/font/local` + `app/fonts.ts` 신설(`npm install pretendard`). Spoqa Han Sans Neo 원격 `@import` 제거 — 그 호스트가 막히면 전 화면이 브라우저 기본 폰트로 떨어지는 위험이 있었다. `work-settlement/_shared.ts`의 죽은 `"Pretendard"` 참조 2곳(로드된 적 없는 이름을 가리키고 있었음)도 실제 폰트에 연결. `body { font-family: ...'sans-serif' }`의 generic keyword 따옴표 버그(대체 경로 무력화)도 같이 fix.
- **표 헤더 전용 타이포 토큰 `--t-table-head`(14px/500) 신설** — `--t-label`은 폼 라벨 전용으로 범위 축소. 하드코딩 `text-[12px] font-bold` 16화면(41줄) + `text-label` 표헤더 7화면 + 로딩 스켈레톤(`<TableSkeleton>`, 안 고쳤으면 로딩 종료 시 헤더가 튀었을 것)까지 /admin **23화면** 확산.
- **헤더발 컬럼 최소폭 재계산** — 헤더 12→14px 전환으로 하한이 바뀐 컬럼들(products·ships 마스터, 재고 조회·소진 LOT의 최초입고일·재고수량·재고원가·보관일수, 거래 이력 worker, 매입 통계·손익 추이 일부)을 산술 환산(×1.2, 4px 단위 올림). **실측 아님 — 육안 확인 필요.**
- **매입 통계·손익 추이 표 본문 통일** — `text-[13px]` → `text-body`(14px), 4개 표 인라인 colgroup ×14/13 재환산. 도넛 차트 범례(표 아님)는 제외.
- dev-font-check 임시 페이지로 Spoqa/Pretendard 실측 비교(tabular-nums 정렬·굵기 단계) 후 결정하고 삭제.
- DESIGN.md v0.4.2 → **v0.4.3** — §2-2 `--link`, §3 `--t-table-head` 신설(§3에 "표 헤더/폼 라벨 크기가 다른 게 의도된 것" 명문화), §10 정리(Pretendard 완료 항목 삭제), 변경이력 갱신.
- 검증: `tsc` 0, ESLint 0, 단위 196 + 통합 112 전부 통과, /admin 22개 화면 전체 컴파일(200) 확인.

**결정 사항**
- **LOT 생애주기 진입 = 행 클릭이 아니라 LOT번호 링크로 통일** — 디자인 원칙만 보면 §7-7("행 클릭 시 우측 패널")이 행 클릭 편이었지만, 실제 장단점을 대면 링크가 이겼다: 셀 텍스트 드래그 복사 시 페이지가 이동하는 기존 버그, `router.push`라 Ctrl+클릭 새 탭이 안 됨(탭바·창 분할 환경에서 손해가 큼), 아무 데나 눌러도 이동해 목적지가 안 보임, 행이 나중에 다른 액션을 못 가짐. 타겟이 작다는 유일한 단점은 셀 전체를 링크로 만들어 해소.
- **Pretendard vs Spoqa — 디자인 원칙 무관하게 순가독성으로도 Pretendard 우위** — tabular-nums 실동작 확인(Spoqa는 문서상 미확인), LOT번호 같은 영숫자 혼합 문자열의 자폭 균일성, 자면율, 굵기 5단(600 없음) vs 9단. DESIGN.md가 이미 결정해둔 방향과 일치해 문서 재논의 없이 코드만 반영.
- **표 헤더 굵기 = 500 Medium**(bold 아님) — 12→14px 크기 상승만으로 위계가 충분하고, 700은 12열 표에서 헤더 행 전체가 무겁게 눌린다.
- **작업 순서 = tnum 비교 → 폰트 확정 → 헤더+컬럼폭 한 번에 재계산** — 폰트를 나중에 정했으면 폭 계산을 두 번 해야 했다(Pretendard 자면이 Spoqa보다 커서).
- **컬럼 폭 재계산은 "헤더가 하한이던 컬럼"에만 적용** — 전면 재실측은 오늘 범위 밖(§0 최소 수정 원칙). 인라인 colgroup 2화면(매입 통계·손익 추이)도 같은 원칙으로 최소 폭만 건드림.

**미해결 이슈**
- **컬럼 폭 전량 산술 환산(실측 아님)** — 특히 매입 통계 "평균단가(박스)"·"매입액"·"품목" 컬럼은 여유가 원래 빠듯했다. **육안 확인 필요.**
- **거래 이력 표 행 높이가 재고 조회(38px, `py-2`)와 아직 안 맞음** — 거래 이력은 `py-3` 기반이라 헤더 14px 전환 후 차이가 더 벌어졌을 수 있다.
- **옛 링크색 `#3182F6`이 LOT 생애주기·건강도 2곳에 잔존**(대비 3.71 미달) — 오늘 범위 밖이라 안 고침.
- 매입 통계 도넛 차트 범례(`text-[13px]`)는 표가 아니라서 오늘 제외 — 필요하면 별도 확인.
- 정렬 아이콘·헤더 텍스트 간격이 헤더 14px 전환 후 빡빡해 보일 수 있음(미확인).
- (이월) 노출 토큰·키 재발급, 통(桶) 구분, Node 20→22, `freeze-fee-split-mismatch`, 품목마스터 `권장표기`·`상세규격_표기` 필드 부재, 오버레이 2종 표면 상속, 07-25 tear-off 재작업, 재고 집계 표준화, 보관일수 임계 확정.

**다음 작업 후보**
- **브라우저 육안 확인** — 링크 밑줄·헤더 굵기·컬럼 폭(특히 매입 통계) 전체.
- LOT 생애주기·건강도의 `#3182F6` → `--link` 토큰 교체.
- 거래 이력 표 행 높이를 재고 조회와 통일(38px).
- `package.json` 버전 bump(0.14.0 → 다음 — 오늘 규모면 MINOR 후보).
- (이월) 07-25 tear-off 재작업, 재고 집계 표준화, 보관일수 임계 확정, Node 22, 거래 이력→원가·손익 토큰 확산.

---

### 2026-07-31

**완료한 작업**
- **작업 정산 목록 개선** — '매입처' 컬럼(사전기입 폼에 입력칸 자체가 없어 항상 빈 값)을 '선박명'으로 교체. 정산번호·작업일·선박명·상태 컬럼을 가운데 정렬로(생산내역·어대금은 `NumCell` 우측 정렬 유지). 임시저장 행 취소 버튼 라벨을 '삭제'로 분리(확정 행은 '취소' 유지, 동작은 동일한 소프트 취소).
- **② 작업비·생산내역 화면에 사전기입 인라인 편집 신설** — '사전기입 수정' 링크(페이지 이동)를 접기/펼치기 인라인 폼으로 교체, 저장 시 헤더만 갱신. `normDate`/`normTime`을 `work-settlement/_shared.ts`로 공용화(①·② 양쪽에서 재사용).
- **지출(비용) 기능 진입 경로 숨김** — 회계 프로그램으로 이관하기로 한 결정에 따라 모바일 홈(바로가기·KPI카드) + PC 사이드바(`_nav.ts`) + 결재 수신함·관리자 대시보드·my-requests의 EXPENSE 탭, 5개 파일에서 숨김. 서버 액션·승인 로직·손익 계산·기존 데이터·PDF는 그대로 유지(진입 경로만 차단, URL 직접 접근은 막지 않음).
- **스타일 하드코딩 실태 조사** — 인라인 `style` 36파일/173곳(그중 78곳은 `<col style={{width}}>` 구조적 사용), `text-[Npx]` 53파일, `bg/text/border-[#hex]` 47파일(총 57개 파일·816곳). `tailwind.config.ts`↔`globals.css` 토큰 관계, 폰트 선언 산재 현황도 함께 정리.
- **CLAUDE.md '스타일 정리 원칙(점진적 적용)' 신설** — 일괄 치환 대신 다른 작업으로 파일 열 때 함께 정리. 적용 대상/제외, 30곳 초과 시 확인, 커밋 분리, `STYLE-MIGRATION.md` 진행 관리 규칙 명문화.
- **`STYLE-MIGRATION.md` 신설** — 위 조사 결과를 57개 파일·816곳 체크리스트로 정리, 30곳 초과 7개 파일은 별도 섹션(⚠ 진행 전 확인 필요)으로 분리.
- **`Spoqa Han Sans Neo` 하드코딩 정리** — 16개 파일 19곳(인라인 `style` fontFamily 15 + `className` 임의값 4) 제거, 전역 Pretendard 캐스케이드(`app/fonts.ts`→`globals.css`)에 위임. 삭제 대신 body 캐스케이드에 맡기는 방식(대체 지정 없음).
- **어제(07-30) 배포 미반영 원인 진단** — "로컬↔배포 화면이 다르다" 문의로 조사, 최신 production 배포(`543c182`)가 문서 파일 4개만 담고 있었음을 `git show --stat`·Vercel 배포 이력으로 확인. 원인은 `/wrap-up`의 커밋 단계가 `journal.md`·`CLAUDE.md`만 `git add`하도록 설계돼 있었기 때문(그날의 판단 미스가 아니라 명령어 자체의 표준 동작).
- **`/wrap-up` 개편** — 코드 변경도 사용자 확인(6단계)을 거쳐 docs와 분리된 별도 커밋(`chore: 코드 반영`)으로 함께 푸시하도록 5~8단계 재구성. `.env`·인증서·시크릿류 파일은 자동 스테이징 제외.
- 오늘 이 커밋으로 어제(07-30) 세션의 미커밋 코드(LOT번호 링크 통일, Pretendard self-host, 표 헤더 토큰 확산 등 — 상세는 위 07-30 항목)도 함께 배포됨.
- **작업자 마스터 인사 정보 확장(`5bf52f9`) 실반영 재확인** — 소속·직급·연락처·입사일 컬럼, PIN 상태 맨 오른쪽 재배치, 소속별 그리드 자동 분리(`groupByAffiliation`, 하드코딩 아니라 데이터 기반), '전체'⟷'모든 권한' 사이 구분선. 5가지 모두 코드로 확인. Airtable MCP로 QA테스트 계정(사용자 테이블, MASTER, PIN `1234`, 소속 한라에스앤에프)이 실제로 존재함도 확인.
- 미커밋 4개 파일 커밋(`85eee5c`) — 사료 규격 `"p/n"` 표기 예외 처리(`lib/spec-display.ts`), 사료 선택 시 규격/미수 자동 고정(`inventory/record`), 재고 요약 배지가 `formatSpec` 쓰도록 교체(사료 검색 시 "p/nkg" 오표기 수정, `StockStatusSummary`), LOT 마스터 검색에 미수 추가.
- 로컬 dev 서버(`npm run dev --turbopack`) 기동·정상 동작 확인.
- **작업자 마스터 '권한'·'활성' 헤더 중앙 정렬 쏠림 버그 진단·수정** — 정렬 아이콘이 라벨과 한 덩어리로 `justify-center`되면서 라벨 자체가 아이콘 폭만큼 왼쪽으로 밀리는 현상. `SortIcon.tsx`에 대칭용 `SortIconSpacer` 신설 + `workers/page.tsx` `Th`에 적용. tsc 0·dev 서버 hot-reload 정상. **브라우저 미검증 상태로 커밋 보류**.
- Playwright MCP 서버 로컬 스코프로 연결(`claude mcp add playwright -- npx @playwright/mcp@latest`, `claude mcp list`로 연결 확인) — 다음 세션부터 PC 화면 로그인·클릭·스크린샷 도그푸딩 가능해질 예정.

--- (2차 세션 — Playwright 실측 도입) ---

- **Playwright 실행 환경 확보** — MCP가 가리키는 chrome 바이너리에 `libnss3`·`libnspr4`·`libasound2`가 없고 sudo도 막혀 있어 MCP 호출이 전부 실패. `apt-get download` + `dpkg-deb -x`로 .deb를 스크래치패드에 풀고 `LD_LIBRARY_PATH`로 연결해 우회. 이후 playwright-core를 직접 구동하는 스크립트 방식으로 진행(MCP 경유 안 함).
- **QA테스트 계정(PIN 1234) 로그인 → 작업자 마스터 실측 확인** — 어제 보류했던 `SortIconSpacer` 헤더 정렬 fix가 **정상 동작 확인**(`권한`·`활성` 헤더가 배지와 중앙 일치). CLAUDE.md엔 "커밋 보류"로 적혀 있었으나 실제로는 `b81efe8`에 이미 커밋돼 있었음(메모가 stale).
- **다른 5개 화면은 정렬 헤더가 전부 좌측정렬이라 스페이서 불필요함을 확인** — 헤더 쏠림 전 화면 0건.
- **작업자 마스터 컬럼 폭 3곳 실측 교정** — 어제 `// 실측 아님(산술 추정)`으로 남겨둔 4컬럼을 브라우저로 측정. 소속 144→200px(실제 데이터 `제주수산물수출포장가공센터` 158px가 들어가 화면상 "…가공센터 부회장"으로 붙어 읽히던 버그), 작업자명 116→140px(`QA테스트 본인` 99px — 어제 추정 근거는 `이경환 본인` 74px), 입사일 108→124px.
- **작업자 마스터 가로 스크롤 제거** — 컬럼을 넓히자 표 1212px가 컨테이너를 넘어 스크롤 발생. `CONTENT_MAX` 1140→1236, 페이지 컨테이너 1200→1300px로 올려 흡수(§7-9 스페이서가 잉여 24px 흡수). 1600/1920/2560px에서 스크롤 없음 확인.
- **작업자 마스터 `잠금` 컬럼 `정상` 글씨 크기 교정** — 이 셀만 `text-caption`(11px)이고 나머지 텍스트 셀은 전부 `text-body`(14px)였음 → `text-body`로 통일.
- **`/admin` 22화면 자동 UI 감사 도구 제작(세션 임시본)** — 로그인 1회 후 전 화면을 돌며 타입 스케일 밖 폰트·컬럼 넘침·헤더 중앙 쏠림·가로 스크롤·JS 에러를 측정. 탭바 누적으로 폰트 개수가 부풀던 것, 아이콘이 `opacity-0`으로 자리를 차지해 헤더 쏠림이 0으로 나오던 것 두 가지 오측정을 잡아 본문 영역 한정 + 텍스트 노드 기준으로 교정.
- **스타일 토큰 마이그레이션 4화면 완료(92곳·잔여 0)** — 재고 집계 23곳 / 용어 위키 34곳(사용자 지시로 30곳 초과 예외) / 부자재·경비 17곳 / 작업 정산 18곳. 전 화면 감사 통과(스케일 밖 폰트 0, 컬럼 넘침 0, JS 에러 0, tsc 0).
- **접근성 결함 1건 수정** — 작업 정산 행 액션 링크가 `#3182F6`(흰 배경 대비 3.71, DESIGN.md §2-4 미달로 이미 명시된 색)이었음 → `text-link`(#1C6CE0)로 교체.

**결정 사항**
- **표 컬럼 가운데 정렬은 DESIGN.md §7-6("중앙 정렬 쓰지 않는다") 위반이지만 좁게 예외 허용** — 정산번호·작업일·선박명·상태 4개 컬럼은 값 길이가 짧고 일정해 스캔 정렬이 안 깨진다는 판단(사용자 확인). 생산내역·어대금처럼 값 길이가 벌어지는 숫자 컬럼은 예외 없이 `NumCell` 우측 정렬 유지.
- **작업 정산 `매입처`(supplierId) 백엔드 배선은 삭제하지 않음** — UI 드롭다운이 없어 죽은 코드로 보였으나, 골든패스 통합 테스트가 실제로 검증하는 살아있는 경로였다(Airtable에서 수동으로 매입처를 링크해두면 확정 시 입고관리·LOT로 전파). 삭제 시도 중 테스트가 깨져 즉시 원복 — "UI가 없다 = 죽은 코드"가 아니라는 사례로 기록.
- **지출 비활성화 범위 = 진입 경로만** — 결재 승인 함수(`updateApprovalStatus`)가 입고·출고·이동·지출 4타입을 공유해 서버 로직까지 건드리면 리스크가 큼. 손익 계산(손익 추이·일일정산 이메일)도 그대로 둠 — 회계 프로그램 이관은 신규 신청 차단이 목적이지 과거 데이터·집계를 지우는 게 아니라는 판단.
- **`STYLE-MIGRATION.md`는 일괄 치환이 아니라 점진적 체크리스트로 설계** — 기존 '최소 수정 원칙'(이왕 손대는 김에 정리 금지)과 정면 충돌하는 지점이 있어, CLAUDE.md에 "스타일 하드코딩에 한해·30곳 상한·별도 커밋"이라는 좁은 예외로 명시.
- **`/wrap-up`은 `git add -A`를 무조건 쓰지 않음** — 사용자 확인(6단계)과 민감 파일 자동 제외를 그대로 유지 — 미완성 UI가 도그푸딩 없이 매일 자동 배포되는 위험을 막기 위함.
- **DESIGN.md §7-8(정렬 헤더 아이콘 배치) 공백 발견·확장** — 좌/우 정렬의 "아이콘은 라벨 반대편" 원칙만 있고 중앙 정렬 케이스가 정의돼 있지 않았음. 같은 원칙을 투명 스페이서로 중앙 정렬에 확장, 다른 화면이 나중에 중앙 정렬 정렬헤더를 추가할 때도 재사용하도록 공용 모듈(`SortIcon.tsx`)에 배치.
- **이번 세션엔 브라우저 자동화 도구가 없어 헤더 정렬 수정을 육안 검증하지 못한 채 커밋 보류** — 사용자 요청으로 Playwright MCP를 로컬 스코프로 연결, 다음 세션에서 QA테스트 계정으로 직접 확인하기로 함.

--- (2차 세션) ---

- **스타일 정리를 "화면 단위 챕터 + 감사 통과 시 자동 다음 화면" 방식으로 진행하기로 함(사용자 결정)** — 전면 일괄 스윕(422곳)은 CLAUDE.md '일괄 수정 금지' 원칙을 뒤집고 결재·정산 등 돈이 걸린 화면이 섞여 회귀 위험이 크다는 판단. 감사에서 문제가 나오면 그 지점에서 멈춘다.
- **용어 위키는 30곳 초과(⚠) 파일이지만 사용자가 명시 지목해 예외 진행** — 나머지 ⚠ 파일(approval/inbox 43곳, lot-timeline 55곳)은 별도 확인 후 진행.
- **감사 스크립트는 저장소에 넣지 않고 세션 임시본으로만 사용(사용자 결정)** — 개발 전용 코드가 저장소에 늘지 않게. 대신 측정 방법은 `STYLE-MIGRATION.md`에 문서로 남김.
- **토큰 치환 시 `font-black`/`font-bold`를 뗀다** — 타입 스케일 토큰이 굵기를 포함하므로(DESIGN.md §3 "화면에서 font-bold를 덧붙이지 않는다"), v0.4.3의 `text-[12px] font-bold`→`text-table-head` 선례를 따름. 결과적으로 글씨가 얇아지는 변화가 동반됨.
- **크기 토큰이 없는 값은 "역할"로 매핑** — 22px h1→`text-page`(20), 15px 카드 제목→`text-section`(16), 11.5/12.5px→`text-caption`/`text-label`. CLAUDE.md의 "1:1 치환 가능한 것만" 규칙을 엄격히 읽으면 보고만 해야 하지만, DESIGN.md §3이 "스케일 밖 값 금지"를 명시하고 역할 토큰이 존재하므로 역할 기준으로 매핑하고 크기 변화를 문서에 기록하기로 함.
- **1px 넘침은 결함으로 보지 않기로 함** — 첫 감사에서 "LOT번호 +1px"·"비고 +1px" 등을 결함으로 보고했으나, `scrollWidth > clientWidth`로 재확인하니 실제 잘린 셀 0개. 서브픽셀 반올림이었고 감사 임계값을 1px 초과로 올림.
- **`비고` 컬럼의 말줄임은 결함이 아님** — `clamp: true`로 의도된 §7-2 예외(자유 텍스트라 최댓값 예측 불가). 자동 감사는 "다르다"까지만 말해주고 "틀렸다"는 판단은 못 한다는 사례.

**미해결 이슈**
- 오늘 변경분 도그푸딩 전혀 안 함 — 특히 지출 숨김 후 모바일 KPI 카드 1열 레이아웃, 작업 정산 인라인 편집 실사용, Spoqa 제거 후 실제 폰트 렌더링 육안 확인 필요.
- `STYLE-MIGRATION.md`의 30곳 초과 7개 파일(outbound·lot-timeline·transfer·record·approval-inbox·my-requests·ops-wiki)은 아직 손 안 댐.
- CLAUDE.md '스타일 정리 원칙'과 '최소 수정 원칙'이 문서상 서로 교차 참조돼 있지 않음(예외 관계라는 점이 명시적이지 않음).
- (이월) 07-30 미해결 전체 — 컬럼 폭 산술 환산 육안 확인, 옛 링크색 `#3182F6` 2곳, 거래 이력 행 높이 불일치, 버전 bump 등.
- ~~**작업자 마스터 '권한'/'활성' 헤더 정렬 수정 브라우저 미검증**~~ → 2차 세션에서 Playwright 실측으로 **정상 확인**(이미 `b81efe8`에 커밋돼 있었음).
- Playwright MCP가 이번 세션 내에서는 도구 목록에 반영 안 됨(연결 직후라 세션 재시작 필요) — 다음 세션에서 실제로 도구가 잡히는지 확인 필요.
- `85eee5c`까지의 로컬 커밋이 origin/main에 아직 미푸시.

--- (2차 세션) ---

- **Playwright MCP는 여전히 못 씀** — MCP가 가리키는 chrome 바이너리에 시스템 라이브러리(`libnss3`·`libnspr4`·`libasound2`)가 없고 `sudo`가 비밀번호를 요구해 설치 불가. 이번엔 .deb를 스크래치패드에 풀고 `LD_LIBRARY_PATH`로 우회했지만 **스크래치패드는 세션마다 날아가므로 다음 세션에 다시 해야 한다.** 근본 해결은 `sudo npx playwright install-deps chrome`을 사용자가 직접 1회 실행하는 것.
- **스타일 정리 남은 화면(다음에 이어서 할 것)** — 30곳 미만이라 바로 진행 가능: 가공 거래(22)·건강도(20)·관리자 홈(29)·사이드바 레이아웃(29)·손익 추이(23)·매입 통계(14)·거래 이력 4종(각 10~11)·PC 등록 폼 4종·모바일/공용 컴포넌트 다수. **⚠ 30곳 초과라 사용자 확인 필요**: `approval/inbox`(43곳·780줄)·`lot-timeline`(55곳·628줄)·`inventory/outbound`(53)·`inventory/transfer`(49)·`inventory/record`(43)·`my-requests`(35).
- **`STYLE-MIGRATION.md` 집계가 실제보다 적다** — 정리한 4파일 모두 표 숫자보다 많았음(22→23, 32→34, 13→17, 16→18). 정적 검색 정규식이 `border-t/l/r/b-[#…]`·`ring-[#…]`·`accent-[#…]`를 빼먹었고, Tailwind **기본** 크기 클래스(`text-lg` 18px)는 임의값이 아니라 아예 대상 밖이었는데 스케일 위반은 동일. 남은 파일도 표보다 몇 곳 더 나온다고 봐야 함.
- **정리한 4화면의 색·굵기 변화 육안 미확인** — 감사는 크기·넘침만 보고 색은 검증 못 함. `bg-[#3182F6]/5`→`bg-accent-bg`(재고 집계 뷰 선택 배경이 눈에 띄게 진해짐), `green-50`→`success-bg` 등은 값이 정확히 같지 않음. `font-black`/`font-bold` 제거로 글씨가 전반적으로 얇아진 것도 인상 확인 필요.
- **모달·빈 상태·에러 상태 미검증** — 부자재 추가 모달, 작업 정산 삭제 확인 등은 렌더링된 적이 없어 감사가 통과시켜 버림. 작업자 마스터의 `활성`·`잠금` 컬럼 폭도 비활성·잠금 레코드가 0건이라 배지 최댓값 미실측 상태 그대로.
- **`components/LoginShell.tsx`가 아직 `min-width: 1024px` 기준** — CLAUDE.md 2026-07-04에 "입력 장치(포인터) 기준으로 교체, 3파일 미커밋"이라 적혀 있으나 커밋 이력에 `353a87a` 하나뿐. **07-25 tear-off 휴면화와 같은 유실 패턴**으로 보임(재작업 필요).
- 정리한 4화면 모두 1920px 단일 해상도에서만 확인.

**다음 작업 후보**
- 오늘 배포분 브라우저 도그푸딩(모바일 + PC).
- `STYLE-MIGRATION.md` 상위 항목부터 다른 작업 곁다리로 정리 시작.
- 지출 진입 경로 숨김이 며칠간 문제 없으면 완전 제거 여부 재검토.
- (이월) `package.json` 버전 bump, 07-30 다음 작업 후보 전체.
- ~~새 세션에서 Playwright로 헤더 정렬 실측 확인~~ → 완료.

--- (2차 세션 이후 우선순위) ---

- **`sudo npx playwright install-deps chrome` 사용자가 1회 실행** — 이걸 해두면 다음 세션부터 Playwright MCP를 그대로 쓸 수 있고, 매번 .deb 우회를 반복하지 않아도 된다. **가장 먼저 할 것.**
- **스타일 정리 30곳 미만 화면 이어서 진행** — 감사 통과 시 자동으로 다음 화면. 순서 후보: 가공 거래 → 건강도 → 관리자 홈 → 사이드바 레이아웃 → 손익 추이 → 매입 통계 → 거래 이력 4종.
- ⚠ 30곳 초과 6개 파일(`approval/inbox`·`lot-timeline`·`inventory/outbound`·`inventory/transfer`·`inventory/record`·`my-requests`) 진행 여부 결정.
- 정리한 4화면(재고 집계·용어 위키·부자재·작업 정산) 색·굵기 변화 육안 도그푸딩.
- `LoginShell.tsx` 포인터 기준 기기 판별 재작업(유실분 복원).
- 작업자 마스터 `활성`·`잠금` 컬럼 폭 — 비활성/잠금 레코드를 만들어 배지 최댓값 실측.

--- (맥북 병렬 세션 — 코드 미반영) ---

같은 날 맥북에서 별도 세션이 병렬로 돌았으나, 그 기록이 `local-work-mac` 브랜치의
`1c19417`(docs 4파일만 담은 커밋)에만 남아 main에 없었다. 2026-08-06에 발견해 옮긴다.
**아래 완료 항목의 코드는 main에 반영되지 않았다** — 커밋 자체가 문서뿐이었고 서술된
코드는 어느 브랜치에도 커밋된 적이 없다. 결정·미해결은 그대로 유효하다.

**완료한 작업**
- **LOT 생애주기 반려 이벤트 필터링** — 재고를 전혀 움직이지 않는 반려 건(`승인상태==="반려"`)을 서버(`master-lot-timeline.ts`)에서 이벤트 dedup 루프 시점에 제외. 잔여 계산(`balanceAfterById`)은 필터 전에 끝나고 반려는 원래 delta 0이라 다른 줄 잔여 불변. 이동 반려는 출고/입고 두 줄이 다 걸러져 `foldTransfers`도 못 봄. tsc 통과.
  **→ 코드는 main에 반영되지 않음(2026-08-06 확인). 재구현 보류 — 「미해결」 참조.**
- **생애주기 출고 배지 색상 회색→빨강** — `EVENT_COLOR.outbound`를 `bg-gray-200 text-gray-700` → `bg-red-100 text-red-700`. 입고(파랑)·출고(빨강)로 재고 증감 방향을 색으로 즉시 구분. 이동 입고(초록)·이동 출고(주황)는 유지.
  **→ 2026-08-06 `7954748`로 이 1줄만 적용 완료.**
- **실데이터 검증** — Airtable에서 반려 출고 3건 조회. LOT `260518-...-0180`(입고10→반려출고5→이동10) 재구성으로 필터 전후 잔여 불변(10→0) 확인. LOT `260413-FAF-25-0140`(반려 나림221 + 승인 해담221 공존)을 빨강 배지 육안 확인용 케이스로 특정.
  **→ 검증 자체는 유효하나, 필터 코드가 없으므로 "필터 전후 불변"은 미적용 상태의 기록이다.**

**결정**
- **반려는 생애주기에서 완전 필터링(접기 아님)** — 사용자 확인 결과 "지난주 시도했다 막힌 걸 보고 싶다"는 니즈 없음. 있더라도 그건 생애주기(재고 통장)가 아니라 추후 HR용 감사 프로그램 소관. 통장의 본분은 잔액을 움직인 사건이라 delta 0인 반려는 순수 노이즈.
- **현재 배지만 있고 반려사유·결정자 미노출이라 audit 가치도 반쪽** — 감사 추적은 이미 결재 수신함 완료 탭이 담당. 이도저도 아닌 맥락 없는 "반려" 배지 제거가 맞음.
  **→ 이 전제는 2026-08-06에 깨진 것으로 확인.** `getMyRequests`가 반려·승인 완료·취소를
  **업무일 기준 최근 14일 이내만** 조회한다(`my-requests.ts:343-348` Airtable 필터 +
  `:377-402` 코드 레벨 이중 필터). 기준이 반려일이 아니라 출고일·입고일·이동일이라,
  오래된 건을 어제 반려해도 완료 탭에 뜨지 않는다. 감사 추적을 결재 수신함에 위임할 수 없다.

**미해결**
- (원문) 육안 미검증 — 필터·잔여 불변은 실데이터 재구성으로 검증했으나 픽셀 렌더는 미확인 / 입고 반려로 죽은 LOT 조회 시 이벤트 0줄, 빈 타임라인 안내문구 미조정 / (이월) 07-25 미커밋 파일들·승인자 A안·통 구분.
- **반려 필터링 재구현 여부 미결(2026-08-06)** — 위 전제가 깨져 "재구현할까"가 아니라
  "어느 동작이 맞는가"부터 다시 판단해야 한다. 14일 창을 넘긴 반려 기록을 볼 곳이
  시스템에 남는지가 쟁점이다.

**다음 후보**
- (원문) 0140으로 빨강 출고 배지 + 반려 필터 동시 육안 확인 / 미커밋 파일 성격별 커밋, 승인자 A안, 통 구분 반영.

---

### 2026-08-03

**완료한 작업**
- **작업 정산 스타일 토큰 마이그레이션 4파일·118곳(`4106eda`)** — 이 3화면(등록·상세·배분)은 Tailwind가 아니라 `_shared.ts`의 `WS_CSS` 템플릿 리터럴 + 페이지별 `<style>` 블록을 쓴다. `font-size:13px`/`color:#6A7480` 형태라 `STYLE-MIGRATION.md`의 정적 검색(`text-[13px]`/`text-[#…]`)에 하나도 안 걸렸고 57파일 목록에 아예 없었다 — 자체 팔레트 19종·자체 타입 스케일을 따로 굴리던 가장 큰 단일 부채. 로컬 변수 **이름은 유지하고 값만** 토큰에 맞춤(`var()` 참조 200곳을 함께 고쳐야 해서). 소수점 px 8곳 제거(15.5·13.5·12.5×2·11.5×2·10.5×3), 표 본문 13→14·헤더 11→14, `font-family` 선언 2곳 삭제, 장식 `box-shadow` 3곳 삭제, `--faint` 오용 10곳→`--muted`.
- **Playwright 실측 검증 정착** — 사용자가 `sudo npx playwright install-deps chromium`을 직접 1회 실행해 07-31의 최우선 과제 해소. MCP 경유로 QA테스트 계정 로그인 → 3화면 측정: 스케일 밖 폰트 0 · `fontFamily` 1종 · 잔존 그림자 0 · 페이지 가로 스크롤 0 · 잘린 헤더 0 · 잘린 셀 0.
- **폰트 확대에도 `min-width` 재계산이 불필요함을 실측으로 확인** — 헤더가 배정폭을 넘긴 컬럼 5개(지방도 56→64·규격 68→81·중량 58→72·금액 96→112·실금액 100→112)를 짧은 컬럼들이 상쇄해 `#prod` 자연폭이 정확히 1120px, 기존 하드코딩값과 일치. 근거를 `_shared.ts` 주석에 남김.
- **★통합 테스트 3일간 전면 붕괴 발견·복구(`e383e97`)** — `5bf52f9`(07-31)가 Airtable 테이블을 "작업자"→"사용자"로 리네임하면서 `AIRTABLE_TABLE.workers`는 바꿨으나 통합 테스트 fixture는 그대로였다. `requireWorker`가 빈 테이블을 조회해 인증이 필요한 **모든** 시나리오가 그날부터 실패(28 files failed / 92 tests failed). HEAD에서 재현해 이번 세션 변경과 무관함을 먼저 확인한 뒤 수정. 레코드 링크 **필드명** '작업자'는 리네임 대상이 아니라 그대로 뒀다.
- **`fetch-mock`에 DELETE 지원 + `store.remove()` 신설** — 위 복구 중 발견. DELETE가 400 Unsupported였고, 그래서 초안 재저장 경로(`saveWorkSettlement`의 "옛 라인 전부 삭제 후 재생성")가 통합 테스트로 **한 번도 실행된 적이 없었다.** 삭제 시 반대편 link 정리 + lookup 재구성까지 구현.
- **작업 정산 전원 공동 편집 + 작성자·최종수정자 기록(`b2a7404`)** — 권한을 세 단계로 재배치: 작성·수정·조회=전원(WORKER 포함) / 확정=ADMIN 이상 / 삭제·취소=MASTER 전용(`requireMaster` 신설, ADMIN도 거부). Airtable 필드 3종 신설(작성일시·최종수정자·최종수정일시) + 기존 `작업자` 필드를 '최초 작성자'로 역할 재정의. 표기 `8월 3일 10시 06분 · QA테스트`(`lib/format-datetime.ts`, Asia/Seoul 고정).
- **`/admin` WORKER 예외 경로 체계 신설(`lib/admin-access.ts`)** — 게이트가 두 겹(`AdminAuthGate` = `/admin/*` 전체, `master/layout` = 셸·사이드바)이라 한쪽만 고쳐서 한 번 막혔다 → 단일 출처로 분리. WORKER 사이드바는 작업 정산만 남고 다른 경로는 `/`로 차단(실측 확인). 폼이 쓰는 `listProducts`·`listStorages`·`listShips`도 읽기 전용으로 개방(안 열면 콤보가 비어 폼이 작동 안 함).
- **가공비 단가 '기준' 라벨 교체(`bd34385`)** — 보관처 마스터 > 가공공장의 `투입kg당` → `원물 중량 기준`. Airtable singleSelect 저장값이라 값은 못 바꾸고(Update field API가 choices 수정 미지원 + 기존 레코드 보유) DESIGN §8-2대로 라벨만 교체. 표와 편집 모달 양쪽 적용, 컬럼 폭 104→120px(배지 실측 79 + 패딩 32 = 111이라 104로는 부족).
- **거래 이력 3화면에 입출고증 인쇄 열 신설(`31c82c6`)** — 입고=입고증 / 출고=출고증 / 이동=출고증+입고증. 있으면 `인쇄` 링크(새 탭), 없으면 `—`. CSV에도 URL 포함. 이동 입고증만 2홉(재고이동 → 신규 LOT → 입고관리링크 → 입고증URL) — 이동 입고증은 재고 이동 레코드가 아니라 이동으로 새로 생긴 입고관리에 붙기 때문(`transfer.ts:555`). 3건 전부 체인 대조 확인.
- **커밋 5개로 분리 + 커밋별 격리 검증** — 5개 파일이 두 덩어리에 걸쳐 있어(작업 정산 4파일=스타일+기능, 골든패스 테스트=회귀수정+권한테스트) 백업 후 HEAD에서 다시 쌓는 방식으로 분리. 갈라진 뒤 각 diff에 반대편 흔적이 남았는지 grep으로 확인(0건). 임시 워크트리에서 커밋마다 체크아웃해 테스트 실행 — **전 커밋 그린**(`git bisect` 무손상).
- 테스트 최종: 단위 11 files / **217 pass**, 통합 29 files / **117 pass**. `tsc` 0.
- `.gitignore`에 `.playwright-mcp/` 추가(검증 산출물이 매번 미추적으로 뜨던 것).
- DESIGN.md §8-2 용어 사전에 '작성자'·'최종 수정자' 등재 + 신청자와의 구분(결재 흐름 유무) 명문화.

--- (2차 세션 — 도그푸딩 피드백 반영) ---

- **`산출kg당` → `가공품 중량 기준` + 용어 위키 동기화** — 오전에 `투입kg당`만 바꿔 한 컬럼에 두 표기법이 섞였던 것을 짝 맞춤(원물↔가공품 = 투입↔산출 같은 축). 용어 위키 5곳(ONE/TWO-Frozen 정의문 2·원가 흐름 1·임가공비 비교표 2)까지 갈아 옛 표기 0건. 컬럼 폭 120→128(배지 실측 79→88).
- **홈(관리자) 바로 가기 카드 — 항목별 링크로 분리** — `CategoryCard`가 카드 **전체**를 `<Link href={firstEnabled}>`로 감싸고 있어 목록의 어느 줄을 눌러도 카테고리 첫 화면으로만 갔다('재고 집계'→'재고 조회', '선박'→'제품'). 링크 중첩 불가라 카드를 div로 바꾸고 제목만 첫 화면 링크 유지, 항목 25개가 제 href를 갖게 함. 실측: 7카드·25항목 전부 정확, 중첩 링크 0.
- **`STYLE-MIGRATION.md` 잔여 실측** — 53파일 남음. 문서 집계 733곳 vs **실측 793곳**(정규식이 `border-t/l/r/b-[#…]`·`ring-[#…]`를 빼먹은 탓). ⚠30곳 초과 8개(outbound 57·lot-timeline 55·record 54·transfer 53·approval/inbox 43·my-requests 36·admin/dashboard 32·master/layout 31). 색만 남은 묶음(원가·손익 2종·거래 이력 4종)이 폰트 리스크 0이라 가장 싸다는 것도 확인.
- **작업 정산 목록 — '이어서 작성' 링크 제거, 행 전체 클릭으로** — 액션 칸엔 '삭제'만. 삭제가 행 클릭을 함께 터뜨리지 않도록 `stopPropagation`(확인창 취소 후 목록 잔류 실측). 마우스 전용이 되지 않게 `tabIndex=0`+`role="link"`+Enter 핸들러도 넣음(키보드 진입 실측).
- **★'최종 수정자 미반영' 신고 → 원인 둘 규명** — ① 데이터: 유일한 정산 레코드가 2026-07-14 생성 후 미저장이라 새 필드 3종이 전부 빈값. ② **설계 실수**: 목록에서 최종 수정을 `title` 툴팁에만 넣었는데 `updatedAt`이 비면 툴팁 자체가 안 붙어 **화면 어디에도 안 보였다.** → 최종 수정을 제 컬럼으로 승격.
- **`작성일시` 빈 레코드에 Airtable `createdTime` 폴백** — 필드 신설(08-03) 이전 레코드는 값이 없어 이름만 덩그러니 보였다. createdTime이 곧 그 건의 실제 생성 시각이라 추정이 아니다. 결과 `이경환` → `7월 14일 15시 08분 · 이경환`. 공용 `getAirtableRecord`가 createdTime을 버려서 `fetchHeaderMeta`를 따로 둠(`h[...]` 참조 17곳 무손상).
- **★확정 등록을 ② 작업비·생산내역 → ③ 화주 배분으로 이동** — 사용자 지적("배분을 해야 확정인데 왜 ②에 확정이 있냐"). 데이터가 뒷받침: **확정 이력 0건**(정산 1건 전부 임시저장, 생산내역 4줄 중 LOT 생성 0줄). ②는 `[임시저장] [화주 배분 →]`만 남기고(Primary 1개), ③에 실제 작동하는 확정을 붙임(`confirmWorkSettlement`, 관리자만). 그냥 빼면 확정이 사라지므로 **옮기면서 연결**한 것.
- **배분 화면 '눌리는데 아무 일 없던 버튼' 해소** — 기존 `확정 (LOT 생성)`이 토스트만 띄웠다. 확정을 연결하면서 확인 문구에 "⚠ 위 화주별 배분은 아직 저장되지 않습니다 — 화주 구분 없이 줄당 LOT 1개"를 못박음. 상단 설명문·파일 주석의 "프로토타입·확정 미연결"도 사실에 맞게 정정.
- **★배분 표 정렬 대수술** — "행 안 내용이 뒤죽박죽" 신고. 스크린샷으로 직접 확인해 원인 규명: `WS_CSS`의 `tbody td`가 **`padding:0`**이고 패딩은 안쪽 `input`·`.roval`이 갖는 구조인데 배분표 왼쪽 절반은 **평문**이라 패딩이 아예 없었다 → 우측정렬 숫자와 좌측정렬 텍스트가 만나 `57,495원원프로즌`으로 붙어 읽혔고 헤더와도 10px 어긋났다. 패딩 10px + `nowrap`으로 해결(가운데 정렬 아님 — CLAUDE.md 표 규칙). 행 높이 42px 균일·표 넘침 0.
- **배분 입력칸 폭 축소** — 글자 폭 실측(14px tabular: 1자리 9.8px, padding+border 껍데기 14px). 비율칸 56→**42px**, 배분칸 64→**54px**, 패딩 6→4px. 잘림 판정(`scrollWidth>clientWidth`)으로 비율 `100`·배분 `9999`까지 안 잘림 확인.
- **`중량 (kg)` → `단위` 라벨 교체 + 지시 정렬** — 값이 박스 종류로 결정되고(베이트小 11·베이트大 24) 수량 1,000박스에 중량 11이면 총중량일 수 없어 **박스당 단위 중량**임을 데이터로 확인. 2단계도 같이 교체(같은 값이 화면마다 다른 이름이면 더 헷갈림). 구분·규격·단위·용도·비고는 헤더+값 가운데, 합계는 헤더만 가운데(`nth-child`로 지정 — `td.txt`/`td.n`이 여러 컬럼에 겹쳐 클래스로 못 고름).

**결정 사항**
- **`WS_CSS`는 로컬 변수 '이름'을 유지하고 '값'만 토큰에 맞춘다** — 이름까지 DESIGN 토큰명으로 바꾸려면 `var()` 참조 200곳을 함께 고쳐야 해 diff가 검토 불가능해진다. 각 변수에 대응 토큰명을 주석으로 매핑해 다음 사람이 추적할 수 있게 함.
- **`--line`/`--line-2` 2단계 테두리 위계는 포기** — DESIGN §2-2에 `--border` 1종뿐이라 thead 밑줄·그룹 구분선이 본문 선과 같은 굵기가 된다. 토큰에 없는 값을 임의로 만들지 않는다는 규칙을 따랐고, 위계가 필요하면 DESIGN에 먼저 등재하기로.
- **`--auto`/`--footer`/`--hover`/`--band` 네 회색을 `--surface-alt` 하나로 통합** — 원래도 서로 1~2단위 차이라 체감이 없었고, DESIGN의 중립 보조면은 1종뿐. 자동계산 셀 위에서 행 hover 반응이 사라지는 대가는 수용.
- **옛 `--accent`(#2E75B6)는 대비 미달이 아니었다(4.84)** — 처음엔 접근성 수정으로 보고했으나 실측으로 정정. 이 교체는 토큰 일원화이지 접근성 수정이 아니다. 반면 split의 `#8A9099`(3.22)는 실제 미달이라 §0 "발견 즉시" 예외로 함께 고침.
- **작업 정산 확정은 ADMIN, 삭제·취소는 MASTER로 갈랐다** — 사용자는 "삭제만 마스터"라고 했으나 확정 취소가 이미 생성된 입고·LOT까지 되돌려 더 위험하다는 점을 제시해 둘 다 MASTER로 묶기로 확인받음. 파괴적 액션을 한 선으로 두는 게 일관됨.
- **`/admin`을 통째로 열지 않고 경로 허용 목록으로 좁혔다** — WORKER에게 열면 마스터 데이터·원가·결재까지 노출된다. 허용 목록에 경로를 추가하는 것 = 작업자 전원에게 그 화면을 여는 것임을 `lib/admin-access.ts` 주석에 경고로 박아둠.
- **'작성자'와 '최종 수정자'를 둘 다 남긴다** — 전원이 고칠 수 있는 구조에서 하나만 남기면 책임 추적이 끊긴다. 목록은 행 높이 규칙 때문에 작성 컬럼 1개만 두고 최종 수정은 `title`로 보조 노출, 상세는 둘 다 표시하되 값이 같으면 접음.
- **저장 후 '최종 수정' 표시는 서버가 돌려준 시각을 쓴다** — 브라우저 시계로 찍으면 화면과 Airtable이 어긋난다(실측 ~9초 차이). `saveWorkSettlement`/`saveWorkSettlementHeader` 반환에 `updatedAt` 추가.
- **`투입kg당`은 저장값이라 라벨만 교체** — Airtable Update field API가 select choices를 못 고치고 기존 레코드가 전부 옛 값을 들고 있다. `lib/processing-rate-basis.ts`에 `RATE_BASIS_LABEL`을 둬 라벨도 단일 출처로 관리.
- **통합 테스트 회귀 수정은 범위 밖이지만 함께 처리** — 이번 작업을 검증할 안전망이 죽어 있어 진행이 불가능했다. 프로덕션 코드는 손대지 않고 테스트 코드만 수정.
- **커밋은 시간순이 아니라 의존 순서로 배열** — 테스트 회귀 수정을 맨 앞에 둬야 이후 커밋들이 초록 위에서 검증된다.

--- (2차 세션) ---

- **배분은 '선택 단계'** — 화주가 단독인 정산과 공동인 정산이 섞여 있다(사용자 확인). 그래서 스텝 표기를 `③ 배분 (선택)`으로 하고, 배분이 완성돼도 단독 정산에 배분을 강제하지 않기로. 다만 지금은 확정 자체를 ③에 두었다(②에 확정이 남으면 다시 "왜 둘이 같이 있냐"가 된다).
- **확정을 옮기되 배분 저장은 아직 미연결로 둔다** — 화주별 LOT 분할은 화주 마스터·Airtable 화주 필드·확정 로직 재작성(1줄→N LOT)·취소 대응이 선행돼야 하는 별도 기능이다. 그때까지 배분표는 **검산용**이고, 그 사실을 확인 문구·설명문·주석 세 곳에 명시해 "배분한 대로 쪼개진 줄" 오해를 막는다.
- **배분 표 정렬은 가운데가 아니라 패딩으로 고친다** — CLAUDE.md 표 규칙이 "가운데 정렬로 컬럼 간격을 맞추려 하지 말 것. 전 셀 좌우 패딩을 동일하게 준다"고 명시. 헤더(10px)와 같은 값으로 맞춰 세로선을 일치시켰다.
- **단, 지시받은 5개 컬럼은 가운데 정렬 예외 허용** — DESIGN §7-6("중앙 정렬은 쓰지 않는다") 위반이지만 구분·규격·단위·용도·비고는 값 길이가 짧고 일정해 자릿수가 안 깨진다. 2026-07-31 작업 정산 목록에서 이미 허용한 좁은 예외와 같은 성격.
- **비율 입력칸은 '두 자리'가 아니라 3자리(100)까지 수용** — 화주 한 곳이 전부 가져가면 100이 되는데, 우측정렬에서 잘리면 앞의 `1`이 가려져 **`00`으로 읽힌다.** 42px면 두 자리 기준으로 충분히 짧으면서 100도 안 잘린다.
- **`#split` colgroup은 실측과 어긋난 채로 둔다** — 배정 942 vs 실제 필요 1172. auto-layout이 내용에 맞춰 늘려 지금이 더 잘 맞고, 실측치로 갈면 래퍼 안 가로 스크롤(154px)이 새로 생긴다. 실측치는 주석으로 남겨 `table-fixed` 도입 시 쓰게 함.
- **홈 카드의 '준비중' 항목도 클릭 가능하게 유지** — 사이드바(`_nav.ts` + `[...slug]` catch-all)와 같은 규약이고 CLAUDE.md가 "IA 전체 구도 시각화"를 위한 의도된 동작으로 기록해 둔 것.

**미해결 이슈**
- **`산출kg당`이 옛 표기로 남아 짝이 안 맞는다** — 같은 컬럼에 `원물 중량 기준`/`산출kg당` 두 표기법이 섞였다. 대응어(제안: `가공품 중량 기준`) 확정 필요.
- **용어 위키(`ops/wiki`)도 "투입 kg당"으로 남아 있다** — 용어를 정의하는 화면이 옛말이면 오히려 헷갈린다. 범위 밖이라 뒀으나 함께 갈아야 함.
- **입고증이 200건 중 2건(1.0%)뿐** — 원인은 발행 정책이 아니라 데이터 나이. 자사창고 승인완료 입고 129건 중 입고증 1건, 발행 정책 도입(05-20) 이후 입고는 단 2건. 앞으로는 정상 생성되지만 **과거 129건은 영영 빈다** → 사이드바 'PDF 재발행'(준비중)이 필요한 실제 이유.
- **작업자 계정으로 서버를 직접 못 뚫어봤다** — 브라우저 검증은 localStorage `role`만 WORKER로 바꿔 UI 게이팅만 본 것이고, 서버는 여전히 MASTER로 인증했다. 서버 경계는 통합 테스트 4종이 담당하지만 실제 작업자 PIN 도그푸딩은 미실시.
- **`window.confirm` 잔존** — 작업 정산 삭제 확인이 네이티브 다이얼로그다. DESIGN §6-4가 "파괴적 액션은 디자인된 확인 시트만, `window.confirm` 금지"라고 명시하는데, 삭제가 MASTER 전용이 된 지금 오히려 더 걸린다.
- **입고 이력 페이지 자체에 가로 스크롤이 있다** — 증빙열을 임시로 없애고 재보니 페이지 초과 448px로 동일(표 폭만 1648→1572). 표는 래퍼 안에서 스크롤되는데 페이지가 따로 넘친다. DESIGN /admin 체크리스트 위반이지만 기존 건.
- **hover·focus 상태 미측정** — 회색 4종 통합으로 자동계산 셀 위 행 hover 반응이 사라졌을 것. 정적 측정으로는 안 잡히니 육안 확인 필요.
- **배분 화면은 프로토타입** — 저장·확정이 미연결이라 렌더링 경로 일부만 탔다.
- **이동 이력 조회가 무거워졌다** — `입고 관리` 전체 스캔 1회 추가(`입고증URL` 필드만). 이동 건수가 아니라 입고 테이블 크기에 비례해 늘어난다.
- **출고·이동 이력은 여전히 인라인 `<th>`** — 입고만 공유 `COLS`+colgroup을 쓴다. 세 화면 표 구조 통일은 별건.
- **작업 정산 `table-fixed` 미적용 유지** — DESIGN §10 미결이고 "입력 상한 자릿수를 먼저 정해야 함" 조건부. 금액 컬럼 112px는 현재 데이터 최댓값(57,495,000원) 기준이라 자릿수가 늘면 표가 넓어진다.
- ~~**미푸시**~~ → 1차 wrap-up에서 커밋 6개 푸시 완료.

--- (2차 세션) ---

- **★규격/미수가 같은 값으로 저장된다 — 확정 시 LOT번호가 틀어진다 (최우선·사용자 확인 대기)** — `buildPayload`가 `spec: r.spec, misu: r.spec`로 한 값을 양쪽에 복사한다(2단계 폼에 「규격 (미수)」 칸이 하나뿐). 게다가 실제 박스당 kg는 「단위」칸(`중량kg`)에 들어가 `규격`엔 없다. 기존 LOT 규약은 `규격=박스당 kg / 미수=마리수`(`260311-MA1-20.5-73-0002`). 지금 이대로 확정하면 `260803-MA1-24-24-0001`이 생성되지만 올바르면 `-11-24-`여야 한다. **확정 이력 0건이라 아직 오염된 LOT은 없다 — 확정 전에 반드시 고칠 것.** 제안 매핑: 「단위」칸→`규격`, 「규격(미수)」칸→`미수`만. 라벨을 「규격 (kg)」·「미수」로 갈지 사용자 확인 대기.
- **Airtable `작업 정산 생산내역.중량kg` 설명이 실제와 다르다** — description은 "실측 총중량(선택)"인데 실제로는 박스당 단위 중량으로 쓰인다. 누가 총중량으로 합산하면 재고 중량이 수십 배 틀어진다. 설명만 고치면 되는 무해한 수정.
- **`화주 배분 →`·`확정 등록 →` 실제 클릭 미검증** — 전자는 생산내역 4줄을 지우고 다시 만드는 저장을, 후자는 LOT 4개 생성을 일으켜 사용자 실데이터에 임의로 손대지 않았다. 서버 함수는 통합 테스트가 덮고 호출 방식은 옮기기 전과 동일.
- **최종 수정 컬럼에 값이 찬 모습 미확인** — 데이터가 전부 빈값이라 `—`만 봤다. 한 번 저장하면 채워진다.
- **`window.confirm` 잔존** — 확정 확인이 네이티브 다이얼로그(DESIGN §6-4 금지). ②에서 ③으로 옮기며 총량은 그대로.
- **행 클릭 포커스 링 미확인** — `tabIndex=0`을 준 `<tr>`에 포커스가 시각적으로 보이는지 안 봤다.
- **배분 표는 화주 3명 기준으로만 측정** — 화주 수가 바뀌면 컬럼 폭이 다시 달라진다.

**다음 작업 후보**
- **★규격/미수 매핑 확정 후 즉시 수정** — 확정 한 번이면 LOT번호가 굳는다. 기존 4줄 데이터 정정도 함께.
- 실제 작업자 PIN으로 공동 편집 도그푸딩(권한 경계 실사용 확인).
- `화주 배분 →`·`확정 등록 →` 실클릭 검증(테스트용 정산 건 하나 만들어서).
- 회색 4종 통합·테두리 위계 상실 육안 확인 후 필요 시 DESIGN에 토큰 추가.
- 'PDF 재발행' 기능 — 증빙 없이 남은 자사창고 입고 129건이 대상.
- `STYLE-MIGRATION.md` 이어서(잔여 53파일·실측 793곳). 색만 남은 묶음부터: 거래 이력 4종 → 원가·손익 2종 → 관리자 홈.
- 홈 화면 DESIGN 적용 — PC 홈은 `--t-num-lg`만 추가하면 가능. 모바일 홈은 7색 아이콘 팔레트 처리 방침과 모바일 타입 토큰 2종 신설이 선행.
- ~~`산출kg당` 대응어 확정 + 용어 위키 동기화~~ → 완료.
- (이월) `LoginShell.tsx` 포인터 기준 기기 판별 재작업, `package.json` 버전 bump, tear-off 휴면화 재작업.

---

### 2026-08-04

**완료한 작업**
- CLAUDE.md 519줄 → 133줄 재구성. "무엇을 했다(이력)"와 "이제 이렇게 한다(규칙)"가 섞여 규칙 섹션이 낡아가던 구조를 끊었다. 4분류 기준으로 갈랐다 — 규칙 / 현재 상태 / 미해결 위험 / 이력.
- 정확성 감사: ■보안·■데이터 정합성·■개발 원칙·■핵심 도메인 흐름·■LOT번호 형식·■Airtable 테이블 구조 6개 섹션을 규칙·이력·코드 3자로 대조. **규칙 13건이 코드와 어긋나 있었다.**
- 어긋난 13건 정정 — 출고 승인 멱등 가드 기준(판매원가→단가) / 출고 반려 시 판매원가 보존(7필드 null이 아니라 6필드) / 입고 반려 4필드(3필드로 적혀 노조비 누락) / 이동 반려 복구 경로(존재하지 않는 `lib/admin.ts`) / 입출고증 PDF는 자사창고 끝점일 때만 / 재고 사건 5종(가공 완료·작업 정산 확정 누락) / `requireMaster` 누락 / LOT번호 조건부 생략 / Airtable 테이블 11개→19개·"작업자"→"사용자" 리네임 미반영 외.
- `/wrap-up`이 이력 누적의 원인이었음을 확인하고 16곳 정리. §4가 매일 CLAUDE.md에 `■ 최근 변경` 블록을 쌓도록 지시하고 있었다 — 34개 블록을 만든 장치다. §4를 "규칙이 바뀐 경우에만 해당 줄을 고친다"로 교체하고, vault 미러링(§4.5-A)을 폐지했다.
- `docs/RISKS.md` 신설 — 지금 살아 있는 결함만 담고 해결되면 항목을 삭제한다.
- `.env.example` 신설 — 코드가 실제 참조하는 이름 기준(옛 문서에 없던 `COMPANY_*` 7종·`TELEGRAM_*`·`ANTHROPIC_API_KEY`·`N8N_APPROVAL_WEBHOOK_URL` 포함). 값 0건.
- `journal.md` → `docs/journal.md` 이동. `/wrap-up`의 git 명령 3곳이 옛 경로를 참조해 깨져 있던 것도 함께 고쳤다.
- `obsidian-vault/00_프로젝트_현황.md` 521줄 사본 → 15줄 포인터. 옵시디언에서 3개월 묵은 규칙을 읽게 되는 경로를 끊었다.
- CLAUDE.md 「최근 변경」 34블록(183줄)을 `docs/journal.md` 부록으로 이관. 원문 그대로, md5 일치 확인.
- 스타일 정리 규칙 순환 참조 해소 — CLAUDE.md는 "규칙은 STYLE-MIGRATION.md가 정본"이라 하고 STYLE-MIGRATION.md는 "CLAUDE.md의 규칙에 맞게"라고 서로를 가리켜, 범위 제한·작업 방식 규칙이 어느 쪽에도 없었다. 규칙 전문을 STYLE-MIGRATION.md로 옮겨 자립시켰다.
- **C-2 배선 버그 수정** — 작업 정산 등록 화면이 `규격 (미수)` 한 칸의 값을 규격·미수 두 필드에 복사해 확정 시 LOT번호가 `-24-24-`로 나왔다(올바른 형태 `-11-24-`). Airtable엔 규격·미수·중량kg 세 필드가 제대로 있었고 폼 배선만 어긋나 있었다. 헤더도 `규격 (미수)`→`미수`, `단위`→`규격 (kg/박스)`로 정정. 초안 3건의 규격 필드도 실제 박스당 kg로 정리(확정 이력 0건이라 오염된 LOT 없음).
- 입력칸 헤더 정렬을 중앙 → 우측으로 변경. `NumInputHeader` 한 곳 수정으로 가공 투입·출고 등록·이동 등록 3화면에 전파. 헤더 글자 우측끝과 값 우측선의 어긋남 19~24px → 0px(Playwright 실측).
- DESIGN.md v0.4.3 → v0.4.4 — §6-1에 `NumCell`/`NumHead` 강제 추가(누락이었음), §7-5에 `formatNum` 경로 명시, §7-6 정렬 방향 개정.
- `docs/업무프로세스.md` §9 질문지 12문항 — 코드에 추측으로 들어간 업무 개념을 영향 큰 순으로. 각 항목에 그 가정이 박혀 있는 파일·줄을 붙였다.
- 전역 `~/.claude/CLAUDE.md` 신설 — "코딩 전에 생각한다". 프로젝트 CLAUDE.md의 최소 수정 원칙에는 dead code·스타일 하위 규칙 3줄 추가.

**결정 사항**
- CLAUDE.md는 규칙과 제약만 담는다. 작업 이력·진행률·완성도·측정 수치는 쓰지 않는다 — 매 세션 컨텍스트에 통째로 들어가는 파일이라 이력이 쌓이면 규칙이 묻힌다.
- 라우팅에 `@import`를 쓰지 않는다. 인라인되어 컨텍스트 절감이 안 된다. "…가 필요하면 X를 읽을 것" 평문으로 쓴다.
- 규칙마다 근거를 붙이되 **되돌려질 위험이 있는 규칙에만** 붙인다(동결비·박스 단위·멱등 가드·PDF 발행 등 14곳). 자명한 것에 붙이면 줄 수만 두 배가 된다.
- 문서 소유권을 하나씩 정한다 — 표 규칙은 DESIGN.md, 스타일 정리는 STYLE-MIGRATION.md, 목표는 ROADMAP.md, 스키마는 Airtable 실물(MCP 조회). CLAUDE.md에 옮겨 적지 않는다.
- 냉장료단가는 LOT 생성 시점 스냅샷이며 소급되지 않는다. 보관처 비용 이력을 나중에 채워도 기존 LOT은 0으로 남는다 → 실재고 입력 **전에** 비용 이력을 채우는 것을 런칭 선행조건으로 ROADMAP에 명시.
- 이중계상 방지로 0을 넣는 것은 1회성 작업비(동결비·입출고비·노조비)뿐이다. 냉장료는 기간 비례라 가공품 LOT에도 계속 발생하며, 코드도 이미 그렇게 되어 있다.
- 재고 데이터는 전부 더미다(마스터는 실데이터·수정 중). 이 전제로 냉장료단가 미입력을 위험 목록에서 제외했다 — 버그가 아니라 아직 안 넣은 상태다.
- `PageHeader`는 강제 규칙으로 되살리고 `BottomTabBar`는 규칙이 아니라고 판정. 전자는 컴포넌트 주석에 "모든 하위 페이지에서 통일 사용"이 박혀 있고 하위 화면 7곳이 전부 쓴다. 후자는 루트 레이아웃에 주입되지 않고 3곳에만 붙는다 — 모바일 메인조차 안 쓴다.
- 입력칸 헤더는 값과 같은 우측 정렬. 종전 근거("경계 상자 위 라벨은 중앙이 정석")가 실측으로 깨졌다 — 숫자 열에서 눈은 상자 테두리가 아니라 자릿수를 따라간다.
- 작업 정산의 규격은 `pn()`을 거치지 않고 문자열 그대로 넘긴다. LOT번호를 만드는 표기값이지 계산용 수가 아니라, 범위 표기(`21.5/22`)나 문자 규격(`L`)이 들어올 여지를 막지 않는다.
- `ProdRow` 리네임은 보류. 순서는 ① 폼→서버 매핑을 순수 함수로 추출 + 테스트 ② 리네임 ③ (별건) `buildLotNumber` 통합·형식 재설계. 무동작 리팩터와 동작 변경을 한 커밋에 섞지 않는다.
- DESIGN.md 저장소 이전은 승인됐으나 보류. 손이 자주 가는 동안 옮기면 옵시디언에서 고치던 걸 매번 저장소를 열게 되고 그러다 안 고치게 된다. 개정이 뜸해지면 옮긴다.
- 전역 규칙에서 원문의 "사소한 작업에는 판단껏"을 뺐다. 예외 조항이 있으면 스스로 사소하다고 판정하게 된다 — 이날 DESIGN.md 변경 이력 갱신에서 실제로 그렇게 범위를 넘은 사례가 나왔다.

**미해결 이슈**
- `ProdRow` 필드명이 실제 담는 값과 반대다(`spec`=미수, `weight`=규격). 주석으로 방어 중이며 리네임은 스왑이라 임시 이름을 거쳐야 안전하다.
- 페이지 컴포넌트의 폼→서버 매핑에 테스트가 없다. 골든 테스트는 `spec`·`misu`를 서버 액션에 직접 넘기므로 매핑 오류를 구조적으로 볼 수 없다 — C-2가 살아남은 이유다.
- LOT번호 형식이 규격 결측을 표현하지 못한다. 규격이 비면 하이픈 3연속(`260804-MC1---26-0001`). 미수는 자리를 생략하는데 규격은 `-`를 남기는 비대칭이라 근거가 없다. `buildLotNumber` 3곳 통합과 함께 재설계한다.
- DESIGN.md·전역 `~/.claude/CLAUDE.md`가 git 밖이라 diff·롤백이 안 된다. 전역 파일은 짧고 변동이 적어 지금은 조치하지 않는다.
- 업무프로세스 질문지 12문항 답변 대기 — 1차(5·7·9·10·11·12) / 2차(1·6·8, 현장·정산서 확인) / 3차(2·4, 업무·회계 판단).
- SessionStart hook(`npm run test:all` 비블로킹)은 제안서까지만. 작업 중 노이즈를 피해 뒤로 미뤘다.

**다음 작업 후보**
- 폼→서버 매핑을 `_shared.ts`의 순수 함수로 추출 + 단위 테스트. 그 자체로 값이 있고 리네임의 안전망이 된다.
- `ProdRow` 필드 리네임(위 테스트가 가드).
- 질문지 1차 답변 반영 + 해당 추측 코드 정정 여부 판단.
- `buildLotNumber` 3곳 통합 + LOT번호 형식 규칙 재설계.
- SessionStart hook 적용.
- 품목마스터에 원물 '갈치' 등록.

---

### 2026-08-05

**완료한 작업**
- 재고 조회·소진 LOT 부제 문구 정정 — "(행을 클릭하면 …)"이 2026-07-30에 없앤 조작을 계속 안내하고 있었다. 재고 조회는 `조회 전용 · [건수] · 평가액 합계`로 재구성했고, 건수는 필터가 걸렸을 때만 띄운다.
- 재고 집계 부제 `(승인 완료·소진 LOT 기준)` → `(반려·취소·승인 대기 제외)`. '소진'이 헤더에선 상태값, 바로 아래 체크박스에선 재고 0을 뜻해 정반대로 읽히던 충돌을 없앴다.
- **Airtable 헬퍼의 운영 로그 3곳 제거** — `getBaseCredentials`가 매 호출마다 토큰 접두 10자·정확한 길이·baseId를 찍고 있었고, CREATE/PATCH는 `fields`를 통째로 출력했다. 입고·출고·지출·승인마다 수매가·단가·금액·출고시점 원가가 로그로 나가고 있었다.
- 남은 `console.log`/`warn` 12곳을 logger 래퍼로 전환(잔여 0건). 영수증 업로드의 Blob URL 출력도 제거 — `access:"public"`이라 인증 없이 열리는 링크였다.
- `[SCHEMA-MISMATCH]`를 `logWarn` → `logError`로 정정. logWarn이 dev 전용이라 운영에서 로그가 끊겼고, 시나리오 18 통합 테스트가 즉시 잡아냈다.
- **상태 리터럴 실태 전수 조사** — 33개 파일 211곳(비교 72·쓰기 47·표시 92), 상수 사용 3개 파일. 상수값과 어긋난 리터럴은 0건이었으나, 실물에만 있고 `lib/status.ts`에 없는 값이 7종이었다.
- `lib/status.ts` 상수 보강 5종 — `FINAL_PENDING`(지출결의 전용) · `PROCESSING_IN` · `PROCESSING_IN_STOCK` · `PROCESSING_STATUS` · `SETTLEMENT_STATUS`. 추가만 하고 기존 리터럴은 치환하지 않았다.
- **규칙 준수율 감사** — CLAUDE.md 133줄에서 기계 검증 가능한 규칙 15개를 전수 검사. URL 쿼리 동기화 준수율 0%(13화면 전부) · POST 멱등 3/9 · Airtable 직접 fetch 7파일 · production console 12곳이 드러났다.
- 준수율 낮은 규칙 4건을 스타일 하드코딩 규칙과 같은 형태(신규만 강제·연 파일만 정리)로 교체. 상태 리터럴 규칙은 LOT 섹션 → 개발 원칙으로 옮겼다.
- **`docs/airtable-logic.md` 신설** — formula 7개와 Automation 5개를 MCP 실물 조회로 원문 그대로 기록. 필드ID 대응표와 코드 참조 위치(파일:줄)를 붙였다. 대조 결과 어긋난 것 5건도 함께.
- **출고 이력 수량 합계 버그 수정** — `num(실출고수량) || num(출고요청수량)`의 `||`가 formula가 의도적으로 낸 0을 falsy로 보고 신청 수량으로 되돌렸다. 실측 1008 → 767박스(반려 3건 241박스 과다).
- **반려→재승인 손익 버그 수정** — Airtable `판매금액`을 `{판매가} × {실출고수량}`으로 바꾸고, `admin.ts`는 formula 대신 `판매가 × 출고요청수량`으로 직접 계산하게 했다. 두 변경은 짝이라 한 커밋.
- `fetch-mock`의 formula 시뮬레이션을 실물 수식과 일치시켰다 — 종전엔 판매금액을 승인상태와 무관하게 계산하고 실출고수량은 아예 없어서, 모의환경이 실물보다 관대해 이 버그를 구조적으로 못 잡았다.
- Airtable 필드 설명 12곳 정정 — 보관처 `구분`(없어진 '기타') · LOT `상태사유`(10종 중 8종만 나열) · 입고관리 `LOT별 재고`(잘린 XML 꼬리) · 가공 거래 6곳(깨진 문자) · 가공비 단가 `기준`(다른 필드 옵션명과 혼동) · 출고관리 `판매금액` · 지출결의 `카테고리`.
- `docs/RISKS.md` 항목 5건 추가 — 0번 `/api/inbound-receive` 멱등 가드 부재(런칭 전 필수) · 11~14번(상태 리터럴 · PENDING_STATUSES 4중 복제 · `includes('대기')` 부분 매칭 · Airtable 직접 fetch) · 15번(지출결의 Automation 조건 중복).
- v0.14.1(문구) → v0.14.2(수량 합계 버그) 배포. 프로덕션에서 버전·3화면 문구·출고 이력 합계 40,820,000원 확인.

**결정 사항**
- 목록 화면 부제는 왼쪽 정렬을 유지한다. 우측 정렬은 데이터 길이가 바뀔 때마다 문장 시작점이 미끄러지고, 7화면이 이미 왼쪽이다. 한 번 오른쪽으로 옮겼다가 되돌렸다.
- 평가액 합계 옆의 건수는 필터가 걸렸을 때만 띄운다. 평가액이 `visible` 기준이라 건수가 "이건 일부다"의 유일한 신호다 — 없으면 7.8억이 전사 재고자산으로 읽힌다.
- 준수율이 낮은 규칙은 "항상 이렇게 한다"를 유지하지 않고 **신규만 강제 + 연 파일만 정리**로 바꾼다. 기존 코드가 안 지키는 규칙은 새 코드를 쓰는 사람이 주변을 보고 따라 하면 어기게 된다.
- 상태 리터럴 치환보다 **상수 테이블 보강이 먼저**다. 실물에 있는데 상수가 없으면 규칙을 지키려 해도 지킬 수단이 없다.
- POST 멱등 규칙을 "모든 POST" → "재고·금액을 움직이는 POST"로 좁히고, 도메인 가드가 있는 경로는 예외로 두되 어떤 가드인지 코드 주석에 남기게 했다.
- `[SCHEMA-MISMATCH]`는 심각도가 아니라 **출력 환경**을 기준으로 래퍼를 고른다. 전 환경에서 나오는 것은 `logError`뿐이고, 운영에서 안 보이면 모니터링 로그의 존재 이유가 사라진다.
- 반려 규칙은 한 곳에만 산다. `판매금액`이 반려 조건을 복사해 갖는 대신 이미 그 조건을 가진 `실출고수량`을 참조하게 했다.
- 승인 트랜잭션 안에서 **곧 바꿀 승인상태에 의존하는 formula를 읽지 않는다.** 재고 처리가 상태 PATCH보다 먼저 실행되므로 읽는 시점의 상태는 아직 옛 값이다. 원천값으로 직접 계산한다.
- 모의 테스트 환경의 formula 시뮬레이션은 실물 수식과 글자 그대로 같아야 한다. 관대한 모의환경은 버그를 숨긴다.
- Airtable 필드 설명도 스키마의 일부다. 스키마를 문서로 남기지 않고 MCP 실물을 읽기로 한 이상, 설명이 낡으면 같은 헛조사가 반복된다.
- 작업 전 테스트 확인은 `npm run test:all`로 한다. `npm test`는 유닛만 돌아 통합 회귀를 놓친다 — 실제로 그래서 이번에 두 커밋 뒤에 발견했다.

**미해결 이슈**
- **`/api/inbound-receive`에 멱등 가드가 없다(런칭 전 필수)** — 중복 요청 시 재고가 두 번 더해진다. 모바일 작업자 경로라 더블탭·재시도가 실제로 일어난다.
- 반려된 출고를 **실제로 재승인해 손익을 실측하지 못했다.** 결재 수신함 완료 탭이 0건이고 출고 이력은 읽기전용이라 UI 경로가 없다. 전제(반려 건이 지금 실출고수량 0·판매금액 0)와 통합 테스트 재현까지만 확보했다.
- 지출결의 카테고리의 이름 빈 선택지(`selVZeMSn2jiuxYKy`)가 남아 있다 — API/MCP로는 singleSelect 선택지를 편집할 수 없어 Airtable UI에서 직접 지워야 한다.
- 상태 리터럴 211곳 치환 미착수. 상수 보강은 끝났으므로 점진 치환만 남았다.
- `PENDING_STATUSES` 배열 4중 복제와 `status.includes('대기')` 부분 매칭 4화면 — 15번과 같은 뿌리다.
- 일일 정산 메일의 매출 합계가 실제로 바뀌었는지 확인 못 했다(09:00 KST cron).
- 테스트 업로드한 Blob(`receipts/1785892636734-test-receipt-…png`)이 public URL로 남아 있다.

**다음 작업 후보**
- `/api/inbound-receive` 멱등 가드 구현.
- 지출결의 Automation 3종 재설계 — `isEmpty({카테고리})` 조건 중복 제거.
- 상태 리터럴 점진 치환 — 정합성에 직접 걸리는 서버 액션 비교 26곳부터.
- 반려→재승인 손익 실측(임시 라우트 또는 UI 경로 신설).
- URL 쿼리 동기화 — 새로 만드는 목록 화면부터 적용.
- 품목마스터에 원물 '갈치' 등록.

---

### 2026-08-06

**완료한 작업**
- **DESIGN.md 저장소 이전(`aa9c4cb`)** — 옵시디언 vault 루트(`C:\Users\user\Documents\Obsidian\SEAERP`)에만 있어 버전 관리·diff·롤백이 안 되던 32,608바이트 파일을 `obsidian-vault/DESIGN.md`로 옮겼다. 백업 3곳(스크래치패드·`~/backup-design-md/`·`C:\Users\user\Documents\`)에 복사해 sha256 일치를 확인한 뒤, 복사본 해시가 원본과 같을 때만 원본을 지우는 순서로 이동했다. CLAUDE.md 문서 라우팅을 저장소 상대경로로 바꾸고 RISKS 10번(이전 보류)을 삭제, 5번의 위치 줄도 새 경로로 고쳤다.
- **`local-work-mac` 브랜치 조사** — "어제 폐기한 미커밋 6개가 커밋된 것 아닌가"를 확인. reflog가 결정적이었다: 로컬의 원격 추적 참조가 **2026-06-12부터 두 달간 낡아 있었고** 오늘 pull이 밀린 것을 따라잡은 것뿐이다. 브랜치의 실제 최신 커밋은 07-31이고 08-05 날짜 커밋은 0건 — **폐기는 폐기된 게 맞다.** 48커밋 중 47개는 이미 main에 있었다.
- **07-31 맥북 병렬 세션 기록 병합(`2ecbb73`)** — 미병합 커밋 `1c19417`(docs 4파일만)이 서술하는 맥북 세션 일지를 `docs/journal.md`·vault 07-31로 옮겼다. 완료 항목을 그대로 옮기지 않고 반영 여부를 명시 — 그 커밋은 문서뿐이었고 서술된 코드는 어느 브랜치에도 커밋된 적이 없어서, 그대로 옮기면 저장소가 "07-31에 했다"고 거짓 기록을 갖게 된다.
- **LOT 생애주기 출고 배지 회색→빨강(`7954748`)** — `EVENT_COLOR.outbound` 1줄. 07-31 맥북 세션에서 결정됐으나 main에 없던 것으로, 나머지 3색은 이미 일지와 일치했다.
- **죽은 윈도우 클론 전수 비교** — `C:\Users\user\.seaerp`(2026-05-18에 멈춘 클론)를 옵시디언이 열고 있었어서 5/18 이후 편집분이 갇혔는지 확인. **갇힌 것 0건.** vault 문서 중 죽은 클론에만 있는 건 gitignore 대상인 플러그인 `data.json` 2개뿐이고, "내용이 다른" 90건 중 88건은 CRLF 차이였다. 미커밋 149건도 CRLF 148 + `journal.md` 삭제 1(내용은 `docs/journal.md`로 이관 완료). 미푸시 커밋·stash 0.
- **결재 수신함이 감사 조회처가 못 된다는 것 발견** — `getMyRequests`가 반려·승인 완료·취소를 **14일 창**으로 자르고(Airtable 필터 + 코드 이중), 기준이 반려일이 아니라 **업무일**(출고일·입고일·이동일)이다. 오래된 건을 오늘 반려하면 완료 탭에 처음부터 뜨지 않는다. 07-31 맥북 세션이 "반려를 타임라인에서 빼도 된다"고 판단한 근거가 여기서 깨졌다.
- **보관처 비용 이력 실측** — 마스터 84곳 / 이력 83행인데 **냉장료가 채워진 건 9행뿐**(입출고비 8 · 노조비 1 · 동결비 3). 자사창고 3곳 중 한라양식수협만 채워져 있고, 가공공장 4곳은 이력 0행. 마스터의 `제주어류양식수협`과 이력의 `제주어류양식수협 / 제주도해수어류양식수협`이 달라 **이름 불일치로 조회가 실패하는 건**도 확인(조회가 보관처명 문자열 일치라서).
- **RISKS.md 3건 갱신** — 16번(전역 CLAUDE.md가 git 밖, `eaa4f16`) 신설 / 0번을 "런칭 전"→**"실데이터 입력 전"**으로 격상 / **0-1번 신설**(냉장료 빈 보관처 → 보관료 영구 0, 스냅샷이라 소급 안 됨) / **17번 신설**(타임라인 반려 표시 오독).
- **ROADMAP.md에 「실데이터 입력 전 체크리스트」 신설** — RISKS 항목 중 "들어간 데이터 자체가 틀어지는 것"만 3등급(A 시작 전 필수 5건 / B 입력 중 확인 4건 / C 알고 볼 것 2건)으로 추렸다. 제외한 항목과 그 이유도 함께 적었다.
- **`.gitignore`에 루트 `.obsidian/`(`cd7d788`)** — 저장소 루트를 실수로 vault로 열었을 때 생기는 것만 막는다. 루트 한정(`/`)이라 `obsidian-vault/.obsidian/`의 추적 중인 설정 12개는 건드리지 않는다.
- **`.env.local` 복원** — `RESEND_API_KEY`·`ALERT_EMAIL_TO` 2줄이 죽은 클론에만 있고 저장소에는 없었다(`lib/resend.ts`·`daily-report` 라우트가 필수로 요구). 옮겨 넣고 git에 안 잡히는 것을 확인.
- **`STYLE-MIGRATION.md`에 `lot-timeline` 후속 메모** — 이 파일을 열 때 `EVENT_COLOR` 4개를 DESIGN 토큰(특히 `--danger`)으로 함께 옮길 것.
- `pre-launch-audit-2026-05-11.html`을 작업트리·옛 클론·전체 git 이력에서 찾았으나 **어디에도 없음**을 확인(무시 대상 없음).

**결정 사항**
- **전역 `~/.claude/CLAUDE.md`는 저장소에 두지 않는다(A안 · 수동 동기화)** — 저장소에 두면 전역 설정이 seaerp에 종속되고, 전역 규칙 한 줄 고칠 때마다 프로젝트 커밋·diff에 섞인다. 9줄이고 변경이 드무니 수동으로 충분. 대신 RISKS 16번으로 남겨 기기 간 누락을 추적한다.
- **cherry-pick 대신 손으로 병합** — `1c19417`의 merge-base가 63커밋 전이라 CLAUDE.md·`00_프로젝트_현황.md`에서 충돌이 나고, 잘못 풀면 그날 만든 규칙이 되돌아간다.
- **맥북은 `local-work-mac`을 버리고 main으로 합류** — 갈라진 유일한 이유가 docs 커밋 하나였고, 두 갈래를 유지하면 이번처럼 한쪽 기록만 남는 일이 반복된다. 기록은 `2ecbb73`으로 보존됐으므로 브랜치를 지워도 잃는 게 없다.
- **`.obsidian/`은 루트 한정(`/.obsidian/`)으로 무시** — 전 경로 패턴을 쓰면 의도적으로 추적 중인 vault 설정 12개가 "무시되지만 추적 중"이라는 혼란한 상태가 되고, 앞으로 플러그인을 추가해도 커밋 후보에 안 올라와 동기화가 조용히 끊긴다.
- **거래 테이블 0건은 의도된 것** — 실작업분을 입력하며 테스트베드로 쓰기 위해 사용자가 비웠다. RISKS 항목으로 만들지 않는다.
- **타임라인 반려 표시는 C안 방향** — 빼는 게 아니라 남기되 반려사유·결정자를 노출하고 수량을 회색으로. 결재 수신함이 대안이 못 되는 이상 지금 상태(맥락 없는 회색 배지 + 빨강 −N박스)가 가장 나쁘다. 구현은 미착수.
- **배지 색은 Tailwind 기본 팔레트를 그대로 썼다** — DESIGN.md가 기본 팔레트를 금지하지만 `EVENT_COLOR` 4개가 전부 기본 팔레트이고 이 파일은 스타일 마이그레이션 ⚠ 미착수 목록(51곳)이라, 하나만 토큰화하면 4개 중 1개만 어긋난다. 파일 전체를 열 때 함께 옮기기로 하고 `STYLE-MIGRATION.md`에 적었다.

**미해결 이슈**
- **타임라인 반려 표시 C안 미구현** — 반려사유·결정자·결정일시는 Airtable 스키마에 있는데 타임라인이 읽지 않는다.
- **오늘 바꾼 배지 빨강을 육안 검증하지 못했다** — 거래 테이블이 비어 있어 타임라인 화면 자체를 띄울 수 없다. tsc·테스트만 통과.
- **냉장료 비용 이력 74행이 비어 있다** — LOT 생성 시 스냅샷이라 나중에 채워도 소급되지 않는다. 실제로 쓸 보관처만이라도 입력 시작 전에 채워야 한다.
- **옵시디언 vault 전환 결과 미확인** — `\\wsl.localhost\Ubuntu\home\user\seaerp\obsidian-vault`가 실제로 열리는지 사용자가 확인 중. 안 되면 대안(저장소를 Windows 쪽으로 / 심링크) 재검토.
- **맥북 main 합류·`local-work-mac` 삭제 미실행** — 순서는 정리했고 실행은 맥북에서.
- **`C:\Users\user\.seaerp` 삭제 미실행** — 조사는 끝났고(잃을 것 없음, `.env.local` 2줄은 이미 옮김) 실행만 남았다.
- **`1c19417`이 서술한 반려 필터링 코드의 유실 여부 미확정** — 맥북 작업 트리를 볼 수 없다. 다만 재구현 비용은 낮다(2곳 5~10줄, 설계 판단은 일지에 보존).
- (이월) 07-31 맥북 세션의 미해결 — 입고 반려로 죽은 LOT 조회 시 빈 타임라인 안내문구 미조정.

**다음 작업 후보**
- **「실데이터 입력 전 체크리스트」 A등급 5건 처리** — 냉장료 이력 채우기 → inbound-receive 멱등 가드 → 통 구분 → 동결비 3열 → 갈치 품목 등록. 입력 시작 전 관문.
- 타임라인 반려 표시 C안 구현(반려사유·결정자 노출 + 수량 회색).
- `lot-timeline/page.tsx` 스타일 마이그레이션(51곳) + `EVENT_COLOR` 4개 토큰화 — ⚠ 30곳 초과라 진행 여부 확인 필요.
- 맥북 main 합류 + `local-work-mac` 삭제 + `.seaerp` 폴더 삭제.
- (이월) 원프로즌 '통' 구분 미결 — 통 수량이 통 개수냐 박스 환산이냐.

---

## 누적 통계 (2026-05-18 기준)

- 단위 테스트: 5 files / **110 pass** (변동 없음)
- 통합 테스트: 22 files / **85 pass** (+8 신규 — bulk-approve-policy 4 + transfer-revert-partial-fail 4)
- 신규 Airtable 필드: 출고관리.실출고수량 formula
- Airtable rename: 출고관리.출고수량 → 출고요청수량
- Airtable 폐기: 출고관리.출고시점 판매금액 (수동 삭제 권장)
- 신규 backfill 스크립트: `scripts/backfill-inbound-product-storage.mjs` (LOT 180 + 입고관리 179건 운영 적용 완료)
- 신규 함수: `outbound.getStorageIdFromLot`, `admin.updateApprovalStatusBulk`, `transfer.rollbackToCharged`(헬퍼)
- 컴포넌트 제거: `components/BulkSubmitSheet.tsx`
- 신규 모듈: `lib/pending-cart-lots.ts`

---

## 누적 통계 (2026-05-15 기준)

- 단위 테스트: 5 files / **110 pass** (+5 cost-calc 시그니처 변경 시 시나리오 보강)
- 통합 테스트: 20 files / **77 pass** (+6 cost-carryover 신규 — 수매가 보존/동결비 특례/D2 chained/D3/sourceInboxQty/이동후 출고 총액 검증)
- 신규 Airtable 필드: LOT별 재고 상태 관리 7건 (상태/상태사유/승인상태/결정자/결정일시/반려사유/반려메모)
- Airtable formula 갱신: LOT.판매원가 (박스당 비용에 × 입고수량 추가)
- Mock 인프라: fetch-mock에 양방향 link sync + lookup 시뮬레이션 추가
- Reverse link rename: 15개 (작업자/보관처/매입처/품목마스터)

## 누적 통계 (2026-05-14 기준)

- 단위 테스트: 5 files / **105 pass**
- 통합 테스트: 20 files / **75 pass** (+3 transfer-revert / +2 transfer-copy-fields / +2 cost-carryover 5/13 누락분 포함)
- 신규 함수: `transfer.revertTransferOnReject` (안전 가드 3종 + soft delete 자동 복구)
- 신규 Airtable formula: 출고관리.판매금액 (`판매가 × 출고수량`)
- 필드명 변경: LOT.입고일자 → 최초입고일
- 신규 Airtable formula 갱신: LOT.판매원가, LOT.누적냉장료 (이동입고일 ?? 최초입고일 fallback + 이월 4개 합산)

## 누적 통계 (2026-05-06 기준)

- 70 커밋, 활동 8일
- 단위 테스트: 5 files / **103 pass**
- 통합 테스트: 12 files / **45 pass** (21개 시나리오)
- 신규 환경변수: ADMIN_SECRET, CRON_SECRET, RESEND_API_KEY, ALERT_EMAIL_TO, ALERT_THRESHOLD, NEXT_PUBLIC_BASE_URL
- 신규 Airtable 필드: pin_hash, pin_fail_count, pin_locked_until (작업자 테이블)
- 신규 테이블: 재고 이동

---

## 부록: CLAUDE.md 「최근 변경」 이관분 (2026-08-04 이관)

2026-05-13 ~ 2026-08-03 사이 CLAUDE.md 상단에 쌓여 있던 `■ 최근 변경` 블록 34개를
2026-08-04 CLAUDE.md 재구성 때 이곳으로 옮겼다. **원문 그대로이며 요약·편집하지 않았다.**
위 날짜별 일지와 같은 날을 다루는 항목이 있어 내용이 겹칠 수 있다.

■ 최근 변경 (2026-08-03)
- **★통합 테스트 3일간 전면 붕괴 발견·복구** — `5bf52f9`(07-31)의 "작업자"→"사용자" 테이블 리네임이 fixture에 반영 안 돼 인증이 필요한 **모든** 시나리오가 그날부터 실패(28 files / 92 tests). HEAD 재현으로 이번 세션과 무관함을 확인 후 수정. `fetch-mock` DELETE 미지원도 함께 드러나(초안 재저장 경로가 한 번도 테스트된 적 없음) 지원 추가. 단위 217 / 통합 117 그린.
- **작업 정산 전원 공동 편집 + 작성자·최종수정자 기록** — 작성·수정=전원(WORKER 포함) / 확정=ADMIN / 삭제·취소=MASTER(`requireMaster` 신설). `/admin` WORKER 예외 경로를 `lib/admin-access.ts` 단일 출처로(게이트가 두 겹). Airtable 필드 3종 신설 + `작업자`를 '최초 작성자'로 역할 재정의, 표기 `8월 3일 10시 06분 · QA테스트`. 2차 세션에서 최종 수정을 **목록 컬럼으로 승격**(툴팁에만 있어 안 보였다) + `작성일시` 빈 레코드는 Airtable `createdTime` 폴백.
- **작업 정산 스타일 토큰 마이그레이션 4파일·118곳 + Playwright 실측 정착** — `WS_CSS` 플레인 CSS는 정적 검색에 안 잡혀 57파일 목록에 아예 없던 최대 부채였다. 거래 이력 3화면 입출고증 인쇄 열 + 가공비 단가 기준 라벨(`원물/가공품 중량 기준`)·용어 위키 동기화. 커밋 5개 분리 후 **커밋별 격리 검증(전 커밋 그린)**.
- **도그푸딩 피드백 반영(2차)** — 홈 바로가기 카드 항목별 링크 분리(카드 전체가 한 링크라 어디를 눌러도 첫 화면으로 갔다) / 작업 정산 목록 행 클릭 진입 / **확정 등록을 ②→③ 화주 배분으로 이동**(확정 이력 0건 확인 후, 배분 화면 확정을 실동작 연결) / 배분 표 정렬 대수술(`tbody td{padding:0}`이라 평문 셀 값이 붙어 읽혔다) · 입력칸 폭 실측 축소 · `중량(kg)`→`단위`.
- **⚠ 미해결 최우선** — 규격/미수가 같은 값으로 저장돼(`misu: r.spec` 복사) **확정 시 LOT번호가 틀어진다**(`-24-24-` vs 올바른 `-11-24-`). 확정 이력 0건이라 오염된 LOT은 아직 없다. 매핑 확정 후 즉시 수정 필요.

■ 최근 변경 (2026-07-31)
- **작업 정산 UX 개선 + 지출 기능 숨김 + 스타일 하드코딩 부채 관리 체계 신설** — 사전기입 인라인 편집, 지출 진입 경로 전체 숨김(서버 로직·데이터는 유지), `STYLE-MIGRATION.md`(57개 파일·816곳) + Spoqa 폰트 하드코딩 정리. `/wrap-up`이 코드 변경까지 함께 배포하도록 개편(어제분 미커밋 코드 포함 배포).
- **작업자 마스터 인사 정보 확장 + Airtable "작업자"→"사용자" 리네임** — 소속·직급·연락처·입사일 컬럼 추가, 소속별 그리드 자동 분리, QA테스트 도그푸딩 계정 신설(PIN 1234·MASTER).
- **사료 규격 `"p/n"` 표기 fix + 정렬 헤더 중앙정렬 쏠림 버그 수정(`SortIconSpacer` 신설) + Playwright MCP 연결** — 헤더 정렬 fix는 브라우저 미검증으로 커밋 보류, 다음 세션에서 Playwright로 확인 후 마무리.
- **★Playwright 실측 검증 도입 — UI가 "전량 손 도그푸딩"이던 사각지대를 처음으로 자동화** — QA테스트 계정 로그인 → `/admin` 22화면을 돌며 타입 스케일 밖 폰트·컬럼 넘침·헤더 쏠림·가로 스크롤을 **수치로** 측정(스크립트는 세션 임시본, 저장소 미포함). 보류했던 헤더 정렬 fix는 정상 확인(이미 `b81efe8`에 커밋돼 있었고 메모가 stale이었음).
- **작업자 마스터 폭 실측 교정** — 어제 산술 추정으로 넣은 컬럼을 실측으로 정정(소속 144→200px — `제주수산물수출포장가공센터`가 직급 칸을 침범해 "…가공센터 부회장"으로 붙어 읽히던 버그, 작업자명 116→140, 입사일 108→124). 늘어난 표 1212px를 담도록 `CONTENT_MAX` 1140→1236·컨테이너 1200→1300으로 올려 가로 스크롤 제거. `잠금` 열 `정상`만 11px이던 것 14px로 통일.
- **스타일 토큰 마이그레이션 4화면 착수(92곳·잔여 0)** — 재고 집계·용어 위키·부자재·경비·작업 정산. 전부 감사 통과(스케일 밖 폰트 0·tsc 0). 진행 방식은 **화면 단위 챕터 + 감사 통과 시 다음 화면**(일괄 스윕 아님). `STYLE-MIGRATION.md` 집계가 실제보다 적다는 것도 발견(정규식이 `border-t-[#…]`·`ring-[#…]` 누락, Tailwind 기본 `text-lg`는 대상 밖). 작업 정산 행 링크의 대비 미달색(`#3182F6` 3.71)도 `--link`로 교체.

■ 최근 변경 (2026-07-30)
- **LOT 생애주기 진입 통일 + 디자인 시스템 2차 확산** — 거래 이력·재고 조회·소진 LOT의 진입 방식(행 클릭 vs LOT번호 클릭)을 **LOT번호 링크**로 통일(`app/admin/_lot-link.tsx` 신설, 링크색 토큰 `--link` 신설). **Pretendard 폰트 self-host 전환**(Spoqa 원격 로드 제거, DESIGN.md v0.4.3) + 표 헤더 전용 토큰 `--t-table-head`(14px/500) /admin 23화면 확산 + 헤더발 컬럼폭 재계산.
- **미완**: 컬럼 폭 전량 산술 환산(육안 확인 필요), 옛 링크색(#3182F6) 2곳 잔존(LOT 생애주기·건강도), 거래 이력 표 행 높이 재고 조회와 불일치, 전량 미커밋.

■ 최근 변경 (2026-07-29)
- **재고 조회 DESIGN.md 적용 + 소진 LOT 화면 분리 (v0.14.0)** — 토큰·공통 컴포넌트 확산 2번째 화면. `<StatusBadge>`·`lib/status.ts`(상태 문자열 상수) 신설로 §6-1 미구현 항목 해소. 정렬 헤더 `aria-sort`(키보드 조작 불가였음), 컬럼 좌/우 정렬 묶음 재정렬(전환 3→1회), 색은 재고수량(accent) + 보관일수 임계(warn/danger)만. **소진 LOT은 `/admin/master/lots-depleted`로 분리** — 서버 `filterByFormula` scope(active/depleted/all)로 걸러 재고 조회는 활성만 받는다. 재고장 인쇄에 소진이 섞이는 경로를 구조로 차단.
- **문서 현행화** — `docs/ROADMAP.md`가 2026-05-12자였던 것을 실측 대조로 갱신(Phase 상태·IA 6→7 카테고리·완료 기준 미충족 명시) + **「현장 발생 트랙」 신설**(계획 밖에서 자란 5갈래). CLAUDE.md 테스트 수치·중장기 목표 현황 정정.
- **⚠️ 2026-07-25 작업 유실 확인** — 탭바 tear-off 휴면화가 워킹트리·stash·전 브랜치 어디에도 없다(`ENABLE_TEAROFF` 코드 이력 0건). **tear-off 오발동은 현재 활성 — 재작업 필요.** 같은 날 컬럼 재정렬분은 오늘 복원됨.
- **미완**: 컬럼 폭 육안 확인(13→14px 산술 환산), 보관일수 90/180일 임계 업무 규칙 미확정, 재고 집계·거래 이력 토큰 미확산, `origin/main` 미푸시.

■ 최근 변경 (2026-07-28)
- **디자인 토큰 + 공통 컴포넌트 도입** — `tailwind.config.ts`에 색·타이포·radius·컨트롤높이 토큰, `app/globals.css`에 **표면별 값**(기본=모바일 / `[data-surface='admin']`=PC, radius 6/12/16·높이 32). `app/components/ui/` 5종 신설(Button·EmptyState·LoadingState·SortIcon·Modal). 마스터 5화면(storage/products/ships/workers/suppliers)+모달에 확산. **Modal은 일부러 포털 안 함**(포털하면 admin 서브트리를 벗어나 모바일 토큰을 받음).
- **목록 표 넘침 처리 표준화 + 숫자 표기 통일** — `_table-cols.tsx`(TableCol·tableMinWidth·TableColGroup·스페이서 컬럼)·`transactions/_ledger-cols.tsx`·`_num-cell.tsx`+`formatNum`. **말줄임 폐지→실측폭 전량 표시+가로 스크롤**(비고 240px만 예외). 버그 fix: colgroup 합계>minWidth 전 컬럼 축소, `'승인완료'`(공백 없음) 비교가 실제값 `'승인 완료'`와 영영 불일치하던 2곳.
- **보관처 마스터 3덩어리 재구성**(자사창고/외부창고/가공공장) — '보관처 비용 이력'·'가공비 단가' 별도 화면 흡수(`processing-rates/` 삭제, nav 2항목 제거), `listCurrentStorageCosts`(오늘 유효행만), 좌측 필터 레일. Airtable 이름 불일치 8→2·고아 7→0(동원통영수산·해원냉장 원가 복구), 구분 '기타' 폐지+필수화.
- **미완**: 오늘 작업분 15파일 미커밋 + 3커밋 미푸시, `package.json` 0.12.1→0.13.0 bump 대기. 나머지 표 화면 확산·숫자 정렬 규칙 정합(DESIGN 우측↔07-01 좌측 상자) 미정.

■ 최근 변경 (2026-07-27)
- **어황일보 번역 봇 배포·라이브 가동 (v0.12.0→0.12.1)** — 어획 조업보고서 사진→일본어 안내문(바이어용). `app/api/telegram/route.ts` 웹훅 + `lib/eohwang/*`(translate=claude-opus-4-8 비전·adaptive thinking / dictionary=Airtable 사전 어댑터 / telegram=헬퍼) + `@anthropic-ai/sdk`. Vercel env 4개 등록→push 자동배포→setWebhook(secret_token) 등록·검증, 실사진 2건(7/26·7/27) 라이브 번역 성공. **프로덕션 도메인=`seafood-erp.vercel.app`(seaerp 아님).**
- **번역 출력 개선** — 각 행 순번(1.2.3…)+바이어용 일본어 안내(`行番号でお知らせください`), 하단 손글씨 `c/s`(위판장 24kg박스 실입하)를 60kg 표 합계와의 '불일치 오류'로 경고하던 것→단위 명시 참고치로만(허위 경보 제거). `sendMessage` 4096자 분할. 사전 등록 기능 검증(봇에 `등록 매가리=小アジ`).
- **UI 디자인 규칙 신설(`## 규칙`)** — UI 작업 시 DESIGN.md(옵시디언 vault, 182줄 v0.1) 먼저 읽고 토큰 따를 것·색/폰트/간격 임의지정 금지. 재고 조회 페이지에 스코프 토큰(`.lp`)으로 DESIGN 트라이얼 시연 → 사용자 롤백(전역 승격·숫자정렬 규칙 충돌 미정).
- **미완**: 노출됐던 토큰·키 재발급(BotFather·Anthropic) 권장 대기. tmp 임시파일 삭제 + `.gitignore tmp-*`. Node 20→22 업그레이드 권장(Claude Code ≥22).

■ 최근 변경 (2026-07-25)
- **LOT 생애주기 이동 3덩어리→1카드 병합(A+C)** — 이동 출고·구분선·이동 입고 3줄을 한 '이동' 카드로(원본→신규 LOT·보관처 전이·수량+양쪽 잔여). 서버 잔여계산 무손상, 화면 `foldTransfers`로 recordId 짝 접기. `작업자:`→`신청자:` 라벨. 승인자(결정자)는 이벤트 레코드 부재로 별도 작업(A안) 연기.
- **재고 조회 컬럼 재정렬** — 최초입고일을 정체성 묶음 앞→보관처·보관일수 사이로(품목명 자동 2번째). LOT-우선 원장 원칙 유지, 품목명만 절충으로 앞당김. tfoot colSpan 보정.
- **탭바 tear-off(A안) 휴면 비활성화**(`ENABLE_TEAROFF=false`) — ↗·창밖드래그 오발동 잠금, 창 안 분할(⊞)만 유지. dormant 패턴(부활 여지). 코드 5파일 미커밋.

■ 최근 변경 (2026-07-16)
- **작업 정산 등록 배포 v0.11.0**(`19e5853`, 07-14 미커밋 전량 + 07-09 재고집계·매입통계 `f522b26`). 어황일보 봇은 로컬 잔류(구현 중). 워크트리 실빌드 검증 후 푸시.
- **★탈펜료 422 해결(운영 영향)** — Airtable 그룹 옵션 `탈팬료`(팬) 오타로 임시저장이 반만 저장되고 있었음(탈펜료 3줄 누락). UI에서 `탈펜료`로 rename→정상. **노임 계산 수정**(회수=인원수·비고=N시간 작업·남/현장=인원×단가·여=인원×단가×작업시간·단가 직접수정 반영). **원프로즌 용도→동결비·입출고비·탈펜료 자동 제외**(가공비에 동결비 포함=이중계상 방지, 박스는 전 용도 유지).
- **3단계 화주 배분 화면 신설**(`[id]/split`, 프로토타입·저장/확정 미연결) — LOT을 화주별로 쪼개는 배분(비율 유동·박스 직접조정·합계 검산·화주 컬럼 동적). 단위 187/통합 112. **v0.11.1(`780e67c`) 배포**(노임·원프로즌 제외·3단계·테스트). 3단계 화면 육안 대기(무해). 봇 트랙 로컬 잔류.
- **★통(桶) 구분 미비 = 최우선 검토 대기** — 원프로즌은 통 운반인데 구분에 통 없음(지금 베이트小로 잘못). 통 수량이 개수냐 박스환산이냐 미결(작업단가 분모 영향). memo `work-settlement-tub-gubun`.

■ 최근 변경 (2026-07-14)
- **작업 정산 등록 실제 구현** — Airtable 3테이블(작업 정산/생산내역/작업비) + 원가함수 `calculateWorkSettlementCost`(작업단가=작업비÷총박스·실단가=수매+작업단가)·rate(`work-settlement-rates` A안 하드코딩)·서버액션 `master-work-settlement`(save/confirm/cancel + getWorkSettlementDetail + saveWorkSettlementHeader). **확정 시 생산내역 1줄→입고관리 1행+LOT 1개**(입고관리.수매가=수매단가/LOT.수매가=실단가·동결비 등=0 이중계상 방지). 설계 `docs/작업정산등록-설계.md`. 단위+통합(3) 그린. 미결 3종 확정(작업비 전부 원가·확정때만 LOT·공동배분 스코프아웃).
- **UI = v17 목업 구조로 구축**(2단계: 사전기입 헤더→임시저장 / 생산내역+작업비→확정 / 이력 이어서작성). 5행 스크롤 콤보(document.body 포털·키보드 ↑↓Enter). **동결비·입출고비는 생산내역(행선지×구분×수량)에서 자동 산출**(행선지마다 단가 다름 반영). 스타일=플레인 `<style>`+`.ws-page` 접두사(styled-jsx/Tailwind `.fixed` 충돌 교훈). 사이드바 IA에 **'재고 작업'** 카테고리 신설(작업 정산·가공 거래를 거래 이력에서 분리, 거래 이력=읽기전용 원장만). **전량 미커밋(도그푸딩 대기).**
- 발견: `storage-cost.ts`가 옛 단일 `동결비` 필드 참조(라이브는 박스종류별 3열)→기존 입고 동결비 null 가능(memo `freeze-fee-split-mismatch`, 별도 상의).

■ 최근 변경 (2026-07-13)
- **입고 타이밍 쟁점 해결**(실제 정산서 분석) — LOT은 **동결·선별 후 생성**(대표님), 원물 매입은 **'작업 정산 등록'이 사이즈별 기록**(사용자·통계), 가공거래=창고 재가공용·물품입고=별개 입구·**용도 태그**(원물동결/원프로즌/생물)로 추적.
- **'작업 정산 등록' PC 폼 설계·목업(v17 아티팩트)** — 헤더+작업비(9그룹·단가 고정 기본값·금액 자동·포장별 단가·노임 수동)+생산내역(사이즈별 매입). 구분(박스종류)→작업비 수량 자동연동, 동결비·입출고비 지급처=보관처 연동. 업무 프로세스 개요+A4 가로 인쇄용 아티팩트(원프로즌 가공·냉동물 재고직행·정산은 판매/수출 갈래).
- **다음 세션 = 실제 설계 착수**(Airtable 테이블 3종 + 경비단가·선박 마스터 + Next.js 화면 + 매입통계 재배선). 오늘은 목업·설계 확정까지(코드 미변경). 상세: memory `work-settlement-registration.md`.

■ 최근 변경 (2026-07-09)
- 매입 통계 사이즈별 단가 추이(월 단위) 축을 **조회 기간 전체 달 연속 축**으로 + 라벨 `2026-05`→`N월`(다년은 첫 달·매년 1월에 연도 표기). 빈 달=간격(계절 공백 노출), 일·주 단위는 종전 유지(하루는 채우면 선 끊겨 추세 상실). `enumerateMonths` 신설.
- 재고 집계 '보관처 × 품목' 교차표 뷰 **비활성화**(코드 dormant·되살리기 쉽게) — 특정 조합은 '재고 조회' 보관처+품목 필터로 대체(LOT 단위라 실사·피킹엔 더 상세). 두 합계(보관처/품목)만 유지, 기본 뷰 storage-only.
- 재고 집계 여백 정리 — 합계 표 콤팩트(table-auto·내용폭) + 흰 카드 `w-fit`(오른쪽 빈 여백 제거) + 뷰 선택 버튼 내용폭 축소. **코드 2파일 미커밋(도그푸딩 대기).**

■ 최근 변경 (2026-07-06)
- 앱 아이콘 새 물고기 로고로 전면 교체 — 최종=**흰 라운드 카드 + 얇은 회색 테두리(#CED2D8) + 큰 남색 물고기**(PIL 생성). 시안: 남색타일 반려→흰배경 큰물고기→라운딩→투명모서리가 밝은UI서 안보임→테두리 추가. 5종(`app/icon`·`favicon.ico`·`apple-touch`·`192`·`512`)+Chrome 라이브 `.ico`.
- 탭 파비콘 누락 fix(`app/favicon.ico` 신설 + `layout.tsx icons.icon` 명시, `/favicon.ico` 404 해소) + SW 캐시 stale 해소(`sw.js CACHE_NAME` v1→v3, 아이콘 변경마다 bump 필요). 커밋 4개, **v0.10.4**. sw.js stale-while-revalidate 개선은 미적용(다음 후보).

■ 최근 변경 (2026-07-04)
- 맥↔윈도 환경차 3-fix — pull 충돌 해소(입고 이력 병합: 콜그룹에 작업자 col 추가·11→12열 + 매입처/보관처/작업자 truncate) / **Turbopack 워크스페이스 루트 고정**(`next.config.ts` `turbopack.root`=process.cwd — 홈 고아 lockfile이 루트를 `/Users/ma`로 잡아 Tailwind CSS 부분 누락하던 맥 CSS 깨짐 fix).
- **로그인 기기 판별 창 폭→입력 장치(포인터) 기준 교체**(`LoginShell.tsx`) — `min-width:1024px`는 노트북 zoom·작은 창에서 모바일 오판 → `any-pointer:fine`(마우스·트랙패드=PC)/터치=모바일. 경계 기기 극소수라 순수 자동(토글 없음). 코드 3파일 미커밋.

■ 최근 변경 (2026-07-01)
- **데이터 테이블/목록 화면 규칙(노션풍) 신설**(■ UI/UX) — PC(/admin) 한정·모바일은 토스 유지. 숫자 우측 고정폭 상자 정렬·헤더=셀 정렬(표시숫자=우측선/입력칸=중앙)·위계(설정<도구<결과물)·CTA 1개·컬럼폭 내용비례. 표시숫자 min-width는 **인라인 스타일 권장**(Tailwind v3 임의 rem값 dev HMR 누락 실사례).
- **3 워크리스트(가공 투입·이동 등록·출고 등록) 노션풍 전면 재설계** + 공유 프리미티브 모듈 `app/admin/master/_lot-table.tsx` 신설(NumBox·NumInputHeader·SectionTitle·소프트필드 등). 가공 레퍼런스 → 이동/출고 복제. 가공 투입 '사료' 품목 제외. 로직 무변경·tsc 0. **이동/출고 육안 도그푸딩 대기·미커밋.**

■ 최근 변경 (2026-06-30)
- 업무 8문항 답변 → 회사=**가공 중심** 확인 + **원가·가공 모델 A~E 확정**(업무프로세스 v0.4). 원가 4단 사다리(재고원가→가공원가→판매원가→매출원가, '제조원가' 폐기·'가공원가' 채택). 용어 위키 화면 신설(`/admin/master/ops/wiki`).
- 가공 인프라 2종 신설 — **가공비 단가 마스터**(가공공장×가공품 단가, 기준 투입/산출kg당·적용기간) + **가공 거래 기능**(2단계 WIP: ㉠투입 원물 차감→가공 중 / ㉡완료 가공품 LOT 생성+가공원가 롤업 / 취소). N원물→가공품·부분 투입·실측 총중량. 가공품 LOT 수매가=가공원가·이월0 / 입고관리 수매가=0(매입 이중계상 차단). Airtable 테이블 3종 MCP 생성(가공비 단가/가공 거래/가공 투입), master-processing.ts + 순수함수 calculateProcessingCost. 단위 154/통합 109 그린.
- 가공 = 입고·출고·이동과 나란한 4번째 재고 사건(변환). 가공 투입 UI=**전체 페이지 워크리스트**(이동 등록 패턴, `/processing/new` — 검색 결과=작업목록 동일 표 양식). LOT 상태사유 '가공 투입'·'가공 입고' 옵션 추가(사용자). 남은 빌드=원가 계산 화면(#4).

■ 최근 변경 (2026-06-29)
- 거래 이력 챕터 완성 — 입고·출고·이동·지출 4종 모두 '이력 + PC 등록' 신설. 입력 관리자=결정자(바로 승인, 기존 createXxx→updateApprovalStatus 연쇄·신규 도메인 로직 0), 출고·이동=일괄 워크리스트/입고·지출=단건 폼, 인라인 마스터 생성 전면 금지(모바일 입고만 품목 자동생성 유지). 직접등록 통합 테스트 13개(단위 150/통합 107). 입고 v0.9.0(작업자 컬럼)·v0.10.0(입고 등록).
- 부자재·경비 마스터 신설(Airtable MCP 테이블, 4섹션 아이스팩·박스·내피·진공팩, 박스당 단가) + LOT 생애주기 '판매원가 계산기'(재고원가 + 선택 부자재; 영수증식 분해·섹션 드롭다운·kg단가 환산). 재고 상태 원가 라벨 '판매원가'→'재고원가' 정리(매출 맥락 `출고시점 판매원가` 필드는 유지). 빈 env 404 fix(테이블 경로 `?? → ||`).
- 판매 2모드 개념 정리(소포장=재고원가+부자재 / 벌크 컨테이너=재고원가+운임) + 업무 프로세스 문서화 시작(`docs/업무프로세스.md` v0.1) — 코드에 고객·주문·수출 엔티티 없음 확인 → 현 시스템=재고·원가 시스템, 판매 앞단 공백.

■ 최근 변경 (2026-06-15)
- 두 PC 통합 — v0.8.0 묶음(탭바 창 안 분할·매입통계/손익추이 프리셋·인쇄)을 이 PC에서 커밋·푸시(`98ed168`, `package.json` 0.8.0) + 맥북 `local-work-mac`(입고 이력) main 머지(`c6bae2d`, 무충돌). origin/main 단일화. 입고이력 버전(0.9.0) bump·브랜치 삭제는 대기.
- 거래 이력 '입고 이력'에 **작업자 컬럼 신설** — 입고 신청·등록 작업자(`작업자` link)를 표·검색·CSV에 노출, 기존 `workerNames` 맵 재사용(추가 조회 0). `매입자`(CSV 기존)와 별개 필드. 작업자 컬럼 미커밋(dogfooding 대기).

■ 최근 변경 (2026-06-12)
- 거래 이력 챕터 1번 화면 '입고 이력' 신설 (`/admin/master/transactions/inbound` + `master-transactions.ts:getInboundHistory`) — 개별 입고 건 원장(상태 무관 전체·재고이동/기존재고 포함, 입고일 내림차순). 기간 프리셋(전체 기본·이번 달·지난 달·올해)·상태 필터 칩·통합 검색·합계·CSV, LOT번호 클릭→`lot-timeline?lot=` 드릴다운, `table-fixed`+`colgroup` 정렬. `local-work-mac` 브랜치 커밋 `69772fe`.
- **브랜치 분기** — v0.8.0(탭바·창 안 분할·매입통계 개편·인쇄)은 다른 PC에 미커밋으로 남아 있고 이 PC엔 0.7.0 코드만 존재. 이 PC 작업을 `local-work-mac`로 분리(추후 main에 v0.8.0 합류되면 rebase). 충돌 방지로 버전 미bump(0.7.0 유지).

■ 최근 변경 (2026-06-11)
- 탭바 '창 안 분할(B안)' 신설 — ⊞ 버튼으로 한 창 안 좌우 더블스크린(iframe pane·드래그 리사이저·임베드 맨몸 모드). 새 창 분리(↗)와 둘 다 제공. 분할 칸 세션 배너 중복은 `SessionGuard` framed 위임으로 fix.
- 매입 통계·손익 추이 기간 프리셋 정리(최근 30일 제거 → 이번 달/지난 달/올해, 이번 달 기본) + **인쇄(A4 가로) 신설** — CSV 옆 '인쇄', 섹션 독립 페이지·선택 탭만·설명/크롬 제외(`#ps-print`/`#pt-print` isolation).
- 개발 원칙 '검증 사각지대 명시' 신설(자가 점검 #1 대응 — 코드 변경마다 미검증·사각지대 먼저 고지). 위 전부 v0.8.0 묶음으로 **미커밋 지속**.

■ 최근 변경 (2026-06-05)
- 매입 통계 전면 개편 **v0.8.0** — 3탭(품목/매입처/선박) 검색-우선 대칭화: 랭킹(행 클릭→상세)↔상세(품목·규격·미수 분포+매칭 칩+스코프 경고), 구성 도넛(매입액/중량 토글)·총중량 컬럼(`parseSpecKg`)·묶음 단위 자동화(토글 제거)·URL 동기화·CSV 2섹션. 서버 `productDays`에 supplier/ship/priceMissingCount 차원 추가.
- 관리자 화면 가로 폭 정리 — 분석 2화면(매입 통계·손익 추이) max-w 1200px+숫자 컬럼 px 고정, 결재 수신함·재고 집계·마스터 5종도 max-w(총 9화면). 재고 조회·재고장은 full width 유지.
- 크롬식 라우트 탭바 신설(`_tab-bar.tsx`) — 방문=탭 쌓임·마지막 URL 복원·드래그 정렬·사이드바 드래그 열기·S-커브 UI + tear-off(창 밖 드래그/↗ → 우측 절반 새 창 이동, 더블 스크린 A안). **오늘 코드 전체 미커밋(dogfooding 대기)**.

■ 최근 변경 (2026-06-04)
- 원가·손익 챕터 1번 화면 '손익 추이' 신설 (`/admin/master/cost/profit-trend` + `master-cost.ts:getProfitTrend`) — 매출총이익(매칭 COGS=`출고시점 손익` 집계) + 현금흐름(매출−수매−지출) 둘 다 표시, 기간 프리셋·일/주/월 묶음·품목/판매처 분해+검색·CSV. 버전 **0.6.0**(MINOR).
- 422 fix — 지출결의에 `결재상태` 필드 없음(`승인상태`만) → formula에서 제거. dogfooding UX: 컨트롤 "조회 기간"⟂"묶음 단위" 라벨 분리 + 분해 검색 + 블록 순서(분해→추이표).
- 원가·손익 챕터 2번 화면 '매입 통계' 신설 (`/admin/master/cost/purchase-stats` + `getPurchaseStats`) — 검색-우선 품목 분석: 품목+규격+미수 분리 집계(가중평균 단가), 검색 시 품목 스코프 분포·추이·**사이즈별 단가 SVG 차트**, 매입처/선박별 탭, 요약 카드 전부 삭제. 버전 **0.7.0**(MINOR, 코드 미커밋).
- 원가·손익 표 스타일 재고 조회와 통일 — 좌측 정렬·`원` 접미사·13px/px-4·table-fixed(헤더 흔들림 해소). 손익 추이 검색창 다듬기 v0.6.1(`b1369f3`).

■ 최근 변경 (2026-06-02)
- 재고 챕터 dogfooding 수정 다발 — 재고장(수매가·보관일수·원산지 컬럼 + 가로 출력 + 출력일시·타이틀 가운데·페이지번호) / 재고 집계 총중량·그룹키 JSON.stringify / 재고 조회 드래그선택·LOT번호 sticky·nowrap / 생애주기 커넥터·기준 툴팁 / PC 폰트 산세리프 통일(font-mono 10곳 제거).
- 사이드바 rail 접기(우상단 토글 고정 + 호버 flyout + 즉시 접힘) + 로그인 기능문구 3개 삭제.
- 매입처 마스터 대청소 276→149 (비수산·테스트·개인 127건 삭제 + 백업 JSON) — Airtable 데이터 작업(git 무관).
- 버전 관리(시멘틱 버저닝) 도입 — `package.json` 0.5.0 단일 출처, 로그인·관리자홈 좌하단 v노출, 개발 원칙에 3규칙(1릴리스=1bump / Phase 4=1.0.0). 현재 **0.5.0**.

■ 최근 변경 (2026-06-01)
- LOT 상세 '판매원가' 카드(`calculateLotCostBasis` 박스당 누적) + 생애주기 조상 LOT 체인 추적(이동 입고 LOT을 원본 LOT번호로 거슬러 원본 입고·출고까지) + 이동 양쪽 분리(이동 출고−/이동 입고+)·LOT별 잔여재고(통장식)·createdTime 2차정렬·병렬화·2단 레이아웃. PC 화면 첫 원가 노출.
- 재고 조회 보강 — 최초입고일 재배치 + 수매가·총중량·판매원가·평가액·보관일수 컬럼 + 합계 행(선택 반영) + 필터 패널(입고기간/규격/미수/원산지/보관처드롭다운/보관일수). 재고장 다중선택 출력 신설(`/admin/ledger` A4 인쇄 + CSV).
- PC 관리자 화면 원가 노출 정책 확정 — 모바일·작업자는 숨김 유지, 게이트된 `/admin/*`만 노출(관리회계). ServiceWorker prod-only 등록(dev 캐시 깨짐 해소) + 사이드바 틀고정.
- 재고 화면 개선 3건(오후) — 생애주기 타임라인 세대 구분선(입고·이동 입고 위 📦/🔁 LOT 라벨) + 재고 조회 비고 컬럼 신설·상태는 조용한 점으로 축소(비고 채움률 65% 확인) + 재고 집계 보관처 합계에 보관비·평가액(현재고 기준 누적, 오늘 기준). 예측형 분석(판매가·수매가 추세·악성재고 패턴)은 PC 모드 안정화 후로 보류, #4 기간 발생액(4B)은 다음 단계.

■ 최근 변경 (2026-05-29)
- 관리자 IA 비중복 재정리 + 재고 집계 컬럼 자동 너비 — 재고 라벨(재고(LOT별)/재고 집계), LOT 생애주기를 재고(LOT별) 행클릭 drill-down(`?lot=` 자동조회)으로 전환, 음수·이상 LOT 모니터→시스템·운영, placeholder 정리(결재 일괄·이력 / 원가 LOT누적비용 제거·보관비이력→마스터 / 운영건강도실시간 제거) → 6카테고리 22항목·활성 9. 재고 집계 보관처·품목 컬럼은 내용 최소+대칭 자동 너비(useEffect 측정 equalize), swap 흔들림은 셀 패딩 px-3 복원으로 해결. 가격·원가는 PC 화면 미노출(일일정산 이메일에서만) → 다음 1순위 LOT 상세 비용 섹션.
- PC 진입 UX 통합 (`353a87a`, +947) — Split 로그인(좌 브랜드 파노라마/우 작업자 그리드→PIN, 키보드 입력 지원) + viewport 1024px 분기 단일 mount(LoginShell) + 관리자 홈 `/admin/master`(KPI 4장 결재 대기/오늘 입출고/위험 알림 + 6 카테고리 카드) + role-based 진입(ADMIN/MASTER→홈, WORKER→`/`) + 사이드바 사용자 메뉴(아바타·역할·로그아웃).
- PC 결재 수신함 신설 (`e143e2c`, +770) — `/admin/master/approval/inbox` 표 일람 + 다중선택 일괄 처리. 백엔드(updateApprovalStatus[Bulk]/getMyRequests) 모바일과 100% 공유, /admin/dashboard 무손상. 탭(대기/완료)·타입 필터·검색 URL 동기화 + 일괄 승인·일괄 반려 + 완료 탭 양방향 토글.
- 사이드바 IA + 표 정리 (`290616d` + `7cc692a`) — 카테고리 접기/펼치기 + localStorage 보존 + 마스터·시스템·운영 기본 접힘 + 활성 카테고리 자동 펼침 + enabled/disabled 단일 flex 구조 정렬 통일. 재고 현황 집계에 사이즈(마리당 g) 컬럼 + 보관처/품목 swap on click + table-fixed 컬럼 너비 고정. 'LOT 조회' → '재고 조회' 라벨 통일. `formatSpec/formatMisu/formatSize` 공유 함수 추출(단위 140 통과).

■ 최근 변경 (2026-05-28)
- Phase 3 마스터 + 재고 카테고리 마무리 — 작업자 마스터(`/admin/master/workers`, PIN 재설정·잠금해제·본인 보호·마지막 MASTER 보호) + 선박 마스터(`/admin/master/ships`, 9필드, 어업종류 옵션 미정) + 재고 현황 집계(3뷰 토글) + LOT 생애주기(시간순 타임라인 + PDF 링크) + 음수·이상 LOT 모니터(daily-report HealthMetrics 화면화 + 위반 상세). master-{workers,ships,health,lot-timeline}.ts 4종 server action 신설.
- IA 6 카테고리 사이드바 shell — `_nav.ts`로 NAV_GROUPS 분리(27 슬롯 / 14 활성 / 13 준비중) + `[...slug]` catch-all로 ComingSoonPage placeholder. 준비중 항목도 클릭 가능(노란 배지), IA 전체 구도 시각화. URL은 `/admin/master/*` 통일 유지, phase 3 후반 카테고리 디렉터리 분리 예정.
- 추가 결정 — IA 진행은 카테고리별 단계적(전체 만들고 dogfooding 대신 1개씩 → 1주 사용 → 다음). 순서: 마스터 → 재고 → 거래 → 결재 확장 → 원가·손익 → 시스템.

■ 최근 변경 (2026-05-28 오전)
- Phase 1 마무리 + Phase 2 전체 완료 + Phase 3 시작 (13 커밋). 표기 통일·컴포넌트 추출 → inline fetch 42→0 + schema 11테이블 → 마스터 4화면(products/suppliers/storage 풀 CRUD + lots read-only) + PC PWA "SEAERP 관리자" 별도 설치.
- 관리자 PC IA 6 카테고리 확정 — 결재/재고/거래이력/원가·손익/마스터/시스템·운영. 재무회계 영역(분개·전표·부가세·세금계산서·결산)은 명시적 보류, 외부 ERP export로 연결(1인 한계·세법 리스크). docs/ROADMAP.md "명시적 보류 항목" 섹션 + 본 파일 "■ 의도된 비범위" 섹션.
- 보관처 마스터 'use server' const export 버그 fix — `STORAGE_KINDS`를 `lib/storage-kinds.ts`로 분리. 다른 'use server' 파일 전수 스캔 동일 패턴 0건.

■ 최근 변경 (2026-05-27)
- 출고·재고 이동 카트 UX 통일 — 헤더 🛒+바텀시트(확인 후 신청)/`LotProductSpec`로 규격·미수 표기 통일/"다시 검색" 결과 리스트 복귀/출고·이동 수량 재고 초과 자동 클램프/판매처·판매가 필수. 재고 이동 묶음 신청 A안→B안(`runBulkSubmit`). 컴포넌트 `OutboundCartSheet`·`TransferCartSheet`·`LotProductSpec` 신설.
- Step 0 안전망 — cart 순회 정책을 `lib/bulk-submit.runBulkSubmit` 순수 함수로 추출 + 단위 테스트(A안 abort 회귀 가드, 변이 테스트로 효능 증명). `formatSpecKgMisu` 중복 '미'(`52/54미미`) 가드 + `lib/spec-display.test.ts`. 단위 125(+15)/통합 93.
- 보관처 마스터 정리(MCP) — `㈜해원냉장`→`해원냉장` 병합(LOT↔입고 보관처 불일치 해소)·`동ㅇ원통영수산` 삭제(85→83), `.`(활성 800박스)·`해원냉동(구좌)` 보류. dev `COMPANY_*` 21건 encrypted 확정(저널 stale 정정).

■ 최근 변경 (2026-05-26)
- 입출고증 발행 정책(자사창고 끝점 분기, 5/19 `isOwnStorage`) 통합 테스트 신규 — `test/integration/pdf-issuance-policy.test.ts` 8케이스(7매트릭스 + 미분류 회귀), fixture `PDF_POLICY_STORAGES` 추가. production 0줄 수정, 통합 85→93, 회귀 0.
- 보관처 마스터 `구분` 운영 분류 완료 (Airtable MCP, 85건 전부) — 자사창고 4(한라에스앤에프/나림통상/사무실/한라양식수협) / 외부창고 81 / 미분류 0. 발행 분기 즉시 효력: 외부 입고는 입고증 미발행(런타임 데이터, 배포 불필요).

■ 최근 변경 (2026-05-20)
- QR 외부 공개 페이지 `/lot/{LOT번호}` 신설 (`a06d81f`). 옵션 B(5필드: LOT/품목/규격·미수/원산지/입고일) + 옵션 1(공개 URL) 확정. 옛 PDF의 `/inventory/lot/` QR은 SessionGuard 분기로 자동 리다이렉트, 신규 PDF QR은 `/lot/`. 기존 LOT 198건 즉시 작동, 데이터 마이그레이션 0.
- 입고증 PDF 양식 재구성 (`4819204`). 누락 5필드(미수/선박명/매입자/매입처/비고) 추가 + 4컬럼 2-윈 표(라벨 가운데, 값 좌측) + 단위 접미사(kg/미/ct) + 타이틀 28pt + "입고자" 라벨 + 회사 정보 푸터(`lib/company-info.ts` + COMPANY_* env 7개, A4 하단 absolute 고정) + 표↔QR / QR↔회사 구분선. `transfer.ts` 이동 입고증도 동일 적용. Dev preview API `/api/preview/inbound-pdf` 신설.
- 다국어 트랙 분리 (메모리 저장). 입고증/출고증 PDF는 다국어 X(국내+내부 문서). 재고 부착용 재고표 라벨 PDF가 진짜 다국어 대상 — 판매처 국적별 자동 분기, 판매처 마스터(미구축) 신설이 선행.
- **출고증·이동출고증 양식 통일** — 입고증과 동일 4컬럼 5행 + 비고 full-width 패턴. `OutboundPdfData` 5필드 확장(spec/detailSpec/origin/storage/memo) + `saleAmount` 제거(영업정보 외부 노출 차단). `admin.ts`/`transfer.ts` 호출부에 입고관리.비고 lookup + `resolveStorageName` + 5필드 매핑. "신청자"→"출고자" 라벨, 회사 푸터·구분선·단위 접미사 입고증과 통일. CompanyFooter divider 좌우 폭을 페이지 padding과 동일(48pt)하게 맞춰 표↔QR divider와 길이 통일. Dev preview API `/api/preview/outbound-pdf`(`?transfer=1`). Vercel env COMPANY_* 14건 sensitive→encrypted 재등록(production/preview, REST API DELETE+POST).

■ 최근 변경 (2026-05-19)
- Airtable 승인상태 색상 5개 테이블 통일(수동 UI) + LOT별 재고 상태 7개 필드 전면 활성(0dbaca6/d677a61/c6166b8, 세트 A=lifecycle / B=workflow) + 반려사유 5종 칩 UI(c6166b8). Vercel 빌드 fix(`prefer-const`, 2c36b4b) + origin remote URL 갱신(SeaErp.git).
- PIN 마이그레이션을 `next/server.after()`로 전환(`a3743d7`) — Vercel 조기 종료 시 평문 PIN 영구 잔존 위험 해소 + `security.test.ts` flaky 동시 해결. 사내 공지 5건 + A4 인쇄용 HTML 시안(`6f7832a`, `docs/notices/`). 직원 톤 가이드 메모리 저장.
- **입고증·출고증 발행 시나리오 정립**(`c0e9cf7`). 자사창고/외부창고/가공공장/기타 4분류 × 7가지 케이스 매트릭스로 자사창고 끝점이 있을 때만 우리(SeaERP) PDF 발행. 보관처 마스터 `구분`(4분류) + 재고이동 `출고증 URL` 신설. `lib/storage.ts:isOwnStorage`(미분류 default true, 자사창고만 true, 가공공장은 외부 취급), admin/transfer PDF 트리거 분기, OutboundPDF에 `isTransfer` prop(판매처→이동처 + 판매금액 행 제거) + QR 추가.

■ 최근 변경 (2026-05-18)
- 재고조회 → 카트 페이지 핸드오프 통일 (`e263bca`). BulkSubmitSheet 제거 + sessionStorage 핸드오프 + 카트 페이지에 첫 LOT 자동 선택/다음 자동 이어짐 + 대기 칩 UI. LOT마다 다른 판매처/판매가/보관처 부여 가능. admin/dashboard 일괄 승인(B안) 추가 + EXPENSE는 100만원 권한 분기로 제외. outbound LOT 보관처 fallback 안전망.
- Airtable 출고관리 컬럼 정리 (`e263bca`). 출고수량 → 출고요청수량 rename + 실출고수량 formula 신설(반려 시 0) + 출고시점 판매금액(currency) 폐기(판매금액 formula로 대체). 반려 시 보존 정책 변경: 출고시점 판매원가만 보존, 나머지 6개 클리어. 멱등 가드 기준: 판매원가 → 단가.
- 옛 입고관리·LOT link 일괄 backfill (`d114b44`). LOT 품목마스터 180건 + 입고관리 보관처/품목마스터 179건 자동 PATCH. 출고관리.품목명 transitive lookup 자동 갱신 검증. 남은 17건은 갈치 16(품목마스터 미등록) + 빈 record 1.
- transfer-revert partial failure 보상 트랜잭션 (`748fc53`). `rollbackToCharged` 헬퍼 + 단계 2/3/4 모두 보상 패턴 — 출고 반려와 완전 대칭. 이전엔 단계 3/4 실패가 success:true 반환되어 admin.ts가 반려 PATCH 진행 → 모순 상태 진입(CRITICAL) 위험 해소. 통합 +8 시나리오. 단위 110 / 통합 85.

■ 최근 변경 (2026-05-15)
- C안 + 동결비 특례 — 수매가 절반 버그 + 박스당/총액 단위 일관성 fix. 수매가 박스당 그대로(이전엔 ratio로 절반화), 이월 4개 박스당×이동박스수(총액), sourceInboxQty 분모로 이동 사이 출고 끼는 케이스도 정확. 동결비 특례: 이동된 LOT 동결비=0 + 이월동결비는 원본 cost basis 박스당 보존(N단계 일관). LOT.판매원가 formula 갱신(박스당 비용 × 입고수량). 단위 110 / 통합 77 통과.
- 일일 보고서 운영 건강도 5항목 추가 (🩺 섹션) — 음수 재고 LOT / 잔여수량 정합성 / 출고시점 비용 NULL(E1 가드 실패 조기 발견) / 잠긴 PIN / 어제 신청 당일 처리율. 빨강·초록 색 코딩.
- LOT별 재고 상태 관리 필드 7개 추가 + 198건 backfill. 상태/상태사유/승인상태/결정자/결정일시/반려사유/반려메모. 영어 매핑 description (PostgreSQL 이전 대비). Airtable Automation 트리거 7종 수동 설정 안내.
- 옵션 A: mock store lookup 시뮬레이션 + PATCH 잔재 제거 (`f8fd191`). fetch-mock에 양방향 link sync + lookup auto-fill(2-pass transitive). inbound.ts/transfer.ts LOT번호 PATCH 코드 제거(옵션 2 후 무용). 디버깅 0 사이클.
- Airtable reverse link 15개 rename — 작업자/보관처/매입처/품목마스터의 헷갈리는 link 명확화. 운영 테스트 LOT 5건 일괄 정리.

■ 최근 변경 (2026-05-14)
- 이동 새 LOT/입고관리에 매입자·입고자·선박명·원산지·비고 복사 (이전엔 빈칸). 입고관리.매입자는 workerId(이동 처리자)로 잘못 채워지던 것을 원본 매입자로 정정. fallback 패턴 (입고관리 ↔ LOT). 통합 +2 시나리오. 단위 105 / 통합 75 통과.
- TRANSFER 반려 자동 복구 도입 (`revertTransferOnReject`). 안전 가드 3종 — (a) 신규 LOT.재고수량 == 이동수량 (b) 신규 LOT을 원본으로 한 활성 재이동 없음 (c) 신규 입고관리에서 활성 출고 없음. 통과 시 원본 LOT/입고관리 +이동수량, 신규 LOT/입고관리 soft delete (재고수량 0 + 잔여수량 0 + 승인상태 반려). 하나라도 실패 시 [INTEGRITY-ALERT] + 반려 처리 차단. admin.ts:1027 분기 갱신. 통합 +3 시나리오 (정상 / 출고 차단 / 재이동 차단).
- 이동 새 LOT 생성 시 link 필드명 오타 fix (`품목` → `품목마스터`). f2f9974에서 잘못된 필드명으로 LOT 생성이 매번 422 실패하던 것을 정정.
- Airtable 필드 정리 시작 (LOT별 재고 / 입고 관리). LOT별 재고: self-link 2개 이름 정리(`재고 이동`→`재고이동(출처 LOT)`, `재고 이동 2`→`재고이동(신규 LOT)` — 의미는 같은 LOT의 source/destination link), 미사용 link 1쌍 삭제(LOT.`입고 관리` ↔ 입고관리.`LOT별 재고`). 입고 관리: lookup 1개 이름 정리(`품목명(Lookup-출고관리))`→`품목명`, 출고관리.품목명 transitive lookup의 source라 삭제 불가). `품목유형`/`From field: LOT별 재고`/`출고 관리 2`(↔ 출고관리.`입고 관리`)는 사용자 직접 삭제. 코드 영향 0건 (lookup·미사용 link만 손댐).
- 출고 관리 필드명 swap: link `LOT번호`(실제로는 입고관리 link였음) → `입고관리`, lookup `LOT번호(표시용)` → `LOT번호`. 코드 4파일 갱신 (outbound.ts POST 키, admin.ts·my-requests.ts 출고 컨텍스트 fields 접근, schemas/outbound.ts zod 키). 통합 테스트 outbound-bulk-race fixture 키도 갱신. 단위 105 / 통합 68 모두 통과.
- 출고시점 판매금액 = 0 버그 fix (출고관리.판매금액 formula 신설). admin.ts:648/257이 읽던 필드가 실재하지 않아 출고시점 판매금액·손익이 항상 0이었음.

■ 최근 변경 (2026-05-13)
- 동결비 통합 + 옵션 B (재고 이동 시 새 LOT 최초입고일 보존·이월 4개 비례 분할) + 누적 경비 계산 (이동입고일 ?? 최초입고일 fallback) 구현. 가공품(qtyBase/qtyDetail) 분기 전체 제거 → 박스 단위 단일화. Airtable formula 2개(판매원가/누적냉장료) MCP로 직접 갱신.
- 운영 골든패스 6 시나리오 검증 완료 (입고/출고/이동/입고반려/출고반려/D1 재이동). 검증 중 사전 존재 버그 4건 fix: 입고일자 rename 누락 / 품목구분 lookup 거부 / 이동 LOT 입고수량(BOX)·규격·미수 누락 / 이동 LOT 품목 link·품목명 누락.
- 미해결: 0180·운영 검증 테스트 LOT 정리 (0182~0188 + 0181 입고관리 고스트 2건) / security.test.ts PIN 마이그레이션 flaky.

