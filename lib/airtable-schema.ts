/**
 * 베이스의 테이블·필드 이름과 1:1로 맞춤 (Airtable UI 표기와 동일).
 * 테이블명은 .env.local 의 AIRTABLE_WORKERS_TABLE 등으로 덮어쓸 수 있음.
 */
export const AIRTABLE_TABLE = {
  // 2026-07-31: "작업자" → "사용자"로 리네임. DESIGN.md §8-2 "작업자는 역할명(WORKER) 전용" 원칙과
  // 정합 — 이 테이블은 WORKER뿐 아니라 ADMIN·MASTER 계정도 담아 "작업자"라는 이름이 부정확했다.
  // Airtable 쪽 테이블명도 동시에 "사용자"로 변경(자동화 없음, 참조는 이 상수 한 곳뿐 확인됨).
  workers: "사용자",
  products: "품목마스터",
  lots: "LOT별 재고",
  txn: "입출고 내역",
  storageCostHistory: "보관처 비용 이력",
  suppliers: "매입처 마스터",
  inbound: "입고 관리",
  outbound: "출고 관리",
  expense: "지출결의",
  transfer: "재고 이동",
  storageMaster: "보관처 마스터",
  ships: "선박 정보 마스터",
  materials: "부자재·경비 마스터",
  processingRates: "가공비 단가",
  processingBatch: "가공 거래",
  processingInput: "가공 투입",
  /** 작업 정산 등록 (원물 동결 정산서형 매입·원가 폼) — 헤더/생산내역/작업비 3종 */
  workSettlement: "작업 정산",
  workSettlementLine: "작업 정산 생산내역",
  workSettlementCost: "작업 정산 작업비",
} as const;

/** 작업자 테이블 필드 */
export const WORKER_FIELDS = {
  name: "작업자명",
  pin: "PIN",
  active: "활성",
  role: "권한",
  // 인사 정보 (2026-07-31 추가) — 소속·직급은 지출결의 신청자 정보 lookup 원천이기도 하다.
  affiliation: "소속",
  position: "직급",
  hireDate: "입사일",
  birthDate: "출생일",
  terminationDate: "퇴사일",
  phone: "연락처",
  emergencyPhone: "비상연락처",
  memo: "메모",
} as const;

/** LOT별 재고 테이블 필드 */
export const LOT_FIELDS = {
  lotNumber: "LOT번호",
  /** 품목 마스터로 연결되는 링크 필드 */
  productLink: "품목",
  /** LOT에 직접 저장/룩업된 규격 필드(베이스별 실제 이름과 일치 필요) */
  spec: "규격표시",
  detailSpec: "상세규격_표기",
  /** 박스 단위 단일화된 재고수량 */
  stockQty: "재고수량",
  /** LOT에 텍스트로 계산/룩업된 현재고(옵션) */
  stockText: "현재고",
  approvalStatus: "승인상태",
  /** 입고 시 선택 입력 (Airtable에 동일 필드명 필요) */
  purchasePrice: "수매가",
  /** kg·박스 등 단가(원). 없으면 UI에서 수매가÷총중량 등으로 계산 가능 */
  unitPrice: "단가",
  memo: "비고",
  /** 보관처명 — 보관처 비용 이력 테이블과 조인 키 */
  storage: "보관처",
  /** LOT 최초 입고일 YYYY-MM-DD — 비용 이력 적용 기준 */
  firstInboundDate: "최초입고일",
  /** 재고 이동 승인일 (이동 안 된 LOT는 최초입고일과 동일) — 누적 경비 계산 기준 */
  transferInboundDate: "이동입고일",
  /** 입고 승인 시 보관처 비용 이력에서 읽어 저장하는 냉장료 단가 */
  refrigerationFeePerUnit: "냉장료단가",
  /** 출고시점 단가 계산용 총중량 */
  totalWeight: "총중량",
  /** LOT에 저장/룩업된 입출고비 단가 */
  inOutFeeStored: "입출고비",
  /** LOT에 저장/룩업된 노조비 단가 */
  unionFeeStored: "노조비",
  /** LOT에 저장/룩업된 동결비 단가 */
  freezeFeeStored: "동결비",
  /** 이전 보관처에서 발생한 누적 경비 (이동 시 비례 분할 저장) */
  carriedRefrigeration: "이월냉장료",
  carriedInOutFee: "이월입출고비",
  carriedUnionFee: "이월노조비",
  carriedFreezeFee: "이월동결비",
  /** 판매 원가 */
  salePrice: "판매원가",
} as const;

/** 품목 마스터 테이블 필드 */
export const PRODUCT_FIELDS = {
  name: "품목명",
  /** 원물/가공품 등 품목 구분 (선택) */
  category: "품목 구분",
  spec: "규격표시",
  detailSpec: "상세규격_표기",
  baseUnit: "기준단위_라벨",
  detailUnit: "상세단위_라벨",
  detailPerBase: "기준1당_상세수량",
} as const;

