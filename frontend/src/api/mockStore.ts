import {
  HTTP_METHODS,
  type AuthSession,
  type CompanyFilterDTO,
  type CompanyRequestDTO,
  type CompanyResponseDTO,
  type DashboardResponse,
  type FileUploadResponse,
  type GenderEnum,
  type LoginRequestDTO,
  type LoginResponseDTO,
  type PageResponseDTO,
  type PermissionFilterDTO,
  type PermissionRequestDTO,
  type PermissionResponseDTO,
  type RegisterRequest,
  type RegisterResponse,
  type RoleFilterDTO,
  type RoleRequestDTO,
  type RoleResponseDTO,
  type UploadFolder,
  type UserFilterDTO,
  type UserRequestDTO,
  type UserResponseDTO,
} from '../types/hr';
import { utf8ByteLength } from '../utils/format';
import { ApiError } from './client';

interface InternalUser {
  id: number;
  name: string;
  email: string;
  password: string;
  age: number | null;
  gender: GenderEnum | null;
  address: string;
  avatar: string | null;
  companyId: number | null;
  roleIds: number[];
  createdAt: string;
  updatedAt: string;
}

interface InternalRole {
  id: number;
  name: string;
  description: string;
  permissionIds: number[];
  createdAt: string;
  updatedAt: string;
}

interface MockDatabase {
  auth: AuthSession;
  companies: CompanyResponseDTO[];
  permissions: PermissionResponseDTO[];
  roles: InternalRole[];
  users: InternalUser[];
  previews: Record<string, string>;
}

