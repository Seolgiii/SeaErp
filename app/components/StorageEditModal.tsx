'use client';

import { useRef, useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/app/components/ConfirmBottomSheet';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import {
  createStorage,
  deleteStorage,
  updateStorage,
  type Storage,
  type StorageInput,
} from '@/app/actions/admin/master-storage';
import { STORAGE_KINDS, type StorageKind } from '@/lib/storage-kinds';

interface Props {
  mode: 'create' | 'edit';
  storage: Storage | null;
  workerId: string;
  onClose: () => void;
  onSaved: () => void;
}

/** 필드 공통 클래스 — 오류일 때만 테두리·포커스 링이 danger로 바뀐다. */
function fieldClass(hasError: boolean): string {
  return [
    'h-control w-full rounded-control border bg-surface-alt px-3 text-body text-text outline-none',
    'placeholder:text-text-faint focus:ring-2',
    hasError
      ? 'border-danger-ink focus:border-transparent focus:ring-danger-ink'
      : 'border-border focus:border-transparent focus:ring-accent-fill',
  ].join(' ');
}

/**
 * 보관처 마스터 신규/수정/삭제 모달.
 * 필드 2개: 보관처명 + 구분(select).
 * 구분은 입출고증 발행 분기(isOwnStorage) 기준 — 자사창고일 때만 우리가 발행.
 */
export default function StorageEditModal({
  mode,
  storage,
  workerId,
  onClose,
  onSaved,
}: Props) {
  const confirm = useConfirm();
  const [name, setName] = useState(storage?.name ?? '');
  const [kind, setKind] = useState<StorageKind | ''>(storage?.kind ?? '');
  const [isSaving, setIsSaving] = useState(false);
  /** 필드 귀속 오류 — 토스트가 아니라 필드 바로 아래에 띄운다 (§6-3). */
  const [nameError, setNameError] = useState<string | null>(null);
  const [kindError, setKindError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const kindRef = useRef<HTMLSelectElement>(null);

  const validateName = (v: string): string | null =>
    v.trim() ? null : '보관처명을 입력하세요.';
  /**
   * 구분은 필수다(2026-07-28). 비면 입출고증 발행 분기(isOwnStorage)가 '미분류 → 자사창고'
   * 기본값으로 떨어져 외부 시설에 우리 이름으로 PDF가 나간다. 화면에서 막는다.
   */
  const validateKind = (v: string): string | null =>
    v ? null : '구분을 선택하세요.';

  const handleSave = async () => {
    const nErr = validateName(name);
    const kErr = validateKind(kind);
    setNameError(nErr);
    setKindError(kErr);
    if (nErr || kErr) {
      // 저장 실패 후 첫 오류 필드로 포커스를 되돌린다 (§6-3).
      (nErr ? nameRef : kindRef).current?.focus();
      return;
    }
    setIsSaving(true);
    const input: StorageInput = { name, kind };
    const result =
      mode === 'create'
        ? await createStorage(workerId, input)
        : await updateStorage(workerId, storage!.id, input);
    setIsSaving(false);
    if (result.success) {
      toast(mode === 'create' ? '보관처가 추가되었습니다.' : '수정되었습니다.', 'success');
      onSaved();
    } else {
      // 필드에 귀속되지 않는 오류만 토스트. 서버 원문은 노출하지 않는다 (§6-4).
      console.error('[storage] 저장 실패', result.error);
      toast('저장하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !storage) return;
    const ok = await confirm({
      title: `'${storage.name}' 보관처를 삭제할까요?`,
      message:
        '이 보관처를 참조하는 LOT·입고·이동 내역이 있을 수 있습니다. 삭제하면 해당 룩업이 비워집니다. 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      accent: 'red',
    });
    if (!ok) return;
    setIsSaving(true);
    const result = await deleteStorage(workerId, storage.id);
    setIsSaving(false);
    if (result.success) {
      toast('삭제되었습니다.', 'success');
      onSaved();
    } else {
      console.error('[storage] 삭제 실패', result.error);
      toast('삭제하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
  };

  return (
    <Modal
      title={mode === 'create' ? '보관처 추가' : '보관처 수정'}
      onClose={onClose}
      destructiveAction={
        mode === 'edit' ? (
          <Button variant="ghost" tone="danger" icon={TrashIcon} onClick={handleDelete} disabled={isSaving}>
            삭제
          </Button>
        ) : undefined
      }
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '저장 중…' : '저장'}
          </Button>
        </>
      }
    >
      <div>
        <label htmlFor="storage-name" className="mb-2 block text-label text-text-muted">
          보관처명 <span className="text-danger-ink">*</span>
        </label>
        <input
          id="storage-name"
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(validateName(e.target.value));
          }}
          onBlur={(e) => setNameError(validateName(e.target.value))}
          placeholder="예: 한라에스앤에프"
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? 'storage-name-error' : undefined}
          className={fieldClass(Boolean(nameError))}
          autoFocus
        />
        {nameError && (
          <p id="storage-name-error" className="mt-2 text-caption text-danger-ink">
            {nameError}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="storage-kind" className="mb-2 block text-label text-text-muted">
          구분 <span className="text-danger-ink">*</span>
        </label>
        <select
          id="storage-kind"
          ref={kindRef}
          value={kind}
          onChange={(e) => {
            const v = e.target.value as StorageKind | '';
            setKind(v);
            if (kindError) setKindError(validateKind(v));
          }}
          onBlur={(e) => setKindError(validateKind(e.target.value))}
          aria-invalid={kindError ? true : undefined}
          aria-describedby={kindError ? 'storage-kind-error' : undefined}
          className={fieldClass(Boolean(kindError))}
        >
          <option value="">선택하세요</option>
          {STORAGE_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        {kindError ? (
          <p id="storage-kind-error" className="mt-2 text-caption text-danger-ink">
            {kindError}
          </p>
        ) : (
          <p className="mt-2 text-caption text-text-muted">
            자사창고일 때만 우리(SEAERP) 입출고증이 발행됩니다.
          </p>
        )}
      </div>
    </Modal>
  );
}