/** 보관처 비용 이력 테이블 필드 */
export const STORAGE_COST_FIELDS = {
  /** 보관처명 (텍스트 또는 링크 룩업) */
  storage: "보관처명",
  startDate: "적용시작일",
  endDate: "적용종료일",
  refrigerationFee: "냉장료",
  inOutFee: "입출고비",
  unionFee: "노조비",
  /** ⚠ 라이브 '보관처 비용 이력'엔 단일 "동결비"가 없고 박스종류별 3열로 분리돼 있음.
   *  동결비는 아래 박스종류별 3키로 읽어야 정확(작업 정산: 구분→해당 열). 이 단일 키는
   *  storage-cost.ts:getStorageCostForLot가 여전히 참조 중 → 해당 보관처는 null로 빠질 수 있어
   *  별도 확인 필요(2026-07-14 발견). */
  freezeFee: "동결비",
  /** 박스종류별 동결비 (보관처×기간별 단가) — 작업 정산 구분(사료팬/베이트大/베이트小)과 매핑 */
  freezeFeePan: "동결비 (팬)",
  freezeFeeBaitLarge: "동결비 (베이트大)",
  freezeFeeBaitSmall: "동결비 (베이트小)",
} as const;

/** 승인상태 필드값 — 이 문구일 때 화면에 승인 대기 표시 */
export const LOT_PENDING_APPROVAL_EXACT = "승인 대기 중";

/** 입고 관리 테이블 필드 */
export const INBOUND_FIELDS = {
  /** 입고일자 (현재 표준) */
  date: "입고일",
  /** 일부 베이스 변형 (구) */
  dateLegacy: "입고일자",
  /** LOT별 재고에서 룩업된 LOT번호 */
  lotNumber: "LOT번호",
  /** 품목마스터 link */
  productLink: "품목마스터",
  /** 일부 베이스 변형 (구) */
  productLinkLegacy: "품목",
  /** 작업자 (입고 신청자) link */
  worker: "작업자",
  /** 매입자 (작업자 link — 원물을 매입한 사람) */
  purchaser: "매입자",
  /** 매입처 마스터 link */
  supplier: "매입처",
  /** 보관처 마스터 link */
  storage: "보관처",
  spec: "규격",
  detailSpec: "미수",
  origin: "원산지",
  shipName: "선박명",
  memo: "비고",
  quantity: "입고수량",
  quantityBox: "입고수량(BOX)",
  remainingQty: "잔여수량",
  purchasePrice: "수매가",
  approvalStatus: "승인상태",
  rejectReason: "반려사유",
  /** 입고증 PDF 저장 URL */
  pdfUrl: "입고증URL",
} as const;

/** 출고 관리 테이블 필드 */
export const OUTBOUND_FIELDS = {
  date: "출고일",
  /** 입고 관리 link (LOT 차감 대상) */
  inboundLink: "입고관리",
  /** 입고관리.LOT번호 룩업 */
  lotNumber: "LOT번호",
  /** LOT별 재고 record ID (텍스트 저장, 차감 시 사용) */
  lotRecordId: "LOT재고레코드ID",
  /** 출고 신청 수량 (반려해도 유지) */
  requestedQty: "출고요청수량",
  worker: "작업자",
  storage: "보관처",
  seller: "판매처",
  salePrice: "판매가",
  /** formula: 판매가 × 출고요청수량 */
  saleAmount: "판매금액",
  spec: "규격",
  detailSpec: "미수",
  origin: "원산지",
  approvalStatus: "승인상태",
  rejectReason: "반려사유",
  pdfUrl: "출고증URL",
  /** 출고 승인 시 스냅샷되는 비용 7필드 (LOT 평균단가 기반) */
  snapshotUnitPrice: "출고시점 단가",
  snapshotRefrigerationFee: "출고시점 냉장료",
  snapshotInOutFee: "출고시점 입출고비",
  snapshotUnionFee: "출고시점 노조비",
  snapshotFreezeFee: "출고시점 동결비",
  snapshotSalePrice: "출고시점 판매원가",
  snapshotProfit: "출고시점 손익",
  receipt: "영수증사진",
} as const;

/** 지출결의 테이블 필드 */
export const EXPENSE_FIELDS = {
  expenseDate: "지출일",
  createdDate: "작성일",
  /** 건명 (현재 표준) */
  title: "건명",
  /** 일부 베이스 변형 (구) */
  titleLegacy: "항목명",
  description: "적요",
  amount: "금액",
  approvalStatus: "승인상태",
  /** 일부 베이스 변형 (구) */
  approvalStatusLegacy: "결재상태",
  rejectReason: "반려사유",
  /** 작업자 link (신청자) */
  applicant: "신청자",
  department: "소속",
  position: "직급",
  receipt: "영수증사진",
  /** 지출결의서 PDF 저장 URL */
  pdfUrl: "지출결의서URL",
} as const;

