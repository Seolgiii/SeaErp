'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  InboxIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  CubeIcon,
  BookOpenIcon,
  CalculatorIcon,
  IdentificationIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { readSession, isSessionExpired } from '@/lib/session';
import { toast } from '@/lib/toast';
import { logError } from '@/lib/logger';
import { getMyRequests } from '@/app/actions';
import { getHealthSummary, type HealthSummary } from '@/app/actions/admin/master-health';
import { PENDING_STATUSES } from '@/app/components/approval-card-shared';
import { NAV_GROUPS, type NavGroup } from './_nav';
import { APP_VERSION } from '@/lib/version';

/**
 * PC 관리자 홈 (control center).
 *
 * 상단: KPI 4장 — 결재 대기 / 오늘 입고 / 오늘 출고 / 위험 LOT
 * 하단: 6 카테고리 진입 카드 (사이드바와 일대일, 미구현은 disabled 시각)
 *
 * "오늘 뭐부터 해야 하는지" + "어디로 갈지"를 한 화면에 제공.
 */

type Kpi = {
  pendingApprovals: number;
  pendingByType: { INBOUND: number; OUTBOUND: number; TRANSFER: number; EXPENSE: number };
  todayInboundApproved: number;
  todayOutboundApproved: number;
  health: HealthSummary | null;
};

const EMPTY_KPI: Kpi = {
  pendingApprovals: 0,
  pendingByType: { INBOUND: 0, OUTBOUND: 0, TRANSFER: 0, EXPENSE: 0 },
  todayInboundApproved: 0,
  todayOutboundApproved: 0,
  health: null,
};

// 6 카테고리 아이콘 매핑 (NAV_GROUPS title → icon)
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  결재: CheckBadgeIcon,
  재고: CubeIcon,
  '거래 이력': BookOpenIcon,
  '원가·손익': CalculatorIcon,
  마스터: IdentificationIcon,
  '시스템·운영': WrenchScrewdriverIcon,
};

const CATEGORY_COLORS: Record<string, string> = {
  결재: 'text-[#3182F6] bg-[#3182F6]/10',
  재고: 'text-[#00D082] bg-[#00D082]/10',
  '거래 이력': 'text-[#5061FF] bg-[#5061FF]/10',
  '원가·손익': 'text-orange-600 bg-orange-100',
  마스터: 'text-purple-600 bg-purple-100',
  '시스템·운영': 'text-gray-600 bg-gray-100',
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MasterHomePage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [workerName, setWorkerName] = useState<string>('');
  const [kpi, setKpi] = useState<Kpi>(EMPTY_KPI);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = readSession();
    if (!session || isSessionExpired(session)) {
      router.replace('/login');
      return;
    }
    setWorkerId(session.workerId);
    setWorkerName(session.workerName ?? '');
  }, [router]);

  const loadData = useCallback(async () => {
    if (!workerId) return;
    setIsLoading(true);
    try {
      const [requests, healthRes] = await Promise.all([
        getMyRequests(),
        getHealthSummary(workerId),
      ]);

      const today = todayYmd();
      const next: Kpi = {
        ...EMPTY_KPI,
        pendingByType: { INBOUND: 0, OUTBOUND: 0, TRANSFER: 0, EXPENSE: 0 },
      };
      for (const it of requests) {
        const pending = PENDING_STATUSES.includes(it.status);
        if (pending) {
          next.pendingApprovals++;
          if (it.type in next.pendingByType) next.pendingByType[it.type as keyof typeof next.pendingByType]++;
        }
        if (it.status === '승인 완료' && it.date?.startsWith(today)) {
          if (it.type === 'INBOUND') next.todayInboundApproved++;
          else if (it.type === 'OUTBOUND') next.todayOutboundApproved++;
        }
      }
      if (healthRes.success) next.health = healthRes.data;
      setKpi(next);
    } catch (err) {
      logError('[master-home] loadData failed', err);
      toast('홈 데이터를 불러오지 못했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    if (workerId) void loadData();
  }, [workerId, loadData]);

  const healthAlertCount = useMemo(() => {
    if (!kpi.health) return 0;
    return (
      kpi.health.negativeStockLots +
      kpi.health.invalidRemainingInbound +
      kpi.health.outboundCostNull +
      kpi.health.lockedWorkers
    );
  }, [kpi.health]);

  if (!workerId) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#3182F6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 min-w-0 max-w-[1280px]">
      {/* 헤더 */}
      <div className="mb-7">
        <h1 className="text-[26px] font-black text-gray-900 tracking-tight">
          안녕하세요{workerName ? `, ${workerName}님` : ''}
        </h1>
        <p className="text-[14px] text-gray-500 font-medium mt-1.5">
          {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}{' '}
          · 오늘의 운영 상태 한눈에
        </p>
      </div>

      {/* KPI 4장 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard
          href="/admin/master/approval/inbox"
          icon={InboxIcon}
          iconClass="text-[#3182F6] bg-[#3182F6]/10"
          label="결재 대기"
          value={kpi.pendingApprovals}
          subtitle={
            kpi.pendingApprovals > 0
              ? buildPendingSub(kpi.pendingByType)
              : '모두 처리됐어요'
          }
          loading={isLoading}
          accent={kpi.pendingApprovals > 0}
        />
        <KpiCard
          href="/admin/master/approval/inbox?type=INBOUND&tab=done"
          icon={ArrowDownTrayIcon}
          iconClass="text-[#00D082] bg-[#00D082]/10"
          label="오늘 입고 승인"
          value={kpi.todayInboundApproved}
          subtitle="건"
          loading={isLoading}
        />
        <KpiCard
          href="/admin/master/approval/inbox?type=OUTBOUND&tab=done"
          icon={ArrowUpTrayIcon}
          iconClass="text-[#5061FF] bg-[#5061FF]/10"
          label="오늘 출고 승인"
          value={kpi.todayOutboundApproved}
          subtitle="건"
          loading={isLoading}
        />
        <KpiCard
          href="/admin/master/health"
          icon={ExclamationTriangleIcon}
          iconClass={
            healthAlertCount > 0
              ? 'text-[#FF3B30] bg-red-50'
              : 'text-gray-400 bg-gray-100'
          }
          label="위험 알림"
          value={healthAlertCount}
          subtitle={
            kpi.health
              ? healthAlertCount > 0
                ? buildHealthSub(kpi.health)
                : '정상'
              : '확인 중'
          }
          loading={isLoading}
          accent={healthAlertCount > 0}
          danger={healthAlertCount > 0}
        />
      </div>

      {/* 카테고리 카드 */}
      <h2 className="text-[15px] font-black text-gray-800 mb-3">바로 가기</h2>
      <div className="grid grid-cols-3 gap-4">
        {NAV_GROUPS.map((group) => (
          <CategoryCard key={group.title} group={group} />
        ))}
      </div>

      {/* 좌측 하단 버전 — 사용자가 현재 배포 버전을 보고 판단 */}
      <p className="mt-10 text-[11px] font-bold text-gray-300">SEAERP v{APP_VERSION}</p>
    </div>
  );
}

