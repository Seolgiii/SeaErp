[수산물 ERP 프로젝트 현황 — 2026년 5월 6일]

기술 스택: Next.js 15 + Airtable + Vercel + zod + Vitest + Resend
개발 방식: 1인 기획/개발 + Claude Code

## 규칙
- UI 관련 작업 시 아래 문서를 반드시 먼저 읽고 그 토큰·규칙을 따를 것.
  C:\Users\user\Documents\Obsidian\SEAERP\DESIGN.md
  (WSL 경로: /mnt/c/Users/user/Documents/Obsidian/SEAERP/DESIGN.md — Claude Code는 이 경로로 읽는다)
- 색상·폰트·간격을 임의로 지정하지 말 것.

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

■ 프로젝트 아키텍처 방향성 (2026-05-12 결정)

▸ 핵심 구조: 단일 코드 베이스, 두 개의 PWA
하나의 Next.js 프로젝트 안에서 두 가지 사용자 그룹을 지원한다.

1. 모바일 PWA (작업자용)
- 대상 사용자: WORKER 권한
- 화면: 카드 레이아웃, BottomTabBar, BottomSheet 등 모바일 UI 패턴
- 라우트: 기존 화면 그대로 (/inventory/*, /expense/*, /my-requests, /)
- 사용 환경: 폰에 PWA 설치
- 주요 기능: 입출고 등록, 재고 조회, 바코드 스캔, 결재 신청
- 현재 상태: 80% 완성. Phase 1에서 사용성 다듬기 진행.

2. PC PWA (관리자용)
- 대상 사용자: ADMIN, MASTER 권한
- 화면: 표/대시보드 레이아웃, 키보드 단축키, 일괄 처리 UI
- 라우트: /admin/ 하위에 신설 예정
- 사용 환경: PC에 PWA 설치 또는 브라우저
- 주요 기능: 마스터 데이터 관리(제품/LOT/보관처/공급업체), 결재 일괄 처리, 재고 표 조회, 지출 집계, 분석/리포트
- 현재 상태: 거의 0%. Phase 3에서 신설.
- 목적: Airtable이 하던 데이터 관리 역할을 자체 화면으로 대체

▸ 공유 인프라
- 데이터: Airtable (현재) → PostgreSQL (조건부 미래 이전)
- 인증: PIN 4자리 + 30분 idle 세션
- 권한: WORKER / ADMIN / MASTER 3종
- 백엔드 코드: app/actions/**, lib/** 모두 양쪽 화면이 공유
- 배포: 하나의 Vercel 프로젝트로 양쪽 모두 배포

▸ 작업 원칙
- 백엔드 로직은 모바일/PC 화면 양쪽이 공유하도록 설계
- 새 기능 추가 시 "이 기능은 모바일용인가, PC용인가, 양쪽 다인가" 명시
- PC 화면 신설 시 /admin/ 하위에 그룹화
- 데이터 접근은 lib/airtable.ts 헬퍼 통일 (인라인 fetch 금지)
- 관리자 PC IA = 6 카테고리 (결재 / 재고 / 거래 이력 / 원가·손익 / 마스터 / 시스템). 상세 docs/ROADMAP.md Phase 3.

▸ 단계별 로드맵 (요약)
- Phase 0: PWA 설치 가능 ✅ 완료 (2026-05-12)
- Phase 1: 모바일 화면 사용성 다듬기 (1~2주)
- Phase 2: 백엔드 부채 정리, 옵션 B+ (2~3주)
- Phase 3: PC 화면 신설, Airtable 대체 (1~2개월)
- Phase 4: 시범 출시 + 피드백 (1~2개월)
- Phase 5+: 조건부 (PostgreSQL 이전 등)
- 상세 계획은 docs/ROADMAP.md 참조

■ 핵심 도메인 흐름
- 입고: 신청 → 승인 대기 → 관리자 승인 → LOT별 재고 생성/반영 + 보관처 비용 적용 + 입고증 PDF
- 출고: LOT 검색 → 다건 신청 → 승인 → 입고관리.잔여수량 + LOT.재고수량 차감 + 출고시점 비용 7필드 스냅샷 + 출고증 PDF
- 재고 이동: LOT 이동 신청 → 승인 → 새 입고관리/LOT 자동 생성 (보관처 변경) + 원본 LOT 차감
- 지출결의: 신청 → 승인 → 지출결의서 PDF (100만원 기준 ADMIN/MASTER 권한 분리)
- 결재 양방향: 승인 ↔ 반려 토글 시 재고 자동 복구 (soft delete — LOT 보존 + 재고수량=0)

■ 보안
- 서버 액션 권한 재검증 (requireWorker / requireAdmin) — Airtable에서 role 직접 조회
- ADMIN_SECRET 강제 (관리 API), 디버그 API production 차단
- 100만원 권한 서버 재검증 (클라이언트 우회 차단, MASTER만 즉시 승인)
- POST 라우트 idempotency (X-Idempotency-Key + 5분 메모리 dedup)
- 출고 승인 멱등 가드 (출고시점 판매원가 > 0 시 중복 차감 차단)
- PIN: scrypt 해시화 + 자동 점진 마이그레이션 (평문 PIN 매칭 시 즉시 해시 PATCH)
- PIN rate limit Airtable 영속화 (5회→5분, 다시 5회→30분, 분산 환경 정확)
- 입력 sanitize (제어문자 제거 + 필드별 길이 제한)

■ 데이터 정합성
- 입고 반려: LOT 재고수량=0 + 보관처 비용 3필드 null (soft delete)
- 출고 반려: 잔여수량/LOT재고 +outQty 복구 + 출고시점 비용 7필드 null
- 재승인 시 자동 복원 (createLotOnInboundApproval 재실행)
- LOT 일련번호 동시성: 낙관적 재시도 (~99% 보호, 검증~POST 사이 race window 잔여)
- TRANSFER 반려 자동 복구 — 안전 가드 3종 통과 시 자동 복구 (lib/admin.ts → transfer.revertTransferOnReject). 가드 실패 시 [INTEGRITY-ALERT] + 반려 처리 차단(수동 보정 유도)
- Airtable 응답 zod 스키마 검증 (모니터링 모드, [SCHEMA-MISMATCH] 로그)
- 모든 정합성 위험 지점에 [INTEGRITY-ALERT] prefix 로그

■ UI / UX
- 메인: Hero 카드(입고/출고/재고조회) + KPI 스트립(오늘 입고/출고 + 결재 대기 2카드)
- 공통: PageHeader(얇은 헤더) / BottomTabBar(floating pill, 슬라이딩 액티브)
- 알림: lib/toast.ts (success/info/error 색 구분, slide-up 애니메이션)
  - 폼 검증 실패: 인라인 에러 + toast 보조
  - 일시적 알림: toast
  - 사용자 결정 필요: 디자인된 모달 (RejectBottomSheet 등)
- 자동 로그아웃: 5분 전 상단 배너 + "로그인 연장" 버튼 (1분 이하 시 빨간 강조)
- 검색 필터 URL 쿼리 동기화 (재고 조회/신청 내역/결재 수신함, 디바운스 300ms)
- 결재 수신함 완료 탭: 카드 클릭 → 액션 시트로 승인 ↔ 반려 양방향 변경
- 로그인: 블루 헤더 + 추상 웨이브 + 카드형 작업자 목록 + iOS status bar 색(#3182F6)
- PWA: manifest + theme-color + ServiceWorker + apple-touch-icon

▸ 데이터 테이블 / 목록 화면 규칙 (2026-07-01) — "회계 사고 제로"의 연장. 숫자 오독·행 혼동이 실무 사고로 직결. **적용 범위 = `/admin` PC 데이터 화면 한정**(모바일 작업자 PWA는 이 표 규칙의 대상이 아니다). **radius는 DESIGN.md §2-5를 따른다** — 역할 토큰(`--r-control`/`--r-card`/`--r-sheet`/`--r-pill`)으로 쓰고 값은 표면별로 다르게 정의되어 있으므로, 화면에서 radius를 임의 지정하지 않는다.
- 화면 톤 — **노션풍(PC 전용).** 여백 우선(카드·테두리 최소, 구역은 여백으로 분리) / 섹션 제목은 상자가 아닌 텍스트+작은 아이콘 / select 값은 소프트 태그(은은한 배경 + 같은 계열 진한 글자, 색은 의미 있는 값에만 절제) / 화면당 콜아웃 블록 1개를 앵커로(작업목록 등 결과물 영역) / 행 hover 상호작용 필수(hover 시 은은한 배경 + 액션 hover-reveal). ※ hover-reveal·삭제 등 행 액션은 **마우스 전제**(키보드 탭 순서 제외 tabIndex=-1) — PC 관리 도구라 수용.
- 위계 — 설정(맥락) < 도구(검색 등) < 결과물(작업목록+주요 CTA) 순으로 시각 무게. solid/강조색 채운 CTA는 화면당 1개.
- 컬럼 폭 — 내용량에 비례. 균등 분할 금지(짧은 컬럼 빈 공간·긴 컬럼 잘림). 남는 폭은 실제 넓이가 필요한 컬럼(LOT번호 등)에 몰아줌. 같은 데이터를 보여주는 표끼리는 컬럼 폭·순서 통일(table-fixed + 공유 colgroup).
   - 공유 모듈 `app/admin/master/_lot-table.tsx` 신설(2026-07-01) — 3 워크리스트(가공·이동·출고)가 프리미티브 공유: NumInputHeader(입력칸 중앙 헤더)·SectionTitle + softField·numCellInput·cellField·labelClass. (NumBox는 2026-07-28 `app/admin/_num-cell.tsx`의 NumCell/NumHead로 대체·제거.) LotCols(콜그룹)는 페이지마다 컬럼이 달라(출고엔 보관처 없음) 공유 안 함 → 각 페이지 로컬(가공은 검색표↔작업표 공유용 LotCols 유지).
   - 공통 LOT 표시 계열: LotCols(PC 테이블 조각) ↔ LotCard(로드맵 Phase 1 Step 1, 모바일 카드·미착수)는 형제 — 같은 LOT 표시 shape/formatter(formatSpec·formatMisu·formatIntKo) 공유, 한 컴포넌트로 안 합침.
- 여백 — 컬럼 간 간격은 전 셀 좌우 패딩을 동일하게 주어 맞춘다. **가운데 정렬로 컬럼 간격을 맞추려 하지 말 것**(값 길이 다르면 여백 불균일·자릿수 깨짐). ※ 이 "중앙정렬 금지"는 *컬럼 간격 눈속임* 얘기 — 아래 입력칸 **헤더 중앙**(경계 상자 위 라벨)과는 별개, 서로 모순 아님.
- **숫자 컬럼(표시용) = 공통 셀 컴포넌트로만**(2026-07-28 통일) — 수량·중량·금액·단가를 보여주는 모든 `<td>`/`<th>`는 `app/admin/_num-cell.tsx`의 **`NumCell` / `NumHead`**를 쓴다. 규칙 4종: `tabular-nums` + **셀 전체 우측 정렬** + 천 단위 쉼표 + **단위는 값 뒤에 공백 없이**(`12,165,160원`·`1,000박스`·`2,450kg`). 포맷 문자열은 `lib/number-format.ts:formatNum(value, unit | {unit, decimals, maxDecimals, empty})` 단일 출처 — 화면마다 `won()`/`kg()` 같은 로컬 헬퍼를 다시 만들지 말 것.
   - 패딩·글자색은 `className`으로 넘긴다(표마다 `px-4 py-3`/`px-5 py-2.5`로 달라 컴포넌트가 강제하지 않음). 값이 없으면 `value={null}` + `empty`(기본 `-`, 화면에 따라 `—`).
   - 옛 규칙(폐지): 고정폭 상자 `NumBox`를 셀 **왼쪽**에 두고 셀 전체 우측정렬을 금지하던 방식 — 표마다 좌/우가 갈려 오히려 안 맞았다. 전 표 우측 정렬로 통일하며 `NumBox` 제거.
   - 여전히 유효: 입력칸(`numCellInput`) 헤더는 `NumInputHeader`로 **입력칸 폭 중앙**(경계 상자 위 라벨은 중앙이 정석). 규격·미수처럼 숫자로 보여도 사이즈 라벨인 값은 텍스트 취급(좌측).
   - 적용 밖: 이메일 일일정산(`lib/daily-report.ts`)·PDF·모바일 작업자 PWA·`/admin/ledger`(A4 인쇄) — 렌더러가 달라 별도 작업.
- 입력칸 컬럼(투입 수량 등) — 입력칸은 **고정폭.** 헤더는 입력칸과 같은 폭 상자에 **`text-center`로 감싸 입력칸 정중앙에 고정**(표시용 숫자의 우측선 규칙과 **의도적으로 다름** — 경계 있는 상자 위 라벨은 중앙이 정석). 입력 값 내부는 `text-right tabular-nums`로 자릿수 정렬 유지. → 한 표에 표시숫자(우측선 헤더)·입력칸(중앙 헤더) 두 헤더 처리가 공존하는 건 **의도된 구분**.
- 텍스트 컬럼(품목·보관처·LOT번호) — 좌측정렬.
- 기존 화면 수정 시 — 최소 수정 원칙(위 「개발 원칙」) 그대로. 위 규칙에 안 맞는 기존 코드를 발견해도 작업 범위 밖이면 고치지 말고 "이런 불일치가 있다"고 보고만.
   - 적용 현황(2026-07-28): **/admin 표 전체 숫자 셀 통일 완료** — 거래 이력 4종·재고 조회·재고 집계·손익 추이·매입 통계·결재 수신함·건강도·부자재·가공비 단가·가공 거래·작업 정산(목록·상세·배분)·3 워크리스트가 모두 `NumCell`/`NumHead` 또는 `.ws-page` 우측정렬 규칙을 쓴다. 검색 결과 표현은 가공만 표, 이동·출고는 리스트(기존 구조 유지 — 표 통일은 별도).

■ 운영
- Vercel 배포 (자동 빌드)
- 일일 정산 이메일 cron — 매일 09:00 KST (vercel.json)
  - 어제(입고일/출고일/이동일/지출일 기준) 승인된 건 상세 표
  - 손익 추정 (출고 판매가 합 - 입고 수매가 합 - 지출 합)
  - 결재 대기 분리 (어제 신청 / 그 외 누적) + 24h 미처리 강조
  - A4 인쇄 친화 CSS, /api/preview/daily-report (dev 전용 프리뷰)
- 운영 로거 (lib/logger.ts) — production console 노출 차단
- 운영 알림: [INTEGRITY-ALERT] / [SCHEMA-MISMATCH] prefix로 grep 추적

■ Airtable 테이블 구조
운영 7개: 작업자 / 품목마스터 / LOT별 재고 / 입고 관리 / 출고 관리 / 지출결의 / 재고 이동
마스터 4개: 보관처 마스터 / 매입처 마스터 / 보관처 비용 이력 / 선박 정보 마스터

작업자 테이블 PIN 보안 필드 (5월 추가):
- pin_hash (Long text — "scrypt:saltHex:hashHex" 형식)
- pin_fail_count (Number)
- pin_locked_until (Number — Unix ms)

LOT별 재고 상태 필드 7개 (2026-05-15 도입, 2026-05-19 코드 연결):
두 세트 — 라이프사이클(A) ⟂ 결재 워크플로우(B)
- A. 상태 + 상태사유 — LOT 데이터 라이프사이클 (lot_status / lot_status_reason)
  - 상태 옵션: 승인 대기 / 승인 완료 / 소진 / 반려 / 취소
  - 상태사유 옵션: 신규 입고 / 이동 입고 / 출고 완료 / 이동 출고 / 입고 반려 / 이동 반려 / 입고 취소 / 수동 취소
  - 갱신 트리거: 입고 승인(승인 완료/신규 입고) / 이동 승인 새 LOT(승인 완료/이동 입고) / 출고 승인으로 재고 0(소진/출고 완료) / 이동 승인으로 원본 0(소진/이동 출고) / 입고 반려(반려/입고 반려) / 이동 반려 신규 LOT(반려/이동 반려) / 출고·이동 반려로 0→복구 시 상태=승인 완료(상태사유는 보존)
- B. 승인상태 + 결정자 + 결정일시 + 반려사유 + 반려메모 — 결재 워크플로우
  - 승인상태: 승인 대기 / 승인 완료 / 반려 / 취소 (5개 테이블 통일)
  - 결정자: 작업자 link(multipleRecordLinks, 단일) — 2026-05-19 타입 변경 후 admin worker record ID로 채움. 결재 액션 수행자 추적.
  - 결정일시: ISO 8601 (new Date().toISOString())
  - 반려사유: singleSelect (수량 불일치/품질 이상/서류 미비/검역 문제/기타) — RejectBottomSheet UI 칩에서 선택. LOT.반려사유에 옵션명 그대로 저장. 입고관리/출고관리/이동.반려사유(multilineText)에는 `${code} — ${note}` 합성 텍스트.
  - 반려메모: multilineText — updateApprovalStatus(rejectReason) 자유 텍스트 그대로 저장.
- B → A 동기화: 결재 액션이 라이프사이클까지 함께 갱신 (Airtable Automation 트리거 없이 코드에서 직접 PATCH).
- 활성화: app/actions/inventory/inbound.ts(신청), app/actions/admin/admin.ts(승인/반려), app/actions/inventory/transfer.ts(이동 승인·반려). 읽는 코드는 차후 PC phase에서 활성화.

■ LOT번호 형식
YYMMDD-품목코드-규격-미수-전체일련번호
예) 260417-MC1-11-26-0001
영업일 오전 9시 기준, 전체 일련번호 (낙관적 재시도로 동시성 보호)

