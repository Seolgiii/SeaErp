'use client';

import { useEffect, useRef, useState } from 'react';
import {
  LockOpenIcon,
  KeyIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/app/components/ConfirmBottomSheet';
import { Button } from '@/app/components/ui/Button';
import {
  createWorker,
  deleteWorker,
  resetWorkerPin,
  unlockWorkerPin,
  updateWorker,
  type CreateWorkerInput,
  type Worker,
  type WorkerInput,
  type WorkerRole,
} from '@/app/actions/admin/master-workers';

interface Props {
  mode: 'create' | 'edit';
  worker: Worker | null;
  workerId: string;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const ROLE_OPTIONS: { value: WorkerRole; label: string; desc: string }[] = [
  { value: 'WORKER', label: '작업자', desc: '입출고 신청 + 본인 내역 조회' },
  { value: 'ADMIN', label: '관리자', desc: '결재 + 마스터 + 일일 보고서' },
  { value: 'MASTER', label: '마스터', desc: '관리자 권한 + 권한 변경 가능' },
];

export default function WorkerEditModal({
  mode,
  worker,
  workerId,
  isSelf,
  onClose,
  onSaved,
}: Props) {
  const confirm = useConfirm();
  const [name, setName] = useState(worker?.name ?? '');
  const [role, setRole] = useState<WorkerRole>(worker?.role ?? 'WORKER');
  const [active, setActive] = useState<boolean>(worker?.active ?? true);
  const [pin, setPin] = useState('');
  const [showPinReset, setShowPinReset] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  /** 필드 귀속 오류 — 토스트가 아니라 필드 바로 아래에 띄운다 (§6-3). */
  const [nameError, setNameError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const validateName = (v: string): string | null =>
    v.trim() ? null : '작업자명을 입력하세요.';
  const validatePin = (v: string): string | null =>
    v.replace(/\D/g, '').length === 4 ? null : 'PIN을 숫자 4자리로 입력하세요.';

  const handleSave = async () => {
    const nErr = validateName(name);
    const pErr = mode === 'create' ? validatePin(pin) : null;
    setNameError(nErr);
    setPinError(pErr);
    if (nErr || pErr) {
      // 저장 실패 후 첫 오류 필드로 포커스를 되돌린다 (§6-3).
      (nErr ? nameRef : pinRef).current?.focus();
      return;
    }
    setIsSaving(true);
    const result =
      mode === 'create'
        ? await createWorker(workerId, {
            name,
            role,
            active,
            pin,
          } as CreateWorkerInput)
        : await updateWorker(workerId, worker!.id, {
            name,
            role,
            active,
          } as WorkerInput);
    setIsSaving(false);
    if (result.success) {
      toast(
        mode === 'create' ? '작업자가 추가되었습니다.' : '수정되었습니다.',
        'success',
      );
      onSaved();
    } else {
      // 필드에 귀속되지 않는 오류만 토스트. 서버 원문은 노출하지 않는다 (§6-4).
      console.error('[workers] 저장 실패', result.error);
      toast('저장하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
  };

  const handlePinReset = async () => {
    if (mode !== 'edit' || !worker) return;
    if (newPin.replace(/\D/g, '').length !== 4) {
      toast('새 PIN은 숫자 4자리여야 합니다.', 'error');
      return;
    }
    const ok = await confirm({
      title: `'${worker.name}'의 PIN을 재설정할까요?`,
      message:
        '기존 PIN은 즉시 무효화됩니다. 본인에게 새 PIN을 안전한 방법으로 전달하세요.',
      confirmLabel: '재설정',
      accent: 'blue',
    });
    if (!ok) return;
    setIsSaving(true);
    const result = await resetWorkerPin(workerId, worker.id, newPin);
    setIsSaving(false);
    if (result.success) {
      toast('PIN이 재설정되었습니다.', 'success');
      setNewPin('');
      setShowPinReset(false);
      onSaved();
    } else {
      // 필드에 귀속되지 않는 오류만 토스트. 서버 원문은 노출하지 않는다 (§6-4).
      console.error('[workers] 재설정 실패', result.error);
      toast('재설정하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
  };

  const handleUnlock = async () => {
    if (mode !== 'edit' || !worker) return;
    setIsSaving(true);
    const result = await unlockWorkerPin(workerId, worker.id);
    setIsSaving(false);
    if (result.success) {
      toast('PIN 잠금이 해제되었습니다.', 'success');
      onSaved();
    } else {
      // 필드에 귀속되지 않는 오류만 토스트. 서버 원문은 노출하지 않는다 (§6-4).
      console.error('[workers] 잠금 해제 실패', result.error);
      toast('잠금 해제하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !worker) return;
    const ok = await confirm({
      title: `'${worker.name}' 작업자를 영구 삭제할까요?`,
      message:
        '이 작업자가 신청한 입고·출고·이동·지출 내역의 작업자 link가 비워집니다. 되돌릴 수 없습니다. 단순 퇴사는 "비활성"으로 처리하는 것이 안전합니다.',
      confirmLabel: '삭제',
      accent: 'red',
    });
    if (!ok) return;
    setIsSaving(true);
    const result = await deleteWorker(workerId, worker.id);
    setIsSaving(false);
    if (result.success) {
      toast('삭제되었습니다.', 'success');
      onSaved();
    } else {
      // 필드에 귀속되지 않는 오류만 토스트. 서버 원문은 노출하지 않는다 (§6-4).
      console.error('[workers] 삭제 실패', result.error);
      toast('삭제하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-scrim animate-fade-in motion-reduce:animate-none" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-sheet bg-surface shadow-overlay animate-slide-up motion-reduce:animate-none">
        {/* 헤더 */}
        {/* 헤더 — 상하 20px + 아래 구분선 (§6-5) */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <h3 className="text-section text-text">
              {mode === 'create' ? '작업자 추가' : '작업자 수정'}
            </h3>
            {isSelf && (
              <span className="rounded-pill bg-warn-bg px-2 text-caption text-warn-ink">
                본인
              </span>
            )}
          </div>
          <Button variant="ghost" icon={XMarkIcon} onClick={onClose} aria-label="닫기" />
        </div>

        {/* 본문 — 상하 24px, 필드 그룹 간격 20px (§6-5) */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <Field label="작업자명" required error={nameError} htmlFor="worker-name">
            <input
              id="worker-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(validateName(e.target.value));
              }}
              onBlur={(e) => setNameError(validateName(e.target.value))}
              placeholder="예: 홍길동"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 'worker-name-error' : undefined}
              className={fieldClass(Boolean(nameError))}
              autoFocus
            />
          </Field>

          <Field label="권한">
            <div className="space-y-2">
              {ROLE_OPTIONS.map((opt) => {
                const selected = role === opt.value;
                const disabled = isSelf && opt.value !== role;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => !disabled && setRole(opt.value)}
                    disabled={disabled}
                    className={`w-full rounded-control border px-4 py-3 text-left transition-colors motion-reduce:transition-none ${
                      selected
                        ? 'border-accent-ink bg-accent-bg'
                        : 'border-border hover:bg-surface-alt'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-body ${selected ? 'text-accent-ink' : 'text-text'}`}
                      >
                        {opt.label}
                        <span className="ml-2 text-caption text-text-muted">
                          {opt.value}
                        </span>
                      </span>
                      {selected && (
                        <span className="text-caption text-accent-ink">선택됨</span>
                      )}
                    </div>
                    <p className="mt-1 text-label text-text-muted">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
            {isSelf && (
              <p className="mt-2 text-caption text-warn-ink">
                본인 권한은 다른 마스터가 변경해야 합니다.
              </p>
            )}
          </Field>

          <Field label="활성">
            <button
              type="button"
              onClick={() => !isSelf && setActive((a) => !a)}
              disabled={isSelf}
              className={`flex w-full items-center justify-between rounded-control border px-4 py-3 transition-colors motion-reduce:transition-none ${
                active ? 'border-success-ink bg-success-bg' : 'border-border bg-surface-alt'
              } ${isSelf ? 'cursor-not-allowed opacity-50' : 'hover:bg-surface-alt'}`}
            >
              <span
                className={`text-body ${active ? 'text-success-ink' : 'text-text-muted'}`}
              >
                {active ? '활성 (로그인 가능)' : '비활성 (로그인 차단)'}
              </span>
              <span
                className={`relative h-6 w-10 rounded-pill transition-colors motion-reduce:transition-none ${active ? 'bg-success-ink' : 'bg-border'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-pill bg-surface transition-all motion-reduce:transition-none ${active ? 'left-[18px]' : 'left-0.5'}`}
                />
              </span>
            </button>
            {isSelf && (
              <p className="mt-2 text-caption text-warn-ink">
                본인 계정은 비활성으로 바꿀 수 없습니다.
              </p>
            )}
          </Field>

          {mode === 'create' && (
            <Field label="초기 PIN" required error={pinError} htmlFor="worker-pin">
              <input
                id="worker-pin"
                ref={pinRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setPin(v);
                  if (pinError) setPinError(validatePin(v));
                }}
                onBlur={(e) => setPinError(validatePin(e.target.value))}
                placeholder="숫자 4자리"
                aria-invalid={pinError ? true : undefined}
                aria-describedby={pinError ? 'worker-pin-error' : undefined}
                className={fieldClass(Boolean(pinError))}
              />
              <p className="mt-2 text-caption text-text-muted">
                입력 즉시 해시화되어 저장됩니다. 평문 PIN은 저장되지 않습니다.
              </p>
            </Field>
          )}

          {mode === 'edit' && worker && (
            <div className="space-y-3 border-t border-border pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label text-text-muted">PIN 보안 상태</p>
                  <p className="mt-1 text-body text-text">
                    {worker.hasHashedPin
                      ? '해시 저장됨'
                      : worker.hasPlainPin
                        ? '평문 저장됨 (로그인 시 자동 해시화)'
                        : 'PIN 미설정'}
                  </p>
                </div>
                {worker.isLocked && (
                  <span className="rounded-pill bg-danger-bg px-2 text-caption text-danger-ink">
                    잠금 중
                  </span>
                )}
              </div>

              {worker.pinFailCount > 0 && (
                <p className="text-label text-text-muted">
                  실패 횟수: <span className="text-text">{worker.pinFailCount}회</span>
                  {worker.isLocked && (
                    <>
                      {' · '}
                      잠금 해제:{' '}
                      <span className="text-text">
                        {new Date(worker.pinLockedUntil).toLocaleString('ko-KR')}
                      </span>
                    </>
                  )}
                </p>
              )}

              <div className="flex gap-2 flex-wrap">
                {worker.isLocked && (
                  <Button variant="secondary" icon={LockOpenIcon} onClick={handleUnlock} disabled={isSaving}>
                    잠금 해제
                  </Button>
                )}
                <Button variant="secondary" icon={KeyIcon} onClick={() => setShowPinReset((s) => !s)}>
                  {showPinReset ? '닫기' : 'PIN 재설정'}
                </Button>
              </div>

              {showPinReset && (
                <div className="space-y-2 rounded-card bg-surface-alt p-4">
                  <label htmlFor="worker-new-pin" className="block text-label text-text-muted">
                    새 PIN (숫자 4자리)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    id="worker-new-pin"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="예: 0000"
                    className={fieldClass(false)}
                  />
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={handlePinReset}
                    disabled={isSaving || newPin.length !== 4}
                  >
                    {isSaving ? '재설정 중…' : '새 PIN으로 재설정'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 — 상하 16px + 위 구분선. 삭제는 좌측, 취소·저장은 우측 (§6-5) */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          {mode === 'edit' && !isSelf ? (
            <Button variant="ghost" tone="danger" icon={TrashIcon} onClick={handleDelete} disabled={isSaving}>
              삭제
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? '저장 중…' : '저장'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


/** 필드 공통 클래스 — 오류일 때만 테두리·포커스 링이 danger로 (§6-3). */
function fieldClass(hasError: boolean): string {
  return [
    'h-control w-full rounded-control border bg-surface-alt px-3 text-body text-text outline-none',
    'placeholder:text-text-faint focus:ring-2',
    hasError
      ? 'border-danger-ink focus:border-transparent focus:ring-danger-ink'
      : 'border-border focus:border-transparent focus:ring-accent-fill',
  ].join(' ');
}

function Field({
  label,
  required,
  error,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  /** 필드에 귀속된 검증 오류 — 필드 바로 아래에 표시한다 (§6-3). */
  error?: string | null;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* 라벨 ↔ 입력 6px (§6-5) */}
      <label htmlFor={htmlFor} className="mb-2 block text-label text-text-muted">
        {label} {required && <span className="text-danger-ink">*</span>}
      </label>
      {children}
      {error && (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="mt-2 text-caption text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
