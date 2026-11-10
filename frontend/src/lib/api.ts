import {
  ApiResponse,
  AuthSuccessData,
  RegisterSuccessData,
  RefreshSuccessData,
  UserProfileSuccessData,
  MessageSuccessData,
  User,
  UserSession,
  SessionsSuccessData,
  UpdateProfilePayload,
  ChangePasswordPayload,
  UserExportData,
} from '@/types/auth';
import {
  PublicRiskMapItem,
  PublicAlertItem,
  PublicRoadStatusItem,
  PublicStats,
  PublicPagination,
  PublicAlertsResponse,
  CreateHazardReportPayload,
  HazardReportOutput,
  CreateContactPayload,
  ContactOutput,
} from '@/types/public';
import type {
  FieldOfficerProfile,
  FieldOfficerTask,
  VillagerReportItem,
  RoadStatusSegment,
  SectorAlertItem,
  FieldOfficerMapData,
  RoadCondition,
} from '@/types/fieldOfficer';
import { demoDataManager } from '@/data/demoDataManager';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export class ApiClientError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string[]>;

  constructor(
    message: string,
    code = 'API_ERROR',
    status = 500,
    fields?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

// Strictly in-memory access token storage
let inMemoryAccessToken: string | null = null;
let lastRefreshedAt = 0;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
  if (token) {
    lastRefreshedAt = Date.now();
  }
}

// Global Auth Restoration Coordinator: ensures API requests pause while initial session restore is running
let authRestorationPromise: Promise<boolean> | null = null;

export function setAuthRestorationPromise(promise: Promise<boolean> | null): void {
  authRestorationPromise = promise;
}

export async function waitForAuthRestoration(): Promise<boolean> {
  if (authRestorationPromise) {
    try {
      return await authRestorationPromise;
    } catch {
      return false;
    }
  }
  return false;
}

// Single-flight refresh mutex to prevent duplicate concurrent refresh calls within runtime
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  // If a refresh request is already in-flight, return the existing promise so all callers wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  // If token was refreshed within the last 2 seconds and exists, reuse it to prevent redundant rotation
  if (inMemoryAccessToken && Date.now() - lastRefreshedAt < 2000) {
    return inMemoryAccessToken;
  }

  const executeRefresh = async (): Promise<string | null> => {
    try {
      const fallbackToken =
        typeof window !== 'undefined'
          ? localStorage.getItem('terra360_refresh_token')
          : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (fallbackToken) {
        headers['x-refresh-token'] = fallbackToken;
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers,
        body: fallbackToken ? JSON.stringify({ refreshToken: fallbackToken }) : undefined,
        credentials: 'include',
      });

      if (!res.ok) {
        // Backend returned non-200. Check if active demo session is present in offline development mode
        const activeDemo = demoDataManager.getActiveDemoUser();
        if (activeDemo) {
          const offlineToken = 'demo-offline-token';
          setAccessToken(offlineToken);
          return offlineToken;
        }
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('terra360_refresh_token');
          localStorage.removeItem('terra360_has_session');
        }
        return null;
      }

      const json: ApiResponse<RefreshSuccessData> = await res.json();
      if (json.success && json.data?.accessToken) {
        demoDataManager.markBackendOffline(false);
        setAccessToken(json.data.accessToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('terra360_has_session', 'true');
          if (json.data.refreshToken) {
            localStorage.setItem('terra360_refresh_token', json.data.refreshToken);
          }
        }
        return json.data.accessToken;
      }

      setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('terra360_refresh_token');
        localStorage.removeItem('terra360_has_session');
      }
      return null;
    } catch {
      // Backend unreachable (network failure / connection refused)
      demoDataManager.markBackendOffline(true);
      const activeDemo = demoDataManager.getActiveDemoUser();
      if (activeDemo) {
        const offlineToken = 'demo-offline-token';
        setAccessToken(offlineToken);
        return offlineToken;
      }
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  };

  // Cross-tab single-flight serialization via Web Locks API if supported in browser environment
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    refreshPromise = (async () => {
      const result = await navigator.locks.request('terra360_auth_refresh', executeRefresh);
      return (result as unknown as string) || null;
    })();
  } else {
    refreshPromise = executeRefresh();
  }

  return refreshPromise;
}

export interface RequestOptions extends RequestInit {
  retryOnAuthError?: boolean;
}

