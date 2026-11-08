"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useApp } from "@/context/AppContext";
import { usersApi, ApiClientError, getRolePortalPath } from "@/lib/api";
import { UserSession } from "@/types/auth";

type ActiveTab = "profile" | "password" | "sessions" | "privacy";

function AccountDashboard() {
  const router = useRouter();
  const { user, updateProfile, logout, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");

  // Profile Form States
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [language, setLanguage] = useState<"en" | "as" | "bn" | "hi" | "mni" | "lus">(
    (user?.language as any) || "en"
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string[]>>({});

  // Sync profile state when user updates
  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || "");
      if (user.language) setLanguage(user.language as any);
    }
  }, [user]);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string[]>>({});

  // Sessions States
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsErrorMsg, setSessionsErrorMsg] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  // Privacy / Delete States
  const [isExporting, setIsExporting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch sessions on tab switch
  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    setSessionsErrorMsg(null);
    try {
      const data = await usersApi.getSessions();
      setSessions(data);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setSessionsErrorMsg(err.message);
      } else {
        setSessionsErrorMsg("Unable to load active sessions.");
      }
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "sessions") {
      loadSessions();
    }
  }, [activeTab, loadSessions]);

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;

    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);
    setProfileFieldErrors({});

    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        language,
      });
      setProfileSuccessMsg("Profile details updated successfully.");
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setProfileErrorMsg(err.message);
        if (err.fields) setProfileFieldErrors(err.fields);
      } else if (err instanceof Error) {
        setProfileErrorMsg(err.message);
      } else {
        setProfileErrorMsg("Failed to update profile. Please try again.");
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Update
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdatingPassword) return;

    if (newPassword.length < 8) {
      setPasswordErrorMsg("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg("New password and confirmation do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);
    setPasswordFieldErrors({});

    try {
      const res = await usersApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPasswordSuccessMsg(
        res.message || "Password updated successfully. Other active sessions have been signed out."
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setPasswordErrorMsg(err.message);
        if (err.fields) setPasswordFieldErrors(err.fields);
      } else if (err instanceof Error) {
        setPasswordErrorMsg(err.message);
      } else {
        setPasswordErrorMsg("Failed to update password. Please check your current password.");
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle Session Revoke
  const handleRevokeSession = async (session: UserSession) => {
    if (session.isCurrent) {
      if (!window.confirm("Revoking your current session will log you out of this browser. Continue?")) {
        return;
      }
      await logout();
      router.push("/login");
      return;
    }

    setRevokingSessionId(session.id);
    try {
      await usersApi.revokeSession(session.id);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      addToast({
        title: "Session Revoked",
        description: `Terminated session from ${session.ip}`,
        type: "info",
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        addToast({ title: "Revocation Failed", description: err.message, type: "error" });
      } else {
        addToast({ title: "Revocation Failed", description: "Could not revoke session", type: "error" });
      }
    } finally {
      setRevokingSessionId(null);
    }
  };

  // Handle Data Export Download
  const handleExportData = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await usersApi.downloadExportFile();
      addToast({
        title: "Data Export Downloaded",
        description: "Your personal account data has been safely exported to JSON.",
        type: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : "Failed to download export file";
      addToast({ title: "Export Failed", description: msg, type: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDeletingAccount) return;

    if (deleteConfirmText !== "DELETE") {
      setDeleteErrorMsg("Confirmation text must match DELETE exactly.");
      return;
    }

    setIsDeletingAccount(true);
    setDeleteErrorMsg(null);

    try {
      await usersApi.deleteAccount("DELETE");
      setShowDeleteModal(false);
      await logout();
      router.push("/");
      addToast({
        title: "Account Deleted",
        description: "Your account and personal data have been permanently deactivated.",
        type: "info",
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setDeleteErrorMsg(err.message);
      } else {
        setDeleteErrorMsg("Account deletion failed. Please verify confirmation text.");
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const portalPath = getRolePortalPath(user?.role);

  return (
    <div className="min-h-[85vh] bg-[#FAF8F2] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-[#173D32]">
      <div className="max-w-4xl mx-auto">
        {/* Account Header Banner */}
        <div className="bg-[#F6F4EC] border border-[#173D32]/15 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#173D32] text-[#F6F4EC] flex items-center justify-center text-2xl font-black shadow-sm">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#DCE8D4] text-[#173D32] text-[11px] font-bold uppercase tracking-wider">
                    {user?.role?.replace("_", " ")}
                  </span>
                  {user?.emailVerified ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                      <span>✓</span> Verified Email
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                      Verification Pending
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#173D32]">
                  {user?.name}
                </h1>
                <p className="text-xs sm:text-sm text-[#173D32]/70">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={portalPath}
                className="px-4 py-2 rounded-full border border-[#173D32]/25 text-[#173D32] text-xs font-bold hover:bg-[#173D32]/5 transition-colors"
              >
                Go to Role Portal →
              </Link>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-[#173D32]/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                : "bg-[#F6F4EC] text-[#173D32]/70 hover:text-[#173D32] border border-[#173D32]/10"
            }`}
          >
            👤 Profile & Preferences
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("password")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "password"
                ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                : "bg-[#F6F4EC] text-[#173D32]/70 hover:text-[#173D32] border border-[#173D32]/10"
            }`}
          >
            🔒 Password & Security
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "sessions"
                ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                : "bg-[#F6F4EC] text-[#173D32]/70 hover:text-[#173D32] border border-[#173D32]/10"
            }`}
          >
            💻 Active Sessions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "privacy"
                ? "bg-[#173D32] text-[#F6F4EC] shadow-xs"
                : "bg-[#F6F4EC] text-[#173D32]/70 hover:text-[#173D32] border border-[#173D32]/10"
            }`}
          >
            🛡️ Data & Privacy
          </button>
        </div>

        {/* Tab 1: Profile & Preferences */}
        {activeTab === "profile" && (
          <div className="bg-[#F6F4EC] border border-[#173D32]/15 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="mb-6 pb-4 border-b border-[#173D32]/10">
              <h2 className="text-lg font-bold text-[#173D32]">Profile Information</h2>
              <p className="text-xs text-[#173D32]/70 mt-0.5">
                Manage your public name, emergency contact phone, and preferred telemetry language.
              </p>
            </div>

            {profileSuccessMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-center gap-2">
                <span className="font-bold">✓</span> {profileSuccessMsg}
              </div>
            )}

            {profileErrorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 flex items-center gap-2">
                <span className="font-bold">!</span> {profileErrorMsg}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
              {/* Full Name (Editable) */}
              <div>
                <label htmlFor="acc-name" className="block text-xs font-bold uppercase tracking-wide mb-1.5">
                  Full Name
                </label>
                <input
                  id="acc-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSavingProfile}
                  className="w-full h-11 px-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                />
                {profileFieldErrors.name && (
                  <p className="text-[11px] text-red-600 mt-1">{profileFieldErrors.name.join(", ")}</p>
                )}
              </div>

              {/* Email Address (Protected, Read-Only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="acc-email" className="block text-xs font-bold uppercase tracking-wide">
                    Email Address
                  </label>
                  <span className="text-[10px] font-semibold text-[#173D32]/60 uppercase tracking-wider flex items-center gap-1">
                    🔒 Protected Field
                  </span>
                </div>
                <input
                  id="acc-email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  readOnly
                  className="w-full h-11 px-4 rounded-xl bg-[#173D32]/5 border border-[#173D32]/10 text-sm text-[#173D32]/70 cursor-not-allowed select-none"
                />
                <p className="text-[11px] text-[#173D32]/60 mt-1">
                  Email address serves as your primary security identifier and cannot be modified directly.
                </p>
              </div>

              {/* Assigned Role (Protected, Read-Only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="acc-role" className="block text-xs font-bold uppercase tracking-wide">
                    Assigned Clearance Role
                  </label>
                  <span className="text-[10px] font-semibold text-[#173D32]/60 uppercase tracking-wider flex items-center gap-1">
                    🔒 Protected Field
                  </span>
                </div>
                <input
                  id="acc-role"
                  type="text"
                  value={user?.role?.toUpperCase() || "CITIZEN"}
                  disabled
                  readOnly
                  className="w-full h-11 px-4 rounded-xl bg-[#173D32]/5 border border-[#173D32]/10 text-sm font-bold text-[#173D32]/70 cursor-not-allowed select-none"
                />
                <p className="text-[11px] text-[#173D32]/60 mt-1">
                  Role clearances are provisioned by disaster operations administrators.
                </p>
              </div>

              {/* Phone Number (Editable) */}
              <div>
                <label htmlFor="acc-phone" className="block text-xs font-bold uppercase tracking-wide mb-1.5">
                  Contact Phone Number <span className="font-normal lowercase text-[#173D32]/60">(optional)</span>
                </label>
                <input
                  id="acc-phone"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSavingProfile}
                  className="w-full h-11 px-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                />
                {profileFieldErrors.phone && (
                  <p className="text-[11px] text-red-600 mt-1">{profileFieldErrors.phone.join(", ")}</p>
                )}
              </div>

              {/* Preferred Language (Editable) */}
              <div>
                <label htmlFor="acc-language" className="block text-xs font-bold uppercase tracking-wide mb-1.5">
                  Preferred Regional Language
                </label>
                <select
                  id="acc-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  disabled={isSavingProfile}
                  className="w-full h-11 px-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60 cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="as">অসমীয়া (Assamese)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="mni">মৈতৈলোন্ (Manipuri)</option>
                  <option value="lus">Mizo ṭawng (Lushai)</option>
                </select>
                {profileFieldErrors.language && (
                  <p className="text-[11px] text-red-600 mt-1">{profileFieldErrors.language.join(", ")}</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSavingProfile ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#F6F4EC]/30 border-t-[#F6F4EC] rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === "password" && (
          <div className="bg-[#F6F4EC] border border-[#173D32]/15 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="mb-6 pb-4 border-b border-[#173D32]/10">
              <h2 className="text-lg font-bold text-[#173D32]">Change Password</h2>
              <p className="text-xs text-[#173D32]/70 mt-0.5">
                Ensure your account uses a strong password of at least 8 characters.
              </p>
            </div>

            {passwordSuccessMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-center gap-2">
                <span className="font-bold">✓</span> {passwordSuccessMsg}
              </div>
            )}

            {passwordErrorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 flex items-center gap-2">
                <span className="font-bold">!</span> {passwordErrorMsg}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 max-w-md">
              <div>
                <label htmlFor="cur-pass" className="block text-xs font-bold uppercase tracking-wide mb-1.5">
                  Current Password
                </label>
                <input
                  id="cur-pass"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={isUpdatingPassword}
                  className="w-full h-11 px-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                />
                {passwordFieldErrors.currentPassword && (
                  <p className="text-[11px] text-red-600 mt-1">{passwordFieldErrors.currentPassword.join(", ")}</p>
                )}
              </div>

              <div>
                <label htmlFor="new-pass" className="block text-xs font-bold uppercase tracking-wide mb-1.5">
                  New Password (min 8 characters)
                </label>
                <input
                  id="new-pass"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={isUpdatingPassword}
                  className="w-full h-11 px-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                />
                {passwordFieldErrors.newPassword && (
                  <p className="text-[11px] text-red-600 mt-1">{passwordFieldErrors.newPassword.join(", ")}</p>
                )}
              </div>

              <div>
                <label htmlFor="conf-pass" className="block text-xs font-bold uppercase tracking-wide mb-1.5">
                  Confirm New Password
                </label>
                <input
                  id="conf-pass"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={isUpdatingPassword}
                  className="w-full h-11 px-4 rounded-xl bg-[#FAF8F2] border border-[#173D32]/20 text-sm text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] disabled:opacity-60"
                />
                {passwordFieldErrors.confirmPassword && (
                  <p className="text-[11px] text-red-600 mt-1">{passwordFieldErrors.confirmPassword.join(", ")}</p>
                )}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                <strong>Security Policy:</strong> Updating your password revokes all other active sessions and devices immediately.
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-6 py-2.5 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isUpdatingPassword ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#F6F4EC]/30 border-t-[#F6F4EC] rounded-full animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Active Sessions */}
        {activeTab === "sessions" && (
          <div className="bg-[#F6F4EC] border border-[#173D32]/15 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-[#173D32]/10">
              <div>
                <h2 className="text-lg font-bold text-[#173D32]">Active Sessions</h2>
                <p className="text-xs text-[#173D32]/70 mt-0.5">
                  Manage devices and browsers currently signed in to your account.
                </p>
              </div>
              <button
                type="button"
                onClick={loadSessions}
                disabled={isLoadingSessions}
                className="px-3.5 py-1.5 rounded-full border border-[#173D32]/20 text-xs font-semibold hover:bg-[#173D32]/5 transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-50"
              >
                Refresh List
              </button>
            </div>

            {sessionsErrorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 flex items-center gap-2">
                <span className="font-bold">!</span> {sessionsErrorMsg}
              </div>
            )}

            {isLoadingSessions ? (
              <div className="py-12 text-center flex flex-col items-center">
                <div className="w-8 h-8 border-2 border-[#173D32]/20 border-t-[#173D32] rounded-full animate-spin mb-3" />
                <span className="text-xs text-[#173D32]/70">Retrieving active session telemetry...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#173D32]/70">
                No active sessions found.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F6F4EC] border border-[#173D32]/15 flex items-center justify-center text-lg shrink-0 mt-0.5">
                        {sess.userAgent.toLowerCase().includes("mobile") ? "📱" : "💻"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-[#173D32]">
                            {sess.userAgent}
                          </span>
                          {sess.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Current Session
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#173D32]/60 mt-0.5 flex flex-wrap gap-x-3">
                          <span>IP: {sess.ip}</span>
                          <span>Signed in: {new Date(sess.createdAt).toLocaleString()}</span>
                          <span>Expires: {new Date(sess.expiresAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={revokingSessionId === sess.id}
                      onClick={() => handleRevokeSession(sess)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer self-start sm:self-center shrink-0 ${
                        sess.isCurrent
                          ? "border border-red-300 text-red-700 hover:bg-red-50"
                          : "border border-[#173D32]/20 text-[#173D32] hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                      } disabled:opacity-50`}
                    >
                      {revokingSessionId === sess.id ? "Revoking..." : sess.isCurrent ? "Sign Out" : "Revoke Session"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Data & Privacy */}
        {activeTab === "privacy" && (
          <div className="flex flex-col gap-6">
            {/* Export Card */}
            <div className="bg-[#F6F4EC] border border-[#173D32]/15 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-[#173D32]">Export Personal Data</h2>
                <p className="text-xs text-[#173D32]/70 mt-0.5">
                  Per data protection guidelines, download an authenticated archive of your personal account profile, contact details, and submitted hazard reports in JSON format.
                </p>
              </div>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportData}
                className="px-5 py-2.5 rounded-full bg-[#173D32] hover:bg-[#1f4e40] text-[#F6F4EC] text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isExporting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#F6F4EC]/30 border-t-[#F6F4EC] rounded-full animate-spin" />
                    <span>Preparing Data Archive...</span>
                  </>
                ) : (
                  <>
                    <span>📥</span> Download Data Archive (JSON)
                  </>
                )}
              </button>
            </div>

            {/* Danger Zone: Account Deletion */}
            <div className="bg-red-50/50 border border-red-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="mb-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Danger Zone
                </div>
                <h2 className="text-lg font-bold text-red-900">Delete Account</h2>
                <p className="text-xs text-red-800/80 mt-0.5 max-w-xl leading-relaxed">
                  Permanently deactivate your Terra360 account and revoke all active authentication sessions. This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(true);
                  setDeleteConfirmText("");
                  setDeleteErrorMsg(null);
                }}
                className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                Deactivate & Delete Account
              </button>
            </div>
          </div>
        )}

        {/* Account Deletion Confirmation Modal */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md bg-[#FAF8F2] border border-red-300 rounded-3xl p-6 sm:p-8 shadow-2xl text-[#173D32]">
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
                  ⚠️
                </div>
                <h3 className="text-lg font-extrabold text-red-950">
                  Confirm Account Deletion
                </h3>
                <p className="text-xs text-[#173D32]/70 mt-1 leading-relaxed">
                  This will permanently invalidate your credentials and sign you out across all platforms.
                </p>
              </div>

              {deleteErrorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-100 border border-red-200 text-xs text-red-800">
                  {deleteErrorMsg}
                </div>
              )}

              <form onSubmit={handleDeleteAccount} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="confirm-del-input" className="block text-xs font-bold text-[#173D32] mb-1.5">
                    Type <span className="font-mono bg-red-100 px-1 py-0.5 rounded text-red-800">DELETE</span> to confirm:
                  </label>
                  <input
                    id="confirm-del-input"
                    type="text"
                    placeholder="DELETE"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    required
                    disabled={isDeletingAccount}
                    className="w-full h-11 px-4 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-sm font-mono text-[#173D32] focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-60"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isDeletingAccount}
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-2.5 rounded-full border border-[#173D32]/20 text-[#173D32] text-xs font-bold hover:bg-[#173D32]/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDeletingAccount || deleteConfirmText !== "DELETE"}
                    className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isDeletingAccount ? "Deleting..." : "Confirm Deletion"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <AccountDashboard />
    </ProtectedRoute>
  );
}

