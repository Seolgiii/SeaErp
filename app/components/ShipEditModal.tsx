'use client';

import { useEffect, useRef, useState } from 'react';
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/components/ui/Button';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/app/components/ConfirmBottomSheet';
import {
  createShip,
  deleteShip,
  updateShip,
  type Ship,
  type ShipInput,
} from '@/app/actions/admin/master-ships';

interface Props {
  mode: 'create' | 'edit';
  ship: Ship | null;
  workerId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ShipEditModal({
  mode,
  ship,
  workerId,
  onClose,
  onSaved,
}: Props) {
  const confirm = useConfirm();
  const [name, setName] = useState(ship?.name ?? '');
  const [company, setCompany] = useState(ship?.company ?? '');
  const [captain, setCaptain] = useState(ship?.captain ?? '');
  const [licenseNo, setLicenseNo] = useState(ship?.licenseNo ?? '');
  const [homePort, setHomePort] = useState(ship?.homePort ?? '');
  const [phone, setPhone] = useState(ship?.phone ?? '');
  const [email, setEmail] = useState(ship?.email ?? '');
  const [memo, setMemo] = useState(ship?.memo ?? '');
  const [isSaving, setIsSaving] = useState(false);
  /** 필드 귀속 오류 — 토스트가 아니라 필드 바로 아래에 띄운다 (§6-3). */
  const [nameError, setNameError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const validateName = (v: string): string | null =>
    v.trim() ? null : '선박명을 입력하세요.';

  const handleSave = async () => {
    const err = validateName(name);
    setNameError(err);
    if (err) {
      // 저장 실패 후 첫 오류 필드로 포커스를 되돌린다 (§6-3).
      nameRef.current?.focus();
      return;
    }
    setIsSaving(true);
    const input: ShipInput = {
      name,
      company,
      captain,
      licenseNo,
      homePort,
      phone,
      email,
      memo,
    };
    const result =
      mode === 'create'
        ? await createShip(workerId, input)
        : await updateShip(workerId, ship!.id, input);
    setIsSaving(false);
    if (result.success) {
      toast(mode === 'create' ? '선박이 추가되었습니다.' : '수정되었습니다.', 'success');
      onSaved();
    } else {
      // 필드에 귀속되지 않는 오류만 토스트. 서버 원문은 노출하지 않는다 (§6-4).
      console.error('[ships] 저장 실패', result.error);
      toast('저장하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !ship) return;
    const ok = await confirm({
      title: `'${ship.name || '(이름 없음)'}' 선박을 삭제할까요?`,
      message:
        '선박 정보 마스터에서 삭제됩니다. 입고관리.선박명은 자유 텍스트라 영향 없습니다. 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      accent: 'red',
    });
    if (!ok) return;
    setIsSaving(true);
    const result = await deleteShip(workerId, ship.id);
    setIsSaving(false);
    if (result.success) {
      toast('삭제되었습니다.', 'success');
      onSaved();
    } else {
      console.error('[ships] 삭제 실패', result.error);
      toast('삭제하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-scrim animate-fade-in motion-reduce:animate-none" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-sheet bg-surface shadow-overlay animate-slide-up motion-reduce:animate-none">
        {/* 헤더 — 상하 20px + 아래 구분선 (§6-5) */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h3 className="text-section text-text">
            {mode === 'create' ? '선박 추가' : '선박 수정'}
          </h3>
          <Button variant="ghost" icon={XMarkIcon} onClick={onClose} aria-label="닫기" />
        </div>

        {/* 본문 — 상하 24px, 필드 그룹 간격 20px (§6-5) */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <Field label="선박명" required error={nameError} htmlFor="ship-name">
            <input
              id="ship-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(validateName(e.target.value));
              }}
              onBlur={(e) => setNameError(validateName(e.target.value))}
              placeholder="예: 제101해성호"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 'ship-name-error' : undefined}
              className={fieldClass(Boolean(nameError))}
              autoFocus
            />
          </Field>
          <Field label="선박회사명">
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="예: 해성수산"
              className={fieldClass(false)}
            />
          </Field>
          <Field label="선장명">
            <input
              type="text"
              value={captain}
              onChange={(e) => setCaptain(e.target.value)}
              placeholder="예: 김선장"
              className={fieldClass(false)}
            />
          </Field>
          <Field label="어업허가번호">
            <input
              type="text"
              value={licenseNo}
              onChange={(e) => setLicenseNo(e.target.value)}
              placeholder="예: 1-2024-0001"
              className={fieldClass(false)}
            />
          </Field>
          <Field label="선적항">
            <input
              type="text"
              value={homePort}
              onChange={(e) => setHomePort(e.target.value)}
              placeholder="예: 통영항"
              className={fieldClass(false)}
            />
          </Field>
          <Field label="연락처">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="예: 010-0000-0000"
              className={fieldClass(false)}
            />
          </Field>
          <Field label="이메일">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="예: ship@example.com"
              className={fieldClass(false)}
            />
          </Field>
          <Field label="비고">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="자유 메모"
              rows={3}
              className={`${fieldClass(false)} h-auto resize-none py-2`}
            />
          </Field>
        </div>

        {/* 푸터 — 상하 16px + 위 구분선. 삭제는 좌측, 취소·저장은 우측 (§6-5) */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          {mode === 'edit' ? (
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