■ 테스트
- 단위 5 files / 103 pass: cost-calc / input-sanitize / number-format / pin-rate-limit-core / server-auth
- 통합 12 files / 45 pass — 21개 시나리오:
  - 골든패스 4 (입고/출고/이동/지출)
  - 정합성 5 (입고 반려·재승인, 출고 반려, LOT 동시성, 출고 멱등)
  - 권한·보안·검증·추가 12 (100만원 권한 / 비활성·PIN·위조 / 음수·재고초과·zod / Idempotency·양방향·PDF격리)
- npm scripts: test / test:integration / test:all
- Airtable in-memory store + fetch 모킹 + 외부(Resend/Blob/PDF/next-cache) mock

■ 환경변수
필수:
- AIRTABLE_API_KEY (PAT)
- AIRTABLE_BASE_ID
- ADMIN_SECRET (관리 API 인증)

운영 권장:
- CRON_SECRET (Vercel cron 인증)
- ALERT_EMAIL_TO, RESEND_API_KEY, ALERT_THRESHOLD (일일 보고)
- ALERT_EMAIL_FROM (기본 onboarding@resend.dev)
- NEXT_PUBLIC_BASE_URL (메일 내 대시보드 링크)

선택:
- AIRTABLE_*_TABLE (테이블명 override)
- AIRTABLE_TXN_TABLE (입출고 내역 별도 테이블)
- AIRTABLE_LOT_TO_INBOUND_FIELD (기본 "입고관리링크")

