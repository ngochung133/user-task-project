import type { ApiResponse, LoginResponseDTO } from '../types/hr';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '';

const ACCESS_TOKEN_KEY = 'hr_live_access_token';
const REFRESH_TOKEN_KEY = 'hr_live_refresh_token';
const AUTH_EMAIL_KEY = 'hr_live_auth_email';

export class ApiError extends Error {
  statusCode: number;
  error?: string;
  details: string[];

  constructor(statusCode: number, message: string, error?: string, details?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.error = error;
    this.details = details ?? [];
  }

  get fullMessage(): string {
    if (this.details.length > 0) {
      return `${this.message}: ${this.details.join('; ')}`;
    }
    return this.message;
  }
}

type TokenChangeListener = (tokens: { accessToken: string | null; refreshToken: string | null }) => void;
const tokenListeners = new Set<TokenChangeListener>();

export function subscribeTokenChanges(listener: TokenChangeListener): () => void {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}

function notifyTokenListeners(): void {
  const payload = {
    accessToken: getStoredAccessToken(),
    refreshToken: getStoredRefreshToken(),
  };
  tokenListeners.forEach((fn) => fn(payload));
}

export function getStoredAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredAuthEmail(): string | null {
  try {
    return localStorage.getItem(AUTH_EMAIL_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuthEmail(email: string): void {
  try {
    if (email) localStorage.setItem(AUTH_EMAIL_KEY, email);
    else localStorage.removeItem(AUTH_EMAIL_KEY);
  } catch {
    // ignore storage errors
  }
}

export function setStoredTokens(accessToken: string | null, refreshToken: string | null, email?: string): void {
  try {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);

    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);

    if (email !== undefined) {
      if (email) localStorage.setItem(AUTH_EMAIL_KEY, email);
      else localStorage.removeItem(AUTH_EMAIL_KEY);
    }
  } catch {
    // ignore storage errors
  }
  notifyTokenListeners();
}

export function clearStoredTokens(): void {
  setStoredTokens(null, null, '');
}

export function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          search.append(key, String(item));
        }
      });
    } else {
      search.append(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

let inflightRefresh: Promise<LoginResponseDTO | null> | null = null;

async function attemptTokenRefresh(): Promise<LoginResponseDTO | null> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    try {
      const storedRefresh = getStoredRefreshToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: storedRefresh ? JSON.stringify({ refreshToken: storedRefresh }) : undefined,
      });

      if (!response.ok) {
        clearStoredTokens();
        return null;
      }

      const json = (await response.json()) as ApiResponse<LoginResponseDTO>;
      if (json.data?.accessToken) {
        setStoredTokens(json.data.accessToken, json.data.refreshToken ?? storedRefresh);
        return json.data;
      }
      clearStoredTokens();
      return null;
    } catch {
      clearStoredTokens();
      return null;
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  skipRefreshRetry?: boolean;
}

const AUTH_NO_RETRY_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
];

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { body, headers, skipAuth = false, skipRefreshRetry = false, ...rest } = options;

  const requestHeaders = new Headers(headers);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (!isFormData && body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = getStoredAccessToken();
    if (token && !requestHeaders.has('Authorization')) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  const execute = async (): Promise<Response> => {
    try {
      return await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        credentials: 'include',
        headers: requestHeaders,
        body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(
        0,
        'Không thể kết nối máy chủ Spring Boot (http://localhost:8080). Kiểm tra backend hoặc chuyển sang chế độ Demo.',
        'NETWORK_ERROR',
      );
    }
  };

  let response = await execute();

  const canRetry =
    response.status === 401 &&
    !skipRefreshRetry &&
    !AUTH_NO_RETRY_PATHS.some((p) => path.startsWith(p));

  if (canRetry) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed?.accessToken) {
      requestHeaders.set('Authorization', `Bearer ${refreshed.accessToken}`);
      response = await execute();
    }
  }

  const text = await response.text();
  let parsed: ApiResponse<T> | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as ApiResponse<T>;
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const statusCode = parsed?.statusCode ?? response.status;
    const message = parsed?.message || response.statusText || `HTTP ${response.status}`;
    const error = parsed?.error || response.statusText;
    const details = Array.isArray(parsed?.details) ? parsed.details : [];
    throw new ApiError(statusCode, message, error, details);
  }

  if (parsed) {
    return parsed;
  }

  return {
    statusCode: response.status,
    message: 'Success',
    data: undefined,
  };
}
