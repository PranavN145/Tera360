'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Megaphone,
  Radio,
  ScrollText,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import PortalLayout from '@/components/portal/PortalLayout';
import PortalMetricGrid from '@/components/portal/PortalMetricGrid';
import OfficerKpiCard from '@/components/officer/OfficerKpiCard';
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
        const res = await publicApi.getAlerts({ limit: 50 });
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
            className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 sm:space-y-8 w-full">
        {/* ── 1. Top Metric Summary Cards (4-column responsive grid) ── */}
        <PortalMetricGrid columns={4} ariaLabel="Alert Center Metric Summary">
          <OfficerKpiCard
            id="metric-critical-alerts"
            variant="summary"
            title="Critical Bulletins"
            value={criticalCount}
            unit="Evacuation / Red"
            icon={ShieldAlert}
            accent={criticalCount > 0 ? 'red' : 'green'}
            badge="Red Alert"
            badgeTone="red"
            detail="Life-safety danger advisories and mandatory evacuation orders"
            isLoading={isLoadingMetrics}
          />

          <OfficerKpiCard
            id="metric-warning-alerts"
            variant="summary"
            title="Warning Advisories"
            value={warningCount}
            unit="Amber Stage"
            icon={AlertTriangle}
            accent={warningCount > 0 ? 'amber' : 'green'}
            badge="Amber Notice"
            badgeTone="amber"
            detail="Highway transit restrictions and active slope clearance warnings"
            isLoading={isLoadingMetrics}
          />

          <OfficerKpiCard
            id="metric-watch-alerts"
            variant="summary"
            title="Watch State"
            value={watchCount}
            unit="Yellow Stage"
            icon={Zap}
            accent={watchCount > 0 ? 'amber' : 'green'}
            badge="Yellow Watch"
            badgeTone={watchCount > 0 ? 'amber' : 'green'}
            detail="Early pore-water saturation and meteorological watch bulletins"
            isLoading={isLoadingMetrics}
          />

          <OfficerKpiCard
            id="metric-gateway-status"
            variant="summary"
            title="Telecom Gateway"
            value="In-App Active"
            icon={Radio}
            accent="blue"
            badge="Local Sync"
            badgeTone="blue"
            detail="Push notifications operational; cellular SMS/IVR running locally"
            isLoading={false}
          />
        </PortalMetricGrid>

        {/* ── 2. Tab Navigation Switcher ── */}
        <div
          role="tablist"
          aria-label="Alert Center sections"
          className="flex flex-wrap items-center gap-2.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'compose'}
            onClick={() => setActiveTab('compose')}
            className={`py-2 px-4 sm:px-5 rounded-full text-xs sm:text-[13px] font-bold transition-all cursor-pointer inline-flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'compose'
                ? 'bg-[#173D32] text-[#F6F4EC] shadow-xs'
                : 'bg-[#FAF8F2] text-[#173D32]/85 border border-[#173D32]/15 hover:bg-white hover:text-[#173D32]'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
            <span>Create &amp; Review Alert</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            className={`py-2 px-4 sm:px-5 rounded-full text-xs sm:text-[13px] font-bold transition-all cursor-pointer inline-flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-[#173D32] text-[#F6F4EC] shadow-xs'
                : 'bg-[#FAF8F2] text-[#173D32]/85 border border-[#173D32]/15 hover:bg-white hover:text-[#173D32]'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
            <span>Alert History &amp; Logs</span>
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
