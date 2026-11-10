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
import PortalLayout from "@/components/portal/PortalLayout";
import PortalFilterBar from "@/components/portal/PortalFilterBar";
import RiskMap from "@/components/RiskMap";
import {
  RefreshCw,
  Globe,
  Bell,
  MapPin,
  ClipboardList,
  Map as MapIcon,
  FileText,
  Route,
  AlertTriangle,
  CheckCircle2,
  Play,
  CheckCircle,
  AlertOctagon,
  Eye,
  Navigation,
  Compass,
  CloudRain,
  Layers,
  Check,
  X,
  Camera,
  ShieldAlert,
  User,
  Clock,
  Ban,
  Crosshair,
} from "lucide-react";

type TabType = "tasks" | "map" | "reports" | "roads" | "alerts" | "profile";

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
  const [notificationBanner, setNotificationBanner] = useState<{ message: string; type: "success" | "warning" | "info" } | null>(null);

  const showBanner = useCallback((msg: string, type: "success" | "warning" | "info" = "success") => {
    setNotificationBanner({ message: msg, type });
    const timer = setTimeout(() => setNotificationBanner(null), 4500);
    return () => clearTimeout(timer);
  }, []);

  // ── Fetch All Live Data from Backend ──────────────────────────────────────
  const loadAllData = useCallback(async () => {
    try {
      const [pRes, tRes, rRes, rdRes, aRes, mRes] = await Promise.allSettled([
        fieldOfficerApi.getProfile(),
        fieldOfficerApi.getTasks(),
        fieldOfficerApi.getReports(),
        fieldOfficerApi.getCurrentRoadStatus(),
        fieldOfficerApi.getAlerts(),
        fieldOfficerApi.getMapData(),
      ]);

      if (pRes.status === "fulfilled" && pRes.value) {
        setProfile((prev) => ({
          ...prev,
          ...pRes.value,
          id: pRes.value.id || prev.id,
          name: pRes.value.name || prev.name,
          assignedArea: pRes.value.assignedArea || prev.assignedArea,
          department: pRes.value.department || prev.department,
          phone: pRes.value.phone || prev.phone,
        }));
        if (pRes.value.language) {
          setPreferredLang(pRes.value.language.toLowerCase());
        }
      }

      if (tRes.status === "fulfilled" && Array.isArray(tRes.value)) {
        setTasks(tRes.value);
      }

      if (rRes.status === "fulfilled" && Array.isArray(rRes.value)) {
        setReports(rRes.value);
      }

      if (rdRes.status === "fulfilled" && Array.isArray(rdRes.value)) {
        setRoads(rdRes.value);
        if (rdRes.value.length > 0 && roadHistory.length === 0) {
          setRoadHistory(
            rdRes.value.map((rd, idx) => ({
              id: `HIST-${idx + 1}`,
              roadSegmentId: rd.roadSegmentId,
              stretchName: rd.stretchName,
              condition: rd.condition,
              reason: rd.reason || "Scheduled monitoring log entry",
              photoUrl: rd.photoUrl,
              timestamp: rd.timestamp || new Date(Date.now() - idx * 3600000).toISOString(),
              updatedBy: rd.updatedBy || "Officer K. Patil",
            }))
          );
        }
      }

      if (aRes.status === "fulfilled" && Array.isArray(aRes.value)) {
        setAlerts(aRes.value);
      }

      if (mRes.status === "fulfilled" && mRes.value) {
        setMapData(mRes.value);
      }

      const now = new Date();
      setLastSynced(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      showBanner("Unable to refresh sector telemetry. Using cached data.", "warning");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roadHistory.length, showBanner]);

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const initTimer = setTimeout(() => {
      void loadAllData();
    }, 0);
    const interval = setInterval(() => {
      void loadAllData();
    }, 45000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [loadAllData]);

  // ── Language Update ───────────────────────────────────────────────────────
  const handleLanguageChange = async (newLang: string) => {
    setPreferredLang(newLang);
    try {
      await fieldOfficerApi.updateLanguage(newLang.toUpperCase());
      setProfile((prev) => ({ ...prev, language: newLang.toUpperCase() }));
      showBanner(`Operational language updated to ${newLang.toUpperCase()}`, "info");
    } catch {
      showBanner("Failed to persist language preference.", "warning");
    }
  };

  // ── File Photo Attachment Helper ──────────────────────────────────────────
  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoAttachment(reader.result as string);
        showBanner(`Field photo attached: ${file.name}`, "info");
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
      showBanner(`Task ${id} started. Inspection active.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to start task ${id}`;
      showBanner(msg, "warning");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedId) return;
    try {
      setIsSubmitting(true);
      const notes = modalInput.trim() || "Inspection concluded. Slope integrity verified.";
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
      showBanner(`Task ${selectedId} marked Completed.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to complete task ${selectedId}`;
      showBanner(msg, "warning");
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
      showBanner(`Task ${selectedId} escalated to Central Command Desk.`, "warning");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to escalate task ${selectedId}`;
      showBanner(msg, "warning");
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
      showBanner(`Report ${selectedId} verified. Ground truth saved.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to verify report ${selectedId}`;
      showBanner(msg, "warning");
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
      showBanner(`Report ${selectedId} marked Rejected.`, "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to reject report ${selectedId}`;
      showBanner(msg, "warning");
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
      showBanner(`Report ${selectedId} escalated to High Command.`, "warning");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to escalate report ${selectedId}`;
      showBanner(msg, "warning");
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

      // Add to audit log
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
      showBanner(`Road condition updated to '${roadCondition}'.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update road condition";
      showBanner(msg, "warning");
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
      showBanner(`Emergency Alert ${id} acknowledged.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to acknowledge alert ${id}`;
      showBanner(msg, "warning");
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

  const getRoadConditionBadge = (condition: RoadCondition) => {
    switch (condition) {
      case "Open":
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          classes: "bg-emerald-50 text-emerald-800 border-emerald-200",
        };
      case "Caution":
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          classes: "bg-amber-50 text-amber-800 border-amber-200",
        };
      case "Partially Blocked":
        return {
          icon: <AlertOctagon className="w-3.5 h-3.5 text-orange-600" />,
          classes: "bg-orange-50 text-orange-800 border-orange-200",
        };
      case "Blocked":
        return {
          icon: <Ban className="w-3.5 h-3.5 text-rose-600" />,
          classes: "bg-rose-50 text-rose-800 border-rose-200",
        };
      default:
        return {
          icon: <Route className="w-3.5 h-3.5 text-slate-600" />,
          classes: "bg-slate-50 text-slate-800 border-slate-200",
        };
    }
  };

  return (
    <PortalLayout
      allowedRoles={["field_officer", "admin"]}
      title="Field Operations Workbench"
      subtitle={`${profile.assignedArea} • Badge ID: ${profile.badgeNumber || profile.id}`}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void handleManualRefresh();
            }}
            disabled={refreshing}
            title={`Last synced: ${lastSynced}. Click to re-sync.`}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-[#DCE8D4]/30 border border-[#173D32]/20 text-[#173D32] px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{loading || refreshing ? "Syncing..." : lastSynced}</span>
          </button>

          <div className="flex items-center gap-1 bg-white border border-[#173D32]/20 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
            <Globe className="w-3.5 h-3.5 text-[#173D32]/70" />
            <select
              id="field-operational-language"
              name="preferredLanguage"
              aria-label="Operational Language"
              value={preferredLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-transparent text-[#173D32] font-semibold text-xs outline-none cursor-pointer"
            >
              <option value="en">EN</option>
              <option value="hi">HI</option>
              <option value="mr">MR</option>
              <option value="ao">AO</option>
            </select>
          </div>

          <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-xl text-xs shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>{profile.activeDutyStatus ? "Active On-Duty" : "Standby"}</span>
          </span>

          <Link
            href="/field/tasks"
            className="px-3 py-1.5 rounded-xl bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
          >
            <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Task Queue View</span>
          </Link>
        </div>
      }
    >
      {/* ── 1. LIVE TOAST NOTIFICATION ─────────────────────────────────────── */}
      {notificationBanner && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-xs shadow-md border flex items-center gap-2 ${
            notificationBanner.type === "warning"
              ? "bg-amber-50 text-amber-900 border-amber-300"
              : notificationBanner.type === "info"
              ? "bg-sky-50 text-sky-900 border-sky-300"
              : "bg-emerald-50 text-emerald-900 border-emerald-300"
          }`}
        >
          {notificationBanner.type === "warning" ? (
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
          )}
          <span>{notificationBanner.message}</span>
        </div>
      )}

      {/* ── 2. UNIFIED WORKBENCH MODULE NAVIGATION BAR ─────────────────────── */}
      <div className="space-y-6">
        <PortalFilterBar
          left={
            <>
              <button
                type="button"
                onClick={() => setActiveTab("tasks")}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "tasks"
                    ? "bg-[#173D32] text-[#F8F4EC] shadow-xs"
                    : "bg-white text-[#173D32] border border-[#173D32]/12 hover:bg-[#DCE8D4]/40"
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                <span>My Tasks</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === "tasks" ? "bg-[#D6A65D] text-[#173D32]" : "bg-[#173D32]/10 text-[#173D32]"
                  }`}
                >
                  {tasks.filter((t) => t.status !== "Completed").length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("map")}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "map"
                    ? "bg-[#173D32] text-[#F8F4EC] shadow-xs"
                    : "bg-white text-[#173D32] border border-[#173D32]/12 hover:bg-[#DCE8D4]/40"
                }`}
              >
                <MapIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Assigned Area Map</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === "map" ? "bg-[#D6A65D] text-[#173D32]" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  Live
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("reports")}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "reports"
                    ? "bg-[#173D32] text-[#F8F4EC] shadow-xs"
                    : "bg-white text-[#173D32] border border-[#173D32]/12 hover:bg-[#DCE8D4]/40"
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>Reports</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === "reports" ? "bg-[#D6A65D] text-[#173D32]" : "bg-[#173D32]/10 text-[#173D32]"
                  }`}
                >
                  {reports.filter((r) => r.status === "Pending").length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("roads")}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "roads"
                    ? "bg-[#173D32] text-[#F8F4EC] shadow-xs"
                    : "bg-white text-[#173D32] border border-[#173D32]/12 hover:bg-[#DCE8D4]/40"
                }`}
              >
                <Route className="w-3.5 h-3.5 shrink-0" />
                <span>Road Status</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === "roads" ? "bg-[#D6A65D] text-[#173D32]" : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {roads.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("alerts")}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "alerts"
                    ? "bg-[#173D32] text-[#F8F4EC] shadow-xs"
                    : "bg-white text-[#173D32] border border-[#173D32]/12 hover:bg-[#DCE8D4]/40"
                }`}
              >
                <Bell className="w-3.5 h-3.5 shrink-0" />
                <span>Alerts</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    alerts.some((a) => !a.acknowledged)
                      ? "bg-rose-600 text-white"
                      : activeTab === "alerts"
                      ? "bg-[#D6A65D] text-[#173D32]"
                      : "bg-[#173D32]/10 text-[#173D32]"
                  }`}
                >
                  {alerts.filter((a) => !a.acknowledged).length} New
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-[#173D32] text-[#F8F4EC] shadow-xs"
                    : "bg-white text-[#173D32] border border-[#173D32]/12 hover:bg-[#DCE8D4]/40"
                }`}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>Profile</span>
              </button>
            </>
          }
          right={
            <div className="inline-flex items-center gap-1.5 bg-[#173D32]/8 border border-[#173D32]/15 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#173D32]">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate max-w-[240px]">{profile.assignedArea}</span>
            </div>
          }
        />

        {/* Main Tab Canvas */}
        <div className="min-w-0 space-y-6">
          {/* Real-time Sector Overview Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab("tasks")}
              className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-4 shadow-xs hover:border-[#173D32]/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/70">
                  Assigned Tasks
                </span>
                <ClipboardList className="w-4 h-4 text-[#173D32]/60" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#173D32]">
                  {tasks.filter((t) => t.status !== "Completed").length}
                </span>
                <span className="text-xs text-[#173D32]/60">active / {tasks.length} total</span>
              </div>
              <p className="text-[11px] text-[#173D32]/70 mt-1">
                {tasks.filter((t) => t.status === "In_Progress").length} in-progress inspection(s)
              </p>
            </div>

            <div
              onClick={() => setActiveTab("roads")}
              className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-4 shadow-xs hover:border-[#173D32]/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/70">
                  Road Conditions
                </span>
                <Route className="w-4 h-4 text-[#173D32]/60" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#173D32]">
                  {roads.filter((r) => r.condition !== "Open").length}
                </span>
                <span className="text-xs text-[#173D32]/60">hazard alerts / {roads.length} segments</span>
              </div>
              <p className="text-[11px] text-[#173D32]/70 mt-1">
                {roads.filter((r) => r.condition === "Blocked").length} road blockage(s) flagged
              </p>
            </div>

            <div
              onClick={() => setActiveTab("reports")}
              className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-4 shadow-xs hover:border-[#173D32]/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#173D32]/70">
                  Citizen Reports
                </span>
                <FileText className="w-4 h-4 text-[#173D32]/60" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#173D32]">
                  {reports.filter((r) => r.status === "Pending").length}
                </span>
                <span className="text-xs text-[#173D32]/60">pending verification</span>
              </div>
              <p className="text-[11px] text-[#173D32]/70 mt-1">
                {reports.filter((r) => r.status === "Verified").length} confirmed ground-truth
              </p>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: MY TASKS                                                */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              {/* Header & Filter Controls */}
              <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#173D32]">Assigned Inspection Tasks</h2>
                  <p className="text-xs text-[#173D32]/70">
                    High-priority landslide ground checks and engineering inspections in {profile.assignedArea}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[#173D32]/60 font-medium">Status:</span>
                    <select
                      aria-label="Filter tasks by status"
                      value={taskFilterStatus}
                      onChange={(e) => setTaskFilterStatus(e.target.value)}
                      className="bg-white border border-[#173D32]/20 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Assigned">Assigned / Pending</option>
                      <option value="In_Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Escalated">Escalated</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[#173D32]/60 font-medium">Risk:</span>
                    <select
                      aria-label="Filter tasks by risk level"
                      value={taskFilterRisk}
                      onChange={(e) => setTaskFilterRisk(e.target.value)}
                      className="bg-white border border-[#173D32]/20 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none cursor-pointer"
                    >
                      <option value="All">All Risks</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              {filteredTasks.length === 0 ? (
                <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-8 text-center">
                  <ClipboardList className="w-8 h-8 text-[#173D32]/30 mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#173D32]">No matching tasks found</p>
                  <p className="text-xs text-[#173D32]/60 mt-1">Adjust filters to inspect assigned work orders</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => {
                    const isCompleted = task.status === "Completed";
                    const isInProgress = task.status === "In_Progress";
                    const isEscalated = task.status === "Escalated";

                    return (
                      <div
                        key={task.id}
                        className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#173D32]/35 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#173D32]/10">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[#173D32] bg-[#173D32]/10 px-2 py-0.5 rounded-md">
                                {task.id}
                              </span>

                              {/* Risk Badge */}
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                  task.riskLevel === "Critical"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : task.riskLevel === "High"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-blue-50 text-blue-800 border-blue-200"
                                }`}
                              >
                                {task.riskLevel} Risk
                              </span>

                              {/* Status Badge */}
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                  isCompleted
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : isInProgress
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : isEscalated
                                    ? "bg-purple-50 text-purple-800 border-purple-200"
                                    : "bg-slate-50 text-slate-700 border-slate-200"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isCompleted
                                      ? "bg-emerald-600"
                                      : isInProgress
                                      ? "bg-amber-600"
                                      : isEscalated
                                      ? "bg-purple-600"
                                      : "bg-slate-400"
                                  }`}
                                />
                                <span>{task.status.replace("_", " ")}</span>
                              </span>
                            </div>

                            <h3 className="text-sm sm:text-base font-bold text-[#173D32]">
                              {task.title || getTaskLocation(task)}
                            </h3>

                            <div className="flex items-center gap-2 text-xs text-[#173D32]/70 mt-1">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span>{getTaskLocation(task)}</span>
                              <span className="opacity-40">•</span>
                              <span className="font-mono text-[11px]">{getTaskCoordinates(task)}</span>
                            </div>
                          </div>

                          <div className="text-left sm:text-right shrink-0">
                            <span className="text-[11px] text-[#173D32]/60 block font-medium">Deadline</span>
                            <span className="text-xs font-semibold font-mono text-[#173D32]">
                              {new Date(task.deadline).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              {new Date(task.deadline).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Reason / Findings */}
                        <div className="py-3 text-xs text-[#173D32]/85 leading-relaxed">
                          <span className="font-semibold text-[#173D32]">Reason:</span> {task.reason}
                        </div>

                        {/* Completed Notes or Escalation Notes if present */}
                        {getTaskNotes(task) && (
                          <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                            <span className="font-bold">Inspection Findings:</span> {getTaskNotes(task)}
                          </div>
                        )}

                        {getTaskEscalationReason(task) && (
                          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                            <span className="font-bold">Escalation Justification:</span> {getTaskEscalationReason(task)}
                          </div>
                        )}

                        {/* Action Buttons Bar */}
                        <div className="pt-3 border-t border-[#173D32]/10 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {task.status !== "In_Progress" && !isCompleted && (
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleStartTask(task.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#173D32] hover:bg-[#1f4e40] text-[#F8F4EC] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>Start Inspection</span>
                              </button>
                            )}

                            {!isCompleted && (
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => {
                                  setSelectedId(task.id);
                                  setModalType("completeTask");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Mark Completed</span>
                              </button>
                            )}

                            {!isEscalated && !isCompleted && (
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => {
                                  setSelectedId(task.id);
                                  setModalType("escalateTask");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-600/40 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Escalate to Command</span>
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(task.id);
                              setModalType("viewTask");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#173D32]/20 hover:bg-[#173D32]/5 text-[#173D32] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Details</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: ASSIGNED AREA MAP                                       */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "map" && (
            <div className="space-y-4">
              <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#173D32]">Assigned Area Spatial Map</h2>
                  <p className="text-xs text-[#173D32]/70">
                    High-risk landslide zones, monitoring stations, and emergency access corridors for {profile.assignedArea}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/70 border border-[#173D32]/15">
                  <button
                    type="button"
                    onClick={() => setMapLayer("topo")}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      mapLayer === "topo" ? "bg-[#173D32] text-[#F8F4EC]" : "text-[#173D32]/70 hover:text-[#173D32]"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Topographic</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapLayer("hazard")}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      mapLayer === "hazard" ? "bg-[#173D32] text-[#F8F4EC]" : "text-[#173D32]/70 hover:text-[#173D32]"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Hazard Heatmap</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapLayer("rainfall")}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      mapLayer === "rainfall" ? "bg-[#173D32] text-[#F8F4EC]" : "text-[#173D32]/70 hover:text-[#173D32]"
                    }`}
                  >
                    <CloudRain className="w-3.5 h-3.5" />
                    <span>24h Rain Saturation</span>
                  </button>
                </div>
              </div>

              {/* Spatial Interactive View Canvas */}
              <div className="bg-[#173D32] text-[#F8F4EC] rounded-2xl p-5 shadow-xs border border-[#173D32]/20 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DCE8D4]/20 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Compass className="w-4 h-4 text-[#D6A65D]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#DCE8D4]">
                      Sector 4 Corridors Navigation Grid
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#DCE8D4]/80">
                    {mapData && (
                      <span className="px-2 py-0.5 rounded-md bg-[#DCE8D4]/15 text-[#DCE8D4] font-sans font-semibold">
                        {Array.isArray(mapData.dangerZones) ? mapData.dangerZones.length : 0} danger zones ·{" "}
                        {Array.isArray(mapData.navigationRoutes) ? mapData.navigationRoutes.length : 0} routes
                      </span>
                    )}
                    <span>
                      Lat: {selectedLocation.coordinates[0].toFixed(4)}° N, Long: {selectedLocation.coordinates[1].toFixed(4)}° E
                    </span>
                  </div>
                </div>

                {/* 3D Mapbox GIS Interactive Workstation */}
                <div className="h-80 sm:h-96 rounded-xl overflow-hidden border border-[#DCE8D4]/20 relative shadow-inner mb-4 bg-[#122e26]">
                  <RiskMap
                    variant="dashboard"
                    className="w-full h-full"
                  />
                </div>

                {/* Spatial Map Simulation Screen */}
                <div className="min-h-64 sm:min-h-80 rounded-xl bg-[#122e26] border border-[#DCE8D4]/20 p-4 relative flex flex-col justify-between gap-4 overflow-hidden">
                  {/* Grid Lines Pattern */}
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, #DCE8D4 1px, transparent 1px), linear-gradient(to bottom, #DCE8D4 1px, transparent 1px)",
                      backgroundSize: "28px 28px",
                    }}
                  />

                  {/* Sector Points Pins */}
                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Village Pin 1 */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedLocation({
                          name: "Rampur Upper",
                          coordinates: [30.1482, 78.3241],
                          type: "village",
                          detail: "Population: 2,400 • Primary Evacuation Zone: School Grounds",
                        })
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedLocation.name === "Rampur Upper"
                          ? "bg-[#D6A65D] text-[#173D32] border-[#D6A65D] font-bold"
                          : "bg-[#173D32]/80 text-[#DCE8D4] border-[#DCE8D4]/20 hover:bg-[#173D32]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Rampur Upper</span>
                      </div>
                      <span className="text-[10px] opacity-80 block mt-0.5">Village Settlement</span>
                    </button>

                    {/* Village Pin 2 */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedLocation({
                          name: "Devipura",
                          coordinates: [30.1554, 78.3298],
                          type: "village",
                          detail: "Population: 1,800 • Primary Evacuation Zone: Community Hall",
                        })
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedLocation.name === "Devipura"
                          ? "bg-[#D6A65D] text-[#173D32] border-[#D6A65D] font-bold"
                          : "bg-[#173D32]/80 text-[#DCE8D4] border-[#DCE8D4]/20 hover:bg-[#173D32]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Devipura</span>
                      </div>
                      <span className="text-[10px] opacity-80 block mt-0.5">Village Settlement</span>
                    </button>

                    {/* Village Pin 3 */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedLocation({
                          name: "Shivalik Ridge",
                          coordinates: [30.1418, 78.3129],
                          type: "village",
                          detail: "Population: 950 • Downslope exposure to rockfall",
                        })
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedLocation.name === "Shivalik Ridge"
                          ? "bg-[#D6A65D] text-[#173D32] border-[#D6A65D] font-bold"
                          : "bg-[#173D32]/80 text-[#DCE8D4] border-[#DCE8D4]/20 hover:bg-[#173D32]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Shivalik Ridge</span>
                      </div>
                      <span className="text-[10px] opacity-80 block mt-0.5">High Exposure Village</span>
                    </button>
                  </div>

                  {/* Road Stretches Overlays */}
                  <div className="relative z-10 flex flex-wrap gap-2 my-auto">
                    {roads.map((r) => (
                      <button
                        key={r.roadSegmentId}
                        type="button"
                        onClick={() =>
                          setSelectedLocation({
                            name: r.stretchName,
                            coordinates: [30.1425, 78.3182],
                            type: "road",
                            detail: `Condition: ${r.condition} — ${r.reason}`,
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                          selectedLocation.name === r.stretchName
                            ? "bg-[#D6A65D] text-[#173D32] border-[#D6A65D]"
                            : "bg-[#122e26]/90 border-[#DCE8D4]/25 text-[#DCE8D4] hover:bg-[#173D32]"
                        }`}
                      >
                        <Route className="w-3.5 h-3.5" />
                        <span>{r.stretchName}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            r.condition === "Blocked"
                              ? "bg-rose-900 text-rose-200"
                              : r.condition === "Partially Blocked"
                              ? "bg-orange-900 text-orange-200"
                              : "bg-amber-900 text-amber-200"
                          }`}
                        >
                          {r.condition}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Danger Zone Indicators */}
                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedLocation({
                          name: "KM 42+200 Upper Ridge Cutting",
                          coordinates: [30.1425, 78.3182],
                          type: "hazard",
                          detail: "Slope: 48° • Soil Saturation: 89% • 24h Rain: 118mm. Retaining wall inspection required.",
                        })
                      }
                      className={`p-2 rounded-lg border text-left cursor-pointer ${
                        selectedLocation.name === "KM 42+200 Upper Ridge Cutting"
                          ? "bg-rose-950 border-rose-400 text-rose-100"
                          : "bg-[#173D32]/80 border-rose-500/30 text-rose-200 hover:bg-[#173D32]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>KM 42+200 Upper Ridge Cutting</span>
                      </div>
                      <span className="text-[10px] text-rose-300 block">Active Tension Cracks (Critical)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedLocation({
                          name: "B-12 Approach Culvert Washout",
                          coordinates: [30.1588, 78.3341],
                          type: "hazard",
                          detail: "Slope: 39° • Soil Saturation: 78% • 24h Rain: 94mm. Culvert foundation erosion risk.",
                        })
                      }
                      className={`p-2 rounded-lg border text-left cursor-pointer ${
                        selectedLocation.name === "B-12 Approach Culvert Washout"
                          ? "bg-amber-950 border-amber-400 text-amber-100"
                          : "bg-[#173D32]/80 border-amber-500/30 text-amber-200 hover:bg-[#173D32]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>B-12 Approach Road Foundation</span>
                      </div>
                      <span className="text-[10px] text-amber-300 block">Culvert Scour / Subsidence</span>
                    </button>
                  </div>
                </div>

                {/* Selected Coordinate Focus Inspector */}
                <div className="mt-4 p-3.5 rounded-xl bg-[#122e26] border border-[#DCE8D4]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[#DCE8D4]/60 block text-[11px] font-medium">Selected Ground Target</span>
                    <h4 className="font-bold text-[#F8F4EC] flex items-center gap-1.5 mt-0.5">
                      <Crosshair className="w-3.5 h-3.5 text-[#D6A65D]" />
                      <span>{selectedLocation.name}</span>
                    </h4>
                    {selectedLocation.detail && (
                      <p className="text-[11px] text-[#DCE8D4]/80 mt-0.5">{selectedLocation.detail}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      showBanner(`Routing telemetry to ${selectedLocation.name} dispatched.`, "info");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D6A65D] hover:bg-[#c4954d] text-[#173D32] font-bold text-xs transition-colors cursor-pointer shrink-0"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Navigate to Ground Target</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: VILLAGER REPORTS                                        */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#173D32]">Citizen & Villager Hazard Reports</h2>
                  <p className="text-xs text-[#173D32]/70">
                    Community eyewitness hazard dispatches requiring field verification in {profile.assignedArea}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[#173D32]/60 font-medium">Filter:</span>
                  <select
                    aria-label="Filter citizen reports"
                    value={reportFilterStatus}
                    onChange={(e) => setReportFilterStatus(e.target.value)}
                    className="bg-white border border-[#173D32]/20 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="All">All Reports</option>
                    <option value="Pending">Pending Verification</option>
                    <option value="Verified">Verified (Ground Truth)</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Escalated">Escalated</option>
                  </select>
                </div>
              </div>

              {filteredReports.length === 0 ? (
                <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-8 text-center">
                  <FileText className="w-8 h-8 text-[#173D32]/30 mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#173D32]">No citizen reports matching filter</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReports.map((rep) => {
                    const isPending = rep.status === "Pending";
                    const isVerified = rep.status === "Verified";
                    const isRejected = rep.status === "Rejected";
                    const isEscalated = rep.status === "Escalated";

                    return (
                      <div
                        key={rep.id}
                        className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#173D32]/35 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#173D32]/10">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[#173D32] bg-[#173D32]/10 px-2 py-0.5 rounded-md">
                                {rep.id}
                              </span>

                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                                {rep.hazardType}
                              </span>

                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                  isVerified
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : isRejected
                                    ? "bg-slate-50 text-slate-700 border-slate-200"
                                    : isEscalated
                                    ? "bg-purple-50 text-purple-800 border-purple-200"
                                    : "bg-amber-50 text-amber-800 border-amber-200"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isVerified
                                      ? "bg-emerald-600"
                                      : isRejected
                                      ? "bg-slate-400"
                                      : isEscalated
                                      ? "bg-purple-600"
                                      : "bg-amber-600"
                                  }`}
                                />
                                <span>{rep.status}</span>
                              </span>
                            </div>

                            <h3 className="text-sm sm:text-base font-bold text-[#173D32]">
                              {rep.locationDescription}
                            </h3>

                            <div className="flex items-center gap-3 text-xs text-[#173D32]/70 mt-1 flex-wrap">
                              <span>
                                Caller: <strong className="text-[#173D32]">{rep.villagerName}</strong> ({rep.contact})
                              </span>
                              <span className="opacity-40">•</span>
                              <span className="font-mono text-[11px]">
                                {new Date(rep.timestamp).toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>

                          {rep.coordinates && (
                            <span className="font-mono text-[11px] bg-[#173D32]/5 px-2.5 py-1 rounded-md text-[#173D32] shrink-0">
                              {rep.coordinates[0].toFixed(4)}° N, {rep.coordinates[1].toFixed(4)}° E
                            </span>
                          )}
                        </div>

                        {/* Officer Notes or Rejection Reason if present */}
                        {rep.fieldNotes && (
                          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                            <span className="font-bold">Officer Ground Truth:</span> {rep.fieldNotes}
                          </div>
                        )}

                        {rep.rejectionReason && (
                          <div className="mt-3 p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-800">
                            <span className="font-bold">Rejection Justification:</span> {rep.rejectionReason}
                          </div>
                        )}

                        {/* Action Buttons Bar */}
                        <div className="pt-3 mt-3 border-t border-[#173D32]/10 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => {
                                    setSelectedId(rep.id);
                                    setModalType("verifyReport");
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Verify Ground Truth</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => {
                                    setSelectedId(rep.id);
                                    setModalType("rejectReport");
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-400 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => {
                                    setSelectedId(rep.id);
                                    setModalType("escalateReport");
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/40 hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Escalate</span>
                                </button>
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(rep.id);
                              setModalType("viewReport");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#173D32]/20 hover:bg-[#173D32]/5 text-[#173D32] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Full Report</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: ROAD STATUS                                             */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "roads" && (
            <div className="space-y-6">
              <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-4 shadow-xs">
                <h2 className="text-lg font-bold text-[#173D32]">Monitored Road Corridors</h2>
                <p className="text-xs text-[#173D32]/70 mt-0.5">
                  Real-time conditions across National Highway and State Highway stretches in {profile.assignedArea}
                </p>
              </div>

              {/* Road Segments Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {roads.map((road) => {
                  const badge = getRoadConditionBadge(road.condition);

                  return (
                    <div
                      key={road.roadSegmentId}
                      className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-mono text-xs font-bold text-[#173D32] bg-[#173D32]/10 px-2 py-0.5 rounded-md">
                            {road.roadSegmentId}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${badge.classes}`}
                          >
                            {badge.icon}
                            <span>{road.condition}</span>
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-[#173D32]">{road.stretchName}</h3>
                        <p className="text-xs text-[#173D32]/80 mt-2 leading-relaxed">{road.reason}</p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-[#173D32]/10 flex items-center justify-between gap-2">
                        <div className="text-[11px] text-[#173D32]/60">
                          <span>Updated by {getRoadUpdater(road)}</span>
                          <span className="block font-mono text-[10px]">
                            {road.timestamp
                              ? new Date(road.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Recently"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(road.roadSegmentId);
                            setRoadCondition(road.condition);
                            setModalInput(road.reason || "");
                            setModalType("updateRoad");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#173D32] hover:bg-[#1f4e40] text-[#F8F4EC] text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Route className="w-3.5 h-3.5" />
                          <span>Update Condition</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Previously Submitted Updates Audit Log */}
              <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#173D32]">Previously Submitted Road Updates</h3>
                    <p className="text-xs text-[#173D32]/60">Historical log of condition adjustments in Sector 4</p>
                  </div>
                  <Clock className="w-4 h-4 text-[#173D32]/50" />
                </div>

                <div className="divide-y divide-[#173D32]/10 text-xs">
                  {roadHistory.map((item) => {
                    const badge = getRoadConditionBadge(item.condition);

                    return (
                      <div key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-[#173D32]">{item.stretchName}</span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded border ${badge.classes}`}
                            >
                              {badge.icon}
                              <span>{item.condition}</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-[#173D32]/75 mt-0.5">{item.reason}</p>
                        </div>
                        <span className="font-mono text-[10px] text-[#173D32]/60 shrink-0">
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB 5: SECTOR ALERTS                                           */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "alerts" && (
            <div className="space-y-4">
              <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-4 shadow-xs">
                <h2 className="text-lg font-bold text-[#173D32]">Sector Emergency Alerts & Protocols</h2>
                <p className="text-xs text-[#173D32]/70 mt-0.5">
                  Official meteorological and geological warnings issued for {profile.assignedArea}
                </p>
              </div>

              <div className="space-y-3">
                {alerts.map((alert) => {
                  const isCritical = alert.severity === "Critical";
                  const isWarning = alert.severity === "Warning";

                  return (
                    <div
                      key={alert.id}
                      className={`rounded-2xl p-5 shadow-xs border ${
                        isCritical
                          ? "bg-rose-50/80 border-rose-300 text-rose-950"
                          : isWarning
                          ? "bg-amber-50/80 border-amber-300 text-amber-950"
                          : "bg-sky-50/80 border-sky-300 text-sky-950"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-black/10">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-mono text-xs font-bold bg-white/70 px-2 py-0.5 rounded-md border border-black/10">
                              {alert.id}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                isCritical
                                  ? "bg-rose-700 text-white"
                                  : isWarning
                                  ? "bg-amber-700 text-white"
                                  : "bg-sky-700 text-white"
                              }`}
                            >
                              {alert.severity} Severity
                            </span>
                          </div>

                          <h3 className="text-base font-bold">{alert.title}</h3>
                          <p className="text-xs opacity-75 mt-0.5">{alert.targetSector || (alert as unknown as { assignedArea?: string }).assignedArea || profile.assignedArea}</p>
                        </div>

                        <span className="font-mono text-xs opacity-70">
                          {new Date(alert.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <p className="text-xs leading-relaxed py-3">{alert.instructions}</p>

                      <div className="pt-3 border-t border-black/10 flex flex-wrap items-center justify-between gap-2">
                        {alert.acknowledged ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-800 text-xs font-bold bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-lg">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                            <span>
                              Acknowledged at{" "}
                              {alert.acknowledgedAt
                                ? new Date(alert.acknowledgedAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "recorded"}
                            </span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#173D32] hover:bg-[#1f4e40] text-[#F8F4EC] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Acknowledge Alert</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(alert.id);
                            setModalType("viewAlert");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/20 hover:bg-black/5 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Protocol Details</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB 6: PROFILE & CLEARANCE                                     */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#173D32]">Field Responder Profile & Operational Clearance</h2>
                  <p className="text-xs text-[#173D32]/70 mt-0.5">
                    Official deployment credentials, sector clearance, and emergency dispatch communications
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-xl text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>Active On-Duty</span>
                </span>
              </div>

              {/* Profile Card */}
              <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#173D32]/10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#173D32] text-[#D6A65D] font-extrabold text-xl flex items-center justify-center shadow-xs shrink-0">
                      {officerInitials}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#173D32]">{profile.name}</h3>
                      <p className="text-xs font-mono text-[#173D32]/60 mt-0.5">Badge ID: {profile.badgeNumber || profile.id}</p>
                      <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-[#173D32]/10 text-[#173D32] text-[11px] font-bold">
                        {profile.department}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-white rounded-xl border border-[#173D32]/10 space-y-1">
                    <span className="text-[#173D32]/60 font-medium block">Assigned Operational Sector</span>
                    <span className="font-extrabold text-[#173D32] text-sm block">{profile.assignedArea}</span>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-[#173D32]/10 space-y-1">
                    <span className="text-[#173D32]/60 font-medium block">Emergency Contact Phone</span>
                    <span className="font-extrabold font-mono text-[#173D32] text-sm block">{profile.phone}</span>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-[#173D32]/10 space-y-1">
                    <span className="text-[#173D32]/60 font-medium block">Radio Dispatch Call Sign</span>
                    <span className="font-extrabold font-mono text-[#173D32] text-sm block">TERRA-ECHO-42 (Channel 4)</span>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-[#173D32]/10 space-y-1">
                    <span className="text-[#173D32]/60 font-medium block">Preferred Operational Language</span>
                    <span className="font-extrabold text-[#173D32] text-sm block uppercase">{preferredLang} (Standard Emergency Protocol)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 5. ACTION & DETAIL MODALS                                      */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#FAF8F2] text-[#173D32] rounded-2xl shadow-xl border border-[#173D32]/20 max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#173D32]/10">
              <h3 className="font-bold text-base text-[#173D32] flex items-center gap-2">
                {modalType === "completeTask" && <CheckCircle className="w-4 h-4 text-emerald-700" />}
                {modalType === "escalateTask" && <AlertTriangle className="w-4 h-4 text-rose-700" />}
                {modalType === "verifyReport" && <Check className="w-4 h-4 text-emerald-700" />}
                {modalType === "rejectReport" && <X className="w-4 h-4 text-slate-700" />}
                {modalType === "escalateReport" && <AlertTriangle className="w-4 h-4 text-rose-700" />}
                {modalType === "updateRoad" && <Route className="w-4 h-4 text-[#173D32]" />}
                {modalType === "viewTask" && <ClipboardList className="w-4 h-4 text-[#173D32]" />}
                {modalType === "viewReport" && <FileText className="w-4 h-4 text-[#173D32]" />}
                {modalType === "viewAlert" && <ShieldAlert className="w-4 h-4 text-[#173D32]" />}

                <span>
                  {modalType === "completeTask" && `Complete Inspection: ${selectedId}`}
                  {modalType === "escalateTask" && `Escalate Task: ${selectedId}`}
                  {modalType === "verifyReport" && `Verify Report: ${selectedId}`}
                  {modalType === "rejectReport" && `Reject Report: ${selectedId}`}
                  {modalType === "escalateReport" && `Escalate Report: ${selectedId}`}
                  {modalType === "updateRoad" && `Update Road Condition: ${selectedId}`}
                  {modalType === "viewTask" && `Task Record: ${selectedId}`}
                  {modalType === "viewReport" && `Citizen Hazard Report: ${selectedId}`}
                  {modalType === "viewAlert" && `Emergency Alert Protocol: ${selectedId}`}
                </span>
              </h3>

              <button
                type="button"
                onClick={() => {
                  setModalType(null);
                  setModalInput("");
                  setModalInputSecondary("");
                  setPhotoAttachment(null);
                }}
                className="p-1 rounded-lg hover:bg-black/5 text-[#173D32]/60 hover:text-[#173D32] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            {modalType === "completeTask" && (
              <div className="space-y-3">
                <p className="text-xs text-[#173D32]/80">
                  Document engineering findings and corrective actions taken during this field inspection.
                </p>
                <textarea
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="e.g. Upper ridge cracks inspected. Gabion mesh reinforced, retaining wall stable."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#173D32]/20 bg-white text-xs outline-none focus:ring-1 focus:ring-[#173D32]"
                />
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCompleteTask}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? "Submitting..." : "Submit Task Completion"}
                </button>
              </div>
            )}

            {modalType === "escalateTask" && (
              <div className="space-y-3">
                <p className="text-xs text-[#173D32]/80">
                  Specify urgency and justify direct escalation to Central Disaster Command.
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-[#173D32]/70 uppercase mb-1">
                    Escalation Priority
                  </label>
                  <select
                    value={modalInputSecondary || "Critical"}
                    onChange={(e) => setModalInputSecondary(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#173D32]/20 bg-white text-xs font-semibold outline-none"
                  >
                    <option value="Critical">Critical (Immediate Hazard)</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#173D32]/70 uppercase mb-1">
                    Justification
                  </label>
                  <textarea
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    placeholder="e.g. Retaining wall deflection exceeding 40mm. Heavy equipment required."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-[#173D32]/20 bg-white text-xs outline-none focus:ring-1 focus:ring-[#173D32]"
                  />
                </div>
                <button
                  type="button"
                  disabled={isSubmitting || !modalInput.trim()}
                  onClick={handleEscalateTask}
                  className="w-full py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Dispatch Escalation to Command"}
                </button>
              </div>
            )}

            {modalType === "verifyReport" && (
              <div className="space-y-3">
                <p className="text-xs text-[#173D32]/80">
                  Confirm ground truth, add field observations, and optionally attach photographic evidence.
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-[#173D32]/70 uppercase mb-1">
                    Field Notes
                  </label>
                  <textarea
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    placeholder="e.g. Ground inspected. Debris field active across 15 meters."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-[#173D32]/20 bg-white text-xs outline-none focus:ring-1 focus:ring-[#173D32]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#173D32]/70 uppercase mb-1">
                    Attach Photo Evidence
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#173D32]/20 bg-white text-xs font-semibold cursor-pointer hover:bg-black/5">
                      <Camera className="w-4 h-4 text-[#173D32]/70" />
                      <span>{photoAttachment ? "Change Photo" : "Upload Photo"}</span>
                      <input type="file" accept="image/*" onChange={handleFileAttach} className="hidden" />
                    </label>
                    {photoAttachment && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Attached</span>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleVerifyReport}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? "Submitting..." : "Verify and Save Ground Truth"}
                </button>
              </div>
            )}

            {modalType === "rejectReport" && (
              <div className="space-y-3">
                <p className="text-xs text-[#173D32]/80">
                  Provide mandatory justification for rejecting this report.
                </p>
                <textarea
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="e.g. Site inspected. Minor loose surface gravel with no slope failure risk."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#173D32]/20 bg-white text-xs outline-none focus:ring-1 focus:ring-[#173D32]"
                />
                <button
                  type="button"
                  disabled={isSubmitting || !modalInput.trim()}
                  onClick={handleRejectReport}
                  className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Rejection"}
                </button>
              </div>
            )}

            {modalType === "escalateReport" && (
              <div className="space-y-3">
                <p className="text-xs text-[#173D32]/80">
                  Directly alert Disaster Command for emergency response dispatch.
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-[#173D32]/70 uppercase mb-1">
                    Escalation Reason
                  </label>
                  <textarea
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    placeholder="e.g. Rockfall path threatens village road and power lines."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-[#173D32]/20 bg-white text-xs outline-none focus:ring-1 focus:ring-[#173D32]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#173D32]/70 uppercase mb-1">
                    Recommended Action
                  </label>
                  <input
                    type="text"
                    value={modalInputSecondary}
                    onChange={(e) => setModalInputSecondary(e.target.value)}
                    placeholder="e.g. Deploy temporary barricades and earthmovers"
                    className="w-full p-2.5 rounded-xl border border-[#173D32]/20 bg-white text-xs outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={isSubmitting || !modalInput.trim()}
                  onClick={handleEscalateReport}
                  className="w-full py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Escalate to Command"}
                </button>
              </div>
            )}

            {modalType === "updateRoad" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#173D32]/70 uppercase mb-1">
                    Road Condition
                  </label>
                  <select
                    value={roadCondition}
                    onChange={(e) => setRoadCondition(e.target.value as RoadCondition)}
                    className="w-full p-2.5 rounded-xl border border-[#173D32]/20 bg-white text-xs font-semibold outline-none"
                  >
                    <option value="Open">Open (All lanes clear)</option>
                    <option value="Caution">Caution (Slow transit / Debris on shoulder)</option>
                    <option value="Partially Blocked">Partially Blocked (Single lane alternating)</option>
                    <option value="Blocked">Blocked (Full closure)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#173D32]/70 uppercase mb-1">
                    Description & Ground Findings
                  </label>
                  <textarea
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    placeholder="e.g. Mudslide debris cleared from lane 1; wet mud remaining on shoulder."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-[#173D32]/20 bg-white text-xs outline-none focus:ring-1 focus:ring-[#173D32]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#173D32]/70 uppercase mb-1">
                    Attach Verification Photo
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#173D32]/20 bg-white text-xs font-semibold cursor-pointer hover:bg-black/5">
                    <Camera className="w-4 h-4 text-[#173D32]/70" />
                    <span>{photoAttachment ? "Photo Attached" : "Select Photo"}</span>
                    <input type="file" accept="image/*" onChange={handleFileAttach} className="hidden" />
                  </label>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting || !modalInput.trim()}
                  onClick={handleRoadUpdate}
                  className="w-full py-2.5 rounded-xl bg-[#173D32] hover:bg-[#1f4e40] text-[#F8F4EC] font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Broadcast Road Update"}
                </button>
              </div>
            )}

            {modalType === "viewTask" && selectedTaskObj && (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#173D32]/60 font-medium block">Title</span>
                  <span className="font-bold text-sm text-[#173D32]">{selectedTaskObj.title || getTaskLocation(selectedTaskObj)}</span>
                </div>
                <div>
                  <span className="text-[#173D32]/60 font-medium block">Location</span>
                  <span>{getTaskLocation(selectedTaskObj)}</span>
                  <span className="font-mono block text-[#173D32]/60">{getTaskCoordinates(selectedTaskObj)}</span>
                </div>
                <div>
                  <span className="text-[#173D32]/60 font-medium block">Risk & Priority</span>
                  <span>{selectedTaskObj.riskLevel} Risk • Priority: {selectedTaskObj.priority || selectedTaskObj.riskLevel}</span>
                </div>
                <div>
                  <span className="text-[#173D32]/60 font-medium block">Reason</span>
                  <p className="bg-white p-2.5 rounded-xl border border-[#173D32]/10">{selectedTaskObj.reason}</p>
                </div>
                {getTaskNotes(selectedTaskObj) && (
                  <div>
                    <span className="text-[#173D32]/60 font-medium block">Field Notes</span>
                    <p className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-900">{getTaskNotes(selectedTaskObj)}</p>
                  </div>
                )}
                {getTaskEscalationReason(selectedTaskObj) && (
                  <div>
                    <span className="text-[#173D32]/60 font-medium block">Escalation Justification</span>
                    <p className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-rose-900">{getTaskEscalationReason(selectedTaskObj)}</p>
                  </div>
                )}
              </div>
            )}

            {modalType === "viewReport" && selectedReportObj && (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#173D32]/60 font-medium block">Caller Name</span>
                  <span className="font-bold text-[#173D32]">{selectedReportObj.villagerName} ({selectedReportObj.contact})</span>
                </div>
                <div>
                  <span className="text-[#173D32]/60 font-medium block">Hazard</span>
                  <span>{selectedReportObj.hazardType}</span>
                </div>
                <div>
                  <span className="text-[#173D32]/60 font-medium block">Description</span>
                  <p className="bg-white p-2.5 rounded-xl border border-[#173D32]/10">{selectedReportObj.locationDescription}</p>
                </div>
                {selectedReportObj.fieldNotes && (
                  <div>
                    <span className="text-[#173D32]/60 font-medium block">Field Officer Ground Truth</span>
                    <p className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-900">{selectedReportObj.fieldNotes}</p>
                  </div>
                )}
              </div>
            )}

            {modalType === "viewAlert" && selectedAlertObj && (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#173D32]/60 font-medium block">Severity & Title</span>
                  <span className="font-bold text-sm text-[#173D32]">{selectedAlertObj.severity} — {selectedAlertObj.title}</span>
                </div>
                <div>
                  <span className="text-[#173D32]/60 font-medium block">Official Protocol Instructions</span>
                  <p className="bg-white p-2.5 rounded-xl border border-[#173D32]/10">{selectedAlertObj.instructions}</p>
                </div>
                <div>
                  <span className="text-[#173D32]/60 font-medium block">Acknowledgement Status</span>
                  <span>{selectedAlertObj.acknowledged ? `Acknowledged at ${selectedAlertObj.acknowledgedAt}` : "Pending Officer Acknowledgment"}</span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalType(null);
                  setModalInput("");
                  setModalInputSecondary("");
                  setPhotoAttachment(null);
                }}
                className="w-full py-2 rounded-xl border border-[#173D32]/20 text-[#173D32] text-xs font-semibold hover:bg-black/5 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
