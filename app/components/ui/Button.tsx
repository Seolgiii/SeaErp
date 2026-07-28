// ─────────────────────────────────────────────────────────────────────────────
// <Button> — DESIGN.md §6-1
//
// 화면에서 버튼 클래스를 직접 조합하지 않는다. 버튼은 전부 이 컴포넌트로 만든다.
//
//   variant  primary   채움. **화면당 1개** (§2-3). 표 행 액션·빈 상태 버튼은 여기 쓰지 않는다.
//            secondary 중립 아웃라인
//            ghost     텍스트만
//   tone     danger    삭제 등 파괴적 액션. secondary·ghost에만 의미 있다.
//
// 높이는 padding이 아니라 `h-control`(CSS 변수) 고정 — /admin 32px · 모바일 44px.
// padding으로 높이를 만들면 폰트 크기가 바뀔 때 무너진다.
// ─────────────────────────────────────────────────────────────────────────────

import type { ButtonHTMLAttributes, ComponentType, SVGProps } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Tone = 'default' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  tone?: Tone;
  /** 라벨 왼쪽 아이콘. children 없이 쓰면 아이콘 전용 정사각 버튼(aria-label 필수). */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  fullWidth?: boolean;
}

/**
 * 공통 골격 — 높이 고정 + 포커스 링(§9 키보드 접근) + reduced-motion 존중.
 * 누를 때 크기가 변하는 연출은 넣지 않는다 (§1 장식적 애니메이션 금지).
 */
const BASE =
  'inline-flex h-control items-center justify-center gap-2 rounded-control text-body ' +
  'whitespace-nowrap transition-colors motion-reduce:transition-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fill focus-visible:ring-offset-1 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed';

const VARIANT: Record<Variant, string> = {
  // 채움 배경은 파스텔이 아니라 accent-fill (흰 글자 대비 4.92)
  primary: 'bg-accent-fill text-surface hover:bg-accent-fill-hover',
  secondary: 'border border-border bg-surface text-text hover:bg-surface-alt',
  ghost: 'text-text-muted hover:bg-surface-alt hover:text-text',
};

/**
 * tone="danger"는 secondary·ghost에만 있다.
 * 채움(primary) 위험 버튼은 만들지 않았다 — 파괴적 액션은 확인 시트를 한 번 거치므로(§6-4)
 * 시트 밖에서까지 빨간 채움으로 시선을 끌 이유가 없다. 필요해지면 그때 추가한다.
 */
const DANGER: Partial<Record<Variant, string>> = {
  secondary: 'border border-danger-ink bg-surface text-danger-ink hover:bg-danger-bg',
  ghost: 'text-danger-ink hover:bg-danger-bg',
};

/** primary/secondary는 넉넉히, ghost는 좁게. 아이콘 전용은 정사각. */
function padding(variant: Variant, iconOnly: boolean): string {
  if (iconOnly) return 'w-control p-0';
  return variant === 'ghost' ? 'px-3' : 'px-4';
}

export function Button({
  variant = 'secondary',
  tone = 'default',
  icon: Icon,
  fullWidth = false,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconOnly = Boolean(Icon) && children == null;
  const look = (tone === 'danger' && DANGER[variant]) || VARIANT[variant];
  return (
    <button
      type={type}
      className={`${BASE} ${look} ${padding(variant, iconOnly)} ${
        fullWidth ? 'w-full' : ''
      } ${className}`.trim()}
      {...rest}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