■ 현재 진행 중 (4월 메모 — 사용자 확인 필요)
- 갈치 품목코드 확정 (16건 LOT번호 미생성)
- 기존 재고 200건 비용 일괄 업데이트 (4/27 보관처 Link 통일로 일부 해결됐을 수 있음)
- 품목마스터 데이터 입력

■ 중기 목표
- 매입처/매입자/선박명 입고 폼 추가 — 부분 완료 (필드 도입됨)
- PDF 한글 폰트 임베드 — 완료 (scripts/generate-font-base64.mjs)
- PWA — 부분 완료 (manifest/theme-color/SW/iOS status bar)
- 기기별 고정 로그인 — 미진행
- 팩스 자동 발송 — 미진행
- 인라인 폼 에러 메시지화 — 부분 완료 (toast 통일까지, 인라인 정교화는 추후)

■ 장기 목표
- PostgreSQL DB 이전
- AI 데이터 분석
- 바코드 스캔 출고 (QR 스캔 도입됨, 바코드는 별도)
- 부자재 재고 확장 (포장지·아이스팩 등)
- 검색 결과 자동 트리거 (URL 복원 시 검색 자동 실행 옵션)
- LOT 일련번호 100% 동시성 (Airtable 자동번호 또는 Vercel KV 분산락)
- FIFO 평단가 시스템

