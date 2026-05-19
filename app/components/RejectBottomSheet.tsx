"use client";

import { useState, useEffect } from "react";

const REJECT_REASONS = [
  "수량 불일치",
  "품질 이상",
  "서류 미비",
  "검역 문제",
  "기타",
] as const;

type RejectReasonCode = (typeof REJECT_REASONS)[number];

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reasonCode: string, reasonNote: string) => void;
  requesterName: string;
}

export default function RejectBottomSheet({ isOpen, onClose, onSubmit, requesterName }: RejectModalProps) {
  const [reasonCode, setReasonCode] = useState<RejectReasonCode | "">("");
  const [reasonNote, setReasonNote] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // 새로 열릴 때마다 입력 초기화
      setReasonCode("");
      setReasonNote("");
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 옵션이 선택돼야 확인 가능. "기타"는 추가로 메모 필수.
  const canSubmit =
    reasonCode !== "" && (reasonCode !== "기타" || reasonNote.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-md rounded-t-[28px] sm:rounded-[28px] p-7 pb-10 sm:pb-7 shadow-2xl animate-slide-up">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8 sm:hidden" />

        <h3 className="text-[22px] font-bold text-gray-900 mb-2 leading-tight">
          반려 사유를<br/>선택해주세요
        </h3>
        <p className="text-gray-500 font-medium mb-6 text-[15px]">
          {requesterName}님에게 알림톡이 전송됩니다.
        </p>

        <div className="flex flex-wrap gap-2 mb-5">
          {REJECT_REASONS.map((r) => {
            const active = reasonCode === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setReasonCode(r)}
                className={`px-4 py-2.5 rounded-full font-semibold text-sm transition-all active:scale-95 ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>

        <textarea
          value={reasonNote}
          onChange={(e) => setReasonNote(e.target.value)}
          placeholder={
            reasonCode === "기타"
              ? "구체적인 사유를 입력해주세요 (필수)"
              : "상세 메모 (선택)"
          }
          className="w-full bg-gray-100 text-gray-900 text-base rounded-2xl p-4 min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none mb-8"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-600 font-bold text-lg py-4 rounded-2xl active:scale-95 transition-transform"
          >
            취소
          </button>
          <button
            onClick={() => {
              if (canSubmit) {
                onSubmit(reasonCode, reasonNote.trim());
                onClose();
              }
            }}
            disabled={!canSubmit}
            className={`flex-[2] font-bold text-lg py-4 rounded-2xl transition-all active:scale-95 ${
              canSubmit ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-gray-200 text-gray-400"
            }`}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
