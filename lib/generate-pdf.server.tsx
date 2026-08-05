/**
 * 서버 전용 PDF 생성 유틸리티
 * @react-pdf/renderer v4 renderToBuffer 사용
 * Next.js 서버 액션에서만 호출할 것 (클라이언트 번들 포함 금지)
 *
 * 이 파일은 입고증·출고증·지출결의서 PDF를 A4 용지 형태로 만들어줍니다.
 * 관리자가 승인하면 자동으로 PDF가 생성되어 Vercel Blob에 저장됩니다.
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { NOTO_SANS_KR_REGULAR, NOTO_SANS_KR_BOLD } from "./fonts-base64";
import { getBaseUrl } from "./base-url";
import { getCompanyInfo } from "./company-info";
import { logWarn } from "./logger";

// prebuild 스크립트가 폰트를 base64 data URI 상수로 번들에 포함시킵니다.
// 파일 시스템 접근이 없으므로 Vercel 서버리스에서도 안정적으로 동작합니다.
Font.register({
  family: "NotoSansKR",
  fonts: [
    { src: NOTO_SANS_KR_REGULAR, fontWeight: "normal" },
    { src: NOTO_SANS_KR_BOLD, fontWeight: "bold" },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

// PDF 문서 전체에서 공통으로 사용하는 스타일 정의
const s = StyleSheet.create({
  page: { padding: 48, fontFamily: "NotoSansKR", fontSize: 10, color: "#111" },
  title: {
    fontSize: 28,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 36,
    letterSpacing: 4,
  },
  // 내용을 담는 표 전체 테두리
  table: { borderTop: "1pt solid #333", borderLeft: "1pt solid #333" },
  row: { flexDirection: "row" },
  // 표 왼쪽 열(항목 이름): 회색 배경으로 강조 — 단일 컬럼 표(28/72) 용
  th: {
    width: "28%",
    backgroundColor: "#f5f5f5",
    fontWeight: "bold",
    padding: "6pt 8pt",
    borderRight: "1pt solid #333",
    borderBottom: "1pt solid #333",
    textAlign: "center",
  },
  // 표 오른쪽 열(실제 값) — 단일 컬럼 표(28/72) 용
  td: {
    width: "72%",
    padding: "6pt 8pt",
    borderRight: "1pt solid #333",
    borderBottom: "1pt solid #333",
  },
  // 4컬럼 2-윈 표(라벨-값-라벨-값) 용 라벨 셀 — 18%
  thHalf: {
    width: "18%",
    backgroundColor: "#f5f5f5",
    fontWeight: "bold",
    padding: "6pt 8pt",
    borderRight: "1pt solid #333",
    borderBottom: "1pt solid #333",
    textAlign: "center",
  },
  // 4컬럼 2-윈 표 값 셀 — 32%
  tdHalf: {
    width: "32%",
    padding: "6pt 8pt",
    borderRight: "1pt solid #333",
    borderBottom: "1pt solid #333",
  },
  // 비고 full-width 행: 라벨 18% + 값 82%
  tdFull: {
    width: "82%",
    padding: "6pt 8pt",
    borderRight: "1pt solid #333",
    borderBottom: "1pt solid #333",
  },
  // 표 사이 / 표 ↔ QR 사이 구분선 (회사 정보 푸터와 동일 톤)
  divider: {
    marginTop: 18,
    paddingTop: 18,
    borderTop: "0.5pt solid #ccc",
  },
  footer: { marginTop: 40, textAlign: "center", color: "#777", fontSize: 9 },
});

// ───────────────────────────── 입고증 ────────────────────────────────────

/** 입고증 PDF에 들어갈 데이터 필드 정의 */
export type InboundPdfData = {
  lotNumber: string;               // LOT 번호
  productName: string;             // 품목명
  spec: string;                    // 규격 (단위: kg)
  detailSpec: string;              // 미수 (단위: 미)
  quantity: string | number;       // 입고수량 (단위: ct)
  storage: string;                 // 보관처
  origin: string;                  // 원산지
  purchasePrice: string | number;  // 수매가
  date: string;                    // 입고일자
  requester: string;               // 입고자명 (입고 신청한 작업자)
  supplier: string;                // 매입처
  purchaser: string;               // 매입자
  shipName: string;                // 선박명
  memo: string;                    // 비고
};

function formatSpec(spec: string): string {
  const t = spec?.trim();
  if (!t) return "-";
  return /[a-zA-Z가-힣]/.test(t) ? t : `${t}kg`;
}

function formatMisu(misu: string): string {
  const t = misu?.trim();
  if (!t) return "-";
  return /[가-힣]/.test(t) ? t : `${t}미`;
}

function formatQuantity(qty: string | number): string {
  if (qty == null || qty === "") return "-";
  const n = Number(qty);
  if (!Number.isFinite(n) || n <= 0) return String(qty);
  return `${n.toLocaleString("ko-KR")}ct`;
}

