'use client';

import { useEffect, useState } from 'react';
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/app/components/ConfirmBottomSheet';
import {
  createSupplier,
  deleteSupplier,
  updateSupplier,
  type Supplier,
  type SupplierInput,
} from '@/app/actions/admin/master-suppliers';

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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast('매입처명은 필수입니다.', 'error');
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
      toast(`저장 실패: ${result.error}`, 'error');
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
      toast(`삭제 실패: ${result.error}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-[18px] font-black text-gray-900">
            {mode === 'create' ? '매입처 추가' : '매입처 수정'}
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

        <div className="flex-1 overflow-y-auto px-6 pb-3 space-y-4">
          <div>
            <label className="block text-[12px] font-bold text-gray-500 mb-1.5">
              매입처명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 한라수산"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent transition-all"
              autoFocus
            />
          </div>
        </div>

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