/** 재고 이동 테이블 필드 */
export const TRANSFER_FIELDS = {
  date: "이동일",
  quantity: "이동수량",
  /** 원본 LOT별 재고 link */
  originalLotLink: "원본 LOT번호",
  /** 이동 전 보관처 마스터 link */
  fromStorage: "이동 전 보관처",
  /** 이동 후 보관처 마스터 link */
  toStorage: "이동 후 보관처",
  worker: "작업자",
  approvalStatus: "승인상태",
  rejectReason: "반려사유",
  /** 이동 출고증 PDF URL (2026-05-19 신설) */
  pdfUrl: "출고증 URL",
} as const;

/** 보관처 마스터 테이블 필드 */
export const STORAGE_FIELDS = {
  name: "보관처명",
  /** 자사창고/외부창고/가공공장/기타 — 입출고증 발행 주체 분기(isOwnStorage) 기준. (2026-05-19) */
  kind: "구분",
} as const;

/** 매입처 마스터 테이블 필드 */
export const SUPPLIER_FIELDS = {
  name: "매입처명",
} as const;

/** 작업 정산 (헤더) 테이블 필드 — 설계: docs/작업정산등록-설계.md */
export const WORK_SETTLEMENT_FIELDS = {
  /** WS-YYMMDD-#### (primary) */
  no: "정산번호",
  date: "작업일",
  /** 작업 장소 (보관처 마스터 link) */
  workplace: "작업장",
  fishingArea: "조업해구",
  /** 먹이유무 singleSelect: O / X */
  hasFeed: "먹이유무",
  freshness: "선도",
  /** 선박 정보 마스터 link */
  ship: "선박명",
  /** 매입처 마스터 link (정산 주체) */
  supplier: "매입처",
  startTime: "시작시각",
  endTime: "종료시각",
  /** 원물 통짜 catch 총액 (수수료 3.3% 기준·검산) */
  catchAmount: "어대금",
  /** singleSelect: 임시저장 / 확정 / 취소 */
  status: "상태",
  worker: "작업자",
  memo: "비고",
} as const;

/** 작업 정산 생산내역 (라인) 테이블 필드 — 1줄 → 입고관리+LOT 스포너 */
export const WORK_SETTLEMENT_LINE_FIELDS = {
  /** 정산번호-N (primary) */
  lineId: "라인ID",
  /** 헤더 link */
  settlement: "작업 정산",
  /** 헤더 record ID 텍스트 (결정적 조회 키) */
  settlementId: "정산ID",
  /** 품목마스터 link */
  productLink: "품목",
  productName: "품목명",
  /** singleSelect: 사료팬 / 베이트大 / 베이트小 (동결비 3열 대응) */
  boxType: "구분",
  /** 지방도 % (값어치 어종만) */
  fatRatio: "지방도",
  spec: "규격",
  detailSpec: "미수",
  weightKg: "중량kg",
  /** 박스수 — 작업단가 분모 */
  quantity: "수량",
  /** 박스당 순수 매입가 → 입고관리.수매가 */
  purchaseUnitPrice: "수매단가",
  /** 수매단가 × 수량 */
  amount: "금액",
  /** 수매단가 + 작업단가 (확정 스냅샷) → LOT.수매가 */
  actualUnitPrice: "실단가",
  /** 실단가 × 수량 */
  actualAmount: "실금액",
  /** singleSelect: 원물동결 / 원프로즌 가공 / 생물 (매입 통계 세그먼트) */
  usage: "용도",
  /** 용도별 보관처/가공공장/판매처 (보관처 마스터 link) → LOT.보관처 */
  destination: "행선지",
  memo: "비고",
  /** 확정 시 생성된 입고 관리 link */
  inboundLink: "입고관리",
  /** 확정 시 생성된 LOT별 재고 link */
  lotLink: "LOT",
} as const;

/** 작업 정산 작업비 (라인) 테이블 필드 — Σ금액 ÷ 총박스수 = 작업단가 */
export const WORK_SETTLEMENT_COST_FIELDS = {
  /** primary */
  itemId: "항목ID",
  /** 헤더 link */
  settlement: "작업 정산",
  /** 헤더 record ID 텍스트 (결정적 조회 키) */
  settlementId: "정산ID",
  /** singleSelect: 수수료/노임/운임/동결비/입출고비/박스/내피/탈펜료/기타 */
  group: "그룹",
  itemName: "항목명",
  count: "회수",
  unitPrice: "단가",
  /** 회수 × 단가 (또는 수동) */
  amount: "금액",
  payee: "지급처",
  memo: "비고",
} as const;
