'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import PortalLayout from '@/components/portal/PortalLayout';
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
      {/* Top Metric Summary Cards */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Critical Card */}
        <div className="bg-[#FAF8F2] border border-red-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-red-700 tracking-wider block">
              Critical (Evacuation / Red)
            </span>
            <span className="text-2xl font-black text-red-700 mt-0.5 block">
              {isLoadingMetrics ? '...' : criticalCount}
            </span>
          </div>
          <span className="text-2xl">🔴</span>
        </div>

        {/* Warning Card */}
        <div className="bg-[#FAF8F2] border border-amber-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-amber-800 tracking-wider block">
              Warning Advisories (Amber)
            </span>
            <span className="text-2xl font-black text-amber-800 mt-0.5 block">
              {isLoadingMetrics ? '...' : warningCount}
            </span>
          </div>
          <span className="text-2xl">🟡</span>
        </div>

        {/* Watch Card */}
        <div className="bg-[#FAF8F2] border border-yellow-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-yellow-800 tracking-wider block">
              Watch State (Yellow)
            </span>
            <span className="text-2xl font-black text-yellow-800 mt-0.5 block">
              {isLoadingMetrics ? '...' : watchCount}
            </span>
          </div>
          <span className="text-2xl">⚡</span>
        </div>

        {/* Gateway Telemetry Status Card */}
        <div className="bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-[#173D32]/70 tracking-wider block">
              Telecom Broadcast Gateway
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-black text-amber-900 block">Offline (In-App Only)</span>
            </div>
          </div>
          <span className="text-xl">📡</span>
        </div>
      </div>

      {/* Main Tab Navigation Switcher */}
      <div className="mb-6 flex rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 p-1.5 max-w-md shadow-2xs">
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

      {/* Active Tab Viewport */}
      {activeTab === 'compose' ? (
        <AlertComposer />
      ) : (
        <AlertHistoryFeed onComposeClick={() => setActiveTab('compose')} />
      )}
    </PortalLayout>
  );
}