function formatPrice(price: string | number): string {
  if (price == null || price === "") return "-";
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return `${n.toLocaleString("ko-KR")} 원`;
}

function CompanyFooter() {
  const c = getCompanyInfo();
  if (!c.name && !c.address && !c.phone) return null;

  const line1 = [c.name, c.representative && `대표자 ${c.representative}`]
    .filter(Boolean)
    .join("  |  ");
  const line2 = c.businessNumber ? `사업자등록번호 ${c.businessNumber}` : "";
  const line3 = c.address;
  const contactParts: string[] = [];
  if (c.phone) contactParts.push(`T. ${c.phone}`);
  if (c.fax) contactParts.push(`F. ${c.fax}`);
  if (c.email) contactParts.push(c.email);
  const line4 = contactParts.join("  |  ");

  // QR ↔ 회사 정보 간격이 너무 멀어 어색하다는 피드백 반영:
  // bottom을 110pt로 올려 QR과의 거리를 절반(~115pt)으로 축소.
  // 좌우는 페이지 padding(48pt)과 동일하게 맞춰 표↔QR divider와
  // 구분선 좌우 길이를 통일 (absolute는 page border 기준이라 직접 지정 필요).
  return (
    <View
      style={[
        s.divider,
        {
          position: "absolute",
          left: 48,
          right: 48,
          bottom: 110,
          marginTop: 0,
          alignItems: "center",
        },
      ]}
      fixed
    >
      {line1 && (
        <Text style={{ fontSize: 10, color: "#333", fontWeight: "bold", marginBottom: 4 }}>
          {line1}
        </Text>
      )}
      {line2 && (
        <Text style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{line2}</Text>
      )}
      {line3 && (
        <Text style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{line3}</Text>
      )}
      {line4 && (
        <Text style={{ fontSize: 10, color: "#666" }}>{line4}</Text>
      )}
    </View>
  );
}

/** 4컬럼 2-윈 표의 한 행: 좌측(라벨-값) + 우측(라벨-값) 짝지음 */
type PairRow = [
  [string, string], // 좌측
  [string, string] | null, // 우측 (null이면 빈 셀)
];

/**
 * 입고증 PDF 레이아웃 컴포넌트
 *
 * 표1(상품/재고 정보 10필드, 4컬럼 2-윈) + 표2(거래 정보 + 비고 full-width)
 * + 표↔QR 구분선 + QR + QR↔회사 구분선 + 회사 정보 푸터.
 */
function InboundPDF({ data, qrDataUrl }: { data: InboundPdfData; qrDataUrl?: string }) {
  const primary: PairRow[] = [
    [["입고일", data.date || "-"], ["LOT 번호", data.lotNumber || "-"]],
    [["입고자", data.requester || "-"], ["품목명", data.productName || "-"]],
    [["규격", formatSpec(data.spec)], ["미수", formatMisu(data.detailSpec)]],
    [["입고수량", formatQuantity(data.quantity)], ["원산지", data.origin || "-"]],
    [["수매가", formatPrice(data.purchasePrice)], ["보관처", data.storage || "-"]],
  ];

  const secondaryPairs: PairRow[] = [
    [["매입처", data.supplier || "-"], ["매입자", data.purchaser || "-"]],
    [["선박명", data.shipName || "-"], null],
  ];

  const renderPairRow = ([left, right]: PairRow, idx: number) => (
    <View key={idx} style={s.row}>
      <View style={s.thHalf}>
        <Text>{left[0]}</Text>
      </View>
      <View style={s.tdHalf}>
        <Text>{left[1]}</Text>
      </View>
      <View style={s.thHalf}>
        <Text>{right ? right[0] : ""}</Text>
      </View>
      <View style={s.tdHalf}>
        <Text>{right ? right[1] : ""}</Text>
      </View>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>입 고 증</Text>

        <View style={s.table}>{primary.map(renderPairRow)}</View>

        <View style={{ marginTop: 14 }}>
          <View style={s.table}>
            {secondaryPairs.map(renderPairRow)}
            {/* 비고: 4컬럼이 아닌 full-width 별행 */}
            <View style={s.row}>
              <View style={s.thHalf}>
                <Text>비고</Text>
              </View>
              <View style={s.tdFull}>
                <Text>{data.memo || "-"}</Text>
              </View>
            </View>
          </View>
        </View>

        {qrDataUrl && (
          <View style={[s.divider, { alignItems: "center" }]}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image에는 alt prop이 없음 */}
            <Image src={qrDataUrl} style={{ width: 90, height: 90 }} />
            <Text style={{ marginTop: 4, fontSize: 8, color: "#999" }}>
              QR코드를 스캔하면 LOT 정보를 확인할 수 있습니다
            </Text>
          </View>
        )}

        <CompanyFooter />
      </Page>
    </Document>
  );
}

