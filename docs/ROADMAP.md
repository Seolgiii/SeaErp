# SEAERP 개발 로드맵

> 최종 업데이트: 2026-05-12  
> 아키텍처 방향: CLAUDE.md 참조 (단일 코드베이스, 두 PWA 구조)  
> 원칙: 최소 수정, 데이터 정합성 우선, 잘 작동하는 기능 미수정

---

## 진행 현황 요약

| Phase | 명칭 | 상태 | 기간 |
|-------|------|------|------|
| Phase 0 | PWA 설치 가능 | ✅ 완료 (2026-05-12) | - |
| Phase 1 | 모바일 사용성 다듬기 | ⏳ 예정 | 1~2주 |
| Phase 2 | 백엔드 부채 정리 | ⏳ 예정 | 2~3주 |
| Phase 3 | PC 화면 신설 (Airtable 대체) | ⏳ 예정 | 1~2개월 |
| Phase 4 | 시범 출시 + 피드백 | ⏳ 예정 | 1~2개월 |
| Phase 5+ | 조건부 (PG 이전 등) | 보류 | - |

---

## Phase 0: PWA 설치 가능 ✅ 완료

**완료일**: 2026-05-12

### 완료 내역
- 192/512 아이콘 추가 (Android Chrome installability 충족)
- apple-touch-icon 180×180으로 정규화
- favicon (app/icon.png 32×32) 추가
- manifest.json theme_color #F2F4F6으로 통일
- sharp 기반 아이콘 재생성 스크립트 추가 (scripts/generate-pwa-icons.mjs)

### 검증 결과
- 자동: 단위 103 + 통합 57 테스트 모두 통과
- 수동: Vercel 배포 환경에서 PWA 설치 가능 확인
- Lighthouse: Performance 77, Best Practices 100, SEO 100

### 보류 항목 (필요시 추후)
- maskable variant 아이콘 (원본 아트워크 안전 영역 검증 필요)
- PWA 설치 UI용 스크린샷 (manifest screenshots 필드)
- favicon.ico 404 해결 (현재는 무해)

---

## Phase 1: 모바일 사용성 다듬기

**목표**: 작업자가 모바일 PWA로 일상 업무를 무리 없이 처리할 수 있는 수준으로 완성

**Phase 1 작업 원칙**:
- 회계 영향 가능 코드는 통합 테스트 보강 후 작업
- UI 작업 시 데이터 로직 미수정
- 회귀 발견 즉시 작업 중단

**우선순위**:

### Step 0: outbound 정책 정렬 (회계 안전 우선)
- 배경: 2026-05-12 진단 보고서에서 outbound의 handleSubmitAll이 결정 노트(출고이동_카트_UX_통일.md, B안 = A안과 동일 개념)를 미적용한 상태로 발견됨
- 현재 동작: 중간 실패 시 abort, 처리된 건은 그대로 남음 + 사용자 미고지
- 정책 목표: status의 handleBulkOutbound 패턴과 동일하게 정렬 (부분 성공 + 결과 화면 명시)
- 작업 내용:
  - A2_출고_골든패스 통합 테스트에 부분 성공/실패 케이스 보강
  - outbound handleSubmitAll을 status 패턴으로 정렬
  - BulkResultsPanel 또는 동등 UI를 outbound에도 적용
- 위험: 중간 (결재 정합성 영역, 테스트 보강으로 완화)
- 효과: 회계 사고 가능성 차단, 정책 일관성 확보

### Step 1: 공통 LotCard 컴포넌트 추출 (기존 P0)
- 세 화면(status results, outbound 검색 결과, dashboard 카드)의 LOT 표기를 통일
- 변형은 props(showQtyInput, showStock, action 등)로 분기
- 다른 화면에도 즉시 효과, 회귀 위험 낮음

### Step 2: 포맷 helper 일관화 (기존 P0)
- formatIntKo 사용을 status에도 확산
- toLocaleString 직접 호출 제거
- 회귀 위험 매우 낮음, "박스" 표기 한글 통일에 후속

### Step 3: /inventory/status 3단계 분리 (기존 P1)
- 3단계(form / results / summary) 모두 sub-route로 분리
- 효과: (a) 컴포넌트 길이 ~300줄/단계로 감소 (b) 뒤로가기 자연스러움 (c) 각 단계 독립 테스트 가능
- 결정 필요: stage 간 state 전달 방식 (query string / context / sessionStorage)

