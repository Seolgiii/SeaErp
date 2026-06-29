"use server";
import { log, logError, logWarn } from '@/lib/logger';

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { AuthError, requireWorker } from "@/lib/server-auth";
import { InputValidationError, sanitizeText } from "@/lib/input-sanitize";
import { fetchAirtable, createAirtableRecord } from "@/lib/airtable";

export type ExpenseCreatePayload = {
  /** 신청자 record ID — 서버에서 권한 검증 */
  applicantRecordId: string;
  date?: string;
  title?: string;
  description?: string;
  amount?: number | string;
  isCorpCard?: boolean;
  remarks?: string;
  receiptUrl?: string;
  /** 미사용 필드 (호환성용) */
  applicant?: string;
  dept?: string;
  position?: string;
};

// 인원 정보 가져오기
export async function getApplicantInfo(name: string) {
  try {
    const data = await fetchAirtable(
      `작업자?filterByFormula={작업자명}='${name}'`
    );
    log("getApplicantInfo response", {
      recordsCount: data.records?.length ?? 0,
      firstRecordId: data.records?.[0]?.id ?? null,
    });
    const record = data.records?.[0];
    if (!record) {
      logWarn("getApplicantInfo no record found", { name });
      return null;
    }
    return { ...record.fields, _recordId: record.id };
  } catch (error) {
    logError("getApplicantInfo failed", error);
    return null;
  }
}

// 지출결의 신청
export async function createExpenseRecord(formData: ExpenseCreatePayload) {
  try {
    const expenseDate = typeof formData.date === "string" ? formData.date.trim() : "";
    const createdDate = new Date().toISOString().split("T")[0];
    const rawApplicantId =
      typeof formData.applicantRecordId === "string" ? formData.applicantRecordId.trim() : "";

    // 신청자 권한 검증 (Airtable 조회 — 활성 작업자 확인)
    let applicantRecordId: string;
    try {
      const verified = await requireWorker(rawApplicantId);
      applicantRecordId = verified.id;
    } catch (e) {
      if (e instanceof AuthError) {
        logWarn("[createExpenseRecord] 권한 거부:", e.code, e.message);
        return { success: false, error: e.message };
      }
      throw e;
    }

    // 자유 텍스트 필드 정규화·길이 검사 (건명 50 / 적요 500 / 비고 200자)
    let title: string;
    let description: string;
    let remarks: string;
    try {
      title = sanitizeText(formData.title, "expenseTitle", "건명");
      description = sanitizeText(formData.description, "expenseDescription", "적요");
      remarks = sanitizeText(formData.remarks, "expenseRemarks", "비고");
    } catch (e) {
      if (e instanceof InputValidationError) return { success: false, error: e.message };
      throw e;
    }

    const created = await createAirtableRecord("지출결의", {
      "지출일": expenseDate,
      "작성일": createdDate,
      "건명": title,
      "적요": description,
      "금액": Number(formData.amount),
      "법인카드 사용 유무": formData.isCorpCard ? "유" : "무",
      "비고": remarks,
      "승인상태": "승인 대기",
      "신청자": [applicantRecordId],
      "영수증사진": formData.receiptUrl ? [{ url: formData.receiptUrl }] : [],
      // ... 기타 필드
    });

    revalidatePath("/expense/list");
    revalidatePath("/admin/dashboard");
    // expenseRecordId 반환 (PC 직접 등록의 즉시 승인 연쇄에 사용; 기존 호출부는 무시)
    return { success: true, expenseRecordId: created.id };
  } catch (error) {
    logError("createExpenseRecord unexpected error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "지출 저장 중 오류가 발생했습니다.",
    };
  }
}

// 이미지 업로드 (현재 페이지에서는 /api/upload-receipt 직접 호출 방식으로 대체됨)
export async function uploadReceipt(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) {
    logError("[uploadReceipt] file이 없습니다. 서버 액션 body 크기 제한(1MB)을 초과했을 수 있습니다.");
    return { success: false, url: null };
  }
  try {
    const blob = await put(`receipts/${Date.now()}-${file.name}`, file, { access: "public" });
    return { success: true, url: blob.url };
  } catch (error) {
    logError("[uploadReceipt] Blob 업로드 실패:", error);
    return { success: false, url: null };
  }
}
