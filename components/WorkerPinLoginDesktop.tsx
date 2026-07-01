"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isSessionExpired, readSession, writeSession } from "@/lib/session";
import { APP_VERSION } from "@/lib/version";

/**
 * PC 전용 로그인 — split-screen (좌: 브랜드 파노라마 / 우: 작업자 그리드 → PIN).
 * 모바일 컴포넌트(WorkerPinLogin)와 동일한 백엔드(/api/workers, /api/auth/pin)와
 * session 헬퍼 사용. 디자인만 PC 답게 + 키보드 입력 지원(숫자/Backspace/Enter/Esc).
 */

type Worker = { id: string; name: string };
type View = "list" | "pin";

const AVATAR_COLORS = [
  "#3182F6", "#FF3B30", "#FF8C00", "#00D082", "#5061FF",
  "#8B95A1", "#FF6B6B", "#4ECDC4", "#A78BFA", "#F59E0B",
];

function avatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function safeCallbackUrl(raw: string | null): string | null {
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/")) return null;
  if (decoded.startsWith("//")) return null;
  return decoded;
}

/** PC 로그인 후 기본 진입 — 관리자(ADMIN/MASTER)는 관리자 홈, 작업자는 모바일 메인. */
function defaultLanding(role?: string): string {
  return role === "ADMIN" || role === "MASTER" ? "/admin/master" : "/";
}

