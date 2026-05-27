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