function createInitialDb(): MockDatabase {
  return {
    auth: {
      loggedIn: true,
      email: 'hung.nguyen@techcorp.vn',
      accessToken:
        'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJodW5nLm5ndXllbkB0ZWNoY29ycC52biIsInJvbGVzIjpbIlNVUEVSX0FETUlOIl19.sig_demo_hr',
      refreshToken: 'rt_91c2f7a0b83e4d5f9c12d84a62e07f11',
      deviceInfo: 'Chrome 131 / macOS',
      ipClient: '127.0.0.1',
    },
    companies: [
      {
        id: 1,
        name: 'TechCorp Vietnam',
        description: 'Phát triển nền tảng quản trị doanh nghiệp và dịch vụ Cloud.',
        address: 'Tầng 12, Tòa nhà Peakview, 36 Hoàng Cầu, Đống Đa, Hà Nội',
        logo: 'techcorp-logo.svg',
        createdAt: '2026-10-12T08:30:00Z',
        updatedAt: '2026-11-18T09:15:00Z',
      },
      {
        id: 2,
        name: 'Saigon FinLabs',
        description: 'Giải pháp thanh toán số và hạ tầng ngân hàng mở.',
        address: '72 Lê Thánh Tôn, Quận 1, TP. Hồ Chí Minh',
        logo: 'finlabs-logo.svg',
        createdAt: '2026-10-18T04:00:00Z',
        updatedAt: '2026-11-15T11:20:00Z',
      },
      {
        id: 3,
        name: 'Danang Logistics Hub',
        description: 'Hệ thống điều phối kho vận thông minh khu vực miền Trung.',
        address: '255 Nguyễn Văn Linh, Hải Châu, Đà Nẵng',
        logo: 'danang-hub.svg',
        createdAt: '2026-11-01T07:45:00Z',
        updatedAt: '2026-11-12T16:10:00Z',
      },
      {
        id: 4,
        name: 'Mekong AgriTech',
        description: 'IoT giám sát vùng trồng và truy xuất nguồn gốc nông sản.',
        address: '108 Hòa Bình, Ninh Kiều, Cần Thơ',
        logo: 'mekong-agri.svg',
        createdAt: '2026-11-04T09:00:00Z',
        updatedAt: '2026-11-10T10:05:00Z',
      },
    ],
    permissions: [
      { id: 1, name: 'Đăng nhập hệ thống', apiPath: '/api/v1/auth/login', method: 'POST', module: 'AUTH', createdAt: '2026-11-01T08:00:00Z', updatedAt: '2026-11-01T08:00:00Z' },
      { id: 2, name: 'Làm mới Access Token', apiPath: '/api/v1/auth/refresh', method: 'POST', module: 'AUTH', createdAt: '2026-11-01T08:00:00Z', updatedAt: '2026-11-01T08:00:00Z' },
      { id: 3, name: 'Đăng xuất phiên', apiPath: '/api/v1/auth/logout', method: 'POST', module: 'AUTH', createdAt: '2026-11-01T08:00:00Z', updatedAt: '2026-11-01T08:00:00Z' },
      { id: 4, name: 'Xem danh sách nhân sự', apiPath: '/api/v1/users', method: 'GET', module: 'USER', createdAt: '2026-11-02T08:00:00Z', updatedAt: '2026-11-02T08:00:00Z' },
      { id: 5, name: 'Xem chi tiết nhân sự', apiPath: '/api/v1/users/{id}', method: 'GET', module: 'USER', createdAt: '2026-11-02T08:00:00Z', updatedAt: '2026-11-02T08:00:00Z' },
      { id: 6, name: 'Tạo nhân sự mới', apiPath: '/api/v1/users', method: 'POST', module: 'USER', createdAt: '2026-11-02T08:00:00Z', updatedAt: '2026-11-02T08:00:00Z' },
      { id: 7, name: 'Cập nhật hồ sơ nhân sự', apiPath: '/api/v1/users/{id}', method: 'PUT', module: 'USER', createdAt: '2026-11-02T08:00:00Z', updatedAt: '2026-11-02T08:00:00Z' },
      { id: 8, name: 'Xóa nhân sự', apiPath: '/api/v1/users/{id}', method: 'DELETE', module: 'USER', createdAt: '2026-11-02T08:00:00Z', updatedAt: '2026-11-02T08:00:00Z' },
      { id: 9, name: 'Xem danh sách công ty', apiPath: '/api/v1/companies', method: 'GET', module: 'COMPANY', createdAt: '2026-11-03T08:00:00Z', updatedAt: '2026-11-03T08:00:00Z' },
      { id: 10, name: 'Tạo công ty', apiPath: '/api/v1/companies', method: 'POST', module: 'COMPANY', createdAt: '2026-11-03T08:00:00Z', updatedAt: '2026-11-03T08:00:00Z' },
      { id: 11, name: 'Cập nhật công ty', apiPath: '/api/v1/companies/{id}', method: 'PUT', module: 'COMPANY', createdAt: '2026-11-03T08:00:00Z', updatedAt: '2026-11-03T08:00:00Z' },
      { id: 12, name: 'Xóa công ty', apiPath: '/api/v1/companies/{id}', method: 'DELETE', module: 'COMPANY', createdAt: '2026-11-03T08:00:00Z', updatedAt: '2026-11-03T08:00:00Z' },
      { id: 13, name: 'Xem danh sách vai trò', apiPath: '/api/v1/roles', method: 'GET', module: 'ROLE', createdAt: '2026-11-05T08:00:00Z', updatedAt: '2026-11-05T08:00:00Z' },
      { id: 14, name: 'Tạo hoặc cập nhật vai trò', apiPath: '/api/v1/roles/{id}', method: 'PUT', module: 'ROLE', createdAt: '2026-11-05T08:00:00Z', updatedAt: '2026-11-05T08:00:00Z' },
      { id: 15, name: 'Xóa vai trò', apiPath: '/api/v1/roles/{id}', method: 'DELETE', module: 'ROLE', createdAt: '2026-11-05T08:00:00Z', updatedAt: '2026-11-05T08:00:00Z' },
      { id: 16, name: 'Xem danh sách quyền hạn', apiPath: '/api/v1/permissions', method: 'GET', module: 'PERMISSION', createdAt: '2026-11-06T08:00:00Z', updatedAt: '2026-11-06T08:00:00Z' },
      { id: 17, name: 'Tạo quyền hạn API', apiPath: '/api/v1/permissions', method: 'POST', module: 'PERMISSION', createdAt: '2026-11-06T08:00:00Z', updatedAt: '2026-11-06T08:00:00Z' },
      { id: 18, name: 'Sửa quyền hạn API', apiPath: '/api/v1/permissions/{id}', method: 'PUT', module: 'PERMISSION', createdAt: '2026-11-06T08:00:00Z', updatedAt: '2026-11-06T08:00:00Z' },
      { id: 19, name: 'Tải lên tệp (UPLOAD_FILE)', apiPath: '/api/v1/files', method: 'POST', module: 'FILE', createdAt: '2026-11-06T08:00:00Z', updatedAt: '2026-11-06T08:00:00Z' },
    ],
    roles: [
      {
        id: 1,
        name: 'SUPER_ADMIN',
        description: 'Toàn quyền quản trị hệ thống, cấu trúc công ty và phân quyền RBAC.',
        permissionIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
        createdAt: '2026-11-05T09:00:00Z',
        updatedAt: '2026-11-18T10:30:00Z',
      },
      {
        id: 2,
        name: 'HR_MANAGER',
        description: 'Quản lý hồ sơ nhân sự và thông tin công ty trực thuộc.',
        permissionIds: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 13, 19],
        createdAt: '2026-11-05T09:15:00Z',
        updatedAt: '2026-11-16T14:12:00Z',
      },
      {
        id: 3,
        name: 'HR_VIEWER',
        description: 'Tra cứu danh sách nhân sự, công ty và kiểm tra danh mục quyền.',
        permissionIds: [1, 2, 3, 4, 5, 9, 13, 16],
        createdAt: '2026-11-06T10:00:00Z',
        updatedAt: '2026-11-14T08:40:00Z',
      },
      {
        id: 4,
        name: 'EMPLOYEE',
        description: 'Nhân viên tiêu chuẩn chỉ sử dụng các endpoint xác thực phiên.',
        permissionIds: [1, 2, 3, 5],
        createdAt: '2026-11-08T11:20:00Z',
        updatedAt: '2026-11-12T15:00:00Z',
      },
    ],
    users: [
      { id: 1, name: 'Nguyễn Ngọc Hưng', email: 'hung.nguyen@techcorp.vn', password: 'Admin@1234', age: 27, gender: 'MALE', address: 'Đống Đa, Hà Nội', avatar: 'avatar-hung.png', companyId: 1, roleIds: [1], createdAt: '2026-10-15T08:00:00Z', updatedAt: '2026-11-18T08:00:00Z' },
      { id: 2, name: 'Trần Minh Thư', email: 'thu.tran@techcorp.vn', password: 'Admin@1234', age: 30, gender: 'FEMALE', address: 'Cầu Giấy, Hà Nội', avatar: 'avatar-thu.png', companyId: 1, roleIds: [2], createdAt: '2026-10-18T08:00:00Z', updatedAt: '2026-11-15T08:00:00Z' },
      { id: 3, name: 'Lê Hoàng Nam', email: 'nam.le@finlabs.vn', password: 'Admin@1234', age: 25, gender: 'MALE', address: 'Quận 1, TP. Hồ Chí Minh', avatar: null, companyId: 2, roleIds: [2, 3], createdAt: '2026-10-20T08:00:00Z', updatedAt: '2026-11-12T08:00:00Z' },
      { id: 4, name: 'Phạm Khánh Linh', email: 'linh.pham@finlabs.vn', password: 'Admin@1234', age: 29, gender: 'FEMALE', address: 'Quận 3, TP. Hồ Chí Minh', avatar: 'avatar-linh.png', companyId: 2, roleIds: [3], createdAt: '2026-10-22T08:00:00Z', updatedAt: '2026-11-12T08:00:00Z' },
      { id: 5, name: 'Võ Quốc Bảo', email: 'bao.vo@dananghub.vn', password: 'Admin@1234', age: 34, gender: 'MALE', address: 'Hải Châu, Đà Nẵng', avatar: null, companyId: 3, roleIds: [4], createdAt: '2026-11-02T08:00:00Z', updatedAt: '2026-11-10T08:00:00Z' },
      { id: 6, name: 'Đặng Thảo Vy', email: 'vy.dang@mekongagri.vn', password: 'Admin@1234', age: 26, gender: 'OTHER', address: 'Ninh Kiều, Cần Thơ', avatar: null, companyId: 4, roleIds: [4], createdAt: '2026-11-05T08:00:00Z', updatedAt: '2026-11-10T08:00:00Z' },
      { id: 7, name: 'Bùi Đức Anh', email: 'anh.bui@techcorp.vn', password: 'Admin@1234', age: 31, gender: 'MALE', address: 'Thanh Xuân, Hà Nội', avatar: null, companyId: 1, roleIds: [3], createdAt: '2026-11-06T08:00:00Z', updatedAt: '2026-11-11T08:00:00Z' },
    ],
    previews: {},
  };
}