export interface RawApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: PublicPagination;
  error?: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export async function rawApiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<RawApiResponse<T>> {
  const { retryOnAuthError = true, headers: customHeaders, ...restOptions } = options;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const isAuthEndpoint = endpoint.includes('/api/v1/auth/');
  const isPublicEndpoint = endpoint.includes('/api/v1/public/');

  // If this is a protected request, inMemoryAccessToken is null, and session restoration is in flight,
  // pause and wait for restoration before firing the request!
  if (!isAuthEndpoint && !isPublicEndpoint && !inMemoryAccessToken && authRestorationPromise) {
    await waitForAuthRestoration();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (inMemoryAccessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
  }

  const fetchOptions: RequestInit = {
    ...restOptions,
    headers,
    credentials: 'include',
  };

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
    // Connection established successfully
    demoDataManager.markBackendOffline(false);
  } catch (err: unknown) {
    demoDataManager.markBackendOffline(true);
    const message = err instanceof Error ? err.message : 'Network connection failure';
    throw new ApiClientError(
      `Unable to reach server. Please check your connection. (${message})`,
      'NETWORK_ERROR',
      0
    );
  }

  // Handle 401 Unauthorized with token refresh (once)
  if (response.status === 401 && retryOnAuthError && !isAuthEndpoint) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      try {
        response = await fetch(url, {
          ...fetchOptions,
          headers,
        });
      } catch (err: unknown) {
        demoDataManager.markBackendOffline(true);
        const message = err instanceof Error ? err.message : 'Network error during retry';
        throw new ApiClientError(message, 'NETWORK_ERROR', 0);
      }
    }
  }

  let json: RawApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    throw new ApiClientError(
      `Unexpected server response (${response.status})`,
      'PARSE_ERROR',
      response.status
    );
  }

  if (!response.ok || !json.success) {
    const code = json.error?.code || `HTTP_${response.status}`;
    const message = json.error?.message || response.statusText || 'Request failed';
    const fields = json.error?.fields;
    throw new ApiClientError(message, code, response.status, fields);
  }

  return json;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const json = await rawApiRequest<T>(endpoint, options);
  return json.data as T;
}

export const authApi = {
  async register(data: {
    name: string;
    email: string;
    password: string;
    role: 'citizen' | 'driver';
    phone?: string;
    language?: string;
  }): Promise<RegisterSuccessData> {
    try {
      return await apiClient<RegisterSuccessData>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
        retryOnAuthError: false,
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        const newUser: User = {
          _id: `demo-user-${Date.now()}`,
          name: data.name,
          email: data.email,
          role: data.role,
          phone: data.phone,
          language: data.language || 'en',
          emailVerified: true,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        demoDataManager.setActiveDemoUser(newUser);
        return {
          user: newUser,
          message: 'Account registered in Development Mode (Verification bypassed).',
        };
      }
      throw err;
    }
  },

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<AuthSuccessData> {
    try {
      const data = await apiClient<AuthSuccessData>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        retryOnAuthError: false,
      });
      if (data.accessToken) {
        setAccessToken(data.accessToken);
      }
      demoDataManager.setActiveDemoUser(data.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('terra360_has_session', 'true');
        if (data.refreshToken) {
          localStorage.setItem('terra360_refresh_token', data.refreshToken);
        }
      }
      return data;
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        const demoUser = demoDataManager.findDemoUserByEmail(credentials.email);
        if (demoUser) {
          const offlineToken = 'demo-offline-token';
          setAccessToken(offlineToken);
          demoDataManager.setActiveDemoUser(demoUser);
          if (typeof window !== 'undefined') {
            localStorage.setItem('terra360_has_session', 'true');
          }
          return {
            user: demoUser,
            accessToken: offlineToken,
          };
        }
        throw new ApiClientError(
          'Account not found in demo records. Please sign in with one of the predefined demo accounts.',
          'INVALID_CREDENTIALS',
          401
        );
      }
      throw err;
    }
  },

  async refresh(): Promise<string | null> {
    return refreshAccessToken();
  },

  async logout(): Promise<MessageSuccessData> {
    try {
      const fallbackToken =
        typeof window !== 'undefined'
          ? localStorage.getItem('terra360_refresh_token')
          : null;
      return await apiClient<MessageSuccessData>('/api/v1/auth/logout', {
        method: 'POST',
        headers: fallbackToken ? { 'x-refresh-token': fallbackToken } : undefined,
        body: fallbackToken ? JSON.stringify({ refreshToken: fallbackToken }) : undefined,
        retryOnAuthError: false,
      });
    } catch {
      return { message: 'Signed out successfully.' };
    } finally {
      demoDataManager.setActiveDemoUser(null);
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('terra360_refresh_token');
        localStorage.removeItem('terra360_has_session');
      }
    }
  },

  async getMe(): Promise<User> {
    try {
      const data = await apiClient<UserProfileSuccessData>('/api/v1/users/me', {
        method: 'GET',
      });
      return data.user;
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        const activeDemo = demoDataManager.getActiveDemoUser();
        if (activeDemo) return activeDemo;
        throw new ApiClientError('Not authenticated', 'UNAUTHENTICATED', 401);
      }
      throw err;
    }
  },

  async verifyEmail(token: string): Promise<MessageSuccessData> {
    try {
      return await apiClient<MessageSuccessData>('/api/v1/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
        retryOnAuthError: false,
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return { message: 'Email address verified successfully (Demo Mode).' };
      }
      throw err;
    }
  },

  async forgotPassword(email: string): Promise<MessageSuccessData> {
    try {
      return await apiClient<MessageSuccessData>('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        retryOnAuthError: false,
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return { message: 'Password recovery email dispatched (Demo Mode).' };
      }
      throw err;
    }
  },

  async resetPassword(token: string, password: string): Promise<MessageSuccessData> {
    try {
      return await apiClient<MessageSuccessData>('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
        retryOnAuthError: false,
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return { message: 'Your password has been successfully reset (Demo Mode).' };
      }
      throw err;
    }
  },
};