export function WorkerPinLoginDesktop() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  const [view, setView] = useState<View>("list");
  const [activeWorker, setActiveWorker] = useState<Worker | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeWorkerRef = useRef<Worker | null>(null);

  const [pin, setPin] = useState("");
  const [errorFlash, setErrorFlash] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => { activeWorkerRef.current = activeWorker; }, [activeWorker]);
  useEffect(() => { submittingRef.current = submitting; }, [submitting]);

  // 이미 로그인된 상태면 callbackUrl 또는 역할별 기본 진입으로
  useEffect(() => {
    const s = readSession();
    if (s && !isSessionExpired(s)) {
      const target = safeCallbackUrl(searchParams.get("callbackUrl")) ?? defaultLanding(s.role);
      router.replace(target);
    }
  }, [router, searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/workers");
        const data = (await res.json()) as { workers?: Worker[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "목록을 불러오지 못했습니다");
        if (!cancelled) setWorkers(data.workers ?? []);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "네트워크 오류");
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const goBackToList = useCallback(() => {
    setView("list");
    setActiveWorker(null);
    setPin("");
    setAuthError(null);
    setErrorFlash(false);
    setSubmitting(false);
    submittingRef.current = false;
  }, []);

  const triggerError = useCallback((msg: string) => {
    setAuthError(msg);
    setPin("");
    setErrorFlash(true);
    setTimeout(() => setErrorFlash(false), 480);
  }, []);

  const submitPin = useCallback(async (worker: Worker, code: string) => {
    submittingRef.current = true;
    setSubmitting(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: worker.id, pin: code }),
      });
      const data = (await res.json()) as {
        worker?: { id: string; name: string; role?: string };
        error?: string;
      };
      if (!res.ok) {
        triggerError(data.error ?? "PIN이 올바르지 않습니다");
        return;
      }
      if (data.worker) {
        const role = data.worker.role ?? "WORKER";
        writeSession({
          workerId: data.worker.id,
          workerName: data.worker.name,
          role,
          lastActivityAt: Date.now(),
        });
        const target = safeCallbackUrl(searchParams.get("callbackUrl")) ?? defaultLanding(role);
        router.push(target);
      }
    } catch {
      triggerError("연결에 실패했습니다");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [router, searchParams, triggerError]);

  const appendDigit = useCallback((d: string) => {
    setPin((p) => {
      if (p.length >= 4 || submittingRef.current) return p;
      const next = p + d;
      setAuthError(null);
      const w = activeWorkerRef.current;
      if (next.length === 4 && w) void submitPin(w, next);
      return next;
    });
  }, [submitPin]);

  const backspace = useCallback(() => {
    if (submittingRef.current) return;
    setPin((p) => p.slice(0, -1));
    setAuthError(null);
  }, []);

  const openForWorker = (w: Worker, index: number) => {
    setActiveWorker(w);
    setActiveIndex(index);
    setPin("");
    setAuthError(null);
    setErrorFlash(false);
    setView("pin");
  };

  // 키보드 입력 — PIN 화면에서만 동작
  useEffect(() => {
    if (view !== "pin") return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        appendDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        goBackToList();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, appendDigit, backspace, goBackToList]);

  const dotBg = (i: number) => {
    if (errorFlash) return "#FF3B30";
    if (i < pin.length) return "#191F28";
    return "#E5E8EB";
  };

  return (
    <div
      className="min-h-screen flex bg-[#F2F4F6]"
      style={{ fontFamily: "'Spoqa Han Sans Neo', sans-serif" }}
    >
      {/* ─── 좌측: 브랜드 파노라마 ─── */}
      <aside
        className="w-1/2 relative overflow-hidden flex flex-col justify-between px-16 py-14"
        style={{
          background: "linear-gradient(135deg, #3182F6 0%, #1B64DA 60%, #0F4FB0 100%)",
        }}
      >
        {/* 상단 잔잔한 웨이브 라인들 */}
        <svg
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{ width: "100%", height: 120 }}
          viewBox="0 0 800 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,40 C200,80 400,10 600,50 C700,70 800,40 800,40 L800,0 L0,0 Z"
            fill="white"
            fillOpacity="0.06"
          />
          <path
            d="M0,90 C200,40 400,100 600,70 C700,55 800,80 800,80 L800,0 L0,0 Z"
            fill="white"
            fillOpacity="0.04"
          />
        </svg>

        {/* 하단 큰 웨이브 (모바일과 톤 통일) */}
        <svg
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ width: "100%", height: 90 }}
          viewBox="0 0 800 90"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,55 C150,20 300,80 450,50 C600,20 800,60 800,60 L800,90 L0,90 Z"
            fill="white"
            fillOpacity="0.10"
          />
          <path
            d="M0,70 C200,40 400,90 600,65 C700,52 800,75 800,75 L800,90 L0,90 Z"
            fill="white"
            fillOpacity="0.07"
          />
        </svg>

        {/* 상단 — 브랜드 */}
        <div className="relative">
          <h1
            className="text-white font-black tracking-tight leading-none"
            style={{ fontSize: 72, letterSpacing: "-2.5px" }}
          >
            SEAERP
          </h1>
          <p className="mt-4 text-white/90 text-[20px] font-medium tracking-tight">
            수산물 ERP 관리 시스템
          </p>
        </div>

        {/* 하단 — 작은 메타 + 버전 (연도 오른쪽) */}
        <p className="relative text-[12px] font-medium text-white/60 tracking-tight">
          관리자 시스템 · PC 전용 · {new Date().getFullYear()} · v{APP_VERSION}
        </p>
      </aside>

      {/* ─── 우측: 작업자 그리드 → PIN ─── */}
      <section className="w-1/2 flex flex-col items-center justify-center px-12 py-10 min-h-screen">
        <div className="w-full max-w-[520px]">
          {view === "list" && (
            <ListView
              workers={workers}
              loading={loadingList}
              error={loadError}
              onPick={openForWorker}
            />
          )}
          {view === "pin" && activeWorker && (
            <PinView
              worker={activeWorker}
              colorIndex={activeIndex}
              authError={authError}
              submitting={submitting}
              dotBg={dotBg}
              onDigit={appendDigit}
              onClear={() => { setPin(""); setAuthError(null); }}
              onBackspace={backspace}
              onBack={goBackToList}
            />
          )}
        </div>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 작업자 그리드 뷰
// ──────────────────────────────────────────────────────────────────────────────

