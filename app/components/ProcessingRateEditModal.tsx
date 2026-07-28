'use client';

// ─────────────────────────────────────────────────────────────────────────────
// 가공비 단가 추가·수정·삭제 모달
//
// 2026-07-28: 전용 화면(/admin/master/processing-rates)을 보관처 마스터의 가공공장
// 덩어리로 흡수하면서, 그 화면 안에 있던 로컬 모달을 여기로 꺼냈다.
// 공장 1곳·단가 1건이라 전용 화면이 과했고, 단가는 "그 공장의 속성"이라 공장 옆이 제자리다.
//
// 가공공장(보관처 구분=가공공장) × 가공품(품목구분=필렛)별 임가공 단가.
// 적용기간으로 시세 변동을 흡수한다(종료일 빈값 = 현재 적용).
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { toast } from '@/lib/toast';
import { fromGroupedIntegerInput, formatIntKo } from '@/lib/number-format';
import { useConfirm } from '@/app/components/ConfirmBottomSheet';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { RATE_BASES, type RateBasis } from '@/lib/processing-rate-basis';
import {
  createProcessingRate,
  updateProcessingRate,
  deleteProcessingRate,
  type ProcessingRate,
} from '@/app/actions/admin/master-processing-rates';
import type { Storage } from '@/app/actions/admin/master-storage';
import type { Product } from '@/app/actions/admin/master-products';

interface Props {
  workerId: string;
  /** null이면 신규. */
  rate: ProcessingRate | null;
  /** 신규일 때 미리 골라 둘 공장(가공공장 덩어리에서 선택 중인 공장). */
  defaultFactoryId?: string;
  factories: Storage[];
  fillets: Product[];
  onClose: () => void;
  onSaved: () => void;
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
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* 라벨 ↔ 입력 8px (§6-5) */}
      <label htmlFor={htmlFor} className="mb-2 block text-label text-text-muted">
        {label} {required && <span className="text-danger-ink">*</span>}
      </label>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="mt-2 text-caption text-danger-ink">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-2 text-caption text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type Errors = {
  factory?: string | null;
  product?: string | null;
  price?: string | null;
  basis?: string | null;
  startDate?: string | null;
};