// ───────────────────────────── 출고증 ────────────────────────────────────

/** 출고증 PDF에 들어갈 데이터 필드 정의 */
export type OutboundPdfData = {
  lotNumber: string;              // LOT 번호
  productName: string;            // 품목명
  spec: string;                   // 규격 (단위: kg)
  detailSpec: string;             // 미수 (단위: 미)
  quantity: string | number;      // 출고수량 (단위: ct)
  origin: string;                 // 원산지
  storage: string;                // 보관처 (출고하는 LOT의 출발 보관처)
  buyer: string;                  // 판매처 (일반 출고) / 이동처 (이동 출고증)
  date: string;                   // 출고일
  requester: string;              // 출고자명 (출고 신청한 작업자)
  memo: string;                   // 비고 (입고관리.비고 lookup)
};

/**
 * 출고증 PDF 레이아웃 컴포넌트 (입고증과 동일 패턴 — 5/20 통일)
 *
 * 표1(LOT/거래 정보 10필드, 4컬럼 2-윈 5행) + 표2(비고 full-width)
 * + 표↔QR 구분선 + QR + QR↔회사 구분선 + 회사 정보 푸터.
 *
 * isTransfer = true (자사창고 → 외부/가공공장 이동 출고증):
 *   - 표1 5행 좌측 "판매처" 라벨이 "이동처"로 변경
 *   - 보관처는 출발지(원본 LOT 위치) 그대로 표시
 */
function OutboundPDF({
  data,
  qrDataUrl,
  isTransfer = false,
}: {
  data: OutboundPdfData;
  qrDataUrl?: string;
  isTransfer?: boolean;
}) {
  const primary: PairRow[] = [
    [["출고일", data.date || "-"], ["LOT 번호", data.lotNumber || "-"]],
    [["출고자", data.requester || "-"], ["품목명", data.productName || "-"]],
    [["규격", formatSpec(data.spec)], ["미수", formatMisu(data.detailSpec)]],
    [["출고수량", formatQuantity(data.quantity)], ["원산지", data.origin || "-"]],
    [[isTransfer ? "이동처" : "판매처", data.buyer || "-"], ["보관처", data.storage || "-"]],
  ];

  const renderPairRow = ([left, right]: PairRow, idx: number) => (
    <View key={idx} style={s.row}>
      <View style={s.thHalf}>
        <Text>{left[0]}</Text>
      </View>
      <View style={s.tdHalf}>
        <Text>{left[1]}</Text>
      </View>
      <View style={s.thHalf}>
        <Text>{right ? right[0] : ""}</Text>
      </View>
      <View style={s.tdHalf}>
        <Text>{right ? right[1] : ""}</Text>
      </View>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>출 고 증</Text>

        <View style={s.table}>{primary.map(renderPairRow)}</View>

        <View style={{ marginTop: 14 }}>
          <View style={s.table}>
            <View style={s.row}>
              <View style={s.thHalf}>
                <Text>비고</Text>
              </View>
              <View style={s.tdFull}>
                <Text>{data.memo || "-"}</Text>
              </View>
            </View>
          </View>
        </View>

        {qrDataUrl && (
          <View style={[s.divider, { alignItems: "center" }]}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image에는 alt prop이 없음 */}
            <Image src={qrDataUrl} style={{ width: 90, height: 90 }} />
            <Text style={{ marginTop: 4, fontSize: 8, color: "#999" }}>
              QR코드를 스캔하면 LOT 정보를 확인할 수 있습니다
            </Text>
          </View>
        )}

        <CompanyFooter />
      </Page>
    </Document>
  );
}

// ───────────────────────────── 지출결의서 ────────────────────────────────

/** 지출결의서 PDF에 들어갈 데이터 필드 정의 */
export type ExpensePdfData = {
  createdDate: string;           // 작성일
  requester: string;             // 신청자
  dept: string;                  // 소속
  position: string;              // 직급
  expenseDate: string;           // 지출일
  title: string;                 // 항목명(건명)
  amount: string | number;       // 금액
  description: string;           // 적요 (지출 내용 설명)
  approvalStatus: string;        // 승인상태
};

// 지출결의서 전용 스타일 (결재란 레이아웃)
const expense = StyleSheet.create({
  approvalRow: {
    flexDirection: "row",
    justifyContent: "flex-end", // 결재란을 오른쪽에 배치
    marginBottom: 20,
  },
  // 결재란 첫 번째~두 번째 박스 (담당, 검토): 왼쪽·위·아래 테두리만
  approvalBox: {
    width: 56,
    borderTop: "1pt solid #333",
    borderLeft: "1pt solid #333",
    borderBottom: "1pt solid #333",
  },
  // 결재란 마지막 박스 (승인): 네 면 모두 테두리
  approvalBoxLast: {
    width: 56,
    border: "1pt solid #333",
  },
  approvalHeader: {
    fontSize: 8,
    textAlign: "center",
    borderBottom: "1pt solid #333",
    padding: "3pt 0",
    backgroundColor: "#f5f5f5",
  },
  approvalBody: { height: 36 }, // 서명 공간
});