function ListView({
  workers,
  loading,
  error,
  onPick,
}: {
  workers: Worker[];
  loading: boolean;
  error: string | null;
  onPick: (w: Worker, i: number) => void;
}) {
  return (
    <div>
      <h2 className="text-[26px] font-black text-[#191F28] tracking-tight">작업자를 선택하세요</h2>
      <p className="text-[14px] text-gray-500 font-medium mt-1.5">
        {loading
          ? "목록을 불러오는 중..."
          : error
            ? error
            : `${workers.length}명 · 클릭해 진입`}
      </p>

      {loading && (
        <div className="flex justify-center pt-20">
          <div className="w-9 h-9 border-[3px] border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-center text-[15px] text-red-500 pt-20">{error}</p>
      )}

      {!loading && !error && workers.length === 0 && (
        <p className="text-center text-[15px] text-gray-400 pt-20">등록된 작업자가 없습니다</p>
      )}

      {!loading && !error && workers.length > 0 && (
        <div className="mt-7 grid grid-cols-4 gap-3 max-h-[58vh] overflow-y-auto pr-1">
          {workers.map((w, i) => (
            <button
              key={w.id}
              type="button"
              onClick={() => onPick(w, i)}
              className="group bg-white rounded-2xl px-4 py-5 flex flex-col items-center gap-3 shadow-sm border border-transparent hover:border-[#3182F6]/30 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[20px] font-black shrink-0"
                style={{ backgroundColor: avatarColor(i) }}
              >
                {w.name[0]}
              </div>
              <span className="text-[14px] font-bold text-[#191F28] truncate w-full text-center">
                {w.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PIN 입력 뷰
// ──────────────────────────────────────────────────────────────────────────────

function PinView({
  worker,
  colorIndex,
  authError,
  submitting,
  dotBg,
  onDigit,
  onClear,
  onBackspace,
  onBack,
}: {
  worker: Worker;
  colorIndex: number;
  authError: string | null;
  submitting: boolean;
  dotBg: (i: number) => string;
  onDigit: (d: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      {/* 뒤로 — 좌측 상단 */}
      <button
        type="button"
        onClick={onBack}
        className="self-start text-[13px] font-bold text-gray-400 hover:text-gray-700 flex items-center gap-1 mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        다른 작업자
      </button>

      {/* 아바타 */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-white text-[30px] font-black"
        style={{ backgroundColor: avatarColor(colorIndex) }}
      >
        {worker.name[0]}
      </div>
      <p className="mt-3 text-[18px] font-black text-[#191F28]">{worker.name}</p>
      <p className="text-[13px] text-gray-400 font-medium">PIN 4자리를 입력하세요</p>

      {/* PIN 점 */}
      <div className="flex justify-center gap-[20px] mt-7 mb-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-[15px] h-[15px] rounded-full transition-all duration-150"
            style={{ backgroundColor: dotBg(i) }}
          />
        ))}
      </div>

      {/* 오류 */}
      <div className="h-5 flex items-center justify-center">
        {authError && <p className="text-[13px] font-bold text-red-500">{authError}</p>}
      </div>

      {/* 키패드 */}
      <div className="grid grid-cols-3 gap-2 mt-5 w-[300px]">
        {(["1","2","3","4","5","6","7","8","9"] as const).map((n) => (
          <KeyButton key={n} disabled={submitting} onClick={() => onDigit(n)}>
            {n}
          </KeyButton>
        ))}
        <KeyButton disabled={submitting} onClick={onClear}>
          C
        </KeyButton>
        <KeyButton disabled={submitting} onClick={() => onDigit("0")}>
          0
        </KeyButton>
        <KeyButton disabled={submitting} onClick={onBackspace} ariaLabel="한 자리 지우기">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#191F28"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="M12 19L5 12L12 5" />
          </svg>
        </KeyButton>
      </div>

      <p className="mt-5 text-[11px] font-medium text-gray-400">
        키보드 입력 가능 · Esc 뒤로 · Backspace 지우기
      </p>
    </div>
  );
}

function KeyButton({
  children,
  disabled,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex items-center justify-center h-[60px] text-[24px] font-semibold text-[#191F28] rounded-xl bg-white border border-gray-100 hover:bg-gray-50 hover:border-gray-200 active:scale-95 transition-all disabled:opacity-30"
    >
      {children}
    </button>
  );
}