### Step 4: /admin/dashboard renderCard 분해 (기존 P1)
- ApprovalLogisticsCard / ApprovalExpenseCard 두 컴포넌트로 분리
- isExpense / isTransfer 분기 일소
- dashboard 단일 컴포넌트 길이 감소

**진행 방식**:
- Phase 0 끝나자마자 본인이 며칠 실사용
- 거슬리는 점을 옵시디언 등에 메모
- 모아서 한 번에 Claude Code에 작업 지시
- 화면 1개씩 순차 진행

**완료 기준**:
- 본인이 모바일로 30분 이상 연속 사용 가능
- 단위 + 통합 테스트 통과 유지

---

## Phase 2: 백엔드 부채 정리 (옵션 B+)

**목표**: app/actions/** 의 inline fetch를 헬퍼로 통일하여 향후 PC 화면 신설 시 동일한 데이터 접근 패턴 사용 가능

**작업 내용**:

[1단계] inline fetch 통일
- 32곳의 fetch('https://api.airtable.com/...') → 헬퍼로 교체
- 헬퍼: fetchAirtable, createAirtableRecord, patchAirtableRecord, getAirtableRecord
- 한글 필드명 유지 (영문 매핑 안 함)
- 작은 파일부터 시작, admin.ts (1086 LOC) 마지막

[2단계] 누락 테이블 schema 추가
- lib/airtable-schema.ts에 추가:
  - 입고 관리, 출고 관리, 지출결의, 재고 이동, 보관처 마스터
- 매입처 마스터 필드 상수 추가

**완료 기준**:
- app/actions/** 에서 inline fetch 0건
- 모든 Airtable 테이블이 schema 등록
- 단위 103 + 통합 57 테스트 그대로 통과

**보류**: 백엔드 어댑터 패턴 (BACKEND 환경변수 분기) — PG 이전 결정 시점에 진행

---

## Phase 3: PC 화면 신설 — Airtable 대체

**목표**: 관리자(ADMIN, MASTER)가 Airtable 없이 모든 데이터 관리 가능

### 관리자 PC IA — 6 카테고리 (2026-05-28 결정)

1. **결재 (Workflow)** — 일상 1순위
   - 결재 수신함 ✅ `/admin/dashboard`
   - (확장) 결재 이력·검색
   - (확장) 일괄 처리 표

2. **재고 (Inventory)**
   - LOT 마스터 ✅ `/admin/master/lots` (read-only)
   - 재고 현황 집계 (보관처 × 품목)
   - LOT 생애주기 추적 (입고 → 이동 → 출고 타임라인)
   - 음수/이상 LOT 모니터 (daily-report HealthMetrics 화면화)

3. **거래 이력 (Transactions)**
   - 입고 이력 (PDF 재발행 포함)
   - 출고 이력
   - 이동 이력
   - 지출 이력 (admin 관점)
   - PDF 재발행 드롭존

4. **원가·손익 (Cost & Profit Analysis)** — 관리회계 only
   - 보관처 비용 이력 마스터 (storageCostHistory)
   - LOT별 누적 비용 분석 (cost-calc 시각화)
   - 손익 추이 (일·주·월)
   - 매입 통계 (매입처 × 기간 × 금액)
   - 외부 ERP export — 재무회계 프로그램으로 데이터 이관 채널

   ※ 4번은 *관리회계*에 한정 (원가·손익 분석). 분개·전표·세금계산서 등
     *재무회계*는 본 ERP 범위 외 — "명시적 보류 항목" 섹션 참조.

5. **마스터 (Reference Data)**
   - 품목 ✅ `/admin/master/products`
   - 매입처 ✅ `/admin/master/suppliers`
   - 보관처 ✅ `/admin/master/storage`
   - 작업자·권한 (workers 테이블, PIN·role)
   - 선박 정보 (입고 폼 사용 중)

6. **시스템·운영 (Ops)**
   - 일일 보고서 화면 (현재는 이메일만)
   - 운영 건강도 (HealthMetrics 실시간)
   - `[INTEGRITY-ALERT]` 로그 검색
   - cron 실행 이력
   - Airtable 동기화 상태 (`[SCHEMA-MISMATCH]`)

### 공통 화면 패턴
- 표 + 필터 + 검색 + 모달 편집 (인라인은 dogfooding 후 결정)
- 키보드 단축키 지원 (검색 Ctrl+K, 저장 Ctrl+S 등)
- 페이지네이션 또는 가상 스크롤 (TanStack Table은 화면 4개+ 누적 시 재검토)
- CSV 내보내기 (4번 "외부 ERP export"의 1차 형태)

### 진행 방식
- 테이블별로 화면 1개씩 만들기 (단순한 것부터)
- 우선순위: products → suppliers → storage → lots(read-only) ✅ 완료
  → 결재 확장 → 거래 이력 → 원가·손익 → 시스템·운영
- 각 화면 완료 후 본인이 일주일간 Airtable 대신 사용해보고 검증

### 완료 기준
- 본인이 일상 관리 업무를 Airtable 없이 처리 가능
- Airtable은 백엔드 DB로만 사용 (UI 접근 불필요)

---

## Phase 4: 시범 출시 + 피드백 수집

**목표**: 실사용 데이터 기반으로 다음 단계 결정

**작업 내용**:
- 모바일: 작업자 일부에게 시범 배포
- PC: 관리자 일부에게 시범 배포
- 실사용 데이터 수집:
  - 어떤 화면에서 가장 자주 막히는가
  - Airtable API 응답 속도가 실제 문제가 되는 지점
  - 모바일 vs PC 사용 비율
  - 자주 요청되는 기능

**완료 기준**:
- 시범 사용자 3명 이상 1주일 이상 사용
- 명확한 개선 백로그 확보

---

## Phase 5+ (조건부)

### 5-A. PostgreSQL 이전
**트리거**: Airtable 레코드 한계, API 속도 병목, 복잡한 조인 필요
**작업**: 백엔드 어댑터 패턴 도입, 테이블별 점진 이전, ORM 도입(Prisma 유력)

### 5-B. 데스크탑 앱 (Tauri/Electron)
**트리거**: 특정 USB 장비가 Web USB/Serial API로 작동 불가, 완전 오프라인 요구
**작업**: 기존 Next.js 코드를 Tauri로 감싸기

### 5-C. 분석 인프라
**트리거**: 데이터 양이 운영 DB로 처리 불가능한 수준
**작업**: 데이터 웨어하우스 분리, 대시보드 도구 도입

---

## 명시적 보류 항목 (의도된 비범위)

본 ERP가 *하지 않기로 결정한* 영역. Phase 5+(조건부 미래)와 구분되는
"개발 범위 외" 의미. (2026-05-28 결정)

### 재무회계 영역

대상:
- 분개 전표 / 일반전표
- 부가세 신고 자료
- 전자세금계산서 발행
- 결산 (월·분기·연)

보류 사유:
- 매년 세법 변경, 세무 리스크 큼
- 더존·이카운트·smartbill 같은 *전문 회계 프로그램의 영역*
- 1인 개발로 변동성을 추적하는 것이 비현실적

처리 방향:
- 본 ERP는 **관리회계(원가·손익 분석)까지** 자체 구현 (Phase 3 IA 4번 "원가·손익")
- **재무회계는 외부 회계 프로그램으로 데이터 이관**
- Phase 3 IA 4번 하위 *"외부 ERP export"* 가 그 연결 다리
- export 포맷·수신 시스템(더존/이카운트/etc)은 별도 결정

---

## 의사결정 기록

이 로드맵의 주요 의사결정 맥락은 `obsidian-vault/40_결정기록/` 에 별도 보관.

핵심 결정:
- 2026-05-12: 모바일 PWA + PC PWA 분리 구조 확정
- 2026-05-12: PC 프로그램화는 Electron/Tauri가 아닌 PWA로 진행
- 2026-05-12: 백엔드 리팩토링은 옵션 B+ 채택 (영문 매핑 없음, 한글 필드명 유지)
- 2026-05-28: 관리자 PC IA = 6 카테고리 확정 (결재 / 재고 / 거래 이력 / 원가·손익 / 마스터 / 시스템)
- 2026-05-28: 재무회계 영역 명시적 보류 — 외부 ERP export로 연결 (1인 개발 한계, 세법 리스크)
