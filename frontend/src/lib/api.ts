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
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('terra360_refresh_token');
          localStorage.removeItem('terra360_has_session');
        }
        return null;
      }

      const json: ApiResponse<RefreshSuccessData> = await res.json();
      if (json.success && json.data?.accessToken) {
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
  } catch (err: unknown) {
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
    return apiClient<RegisterSuccessData>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      retryOnAuthError: false,
    });
  },

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<AuthSuccessData> {
    const data = await apiClient<AuthSuccessData>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      retryOnAuthError: false,
    });
    if (data.accessToken) {
      setAccessToken(data.accessToken);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('terra360_has_session', 'true');
      if (data.refreshToken) {
        localStorage.setItem('terra360_refresh_token', data.refreshToken);
      }
    }
    return data;
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
    } finally {
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('terra360_refresh_token');
        localStorage.removeItem('terra360_has_session');
      }
    }
  },

  async getMe(): Promise<User> {
    const data = await apiClient<UserProfileSuccessData>('/api/v1/users/me', {
      method: 'GET',
    });
    return data.user;
  },

  async verifyEmail(token: string): Promise<MessageSuccessData> {
    return apiClient<MessageSuccessData>('/api/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
      retryOnAuthError: false,
    });
  },

  async forgotPassword(email: string): Promise<MessageSuccessData> {
    return apiClient<MessageSuccessData>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      retryOnAuthError: false,
    });
  },

  async resetPassword(token: string, password: string): Promise<MessageSuccessData> {
    return apiClient<MessageSuccessData>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
      retryOnAuthError: false,
    });
  },
};

export const usersApi = {
  /**
   * 1. GET /api/v1/users/me
   * Fetches current authenticated user profile
   */
  async getMe(): Promise<User> {
    const data = await apiClient<UserProfileSuccessData>('/api/v1/users/me', {
      method: 'GET',
    });
    return data.user;
  },

  /**
   * 2. PATCH /api/v1/users/me
   * Updates permitted profile fields (name, phone, language)
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    const data = await apiClient<UserProfileSuccessData>('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return data.user;
  },

  /**
   * 3. PATCH /api/v1/users/me/password
   * Updates password with verification of current password
   */
  async changePassword(payload: ChangePasswordPayload): Promise<MessageSuccessData> {
    return apiClient<MessageSuccessData>('/api/v1/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * 4. GET /api/v1/users/me/sessions
   * Lists active sessions with device & IP info
   */
  async getSessions(): Promise<UserSession[]> {
    const data = await apiClient<SessionsSuccessData>('/api/v1/users/me/sessions', {
      method: 'GET',
    });
    return data.sessions || [];
  },

  /**
   * 5. DELETE /api/v1/users/me/sessions/:id
   * Revokes an individual session
   */
  async revokeSession(sessionId: string): Promise<MessageSuccessData> {
    return apiClient<MessageSuccessData>(`/api/v1/users/me/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
  },

  /**
   * 6. GET /api/v1/users/me/export
   * Initiates export of user's personal data
   */
  async exportData(): Promise<UserExportData> {
    return apiClient<UserExportData>('/api/v1/users/me/export', {
      method: 'GET',
    });
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

    const res = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      let errorMsg = 'Failed to download account data';
      try {
        const json = await res.json();
        if (json.error?.message) errorMsg = json.error.message;
      } catch {
        // use default errorMsg
      }
      throw new ApiClientError(errorMsg, 'EXPORT_FAILED', res.status);
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
  },

  /**
   * 7. DELETE /api/v1/users/me
   * Deactivates and deletes user account (requires confirmationText: 'DELETE')
   */
  async deleteAccount(confirmationText: string): Promise<MessageSuccessData> {
    try {
      return await apiClient<MessageSuccessData>('/api/v1/users/me', {
        method: 'DELETE',
        body: JSON.stringify({ confirmationText }),
      });
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
    const params = new URLSearchParams();
    if (query?.state && query.state !== 'All' && query.state !== 'All States') {
      params.set('state', query.state);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<PublicRiskMapItem[]>(`/api/v1/public/risk-map${qs}`, {
      method: 'GET',
      retryOnAuthError: false,
    });
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
  },

  /**
   * 3. GET /api/v1/public/road-status
   * Returns highway / corridor clearance status.
   */
  async getRoadStatus(query?: {
    state?: string;
    status?: string;
  }): Promise<PublicRoadStatusItem[]> {
    const params = new URLSearchParams();
    if (query?.state && query.state !== 'All' && query.state !== 'All States') {
      params.set('state', query.state);
    }
    if (query?.status && query.status !== 'All') {
      params.set('status', query.status.toLowerCase());
    }
    const qs = params.toString() ? `?${params.toString()}` : '';

    return apiClient<PublicRoadStatusItem[]>(`/api/v1/public/road-status${qs}`, {
      method: 'GET',
      retryOnAuthError: false,
    });
  },

  /**
   * 4. GET /api/v1/public/stats
   * Returns live MongoDB aggregated counts.
   */
  async getStats(): Promise<PublicStats> {
    return apiClient<PublicStats>('/api/v1/public/stats', {
      method: 'GET',
      retryOnAuthError: false,
    });
  },

  /**
   * 5. POST /api/v1/reports/public
   * Submits a public landslide/hazard report.
   * Strictly respects backend security boundaries.
   */
  async submitHazardReport(
    payload: CreateHazardReportPayload
  ): Promise<HazardReportOutput> {
    return apiClient<HazardReportOutput>('/api/v1/reports/public', {
      method: 'POST',
      body: JSON.stringify(payload),
      retryOnAuthError: false,
    });
  },

  /**
   * 6. POST /api/v1/contact
   * Submits a public inquiry or message to the operations desk.
   */
  async submitContact(
    payload: CreateContactPayload
  ): Promise<{ contact: ContactOutput; message: string }> {
    const res = await rawApiRequest<ContactOutput>('/api/v1/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
      retryOnAuthError: false,
    });
    return {
      contact: res.data as ContactOutput,
      message: res.message || 'Your message has been received. Our operations desk will get in touch shortly.',
    };
  },
};

export const reportsApi = {
  /**
   * GET /api/v1/reports
   * List hazard reports for operational officers and emergency desks.
   */
  async getReports(query?: {
    state?: string;
    status?: string;
    limit?: number;
  }): Promise<HazardReportOutput[]> {
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
    return apiClient<HazardReportOutput[]>(`/api/v1/reports${qs}`, {
      method: 'GET',
    });
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
      return '/field/tasks';
    case 'officer':
      return '/officer/dashboard';
    case 'admin':
      return '/admin/users';
    default:
      return '/';
  }
}
