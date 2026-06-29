'use client';

// ─────────────────────────────────────────────────────────────────────────────
// 부자재·경비 마스터 (판매원가 산정용)
//
// 4개 고정 섹션(아이스팩·박스·내피·진공팩)으로 분리해 보여주고, 각 섹션에 행을
// 자유롭게 추가/수정/삭제. 단가는 박스당 원가 — Phase 2에서 박스당 재고원가에 합산해
// 판매원가를 도출한다.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { fromGroupedIntegerInput, formatIntKo } from '@/lib/number-format';
import { MATERIAL_SECTIONS, type MaterialSection } from '@/lib/material-sections';
import {
  listMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  type Material,
} from '@/app/actions/admin/master-materials';

type Editing = { section: MaterialSection; mat: Material | null };

const won = (n: number) => `${formatIntKo(Math.round(n))}원`;

export default function MaterialsMasterPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [items, setItems] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Editing | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace('/login');
      return;
    }
    setWorkerId(session.workerId);
  }, [router]);

  const loadData = useCallback(async () => {
    if (!workerId) return;
    setIsLoading(true);
    const result = await listMaterials(workerId);
    if (result.success) setItems(result.data);
    else toast(`조회 실패: ${result.error}`, 'error');
    setIsLoading(false);
  }, [workerId]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  if (!workerId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#3182F6]" />
      </div>
    );
  }

  const totalActive = items.filter((m) => m.active).length;

  return (
    <div className="mx-auto min-w-0 max-w-[1100px] p-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-black tracking-tight text-gray-900">
          부자재·경비 마스터
        </h1>
        <p className="mt-1 text-[13px] text-gray-500">
          판매원가 산정용. 단가는 <b>박스당 원가</b> 기준입니다. (활성 {totalActive}건 / 전체{' '}
          {items.length}건)
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#3182F6]" />
        </div>
      ) : (
        <div className="space-y-5">
          {MATERIAL_SECTIONS.map((section) => {
            const rows = items.filter((m) => m.section === section);
            return (
              <section
                key={section}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
                  <h2 className="text-[15px] font-bold text-gray-800">
                    {section}{' '}
                    <span className="text-[13px] font-medium text-gray-400">
                      {rows.length}건
                    </span>
                  </h2>
                  <button
                    onClick={() => setEditing({ section, mat: null })}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#3182F6] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#1c6ce0]"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    행 추가
                  </button>
                </div>

                {rows.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[13px] text-gray-400">
                    아직 항목이 없습니다. ‘행 추가’로 등록하세요.
                  </div>
                ) : (
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-[12px] font-bold text-gray-400">
                        <th className="px-5 py-2">품명</th>
                        <th className="px-5 py-2 text-right">단가(박스당)</th>
                        <th className="px-5 py-2">단위</th>
                        <th className="px-5 py-2">상태</th>
                        <th className="px-5 py-2">비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((m) => (
                        <tr
                          key={m.id}
                          onClick={() => setEditing({ section, mat: m })}
                          className="cursor-pointer border-t border-gray-50 hover:bg-blue-50/40"
                        >
                          <td className="px-5 py-2.5 font-bold text-gray-900">
                            {m.name || '-'}
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums text-gray-800">
                            {won(m.price)}
                          </td>
                          <td className="px-5 py-2.5 text-gray-500">{m.unit || '—'}</td>
                          <td className="px-5 py-2.5">
                            {m.active ? (
                              <span className="rounded-md bg-green-50 px-2 py-0.5 text-[12px] font-medium text-green-700">
                                활성
                              </span>
                            ) : (
                              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[12px] font-medium text-gray-400">
                                비활성
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-2.5 text-gray-500">{m.memo || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })}
        </div>
      )}

      {editing && (
        <MaterialEditModal
          workerId={workerId}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void loadData();
          }}
        />
      )}
    </div>
  );
}

function MaterialEditModal({
  workerId,
  editing,
  onClose,
  onSaved,
}: {
  workerId: string;
  editing: Editing;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = editing.mat !== null;
  const [name, setName] = useState(editing.mat?.name ?? '');
  const [priceDisplay, setPriceDisplay] = useState(
    editing.mat ? formatIntKo(editing.mat.price) : '',
  );
  const [unit, setUnit] = useState(editing.mat?.unit ?? '박스당');
  const [active, setActive] = useState(editing.mat?.active ?? true);
  const [memo, setMemo] = useState(editing.mat?.memo ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast('품명을 입력하세요.', 'error');
      return;
    }
    const price = fromGroupedIntegerInput(priceDisplay).value;
    if (!Number.isFinite(price) || price < 0) {
      toast('단가를 올바르게 입력하세요.', 'error');
      return;
    }
    setSaving(true);
    const input = {
      section: editing.section,
      name: name.trim(),
      price,
      unit: unit.trim(),
      active,
      memo: memo.trim(),
    };
    const res = isEdit
      ? await updateMaterial(workerId, editing.mat!.id, input)
      : await createMaterial(workerId, input);
    setSaving(false);
    if (res.success) {
      toast(isEdit ? '수정되었습니다.' : '추가되었습니다.', 'success');
      onSaved();
    } else {
      toast(res.error ?? '저장 실패', 'error');
    }
  };

  const remove = async () => {
    if (!isEdit) return;
    if (!confirm(`'${editing.mat!.name}'을(를) 삭제할까요?`)) return;
    setSaving(true);
    const res = await deleteMaterial(workerId, editing.mat!.id);
    setSaving(false);
    if (res.success) {
      toast('삭제되었습니다.', 'success');
      onSaved();
    } else {
      toast(res.error ?? '삭제 실패', 'error');
    }
  };

  const labelClass = 'text-xs font-semibold text-gray-500';
  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#3182F6]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {editing.section} · {isEdit ? '수정' : '행 추가'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>품명</span>
            <input
              autoFocus
              type="text"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 스티로폼 박스 5호"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>단가 (박스당, 원)</span>
              <input
                type="text"
                inputMode="numeric"
                className={inputClass}
                value={priceDisplay}
                onChange={(e) =>
                  setPriceDisplay(fromGroupedIntegerInput(e.target.value).display)
                }
                placeholder="숫자만"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>단위</span>
              <input
                type="text"
                className={inputClass}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="박스당"
              />
            </label>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#3182F6]"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            활성 (끄면 판매원가 선택지에서 제외)
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>비고</span>
            <input
              type="text"
              className={inputClass}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-between">
          {isEdit ? (
            <button
              onClick={() => void remove()}
              disabled={saving}
              className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-40"
            >
              삭제
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg bg-[#3182F6] px-4 py-2 text-sm font-bold text-white hover:bg-[#1c6ce0] disabled:opacity-40"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