function buildPendingSub(byType: { INBOUND: number; OUTBOUND: number; TRANSFER: number; EXPENSE: number }): string {
  const parts: string[] = [];
  if (byType.INBOUND) parts.push(`입고 ${byType.INBOUND}`);
  if (byType.OUTBOUND) parts.push(`출고 ${byType.OUTBOUND}`);
  if (byType.TRANSFER) parts.push(`이동 ${byType.TRANSFER}`);
  if (byType.EXPENSE) parts.push(`지출 ${byType.EXPENSE}`);
  return parts.length > 0 ? parts.join(' · ') : '건';
}

function buildHealthSub(h: HealthSummary): string {
  const parts: string[] = [];
  if (h.negativeStockLots) parts.push(`음수 ${h.negativeStockLots}`);
  if (h.invalidRemainingInbound) parts.push(`잔여 ${h.invalidRemainingInbound}`);
  if (h.outboundCostNull) parts.push(`비용NULL ${h.outboundCostNull}`);
  if (h.lockedWorkers) parts.push(`잠김 ${h.lockedWorkers}`);
  return parts.join(' · ');
}

// ──────────────────────────────────────────────────────────────────────────────
// KPI 카드
// ──────────────────────────────────────────────────────────────────────────────

function KpiCard({
  href,
  icon: Icon,
  iconClass,
  label,
  value,
  subtitle,
  loading,
  accent,
  danger,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  value: number;
  subtitle: string;
  loading: boolean;
  accent?: boolean;
  danger?: boolean;
}) {
  const valueColor = danger
    ? 'text-[#FF3B30]'
    : accent
      ? 'text-[#191F28]'
      : 'text-gray-700';
  return (
    <Link
      href={href}
      className="group bg-white rounded-2xl p-5 shadow-sm border border-transparent hover:border-[#3182F6]/30 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-[12px] font-bold text-gray-500 tracking-tight">{label}</p>
      <p className={`text-[32px] font-black tracking-tight leading-none mt-1.5 ${valueColor}`}>
        {loading ? <span className="text-gray-200">—</span> : value.toLocaleString('ko-KR')}
      </p>
      <p className="text-[12px] font-medium text-gray-400 mt-2 truncate">{subtitle}</p>
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 카테고리 카드
// ──────────────────────────────────────────────────────────────────────────────

function CategoryCard({ group }: { group: NavGroup }) {
  const Icon = CATEGORY_ICONS[group.title] ?? CubeIcon;
  const iconClass = CATEGORY_COLORS[group.title] ?? 'text-gray-600 bg-gray-100';
  const enabledCount = group.items.filter((i) => i.enabled).length;
  const totalCount = group.items.length;
  const firstEnabled = group.items.find((i) => i.enabled);

  const inner = (
    <>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconClass} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-black text-gray-900">{group.title}</p>
          <p className="text-[11px] font-bold text-gray-400 mt-0.5">
            {enabledCount}/{totalCount} 활성
          </p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {group.items.map((item) => (
          <li
            key={item.href}
            className={`flex items-center justify-between text-[12px] font-bold ${
              item.enabled ? 'text-gray-700' : 'text-gray-300'
            }`}
          >
            <span className="truncate">{item.label}</span>
            {!item.enabled && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 shrink-0 ml-2">
                준비중
              </span>
            )}
          </li>
        ))}
      </ul>
    </>
  );

  if (!firstEnabled) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-transparent opacity-70 cursor-not-allowed">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={firstEnabled.href}
      className="group block bg-white rounded-2xl p-5 shadow-sm border border-transparent hover:border-[#3182F6]/30 hover:shadow-md transition-all"
    >
      {inner}
    </Link>
  );
}
