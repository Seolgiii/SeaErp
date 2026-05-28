'use client';

import { useEffect, useState } from 'react';
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast('품목명은 필수입니다.', 'error');
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
      toast(mode === 'create' ? '제품이 추가되었습니다.' : '수정되었습니다.', 'success');
      onSaved();
    } else {
      toast(`저장 실패: ${result.error}`, 'error');
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !product) return;
    const ok = await confirm({
      title: `'${product.name}' 제품을 삭제할까요?`,
      message:
        '이 제품을 참조하는 LOT·입고 내역이 있을 수 있습니다. 삭제하면 해당 룩업이 비워져 표시됩니다. 되돌릴 수 없습니다.',
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
      toast(`삭제 실패: ${result.error}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-[18px] font-black text-gray-900">
            {mode === 'create' ? '제품 추가' : '제품 수정'}
          </h3>
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
          <Field label="품목명" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 고등어"
              className={inputClass}
              autoFocus
            />
          </Field>
          <Field label="품목코드">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="예: MC1"
              className={inputClass}
            />
          </Field>
          <Field label="품목구분">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="원물 · 가공품 · 미분류 등"
              className={inputClass}
            />
          </Field>
          <Field label="권장규격">
            <input
              type="text"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="예: 11"
              className={inputClass}
            />
          </Field>
          <Field label="상세규격 (미수)">
            <input
              type="text"
              value={detailSpec}
              onChange={(e) => setDetailSpec(e.target.value)}
              placeholder="예: 42/44"
              className={inputClass}
            />
          </Field>
          <Field label="원산지">
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="예: 국내산"
              className={inputClass}
            />
          </Field>
        </div>

        {/* 푸터 */}
        <div className="px-6 pt-3 pb-5 border-t border-gray-100 flex items-center justify-between gap-3">
          {mode === 'edit' ? (
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