■ 의도된 비범위 (재무회계 — 2026-05-28)
- 분개·전표 / 부가세 / 전자세금계산서 / 결산 — 본 ERP 개발 범위 제외
- 사유: 세법 변경 잦음, 세무 리스크 큼, 전문 회계 프로그램(더존·이카운트) 영역
- 처리: 관리회계(원가·손익)까지 자체 구현, 재무회계는 외부 회계 프로그램으로 이관
- 연결점: Phase 3 IA 4번 "원가·손익" → 하위 "외부 ERP export" (현재 미구현)
- 상세: docs/ROADMAP.md "명시적 보류 항목" 섹션

■ 개발 원칙
- 최소 수정 원칙 — 의도하지 않은 변경을 만들지 않는다.
  - 계획된 작업(Phase별 리팩토링, 새 기능 추가, 명시적 지시)은 가능
  - 작업 범위 밖의 코드는 손대지 않음
  - "이왕 손대는 김에 같이 정리할까?" 유혹을 거부
  - 잘 작동 중인 기능(테스트가 통과하는 코드)은 우선 보호
  - 리팩토링이 필요하다고 판단되면 별도 작업으로 분리해서 제안
  - 유래: AI 어시스턴트의 과잉 리팩토링 경험. 도메인 특성(LOT 재고, 결재, 회계)상 의도하지 않은 변경의 위험이 큼.