export const usersApi = {
  /**
   * 1. GET /api/v1/users/me
   * Fetches current authenticated user profile
   */
  async getMe(): Promise<User> {
    try {
      const data = await apiClient<UserProfileSuccessData>('/api/v1/users/me', {
        method: 'GET',
      });
      return data.user;
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        const activeDemo = demoDataManager.getActiveDemoUser();
        if (activeDemo) return activeDemo;
        throw new ApiClientError('Not authenticated', 'UNAUTHENTICATED', 401);
      }
      throw err;
    }
  },

  /**
   * 2. PATCH /api/v1/users/me
   * Updates permitted profile fields
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    try {
      const data = await apiClient<UserProfileSuccessData>('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      demoDataManager.setActiveDemoUser(data.user);
      return data.user;
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return demoDataManager.updateDemoProfile(payload);
      }
      throw err;
    }
  },

  /**
   * 3. PATCH /api/v1/users/me/password
   * Updates password with verification of current password
   */
  async changePassword(payload: ChangePasswordPayload): Promise<MessageSuccessData> {
    try {
      return await apiClient<MessageSuccessData>('/api/v1/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return demoDataManager.changeDemoPassword(payload);
      }
      throw err;
    }
  },

  /**
   * 4. GET /api/v1/users/me/sessions
   * Lists active sessions with device & IP info
   */
  async getSessions(): Promise<UserSession[]> {
    try {
      const data = await apiClient<SessionsSuccessData>('/api/v1/users/me/sessions', {
        method: 'GET',
      });
      return data.sessions || [];
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return demoDataManager.getDemoSessions();
      }
      throw err;
    }
  },

  /**
   * 5. DELETE /api/v1/users/me/sessions/:id
   * Revokes an individual session
   */
  async revokeSession(sessionId: string): Promise<MessageSuccessData> {
    try {
      return await apiClient<MessageSuccessData>(`/api/v1/users/me/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return demoDataManager.revokeDemoSession(sessionId);
      }
      throw err;
    }
  },

  /**
   * 6. GET /api/v1/users/me/export
   * Initiates export of user's personal data
   */
  async exportData(): Promise<UserExportData> {
    try {
      return await apiClient<UserExportData>('/api/v1/users/me/export', {
        method: 'GET',
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return demoDataManager.exportDemoData();
      }
      throw err;
    }
  },

  /**
   * Safe download trigger helper that fetches raw blob and initiates browser download
   */
  async downloadExportFile(): Promise<void> {
    const url = `${API_BASE_URL}/api/v1/users/me/export`;
    const token = getAccessToken();

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Server export request failed');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `terra360-account-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      // Offline fallback: generate export directly from local demo storage
      demoDataManager.markBackendOffline(true);
      const exportData = demoDataManager.exportDemoData();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `terra360-demo-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }
  },

  /**
   * 7. DELETE /api/v1/users/me
   * Deactivates and deletes user account
   */
  async deleteAccount(confirmationText: string): Promise<MessageSuccessData> {
    try {
      return await apiClient<MessageSuccessData>('/api/v1/users/me', {
        method: 'DELETE',
        body: JSON.stringify({ confirmationText }),
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return demoDataManager.deleteDemoAccount();
      }
      throw err;
    } finally {
      setAccessToken(null);
    }
  },
};

export const publicApi = {
  /**
   * 1. GET /api/v1/public/risk-map
   * Returns road corridors with coordinates and risk level for map visualization.
   */
  async getRiskMap(query?: { state?: string }): Promise<PublicRiskMapItem[]> {
    try {
      const params = new URLSearchParams();
      if (query?.state && query.state !== 'All' && query.state !== 'All States') {
        params.set('state', query.state);
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      return await apiClient<PublicRiskMapItem[]>(`/api/v1/public/risk-map${qs}`, {
        method: 'GET',
        retryOnAuthError: false,
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return demoDataManager.getDemoRiskMap(query);
      }
      throw err;
    }
  },

  /**
   * 2. GET /api/v1/public/alerts
   * Returns published alerts with pagination.
   */
  async getAlerts(query?: {
    state?: string;
    severity?: string;
    page?: number;
    limit?: number;
  }): Promise<PublicAlertsResponse> {
    try {
      const params = new URLSearchParams();
      if (query?.state && query.state !== 'All' && query.state !== 'All States') {
        params.set('state', query.state);
      }
      if (query?.severity && query.severity !== 'All') {
        params.set('severity', query.severity);
      }
      if (query?.page) {
        params.set('page', String(query.page));
      }
      if (query?.limit) {
        params.set('limit', String(query.limit));
      }
      const qs = params.toString() ? `?${params.toString()}` : '';

      const res = await rawApiRequest<PublicAlertItem[]>(`/api/v1/public/alerts${qs}`, {
        method: 'GET',
        retryOnAuthError: false,
      });

      return {
        alerts: res.data || [],
        pagination: res.pagination || {
          total: res.data?.length || 0,
          page: query?.page || 1,
          limit: query?.limit || 20,
          totalPages: 1,
        },
      };
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return demoDataManager.filterAlerts(query);
      }
      throw err;
    }
  },

  /**
   * 3. GET /api/v1/public/road-status
   * Returns highway / corridor clearance status.
   */
  async getRoadStatus(query?: {
    state?: string;
    status?: string;
  }): Promise<PublicRoadStatusItem[]> {
    try {
      const params = new URLSearchParams();
      if (query?.state && query.state !== 'All' && query.state !== 'All States') {
        params.set('state', query.state);
      }
      if (query?.status && query.status !== 'All') {
        params.set('status', query.status.toLowerCase());
      }
      const qs = params.toString() ? `?${params.toString()}` : '';

      return await apiClient<PublicRoadStatusItem[]>(`/api/v1/public/road-status${qs}`, {
        method: 'GET',
        retryOnAuthError: false,
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return demoDataManager.filterRoads(query);
      }
      throw err;
    }
  },

  /**
   * 4. GET /api/v1/public/stats
   * Returns live operational stats.
   */
  async getStats(): Promise<PublicStats> {
    try {
      return await apiClient<PublicStats>('/api/v1/public/stats', {
        method: 'GET',
        retryOnAuthError: false,
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return demoDataManager.getDemoStats();
      }
      throw err;
    }
  },

  /**
   * 5. POST /api/v1/reports/public
   * Submits a public landslide/hazard report.
   */
  async submitHazardReport(
    payload: CreateHazardReportPayload
  ): Promise<HazardReportOutput> {
    try {
      return await apiClient<HazardReportOutput>('/api/v1/reports/public', {
        method: 'POST',
        body: JSON.stringify(payload),
        retryOnAuthError: false,
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return demoDataManager.addDemoReport(payload);
      }
      throw err;
    }
  },

  /**
   * 6. POST /api/v1/contact
   * Submits a public inquiry or message to the operations desk.
   */
  async submitContact(
    payload: CreateContactPayload
  ): Promise<{ contact: ContactOutput; message: string }> {
    try {
      const res = await rawApiRequest<ContactOutput>('/api/v1/contact', {
        method: 'POST',
        body: JSON.stringify(payload),
        retryOnAuthError: false,
      });
      return {
        contact: res.data as ContactOutput,
        message: res.message || 'Your message has been received. Our operations desk will get in touch shortly.',
      };
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return demoDataManager.addDemoContact(payload);
      }
      throw err;
    }
  },
};

export const reportsApi = {
  /**
   * GET /api/v1/reports/my
   * List hazard reports submitted by the authenticated citizen.
   */
  async getMyReports(): Promise<HazardReportOutput[]> {
    try {
      return await apiClient<HazardReportOutput[]>('/api/v1/reports/my', {
        method: 'GET',
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return demoDataManager.getMyDemoReports();
      }
      throw err;
    }
  },

  /**
   * GET /api/v1/reports
   * List hazard reports for operational officers and emergency desks.
   */
  async getReports(query?: {
    state?: string;
    status?: string;
    limit?: number;
  }): Promise<HazardReportOutput[]> {
    try {
      const params = new URLSearchParams();
      if (query?.state && query.state !== 'All' && query.state !== 'All States') {
        params.set('state', query.state);
      }
      if (query?.status && query.status !== 'All') {
        params.set('status', query.status);
      }
      if (query?.limit) {
        params.set('limit', String(query.limit));
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      return await apiClient<HazardReportOutput[]>(`/api/v1/reports${qs}`, {
        method: 'GET',
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'NETWORK_ERROR') {
        demoDataManager.markBackendOffline(true);
        return demoDataManager.filterReports(query);
      }
      throw err;
    }
  },
};

export function getRolePortalPath(role?: string): string {
  if (!role) return '/';
  switch (role.toLowerCase()) {
    case 'citizen':
      return '/citizen/home';
    case 'driver':
      return '/driver/route-check';
    case 'field_officer':
    case 'field-officer':
      return '/field/tasks';
    case 'officer':
      return '/officer/dashboard';
    case 'admin':
      return '/admin/users';
    default:
      return '/';
  }
}

export const fieldOfficerApi = {
  async getProfile(): Promise<FieldOfficerProfile> {
    return apiClient('/api/field-officer/profile');
  },

  async updateLanguage(language: string): Promise<FieldOfficerProfile> {
    return apiClient('/api/field-officer/profile/language', {
      method: 'PATCH',
      body: JSON.stringify({ language }),
    });
  },

  async getTasks(params?: {
    status?: string;
    riskLevel?: string;
  }): Promise<FieldOfficerTask[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.riskLevel) query.set('riskLevel', params.riskLevel);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient(`/api/field-officer/tasks${qs}`);
  },

  async startTask(id: string): Promise<FieldOfficerTask> {
    return apiClient(`/api/field-officer/tasks/${id}/start`, {
      method: 'PATCH',
    });
  },

  async completeTask(
    id: string,
    completionNotes?: string
  ): Promise<FieldOfficerTask> {
    return apiClient(`/api/field-officer/tasks/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ completionNotes }),
    });
  },

  async escalateTask(
    id: string,
    reason: string,
    priority = 'Critical'
  ): Promise<{ task?: FieldOfficerTask } & Partial<FieldOfficerTask>> {
    return apiClient(`/api/field-officer/tasks/${id}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason, priority }),
    });
  },

  async getMapData(): Promise<FieldOfficerMapData> {
    return apiClient('/api/field-officer/map/data');
  },

  async getReports(params?: {
    status?: string;
    hazardType?: string;
  }): Promise<VillagerReportItem[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.hazardType) query.set('hazardType', params.hazardType);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient(`/api/field-officer/reports${qs}`);
  },

  async verifyReport(
    id: string,
    fieldNotes?: string,
    inspectorPhotoUrl?: string
  ): Promise<VillagerReportItem> {
    return apiClient(`/api/field-officer/reports/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ fieldNotes, inspectorPhotoUrl }),
    });
  },

  async rejectReport(
    id: string,
    rejectionReason: string
  ): Promise<VillagerReportItem> {
    return apiClient(`/api/field-officer/reports/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ rejectionReason }),
    });
  },

  async escalateReport(
    id: string,
    payload: {
      escalationReason: string;
      urgency?: string;
      recommendedAction?: string;
    }
  ): Promise<{ report?: VillagerReportItem } & Partial<VillagerReportItem>> {
    return apiClient(`/api/field-officer/reports/${id}/escalate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getCurrentRoadStatus(): Promise<RoadStatusSegment[]> {
    return apiClient('/api/field-officer/road-status/current');
  },

  async updateRoadStatus(payload: {
    roadSegmentId?: string;
    stretchName?: string;
    condition: RoadCondition;
    reason: string;
    photoUrl?: string | null;
  }): Promise<
    {
      roadStatus?: RoadStatusSegment;
      data?: RoadStatusSegment;
      payload?: RoadStatusSegment;
    } & Partial<RoadStatusSegment>
  > {
    return apiClient('/api/field-officer/road-status/update', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAlerts(): Promise<SectorAlertItem[]> {
    return apiClient('/api/field-officer/alerts');
  },

  async acknowledgeAlert(id: string): Promise<SectorAlertItem> {
    return apiClient(`/api/field-officer/alerts/${id}/acknowledge`, {
      method: 'PATCH',
    });
  },
};
