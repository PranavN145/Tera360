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

interface RoadUpdateHistoryItem {
  id: string;
  roadSegmentId: string;
  stretchName: string;
  condition: RoadCondition;
  reason: string;
  photoUrl?: string | null;
  timestamp: string;
  updatedBy: string;
}

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
  const [roadHistory, setRoadHistory] = useState<RoadUpdateHistoryItem[]>([]);
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

  // Map Interactive States
  const [mapLayer, setMapLayer] = useState<"topo" | "hazard" | "rainfall">("topo");
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    coordinates: [number, number];
    type: "village" | "hazard" | "road";
    detail?: string;
  }>({
    name: "KM 42+200 Upper Ridge Cutting",
    coordinates: [30.1425, 78.3182],
    type: "hazard",
    detail: "Active tension crack zone along NH-58 retaining structure",
  });

  // Modal States
  const [modalType, setModalType] = useState<
    | "completeTask"
    | "escalateTask"
    | "verifyReport"
    | "rejectReport"
    | "escalateReport"
    | "updateRoad"
    | "viewTask"
    | "viewReport"
    | "viewAlert"
    | null
  >(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalInput, setModalInput] = useState("");
  const [modalInputSecondary, setModalInputSecondary] = useState("");
  const [photoAttachment, setPhotoAttachment] = useState<string | null>(null);
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
        // Initialize road update history if not populated
        setRoadHistory((prev) => {
          if (prev.length === 0) {
            return roadsRes.value.map((r, idx) => ({
              id: `HIST-${idx + 1}`,
              roadSegmentId: r.roadSegmentId,
              stretchName: r.stretchName,
              condition: r.condition,
              reason: r.reason,
              photoUrl: r.photoUrl,
              timestamp: r.timestamp || new Date().toISOString(),
              updatedBy: r.updatedBy || "Officer K. Patil",
            }));
          }
          return prev;
        });
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
      showBanner("Running in local session mode. Telemetry will re-sync automatically.");
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

  // ── File Photo Attachment Helper ──────────────────────────────────────────
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoAttachment(reader.result as string);
        showBanner("Inspection photo attached successfully.");
      };
      reader.readAsDataURL(file);
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
      const notes = modalInput.trim() || "Inspection concluded successfully. Slope integrity verified.";
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
                notes: notes,
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
      showBanner(`🚨 Task ${selectedId} escalated directly to Central Disaster Desk!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to escalate task ${selectedId}`;
      showBanner(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Report Actions ────────────────────────────────────────────────────────
  const handleVerifyReport = async () => {
    if (!selectedId) return;
    try {
      setIsSubmitting(true);
      const notes = modalInput.trim() || "Ground truth confirmed on site by Field Officer.";
      const photo = photoAttachment || undefined;
      const updated = await fieldOfficerApi.verifyReport(selectedId, notes, photo);
      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedId
            ? {
                ...r,
                ...updated,
                status: "Verified",
                fieldNotes: notes,
                inspectorPhotoUrl: photo || r.inspectorPhotoUrl,
              }
            : r
        )
      );
      setModalType(null);
      setModalInput("");
      setPhotoAttachment(null);
      showBanner(`Report ${selectedId} verified. Ground truth and field notes recorded.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to verify report ${selectedId}`;
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
        photoUrl: photoAttachment || existing?.photoUrl,
      });
      const updatedSegment = (res && (res.roadStatus || res.data || res.payload)) || res;
      const updatedTime = new Date().toISOString();

      setRoads((prev) =>
        prev.map((r) =>
          r.roadSegmentId === selectedId
            ? {
                ...r,
                ...updatedSegment,
                condition: roadCondition,
                reason: modalInput,
                photoUrl: photoAttachment || r.photoUrl,
                timestamp: updatedTime,
              }
            : r
        )
      );

      // Add to previously submitted updates audit log
      setRoadHistory((prev) => [
        {
          id: `HIST-${Date.now()}`,
          roadSegmentId: selectedId,
          stretchName: existing?.stretchName || selectedId,
          condition: roadCondition,
          reason: modalInput,
          photoUrl: photoAttachment || existing?.photoUrl,
          timestamp: updatedTime,
          updatedBy: profile.name,
        },
        ...prev,
      ]);

      setModalType(null);
      setModalInput("");
      setPhotoAttachment(null);
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
                acknowledgedBy: profile.id,
              }
            : a
        )
      );
      showBanner(`Emergency Alert ${id} acknowledged.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to acknowledge alert ${id}`;
      showBanner(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Safe Helpers ──────────────────────────────────────────────────────────
  const getTaskLocation = (task: FieldOfficerTask): string => {
    if (typeof task.location === "string") return task.location;
    return task.location?.chainageName || task.location?.name || "Assigned Sector Chainage";
  };

  const getTaskCoordinates = (task: FieldOfficerTask): string => {
    if (task.location?.coordinates && Array.isArray(task.location.coordinates)) {
      return `${task.location.coordinates[0].toFixed(4)}° N, ${task.location.coordinates[1].toFixed(4)}° E`;
    }
    return "30.1425° N, 78.3182° E";
  };

  const getTaskNotes = (task: FieldOfficerTask): string | null => {
    return task.completionNotes || task.notes || null;
  };

  const getTaskEscalationReason = (task: FieldOfficerTask): string | null => {
    return task.escalationReason || task.escalation?.reason || null;
  };

  const getRoadUpdater = (road: RoadStatusSegment): string => {
    return road.updatedBy || (road as unknown as { lastUpdatedBy?: string }).lastUpdatedBy || "Field Officer";
  };

  // ── Filtered Lists ────────────────────────────────────────────────────────
  const filteredTasks = tasks.filter((t) => {
    const statusMatch =
      taskFilterStatus === "All" ||
      t.status.toLowerCase() === taskFilterStatus.toLowerCase() ||
      (taskFilterStatus === "Assigned" && (t.status === "Assigned" || (t.status as string) === "Pending"));
    const riskMatch = taskFilterRisk === "All" || t.riskLevel.toLowerCase() === taskFilterRisk.toLowerCase();
    return statusMatch && riskMatch;
  });

  const filteredReports = reports.filter((r) => {
    return reportFilterStatus === "All" || r.status.toLowerCase() === reportFilterStatus.toLowerCase();
  });

  const selectedTaskObj = tasks.find((t) => t.id === selectedId);
  const selectedReportObj = reports.find((r) => r.id === selectedId);
  const selectedAlertObj = alerts.find((a) => a.id === selectedId);

  const officerInitials = (profile.name || "KP")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F6F4EC] text-[#173D32] flex flex-col font-sans">
      {/* ── 1. PORTAL HEADER (Shared Brand & Officer Profile) ───── */}
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
              <span className="text-xs text-[#DCE8D4]/60">🌐</span>
              <select
                aria-label="Language selector"
                value={preferredLang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-transparent text-[#DCE8D4] font-semibold text-xs outline-none cursor-pointer"
              >
                <option value="en" className="bg-[#173D32] text-[#F8F4EC]">EN (English)</option>
                <option value="hi" className="bg-[#173D32] text-[#F8F4EC]">HI (हिंदी)</option>
                <option value="mr" className="bg-[#173D32] text-[#F8F4EC]">MR (मराठी)</option>
                <option value="ao" className="bg-[#173D32] text-[#F8F4EC]">AO (Ao Naga)</option>
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

            {/* Profile Dropdown Toggle */}
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

              {/* Profile Dropdown Card */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#FAF8F2] text-[#173D32] rounded-2xl shadow-2xl border border-[#173D32]/20 p-5 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3 pb-3 border-b border-[#173D32]/10 mb-3">
                    <div className="w-11 h-11 rounded-full bg-[#173D32] text-[#D6A65D] font-extrabold flex items-center justify-center text-sm shadow-xs">
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
                      <span className="text-[#173D32]/60 font-medium block">Assigned Area:</span>
                      <span className="font-semibold text-[#173D32]">{profile.assignedArea}</span>
                    </div>
                    <div>
                      <span className="text-[#173D32]/60 font-medium block">Phone Number:</span>
                      <span className="font-mono font-semibold">{profile.phone}</span>
                    </div>
                    <div>
                      <span className="text-[#173D32]/60 font-medium block">Preferred Language:</span>
                      <span className="font-semibold uppercase">{profile.language}</span>
                    </div>
                    <div>
                      <span className="text-[#173D32]/60 font-medium block">Active Duty Status:</span>
                      <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        {profile.activeDutyStatus ? "Online / Active" : "Standby"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#173D32]/10 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setProfileOpen(false)}
                      className="w-full py-1.5 rounded-xl bg-[#173D32] text-[#F8F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer"
                    >
                      Close Profile
                    </button>
                    <Link
                      href="/"
                      className="w-full py-1.5 rounded-xl border border-[#173D32]/20 text-[#173D32] text-xs font-semibold text-center hover:bg-black/5 transition-colors"
                    >
                      Return to Homepage
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── 2. LIVE ACTION TOAST NOTIFICATION ──────────────────── */}
      {notificationBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#D6A65D] text-[#173D32] px-6 py-2.5 rounded-full font-bold text-xs shadow-xl border border-[#173D32]/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <span>⚡</span>
          <span>{notificationBanner}</span>
        </div>
      )}

      {/* ── 3. MAIN PORTAL BODY (Sidebar + Tab Content Canvas) ──── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Left Side Navigation Tabs */}
        <nav className="w-full md:w-64 shrink-0 space-y-3" aria-label="Portal Navigation Tabs">
          <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-3xl p-3 shadow-xs space-y-1">
            {/* 1. My Tasks */}
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

            {/* 2. Assigned Area Map */}
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

            {/* 3. Reports */}
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
                <span>Reports</span>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === "reports" ? "bg-[#D6A65D] text-[#173D32]" : "bg-[#173D32]/10"
                }`}
              >
                {reports.filter((r) => r.status === "Pending").length}
              </span>
            </button>

            {/* 4. Road Status */}
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
                {roads.length} Roads
              </span>
            </button>

            {/* 5. Alerts */}
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
                <span>Alerts</span>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                  alerts.some((a) => !a.acknowledged)
                    ? "bg-rose-500 text-white animate-pulse"
                    : "bg-[#173D32]/10 text-[#173D32]"
                }`}
              >
                {alerts.filter((a) => !a.acknowledged).length} New
              </span>
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
                  {tasks.filter((t) => t.status === "Assigned" || (t.status as string) === "Pending").length} Pending
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
                  Road Conditions
                </span>
                <span className="text-sm">🚧</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-700">
                  {roads.filter((r) => r.condition !== "Open").length}
                </span>
                <span className="text-xs text-[#173D32]/70 font-semibold">Active Hazards</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#173D32]/10 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-bold">
                  {roads.filter((r) => r.condition === "Blocked" || r.condition === "Partially Blocked").length} Blocked/Partial
                </span>
                <span className="font-mono text-[#173D32]/60 text-[10px]">
                  {roads.length} Segments
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
                <span className="text-xs text-[#173D32]/70 font-semibold">Awaiting Verification</span>
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

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ── TAB 1: MY TASKS ─────────────────────────────────── */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-[#173D32]">Assigned Inspection Tasks</h2>
                  <p className="text-xs text-[#173D32]/70 mt-0.5">
                    Tasks assigned to {profile.name} ({profile.id}) across {profile.assignedArea}.
                  </p>
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
                    <option value="Assigned">Pending / Assigned</option>
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
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#173D32]/10 text-[#173D32]">
                            Priority: {task.priority || task.riskLevel}
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
                          <span className="text-[#173D32]/60 font-semibold">Location / Chainage:</span>
                          <p className="font-bold text-sm text-[#173D32] mt-0.5 flex items-center gap-1.5">
                            <span>📍</span> {getTaskLocation(task)}
                          </p>
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
                            <span className="font-bold text-[#173D32]">Officer Completion Notes:</span> {getTaskNotes(task)}
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

                        {/* Detailed View Modal Trigger */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(task.id);
                            setModalType("viewTask");
                          }}
                          className="px-3.5 py-2 rounded-xl border border-[#173D32]/25 text-[#173D32] text-xs font-bold hover:bg-[#173D32]/10 transition-colors cursor-pointer ml-auto"
                        >
                          🔍 View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ── TAB 2: ASSIGNED AREA MAP ───────────────────────── */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === "map" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-extrabold text-[#173D32]">Assigned Area Map & Danger Zones</h2>
                  <p className="text-xs text-[#173D32]/70 mt-0.5">
                    Spatial corridors, village jurisdictions, and active navigation routes for {profile.assignedArea}.
                  </p>
                </div>

                {/* Layer Toggle */}
                <div className="flex items-center gap-1 bg-[#FAF8F2] border border-[#173D32]/20 p-1 rounded-2xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setMapLayer("topo")}
                    className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                      mapLayer === "topo" ? "bg-[#173D32] text-[#F8F4EC]" : "text-[#173D32]/70 hover:text-[#173D32]"
                    }`}
                  >
                    Topography
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapLayer("hazard")}
                    className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                      mapLayer === "hazard" ? "bg-[#173D32] text-[#F8F4EC]" : "text-[#173D32]/70 hover:text-[#173D32]"
                    }`}
                  >
                    Susceptibility
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapLayer("rainfall")}
                    className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                      mapLayer === "rainfall" ? "bg-[#173D32] text-[#F8F4EC]" : "text-[#173D32]/70 hover:text-[#173D32]"
                    }`}
                  >
                    24h Rainfall
                  </button>
                </div>
              </div>

              {/* Interactive Sector Canvas Card */}
              <div className="bg-[#173D32] text-[#F8F4EC] rounded-3xl p-6 border border-[#DCE8D4]/20 relative overflow-hidden shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DCE8D4]/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#DCE8D4]">
                      {mapData?.sector || profile.assignedArea} Spatial Grid
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#D6A65D]">
                    Center: [{mapData?.sectorCenter ? mapData.sectorCenter.join(", ") : "30.1550° N, 78.3220° E"}]
                  </span>
                </div>

                {/* Assigned Villages & Monitored Road Stretches */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-[#122e26] border border-[#DCE8D4]/20 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#D6A65D] block">
                      Assigned Villages
                    </span>
                    <div className="space-y-1 text-xs text-[#DCE8D4]">
                      <div
                        onClick={() =>
                          setSelectedLocation({
                            name: "Rampur Upper",
                            coordinates: [30.160, 78.315],
                            type: "village",
                            detail: "Population 2,400 • Primary Evacuation Zone: School Grounds",
                          })
                        }
                        className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-bold">🏡 Rampur Upper</span>
                        <span className="text-[10px] opacity-70">Evac: School Grounds</span>
                      </div>
                      <div
                        onClick={() =>
                          setSelectedLocation({
                            name: "Devipura",
                            coordinates: [30.153, 78.332],
                            type: "village",
                            detail: "Population 1,800 • Primary Evacuation Zone: Community Hall",
                          })
                        }
                        className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-bold">🏡 Devipura</span>
                        <span className="text-[10px] opacity-70">Evac: Community Hall</span>
                      </div>
                      <div
                        onClick={() =>
                          setSelectedLocation({
                            name: "Shivalik Ridge Hamlet",
                            coordinates: [30.142, 78.322],
                            type: "village",
                            detail: "Population 950 • High downslope exposure to debris flow",
                          })
                        }
                        className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-bold">🏡 Shivalik Ridge</span>
                        <span className="text-[10px] opacity-70">Evac: South Ground</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#122e26] border border-[#DCE8D4]/20 rounded-2xl p-3.5 space-y-1 md:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#D6A65D] block">
                      Monitored Highway Corridors
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {roads.map((r) => (
                        <div
                          key={r.roadSegmentId}
                          onClick={() =>
                            setSelectedLocation({
                              name: r.stretchName,
                              coordinates: [30.145, 78.32],
                              type: "road",
                              detail: `Condition: ${r.condition} — ${r.reason}`,
                            })
                          }
                          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#D6A65D] cursor-pointer space-y-1 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] text-white truncate">{r.stretchName}</span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                r.condition === "Blocked"
                                  ? "bg-rose-500 text-white"
                                  : r.condition === "Partially Blocked"
                                  ? "bg-amber-500 text-white"
                                  : r.condition === "Caution"
                                  ? "bg-yellow-400 text-black"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              {r.condition}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#DCE8D4]/70 truncate">{r.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Highlighted High-Risk Hazard Zones */}
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#D6A65D] block">
                    High-Risk Landslide Hazard Zones
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div
                      onClick={() =>
                        setSelectedLocation({
                          name: "KM 42+200 Upper Ridge Cutting (Zone HZ-01)",
                          coordinates: [30.1425, 78.3182],
                          type: "hazard",
                          detail: "Slope 48° • Soil Saturation 89% • 24h Rain 118mm. Urgent retaining inspection.",
                        })
                      }
                      className="bg-[#122e26] border border-rose-500/50 rounded-2xl p-4 space-y-2 hover:border-rose-400 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-rose-300">🚨 KM 42+200 Upper Ridge Cutting</span>
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold">
                          Weight: 0.94 (Critical)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#DCE8D4]/80">
                        Slope: 48° | Soil Saturation: 89% | 24h Rain: 118mm
                      </p>
                      <div className="text-[11px] text-amber-200">
                        Protocol: Enforce single-lane regulated convoy, maintain spotter at KM 42+300.
                      </div>
                    </div>

                    <div
                      onClick={() =>
                        setSelectedLocation({
                          name: "Village Approach B-12 Colluvium (Zone HZ-02)",
                          coordinates: [30.1588, 78.3341],
                          type: "hazard",
                          detail: "Slope 39° • Soil Saturation 78% • 24h Rain 94mm. Culvert foundation erosion risk.",
                        })
                      }
                      className="bg-[#122e26] border border-amber-500/50 rounded-2xl p-4 space-y-2 hover:border-amber-400 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-amber-300">⚠️ B-12 Colluvium Slide Zone</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                          Weight: 0.78 (High)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#DCE8D4]/80">
                        Slope: 39° | Soil Saturation: 78% | 24h Rain: 94mm
                      </p>
                      <div className="text-[11px] text-amber-200">
                        Protocol: Pre-position backhoe at chainage 3+400; monitor slope tension cracks.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Turn-by-Turn Navigation Routing Card */}
                <div className="bg-[#122e26] border border-[#DCE8D4]/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#D6A65D] uppercase tracking-wider block">
                      Active Navigation Route To Selected Target
                    </span>
                    <p className="font-bold text-white text-sm flex items-center gap-2">
                      <span>🎯</span> {selectedLocation.name}
                    </p>
                    <p className="text-[11px] text-[#DCE8D4]/80">{selectedLocation.detail}</p>
                    <span className="text-[10px] font-mono text-[#D6A65D]">
                      GPS Coordinates: [{selectedLocation.coordinates.join(", ")}]
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() =>
                        showBanner(
                          `Navigation coordinates [${selectedLocation.coordinates.join(", ")}] transmitted to field terminal!`
                        )
                      }
                      className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-[#D6A65D] text-[#173D32] font-black hover:bg-[#e0b268] transition-colors cursor-pointer text-xs"
                    >
                      🧭 Transmit GPS & Route
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ── TAB 3: VILLAGER REPORTS ────────────────────────── */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-[#173D32]">Citizen & Villager Hazard Reports</h2>
                  <p className="text-xs text-[#173D32]/70 mt-0.5">
                    Reports submitted by villagers in {profile.assignedArea}. Verify on-ground, reject with reasons, or escalate.
                  </p>
                </div>

                {/* Status Filter */}
                <select
                  aria-label="Filter reports by status"
                  value={reportFilterStatus}
                  onChange={(e) => setReportFilterStatus(e.target.value)}
                  className="bg-[#FAF8F2] border border-[#173D32]/20 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#173D32] outline-none"
                >
                  <option value="All">All Reports</option>
                  <option value="Pending">Pending Verification</option>
                  <option value="Verified">Verified Ground Truth</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Escalated">Escalated to Command</option>
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
                      className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-3xl p-5 shadow-xs space-y-3 hover:border-[#173D32]/30 transition-all"
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
                          ● {rep.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div className="sm:col-span-2 space-y-1.5">
                          <p className="text-[#173D32] font-semibold leading-relaxed">{rep.locationDescription}</p>
                          <div className="text-[11px] text-[#173D32]/70 flex flex-wrap items-center gap-3">
                            <span>
                              Reported by: <strong>{rep.villagerName}</strong> ({rep.contact})
                            </span>
                            <span>
                              Time: {new Date(rep.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>

                          {rep.fieldNotes && (
                            <div className="bg-[#DCE8D4]/40 p-2.5 rounded-xl text-[11px] border border-[#173D32]/10 mt-1">
                              <strong>Officer Field Notes:</strong> {rep.fieldNotes}
                            </div>
                          )}

                          {rep.rejectionReason && (
                            <div className="bg-rose-50 text-rose-900 p-2.5 rounded-xl text-[11px] border border-rose-200 mt-1">
                              <strong>Rejection Justification:</strong> {rep.rejectionReason}
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
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#173D32]/10">
                        {rep.status === "Pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(rep.id);
                                setModalInput("");
                                setPhotoAttachment(null);
                                setModalType("verifyReport");
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
                            >
                              ✓ Verify with Notes & Photo
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
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(rep.id);
                            setModalType("viewReport");
                          }}
                          className="px-3.5 py-1.5 rounded-xl border border-[#173D32]/25 text-[#173D32] text-xs font-bold hover:bg-[#173D32]/10 transition-colors cursor-pointer ml-auto"
                        >
                          🔍 View Full Report
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ── TAB 4: ROAD STATUS ─────────────────────────────── */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === "roads" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-[#173D32]">Real-Time Road Corridor Conditions</h2>
                <p className="text-xs text-[#173D32]/70 mt-0.5">
                  Update segment conditions (Open, Caution, Partially Blocked, Blocked) with photograph attachments and reasons.
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
                        {road.photoUrl && (
                          <div className="my-2">
                            <span className="text-[10px] text-[#173D32]/60 font-semibold block mb-1">Attached Photo:</span>
                            <img
                              src={road.photoUrl}
                              alt="Road condition"
                              className="h-24 rounded-xl object-cover border border-[#173D32]/20"
                            />
                          </div>
                        )}
                        <p className="text-[11px] text-[#173D32]/60 pt-1">
                          Last Updated:{" "}
                          {new Date(road.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}{" "}
                          by {getRoadUpdater(road)}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#173D32]/10 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(road.roadSegmentId);
                            setRoadCondition(road.condition);
                            setModalInput(road.reason);
                            setPhotoAttachment(road.photoUrl || null);
                            setModalType("updateRoad");
                          }}
                          className="px-4 py-2 rounded-xl bg-[#173D32] text-[#F8F4EC] text-xs font-bold hover:bg-[#1f4e40] transition-colors cursor-pointer"
                        >
                          ⚡ Update Condition & Photo
                        </button>
                        <span className="text-[10px] text-[#173D32]/60 font-mono">
                          Broadcasts to Administrator & Route Planners
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Previously Submitted Updates Feed */}
              {roadHistory.length > 0 && (
                <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-3xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#173D32]/10 pb-2">
                    <h3 className="font-extrabold text-sm text-[#173D32]">Previously Submitted Updates (Audit Log)</h3>
                    <span className="text-[11px] text-[#173D32]/60">{roadHistory.length} recorded entries</span>
                  </div>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {roadHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-white/60 rounded-xl border border-[#173D32]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#173D32]">{item.stretchName}</span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                item.condition === "Blocked"
                                  ? "bg-rose-100 text-rose-800"
                                  : item.condition === "Partially Blocked"
                                  ? "bg-amber-100 text-amber-800"
                                  : item.condition === "Caution"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {item.condition}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#173D32]/80">{item.reason}</p>
                        </div>
                        <div className="text-[10px] text-[#173D32]/60 font-mono sm:text-right shrink-0">
                          <div>{new Date(item.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</div>
                          <div>By {item.updatedBy}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ── TAB 5: SECTOR ALERTS ───────────────────────────── */}
          {/* ══════════════════════════════════════════════════════════ */}
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

                      <div className="pt-3 border-t border-[#173D32]/10 flex flex-wrap items-center justify-between gap-2">
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

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(alert.id);
                            setModalType("viewAlert");
                          }}
                          className="px-3.5 py-1.5 rounded-xl border border-[#173D32]/25 text-[#173D32] text-xs font-bold hover:bg-[#173D32]/10 transition-colors cursor-pointer"
                        >
                          📋 Protocol Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── ACTION & DETAIL MODALS ──────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#FAF8F2] border border-[#173D32]/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg text-[#173D32]">
              {modalType === "completeTask" && `Complete Inspection: ${selectedId}`}
              {modalType === "escalateTask" && `🚨 Escalate Task: ${selectedId} to Command`}
              {modalType === "verifyReport" && `Verify Villager Report: ${selectedId}`}
              {modalType === "rejectReport" && `Reject Citizen Report: ${selectedId}`}
              {modalType === "escalateReport" && `🚨 Escalate Report: ${selectedId}`}
              {modalType === "updateRoad" && `Update Road Condition: ${selectedId}`}
              {modalType === "viewTask" && `Inspection Task Details: ${selectedId}`}
              {modalType === "viewReport" && `Citizen Report Details: ${selectedId}`}
              {modalType === "viewAlert" && `Emergency Protocol Details: ${selectedId}`}
            </h3>

            {/* Complete Task Modal */}
            {modalType === "completeTask" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#173D32]">
                  Completion Notes / Ground Observations:
                </label>
                <textarea
                  rows={4}
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="Describe ground stability, mitigations conducted, culvert clearance..."
                  className="w-full bg-white border border-[#173D32]/20 rounded-2xl p-3 text-xs outline-none focus:border-[#173D32]"
                />
              </div>
            )}

            {/* Escalate Task Modal */}
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

            {/* Verify Report Modal */}
            {modalType === "verifyReport" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#173D32] block mb-1">
                    Field Verification Notes:
                  </label>
                  <textarea
                    rows={3}
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    placeholder="Document ground truth, verified crack dimensions, hazard confirmation..."
                    className="w-full bg-white border border-[#173D32]/20 rounded-2xl p-3 text-xs outline-none focus:border-[#173D32]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#173D32] block mb-1">
                    Attach Inspector Photograph:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="w-full text-xs text-[#173D32] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#173D32] file:text-[#F8F4EC] cursor-pointer"
                  />
                  {photoAttachment && (
                    <div className="mt-2">
                      <span className="text-[10px] text-emerald-800 font-bold block mb-1">Image Preview:</span>
                      <img src={photoAttachment} alt="Inspector observation" className="h-20 rounded-xl object-cover border" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reject Report Modal */}
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

            {/* Escalate Report Modal */}
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

            {/* Update Road Modal */}
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
                <div>
                  <label className="text-xs font-semibold text-[#173D32] block mb-1">Attach Condition Photo:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="w-full text-xs text-[#173D32] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#173D32] file:text-[#F8F4EC] cursor-pointer"
                  />
                  {photoAttachment && (
                    <div className="mt-2">
                      <span className="text-[10px] text-emerald-800 font-bold block mb-1">Image Preview:</span>
                      <img src={photoAttachment} alt="Road condition" className="h-20 rounded-xl object-cover border" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detailed View Modal: Task */}
            {modalType === "viewTask" && selectedTaskObj && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-white/70 rounded-2xl border border-[#173D32]/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#173D32]">Status:</span>
                    <span className="font-bold px-2 py-0.5 rounded-full bg-[#173D32]/10">{selectedTaskObj.status}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#173D32] block">Location:</span>
                    <span>{getTaskLocation(selectedTaskObj)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#173D32] block">GPS Coordinates:</span>
                    <span className="font-mono">{getTaskCoordinates(selectedTaskObj)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#173D32] block">Risk & Priority:</span>
                    <span>{selectedTaskObj.riskLevel} Risk • Priority: {selectedTaskObj.priority || selectedTaskObj.riskLevel}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#173D32] block">Inspection Reason:</span>
                    <p className="leading-relaxed">{selectedTaskObj.reason}</p>
                  </div>
                  <div>
                    <span className="font-bold text-[#173D32] block">Deadline:</span>
                    <span>{new Date(selectedTaskObj.deadline).toLocaleString()}</span>
                  </div>
                  {getTaskNotes(selectedTaskObj) && (
                    <div>
                      <span className="font-bold text-[#173D32] block">Officer Notes:</span>
                      <span>{getTaskNotes(selectedTaskObj)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detailed View Modal: Report */}
            {modalType === "viewReport" && selectedReportObj && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-white/70 rounded-2xl border border-[#173D32]/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#173D32]">Status:</span>
                    <span className="font-bold px-2 py-0.5 rounded-full bg-[#173D32]/10">{selectedReportObj.status}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#173D32] block">Hazard Type:</span>
                    <span>{selectedReportObj.hazardType}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#173D32] block">Description:</span>
                    <p className="leading-relaxed">{selectedReportObj.locationDescription}</p>
                  </div>
                  <div>
                    <span className="font-bold text-[#173D32] block">Reported By:</span>
                    <span>{selectedReportObj.villagerName} ({selectedReportObj.contact})</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#173D32] block">Timestamp:</span>
                    <span>{new Date(selectedReportObj.timestamp).toLocaleString()}</span>
                  </div>
                  {selectedReportObj.photoUrl && (
                    <div>
                      <span className="font-bold text-[#173D32] block mb-1">Citizen Photo:</span>
                      <img src={selectedReportObj.photoUrl} alt="Hazard evidence" className="w-full h-44 object-cover rounded-xl border" />
                    </div>
                  )}
                  {selectedReportObj.fieldNotes && (
                    <div>
                      <span className="font-bold text-[#173D32] block">Verification Field Notes:</span>
                      <span>{selectedReportObj.fieldNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detailed View Modal: Alert */}
            {modalType === "viewAlert" && selectedAlertObj && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-white/70 rounded-2xl border border-[#173D32]/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#173D32]">Severity:</span>
                    <span className="font-black px-2 py-0.5 rounded-full bg-rose-600 text-white uppercase">{selectedAlertObj.severity}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#173D32] block">Bulletin Title:</span>
                    <span className="font-semibold text-sm">{selectedAlertObj.title}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#173D32] block">Dispatched:</span>
                    <span>{new Date(selectedAlertObj.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#173D32] block mb-1">Standard Action Protocol:</span>
                    <pre className="whitespace-pre-wrap font-sans bg-white p-3 rounded-xl border text-[11px] leading-relaxed">
                      {selectedAlertObj.instructions}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#173D32]/10">
              <button
                type="button"
                onClick={() => {
                  setModalType(null);
                  setPhotoAttachment(null);
                }}
                className="px-4 py-2 rounded-xl border border-[#173D32]/20 text-xs font-bold hover:bg-[#173D32]/5 cursor-pointer"
              >
                {modalType.startsWith("view") ? "Close" : "Cancel"}
              </button>

              {!modalType.startsWith("view") && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    if (modalType === "completeTask") handleCompleteTask();
                    if (modalType === "escalateTask") handleEscalateTask();
                    if (modalType === "verifyReport") handleVerifyReport();
                    if (modalType === "rejectReport") handleRejectReport();
                    if (modalType === "escalateReport") handleEscalateReport();
                    if (modalType === "updateRoad") handleRoadUpdate();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#173D32] text-[#F8F4EC] text-xs font-bold hover:bg-[#1f4e40] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Confirm & Submit"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