/**
 * 지출결의서 PDF 레이아웃 컴포넌트
 * 오른쪽 상단에 결재란(담당/검토/승인)이 있고, 그 아래 지출 내용 표를 출력합니다.
 */
function ExpensePDF({ data }: { data: ExpensePdfData }) {
  const rows: [string, string][] = [
    ["작성일", data.createdDate],
    ["신청자", data.requester],
    ["소속", data.dept],
    ["직급", data.position],
    ["지출일", data.expenseDate],
    ["항목명", data.title],
    [
      "금액",
      data.amount ? `${Number(data.amount).toLocaleString("ko-KR")} 원` : "-",
    ],
    ["적요", data.description],
    ["승인상태", data.approvalStatus],
  ];

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>지출 결의서</Text>

        {/* 결재란: 담당 / 검토 / 승인 세 칸 */}
        <View style={expense.approvalRow}>
          {["담당", "검토"].map((label) => (
            <View key={label} style={expense.approvalBox}>
              <Text style={expense.approvalHeader}>{label}</Text>
              <View style={expense.approvalBody} />
            </View>
          ))}
          <View style={expense.approvalBoxLast}>
            <Text style={expense.approvalHeader}>승인</Text>
            <View style={expense.approvalBody} />
          </View>
        </View>

        {/* 내용 테이블 */}
        <View style={s.table}>
          {rows.map(([label, value]) => (
            <View key={label} style={s.row}>
              <View style={s.th}>
                <Text>{label}</Text>
              </View>
              <View style={s.td}>
                <Text>{value || "-"}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={s.footer}>
          위와 같이 지출 결의서를 제출하오니 승인하여 주시기 바랍니다.
        </Text>
      </Page>
    </Document>
  );
}

// ───────────────────────────── 내보내기 ──────────────────────────────────

/**
 * 입고증 PDF를 생성하여 Buffer(바이너리 데이터)로 반환합니다.
 * LOT 번호를 QR코드로 변환해 PDF 하단에 삽입합니다.
 * 반환된 Buffer는 Vercel Blob에 업로드됩니다.
 */
export async function generateInboundPdf(data: InboundPdfData): Promise<Buffer> {
  // LOT 번호 → QR 코드 PNG data URL 생성
  let qrDataUrl: string | undefined;
  if (data.lotNumber) {
    try {
      const qrContent = `${getBaseUrl()}/lot/${encodeURIComponent(data.lotNumber)}`;
      qrDataUrl = await QRCode.toDataURL(qrContent, {
        errorCorrectionLevel: "M",
        width: 300,
        margin: 2,
      });
    } catch (e) {
      logWarn("[generateInboundPdf] QR 코드 생성 실패 (PDF는 계속 생성):", e);
    }
  }
  return renderToBuffer(<InboundPDF data={data} qrDataUrl={qrDataUrl} />) as Promise<Buffer>;
}

/**
 * 출고증 PDF를 생성하여 Buffer(바이너리 데이터)로 반환합니다.
 * LOT 번호를 QR코드로 변환해 PDF에 삽입합니다.
 *
 * @param isTransfer 자사창고 → 외부/가공공장 이동 출고증이면 true
 *                   (라벨 "판매처"→"이동처", 판매금액 행 미표시)
 */
export async function generateOutboundPdf(
  data: OutboundPdfData,
  isTransfer = false,
): Promise<Buffer> {
  let qrDataUrl: string | undefined;
  if (data.lotNumber) {
    try {
      const qrContent = `${getBaseUrl()}/lot/${encodeURIComponent(data.lotNumber)}`;
      qrDataUrl = await QRCode.toDataURL(qrContent, {
        errorCorrectionLevel: "M",
        width: 300,
        margin: 2,
      });
    } catch (e) {
      logWarn("[generateOutboundPdf] QR 코드 생성 실패 (PDF는 계속 생성):", e);
    }
  }
  return renderToBuffer(
    <OutboundPDF data={data} qrDataUrl={qrDataUrl} isTransfer={isTransfer} />,
  ) as Promise<Buffer>;
}

/**
 * 지출결의서 PDF를 생성하여 Buffer(바이너리 데이터)로 반환합니다.
 */
export async function generateExpensePdf(data: ExpensePdfData): Promise<Buffer> {
  return renderToBuffer(<ExpensePDF data={data} />) as Promise<Buffer>;
}
