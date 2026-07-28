'use client';

import { useRef, useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/app/components/ConfirmBottomSheet';
import {
  createProduct,
  deleteProduct,
  updateProduct,
  type Product,
  type ProductInput,
} from '@/app/actions/admin/master-products';

interface Props {
  mode: 'create' | 'edit';
  /** 수정 모드일 때 기존 product 데이터 */
  product: Product | null;
  workerId: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * 제품 마스터 신규/수정/삭제 모달.
 *
 * - 폼: 품목명(필수) + 품목코드 / 품목구분 / 권장규격 / 상세규격(미수) / 원산지
 * - 저장 → 토스트 후 onSaved
 * - 삭제: 수정 모드에서만 노출 + ConfirmBottomSheet로 확인
 */
export default function ProductEditModal({
  mode,
  product,
  workerId,
  onClose,
  onSaved,
}: Props) {
  const confirm = useConfirm();
  const [name, setName] = useState(product?.name ?? '');
  const [code, setCode] = useState(product?.code ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [spec, setSpec] = useState(product?.spec ?? '');
  const [detailSpec, setDetailSpec] = useState(product?.detailSpec ?? '');
  const [origin, setOrigin] = useState(product?.origin ?? '');
  const [isSaving, setIsSaving] = useState(false);
  /** 필드 귀속 오류 — 토스트가 아니라 필드 바로 아래에 띄운다 (§6-3). */
  const [nameError, setNameError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);


  const validateName = (v: string): string | null =>
    v.trim() ? null : '품목명을 입력하세요.';

  const handleSave = async () => {
    const err = validateName(name);
    setNameError(err);
    if (err) {
      // 저장 실패 후 첫 오류 필드로 포커스를 되돌린다 (§6-3).
      nameRef.current?.focus();
      return;
    }
    setIsSaving(true);
    const input: ProductInput = { name, code, category, spec, detailSpec, origin };
    const result =
      mode === 'create'
        ? await createProduct(workerId, input)
        : await updateProduct(workerId, product!.id, input);
    setIsSaving(false);
    if (result.success) {
      toast(mode === 'create' ? '품목이 추가되었습니다.' : '수정되었습니다.', 'success');
      onSaved();
    } else {
      // 필드에 귀속되지 않는 오류만 토스트. 서버 원문은 노출하지 않는다 (§6-4).
      console.error('[products] 저장 실패', result.error);
      toast('저장하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !product) return;
    const ok = await confirm({
      title: `'${product.name}' 품목을 삭제할까요?`,
      message:
        '이 품목을 참조하는 LOT·입고 내역이 있을 수 있습니다. 삭제하면 해당 룩업이 비워져 표시됩니다. 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      accent: 'red',
    });
    if (!ok) return;
    setIsSaving(true);
    const result = await deleteProduct(workerId, product.id);
    setIsSaving(false);
    if (result.success) {
      toast('삭제되었습니다.', 'success');
      onSaved();
    } else {
      console.error('[products] 삭제 실패', result.error);
      toast('삭제하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
  };

  return (
    <Modal
      title={mode === 'create' ? '품목 추가' : '품목 수정'}
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
      <Field label="품목명" required error={nameError} htmlFor="product-name">
        <input
          id="product-name"
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(validateName(e.target.value));
          }}
          onBlur={(e) => setNameError(validateName(e.target.value))}
          placeholder="예: 고등어"
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? 'product-name-error' : undefined}
          className={fieldClass(Boolean(nameError))}
          autoFocus
        />
      </Field>
      <Field label="품목코드">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="예: MC1"
          className={fieldClass(false)}
        />
      </Field>
      <Field label="품목구분">
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="원물 · 가공품 · 미분류 등"
          className={fieldClass(false)}
        />
      </Field>
      <Field label="권장규격">
        <input
          type="text"
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          placeholder="예: 11"
          className={fieldClass(false)}
        />
      </Field>
      <Field label="상세규격 (미수)">
        <input
          type="text"
          value={detailSpec}
          onChange={(e) => setDetailSpec(e.target.value)}
          placeholder="예: 42/44"
          className={fieldClass(false)}
        />
      </Field>
      <Field label="원산지">
        <input
          type="text"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="예: 국내산"
          className={fieldClass(false)}
        />
      </Field>
    </Modal>
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
