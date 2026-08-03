'use client';

// ─────────────────────────────────────────────────────────────────────────────
// 작업 정산 — 이력 목록 (임시저장 / 확정 / 취소)
//   등록은 별도 워크리스트(/work-settlement/new). 확정 시 생산내역별 입고·LOT 생성.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import { readSession, isSessionExpired, isMasterRole } from '@/lib/session';
import { toast } from '@/lib/toast';
import { formatStamp } from '@/lib/format-datetime';
import { NumCell, NumHead } from '@/app/admin/_num-cell';
import {
  listWorkSettlements,
  cancelWorkSettlement,
  type WorkSettlementSummary,
} from '@/app/actions/admin/master-work-settlement';
import { listShips } from '@/app/actions/admin/master-ships';

export default function WorkSettlementPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  // 삭제 버튼 노출용. 실제 차단은 서버(cancelWorkSettlement → requireMaster)가 한다.
  const [canDelete, setCanDelete] = useState(false);
  const [rows, setRows] = useState<WorkSettlementSummary[]>([]);
  const [shipNames, setShipNames] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace('/login');
      return;
    }
    setWorkerId(session.workerId);
    setCanDelete(isMasterRole(session));
  }, [router]);

  const loadData = useCallback(async () => {
    if (!workerId) return;
    setIsLoading(true);
    const [w, s] = await Promise.all([
      listWorkSettlements(workerId),
      listShips(workerId),
    ]);
    if (w.success) setRows(w.data);
    else toast(`조회 실패: ${w.error}`, 'error');
    if (s.success) setShipNames(new Map(s.data.map((x) => [x.id, x.name])));
    setIsLoading(false);
  }, [workerId]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  const shipName = useMemo(
    () => (id: string) => shipNames.get(id) ?? '—',
    [shipNames],
  );

  const cancel = async (row: WorkSettlementSummary) => {
    if (!workerId) return;
    const isDraft = row.status === '임시저장';
    const msg = isDraft
      ? `'${row.no}'를 삭제할까요?`
      : `'${row.no}'를 취소할까요? 생성된 입고·재고(LOT)가 함께 취소됩니다. (미출고 상태만 가능)`;
    if (!confirm(msg)) return;
    const res = await cancelWorkSettlement(workerId, row.id);
    if (res.success) {
      toast(isDraft ? '삭제되었습니다.' : '취소되었습니다.', 'success');
      void loadData();
    } else {
      toast(res.error ?? (isDraft ? '삭제 실패' : '취소 실패'), 'error');
    }
  };

  if (!workerId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-accent-fill" />
      </div>
    );
  }

  const draft = rows.filter((r) => r.status === '임시저장');
  const rest = rows.filter((r) => r.status !== '임시저장');

  return (
    <div className="mx-auto min-w-0 max-w-[1200px] p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-page text-text">작업 정산</h1>
          <p className="mt-1 text-body text-text-muted">
            수협 정산서를 옮겨 원물 매입·원가를 기록합니다. 확정하면 생산내역 한 줄마다 입고·재고(LOT)가
            생성됩니다.
          </p>
        </div>
        <Link
          href="/admin/master/work-settlement/new"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent-fill px-3.5 py-2 text-body text-white hover:bg-accent-fill-hover"
        >
          <PlusIcon className="h-4 w-4" />
          작업 정산 등록
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-accent-fill" />
        </div>
      ) : (
        <div className="space-y-6">
          {draft.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
                <h2 className="text-section text-text">
                  임시저장 <span className="text-body text-text-muted">{draft.length}건</span>
                </h2>
              </div>
              <SettlementTable rows={draft} shipName={shipName} onCancel={cancel} canDelete={canDelete} />
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
              <h2 className="text-section text-text">
                확정·취소 <span className="text-body text-text-muted">{rest.length}건</span>
              </h2>
            </div>
            {rest.length === 0 ? (
              <div className="px-5 py-10 text-center text-body text-text-muted">아직 없습니다.</div>
            ) : (
              <SettlementTable rows={rest} shipName={shipName} onCancel={cancel} canDelete={canDelete} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function SettlementTable({
  rows,
  shipName,
  onCancel,
  canDelete,
}: {
  rows: WorkSettlementSummary[];
  shipName: (id: string) => string;
  onCancel: (r: WorkSettlementSummary) => void;
  /** MASTER만 삭제·취소 버튼을 본다. 서버가 재검증하므로 이건 노출 제어일 뿐이다. */
  canDelete: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body">
        <thead>
          <tr className="text-left text-table-head text-gray-400">
            <th className="px-5 py-2.5 text-center">정산번호</th>
            <th className="px-5 py-2.5 text-center">작업일</th>
            <th className="px-5 py-2.5 text-center">선박명</th>
            <NumHead className="px-5 py-2.5">생산내역</NumHead>
            <NumHead className="pl-5 py-2.5 pr-[21px]">어대금</NumHead>
            <th className="px-5 py-2.5 text-left">작성</th>
            <th className="px-5 py-2.5 text-center">상태</th>
            <th className="px-5 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-gray-50">
              <td className="px-5 py-2.5 text-center font-medium tabular-nums text-gray-900">{r.no || '—'}</td>
              <td className="px-5 py-2.5 text-center tabular-nums text-gray-700">{r.date || '—'}</td>
              <td className="px-5 py-2.5 text-center text-gray-800">{shipName(r.shipId)}</td>
              <NumCell className="px-5 py-2.5 text-gray-700" value={r.lineCount} unit="줄" />
              <NumCell
                className="pl-5 py-2.5 pr-[21px] text-gray-700"
                value={r.catchAmount > 0 ? r.catchAmount : null}
                unit="원"
                empty="—"
              />
              {/* 누가 언제 만들었는지. 최종 수정 흔적은 title로 보조 노출한다 —
                  한 셀에 두 줄을 넣으면 행 높이가 들쭉날쭉해진다(/admin 표 규칙). */}
              <td
                className="whitespace-nowrap px-5 py-2.5 text-left text-label text-text-muted"
                title={
                  r.updatedAt
                    ? `최종 수정 ${formatStamp(r.updatedAt, r.updatedByName)}`
                    : undefined
                }
              >
                {formatStamp(r.createdAt, r.createdByName)}
              </td>
              <td className="px-5 py-2.5 text-center">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-5 py-2.5 text-right whitespace-nowrap">
                {r.status === '임시저장' && (
                  <Link
                    href={`/admin/master/work-settlement/${r.id}`}
                    className="mr-3 text-label text-link hover:text-accent-fill-hover"
                  >
                    이어서 작성 →
                  </Link>
                )}
                {canDelete && r.status !== '취소' && (
                  <button
                    onClick={() => onCancel(r)}
                    className="text-label text-danger-ink hover:text-danger-ink"
                  >
                    {r.status === '임시저장' ? '삭제' : '취소'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === '확정'
      ? 'bg-green-50 text-green-700'
      : status === '임시저장'
        ? 'bg-gray-100 text-gray-500'
        : 'bg-gray-100 text-gray-400';
  return <span className={`rounded-md px-2 py-0.5 text-caption ${cls}`}>{status}</span>;
}
