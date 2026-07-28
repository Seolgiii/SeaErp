'use client';

import { useRef, useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/app/components/ConfirmBottomSheet';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import {
  createSupplier,
  deleteSupplier,
  updateSupplier,
  type Supplier,
  type SupplierInput,
} from '@/app/actions/admin/master-suppliers';

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

interface Props {
  mode: 'create' | 'edit';
  supplier: Supplier | null;
  workerId: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * 매입처 마스터 신규/수정/삭제 모달.
 * 필드 1개(매입처명). 패턴은 ProductEditModal과 동일.
 */
export default function SupplierEditModal({
  mode,
  supplier,
  workerId,
  onClose,
  onSaved,
}: Props) {
  const confirm = useConfirm();
  const [name, setName] = useState(supplier?.name ?? '');
  const [isSaving, setIsSaving] = useState(false);
  /** 필드 귀속 오류 — 토스트가 아니라 필드 바로 아래에 띄운다 (§6-3). */
  const [nameError, setNameError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);


  const validateName = (v: string): string | null =>
    v.trim() ? null : '매입처명을 입력하세요.';

  const handleSave = async () => {
    const err = validateName(name);
    setNameError(err);
    if (err) {
      // 저장 실패 후 첫 오류 필드로 포커스를 되돌린다 (§6-3).
      nameRef.current?.focus();
      return;
    }
    setIsSaving(true);
    const input: SupplierInput = { name };
    const result =
      mode === 'create'
        ? await createSupplier(workerId, input)
        : await updateSupplier(workerId, supplier!.id, input);
    setIsSaving(false);
    if (result.success) {
      toast(mode === 'create' ? '매입처가 추가되었습니다.' : '수정되었습니다.', 'success');
      onSaved();
    } else {
      // 필드에 귀속되지 않는 오류만 토스트. 서버 원문은 노출하지 않는다 (§6-4).
      console.error('[suppliers] 저장 실패', result.error);
      toast('저장하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !supplier) return;
    const ok = await confirm({
      title: `'${supplier.name}' 매입처를 삭제할까요?`,
      message:
        '이 매입처를 참조하는 입고·LOT 내역이 있을 수 있습니다. 삭제하면 해당 룩업이 비워집니다. 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      accent: 'red',
    });
    if (!ok) return;
    setIsSaving(true);
    const result = await deleteSupplier(workerId, supplier.id);
    setIsSaving(false);
    if (result.success) {
      toast('삭제되었습니다.', 'success');
      onSaved();
    } else {
      console.error('[suppliers] 삭제 실패', result.error);
      toast('삭제하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
  };

  return (
    <Modal
      title={mode === 'create' ? '매입처 추가' : '매입처 수정'}
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
        {/* 라벨 ↔ 입력 6px (§6-5) */}
        <label htmlFor="supplier-name" className="mb-2 block text-label text-text-muted">
          매입처명 <span className="text-danger-ink">*</span>
        </label>
        <input
          id="supplier-name"
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(validateName(e.target.value));
          }}
          onBlur={(e) => setNameError(validateName(e.target.value))}
          placeholder="예: 한라수산"
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? 'supplier-name-error' : undefined}
          className={fieldClass(Boolean(nameError))}
          autoFocus
        />
        {nameError && (
          <p id="supplier-name-error" className="mt-2 text-caption text-danger-ink">
            {nameError}
          </p>
        )}
      </div>
    </Modal>
  );
}