- 검증 사각지대 명시 (2026-06-11 도입) — 코드 변경마다 [테스트되지 않은 부분 / 검증되지 않은 가정 / 도그푸딩으로도 안 잡힐 사각지대]를 변경 설명에 먼저 밝힌다.
  - 목적: 사용자는 비개발자라 생성된 코드를 직접 감사할 수 없음. 안전망(테스트·도그푸딩·정합성 로그)이 닿지 않는 곳의 결함은 조용히 살아남음 → Claude가 '두 번째 눈'을 구조적으로 대신함.
  - 적용: 기능·수정 단위마다 "안 된 것 / 가정 / 사각지대" 한 줄이라도 덧붙임. 테스트는 백엔드 도메인 로직(원가·이동·정합성)에 몰려 있고 UI는 전량 손 도그푸딩이라 — UI·드문 분기·보안 엣지가 주 사각지대.
  - 유래: 2026-06-11 작업 방식 자가 점검 — 비개발자 1인 운영 모델의 구조적 위험 3종 중 #1 대응(상세: journal 2026-06-11).
- 데이터 정합성 우선
- Airtable 필드명 항상 실제 기준으로 확인
- 검증 실패 시 모니터링 모드 우선 (운영 회귀 위험 0)
- 보안 변경은 backward compatible 우선 (예: 평문 PIN → 해시 자동 마이그레이션)
- 정합성 위험 지점은 [INTEGRITY-ALERT] / [SCHEMA-MISMATCH] prefix로 로깅
- alert 대신 toast / 인라인 / 모달로 메시지 무게에 맞게 분리
- 버전 관리 (시멘틱 버저닝, 2026-06-02 도입) — `package.json` version 단일 출처(MAJOR.MINOR.PATCH). 최소 3규칙:
  1. 버전은 변경의 **종류**를 담는다(작업량 아님): PATCH=버그·소수정 / MINOR=기능·화면 추가(현 단계 기본) / **MAJOR=Phase 4 정식 출시·아키텍처 전환**(= 1.0.0).
  2. **눈에 보이는 변화가 배포될 때 1 릴리스 = bump 1회**, 등급은 그 릴리스의 최상위 변경 기준. docs·순수 리팩토링·WIP 커밋은 skip.
  3. 0.x = 정식 출시 전. 상세 추적은 `journal.md`, 버전은 거친 이정표(별도 CHANGELOG 없음).
  - 주입: `next.config.ts`→`NEXT_PUBLIC_APP_VERSION`→`lib/version.ts:APP_VERSION`→로그인 좌하단(연도 옆)·`/admin/master` 좌하단. 주요 릴리스만 `git tag vX.Y.Z`.

