'use client';

import React, { useState, useEffect } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { useApp } from '@/context/AppContext';
import { publicApi } from '@/lib/api';
import { PublicAlertItem, alertItemToAlertDetail, formatRelativeTime } from '@/types/public';

const SEVERITIES = ['All', 'Critical', 'Warning', 'Watch'];
const STATUS_OPTIONS = [
  'All Statuses',
  'Published Bulletin',
  'Sent',
  'Delivered',
  'Voice Call Completed',
  'Failed',
];
const DATE_RANGES = [
  { label: 'All Time', value: 'all' },
  { label: 'Past 24 Hours', value: '24h' },
  { label: 'Past 7 Days', value: '7d' },
  { label: 'Past 30 Days', value: '30d' },
];
const STATES = [
  'All States',
  'Nagaland',
  'Assam',
  'Sikkim',
  'Meghalaya',
  'Arunachal Pradesh',
  'Manipur',
  'Mizoram',
  'Tripura',
];

interface AlertHistoryFeedProps {
  onComposeClick?: () => void;
}

export default function AlertHistoryFeed({ onComposeClick }: AlertHistoryFeedProps) {
  const { openAlertModal } = useApp();

  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [selectedState, setSelectedState] = useState('All States');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadAlerts() {
      try {
        const res = await publicApi.getAlerts({
          state: selectedState === 'All States' ? undefined : selectedState,
          severity: selectedSeverity === 'All' ? undefined : selectedSeverity,
          limit: 50,
        });
        if (mounted) {
          setAlerts(res.alerts);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch alert history feed';
          setError(msg);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAlerts();
    return () => {
      mounted = false;
    };
  }, [selectedSeverity, selectedState, refreshTrigger]);

  const handleRetry = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Filter alerts by search, status, and date range
  const filteredAlerts = alerts.filter((item) => {
    // 1. Text Search
    const q = search.toLowerCase().trim();
    if (q) {
      const match =
        item.title.toLowerCase().includes(q) ||
        item.corridor.toLowerCase().includes(q) ||
        item.state.toLowerCase().includes(q) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        item.description.toLowerCase().includes(q);
      if (!match) return false;
    }

    // 2. Status Filter
    if (selectedStatus !== 'All Statuses') {
      if (selectedStatus === 'Published Bulletin') {
        if (item.status !== 'published') return false;
      } else {
        // Backend currently only stores status: 'published' in MongoDB.
        // It has no delivery receipts table for 'Sent', 'Delivered', 'Voice Call Completed', or 'Failed'.
        return false;
      }
    }

    // 3. Date Range Filter
    if (selectedDateRange !== 'all') {
      const alertTime = new Date(item.publishedAt || item.createdAt).getTime();
      const now = Date.now();
      if (selectedDateRange === '24h' && now - alertTime > 24 * 60 * 60 * 1000) {
        return false;
      }
      if (selectedDateRange === '7d' && now - alertTime > 7 * 24 * 60 * 60 * 1000) {
        return false;
      }
      if (selectedDateRange === '30d' && now - alertTime > 30 * 24 * 60 * 60 * 1000) {
        return false;
      }
    }

    return true;
  });

  const resetFilters = () => {
    setSelectedSeverity('All');
    setSelectedStatus('All Statuses');
    setSelectedDateRange('all');
    setSelectedState('All States');
    setSearch('');
  };

  return (
    <div className="space-y-6">
      {/* Alert History Section Card */}
      <div className="p-5 sm:p-7 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-xs">
        <SectionHeader
          title="Disaster Alert History & Operational Delivery Logs"
          subtitle="Audit previously published emergency bulletins, monitored highway corridors, and multi-channel delivery telemetry."
          icon="📜"
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="px-3 py-1.5 rounded-xl bg-[#F6F4EC] hover:bg-[#173D32]/10 border border-[#173D32]/15 text-xs font-bold text-[#173D32] transition-colors cursor-pointer flex items-center gap-1.5"
                title="Refresh alerts feed from server"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>
              {onComposeClick && (
                <button
                  type="button"
                  onClick={onComposeClick}
                  className="px-3.5 py-1.5 rounded-xl bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>➕</span>
                  <span>Create Alert</span>
                </button>
              )}
            </div>
          }
        />

        {/* Filter Toolbar */}
        <div className="mb-6 p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Severity Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-[#173D32]/60 uppercase tracking-wider mr-1">
                Severity:
              </span>
              {SEVERITIES.map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    selectedSeverity === sev
                      ? 'bg-[#173D32] text-[#F6F4EC] shadow-2xs'
                      : 'bg-white text-[#173D32]/75 hover:bg-[#173D32]/10 border border-[#173D32]/10'
                  }`}
                >
                  {sev === 'All' ? 'All' : sev}
                </button>
              ))}
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#173D32]/60 uppercase tracking-wider mr-1">
                Date:
              </span>
              <div className="flex rounded-xl bg-white border border-[#173D32]/15 p-0.5 text-xs font-bold">
                {DATE_RANGES.map((range) => (
                  <button
                    key={range.value}
                    type="button"
                    onClick={() => setSelectedDateRange(range.value)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedDateRange === range.value
                        ? 'bg-[#173D32] text-white'
                        : 'text-[#173D32]/70 hover:text-[#173D32]'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Secondary Filter Row: Status, State, and Search */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-[#173D32]/10">
            {/* Status Dropdown */}
            <div className="sm:col-span-4">
              <label className="text-[10px] font-bold uppercase text-[#173D32]/60 tracking-wider block mb-1">
                Delivery Status:
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-white border border-[#173D32]/20 text-xs font-bold text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32] cursor-pointer"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* State Dropdown */}
            <div className="sm:col-span-3">
              <label className="text-[10px] font-bold uppercase text-[#173D32]/60 tracking-wider block mb-1">
                Region:
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-white border border-[#173D32]/20 text-xs font-bold text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32] cursor-pointer"
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Keyword Search */}
            <div className="sm:col-span-5">
              <label className="text-[10px] font-bold uppercase text-[#173D32]/60 tracking-wider block mb-1">
                Search Bulletins:
              </label>
              <input
                type="text"
                placeholder="Search by corridor, title, landmark..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 px-3.5 rounded-xl bg-white border border-[#173D32]/20 text-xs text-[#173D32] placeholder:text-[#173D32]/50 focus:outline-none focus:ring-1 focus:ring-[#173D32]"
              />
            </div>
          </div>
        </div>

        {/* Backend Telecom Status Notice (PRD Constraint §5) */}
        <div className="mb-6 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300/80 text-amber-950 flex items-start gap-2.5 text-xs">
          <span className="text-base shrink-0">ℹ️</span>
          <div className="flex-1 leading-relaxed">
            <span className="font-bold text-amber-900">Backend Delivery Infrastructure Note:</span> Current alerts are published official bulletins registered in the live database. Live telecom carrier delivery statuses (SMS delivery receipts, IVRS call logs) require backend Milestone M4 SMS/IVRS provider webhook adapters.
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-center justify-between text-xs font-semibold">
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="px-3 py-1 rounded-full bg-red-700 text-white font-bold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-36 bg-[#F6F4EC] border border-[#173D32]/10 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredAlerts.length === 0 && (
          <div className="text-center py-16 bg-[#F6F4EC] border border-[#173D32]/10 rounded-3xl p-6">
            <span className="text-4xl block mb-2">🌿</span>
            <h4 className="text-base font-extrabold text-[#173D32]">No Alert Records Found</h4>
            <p className="text-xs text-[#173D32]/70 mt-1 max-w-md mx-auto leading-relaxed">
              {selectedStatus !== 'All Statuses' && selectedStatus !== 'Published Bulletin'
                ? `No delivery receipts matching '${selectedStatus}' exist in the backend database. External carrier delivery logging is pending telecom provider setup.`
                : 'No published hazard alerts match your current filter criteria.'}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 px-4 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Alert Cards Feed */}
        {!isLoading && !error && filteredAlerts.length > 0 && (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => {
              const publishedDate = new Date(alert.publishedAt || alert.createdAt);
              const formattedDate = publishedDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              const formattedTime = publishedDate.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={alert.id}
                  className="p-5 sm:p-6 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/12 hover:border-[#173D32]/25 shadow-2xs transition-all space-y-3"
                >
                  {/* Card Header Strip */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#173D32]/10">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge
                        status={alert.severity}
                        size="sm"
                        pulse={alert.severity === 'Critical'}
                      />
                      <span className="font-extrabold text-sm text-[#173D32]">
                        {alert.corridor} · {alert.state}
                      </span>
                      {alert.location && (
                        <span className="text-xs text-[#173D32]/70 font-medium">
                          ({alert.location})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#173D32]/65 font-medium shrink-0">
                      <span>🕒 {formattedDate}, {formattedTime}</span>
                      <span className="text-[#173D32]/40">·</span>
                      <span className="font-bold text-[#173D32]/80">
                        {formatRelativeTime(alert.publishedAt || alert.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-[#173D32] leading-snug">
                      {alert.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#173D32]/85 mt-1.5 leading-relaxed font-normal">
                      {alert.description}
                    </p>
                  </div>

                  {/* Advisory Box */}
                  <div className="p-3 rounded-xl bg-white border border-[#173D32]/10 text-xs">
                    <span className="font-extrabold text-[#173D32] block mb-0.5">
                      🛡️ Official Advisory Directive:
                    </span>
                    <p className="text-[#173D32]/85 leading-relaxed">{alert.advisory}</p>
                  </div>

                  {/* Metadata Chips: Audience, Channel, Delivery Status */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                    {/* Audience Chip */}
                    <div className="px-2.5 py-1 rounded-lg bg-white border border-[#173D32]/15 text-[#173D32] font-semibold flex items-center gap-1.5">
                      <span className="text-xs">👥</span>
                      <span className="text-[11px]">
                        Audience: <strong className="font-bold">Villagers, Drivers & Responders</strong>
                      </span>
                    </div>

                    {/* Delivery Channels Chip */}
                    <div className="px-2.5 py-1 rounded-lg bg-white border border-[#173D32]/15 text-[#173D32] font-semibold flex items-center gap-1.5">
                      <span className="text-xs">📡</span>
                      <span className="text-[11px]">
                        Channel: <strong className="font-bold">Public Portal Bulletin</strong>
                      </span>
                    </div>

                    {/* Delivery Status Badge */}
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status="published" size="sm" label="Published Bulletin" />
                      <StatusBadge
                        status="unavailable"
                        size="sm"
                        showDot={false}
                        label="SMS/IVRS Carrier Logs: Offline"
                      />
                    </div>
                  </div>

                  {/* Telemetry Footer & Action */}
                  <div className="pt-3 border-t border-[#173D32]/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3 text-[#173D32]/70 font-semibold text-[11px]">
                      {alert.rainfall24h && <span>🌧️ 24h Rain: {alert.rainfall24h}</span>}
                      {alert.saturation && <span>💧 Saturation: {alert.saturation}</span>}
                      {alert.trafficStatus && (
                        <span className="text-red-700 font-bold">
                          ⚠️ Traffic: {alert.trafficStatus}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openAlertModal(alertItemToAlertDetail(alert))}
                      className="px-4 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all cursor-pointer shadow-2xs"
                    >
                      Inspect Full Advisory →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
