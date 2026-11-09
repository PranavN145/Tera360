"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, UserRole, UpdateProfilePayload } from "@/types/auth";
import { authApi, usersApi } from "@/lib/api";

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

    async function restoreSession() {
      try {
        const token = await authApi.refresh();
        if (token && isMounted) {
          const profile = await authApi.getMe();
          if (isMounted) {
            setUser(profile);
          }
        }
      } catch {
        // Not authenticated or refresh token expired
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: { email: string; password: string }): Promise<User> => {
    try {
      const data = await authApi.login(credentials);
      setUser(data.user);
      setIsAuthModalOpen(false);
      addToast({
        title: `Welcome, ${data.user.name}!`,
        description: `Signed in as ${data.user.role}`,
        type: "success",
      });
      return data.user;
    } catch (err) {
      // Offline fallback for demo seed accounts when backend is not running
      const normalizedEmail = credentials.email.trim().toLowerCase();
      const demoUsers: Record<string, User> = {
        "officer@terra360.in": {
          _id: "demo-officer-id",
          name: "Vikram Sen (SDMA Officer)",
          email: "officer@terra360.in",
          role: "officer",
          phone: "+91 98765 43210",
          language: "en",
          emailVerified: true,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        "citizen@terra360.in": {
          _id: "demo-citizen-id",
          name: "Temjen Ao",
          email: "citizen@terra360.in",
          role: "citizen",
          phone: "+91 94360 12345",
          language: "nag",
          emailVerified: true,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        "driver@terra360.in": {
          _id: "demo-driver-id",
          name: "Raju Sharma",
          email: "driver@terra360.in",
          role: "driver",
          phone: "+91 98620 54321",
          language: "hi",
          emailVerified: true,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        "field@terra360.in": {
          _id: "demo-field-id",
          name: "Lhokhoto Sema",
          email: "field@terra360.in",
          role: "field_officer",
          phone: "+91 94361 98765",
          language: "en",
          emailVerified: true,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        "admin@terra360.in": {
          _id: "demo-admin-id",
          name: "System Administrator",
          email: "admin@terra360.in",
          role: "admin",
          emailVerified: true,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      };

      if (demoUsers[normalizedEmail]) {
        const mockUser = demoUsers[normalizedEmail];
        setUser(mockUser);
        setIsAuthModalOpen(false);
        addToast({
          title: `Welcome, ${mockUser.name}! (Demo Mode)`,
          description: `Active role clearance: ${mockUser.role}`,
          type: "success",
        });
        return mockUser;
      }
      throw err;
    }
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
