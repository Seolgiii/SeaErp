'use client';

import { useEffect, useState } from 'react';
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/app/components/ConfirmBottomSheet';
import {
  createStorage,
  deleteStorage,
  updateStorage,
  STORAGE_KINDS,
  type Storage,
  type StorageInput,
  type StorageKind,
} from '@/app/actions/admin/master-storage';

interface Props {
  mode: 'create' | 'edit';
  storage: Storage | null;
  workerId: string;
  onClose: () => void;
  onSaved: () => void;
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
  const [kind, setKind] = useState<StorageKind>(storage?.kind ?? '');
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
      toast('보관처명은 필수입니다.', 'error');
      return;
    }
    setIsSaving(true);
    const input: StorageInput = { name, kind: kind || undefined };
    const result =
      mode === 'create'
        ? await createStorage(workerId, input)
        : await updateStorage(workerId, storage!.id, input);
    setIsSaving(false);
    if (result.success) {
      toast(mode === 'create' ? '보관처가 추가되었습니다.' : '수정되었습니다.', 'success');
      onSaved();
    } else {
      toast(`저장 실패: ${result.error}`, 'error');
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
      toast(`삭제 실패: ${result.error}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-[18px] font-black text-gray-900">
            {mode === 'create' ? '보관처 추가' : '보관처 수정'}
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
              보관처명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 한라에스앤에프"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-gray-500 mb-1.5">
              구분
            </label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as StorageKind)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent transition-all"
            >
              <option value="">(선택 안 함)</option>
              {STORAGE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1.5">
              자사창고일 때만 우리(SEAERP) 입출고증이 발행됩니다.
            </p>
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
