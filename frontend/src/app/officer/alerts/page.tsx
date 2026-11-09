'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import PortalLayout from '@/components/portal/PortalLayout';
import PortalMetricGrid from '@/components/portal/PortalMetricGrid';
import PortalMetricCard from '@/components/portal/PortalMetricCard';
import AlertComposer from '@/components/officer/alerts/AlertComposer';
import AlertHistoryFeed from '@/components/officer/alerts/AlertHistoryFeed';
import { publicApi } from '@/lib/api';
import { PublicAlertItem } from '@/types/public';

export default function OfficerAlertsPage() {
  const [activeTab, setActiveTab] = useState<'history' | 'compose'>('compose');

  // Operational metrics from live backend
  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadMetrics() {
      try {
        const res = await publicApi.getAlerts({ limit: 100 });
        if (mounted) {
          setAlerts(res.alerts);
        }
      } catch {
        // Safe fallback
      } finally {
        if (mounted) {
          setIsLoadingMetrics(false);
        }
      }
    }
    void loadMetrics();
    return () => {
      mounted = false;
    };
  }, []);

  const criticalCount = alerts.filter((a) => a.severity === 'Critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'Warning').length;
  const watchCount = alerts.filter((a) => a.severity === 'Watch').length;

  return (
    <PortalLayout
      allowedRoles={['officer', 'admin']}
      title="Disaster Alert Center & Broadcast Operations"
      subtitle="Supervise active regional landslide warnings, formulate targeted multi-channel advisories, and audit official broadcast dispatches."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/officer/dashboard"
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all"
          >
            ← Dashboard
          </Link>
        </div>
      }
    >
      <div className="space-y-6 sm:space-y-8 w-full">
        {/* ── 1. Top Metric Summary Cards (4-column responsive grid) ── */}
        <PortalMetricGrid columns={4} ariaLabel="Alert Center Metric Summary">
          <PortalMetricCard
            id="metric-critical-alerts"
            title="Critical Bulletins"
            value={criticalCount}
            unit="Evacuation / Red"
            icon="🔴"
            badge="Red Alert"
            badgeVariant="critical"
            detail="Life-safety danger advisories and mandatory evacuation orders"
            pulse={criticalCount > 0}
            isLoading={isLoadingMetrics}
          />

          <PortalMetricCard
            id="metric-warning-alerts"
            title="Warning Advisories"
            value={warningCount}
            unit="Amber Stage"
            icon="🟡"
            badge="Amber Notice"
            badgeVariant="warning"
            detail="Highway transit restrictions and active slope clearance warnings"
            isLoading={isLoadingMetrics}
          />

          <PortalMetricCard
            id="metric-watch-alerts"
            title="Watch State"
            value={watchCount}
            unit="Yellow Stage"
            icon="⚡"
            badge="Yellow Watch"
            badgeVariant="watch"
            detail="Early pore-water saturation and meteorological watch bulletins"
            isLoading={isLoadingMetrics}
          />

          <PortalMetricCard
            id="metric-gateway-status"
            title="Telecom Gateway"
            value="In-App Active"
            icon="📡"
            badge="Local Sync"
            badgeColor="bg-amber-100 text-amber-900 border-amber-300"
            detail="Push notifications operational; cellular SMS/IVR running locally"
            isLoading={false}
          />
        </PortalMetricGrid>

        {/* ── 2. Tab Navigation Switcher ── */}
        <div className="flex rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 p-1.5 max-w-md shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'compose'
                ? 'bg-[#173D32] text-[#F6F4EC] shadow-xs'
                : 'text-[#173D32]/75 hover:bg-[#173D32]/5'
            }`}
          >
            <span>📢</span>
            <span>Create & Review Alert</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-[#173D32] text-[#F6F4EC] shadow-xs'
                : 'text-[#173D32]/75 hover:bg-[#173D32]/5'
            }`}
          >
            <span>📜</span>
            <span>Alert History & Logs</span>
          </button>
        </div>

        {/* ── 3. Active Tab Viewport ── */}
        <div className="w-full">
          {activeTab === 'compose' ? (
            <AlertComposer />
          ) : (
            <AlertHistoryFeed onComposeClick={() => setActiveTab('compose')} />
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
