// ─────────────────────────────────────────────────────────────────────────────
// <LoadingState> — DESIGN.md §6-4
//
// 목록 표는 **스켈레톤**으로 로딩한다. 전체 블록 스피너는 최초 진입(레이아웃이
// 아직 없을 때) 1회에만 허용한다. 화면이 통째로 사라지면 어디까지 진행됐는지 알 수 없다.
//
//   <LoadingState cols={COLS} rows={8} />   표 골격 스켈레톤 (컬럼 폭까지 실제 표와 동일)
//   <LoadingState />                        최초 진입용 스피너
//
// 골격은 `app/admin/_table-cols.tsx`의 COLS에서 자동 생성한다 — 컬럼 수와 폭을
// 이미 알고 있으므로 화면마다 스켈레톤을 따로 그릴 필요가 없다.
// ─────────────────────────────────────────────────────────────────────────────

import { SpacerCell, TableColGroup, tableMinWidth, type TableCol } from '@/app/admin/_table-cols';

export interface LoadingStateProps {
  /** 넘기면 표 스켈레톤, 없으면 스피너. */
  cols?: readonly TableCol[];
  /** 스켈레톤 행 수. 기본 8. */
  rows?: number;
  /**
   * 실제 표가 스페이서 컬럼을 쓰면 여기도 켜야 한다.
   * 안 켜면 스켈레톤은 비례 확대, 실제 표는 고정 폭이라 로딩이 끝나는 순간 컬럼이 튄다.
   */
  spacer?: boolean;
  /** 스피너 모드에서 읽어줄 문구. */
  label?: string;
}

/** 셀 하나 — 폭이 조금씩 달라야 실제 데이터처럼 보인다(전부 같으면 표가 아니라 줄무늬로 읽힌다). */
function SkeletonBar({ seed }: { seed: number }) {
  const width = [88, 64, 76, 52, 92, 70][seed % 6];
  return (
    <span
      className="block h-3 animate-pulse rounded-control bg-surface-alt motion-reduce:animate-none"
      style={{ width: `${width}%` }}
    />
  );
}

export function LoadingState({ cols, rows = 8, spacer = false, label = '불러오는 중…' }: LoadingStateProps) {
  // 최초 진입 — 레이아웃이 아직 없어 골격을 그릴 수 없는 경우에만.
  if (!cols) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
        <span
          className="h-6 w-6 animate-spin rounded-pill border-2 border-border border-t-accent-fill motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <table className="w-full table-fixed" style={{ minWidth: tableMinWidth(cols) }}>
        <TableColGroup cols={cols} spacer={spacer} />
        <thead>
          <tr className="bg-surface-alt">
            {cols.map((c) => (
              <th key={c.key} className="px-4 py-2 text-left text-table-head text-text-muted">
                {c.label}
              </th>
            ))}
            {spacer && <SpacerCell as="th" />}
          </tr>
        </thead>
        <tbody aria-hidden="true">
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r} className="border-t border-border">
              {cols.map((c, i) => (
                <td key={c.key} className="px-4 py-2">
                  <SkeletonBar seed={r + i} />
                </td>
              ))}
              {spacer && <SpacerCell />}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
