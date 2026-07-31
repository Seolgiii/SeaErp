"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import PageHeader from "@/components/PageHeader";
import BottomTabBar from "@/components/BottomTabBar";

type AdminTabKey = "ALL" | "LOGISTICS" | "EXPENSE" | "DONE";

const ADMIN_TABS: { key: AdminTabKey; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "LOGISTICS", label: "입출고" },
  // 2026-07-31: 비용 관리를 회계 프로그램으로 이관하기로 해 진입 경로만 숨김(처리 로직은 유지 —
  //   '전체' 탭에서는 계속 섞여 나오고 승인·반려도 그대로 동작한다).
  // { key: "EXPENSE", label: "지출" },
  { key: "DONE", label: "완료" },
];
import RejectBottomSheet from "@/app/components/RejectBottomSheet";
import CompletedItemActionSheet from "@/app/components/CompletedItemActionSheet";
import { useConfirm } from "@/app/components/ConfirmBottomSheet";
import { updateApprovalStatus, updateApprovalStatusBulk, getMyRequests } from "@/app/actions";
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useSyncQueryParams } from "@/lib/use-sync-query-params";
import type { RequestItem } from "@/app/actions/my-requests";
import { readSession, isSessionExpired } from "@/lib/session";
import { toast } from "@/lib/toast";
import ApprovalCard from "@/app/components/ApprovalCard";
import ApprovalLogisticsBody from "@/app/components/ApprovalLogisticsBody";
import ApprovalExpenseBody from "@/app/components/ApprovalExpenseBody";
import { PENDING_STATUSES } from "@/app/components/approval-card-shared";
import { usePullToRefresh } from "@/lib/pull-to-refresh";
import { logError } from "@/lib/logger";