export default function ProcessingRateEditModal({
  workerId,
  rate,
  defaultFactoryId,
  factories,
  fillets,
  onClose,
  onSaved,
}: Props) {
  const confirm = useConfirm();
  const isEdit = rate !== null;
  const [factoryId, setFactoryId] = useState(rate?.factoryId ?? defaultFactoryId ?? '');
  const [productId, setProductId] = useState(rate?.productId ?? '');
  const [priceDisplay, setPriceDisplay] = useState(rate ? formatIntKo(rate.price) : '');
  const [basis, setBasis] = useState<RateBasis | ''>(rate?.basis ?? '');
  const [startDate, setStartDate] = useState(rate?.startDate ?? '');
  const [endDate, setEndDate] = useState(rate?.endDate ?? '');
  const [memo, setMemo] = useState(rate?.memo ?? '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const factoryRef = useRef<HTMLSelectElement>(null);
  const productRef = useRef<HTMLSelectElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const basisRef = useRef<HTMLSelectElement>(null);
  const startRef = useRef<HTMLInputElement>(null);

  /** 검증은 토스트가 아니라 필드 아래 인라인 (§6-3). 종료일 오류는 시작일 필드에 붙인다. */
  const validate = (): Errors => {
    const price = fromGroupedIntegerInput(priceDisplay).value;
    return {
      factory: factoryId ? null : '가공공장을 선택하세요.',
      product: productId ? null : '가공품을 선택하세요.',
      price: Number.isFinite(price) && price > 0 ? null : '단가를 숫자로 입력하세요.',
      basis: basis ? null : '기준을 선택하세요.',
      startDate: !startDate
        ? '적용시작일을 입력하세요.'
        : endDate && endDate < startDate
          ? '적용종료일이 시작일보다 빠릅니다.'
          : null,
    };
  };

  const save = async () => {
    const e = validate();
    setErrors(e);
    const first = (
      [
        [e.factory, factoryRef],
        [e.product, productRef],
        [e.price, priceRef],
        [e.basis, basisRef],
        [e.startDate, startRef],
      ] as const
    ).find(([msg]) => msg);
    if (first) {
      // 저장 실패 후 첫 오류 필드로 포커스를 되돌린다 (§6-3).
      first[1].current?.focus();
      return;
    }

    setSaving(true);
    const input = {
      factoryId,
      factoryName: factories.find((f) => f.id === factoryId)?.name ?? '',
      productId,
      price: fromGroupedIntegerInput(priceDisplay).value,
      basis: basis as RateBasis,
      startDate,
      endDate: endDate || undefined,
      memo: memo.trim(),
    };
    const res = isEdit
      ? await updateProcessingRate(workerId, rate!.id, input)
      : await createProcessingRate(workerId, input);
    setSaving(false);
    if (res.success) {
      toast(isEdit ? '수정되었습니다.' : '가공비 단가가 추가되었습니다.', 'success');
      onSaved();
    } else {
      // 필드에 귀속되지 않는 오류만 토스트. 서버 원문은 노출하지 않는다 (§6-4).
      console.error('[processing-rates] 저장 실패', res.error);
      toast('저장하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
  };

  const remove = async () => {
    if (!isEdit) return;
    const productLabel = fillets.find((p) => p.id === rate!.productId)?.name ?? '이 가공품';
    // 파괴적 액션은 디자인된 확인 시트만 쓴다 (§6-4). window.confirm 금지.
    const ok = await confirm({
      title: `'${productLabel}' 가공비 단가를 삭제할까요?`,
      message:
        '가공 거래에서 이 공장·가공품 조합의 단가를 더 이상 자동으로 불러오지 못합니다. 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      accent: 'red',
    });
    if (!ok) return;
    setSaving(true);
    const res = await deleteProcessingRate(workerId, rate!.id);
    setSaving(false);
    if (res.success) {
      toast('삭제되었습니다.', 'success');
      onSaved();
    } else {
      console.error('[processing-rates] 삭제 실패', res.error);
      toast('삭제하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
    }
  };

  return (
    <Modal
      title={`가공비 단가 ${isEdit ? '수정' : '추가'}`}
      onClose={onClose}
      destructiveAction={
        isEdit ? (
          <Button variant="ghost" tone="danger" icon={TrashIcon} onClick={remove} disabled={saving}>
            삭제
          </Button>
        ) : undefined
      }
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
        </>
      }
    >
      <Field label="가공공장" required error={errors.factory} htmlFor="rate-factory">
        <select
          id="rate-factory"
          ref={factoryRef}
          value={factoryId}
          onChange={(e) => setFactoryId(e.target.value)}
          className={fieldClass(Boolean(errors.factory))}
        >
          <option value="">선택하세요</option>
          {factories.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="가공품 (필렛)" required error={errors.product} htmlFor="rate-product">
        <select
          id="rate-product"
          ref={productRef}
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className={fieldClass(Boolean(errors.product))}
        >
          <option value="">선택하세요</option>
          {fillets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.code ? ` (${p.code})` : ''}
            </option>
          ))}
        </select>
      </Field>

      <Field label="단가 (원)" required error={errors.price} htmlFor="rate-price">
        <input
          id="rate-price"
          ref={priceRef}
          type="text"
          inputMode="numeric"
          value={priceDisplay}
          onChange={(e) => setPriceDisplay(fromGroupedIntegerInput(e.target.value).display)}
          placeholder="숫자만"
          className={fieldClass(Boolean(errors.price))}
        />
      </Field>

      <Field
        label="기준"
        required
        error={errors.basis}
        htmlFor="rate-basis"
        hint="ONE-Frozen(제주)=투입kg당 · TWO-Frozen(부산·해외)=산출kg당"
      >
        <select
          id="rate-basis"
          ref={basisRef}
          value={basis}
          onChange={(e) => setBasis(e.target.value as RateBasis | '')}
          className={fieldClass(Boolean(errors.basis))}
        >
          <option value="">선택하세요</option>
          {RATE_BASES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </Field>

      <Field label="적용시작일" required error={errors.startDate} htmlFor="rate-start">
        <input
          id="rate-start"
          ref={startRef}
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={fieldClass(Boolean(errors.startDate))}
        />
      </Field>

      <Field label="적용종료일" htmlFor="rate-end" hint="비우면 현재 적용 중으로 봅니다.">
        <input
          id="rate-end"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className={fieldClass(false)}
        />
      </Field>

      <Field label="비고" htmlFor="rate-memo">
        <input
          id="rate-memo"
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className={fieldClass(false)}
        />
      </Field>
    </Modal>
  );
}
