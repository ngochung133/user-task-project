import React, { useMemo, useState } from 'react';
import {
  Building2,
  Code2,
  KeyRound,
  LayoutGrid,
  Lock,
  LogOut,
  Menu,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AppRoute } from '../../types/hr';
import { UserAvatar } from '../ui/Badges';

interface RouteContractMeta {
  title: string;
  endpoint: string;
  desc: string;
  sample: Record<string, unknown>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    route,
    dataMode,
    authSession,
    currentUser,
    counts,
    selectedRoleId,
    navigate,
    switchDataMode,
    triggerRefresh,
    resetDemo,
  } = useApp();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showApiInspector, setShowApiInspector] = useState(false);

  const contract = useMemo<RouteContractMeta>(() => {
    switch (route) {
      case 'dashboard':
        return {
          title: 'Tổng quan',
          endpoint: 'GET /api/v1/dashboard',
          desc: 'DashboardController trả về DashboardResponse trong ApiResponse wrapper.',
          sample: {
            statusCode: 200,
            message: 'Lấy thông tin dashboard thành công',
            data: counts,
          },
        };
      case 'users':
        return {
          title: 'Nhân sự',
          endpoint: 'GET /api/v1/users',
          desc: 'Hỗ trợ Pageable (1-based) + UserFilterDTO (name, email, age, minAge, maxAge, gender). Tạo/cập nhật dùng UserRequestDTO với trường roleIDs.',
          sample: {
            endpoint: '/api/v1/users?page=1&size=5',
            requestDto: {
              name: 'Nguyễn Ngọc Hưng',
              email: 'hung.nguyen@techcorp.vn',
              password: '******',
              age: 27,
              gender: 'MALE',
              address: 'Đống Đa, Hà Nội',
              companyId: 1,
              roleIDs: [1],
            },
          },
        };
      case 'companies':
        return {
          title: 'Công ty',
          endpoint: 'GET /api/v1/companies',
          desc: 'CompanyController phân trang qua PageResponseDTO + CompanyFilterDTO. Logo tải lên trước qua POST /api/v1/files?folder=logos rồi lưu tên file.',
          sample: {
            step1Upload: 'POST /api/v1/files (multipart: file, folder="logos")',
            step2Payload: {
              name: 'TechCorp Vietnam',
              description: 'Phát triển nền tảng quản trị doanh nghiệp...',
              address: '36 Hoàng Cầu, Đống Đa, Hà Nội',
              logo: 'techcorp-logo.svg',
            },
          },
        };
      case 'roles':
        return {
          title: 'Vai trò & Ma trận RBAC',
          endpoint: 'GET /api/v1/roles',
          desc: 'RoleController hỗ trợ lọc name, description, permissionIds. Mỗi Role sở hữu danh sách Permission qua bảng nối role_permission.',
          sample: {
            selectedRoleId,
            roleRequestDto: {
              name: 'HR_MANAGER',
              description: 'Quản lý hồ sơ nhân sự và thông tin công ty trực thuộc.',
              permissionIds: [1, 2, 3, 4, 5, 6, 7],
            },
          },
        };
      case 'permissions':
        return {
          title: 'Quyền hạn API',
          endpoint: 'GET /api/v1/permissions',
          desc: 'Unique constraint (api_path, method) với collation phân biệt hoa thường trên api_path; các module chuẩn gồm AUTH, USER, COMPANY, PERMISSION, ROLE, FILE (và hỗ trợ module động từ backend).',
          sample: {
            permissionRequestDto: {
              name: 'Xem danh sách nhân sự',
              apiPath: '/api/v1/users',
              method: 'GET',
              module: 'USER',
            },
          },
        };
      case 'auth':
        return {
          title: 'Xác thực & Token',
          endpoint: 'POST /api/v1/auth/*',
          desc: 'Đăng nhập cấp Bearer accessToken và set HttpOnly refresh_token cookie (Path=/api/v1/auth). GET /api/v1/auth/me trả về hồ sơ người dùng hiện tại.',
          sample: {
            endpoints: [
              'POST /api/v1/auth/login',
              'POST /api/v1/auth/register',
              'POST /api/v1/auth/refresh',
              'POST /api/v1/auth/logout',
              'GET /api/v1/auth/me',
            ],
            dataMode,
            loggedIn: authSession.loggedIn,
          },
        };
    }
  }, [route, counts, selectedRoleId, dataMode, authSession.loggedIn]);

  const handleNav = (target: AppRoute) => {
    navigate(target);
    setMobileNavOpen(false);
  };

  const navBtnClass = (target: AppRoute) =>
    `${
      route === target ? 'nav-item-active' : 'nav-item'
    } w-full flex items-center justify-between px-3 py-2 text-sm focus-ring cursor-pointer`;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-canvas text-ink">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 drawer-backdrop lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 bg-canvas border-r border-hairline flex flex-col justify-between transform transition-transform duration-200 lg:translate-x-0 lg:static ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-hairline">
            <button
              type="button"
              onClick={() => handleNav('dashboard')}
              className="flex items-center gap-2.5 text-left focus-ring rounded-full cursor-pointer min-w-0"
            >
              <span className="w-8 h-8 rounded-lg bg-inverse flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold tracking-tight text-ink truncate">
                  HR Management
                </span>
                <span className="block text-xs font-mono uppercase tracking-wider text-ink-soft truncate">
                  API v1
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden w-9 h-9 rounded-full bg-soft flex items-center justify-center text-ink focus-ring cursor-pointer"
              aria-label="Đóng thanh điều hướng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1" aria-label="Điều hướng chính">
            <div className="px-3 pt-1 pb-1.5 text-xs font-mono uppercase tracking-wider text-ink-soft">
              Vận hành
            </div>
            <button
              type="button"
              onClick={() => handleNav('dashboard')}
              className={navBtnClass('dashboard')}
            >
              <span className="flex items-center gap-2.5">
                <LayoutGrid className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>Tổng quan</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleNav('users')}
              className={navBtnClass('users')}
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>Nhân sự</span>
              </span>
              <span className="text-xs font-mono tabular-nums px-2 py-0.5 badge-lime">
                {counts.totalUsers}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleNav('companies')}
              className={navBtnClass('companies')}
            >
              <span className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>Công ty</span>
              </span>
              <span className="text-xs font-mono tabular-nums px-2 py-0.5 badge-cream">
                {counts.totalCompanies}
              </span>
            </button>

            <div className="px-3 pt-4 pb-1.5 text-xs font-mono uppercase tracking-wider text-ink-soft">
              Phân quyền (RBAC)
            </div>
            <button
              type="button"
              onClick={() => handleNav('roles')}
              className={navBtnClass('roles')}
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>Vai trò &amp; Ma trận</span>
              </span>
              <span className="text-xs font-mono tabular-nums px-2 py-0.5 badge-lilac">
                {counts.totalRoles}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleNav('permissions')}
              className={navBtnClass('permissions')}
            >
              <span className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>Quyền hạn API</span>
              </span>
              <span className="text-xs font-mono tabular-nums px-2 py-0.5 badge-mint">
                {counts.totalPermissions}
              </span>
            </button>

            <div className="px-3 pt-4 pb-1.5 text-xs font-mono uppercase tracking-wider text-ink-soft">
              Bảo mật
            </div>
            <button
              type="button"
              onClick={() => handleNav('auth')}
              className={navBtnClass('auth')}
            >
              <span className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>Xác thực &amp; Token</span>
              </span>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: authSession.loggedIn
                    ? 'var(--fg-success)'
                    : 'var(--fg-magenta)',
                }}
                title={authSession.loggedIn ? 'Phiên JWT đang bật' : 'Chưa đăng nhập'}
              />
            </button>
          </nav>
        </div>

        {/* Current User Footer */}
        <div className="p-3 border-t border-hairline">
          <div className="tile-soft space-y-2.5">
            <div className="flex items-center gap-2.5">
              {authSession.loggedIn ? (
                <UserAvatar
                  id={currentUser?.id ?? 0}
                  name={currentUser?.name || authSession.email || 'User'}
                  avatar={currentUser?.avatar}
                  sizeClass="w-9 h-9 text-xs"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg badge-cream border border-hairline flex items-center justify-center text-xs font-semibold text-ink shrink-0">
                  ??
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink truncate">
                  {authSession.loggedIn
                    ? currentUser?.name || authSession.email
                    : 'Chưa đăng nhập'}
                </p>
                <p className="text-xs text-ink-soft truncate">
                  {authSession.loggedIn
                    ? currentUser?.email ||
                      (dataMode === 'live' ? 'Live JWT đang bật' : 'Demo JWT đang bật')
                    : dataMode === 'live'
                      ? 'Cần đăng nhập Live API'
                      : 'Cần đăng nhập Auth'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleNav('auth')}
                className="w-8 h-8 rounded-full bg-canvas border border-hairline flex items-center justify-center text-ink hover:bg-soft focus-ring cursor-pointer shrink-0"
                title="Xem màn hình Đăng nhập / Phiên"
                aria-label="Mở màn hình Xác thực & Token"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
            {authSession.loggedIn && (
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-hairline">
                <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-mono font-semibold badge-lilac truncate max-w-[144px]">
                  {currentUser?.roleInfo?.[0]?.name ??
                    (dataMode === 'live' ? 'LIVE JWT' : 'DEMO JWT')}
                </span>
                <span className="text-xs font-mono text-ink-soft uppercase">
                  {dataMode === 'live' ? 'Live' : 'Demo'}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar (56px monochrome nav) */}
        <header className="h-14 px-4 sm:px-6 border-b border-hairline bg-canvas flex items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden w-9 h-9 rounded-full bg-soft flex items-center justify-center text-ink focus-ring cursor-pointer shrink-0"
              aria-label="Mở menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0 text-sm">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-soft hidden sm:inline">
                hr-management
              </span>
              <span className="text-ink-soft hidden sm:inline">/</span>
              <span className="font-semibold text-ink truncate">{contract.title}</span>
            </div>
            <span className="hidden xl:inline-flex items-center px-2.5 py-0.5 font-mono text-xs badge-soft whitespace-nowrap">
              {contract.endpoint}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Demo / Live API Pill Toggle */}
            <div
              className="inline-flex items-center p-0.5 rounded-full border border-hairline bg-soft"
              role="group"
              aria-label="Chế độ nguồn dữ liệu"
            >
              <button
                type="button"
                onClick={() => switchDataMode('demo')}
                className={`px-2.5 py-1 text-xs focus-ring cursor-pointer transition-colors ${
                  dataMode === 'demo' ? 'tab-pill-selected' : 'tab-pill-default bg-transparent'
                }`}
              >
                Demo
              </button>
              <button
                type="button"
                onClick={() => switchDataMode('live')}
                className={`px-2.5 py-1 text-xs focus-ring cursor-pointer transition-colors flex items-center gap-1.5 ${
                  dataMode === 'live' ? 'tab-pill-selected' : 'tab-pill-default bg-transparent'
                }`}
                title="Kết nối trực tiếp Spring Boot API tại http://localhost:8080"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      dataMode === 'live' ? 'var(--fg-block-lime)' : 'var(--fg-success)',
                  }}
                />
                <span>Live API</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowApiInspector((v) => !v)}
              className={`${
                showApiInspector ? 'tab-pill-selected' : 'btn-secondary'
              } px-3 py-1.5 text-xs flex items-center gap-1.5 focus-ring cursor-pointer`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hợp đồng API</span>
            </button>

            {dataMode === 'demo' ? (
              <button
                type="button"
                onClick={resetDemo}
                className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 focus-ring cursor-pointer"
                title="Khôi phục dữ liệu mẫu ban đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Đặt lại mẫu</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={triggerRefresh}
                className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 focus-ring cursor-pointer"
                title="Tải lại dữ liệu từ Spring Boot API"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Tải lại</span>
              </button>
            )}
          </div>
        </header>

        {/* Signature Static Monochrome Context Strip */}
        <div className="marquee-strip flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
            <span className="font-mono uppercase tracking-wider">FIGMA DESIGN SYSTEM</span>
            <span aria-hidden="true">·</span>
            <span className="sm:hidden">
              {dataMode === 'live' ? 'Live HR API' : 'HR API · Demo'}
            </span>
            <span className="hidden sm:inline">
              {dataMode === 'live'
                ? 'Live Spring Boot 4.1 API (localhost:8080)'
                : 'Spring Boot 4.1 HR API · Demo Mode'}
            </span>
            <span className="hidden xl:inline" aria-hidden="true">
              ·
            </span>
            <span className="hidden xl:inline font-mono">
              USER · COMPANY · ROLE · PERMISSION · AUTH · FILES
            </span>
          </div>
          <span className="font-mono text-xs uppercase tracking-wider shrink-0 hidden 2xl:inline">
            MONOCHROME + COLOR BLOCKS
          </span>
        </div>

        {/* Collapsible API Contract Inspector */}
        {showApiInspector && (
          <section className="border-b border-hairline bg-soft px-4 sm:px-6 py-3 inspector-reveal">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 max-w-[1280px] mx-auto">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-ink">
                    Spring Boot Endpoint &amp; DTO đang ánh xạ
                  </span>
                  <span className="font-mono text-xs px-2.5 py-0.5 badge-black">
                    {contract.endpoint}
                  </span>
                  <span className="font-mono text-xs px-2.5 py-0.5 badge-lime uppercase">
                    {dataMode}
                  </span>
                </div>
                <p className="text-xs text-ink-soft">{contract.desc}</p>
              </div>
              <pre className="text-xs font-mono text-ink bg-canvas border border-hairline rounded-lg p-3 overflow-x-auto max-w-full lg:max-w-xl shrink-0">
                {JSON.stringify(contract.sample, null, 2)}
              </pre>
            </div>
          </section>
        )}

        {/* Page View Container */}
        <main
          key={`${route}-${dataMode}`}
          className="flex-1 p-4 sm:p-6 space-y-6 max-w-[1280px] w-full mx-auto view-enter"
        >
          {dataMode === 'live' && !authSession.loggedIn && route !== 'auth' && (
            <section
              aria-label="Yêu cầu đăng nhập Live API"
              className="card-hairline-md bg-block-cream p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 text-xs font-mono font-semibold badge-black uppercase">
                    Live API
                  </span>
                  <p className="text-sm font-semibold text-ink">
                    Chưa đăng nhập phiên Spring Boot JWT
                  </p>
                </div>
                <p className="text-xs text-ink-soft">
                  Chế độ Live kết nối trực tiếp tới{' '}
                  <span className="font-mono">http://localhost:8080</span>. Hãy đăng nhập bằng tài
                  khoản seed (ví dụ <span className="font-mono">admin@example.com</span> /{' '}
                  <span className="font-mono">123456</span>) để lấy Bearer JWT và tải dữ liệu thực.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('auth')}
                  className="btn-primary px-4 py-2 text-xs focus-ring cursor-pointer whitespace-nowrap"
                >
                  Đăng nhập Live API
                </button>
                <button
                  type="button"
                  onClick={() => switchDataMode('demo')}
                  className="btn-secondary px-4 py-2 text-xs focus-ring cursor-pointer whitespace-nowrap"
                >
                  Dùng chế độ Demo
                </button>
              </div>
            </section>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
