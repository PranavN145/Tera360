"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { fieldOfficerApi } from "@/lib/api";
import type {
  FieldOfficerProfile,
  FieldOfficerTask,
  VillagerReportItem,
  RoadStatusSegment,
  SectorAlertItem,
  FieldOfficerMapData,
  RoadCondition,
} from "@/types/fieldOfficer";

type TabType = "tasks" | "map" | "reports" | "roads" | "alerts";

// Initial seed fallbacks for smooth client-side hydration before API responds
const DEFAULT_PROFILE: FieldOfficerProfile = {
  id: "OFF-2026-094",
  name: "Officer K. Patil",
  badgeNumber: "TR360-FO-2026-094",
  department: "Disaster & Landslide Rapid Response Unit",
  assignedArea: "Sector 4 - Hill Highway Corridors",
  phone: "+91 98765 43210",
  language: "EN",
  activeDutyStatus: true,
};

export default function FieldOfficerPortalPage() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [profileOpen, setProfileOpen] = useState(false);
  const [preferredLang, setPreferredLang] = useState("en");

  // Real-time API States
  const [profile, setProfile] = useState<FieldOfficerProfile>(() => {
    if (user && (user.role === "field_officer" || (user.role as string) === "field-officer")) {
      return {
        ...DEFAULT_PROFILE,
        id: user.id || user._id || DEFAULT_PROFILE.id,
        name: user.name || DEFAULT_PROFILE.name,
        phone: user.phone || DEFAULT_PROFILE.phone,
        department: (user as unknown as { department?: string }).department || DEFAULT_PROFILE.department,
        assignedArea: (user as unknown as { assignedArea?: string }).assignedArea || DEFAULT_PROFILE.assignedArea,
      };
    }
    return DEFAULT_PROFILE;
  });
  const [tasks, setTasks] = useState<FieldOfficerTask[]>([]);
  const [reports, setReports] = useState<VillagerReportItem[]>([]);
  const [roads, setRoads] = useState<RoadStatusSegment[]>([]);
  const [alerts, setAlerts] = useState<SectorAlertItem[]>([]);
  const [mapData, setMapData] = useState<FieldOfficerMapData | null>(null);

  // UI / Async States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>("Just now");

  // Filter States
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>("All");
  const [taskFilterRisk, setTaskFilterRisk] = useState<string>("All");
  const [reportFilterStatus, setReportFilterStatus] = useState<string>("All");

  // Modal States
  const [modalType, setModalType] = useState<
    "completeTask" | "escalateTask" | "rejectReport" | "escalateReport" | "updateRoad" | null
  >(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalInput, setModalInput] = useState("");
  const [modalInputSecondary, setModalInputSecondary] = useState("");
  const [roadCondition, setRoadCondition] = useState<RoadCondition>("Partially Blocked");
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);

  const showBanner = useCallback((msg: string) => {
    setNotificationBanner(msg);
    const timer = setTimeout(() => setNotificationBanner(null), 4500);
    return () => clearTimeout(timer);
  }, []);

  // ── Fetch All Live Data from Backend ──────────────────────────────────────
  const loadAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [profRes, tasksRes, reportsRes, roadsRes, alertsRes, mapRes] =
        await Promise.allSettled([
          fieldOfficerApi.getProfile(),
          fieldOfficerApi.getTasks(),
          fieldOfficerApi.getReports(),
          fieldOfficerApi.getCurrentRoadStatus(),
          fieldOfficerApi.getAlerts(),
          fieldOfficerApi.getMapData(),
        ]);

      if (profRes.status === "fulfilled" && profRes.value) {
        const pVal = profRes.value as FieldOfficerProfile & { activeDuty?: boolean };
        setProfile((prev) => ({
          ...prev,
          ...pVal,
          activeDutyStatus: pVal.activeDuty !== undefined ? pVal.activeDuty : (pVal.activeDutyStatus ?? true),
        }));
        if (pVal.language) {
          setPreferredLang(pVal.language.toLowerCase());
        }
      }

      if (tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value)) {
        setTasks(tasksRes.value);
      }

      if (reportsRes.status === "fulfilled" && Array.isArray(reportsRes.value)) {
        setReports(reportsRes.value);
      }

      if (roadsRes.status === "fulfilled" && Array.isArray(roadsRes.value)) {
        setRoads(roadsRes.value);
      }

      if (alertsRes.status === "fulfilled" && Array.isArray(alertsRes.value)) {
        setAlerts(alertsRes.value);
      }

      if (mapRes.status === "fulfilled" && mapRes.value) {
        setMapData(mapRes.value);
      }

      setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      console.warn("Field officer API sync error:", msg);
      showBanner("Running in cached local mode. Backend will re-sync automatically.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showBanner]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ── Language Update ───────────────────────────────────────────────────────
  const handleLanguageChange = async (newLang: string) => {
    setPreferredLang(newLang);
    try {
      await fieldOfficerApi.updateLanguage(newLang);
      setProfile((prev) => ({ ...prev, language: newLang }));
      showBanner(`Language preference updated to ${newLang.toUpperCase()}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update language";
      showBanner(msg);
    }
  };

  // ── Task Actions ──────────────────────────────────────────────────────────
  const handleStartTask = async (id: string) => {
    try {
      setIsSubmitting(true);
      const updated = await fieldOfficerApi.startTask(id);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updated, status: "In_Progress", startedAt: updated.startedAt || new Date().toISOString() } : t))
      );
      showBanner(`Task ${id} started. Inspection timer is active.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to start task ${id}`;
      showBanner(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedId) return;
    try {
      setIsSubmitting(true);
      const notes = modalInput.trim() || "Inspection concluded successfully.";
      const updated = await fieldOfficerApi.completeTask(selectedId, notes);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedId
            ? {
                ...t,
                ...updated,
                status: "Completed",
                completedAt: updated.completedAt || new Date().toISOString(),
                completionNotes: notes,
              }
            : t
        )
      );
      setModalType(null);
      setModalInput("");
      showBanner(`Task ${selectedId} marked as Completed.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to complete task ${selectedId}`;
      showBanner(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalateTask = async () => {
    if (!selectedId || !modalInput.trim()) return;
    try {
      setIsSubmitting(true);
      const priority = modalInputSecondary || "Critical";
      const res = await fieldOfficerApi.escalateTask(selectedId, modalInput, priority);
      const updatedTask = (res && res.task) || res;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedId
            ? {
                ...t,
                ...updatedTask,
                status: "Escalated",
                escalationReason: modalInput,
                escalationPriority: priority,
              }
            : t
        )
      );
      setModalType(null);
      setModalInput("");
      setModalInputSecondary("");
      showBanner(`🚨 Task ${selectedId} escalated directly to Central Disaster Officer Dashboard!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to escalate task ${selectedId}`;
      showBanner(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Report Actions ────────────────────────────────────────────────────────
  const handleVerifyReport = async (id: string) => {
    try {
      setIsSubmitting(true);
      const notes = "Ground truth confirmed on site by Field Officer.";
      const updated = await fieldOfficerApi.verifyReport(id, notes);
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updated, status: "Verified", fieldNotes: notes } : r))
      );
      showBanner(`Report ${id} verified. Ground truth recorded.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to verify report ${id}`;
      showBanner(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectReport = async () => {
    if (!selectedId || !modalInput.trim()) return;
    try {
      setIsSubmitting(true);
      const updated = await fieldOfficerApi.rejectReport(selectedId, modalInput);
      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedId
            ? { ...r, ...updated, status: "Rejected", rejectionReason: modalInput }
            : r
        )
      );
      setModalType(null);
      setModalInput("");
      showBanner(`Report ${selectedId} marked as Rejected.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to reject report ${selectedId}`;
      showBanner(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalateReport = async () => {
    if (!selectedId || !modalInput.trim()) return;
    try {
      setIsSubmitting(true);
      const res = await fieldOfficerApi.escalateReport(selectedId, {
        escalationReason: modalInput,
        urgency: "Immediate",
        recommendedAction: modalInputSecondary || undefined,
      });
      const updatedRep = (res && res.report) || res;
      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedId ? { ...r, ...updatedRep, status: "Escalated" } : r
        )
      );
      setModalType(null);
      setModalInput("");
      setModalInputSecondary("");
      showBanner(`🚨 Villager Report ${selectedId} escalated straight to High Command!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to escalate report ${selectedId}`;
      showBanner(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Road Status Actions ───────────────────────────────────────────────────
  const handleRoadUpdate = async () => {
    if (!modalInput.trim() || !selectedId) return;
    try {
      setIsSubmitting(true);
      const existing = roads.find((r) => r.roadSegmentId === selectedId);
      const res = await fieldOfficerApi.updateRoadStatus({
        roadSegmentId: selectedId,
        stretchName: existing?.stretchName,
        condition: roadCondition,
        reason: modalInput,
      });
      const updatedSegment = (res && (res.roadStatus || res.data || res.payload)) || res;
      setRoads((prev) =>
        prev.map((r) =>
          r.roadSegmentId === selectedId
            ? {
                ...r,
                ...updatedSegment,
                condition: roadCondition,
                reason: modalInput,
                timestamp: new Date().toISOString(),
              }
            : r
        )
      );
      setModalType(null);
      setModalInput("");
      showBanner(`📡 Road condition updated to '${roadCondition}' & synchronized with Central Dashboard!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update road condition";
      showBanner(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Alert Actions ─────────────────────────────────────────────────────────
  const handleAcknowledgeAlert = async (id: string) => {
    try {
      setIsSubmitting(true);
      const updated = await fieldOfficerApi.acknowledgeAlert(id);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                ...updated,
                acknowledged: true,
                acknowledgedAt: updated.acknowledgedAt || new Date().toISOString(),
              }
            : a
        )
      );
      showBanner(`Alert ${id} acknowledged.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to acknowledge alert ${id}`;
      showBanner(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Helper Extractors for UI compatibility across schema versions ─────────
  const getTaskLocation = (task: FieldOfficerTask): string => {
    const loc = task.location as unknown as { chainageName?: string; name?: string } | undefined;
    if (loc?.chainageName) return loc.chainageName;
    if (loc?.name) return loc.name;
    if ((task as unknown as { chainageName?: string }).chainageName) {
      return (task as unknown as { chainageName: string }).chainageName;
    }
    return "Assigned Route Stretch";
  };

  const getTaskNotes = (task: FieldOfficerTask): string | null => {
    return task.completionNotes || (task as unknown as { notes?: string }).notes || null;
  };

  const getTaskEscalationReason = (task: FieldOfficerTask): string | null => {
    if (task.escalationReason) return task.escalationReason;
    const escObj = (task as unknown as { escalation?: { reason?: string } }).escalation;
    return escObj?.reason || null;
  };

  const getRoadUpdater = (road: RoadStatusSegment): string => {
    return road.updatedBy || (road as unknown as { lastUpdatedBy?: string }).lastUpdatedBy || "Field Officer";
  };

  // ── Filtered Lists ────────────────────────────────────────────────────────
  const filteredTasks = tasks.filter((t) => {
    const statusMatch = taskFilterStatus === "All" || t.status.toLowerCase() === taskFilterStatus.toLowerCase();
    const riskMatch = taskFilterRisk === "All" || t.riskLevel.toLowerCase() === taskFilterRisk.toLowerCase();
    return statusMatch && riskMatch;
  });

  const filteredReports = reports.filter((r) => {
    return reportFilterStatus === "All" || r.status.toLowerCase() === reportFilterStatus.toLowerCase();
  });

  const officerInitials = (profile.name || "FO")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8F4EC] text-[#173D32] flex flex-col font-sans">
      {/* ── TOP HEADER (Brand & Officer Profile) ────────────────── */}
      <header className="bg-[#173D32] text-[#F8F4EC] border-b border-[#DCE8D4]/20 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group" title="Return to Main Website Homepage">
              <span className="text-2xl font-black tracking-wider text-[#DCE8D4] group-hover:text-[#D6A65D] transition-colors">
                TERRA<span className="text-[#D6A65D]">360</span>
              </span>
              <span className="text-sm font-semibold text-[#DCE8D4]/60">/</span>
              <span className="bg-[#D6A65D]/20 text-[#D6A65D] border border-[#D6A65D]/30 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                Officer
              </span>
            </Link>
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCE8D4]/10 hover:bg-[#DCE8D4]/20 border border-[#DCE8D4]/20 text-[#DCE8D4] text-xs font-semibold transition-all cursor-pointer"
            >
              <span>←</span>
              <span>Main Website</span>
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live Sync Badge */}
            <div className="hidden lg:flex items-center gap-2 bg-[#122e26] border border-[#DCE8D4]/20 px-3 py-1.5 rounded-full text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-[#DCE8D4]">{profile.assignedArea}</span>
            </div>

            {/* Manual Sync Trigger */}
            <button
              type="button"
              onClick={() => loadAllData()}
              disabled={refreshing}
              title={`Last synced: ${lastSynced}. Click to re-sync.`}
              className="hidden sm:flex items-center gap-1.5 bg-[#122e26] hover:bg-[#1f4e40] border border-[#DCE8D4]/20 text-[#DCE8D4] px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className={refreshing ? "animate-spin inline-block" : ""}>🔄</span>
              <span className="hidden xl:inline">{refreshing ? "Syncing..." : lastSynced}</span>
            </button>

            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-[#122e26] border border-[#DCE8D4]/20 rounded-full px-2 py-1 text-xs">
              <span className="text-xs text-[#DCE8D4]/60">Lang:</span>
              <select
                aria-label="Language selector"
                value={preferredLang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-transparent text-[#DCE8D4] font-semibold text-xs outline-none cursor-pointer"
              >
                <option value="en" className="bg-[#173D32] text-[#F8F4EC]">EN</option>
                <option value="hi" className="bg-[#173D32] text-[#F8F4EC]">HI</option>
                <option value="mr" className="bg-[#173D32] text-[#F8F4EC]">MR</option>
                <option value="ao" className="bg-[#173D32] text-[#F8F4EC]">AO</option>
              </select>
            </div>

            {/* Alerts Notification Bell */}
            <button
              type="button"
              onClick={() => setActiveTab("alerts")}
              className="relative p-2 rounded-full bg-[#122e26] text-[#DCE8D4] hover:text-[#D6A65D] transition-colors cursor-pointer"
              title="Emergency Alerts"
            >
              🔔
              {alerts.some((a) => !a.acknowledged) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center animate-pulse">
                  {alerts.filter((a) => !a.acknowledged).length}
                </span>
              )}
            </button>

            {/* Profile Menu Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 bg-[#DCE8D4]/15 hover:bg-[#DCE8D4]/25 border border-[#DCE8D4]/30 px-3 py-1.5 rounded-full transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#D6A65D] text-[#173D32] font-black flex items-center justify-center text-xs shadow-xs">
                  {officerInitials}
                </div>
                <span className="font-semibold text-xs text-[#F8F4EC] hidden sm:inline">{profile.name}</span>
                <span className="text-xs opacity-60">▼</span>
              </button>

              {/* Profile Card Popover */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#FAF8F2] text-[#173D32] rounded-2xl shadow-2xl border border-[#173D32]/20 p-5 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3 pb-3 border-b border-[#173D32]/10 mb-3">
                    <div className="w-11 h-11 rounded-full bg-[#173D32] text-[#D6A65D] font-extrabold flex items-center justify-center text-sm">
                      {officerInitials}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#173D32]">{profile.name}</h4>
                      <p className="text-xs text-[#173D32]/70 font-mono">{profile.badgeNumber || profile.id}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[#173D32]/60 font-medium block">Department:</span>
                      <span className="font-semibold">{profile.department}</span>
                    </div>
                    <div>
                      <span className="text-[#173D32]/60 font-medium block">Assigned Sector:</span>
                      <span className="font-semibold text-[#173D32]">{profile.assignedArea}</span>
                    </div>
                    <div>
                      <span className="text-[#173D32]/60 font-medium block">Contact Phone:</span>
                      <span className="font-mono font-semibold">{profile.phone}</span>
                    </div>
                    <div>
                      <span className="text-[#173D32]/60 font-medium block">Active Duty Status:</span>
                      <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        {profile.activeDutyStatus ? "Online / Active" : "Standby"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className="w-full mt-4 py-1.5 rounded-xl bg-[#173D32] text-[#F8F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer"
                  >
                    Close Profile Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── TOAST NOTIFICATION BANNER ──────────────────────────── */}
      {notificationBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#D6A65D] text-[#173D32] px-6 py-2.5 rounded-full font-bold text-xs shadow-xl border border-[#173D32]/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <span>⚡</span>
          <span>{notificationBanner}</span>
        </div>
      )}

      {/* ── MAIN PORTAL LAYOUT (Sidebar Navbar + Content Canvas) ── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Left Side Navigation */}
        <nav className="w-full md:w-64 shrink-0 space-y-2" aria-label="Portal Navigation Tabs">
          <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-3xl p-3 shadow-xs space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "tasks"
                  ? "bg-[#173D32] text-[#F8F4EC] shadow-sm"
                  : "text-[#173D32] hover:bg-[#DCE8D4]/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">📋</span>
                <span>My Tasks</span>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === "tasks" ? "bg-[#D6A65D] text-[#173D32]" : "bg-[#173D32]/10"
                }`}
              >
                {tasks.filter((t) => t.status !== "Completed").length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("map")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "map"
                  ? "bg-[#173D32] text-[#F8F4EC] shadow-sm"
                  : "text-[#173D32] hover:bg-[#DCE8D4]/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🗺️</span>
                <span>Assigned Area Map</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                Live
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reports")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "reports"
                  ? "bg-[#173D32] text-[#F8F4EC] shadow-sm"
                  : "text-[#173D32] hover:bg-[#DCE8D4]/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">📢</span>
                <span>Villager Reports</span>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === "reports" ? "bg-[#D6A65D] text-[#173D32]" : "bg-[#173D32]/10"
                }`}
              >
                {reports.filter((r) => r.status === "Pending").length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("roads")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "roads"
                  ? "bg-[#173D32] text-[#F8F4EC] shadow-sm"
                  : "text-[#173D32] hover:bg-[#DCE8D4]/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🚧</span>
                <span>Road Status</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                {roads.length} Segments
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("alerts")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "alerts"
                  ? "bg-[#173D32] text-[#F8F4EC] shadow-sm"
                  : "text-[#173D32] hover:bg-[#DCE8D4]/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🚨</span>
                <span>Sector Alerts</span>
              </div>
              {alerts.some((a) => !a.acknowledged) && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-extrabold animate-pulse">
                  {alerts.filter((a) => !a.acknowledged).length} New
                </span>
              )}
            </button>
          </div>

          {/* Quick Context Card */}
          <div className="bg-[#DCE8D4]/40 border border-[#173D32]/15 rounded-3xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="font-black text-[#173D32] uppercase tracking-wider text-[11px]">Sector Operations</h5>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <p className="text-[#173D32]/80 leading-relaxed text-[11px]">
              Assigned corridor: <strong>{profile.assignedArea}</strong>. Telemetry and inspection actions are synchronized to the Central Disaster Desk.
            </p>
          </div>
        </nav>

        {/* Right Tab Content Canvas */}
        <main className="flex-1 space-y-6">
          {loading && (
            <div className="flex items-center justify-center p-12 text-[#173D32]/70 text-xs font-bold gap-2">
              <span className="animate-spin text-lg">⚙️</span>
              <span>Connecting to Terra360 Field Operations Desk...</span>
            </div>
          )}

          {/* ── REAL-TIME SECTOR OVERVIEW METRICS ────────────────── */}
          <section aria-label="Officer Real-time Overview" className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Tasks: Pending vs In Progress */}
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                activeTab === "tasks"
                  ? "bg-[#FAF8F2] border-[#173D32] shadow-sm ring-2 ring-[#173D32]/20"
                  : "bg-[#FAF8F2] border-[#173D32]/15 hover:border-[#173D32]/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/70">
                  Assigned Tasks
                </span>
                <span className="text-sm">📋</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#173D32]">
                  {tasks.filter((t) => t.status !== "Completed").length}
                </span>
                <span className="text-xs text-[#173D32]/70 font-semibold">Active in Sector</span>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#173D32]/10 text-[11px] font-bold">
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  {tasks.filter((t) => t.status === "Assigned").length} Pending
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
                  {tasks.filter((t) => t.status === "In_Progress").length} In Progress
                </span>
              </div>
            </button>

            {/* 2. Active Road Blockage Alerts in Designated Sector */}
            <button
              type="button"
              onClick={() => setActiveTab("roads")}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                activeTab === "roads"
                  ? "bg-[#FAF8F2] border-[#173D32] shadow-sm ring-2 ring-[#173D32]/20"
                  : "bg-[#FAF8F2] border-[#173D32]/15 hover:border-[#173D32]/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/70">
                  Road Blockages
                </span>
                <span className="text-sm">🚧</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-700">
                  {roads.filter((r) => r.condition !== "Open").length}
                </span>
                <span className="text-xs text-[#173D32]/70 font-semibold">Active Blockages</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#173D32]/10 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-bold">
                  {roads.filter((r) => r.condition === "Blocked" || r.condition === "Partially Blocked").length} Critical Hazards
                </span>
                <span className="font-mono text-[#173D32]/60 text-[10px]">
                  {roads.length} Monitored
                </span>
              </div>
            </button>

            {/* 3. Citizen Reports Awaiting Verification */}
            <button
              type="button"
              onClick={() => setActiveTab("reports")}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                activeTab === "reports"
                  ? "bg-[#FAF8F2] border-[#173D32] shadow-sm ring-2 ring-[#173D32]/20"
                  : "bg-[#FAF8F2] border-[#173D32]/15 hover:border-[#173D32]/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/70">
                  Citizen Reports
                </span>
                <span className="text-sm">📢</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-700">
                  {reports.filter((r) => r.status === "Pending").length}
                </span>
                <span className="text-xs text-[#173D32]/70 font-semibold">Awaiting Field Check</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#173D32]/10 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                  Action Required
                </span>
                <span className="font-mono text-[#173D32]/60 text-[10px]">
                  {reports.length} Total Reports
                </span>
              </div>
            </button>
          </section>

          {/* ── TAB 1: MY TASKS ─────────────────────────────────── */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-[#173D32]">Assigned Inspection Tasks</h2>
                  <p className="text-xs text-[#173D32]/70 mt-0.5">Dispatched by Central Disaster Officer for on-ground verification.</p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Filter tasks by status"
                    value={taskFilterStatus}
                    onChange={(e) => setTaskFilterStatus(e.target.value)}
                    className="bg-[#FAF8F2] border border-[#173D32]/20 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#173D32] outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In_Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Escalated">Escalated</option>
                  </select>

                  <select
                    aria-label="Filter tasks by risk"
                    value={taskFilterRisk}
                    onChange={(e) => setTaskFilterRisk(e.target.value)}
                    className="bg-[#FAF8F2] border border-[#173D32]/20 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#173D32] outline-none"
                  >
                    <option value="All">All Risks</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="bg-[#FAF8F2] border border-[#173D32]/10 rounded-3xl p-8 text-center text-xs text-[#173D32]/60">
                  No inspection tasks match your current filter.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-3xl p-5 shadow-xs hover:border-[#173D32]/30 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#173D32]/10 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-[#173D32] bg-[#DCE8D4] px-2.5 py-1 rounded-lg">
                            {task.id}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              task.riskLevel === "Critical"
                                ? "bg-rose-100 text-rose-800"
                                : task.riskLevel === "High"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {task.riskLevel} Risk
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full ${
                              task.status === "In_Progress"
                                ? "bg-sky-100 text-sky-800 animate-pulse"
                                : task.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : task.status === "Escalated"
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-200 text-slate-800"
                            }`}
                          >
                            ● {task.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[#173D32]/60 font-semibold">Location Chainage:</span>
                          <p className="font-bold text-sm text-[#173D32] mt-0.5">{getTaskLocation(task)}</p>
                        </div>
                        <div>
                          <span className="text-[#173D32]/60 font-semibold">Inspection Reason:</span>
                          <p className="text-[#173D32]/90 leading-relaxed mt-0.5">{task.reason}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#173D32]/70 pt-1">
                          <span>
                            Deadline: <strong>{new Date(task.deadline).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</strong>
                          </span>
                          {task.startedAt && (
                            <span>
                              Started: <strong>{new Date(task.startedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</strong>
                            </span>
                          )}
                          {task.completedAt && (
                            <span>
                              Completed: <strong>{new Date(task.completedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</strong>
                            </span>
                          )}
                        </div>

                        {getTaskNotes(task) && (
                          <div className="bg-[#DCE8D4]/40 p-2.5 rounded-xl border border-[#173D32]/10 mt-2">
                            <span className="font-bold text-[#173D32]">Officer Notes:</span> {getTaskNotes(task)}
                          </div>
                        )}

                        {getTaskEscalationReason(task) && (
                          <div className="bg-rose-50 text-rose-900 p-2.5 rounded-xl border border-rose-200 mt-2">
                            <span className="font-bold">🚨 Escalation Reason:</span> {getTaskEscalationReason(task)}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-4 mt-3 border-t border-[#173D32]/10">
                        {task.status === "Assigned" && (
                          <button
                            type="button"
                            onClick={() => handleStartTask(task.id)}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-xl bg-[#173D32] text-[#F8F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer disabled:opacity-50"
                          >
                            ▶ Start Inspection
                          </button>
                        )}
                        {task.status === "In_Progress" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(task.id);
                              setModalInput("");
                              setModalType("completeTask");
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
                          >
                            ✓ Mark Completed
                          </button>
                        )}
                        {task.status !== "Completed" && task.status !== "Escalated" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(task.id);
                              setModalInput("");
                              setModalInputSecondary("Critical");
                              setModalType("escalateTask");
                            }}
                            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
                          >
                            ⚠️ Escalate to Command
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: ASSIGNED AREA MAP ───────────────────────── */}
          {activeTab === "map" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#173D32]">Assigned Area Map & Danger Zones</h2>
                <p className="text-xs text-[#173D32]/70 mt-0.5">
                  Topography, spatial landslide risk corridors, and turn-by-turn routes in {profile.assignedArea}.
                </p>
              </div>

              {/* Map Canvas Card */}
              <div className="bg-[#173D32] text-[#F8F4EC] rounded-3xl p-6 border border-[#DCE8D4]/20 relative overflow-hidden shadow-lg min-h-[440px] flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DCE8D4]/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#DCE8D4]">
                      {mapData?.sector || profile.assignedArea} Satellite Topography
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#D6A65D]">
                    Center: [{mapData?.sectorCenter ? mapData.sectorCenter.join(", ") : "94.028° E, 25.675° N"}]
                  </span>
                </div>

                {/* Spatial Elements Overlay */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                  {mapData?.dangerZones && mapData.dangerZones.length > 0 ? (
                    mapData.dangerZones.map((zone) => (
                      <div
                        key={zone.zoneId}
                        className={`rounded-2xl p-4 space-y-2 border ${
                          zone.landslideSusceptibility === "Critical"
                            ? "bg-[#122e26]/80 border-rose-500/40"
                            : "bg-[#122e26]/80 border-amber-500/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-extrabold ${
                              zone.landslideSusceptibility === "Critical" ? "text-rose-300" : "text-amber-300"
                            }`}
                          >
                            🚨 {zone.name}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              zone.landslideSusceptibility === "Critical"
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            Weight: {zone.riskWeight} ({zone.landslideSusceptibility})
                          </span>
                        </div>
                        <p className="text-[11px] text-[#DCE8D4]/80">
                          Slope: {zone.slopeAngleDeg}° | Soil Saturation: {zone.soilMoisturePercent}% | 24h Rain: {zone.recentRainfall24hMm}mm
                        </p>
                        <div className="text-[11px] text-amber-200">
                          Status: {zone.status} | Radius: {zone.radiusMeters}m
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="bg-[#122e26]/80 border border-rose-500/40 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-rose-300">🚨 Dzüdza Active Slip Zone</span>
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold">Weight: 0.94 (Critical)</span>
                        </div>
                        <p className="text-[11px] text-[#DCE8D4]/80">Slope: 46° | Soil Moisture: 89% | 24h Rain: 118mm</p>
                        <div className="text-[11px] text-amber-200">
                          Action: Enforce single-lane regulated convoy, maintain 24/7 spotter at KM 42+300.
                        </div>
                      </div>

                      <div className="bg-[#122e26]/80 border border-amber-500/40 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-amber-300">⚠️ Phesama Upper Escarpment</span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">Weight: 0.78 (High)</span>
                        </div>
                        <p className="text-[11px] text-[#DCE8D4]/80">Slope: 38° | Soil Moisture: 76% | 24h Rain: 92mm</p>
                        <div className="text-[11px] text-amber-200">
                          Action: Pre-position JCB loader at KM 47 staging post; monitor weep holes.
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Navigation Route Display */}
                <div className="bg-[#122e26] border border-[#DCE8D4]/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#D6A65D] uppercase tracking-wider block">
                      Active Field Dispatch Navigation
                    </span>
                    <p className="font-semibold text-white">
                      {mapData?.navigationRoutes && mapData.navigationRoutes.length > 0
                        ? `${mapData.navigationRoutes[0].origin.name} ➔ ${mapData.navigationRoutes[0].destination.name}`
                        : "Kohima South Emergency Post ➔ KM 42+300 Dzüdza Bridge Approach"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-[#DCE8D4]/15 rounded-full font-mono text-[11px] text-[#DCE8D4]">
                      {mapData?.navigationRoutes && mapData.navigationRoutes.length > 0
                        ? `${mapData.navigationRoutes[0].distanceKm} KM (${mapData.navigationRoutes[0].estimatedTravelTimeMin} mins)`
                        : "6.8 KM (14 mins)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => showBanner("GPS Coordinates copied to field dispatch terminal.")}
                      className="px-3.5 py-1.5 rounded-xl bg-[#D6A65D] text-[#173D32] font-black hover:bg-[#e0b268] transition-colors cursor-pointer text-xs"
                    >
                      🧭 Open Turn-by-Turn GPS
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: VILLAGER REPORTS ────────────────────────── */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-[#173D32]">Citizen & Villager Hazard Reports</h2>
                  <p className="text-xs text-[#173D32]/70 mt-0.5">Crowdsourced reports within your sector. Verify on ground, reject, or escalate.</p>
                </div>

                {/* Status Filter */}
                <select
                  aria-label="Filter reports by status"
                  value={reportFilterStatus}
                  onChange={(e) => setReportFilterStatus(e.target.value)}
                  className="bg-[#FAF8F2] border border-[#173D32]/20 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#173D32] outline-none"
                >
                  <option value="All">All Reports</option>
                  <option value="Pending">Pending</option>
                  <option value="Verified">Verified</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Escalated">Escalated</option>
                </select>
              </div>

              {filteredReports.length === 0 ? (
                <div className="bg-[#FAF8F2] border border-[#173D32]/10 rounded-3xl p-8 text-center text-xs text-[#173D32]/60">
                  No villager reports match your current filter.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map((rep) => (
                    <div
                      key={rep.id}
                      className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-3xl p-5 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-[#173D32]/10 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#173D32] bg-[#DCE8D4] px-2 py-0.5 rounded">
                            {rep.id}
                          </span>
                          <span className="text-xs font-extrabold text-[#173D32]">{rep.hazardType}</span>
                        </div>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            rep.status === "Verified"
                              ? "bg-emerald-100 text-emerald-800"
                              : rep.status === "Rejected"
                              ? "bg-slate-200 text-slate-700"
                              : rep.status === "Escalated"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {rep.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div className="sm:col-span-2 space-y-1.5">
                          <p className="text-[#173D32] font-medium leading-relaxed">{rep.locationDescription}</p>
                          <div className="text-[11px] text-[#173D32]/70 flex flex-wrap items-center gap-3">
                            <span>
                              Reported by: <strong>{rep.villagerName}</strong> ({rep.contact})
                            </span>
                            <span>
                              Time:{" "}
                              {new Date(rep.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>

                          {rep.fieldNotes && (
                            <div className="bg-[#DCE8D4]/40 p-2 rounded-xl text-[11px] border border-[#173D32]/10">
                              <strong>Field Verification:</strong> {rep.fieldNotes}
                            </div>
                          )}

                          {rep.rejectionReason && (
                            <div className="bg-rose-50 text-rose-900 p-2 rounded-xl text-[11px] border border-rose-200">
                              <strong>Rejection Reason:</strong> {rep.rejectionReason}
                            </div>
                          )}
                        </div>

                        {/* Photo Thumbnail */}
                        {rep.photoUrl && (
                          <div className="sm:col-span-1">
                            <div className="h-24 w-full rounded-2xl overflow-hidden bg-slate-200 border border-[#173D32]/15 relative">
                              <img
                                src={rep.photoUrl}
                                alt="Hazard observation"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {rep.status === "Pending" && (
                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#173D32]/10">
                          <button
                            type="button"
                            onClick={() => handleVerifyReport(rep.id)}
                            disabled={isSubmitting}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            ✓ Verify Ground Truth
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(rep.id);
                              setModalInput("");
                              setModalType("rejectReport");
                            }}
                            className="px-3.5 py-1.5 rounded-xl border border-rose-400 text-rose-700 text-xs font-bold hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            ✕ Reject Report
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(rep.id);
                              setModalInput("");
                              setModalInputSecondary("");
                              setModalType("escalateReport");
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
                          >
                            ⚠️ Escalate to Command
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: ROAD STATUS ─────────────────────────────── */}
          {activeTab === "roads" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#173D32]">Real-Time Road Corridor Conditions</h2>
                <p className="text-xs text-[#173D32]/70 mt-0.5">
                  Update segment conditions (Open, Caution, Partially Blocked, Blocked) synced to Central Dashboard & Route Advisories.
                </p>
              </div>

              {roads.length === 0 ? (
                <div className="bg-[#FAF8F2] border border-[#173D32]/10 rounded-3xl p-8 text-center text-xs text-[#173D32]/60">
                  No monitored road stretches currently recorded in this sector.
                </div>
              ) : (
                <div className="space-y-4">
                  {roads.map((road) => (
                    <div
                      key={road.roadSegmentId}
                      className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-3xl p-5 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#173D32]/10 pb-3">
                        <div>
                          <h4 className="font-extrabold text-sm text-[#173D32]">{road.stretchName}</h4>
                          <span className="text-[11px] font-mono text-[#173D32]/70">{road.roadSegmentId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                              road.condition === "Blocked"
                                ? "bg-rose-600 text-white animate-pulse"
                                : road.condition === "Partially Blocked"
                                ? "bg-amber-500 text-white"
                                : road.condition === "Caution"
                                ? "bg-yellow-400 text-slate-900"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            {road.condition}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="text-[#173D32]/90 leading-relaxed">
                          <strong>Current Status Reason:</strong> {road.reason}
                        </p>
                        <p className="text-[11px] text-[#173D32]/60 pt-1">
                          Last Updated:{" "}
                          {new Date(road.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}{" "}
                          by {getRoadUpdater(road)}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#173D32]/10 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(road.roadSegmentId);
                            setRoadCondition(road.condition);
                            setModalInput(road.reason);
                            setModalType("updateRoad");
                          }}
                          className="px-4 py-2 rounded-xl bg-[#173D32] text-[#F8F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer"
                        >
                          ⚡ Update Condition & Sync
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 5: SECTOR ALERTS ───────────────────────────── */}
          {activeTab === "alerts" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#173D32]">Sector Emergency Alerts & Protocols</h2>
                <p className="text-xs text-[#173D32]/70 mt-0.5">
                  Disaster response protocols dispatched to {profile.assignedArea}. Review instructions and acknowledge receipt.
                </p>
              </div>

              {alerts.length === 0 ? (
                <div className="bg-[#FAF8F2] border border-[#173D32]/10 rounded-3xl p-8 text-center text-xs text-[#173D32]/60">
                  No active sector alerts.
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`rounded-3xl p-5 border shadow-xs space-y-3 ${
                        alert.severity === "Critical"
                          ? "bg-rose-50/80 border-rose-300"
                          : "bg-[#FAF8F2] border-[#173D32]/15"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#173D32]/10 pb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                              alert.severity === "Critical"
                                ? "bg-rose-600 text-white animate-pulse"
                                : "bg-amber-500 text-white"
                            }`}
                          >
                            {alert.severity}
                          </span>
                          <h4 className="font-extrabold text-sm text-[#173D32]">{alert.title}</h4>
                        </div>
                        <span className="text-[11px] text-[#173D32]/60 font-mono">
                          {new Date(alert.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>

                      <div className="text-xs space-y-2">
                        <span className="font-bold text-[#173D32] uppercase tracking-wider text-[11px] block">
                          Standard Action Protocol:
                        </span>
                        <pre className="font-sans whitespace-pre-wrap bg-white/70 p-3.5 rounded-2xl text-xs text-[#173D32] border border-[#173D32]/10 leading-relaxed">
                          {alert.instructions}
                        </pre>
                      </div>

                      <div className="pt-3 border-t border-[#173D32]/10 flex items-center justify-between">
                        {alert.acknowledged ? (
                          <span className="text-emerald-800 font-bold text-xs flex items-center gap-1.5">
                            ✓ Acknowledged by Officer{" "}
                            {alert.acknowledgedAt &&
                              `(${new Date(alert.acknowledgedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-xl bg-[#173D32] text-[#F8F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer disabled:opacity-50"
                          >
                            ✓ Acknowledge Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── MODALS (Complete, Escalate, Reject, Update Road) ────── */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#FAF8F2] border border-[#173D32]/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="font-extrabold text-lg text-[#173D32]">
              {modalType === "completeTask" && `Complete Inspection Task: ${selectedId}`}
              {modalType === "escalateTask" && `🚨 Escalate Task: ${selectedId} to Command`}
              {modalType === "rejectReport" && `Reject Citizen Report: ${selectedId}`}
              {modalType === "escalateReport" && `🚨 Escalate Citizen Report: ${selectedId}`}
              {modalType === "updateRoad" && `Update Real-Time Road Condition: ${selectedId}`}
            </h3>

            {modalType === "completeTask" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#173D32]">
                  Completion Notes / Ground Observations:
                </label>
                <textarea
                  rows={4}
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="Describe ground stability, mitigations conducted, culvert status..."
                  className="w-full bg-white border border-[#173D32]/20 rounded-2xl p-3 text-xs outline-none focus:border-[#173D32]"
                />
              </div>
            )}

            {modalType === "escalateTask" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#173D32] block mb-1">Escalation Priority:</label>
                  <select
                    value={modalInputSecondary || "Critical"}
                    onChange={(e) => setModalInputSecondary(e.target.value)}
                    className="w-full bg-white border border-[#173D32]/20 rounded-xl p-2.5 text-xs font-bold text-[#173D32] outline-none"
                  >
                    <option value="Critical">Critical Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Moderate">Moderate Priority</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-rose-800 block mb-1">
                    Mandatory Escalation Reason:
                  </label>
                  <textarea
                    rows={4}
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    placeholder="Explain why immediate senior disaster officer / excavator intervention is needed..."
                    className="w-full bg-white border border-rose-300 rounded-2xl p-3 text-xs outline-none focus:border-rose-600"
                  />
                </div>
              </div>
            )}

            {modalType === "rejectReport" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-rose-800">
                  Mandatory Rejection Justification:
                </label>
                <textarea
                  rows={3}
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="Explain why this observation is a false alarm or non-hazard..."
                  className="w-full bg-white border border-rose-300 rounded-2xl p-3 text-xs outline-none focus:border-rose-600"
                />
              </div>
            )}

            {modalType === "escalateReport" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#173D32] block mb-1">
                    Escalation Reason & Urgency:
                  </label>
                  <textarea
                    rows={3}
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    placeholder="Explain severity threatening human habitation or vital corridor..."
                    className="w-full bg-white border border-[#173D32]/20 rounded-2xl p-3 text-xs outline-none focus:border-[#173D32]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#173D32] block mb-1">
                    Recommended Action (Optional):
                  </label>
                  <input
                    type="text"
                    value={modalInputSecondary}
                    onChange={(e) => setModalInputSecondary(e.target.value)}
                    placeholder="E.g. Deploy SDRF rescue team, pre-position loaders..."
                    className="w-full bg-white border border-[#173D32]/20 rounded-xl p-2.5 text-xs outline-none focus:border-[#173D32]"
                  />
                </div>
              </div>
            )}

            {modalType === "updateRoad" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#173D32] block mb-1">Road Condition (Strict Enum):</label>
                  <select
                    value={roadCondition}
                    onChange={(e) => setRoadCondition(e.target.value as RoadCondition)}
                    className="w-full bg-white border border-[#173D32]/20 rounded-xl p-2.5 text-xs font-bold text-[#173D32] outline-none"
                  >
                    <option value="Open">Open</option>
                    <option value="Caution">Caution</option>
                    <option value="Partially Blocked">Partially Blocked</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#173D32] block mb-1">Obstruction Reason Description:</label>
                  <textarea
                    rows={3}
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    placeholder="E.g. Mudslide at KM 42, single-lane alternating convoy..."
                    className="w-full bg-white border border-[#173D32]/20 rounded-2xl p-3 text-xs outline-none focus:border-[#173D32]"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#173D32]/10">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl border border-[#173D32]/20 text-xs font-bold hover:bg-[#173D32]/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  if (modalType === "completeTask") handleCompleteTask();
                  if (modalType === "escalateTask") handleEscalateTask();
                  if (modalType === "rejectReport") handleRejectReport();
                  if (modalType === "escalateReport") handleEscalateReport();
                  if (modalType === "updateRoad") handleRoadUpdate();
                }}
                className="px-4 py-2 rounded-xl bg-[#173D32] text-[#F8F4EC] text-xs font-bold hover:bg-[#1f4e40] cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="bg-[#173D32] text-[#F8F4EC] border-t border-[#DCE8D4]/20 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#DCE8D4]/70">
          <div>
            <span className="font-extrabold text-[#DCE8D4]">TERRA360</span> &copy; 2026 Landslide Early Warning System. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/contact" className="hover:text-[#D6A65D] transition-colors">
              Contact Us & Support
            </Link>
            <Link href="/privacy" className="hover:text-[#D6A65D] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#D6A65D] transition-colors">
              Terms of Use
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