let db: MockDatabase = createInitialDb();

function paginate<T>(items: T[], page = 1, size = 10): PageResponseDTO<T> {
  const safeSize = Math.max(1, Math.min(100, size));
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / safeSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * safeSize;
  return {
    content: items.slice(start, start + safeSize),
    page: safePage,
    size: safeSize,
    totalElements,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrevious: safePage > 1,
  };
}

function toUserResponse(u: InternalUser): UserResponseDTO {
  const comp = u.companyId ? db.companies.find((c) => c.id === u.companyId) : null;
  const roleInfo = u.roleIds
    .map((rid) => db.roles.find((r) => r.id === rid))
    .filter((r): r is InternalRole => Boolean(r))
    .map((r) => ({ id: r.id, name: r.name }));

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    age: u.age,
    address: u.address,
    gender: u.gender,
    avatar: u.avatar,
    companyInfo: comp ? { id: comp.id, name: comp.name } : null,
    roleInfo,
  };
}

function toRoleResponse(r: InternalRole): RoleResponseDTO {
  const perms = r.permissionIds
    .map((pid) => db.permissions.find((p) => p.id === pid))
    .filter((p): p is PermissionResponseDTO => Boolean(p))
    .map((p) => ({ ...p }));
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: perms,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function nextId(items: { id: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function randomHex(len = 16): string {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export const mockStore = {
  reset(): void {
    db = createInitialDb();
  },

  getPreviewUrl(fileName: string | null | undefined): string | null {
    if (!fileName) return null;
    return db.previews[fileName] ?? null;
  },

  // Dashboard
  getDashboard(): DashboardResponse {
    return {
      totalUsers: db.users.length,
      totalCompanies: db.companies.length,
      totalRoles: db.roles.length,
      totalPermissions: db.permissions.length,
    };
  },

  // Auth
  getAuthSession(): AuthSession {
    return { ...db.auth };
  },

  getCurrentUser(): UserResponseDTO {
    if (!db.auth.loggedIn || !db.auth.accessToken) {
      throw new ApiError(401, 'Chưa đăng nhập phiên Demo', 'Unauthorized');
    }
    const found = db.users.find(
      (u) => u.email.toLowerCase() === db.auth.email.trim().toLowerCase(),
    );
    if (!found) {
      throw new ApiError(404, `Không tìm thấy nhân sự ${db.auth.email}`, 'NOT_FOUND');
    }
    return toUserResponse(found);
  },

  login(req: LoginRequestDTO): LoginResponseDTO {
    const email = req.email.trim();
    if (!email || !req.password || req.password.length < 6) {
      throw new ApiError(400, 'Email và mật khẩu (tối thiểu 6 ký tự) không hợp lệ', 'Bad Request');
    }
    const tokenPayload = btoa(
      unescape(encodeURIComponent(JSON.stringify({ sub: email, iat: Math.floor(Date.now() / 1000) }))),
    ).replace(/=+$/, '');
    const accessToken = `eyJhbGciOiJIUzI1NiJ9.${tokenPayload}.sig_${randomHex(10)}`;
    const refreshToken = `rt_${randomHex(24)}`;
    db.auth = {
      ...db.auth,
      loggedIn: true,
      email,
      accessToken,
      refreshToken,
    };
    return { accessToken, refreshToken };
  },

  register(req: RegisterRequest): RegisterResponse {
    const name = req.name.trim();
    const email = req.email.trim();
    const address = req.address.trim();

    if (name.length < 2 || name.length > 100) {
      throw new ApiError(400, 'Họ tên phải từ 2 đến 100 ký tự', 'Bad Request');
    }
    if (!req.password || req.password.length < 8) {
      throw new ApiError(400, 'Mật khẩu phải từ 8 ký tự trở lên', 'Bad Request');
    }
    if (utf8ByteLength(req.password) > 72) {
      throw new ApiError(400, 'Password không được vượt quá 72 byte UTF-8', 'Bad Request', [
        'password: Password không được vượt quá 72 byte UTF-8',
      ]);
    }
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new ApiError(409, `Email "${email}" đã tồn tại trong hệ thống`, 'Conflict');
    }

    const now = new Date().toISOString();
    const employeeRole = db.roles.find((r) => r.name === 'EMPLOYEE');
    const created: InternalUser = {
      id: nextId(db.users),
      name,
      email,
      password: req.password,
      age: req.age ?? 24,
      gender: req.gender ?? 'OTHER',
      address,
      avatar: null,
      companyId: null,
      roleIds: employeeRole ? [employeeRole.id] : [],
      createdAt: now,
      updatedAt: now,
    };
    db.users.push(created);

    return {
      id: created.id,
      name: created.name,
      email: created.email,
      age: created.age,
      address: created.address,
      createdAt: created.createdAt,
      updateAt: created.updatedAt,
    };
  },

  refresh(providedRefreshToken?: string): LoginResponseDTO {
    const token = providedRefreshToken || db.auth.refreshToken;
    if (!db.auth.loggedIn || !token) {
      throw new ApiError(401, 'Thiếu refresh token hợp lệ', 'Unauthorized');
    }
    const nextRefresh = `rt_${randomHex(24)}`;
    const nextAccess = `eyJhbGciOiJIUzI1NiJ9.${btoa(
      JSON.stringify({ sub: db.auth.email, rot: Date.now() }),
    ).replace(/=+$/, '')}.sig_${randomHex(10)}`;
    db.auth = {
      ...db.auth,
      loggedIn: true,
      accessToken: nextAccess,
      refreshToken: nextRefresh,
    };
    return { accessToken: nextAccess, refreshToken: nextRefresh };
  },

  logout(): string {
    db.auth = {
      ...db.auth,
      loggedIn: false,
      accessToken: null,
      refreshToken: null,
    };
    return 'Logout successfully';
  },

  // Users
  listUsers(filter: UserFilterDTO = {}): PageResponseDTO<UserResponseDTO> {
    const nameQ = (filter.name ?? '').trim().toLowerCase();
    const emailQ = (filter.email ?? '').trim().toLowerCase();

    const filtered = db.users.filter((u) => {
      if (nameQ && emailQ && nameQ === emailQ) {
        // Support combined query when caller passes same keyword into name & email
        if (!u.name.toLowerCase().includes(nameQ) && !u.email.toLowerCase().includes(emailQ)) {
          return false;
        }
      } else {
        if (nameQ && !u.name.toLowerCase().includes(nameQ)) return false;
        if (emailQ && !u.email.toLowerCase().includes(emailQ)) return false;
      }
      if (filter.gender && u.gender !== filter.gender) return false;
      if (filter.age !== undefined && u.age !== filter.age) return false;
      if (filter.minAge !== undefined && (u.age === null || u.age < filter.minAge)) return false;
      if (filter.maxAge !== undefined && (u.age === null || u.age > filter.maxAge)) return false;
      return true;
    });

    const mapped = filtered.map(toUserResponse);
    return paginate(mapped, filter.page ?? 1, filter.size ?? 10);
  },

  getUserById(id: number): UserResponseDTO {
    const found = db.users.find((u) => u.id === id);
    if (!found) throw new ApiError(404, `Không tìm thấy nhân sự #${id}`, 'NOT_FOUND');
    return toUserResponse(found);
  },

  createUser(req: UserRequestDTO): UserResponseDTO {
    const name = req.name.trim();
    const email = req.email.trim();
    if (name.length < 2 || name.length > 100) {
      throw new ApiError(400, 'Tên nhân sự phải từ 2 đến 100 ký tự', 'Bad Request');
    }
    if (!req.password || req.password.length < 6) {
      throw new ApiError(400, 'Mật khẩu tối thiểu 6 ký tự', 'Bad Request');
    }
    if (utf8ByteLength(req.password) > 72) {
      throw new ApiError(400, 'Password không được vượt quá 72 byte UTF-8', 'Bad Request');
    }
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new ApiError(409, `Email "${email}" đã được sử dụng`, 'Conflict');
    }
    if (req.companyId && !db.companies.some((c) => c.id === req.companyId)) {
      throw new ApiError(404, `Không tìm thấy công ty #${req.companyId}`, 'NOT_FOUND');
    }

    const now = new Date().toISOString();
    const created: InternalUser = {
      id: nextId(db.users),
      name,
      email,
      password: req.password,
      age: req.age ?? null,
      gender: req.gender ?? 'OTHER',
      address: req.address.trim(),
      avatar: req.avatar || null,
      companyId: req.companyId ?? null,
      roleIds: Array.from(new Set(req.roleIDs ?? [])),
      createdAt: now,
      updatedAt: now,
    };
    db.users.push(created);
    return toUserResponse(created);
  },

  updateUser(id: number, req: UserRequestDTO): UserResponseDTO {
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new ApiError(404, `Không tìm thấy nhân sự #${id}`, 'NOT_FOUND');

    const email = req.email.trim();
    if (db.users.some((u) => u.id !== id && u.email.toLowerCase() === email.toLowerCase())) {
      throw new ApiError(409, `Email "${email}" đã tồn tại`, 'Conflict');
    }
    if (req.password && utf8ByteLength(req.password) > 72) {
      throw new ApiError(400, 'Password không được vượt quá 72 byte UTF-8', 'Bad Request');
    }

    const existing = db.users[idx];
    const updated: InternalUser = {
      ...existing,
      name: req.name.trim(),
      email,
      password: req.password || existing.password,
      age: req.age ?? existing.age,
      gender: req.gender ?? existing.gender,
      address: req.address.trim(),
      avatar: req.avatar !== undefined ? req.avatar : existing.avatar,
      companyId: req.companyId !== undefined ? req.companyId : existing.companyId,
      roleIds: Array.from(new Set(req.roleIDs ?? [])),
      updatedAt: new Date().toISOString(),
    };
    db.users[idx] = updated;
    return toUserResponse(updated);
  },

  deleteUser(id: number): string {
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new ApiError(404, `Không tìm thấy nhân sự #${id}`, 'NOT_FOUND');
    db.users.splice(idx, 1);
    return 'Delete Success';
  },

  // Companies
  listCompanies(filter: CompanyFilterDTO = {}): PageResponseDTO<CompanyResponseDTO> {
    const nameQ = (filter.name ?? '').trim().toLowerCase();
    const addrQ = (filter.address ?? '').trim().toLowerCase();
    const descQ = (filter.description ?? '').trim().toLowerCase();
    const logoQ = (filter.logo ?? '').trim().toLowerCase();

    const filtered = db.companies
      .filter((c) => {
        if (nameQ && !c.name.toLowerCase().includes(nameQ)) return false;
        if (addrQ && !c.address.toLowerCase().includes(addrQ)) return false;
        if (descQ && !c.description.toLowerCase().includes(descQ)) return false;
        if (logoQ && !c.logo.toLowerCase().includes(logoQ)) return false;
        return true;
      })
      .map((c) => ({ ...c }));

    return paginate(filtered, filter.page ?? 1, filter.size ?? 10);
  },

  getCompanyById(id: number): CompanyResponseDTO {
    const found = db.companies.find((c) => c.id === id);
    if (!found) throw new ApiError(404, `Không tìm thấy công ty #${id}`, 'NOT_FOUND');
    return { ...found };
  },

  createCompany(req: CompanyRequestDTO): CompanyResponseDTO {
    const name = req.name.trim();
    if (!name || !req.description.trim() || !req.address.trim() || !req.logo.trim()) {
      throw new ApiError(400, 'Tên, mô tả, địa chỉ và logo công ty không được để trống', 'Bad Request');
    }
    if (db.companies.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError(409, `Công ty "${name}" đã tồn tại`, 'Conflict');
    }
    const now = new Date().toISOString();
    const created: CompanyResponseDTO = {
      id: nextId(db.companies),
      name,
      description: req.description.trim(),
      address: req.address.trim(),
      logo: req.logo.trim(),
      createdAt: now,
      updatedAt: now,
    };
    db.companies.push(created);
    return { ...created };
  },

  updateCompany(id: number, req: CompanyRequestDTO): CompanyResponseDTO {
    const idx = db.companies.findIndex((c) => c.id === id);
    if (idx === -1) throw new ApiError(404, `Không tìm thấy công ty #${id}`, 'NOT_FOUND');

    const name = req.name.trim();
    if (db.companies.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError(409, `Công ty "${name}" đã tồn tại`, 'Conflict');
    }
    const updated: CompanyResponseDTO = {
      ...db.companies[idx],
      name,
      description: req.description.trim(),
      address: req.address.trim(),
      logo: req.logo.trim(),
      updatedAt: new Date().toISOString(),
    };
    db.companies[idx] = updated;
    return { ...updated };
  },

  deleteCompany(id: number): string {
    const idx = db.companies.findIndex((c) => c.id === id);
    if (idx === -1) throw new ApiError(404, `Không tìm thấy công ty #${id}`, 'NOT_FOUND');
    db.companies.splice(idx, 1);
    db.users.forEach((u) => {
      if (u.companyId === id) u.companyId = null;
    });
    return 'Delete successfully';
  },

  // Roles
  listRoles(filter: RoleFilterDTO = {}): PageResponseDTO<RoleResponseDTO> {
    const nameQ = (filter.name ?? '').trim().toLowerCase();
    const descQ = (filter.description ?? '').trim().toLowerCase();
    const permIds = filter.permissionIds ?? [];

    const filtered = db.roles
      .filter((r) => {
        if (nameQ && !r.name.toLowerCase().includes(nameQ)) return false;
        if (descQ && !r.description.toLowerCase().includes(descQ)) return false;
        if (permIds.length > 0 && !permIds.some((pid) => r.permissionIds.includes(pid))) {
          return false;
        }
        return true;
      })
      .map(toRoleResponse);

    return paginate(filtered, filter.page ?? 1, filter.size ?? 20);
  },

  getRoleById(id: number): RoleResponseDTO {
    const found = db.roles.find((r) => r.id === id);
    if (!found) throw new ApiError(404, `Không tìm thấy vai trò #${id}`, 'NOT_FOUND');
    return toRoleResponse(found);
  },

  createRole(req: RoleRequestDTO): RoleResponseDTO {
    const name = req.name.trim();
    if (!name || !req.description.trim()) {
      throw new ApiError(400, 'Tên vai trò và mô tả không được để trống', 'Bad Request');
    }
    if (db.roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError(409, `Vai trò "${name}" đã tồn tại`, 'Conflict');
    }
    const now = new Date().toISOString();
    const created: InternalRole = {
      id: nextId(db.roles),
      name,
      description: req.description.trim(),
      permissionIds: Array.from(new Set(req.permissionIds ?? [])),
      createdAt: now,
      updatedAt: now,
    };
    db.roles.push(created);
    return toRoleResponse(created);
  },

  updateRole(id: number, req: RoleRequestDTO): RoleResponseDTO {
    const idx = db.roles.findIndex((r) => r.id === id);
    if (idx === -1) throw new ApiError(404, `Không tìm thấy vai trò #${id}`, 'NOT_FOUND');

    const name = req.name.trim();
    if (db.roles.some((r) => r.id !== id && r.name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError(409, `Vai trò "${name}" đã tồn tại`, 'Conflict');
    }
    const updated: InternalRole = {
      ...db.roles[idx],
      name,
      description: req.description.trim(),
      permissionIds: Array.from(new Set(req.permissionIds ?? [])),
      updatedAt: new Date().toISOString(),
    };
    db.roles[idx] = updated;
    return toRoleResponse(updated);
  },

  deleteRole(id: number): string {
    const idx = db.roles.findIndex((r) => r.id === id);
    if (idx === -1) throw new ApiError(404, `Không tìm thấy vai trò #${id}`, 'NOT_FOUND');
    db.roles.splice(idx, 1);
    db.users.forEach((u) => {
      u.roleIds = u.roleIds.filter((rid) => rid !== id);
    });
    return 'Delete successfully';
  },

  // Permissions
  listPermissions(filter: PermissionFilterDTO = {}): PageResponseDTO<PermissionResponseDTO> {
    const nameQ = (filter.name ?? '').trim().toLowerCase();
    const methodQ = (filter.method ?? '').trim().toUpperCase();
    const moduleQ = (filter.module ?? '').trim().toUpperCase();

    const filtered = db.permissions
      .filter((p) => {
        if (
          nameQ &&
          !p.name.toLowerCase().includes(nameQ) &&
          !p.apiPath.toLowerCase().includes(nameQ)
        ) {
          return false;
        }
        if (methodQ && p.method.toUpperCase() !== methodQ) return false;
        if (moduleQ && p.module.toUpperCase() !== moduleQ) return false;
        return true;
      })
      .map((p) => ({ ...p }));

    return paginate(filtered, filter.page ?? 1, filter.size ?? 10);
  },

  getPermissionById(id: number): PermissionResponseDTO {
    const found = db.permissions.find((p) => p.id === id);
    if (!found) throw new ApiError(404, `Không tìm thấy quyền hạn #${id}`, 'NOT_FOUND');
    return { ...found };
  },

  createPermission(req: PermissionRequestDTO): PermissionResponseDTO {
    const name = req.name.trim();
    const apiPath = req.apiPath.trim();
    const method = req.method.trim().toUpperCase();
    const module = req.module.trim().toUpperCase();

    if (!name || !apiPath) {
      throw new ApiError(400, 'Tên quyền và apiPath không được để trống', 'Bad Request');
    }
    if (!HTTP_METHODS.includes(method as (typeof HTTP_METHODS)[number])) {
      throw new ApiError(400, `Method "${method}" không thuộc allowlist (${HTTP_METHODS.join(', ')})`, 'Bad Request');
    }
    if (!module || module.length > 255) {
      throw new ApiError(400, 'Module không được để trống và tối đa 255 ký tự', 'Bad Request');
    }
    // Exact backend rule: case-sensitive api_path + method uniqueness
    if (db.permissions.some((p) => p.apiPath === apiPath && p.method.toUpperCase() === method)) {
      throw new ApiError(
        409,
        `Quyền hạn (${method} ${apiPath}) đã tồn tại (vi phạm unique constraint api_path + method)`,
        'Conflict',
      );
    }

    const now = new Date().toISOString();
    const created: PermissionResponseDTO = {
      id: nextId(db.permissions),
      name,
      apiPath,
      method,
      module,
      createdAt: now,
      updatedAt: now,
    };
    db.permissions.push(created);
    return { ...created };
  },

  updatePermission(id: number, req: PermissionRequestDTO): PermissionResponseDTO {
    const idx = db.permissions.findIndex((p) => p.id === id);
    if (idx === -1) throw new ApiError(404, `Không tìm thấy quyền hạn #${id}`, 'NOT_FOUND');

    const name = req.name.trim();
    const apiPath = req.apiPath.trim();
    const method = req.method.trim().toUpperCase();
    const module = req.module.trim().toUpperCase();

    if (!name || !apiPath) {
      throw new ApiError(400, 'Tên quyền và apiPath không được để trống', 'Bad Request');
    }
    if (!HTTP_METHODS.includes(method as (typeof HTTP_METHODS)[number])) {
      throw new ApiError(400, `Method "${method}" không hợp lệ`, 'Bad Request');
    }
    if (!module || module.length > 255) {
      throw new ApiError(400, 'Module không được để trống và tối đa 255 ký tự', 'Bad Request');
    }
    if (
      db.permissions.some(
        (p) => p.id !== id && p.apiPath === apiPath && p.method.toUpperCase() === method,
      )
    ) {
      throw new ApiError(409, `Quyền hạn (${method} ${apiPath}) đã tồn tại`, 'Conflict');
    }

    const updated: PermissionResponseDTO = {
      ...db.permissions[idx],
      name,
      apiPath,
      method,
      module,
      updatedAt: new Date().toISOString(),
    };
    db.permissions[idx] = updated;
    return { ...updated };
  },

  deletePermission(id: number): string {
    const idx = db.permissions.findIndex((p) => p.id === id);
    if (idx === -1) throw new ApiError(404, `Không tìm thấy quyền hạn #${id}`, 'NOT_FOUND');
    db.permissions.splice(idx, 1);
    db.roles.forEach((r) => {
      r.permissionIds = r.permissionIds.filter((pid) => pid !== id);
    });
    return 'Delete successfully';
  },

  // File Upload simulation with FileReader dataURL
  async uploadFile(file: File, folder: UploadFolder): Promise<FileUploadResponse> {
    if (folder !== 'avatars' && folder !== 'logos') {
      throw new ApiError(400, 'Folder chỉ chấp nhận avatars hoặc logos', 'Bad Request');
    }
    if (file.size > 8_242_880) {
      throw new ApiError(400, 'Kích thước tệp vượt quá giới hạn 8MB', 'Bad Request');
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}-${safeName}`;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new ApiError(500, 'Không thể đọc tệp ảnh trong chế độ Demo'));
      reader.readAsDataURL(file);
    });

    db.previews[fileName] = dataUrl;
    return {
      fileName,
      folder,
      fileUrl: `/uploads/${folder}/${fileName}`,
      size: file.size,
      uploadAt: new Date().toISOString(),
    };
  },
};
