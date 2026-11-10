'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  CloudRain,
  Droplets,
  Info,
  MapPin,
  Megaphone,
  Radio,
  RefreshCw,
  ScrollText,
  Search,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import AlertSectionBanner from './AlertSectionBanner';
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

function getSeverityBarClass(severity: string): string {
  switch (severity) {
    case 'Critical':
      return 'bg-[#DC2626]';
    case 'Warning':
      return 'bg-[#D97706]';
    case 'Watch':
      return 'bg-[#2563EB]';
    default:
      return 'bg-[#173D32]/40';
  }
}

interface AlertHistoryFeedProps {
  onComposeClick?: () => void;
}

export default function AlertHistoryFeed({ onComposeClick }: AlertHistoryFeedProps) {
  const { openAlertModal } = useApp();

  const [alerts, setAlerts] = useState<PublicAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [referenceNowMs, setReferenceNowMs] = useState(() => Date.now());

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
    setReferenceNowMs(Date.now());
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
      if (selectedDateRange === '24h' && referenceNowMs - alertTime > 24 * 60 * 60 * 1000) {
        return false;
      }
      if (selectedDateRange === '7d' && referenceNowMs - alertTime > 7 * 24 * 60 * 60 * 1000) {
        return false;
      }
      if (selectedDateRange === '30d' && referenceNowMs - alertTime > 30 * 24 * 60 * 60 * 1000) {
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
    <div className="space-y-5">
      {/* Banner Header with Subtle Mountain Silhouette */}
      <AlertSectionBanner
        icon={<ScrollText className="w-5 h-5" />}
        title="Disaster Alert History & Delivery Logs"
        subtitle="Audit previously published emergency bulletins, monitored highway corridors, and delivery telemetry."
        actions={
          <>
            <button
              type="button"
              onClick={handleRetry}
              className="px-3.5 py-2 rounded-full bg-white hover:bg-[#EAF0E6]/60 border border-[#173D32]/15 text-xs font-bold text-[#173D32] transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
              title="Refresh alerts feed from server"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            {onComposeClick && (
              <button
                type="button"
                onClick={onComposeClick}
                className="px-4 py-2 rounded-full bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Create Alert</span>
              </button>
            )}
          </>
        }
      />

      {/* Alert History Feed Container */}
      <div className="p-5 sm:p-6 bg-[#FAF8F2] rounded-2xl sm:rounded-3xl border border-[#173D32]/12 shadow-xs space-y-5">

        {/* Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-[0_2px_8px_-2px_rgba(23,61,50,0.04)] space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Severity Pill Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[10px] font-bold text-[#173D32]/55 uppercase tracking-[0.1em]">
                Severity
              </span>
              <div className="inline-flex items-center gap-1 bg-[#F2EFE6] border border-[#173D32]/12 p-1 rounded-full">
                {SEVERITIES.map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSelectedSeverity(sev)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      selectedSeverity === sev
                        ? 'bg-[#173D32] text-[#F6F4EC] shadow-2xs'
                        : 'text-[#173D32]/75 hover:text-[#173D32] hover:bg-white/60'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-[#173D32]/55 uppercase tracking-[0.1em]">
                Window
              </span>
              <div className="inline-flex flex-wrap items-center gap-0.5 rounded-2xl sm:rounded-full bg-[#F2EFE6] border border-[#173D32]/12 p-1 text-xs font-bold">
                {DATE_RANGES.map((range) => (
                  <button
                    key={range.value}
                    type="button"
                    onClick={() => setSelectedDateRange(range.value)}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                      selectedDateRange === range.value
                        ? 'bg-[#173D32] text-[#F6F4EC] shadow-2xs'
                        : 'text-[#173D32]/70 hover:text-[#173D32] hover:bg-white/60'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Secondary Filter Row: Status, State, and Search */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-[#173D32]/10">
            {/* Status Dropdown */}
            <div className="sm:col-span-4">
              <label className="text-[10px] font-bold uppercase text-[#173D32]/55 tracking-[0.1em] block mb-1">
                Delivery Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-9 px-3.5 rounded-full bg-[#FAF8F2] border border-[#173D32]/15 text-xs font-bold text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32] cursor-pointer"
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
              <label className="text-[10px] font-bold uppercase text-[#173D32]/55 tracking-[0.1em] block mb-1">
                Region
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full h-9 px-3.5 rounded-full bg-[#FAF8F2] border border-[#173D32]/15 text-xs font-bold text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32] cursor-pointer"
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
              <label className="text-[10px] font-bold uppercase text-[#173D32]/55 tracking-[0.1em] block mb-1">
                Search Bulletins
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#173D32]/45 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by corridor, title, landmark..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3.5 rounded-full bg-[#FAF8F2] border border-[#173D32]/15 text-xs text-[#173D32] placeholder:text-[#173D32]/45 focus:outline-none focus:ring-1 focus:ring-[#173D32]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Backend Telecom Status Notice (PRD Constraint §5) */}
        <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300/75 text-amber-950 flex items-start gap-2.5 text-xs">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold text-amber-900">Backend Delivery Infrastructure Note:</span>{' '}
            Current alerts are published official bulletins registered in the live database. Live telecom carrier delivery statuses (SMS delivery receipts, IVRS call logs) require backend Milestone M4 SMS/IVRS provider webhook adapters.
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </span>
            <button
              type="button"
              onClick={handleRetry}
              className="px-3.5 py-1.5 rounded-full bg-red-700 text-white font-bold cursor-pointer hover:bg-red-800 transition-colors"
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
                className="h-36 bg-white border border-[#173D32]/10 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredAlerts.length === 0 && (
          <div className="text-center py-14 bg-white border border-[#173D32]/10 rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(23,61,50,0.05)]">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF0E6] border border-[#173D32]/10 flex items-center justify-center text-[#173D32] mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-base font-extrabold text-[#173D32]">No Alert Records Found</h4>
            <p className="text-xs text-[#173D32]/65 mt-1.5 max-w-md mx-auto leading-relaxed">
              {selectedStatus !== 'All Statuses' && selectedStatus !== 'Published Bulletin'
                ? `No delivery receipts matching '${selectedStatus}' exist in the backend database. External carrier delivery logging is pending telecom provider setup.`
                : 'No published hazard alerts match your current filter criteria.'}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 px-4 py-2 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all cursor-pointer"
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
                  className="p-5 sm:p-6 rounded-2xl bg-white border border-[#173D32]/10 hover:border-[#173D32]/22 shadow-[0_2px_10px_-3px_rgba(23,61,50,0.05)] transition-all"
                >
                  <div className="flex items-stretch gap-3.5">
                    <div
                      className={`w-1 rounded-full shrink-0 ${getSeverityBarClass(alert.severity)}`}
                    />

                    <div className="flex-1 min-w-0 space-y-3.5">
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
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF8F2] border border-[#173D32]/10 text-[11px] text-[#173D32]/75 font-semibold">
                              <MapPin className="w-3 h-3 text-[#173D32]/55" />
                              <span>{alert.location}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#173D32]/65 font-medium shrink-0">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#173D32]/50" />
                            <span>
                              {formattedDate}, {formattedTime}
                            </span>
                          </span>
                          <span className="text-[#173D32]/35">·</span>
                          <span className="font-bold text-[#173D32]/85">
                            {formatRelativeTime(alert.publishedAt || alert.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-[#173D32] leading-snug">
                          {alert.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#173D32]/80 mt-1.5 leading-relaxed font-normal">
                          {alert.description}
                        </p>
                      </div>

                      {/* Advisory Box */}
                      <div className="p-3.5 rounded-xl bg-[#FAF8F2] border border-[#173D32]/10 text-xs">
                        <span className="font-extrabold text-[#173D32] inline-flex items-center gap-1.5 mb-1">
                          <Shield className="w-3.5 h-3.5 text-[#173D32]" />
                          <span>Official Advisory Directive</span>
                        </span>
                        <p className="text-[#173D32]/85 leading-relaxed">{alert.advisory}</p>
                      </div>

                      {/* Metadata Chips: Audience, Channel, Delivery Status */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                        {/* Audience Chip */}
                        <div className="px-2.5 py-1 rounded-full bg-[#FAF8F2] border border-[#173D32]/12 text-[#173D32] font-semibold inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#173D32]/65" />
                          <span className="text-[11px]">
                            Audience: <strong className="font-bold">Villagers, Drivers & Responders</strong>
                          </span>
                        </div>

                        {/* Delivery Channels Chip */}
                        <div className="px-2.5 py-1 rounded-full bg-[#FAF8F2] border border-[#173D32]/12 text-[#173D32] font-semibold inline-flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-[#173D32]/65" />
                          <span className="text-[11px]">
                            Channel: <strong className="font-bold">Public Portal Bulletin</strong>
                          </span>
                        </div>

                        {/* Delivery Status Badge */}
                        <div className="flex items-center gap-1.5 flex-wrap">
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
                        <div className="flex flex-wrap items-center gap-3 text-[#173D32]/75 font-semibold text-[11px]">
                          {alert.rainfall24h && (
                            <span className="inline-flex items-center gap-1">
                              <CloudRain className="w-3.5 h-3.5 text-[#1D4ED8]" />
                              <span>24h Rain: {alert.rainfall24h}</span>
                            </span>
                          )}
                          {alert.saturation && (
                            <span className="inline-flex items-center gap-1">
                              <Droplets className="w-3.5 h-3.5 text-[#0F766E]" />
                              <span>Saturation: {alert.saturation}</span>
                            </span>
                          )}
                          {alert.trafficStatus && (
                            <span className="inline-flex items-center gap-1 text-[#C52936] font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Traffic: {alert.trafficStatus}</span>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => openAlertModal(alertItemToAlertDetail(alert))}
                          className="px-4 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                        >
                          <span>Inspect Full Advisory</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
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
