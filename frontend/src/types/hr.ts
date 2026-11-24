// Exact Spring Boot Backend DTO Contracts for hr-management API v1

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
  details?: string[];
  timestamp?: string;
}

export interface PageResponseDTO<T> {
  content: T[];
  page: number; // 1-based (spring.data.web.pageable.one-indexed-parameters=true)
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
}

export interface DashboardResponse {
  totalUsers: number;
  totalCompanies: number;
  totalRoles: number;
  totalPermissions: number;
}

export type GenderEnum = 'MALE' | 'FEMALE' | 'OTHER';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type HrModule = 'AUTH' | 'USER' | 'COMPANY' | 'PERMISSION' | 'ROLE' | 'FILE';
export type UploadFolder = 'avatars' | 'logos';

export const GENDERS: readonly GenderEnum[] = ['MALE', 'FEMALE', 'OTHER'] as const;
export const HTTP_METHODS: readonly HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export const HR_MODULES: readonly HrModule[] = ['AUTH', 'USER', 'COMPANY', 'PERMISSION', 'ROLE', 'FILE'] as const;

// ---------------------------------------------------------------------------
// User DTOs
// ---------------------------------------------------------------------------
export interface UserCompanyInfo {
  id: number;
  name: string;
}

export interface UserRoleInfo {
  id: number;
  name: string;
}

export interface UserResponseDTO {
  id: number;
  name: string;
  email: string;
  age: number | null;
  address: string;
  gender: GenderEnum | null;
  avatar: string | null;
  companyInfo: UserCompanyInfo | null;
  roleInfo: UserRoleInfo[];
}

/** Exact backend contract: note `roleIDs` casing matches UserRequestDTO.java */
export interface UserRequestDTO {
  name: string;
  email: string;
  password: string;
  age?: number | null;
  avatar?: string | null;
  gender?: GenderEnum | null;
  companyId?: number | null;
  roleIDs: number[];
  address: string;
}

export interface UserFilterDTO extends PaginationParams {
  age?: number;
  name?: string;
  email?: string;
  minAge?: number;
  maxAge?: number;
  gender?: GenderEnum | '';
}

// ---------------------------------------------------------------------------
// Company DTOs
// ---------------------------------------------------------------------------
export interface CompanyResponseDTO {
  id: number;
  name: string;
  description: string;
  address: string;
  logo: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CompanyRequestDTO {
  name: string;
  description: string;
  address: string;
  logo: string;
}

export interface CompanyFilterDTO extends PaginationParams {
  name?: string;
  description?: string;
  logo?: string;
  address?: string;
}

// ---------------------------------------------------------------------------
// Permission DTOs
// ---------------------------------------------------------------------------
export interface PermissionResponseDTO {
  id: number;
  name: string;
  apiPath: string;
  method: HttpMethod | string;
  module: HrModule | string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PermissionRequestDTO {
  name: string;
  apiPath: string;
  method: HttpMethod | string;
  module: HrModule | string;
}

export interface PermissionFilterDTO extends PaginationParams {
  name?: string;
  method?: HttpMethod | (string & {}) | '';
  module?: HrModule | (string & {}) | '';
}

// ---------------------------------------------------------------------------
// Role DTOs
// ---------------------------------------------------------------------------
export interface RoleResponseDTO {
  id: number;
  name: string;
  description: string;
  permissions: PermissionResponseDTO[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RoleRequestDTO {
  name: string;
  description: string;
  permissionIds: number[];
}

export interface RoleFilterDTO extends PaginationParams {
  name?: string;
  description?: string;
  permissionIds?: number[];
}

// ---------------------------------------------------------------------------
// Auth DTOs
// ---------------------------------------------------------------------------
export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface LoginResponseDTO {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequestDTO {
  refreshToken?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  age?: number | null;
  gender?: GenderEnum | null;
  address: string;
}

export interface RegisterResponse {
  id: number;
  name: string;
  email: string;
  age: number | null;
  address: string;
  createdAt: string | null;
  updateAt: string | null; // exact field name in RegisterResponse.java
}

// ---------------------------------------------------------------------------
// File Upload DTOs
// ---------------------------------------------------------------------------
export interface FileUploadResponse {
  fileName: string;
  folder: string;
  fileUrl: string;
  size: number;
  uploadAt: string;
}

// ---------------------------------------------------------------------------
// App Shell & Navigation Types
// ---------------------------------------------------------------------------
export type AppRoute = 'dashboard' | 'users' | 'companies' | 'roles' | 'permissions' | 'auth';
export type DataMode = 'demo' | 'live';

export interface AuthSession {
  loggedIn: boolean;
  email: string;
  accessToken: string | null;
  refreshToken: string | null;
  deviceInfo: string;
  ipClient: string;
}

export interface UserFilterPreset {
  query?: string;
  name?: string;
  email?: string;
  gender?: GenderEnum | '';
  minAge?: number | '';
  maxAge?: number | '';
  companyId?: number | '';
  roleId?: number | '';
}

export interface PermissionFilterPreset {
  name?: string;
  method?: HttpMethod | (string & {}) | '';
  module?: HrModule | (string & {}) | '';
}
