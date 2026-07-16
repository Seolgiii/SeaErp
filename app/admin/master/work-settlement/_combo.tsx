'use client';

// 입력 + 스크롤 콤보. 팝업은 document.body로 포털 렌더(고정 위치)라
// 표의 overflow-x 영역에 잘리지 않는다. CSS max-height로 ~5행만 노출·나머지 스크롤.
// 키보드: ↑↓ 하이라이트, Enter 선택 후 다음 입력칸으로 이동, Esc 닫기.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** DOM 순서상 다음 포커스 가능한 요소로 이동(콤보 Enter 후). */
function focusNext(el: HTMLElement | null) {
  if (!el) return;
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>('input,select,textarea,button,[tabindex]'),
  ).filter(
    (e) => !(e as HTMLButtonElement).disabled && e.tabIndex !== -1 && e.offsetParent !== null,
  );
  const i = nodes.indexOf(el);
  if (i >= 0 && i + 1 < nodes.length) nodes[i + 1].focus();
}

export function Combo({
  value,
  onChange,
  options,
  placeholder,
  startsWith,
  blurFormat,
  inputClass,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  startsWith?: boolean;
  blurFormat?: (v: string) => string;
  inputClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = value.trim();
  const filtered = (
    !q ? options : options.filter((o) => (startsWith ? o.startsWith(q) : o.includes(q)))
  ).slice(0, 300);

  const place = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  };
  useEffect(() => {
    if (!open) return;
    place();
    const on = () => place();
    window.addEventListener('scroll', on, true);
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on, true);
      window.removeEventListener('resize', on);
    };
  }, [open]);
  useEffect(() => {
    setHi((h) => Math.max(0, Math.min(h, filtered.length - 1)));
  }, [filtered.length]);
  useEffect(() => {
    if (!open || !popRef.current) return;
    const act = popRef.current.querySelector('.ws-combo-opt.active');
    if (act) (act as HTMLElement).scrollIntoView({ block: 'nearest' });
  }, [hi, open]);

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    if (timer.current) clearTimeout(timer.current);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHi((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered.length) {
        e.preventDefault();
        select(filtered[Math.max(0, Math.min(hi, filtered.length - 1))]);
        focusNext(inputRef.current);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="combo">
      <input
        ref={inputRef}
        className={inputClass}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        onBlur={() => {
          if (blurFormat) {
            const f = blurFormat(value);
            if (f !== value) onChange(f);
          }
          timer.current = setTimeout(() => setOpen(false), 120);
        }}
      />
      {open && filtered.length > 0 && rect && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popRef}
            className="ws-combo-portal"
            style={{ position: 'fixed', top: rect.top, left: rect.left, minWidth: rect.width }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {filtered.map((o, i) => (
              <div
                key={o}
                className={`ws-combo-opt${i === hi ? ' active' : ''}`}
                onMouseEnter={() => setHi(i)}
                onClick={() => select(o)}
              >
                {o}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
