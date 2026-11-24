import type {
  AuthSession,
  CompanyFilterDTO,
  CompanyRequestDTO,
  CompanyResponseDTO,
  DashboardResponse,
  DataMode,
  FileUploadResponse,
  LoginRequestDTO,
  LoginResponseDTO,
  PageResponseDTO,
  PermissionFilterDTO,
  PermissionRequestDTO,
  PermissionResponseDTO,
  RefreshTokenRequestDTO,
  RegisterRequest,
  RegisterResponse,
  RoleFilterDTO,
  RoleRequestDTO,
  RoleResponseDTO,
  UploadFolder,
  UserFilterDTO,
  UserRequestDTO,
  UserResponseDTO,
} from '../types/hr';
import {
  apiRequest,
  buildQueryString,
  clearStoredTokens,
  getStoredAccessToken,
  getStoredAuthEmail,
  getStoredRefreshToken,
  setStoredTokens,
} from './client';
import { mockStore } from './mockStore';

const DATA_MODE_KEY = 'hr_data_mode';

let currentMode: DataMode = (() => {
  try {
    const saved = localStorage.getItem(DATA_MODE_KEY);
    if (saved === 'live' || saved === 'demo') return saved;
  } catch {
    // ignore storage errors
  }
  return 'demo';
})();

export function getDataMode(): DataMode {
  return currentMode;
}

export function setDataMode(mode: DataMode): void {
  currentMode = mode;
  try {
    localStorage.setItem(DATA_MODE_KEY, mode);
  } catch {
    // ignore
  }
}

export function resetDemoData(): void {
  mockStore.reset();
}

export function getDemoPreviewUrl(fileName: string | null | undefined): string | null {
  return mockStore.getPreviewUrl(fileName);
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------
export const authApi = {
  getSession(): AuthSession {
    if (currentMode === 'demo') {
      return mockStore.getAuthSession();
    }
    const accessToken = getStoredAccessToken();
    const refreshToken = getStoredRefreshToken();
    return {
      loggedIn: Boolean(accessToken),
      email: getStoredAuthEmail() || (accessToken ? 'Phiên Live JWT' : ''),
      accessToken,
      refreshToken,
      deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 48) : 'Browser',
      ipClient: 'localhost',
    };
  },

  async me(): Promise<UserResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.getCurrentUser();
    }
    const res = await apiRequest<UserResponseDTO>('/api/v1/auth/me', { method: 'GET' });
    return res.data!;
  },

  async login(req: LoginRequestDTO): Promise<LoginResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.login(req);
    }
    const res = await apiRequest<LoginResponseDTO>('/api/v1/auth/login', {
      method: 'POST',
      body: req,
      skipAuth: true,
    });
    const data = res.data!;
    setStoredTokens(data.accessToken, data.refreshToken, req.email.trim());
    return data;
  },

  async register(req: RegisterRequest): Promise<RegisterResponse> {
    if (currentMode === 'demo') {
      return mockStore.register(req);
    }
    const res = await apiRequest<RegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: req,
      skipAuth: true,
    });
    return res.data!;
  },

  async refresh(req?: RefreshTokenRequestDTO): Promise<LoginResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.refresh(req?.refreshToken);
    }
    const refreshToken = req?.refreshToken ?? getStoredRefreshToken() ?? undefined;
    const res = await apiRequest<LoginResponseDTO>('/api/v1/auth/refresh', {
      method: 'POST',
      body: refreshToken ? { refreshToken } : undefined,
      skipAuth: true,
      skipRefreshRetry: true,
    });
    const data = res.data!;
    setStoredTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async logout(req?: RefreshTokenRequestDTO): Promise<string> {
    if (currentMode === 'demo') {
      return mockStore.logout();
    }
    const refreshToken = req?.refreshToken ?? getStoredRefreshToken() ?? undefined;
    try {
      const res = await apiRequest<string>('/api/v1/auth/logout', {
        method: 'POST',
        body: refreshToken ? { refreshToken } : undefined,
        skipRefreshRetry: true,
      });
      return res.data || res.message;
    } finally {
      clearStoredTokens();
    }
  },
};

// ---------------------------------------------------------------------------
// Dashboard API
// ---------------------------------------------------------------------------
export const dashboardApi = {
  async getSummary(): Promise<DashboardResponse> {
    if (currentMode === 'demo') {
      return mockStore.getDashboard();
    }
    const res = await apiRequest<DashboardResponse>('/api/v1/dashboard', { method: 'GET' });
    return res.data!;
  },
};

// ---------------------------------------------------------------------------
// Users API
// ---------------------------------------------------------------------------
export const usersApi = {
  async list(filter: UserFilterDTO = {}): Promise<PageResponseDTO<UserResponseDTO>> {
    if (currentMode === 'demo') {
      return mockStore.listUsers(filter);
    }
    const qs = buildQueryString(filter as Record<string, unknown>);
    const res = await apiRequest<PageResponseDTO<UserResponseDTO>>(`/api/v1/users${qs}`, {
      method: 'GET',
    });
    return res.data!;
  },

  async getById(id: number): Promise<UserResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.getUserById(id);
    }
    const res = await apiRequest<UserResponseDTO>(`/api/v1/users/${id}`, { method: 'GET' });
    return res.data!;
  },

  async create(payload: UserRequestDTO): Promise<UserResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.createUser(payload);
    }
    const res = await apiRequest<UserResponseDTO>('/api/v1/users', {
      method: 'POST',
      body: payload,
    });
    return res.data!;
  },

  async update(id: number, payload: UserRequestDTO): Promise<UserResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.updateUser(id, payload);
    }
    const res = await apiRequest<UserResponseDTO>(`/api/v1/users/${id}`, {
      method: 'PUT',
      body: payload,
    });
    return res.data!;
  },

  async remove(id: number): Promise<string> {
    if (currentMode === 'demo') {
      return mockStore.deleteUser(id);
    }
    const res = await apiRequest<string>(`/api/v1/users/${id}`, { method: 'DELETE' });
    return res.data || res.message;
  },
};

