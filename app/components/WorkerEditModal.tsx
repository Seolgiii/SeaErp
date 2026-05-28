'use client';

import { useEffect, useState } from 'react';
import {
  LockOpenIcon,
  KeyIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/app/components/ConfirmBottomSheet';
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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast('작업자명은 필수입니다.', 'error');
      return;
    }
    if (mode === 'create' && pin.replace(/\D/g, '').length !== 4) {
      toast('PIN은 숫자 4자리여야 합니다.', 'error');
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
      toast(`저장 실패: ${result.error}`, 'error');
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
      toast(`재설정 실패: ${result.error}`, 'error');
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
      toast(`잠금 해제 실패: ${result.error}`, 'error');
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
      toast(`삭제 실패: ${result.error}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[18px] font-black text-gray-900">
              {mode === 'create' ? '작업자 추가' : '작업자 수정'}
            </h3>
            {isSelf && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded">
                본인
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-8 h-8 flex items-center justify-center rounded-lg active:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 폼 */}
        <div className="flex-1 overflow-y-auto px-6 pb-3 space-y-4">
          <Field label="작업자명" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 홍길동"
              className={inputClass}
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
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-[#3182F6] bg-[#3182F6]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[14px] font-bold ${selected ? 'text-[#3182F6]' : 'text-gray-800'}`}
                      >
                        {opt.label}
                        <span className="ml-2 font-mono text-[11px] text-gray-400">
                          {opt.value}
                        </span>
                      </span>
                      {selected && (
                        <span className="text-[11px] font-bold text-[#3182F6]">선택됨</span>
                      )}
                    </div>
                    <p className="text-[12px] font-medium text-gray-500 mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
            {isSelf && (
              <p className="mt-2 text-[12px] font-medium text-amber-600">
                본인 권한은 다른 마스터가 변경해야 합니다.
              </p>
            )}
          </Field>

          <Field label="활성">
            <button
              type="button"
              onClick={() => !isSelf && setActive((a) => !a)}
              disabled={isSelf}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                active
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              } ${isSelf ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300'}`}
            >
              <span
                className={`text-[14px] font-bold ${active ? 'text-green-700' : 'text-gray-500'}`}
              >
                {active ? '활성 (로그인 가능)' : '비활성 (로그인 차단)'}
              </span>
              <span
                className={`w-10 h-6 rounded-full transition-colors relative ${active ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${active ? 'left-[18px]' : 'left-0.5'}`}
                />
              </span>
            </button>
            {isSelf && (
              <p className="mt-2 text-[12px] font-medium text-amber-600">
                본인 계정은 비활성으로 바꿀 수 없습니다.
              </p>
            )}
          </Field>

          {mode === 'create' && (
            <Field label="초기 PIN" required>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="숫자 4자리"
                className={inputClass}
              />
              <p className="mt-1 text-[11px] font-medium text-gray-400">
                입력 즉시 해시화되어 저장됩니다. 평문 PIN은 저장되지 않습니다.
              </p>
            </Field>
          )}

          {mode === 'edit' && worker && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-bold text-gray-500">PIN 보안 상태</p>
                  <p className="text-[13px] font-bold text-gray-800 mt-0.5">
                    {worker.hasHashedPin
                      ? '해시 저장됨'
                      : worker.hasPlainPin
                        ? '평문 저장됨 (로그인 시 자동 해시화)'
                        : 'PIN 미설정'}
                  </p>
                </div>
                {worker.isLocked && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-[11px] font-black rounded">
                    잠금 중
                  </span>
                )}
              </div>

              {worker.pinFailCount > 0 && (
                <p className="text-[12px] font-medium text-gray-500">
                  실패 횟수: <span className="font-bold text-gray-700">{worker.pinFailCount}회</span>
                  {worker.isLocked && (
                    <>
                      {' · '}
                      잠금 해제:{' '}
                      <span className="font-bold text-gray-700">
                        {new Date(worker.pinLockedUntil).toLocaleString('ko-KR')}
                      </span>
                    </>
                  )}
                </p>
              )}

              <div className="flex gap-2 flex-wrap">
                {worker.isLocked && (
                  <button
                    type="button"
                    onClick={handleUnlock}
                    disabled={isSaving}
                    className="px-3 py-2 bg-amber-100 text-amber-700 text-[12px] font-bold rounded-lg hover:bg-amber-200 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <LockOpenIcon className="w-4 h-4" />
                    잠금 해제
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPinReset((s) => !s)}
                  className="px-3 py-2 bg-blue-50 text-[#3182F6] text-[12px] font-bold rounded-lg hover:bg-blue-100 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <KeyIcon className="w-4 h-4" />
                  {showPinReset ? '닫기' : 'PIN 재설정'}
                </button>
              </div>

              {showPinReset && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <label className="block text-[12px] font-bold text-gray-500">
                    새 PIN (숫자 4자리)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="예: 0000"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handlePinReset}
                    disabled={isSaving || newPin.length !== 4}
                    className="w-full px-4 py-2.5 bg-[#3182F6] text-white text-[13px] font-bold rounded-lg hover:bg-[#1c6ce0] active:scale-95 transition-all disabled:bg-blue-300"
                  >
                    {isSaving ? '재설정 중...' : '새 PIN으로 재설정'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 pt-3 pb-5 border-t border-gray-100 flex items-center justify-between gap-3">
          {mode === 'edit' && !isSelf ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSaving}
              className="px-4 py-3 text-[14px] font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              <TrashIcon className="w-4 h-4" />
              삭제
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-3 text-[14px] font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-40"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="px-6 py-3 bg-[#3182F6] text-white text-[14px] font-bold rounded-xl shadow-sm hover:bg-[#1c6ce0] active:scale-95 transition-all disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent transition-all';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-gray-500 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
