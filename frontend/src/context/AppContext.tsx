"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, UserRole, UpdateProfilePayload } from "@/types/auth";
import { authApi, usersApi, setAuthRestorationPromise } from "@/lib/api";

export type { User, UserRole };

export interface AlertDetail {
  id: string;
  severity: "Critical" | "Warning" | "Watch";
  location: string;
  state: string;
  corridor: string;
  timestamp: string;
  description: string;
  coordinates: string;
  rainfall24h: string;
  saturation: string;
  trafficStatus: string;
  advisory: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type?: "success" | "warning" | "info" | "error";
}

interface AppContextType {
  // Auth state
  user: User | null;
  isLoadingAuth: boolean;
  isAuthModalOpen: boolean;
  authMode: "login" | "register";
  openAuthModal: (mode?: "login" | "register") => void;
  closeAuthModal: () => void;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: "citizen" | "driver";
    phone?: string;
    language?: string;
  }) => Promise<{ user: User; message: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfilePayload) => Promise<User>;
  setUser: (user: User | null) => void;

  // Report Incident Modal state
  isReportModalOpen: boolean;
  openReportModal: () => void;
  closeReportModal: () => void;

  // Alert Detail Modal state
  selectedAlert: AlertDetail | null;
  openAlertModal: (alert: AlertDetail) => void;
  closeAlertModal: () => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertDetail | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Restore session silently on initial load or refresh via HttpOnly refresh cookie
  useEffect(() => {
    let isMounted = true;

    const restorePromise = (async (): Promise<boolean> => {
      try {
        const token = await authApi.refresh();
        if (token) {
          const profile = await authApi.getMe();
          if (isMounted) {
            setUser(profile);
          }
          return true;
        } else {
          if (isMounted) {
            setUser(null);
          }
          return false;
        }
      } catch {
        // Not authenticated or refresh token expired
        if (isMounted) {
          setUser(null);
        }
        return false;
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false);
        }
        setAuthRestorationPromise(null);
      }
    })();

    setAuthRestorationPromise(restorePromise);

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: { email: string; password: string }): Promise<User> => {
    const data = await authApi.login(credentials);
    setUser(data.user);
    setIsAuthModalOpen(false);
    addToast({
      title: `Welcome, ${data.user.name}!`,
      description: `Signed in as ${data.user.role}`,
      type: "success",
    });
    return data.user;
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role: "citizen" | "driver";
    phone?: string;
    language?: string;
  }): Promise<{ user: User; message: string }> => {
    const res = await authApi.register(data);
    addToast({
      title: "Account Created",
      description: res.message || "Please check your email to verify your address.",
      type: "success",
    });
    return res;
  };

  const updateProfile = async (data: UpdateProfilePayload): Promise<User> => {
    const updatedUser = await usersApi.updateProfile(data);
    setUser(updatedUser);
    addToast({
      title: "Profile Updated",
      description: "Your account details have been saved successfully.",
      type: "success",
    });
    return updatedUser;
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      addToast({
        title: "Signed Out",
        description: "You have been logged out of Terra360.",
        type: "info",
      });
    }
  };

  const openAuthModal = (mode: "login" | "register" = "login") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => setIsAuthModalOpen(false);

  const openReportModal = () => setIsReportModalOpen(true);
  const closeReportModal = () => setIsReportModalOpen(false);

  const openAlertModal = (alert: AlertDetail) => setSelectedAlert(alert);
  const closeAlertModal = () => setSelectedAlert(null);

  return (
    <AppContext.Provider
      value={{
        user,
        isLoadingAuth,
        isAuthModalOpen,
        authMode,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        updateProfile,
        setUser,
        isReportModalOpen,
        openReportModal,
        closeReportModal,
        selectedAlert,
        openAlertModal,
        closeAlertModal,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