■ 주요 디렉터리
- app/actions/ — server action (admin/inventory/expense/my-requests/dashboard)
- app/api/ — REST API 라우트 (cron/preview/auth/admin/etc.)
- app/admin/ — 관리자 대시보드 / 결재 수신함
- app/inventory/ — 재고 조회 / 입고 / 출고 / 이동
- app/expense/ — 지출 신청 / 목록
- app/my-requests/ — 신청 내역
- components/ — 폼/모달 (InboundForm, OutboundQtyModal, ApprovalButtons 등)
- app/components/ — 페이지 전용 (SessionGuard, RejectBottomSheet, CompletedItemActionSheet)
- lib/ — 도메인 로직
  - airtable.ts / airtable-schema.ts — Airtable 어댑터
  - server-auth.ts — 권한 검증
  - pin-hash.ts / pin-rate-limit.ts (Airtable 어댑터) / pin-rate-limit-core.ts (순수 로직)
  - approval-service.ts — 결재 처리
  - lot-sequence.ts — LOT 일련번호 동시성
  - idempotency.ts — POST dedup
  - daily-report.ts / resend.ts — 일일 정산
  - storage-cost.ts — 보관처 비용 이력
  - cost-calc.ts — 출고 시점 비용·손익 계산
  - input-sanitize.ts / number-format.ts / spec-display.ts — 입력 정규화
  - logger.ts — 운영 로거
  - schemas/ — zod 스키마 (worker/product/lot/inbound/outbound/expense/storage/supplier/transfer)
- test/integration/ — 통합 테스트 21개 시나리오
