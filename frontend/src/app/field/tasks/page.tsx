"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Play,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalMetricGrid from "@/components/portal/PortalMetricGrid";
import { PortalKpiCard } from "@/components/portal";
import StatusBadge from "@/components/ui/StatusBadge";
import { fieldOfficerApi } from "@/lib/api";
import type { FieldOfficerTask } from "@/types/fieldOfficer";

export default function FieldTasksPage() {
  const [tasks, setTasks] = useState<FieldOfficerTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionPending, setIsActionPending] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [riskFilter, setRiskFilter] = useState<string>("All");
  const [feedbackNotice, setFeedbackNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal states for Complete / Escalate
  const [activeModal, setActiveModal] = useState<"complete" | "escalate" | null>(null);
  const [selectedTask, setSelectedTask] = useState<FieldOfficerTask | null>(null);
  const [modalText, setModalText] = useState("");
  const [modalPriority, setModalPriority] = useState<"High" | "Critical">("Critical");

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fieldOfficerApi.getTasks({
        status: statusFilter !== "All" ? statusFilter : undefined,
        riskLevel: riskFilter !== "All" ? riskFilter : undefined,
      });
      setTasks(data || []);
    } catch (err: unknown) {
      console.warn("Tasks load note:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, riskFilter]);

  useEffect(() => {
    let mounted = true;
    fieldOfficerApi
      .getTasks({
        status: statusFilter !== "All" ? statusFilter : undefined,
        riskLevel: riskFilter !== "All" ? riskFilter : undefined,
      })
      .then((data) => {
        if (mounted) setTasks(data || []);
      })
      .catch((err) => {
        console.warn("Tasks load note:", err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [statusFilter, riskFilter]);

  const handleStartTask = async (taskId: string) => {
    setIsActionPending(true);
    setFeedbackNotice(null);
    try {
      await fieldOfficerApi.startTask(taskId);
      setFeedbackNotice({ message: `Task #${taskId} started. Inspection timer activated.`, type: "success" });
      await loadTasks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start task.";
      setFeedbackNotice({ message: msg, type: "error" });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleCompleteSubmit = async () => {
    if (!selectedTask) return;
    setIsActionPending(true);
    try {
      await fieldOfficerApi.completeTask(selectedTask.id, modalText || "Ground inspection verified clear.");
      setFeedbackNotice({ message: `Task #${selectedTask.id} marked as Completed.`, type: "success" });
      setActiveModal(null);
      setSelectedTask(null);
      setModalText("");
      await loadTasks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete task.";
      setFeedbackNotice({ message: msg, type: "error" });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleEscalateSubmit = async () => {
    if (!selectedTask) return;
    setIsActionPending(true);
    try {
      await fieldOfficerApi.escalateTask(selectedTask.id, modalText || "Active severe ground shear observed.", modalPriority);
      setFeedbackNotice({ message: `Task #${selectedTask.id} escalated to District Emergency Command.`, type: "success" });
      setActiveModal(null);
      setSelectedTask(null);
      setModalText("");
      await loadTasks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to escalate task.";
      setFeedbackNotice({ message: msg, type: "error" });
    } finally {
      setIsActionPending(false);
    }
  };

  const totalCount = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === "In_Progress").length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const escalatedCount = tasks.filter((t) => t.status === "Escalated").length;

  return (
    <PortalLayout
      allowedRoles={["field_officer", "officer", "admin"]}
      title="Field Inspection Tasks & Dispatch Queue"
      subtitle="Supervise active geotechnical reconnaissance orders, record physical ground truth observations, and escalate critical slope failures."
      headerActions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadTasks()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 hover:bg-white text-[#173D32] border border-[#173D32]/15 text-xs font-semibold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync Tasks</span>
          </button>
        </div>
      }
    >
      {/* KPI Metric Strip */}
      <PortalMetricGrid columns={4}>
        <PortalKpiCard
          title="Total Assigned Tasks"
          value={totalCount}
          detail="Assigned to your field sector"
          icon={Compass}
          accent="blue"
        />
        <PortalKpiCard
          title="In Progress"
          value={inProgressCount}
          detail="Currently underway"
          icon={Clock}
          accent="amber"
        />
        <PortalKpiCard
          title="Completed Inspections"
          value={completedCount}
          detail="Logged & verified"
          icon={CheckCircle2}
          accent="green"
        />
        <PortalKpiCard
          title="Escalated to HQ"
          value={escalatedCount}
          detail="Priority response requested"
          icon={AlertOctagon}
          accent="red"
        />
      </PortalMetricGrid>

      {/* Action Notice Banner */}
      {feedbackNotice && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 text-sm font-medium border ${
            feedbackNotice.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-red-50 text-red-900 border-red-200"
          }`}
        >
          <span>{feedbackNotice.message}</span>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="p-1 rounded-md hover:bg-black/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#173D32] uppercase tracking-wide">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#173D32]/20 text-xs font-semibold text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32]"
            >
              <option value="All">All Statuses</option>
              <option value="Assigned">Assigned</option>
              <option value="In_Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#173D32] uppercase tracking-wide">Risk Level:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#173D32]/20 text-xs font-semibold text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32]"
            >
              <option value="All">All Risk Levels</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Moderate">Moderate</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-[#173D32]/65 font-medium">
          Showing {tasks.length} task{tasks.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Task Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-[#173D32]/60 bg-white/50 border border-[#173D32]/10 rounded-2xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#173D32]/40" />
          Loading inspection queue from database...
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center text-sm text-[#173D32]/70 bg-white/50 border border-[#173D32]/10 rounded-2xl">
          <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="font-bold">No tasks matching the selected filters.</p>
          <p className="text-xs text-[#173D32]/60 mt-1">All assigned hill sectors are clear or synced.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const isAssigned = task.status === "Assigned";
            const isInProgress = task.status === "In_Progress";
            const isCompleted = task.status === "Completed";
            const isEscalated = task.status === "Escalated";

            return (
              <div
                key={task.id}
                className="bg-[#FAF8F2] border border-[#173D32]/15 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[11px] font-bold text-[#173D32]/60 uppercase tracking-wide">
                        Task #{task.id} • {task.sector}
                      </span>
                      <h3 className="text-base font-bold text-[#173D32] flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-4 h-4 text-[#D6A65D] shrink-0" />
                        <span>{task.location.chainageName}</span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          task.riskLevel === "Critical"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : task.riskLevel === "High"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {task.riskLevel}
                      </span>
                      <StatusBadge status={task.status} />
                    </div>
                  </div>

                  {/* Task Reason */}
                  <p className="text-xs text-[#173D32]/85 leading-relaxed bg-white/60 p-3 rounded-xl border border-[#173D32]/10 mb-3">
                    {task.reason}
                  </p>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#173D32]/70">
                    <div>
                      <span className="font-semibold text-[#173D32]">Assigned by:</span> {task.assignedBy}
                    </div>
                    <div>
                      <span className="font-semibold text-[#173D32]">Deadline:</span>{" "}
                      {new Date(task.deadline).toLocaleDateString()}
                    </div>
                  </div>

                  {task.completionNotes && (
                    <div className="mt-2 text-[11px] bg-emerald-50 text-emerald-900 p-2 rounded-lg border border-emerald-200">
                      <strong>Completion Notes:</strong> {task.completionNotes}
                    </div>
                  )}

                  {task.escalationReason && (
                    <div className="mt-2 text-[11px] bg-red-50 text-red-900 p-2 rounded-lg border border-red-200">
                      <strong>Escalation Reason ({task.escalationPriority || "Critical"}):</strong>{" "}
                      {task.escalationReason}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-[#173D32]/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isAssigned && (
                      <button
                        type="button"
                        onClick={() => handleStartTask(task.id)}
                        disabled={isActionPending}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Start Inspection</span>
                      </button>
                    )}

                    {isInProgress && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTask(task);
                          setActiveModal("complete");
                        }}
                        disabled={isActionPending}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete Task</span>
                      </button>
                    )}

                    {!isCompleted && !isEscalated && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTask(task);
                          setActiveModal("escalate");
                        }}
                        disabled={isActionPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Escalate</span>
                      </button>
                    )}
                  </div>

                  <Link
                    href={`/field/map`}
                    className="text-xs font-semibold text-[#173D32] hover:underline flex items-center gap-1"
                  >
                    <span>View Map</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Task Modal */}
      {activeModal === "complete" && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FAF8F2] border border-[#173D32]/20 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#173D32] mb-1">
              Complete Task #{selectedTask.id}
            </h3>
            <p className="text-xs text-[#173D32]/70 mb-4">
              {selectedTask.location.chainageName} — Record your verified ground observations.
            </p>

            <label className="block text-xs font-bold text-[#173D32] uppercase mb-1">
              Field Completion Notes:
            </label>
            <textarea
              rows={4}
              value={modalText}
              onChange={(e) => setModalText(e.target.value)}
              placeholder="e.g. Geotechnical barrier intact. Surface runoff diverted away from road toe."
              className="w-full p-3 rounded-xl bg-white border border-[#173D32]/20 text-xs text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32] mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setSelectedTask(null);
                }}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#173D32] hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteSubmit}
                disabled={isActionPending}
                className="px-5 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isActionPending ? "Saving..." : "Confirm Completion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Task Modal */}
      {activeModal === "escalate" && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FAF8F2] border border-red-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-base font-bold text-red-900 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Escalate Task #{selectedTask.id} to Emergency HQ
            </h3>
            <p className="text-xs text-[#173D32]/70 mb-4">
              Dispatches an immediate high-priority alert to the central disaster officer dashboard.
            </p>

            <label className="block text-xs font-bold text-[#173D32] uppercase mb-1">
              Escalation Priority:
            </label>
            <select
              value={modalPriority}
              onChange={(e) => setModalPriority(e.target.value as "High" | "Critical")}
              className="w-full p-2.5 rounded-xl bg-white border border-[#173D32]/20 text-xs font-semibold text-[#173D32] mb-3"
            >
              <option value="Critical">Critical (Immediate BRO/SDRF deployment required)</option>
              <option value="High">High (Advisory inspection needed within 6 hours)</option>
            </select>

            <label className="block text-xs font-bold text-[#173D32] uppercase mb-1">
              Reason for Escalation:
            </label>
            <textarea
              rows={4}
              value={modalText}
              onChange={(e) => setModalText(e.target.value)}
              placeholder="e.g. Fresh tension cracks propagating across both highway lanes. Severe rockfall hazard."
              className="w-full p-3 rounded-xl bg-white border border-[#173D32]/20 text-xs text-[#173D32] focus:outline-none focus:ring-1 focus:ring-red-600 mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setSelectedTask(null);
                }}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#173D32] hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEscalateSubmit}
                disabled={isActionPending || !modalText.trim()}
                className="px-5 py-2 rounded-full bg-red-700 hover:bg-red-800 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isActionPending ? "Escalating..." : "Confirm Escalation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
