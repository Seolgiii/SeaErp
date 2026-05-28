'use client';

import { useEffect, useState } from 'react';
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast('선박명은 필수입니다.', 'error');
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
      toast(`저장 실패: ${result.error}`, 'error');
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
      toast(`삭제 실패: ${result.error}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-[18px] font-black text-gray-900">
            {mode === 'create' ? '선박 추가' : '선박 수정'}
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
          <Field label="선박명" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 제101해성호"
              className={inputClass}
              autoFocus
            />
          </Field>
          <Field label="선박회사명">
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="예: 해성수산"
              className={inputClass}
            />
          </Field>
          <Field label="선장명">
            <input
              type="text"
              value={captain}
              onChange={(e) => setCaptain(e.target.value)}
              placeholder="예: 김선장"
              className={inputClass}
            />
          </Field>
          <Field label="어업허가번호">
            <input
              type="text"
              value={licenseNo}
              onChange={(e) => setLicenseNo(e.target.value)}
              placeholder="예: 1-2024-0001"
              className={inputClass}
            />
          </Field>
          <Field label="선적항">
            <input
              type="text"
              value={homePort}
              onChange={(e) => setHomePort(e.target.value)}
              placeholder="예: 통영항"
              className={inputClass}
            />
          </Field>
          <Field label="연락처">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="예: 010-0000-0000"
              className={inputClass}
            />
          </Field>
          <Field label="이메일">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="예: ship@example.com"
              className={inputClass}
            />
          </Field>
          <Field label="비고">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="자유 메모"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </Field>
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