export default function AdminDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const tabParam = searchParams.get('tab');
  const initialTab: AdminTabKey =
    tabParam === 'LOGISTICS' || tabParam === 'EXPENSE' || tabParam === 'DONE' || tabParam === 'ALL'
      ? tabParam
      : 'ALL';
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<AdminTabKey>(initialTab);
  // 탭 → URL 동기화 (즉시) — ALL은 기본값이라 URL에서 제외
  useSyncQueryParams({ tab: activeTab === "ALL" ? "" : activeTab }, 0);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uiOverrides, setUiOverrides] = useState<Record<string, "PROCESSING" | "COMPLETED" | "REJECTED">>({});
  const processingIds = useRef<Set<string>>(new Set());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RequestItem | null>(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [actionSheetItem, setActionSheetItem] = useState<RequestItem | null>(null);

  // ── 일괄 승인 ───────────────────────────────────────────────────────────
  // PENDING + (INBOUND|OUTBOUND|TRANSFER) 항목만 선택 가능. EXPENSE는 100만원
  // 권한 분기가 있어 일괄에 부적합 → 체크박스 비활성화.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  type BulkResult = {
    results: { recordId: string; lotNumber: string; success: boolean; message?: string }[];
    successCount: number;
    failCount: number;
  };
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isBulkEligible = (item: RequestItem): boolean =>
    PENDING_STATUSES.includes(item.status) &&
    (item.type === "INBOUND" || item.type === "OUTBOUND" || item.type === "TRANSFER");

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace("/login");
      return;
    }
    setRole(session.role);
    if (session.role === "ADMIN" || session.role === "MASTER") {
      setAuthorized(true);
    } else {
      setAuthorized(false);
    }
  }, [router]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const data = await getMyRequests();
    setItems(data);
    setUiOverrides({});
    processingIds.current.clear();
    setIsLoading(false);
  }, []);

  const { pullY, isReady } = usePullToRefresh(loadData);

  useEffect(() => {
    if (authorized) loadData();
  }, [authorized, loadData]);

  const isDoneTab = activeTab === "DONE";

  const isItemPending = (item: RequestItem) => {
    const uiState = uiOverrides[item.id];
    if (uiState === "COMPLETED" || uiState === "REJECTED") return false;
    return PENDING_STATUSES.includes(item.status);
  };

  const filteredItems = items.filter((item) => {
    const uiState = uiOverrides[item.id];
    // 처리 결과(완료/반려)를 보여주는 항목은 DONE 탭이 아닌 경우에만 현재 탭에 유지
    if (uiState === "COMPLETED" || uiState === "REJECTED") {
      return activeTab !== "DONE";
    }
    const pending = isItemPending(item);
    if (activeTab === "DONE") return !pending;
    if (!pending) return false;
    if (activeTab === "ALL") return true;
    if (activeTab === "EXPENSE") return item.type === "EXPENSE";
    if (activeTab === "LOGISTICS") return item.type === "INBOUND" || item.type === "OUTBOUND" || item.type === "TRANSFER";
    return true;
  });

  const totalPending = items.filter(isItemPending).length;
  const totalCompleted = items.length - totalPending;

  const handleApprove = async (
    item: RequestItem,
    opts?: { skipConfirm?: boolean },
  ) => {
    if (processingIds.current.has(item.id)) return;

    const session = readSession();
    if (!session?.workerId) {
      toast("로그인 정보를 확인해주세요.");
      return;
    }

    // 액션 시트에서 호출되는 경우(skipConfirm) 사용자가 이미 명시적으로 클릭한 것이므로 confirm 생략
    if (!opts?.skipConfirm) {
      const ok = await confirm({
        title: "해당 건을 승인할까요?",
        confirmLabel: "승인",
        accent: "blue",
      });
      if (!ok) return;
    }

    processingIds.current.add(item.id);
    setUiOverrides((prev) => ({ ...prev, [item.id]: "PROCESSING" }));

    // EXPENSE 100만원 분기: "승인 대기"뿐 아니라 "반려" → 재승인 케이스도 동일 정책 적용
    let nextStatus: string;
    if (
      item.type === "EXPENSE" &&
      (item.status === "승인 대기" || item.status === "반려")
    ) {
      const amount = Number(item.raw["금액"] ?? 0);
      if (amount < 1_000_000) {
        // 100만원 미만: 권한 무관 바로 승인 완료
        nextStatus = "승인 완료";
      } else if (role === "MASTER") {
        const skip = await confirm({
          title: "중간 승인을 생략할까요?",
          message: "100만원 이상 건은 기본적으로 최종 승인 대기로 넘어갑니다.",
          confirmLabel: "생략",
          cancelLabel: "최종 승인 대기로",
          accent: "blue",
        });
        nextStatus = skip ? "승인 완료" : "최종 승인 대기";
      } else {
        // 100만원 이상 + ADMIN → 최종 승인 대기
        nextStatus = "최종 승인 대기";
      }
    } else {
      nextStatus = "승인 완료";
    }

    try {
      const result = await updateApprovalStatus(session.workerId, item.id, item.type, nextStatus);

      if (result.success) {
        if (nextStatus === "최종 승인 대기") {
          loadData();
        } else {
          setUiOverrides((prev) => ({ ...prev, [item.id]: "COMPLETED" }));
          setTimeout(() => loadData(), 1200);
        }
      } else {
        toast(result.message ?? '처리 중 오류가 발생했습니다.');
        loadData();
      }
    } catch (err) {
      logError("[handleApprove] uncaught error", err);
      toast("승인 처리 중 오류가 발생했습니다.");
      loadData();
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    const session = readSession();
    if (!session?.workerId) {
      toast("로그인 정보를 확인해주세요.");
      return;
    }

    const targetItems = items.filter(
      (i) => selectedIds.has(i.id) && isBulkEligible(i),
    );
    if (targetItems.length === 0) return;

    const ok = await confirm({
      title: `${targetItems.length}건을 일괄 승인할까요?`,
      message: "각 건은 순차 처리되며 일부 실패해도 성공한 건은 그대로 적용됩니다.",
      confirmLabel: `${targetItems.length}건 승인`,
      accent: "blue",
    });
    if (!ok) return;

    setIsBulkProcessing(true);
    const payload = targetItems.map((it) => ({ recordId: it.id, type: it.type as "INBOUND" | "OUTBOUND" | "TRANSFER" }));

    try {
      const res = await updateApprovalStatusBulk(session.workerId, payload);
      // 성공 ID는 UI overrides 적용
      const successIds = new Set(res.results.filter((r) => r.success).map((r) => r.recordId));
      setUiOverrides((prev) => {
        const next = { ...prev };
        for (const id of successIds) next[id] = "COMPLETED";
        return next;
      });
      setBulkResult({
        results: res.results.map((r) => {
          const it = targetItems.find((t) => t.id === r.recordId);
          return {
            recordId: r.recordId,
            lotNumber: it?.lotNumber || it?.title || "—",
            success: r.success,
            message: r.message,
          };
        }),
        successCount: res.successCount,
        failCount: res.failCount,
      });
      setSelectedIds(new Set());
      setTimeout(() => loadData(), 1500);
    } catch (err) {
      logError("[handleBulkApprove] uncaught error", err);
      toast("일괄 승인 중 오류가 발생했습니다.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleOpenReject = (item: RequestItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleRejectSubmit = async (reasonCode: string, reasonNote: string) => {
    if (!selectedItem) return;

    const session = readSession();
    if (!session?.workerId) {
      toast("로그인 정보를 확인해주세요.");
      return;
    }

    setUiOverrides((prev) => ({ ...prev, [selectedItem.id]: "PROCESSING" }));

    // 입고관리/출고관리/이동/지출.반려사유 (multilineText)는 합성 텍스트로 저장.
    // LOT.반려사유 (singleSelect) = reasonCode, LOT.반려메모 = reasonNote 는 admin.ts가 분리 처리.
    const composed = reasonNote ? `${reasonCode} — ${reasonNote}` : reasonCode;
    const result = await updateApprovalStatus(
      session.workerId,
      selectedItem.id,
      selectedItem.type,
      "반려",
      composed,
      reasonCode,
    );

    if (result.success) {
      setUiOverrides((prev) => ({ ...prev, [selectedItem.id]: "REJECTED" }));
      setTimeout(() => loadData(), 1200);
    } else {
      toast(result.message ?? '처리 중 오류가 발생했습니다.');
      loadData();
    }
  };

  const handleOpenActionSheet = (item: RequestItem) => {
    setActionSheetItem(item);
    setIsActionSheetOpen(true);
  };

  const handleCloseActionSheet = () => {
    setIsActionSheetOpen(false);
    // 시트 닫힘 애니메이션 후 item 정리
    setTimeout(() => setActionSheetItem(null), 200);
  };

  const handleActionSheetRevert = () => {
    if (!actionSheetItem) return;
    const target = actionSheetItem;
    setIsActionSheetOpen(false);
    // 액션 시트 닫고 즉시 반려 사유 입력 시트로 전환
    setSelectedItem(target);
    setIsModalOpen(true);
    setTimeout(() => setActionSheetItem(null), 200);
  };

  const handleActionSheetApprove = () => {
    if (!actionSheetItem) return;
    const target = actionSheetItem;
    setIsActionSheetOpen(false);
    // 액션 시트 클릭이 명시적 confirm 역할을 하므로 추가 confirm 생략
    void handleApprove(target, { skipConfirm: true });
    setTimeout(() => setActionSheetItem(null), 200);
  };

  const renderCard = (item: RequestItem) => {
    const isExpense = item.type === "EXPENSE";
    return (
      <ApprovalCard
        item={item}
        uiState={uiOverrides[item.id]}
        isDoneTab={isDoneTab}
        role={role}
        bulkEligible={isBulkEligible(item) && !uiOverrides[item.id]}
        checked={selectedIds.has(item.id)}
        onToggleSelect={() => toggleSelect(item.id)}
        onOpenActionSheet={() => handleOpenActionSheet(item)}
        onOpenReject={() => handleOpenReject(item)}
        onApprove={() => handleApprove(item)}
      >
        {isExpense
          ? <ApprovalExpenseBody item={item} />
          : <ApprovalLogisticsBody item={item} />}
      </ApprovalCard>
    );
  };

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center gap-5 px-6">
        <ShieldExclamationIcon className="w-16 h-16 text-gray-300" />
        <h1 className="text-[22px] font-bold text-gray-800">접근 권한이 없습니다</h1>
        <p className="text-gray-500 font-medium text-center">관리자 시스템은 ADMIN 권한이 필요합니다.</p>
        <Link
          href="/"
          className="mt-4 px-8 py-3.5 bg-[#191F28] text-white font-bold text-[16px] rounded-2xl active:scale-95 transition-transform"
        >
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F2F4F6] flex flex-col"
      style={{
        paddingBottom: "calc(88px + env(safe-area-inset-bottom))",
      }}
    >
      <PageHeader
        title="결재 수신함"
        onBack={() => router.push("/")}
        rightSlot={
          <Link
            href="/admin/master/products"
            className="text-[13px] font-bold text-[#3182F6]"
          >
            마스터
          </Link>
        }
      />

      {/* Pull-to-refresh 인디케이터 */}
      {pullY > 0 && (
        <div
          className="flex justify-center items-center overflow-hidden transition-all"
          style={{ height: pullY }}
        >
          <div
            className={`w-7 h-7 rounded-full border-[3px] border-gray-200 border-t-[#3182F6] transition-transform ${
              isReady ? 'scale-110 animate-spin' : ''
            }`}
          />
        </div>
      )}

      {/* 건수 요약 */}
      {!isLoading && (
        <div className="px-5 pt-4 pb-1 flex items-center gap-3">
          <p className="text-[13px] font-bold text-gray-400">
            {filteredItems.length}건
          </p>
          {!isDoneTab && totalCompleted > 0 && (
            <span className="text-[13px] font-bold text-gray-300">
              완료 {totalCompleted}건
            </span>
          )}
          {isDoneTab && totalPending > 0 && (
            <span className="text-[13px] font-bold text-[#3182F6]">
              처리 중 {totalPending}건
            </span>
          )}
        </div>
      )}

      <main className="flex-1 p-5 pt-2 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold">데이터를 불러오는 중...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 font-bold text-[16px]">
            {isDoneTab ? "완료된 내역이 없습니다" : "대기 중인 결재가 없습니다"}
          </div>
        ) : (
          filteredItems.map((item) => renderCard(item))
        )}
      </main>

      {selectedItem && (
        <RejectBottomSheet
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleRejectSubmit}
          requesterName={selectedItem.requester}
        />
      )}

      <CompletedItemActionSheet
        item={actionSheetItem}
        isOpen={isActionSheetOpen}
        onClose={handleCloseActionSheet}
        onRevertToReject={handleActionSheetRevert}
        onChangeToApprove={handleActionSheetApprove}
      />

      {/* 일괄 승인 floating bar — 선택된 게 1개 이상일 때만 표시 */}
      {selectedIds.size > 0 && !bulkResult && (
        <div
          className="fixed left-0 right-0 z-30 px-5 pt-3"
          style={{ bottom: "calc(80px + env(safe-area-inset-bottom))" }}
        >
          <div className="bg-[#191F28] text-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.18)] p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-black">{selectedIds.size}건 선택됨</p>
              <p className="text-[12px] font-medium text-gray-300">순차 처리 · 부분 성공 허용</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="shrink-0 text-[13px] font-bold text-gray-300 px-3 py-2 rounded-xl active:scale-95"
            >
              선택 해제
            </button>
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={isBulkProcessing}
              className="shrink-0 bg-[#3182F6] text-white font-black text-[14px] px-5 py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
            >
              {isBulkProcessing ? "처리 중..." : "일괄 승인"}
            </button>
          </div>
        </div>
      )}

      {/* 일괄 승인 결과 모달 */}
      {bulkResult && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setBulkResult(null)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] flex flex-col"
            style={{ maxHeight: "85vh" }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-[5px] rounded-full bg-gray-200" />
            </div>
            <div className="flex items-start justify-between px-6 pt-2 pb-3 shrink-0">
              <div>
                <h2 className="text-[18px] font-black text-gray-900">일괄 승인 결과</h2>
                <p className="text-[13px] font-medium text-gray-500 mt-0.5">
                  성공 {bulkResult.successCount}건 · 실패 {bulkResult.failCount}건
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkResult(null)}
                className="p-1 -mr-1 active:scale-90 transition-transform"
                aria-label="닫기"
              >
                <XMarkIcon className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-2 space-y-4 overflow-y-auto flex-1">
              {bulkResult.successCount > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <p className="text-[14px] font-black text-green-700">
                      {bulkResult.successCount}건 승인 완료
                    </p>
                  </div>
                  <ul className="text-[12px] font-medium text-green-700 space-y-1 pl-7">
                    {bulkResult.results.filter((r) => r.success).map((r) => (
                      <li key={r.recordId} className="truncate">{r.lotNumber}</li>
                    ))}
                  </ul>
                </div>
              )}
              {bulkResult.failCount > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ExclamationCircleIcon className="w-5 h-5 text-[#FF3B30]" />
                    <p className="text-[14px] font-black text-[#FF3B30]">
                      {bulkResult.failCount}건 실패
                    </p>
                  </div>
                  <ul className="space-y-2 pl-7">
                    {bulkResult.results.filter((r) => !r.success).map((r) => (
                      <li key={r.recordId} className="text-[12px]">
                        <p className="font-bold text-gray-800 truncate">{r.lotNumber}</p>
                        <p className="text-gray-500 mt-0.5">{r.message ?? "알 수 없는 오류"}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div
              className="px-6 pt-3 shrink-0"
              style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                onClick={() => setBulkResult(null)}
                className="w-full py-4 rounded-2xl bg-[#191F28] text-white text-[16px] font-black active:scale-[0.98] transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </>
      )}

      {/* 하단 탭바 */}
      <BottomTabBar<AdminTabKey>
        tabs={ADMIN_TABS}
        activeKey={activeTab}
        onChange={setActiveTab}
      />
    </div>
  );
}