// ---------------------------------------------------------------------------
// Companies API
// ---------------------------------------------------------------------------
export const companiesApi = {
  async list(filter: CompanyFilterDTO = {}): Promise<PageResponseDTO<CompanyResponseDTO>> {
    if (currentMode === 'demo') {
      return mockStore.listCompanies(filter);
    }
    const qs = buildQueryString(filter as Record<string, unknown>);
    const res = await apiRequest<PageResponseDTO<CompanyResponseDTO>>(`/api/v1/companies${qs}`, {
      method: 'GET',
    });
    return res.data!;
  },

  async getById(id: number): Promise<CompanyResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.getCompanyById(id);
    }
    const res = await apiRequest<CompanyResponseDTO>(`/api/v1/companies/${id}`, { method: 'GET' });
    return res.data!;
  },

  async create(payload: CompanyRequestDTO): Promise<CompanyResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.createCompany(payload);
    }
    const res = await apiRequest<CompanyResponseDTO>('/api/v1/companies', {
      method: 'POST',
      body: payload,
    });
    return res.data!;
  },

  async update(id: number, payload: CompanyRequestDTO): Promise<CompanyResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.updateCompany(id, payload);
    }
    const res = await apiRequest<CompanyResponseDTO>(`/api/v1/companies/${id}`, {
      method: 'PUT',
      body: payload,
    });
    return res.data!;
  },

  async remove(id: number): Promise<string> {
    if (currentMode === 'demo') {
      return mockStore.deleteCompany(id);
    }
    const res = await apiRequest<string>(`/api/v1/companies/${id}`, { method: 'DELETE' });
    return res.data || res.message;
  },
};

// ---------------------------------------------------------------------------
// Roles API
// ---------------------------------------------------------------------------
export const rolesApi = {
  async list(filter: RoleFilterDTO = {}): Promise<PageResponseDTO<RoleResponseDTO>> {
    if (currentMode === 'demo') {
      return mockStore.listRoles(filter);
    }
    const qs = buildQueryString(filter as Record<string, unknown>);
    const res = await apiRequest<PageResponseDTO<RoleResponseDTO>>(`/api/v1/roles${qs}`, {
      method: 'GET',
    });
    return res.data!;
  },

  async getById(id: number): Promise<RoleResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.getRoleById(id);
    }
    const res = await apiRequest<RoleResponseDTO>(`/api/v1/roles/${id}`, { method: 'GET' });
    return res.data!;
  },

  async create(payload: RoleRequestDTO): Promise<RoleResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.createRole(payload);
    }
    const res = await apiRequest<RoleResponseDTO>('/api/v1/roles', {
      method: 'POST',
      body: payload,
    });
    return res.data!;
  },

  async update(id: number, payload: RoleRequestDTO): Promise<RoleResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.updateRole(id, payload);
    }
    const res = await apiRequest<RoleResponseDTO>(`/api/v1/roles/${id}`, {
      method: 'PUT',
      body: payload,
    });
    return res.data!;
  },

  async remove(id: number): Promise<string> {
    if (currentMode === 'demo') {
      return mockStore.deleteRole(id);
    }
    const res = await apiRequest<string>(`/api/v1/roles/${id}`, { method: 'DELETE' });
    return res.data || res.message;
  },
};

// ---------------------------------------------------------------------------
// Permissions API
// ---------------------------------------------------------------------------
export const permissionsApi = {
  async list(filter: PermissionFilterDTO = {}): Promise<PageResponseDTO<PermissionResponseDTO>> {
    if (currentMode === 'demo') {
      return mockStore.listPermissions(filter);
    }
    const qs = buildQueryString(filter as Record<string, unknown>);
    const res = await apiRequest<PageResponseDTO<PermissionResponseDTO>>(
      `/api/v1/permissions${qs}`,
      { method: 'GET' },
    );
    return res.data!;
  },

  async getById(id: number): Promise<PermissionResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.getPermissionById(id);
    }
    const res = await apiRequest<PermissionResponseDTO>(`/api/v1/permissions/${id}`, {
      method: 'GET',
    });
    return res.data!;
  },

  async create(payload: PermissionRequestDTO): Promise<PermissionResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.createPermission(payload);
    }
    const res = await apiRequest<PermissionResponseDTO>('/api/v1/permissions', {
      method: 'POST',
      body: payload,
    });
    return res.data!;
  },

  async update(id: number, payload: PermissionRequestDTO): Promise<PermissionResponseDTO> {
    if (currentMode === 'demo') {
      return mockStore.updatePermission(id, payload);
    }
    const res = await apiRequest<PermissionResponseDTO>(`/api/v1/permissions/${id}`, {
      method: 'PUT',
      body: payload,
    });
    return res.data!;
  },

  async remove(id: number): Promise<string> {
    if (currentMode === 'demo') {
      return mockStore.deletePermission(id);
    }
    const res = await apiRequest<string>(`/api/v1/permissions/${id}`, { method: 'DELETE' });
    return res.data || res.message;
  },
};

// ---------------------------------------------------------------------------
// File Upload API
// ---------------------------------------------------------------------------
export const filesApi = {
  async upload(file: File, folder: UploadFolder): Promise<FileUploadResponse> {
    if (currentMode === 'demo') {
      return mockStore.uploadFile(file, folder);
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    const res = await apiRequest<FileUploadResponse>('/api/v1/files', {
      method: 'POST',
      body: formData,
    });
    return res.data!;
  },
};
