import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Eye, EyeOff, LogOut, RefreshCw } from 'lucide-react';
import { ApiError } from '../api/client';
import { authApi } from '../api/hrService';
import { JwtPayloadViewer } from '../components/rbac/JwtPayloadViewer';
import { UserAvatar } from '../components/ui/Badges';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { GENDERS, type DataMode, type GenderEnum } from '../types/hr';
import { genderLabel, utf8ByteLength } from '../utils/format';

type AuthTab = 'login' | 'register' | 'session';

const DEMO_CREDENTIALS = [
  {
    label: 'SUPER_ADMIN',
    email: 'hung.nguyen@techcorp.vn',
    password: 'Admin@1234',
  },
  {
    label: 'HR_MANAGER',
    email: 'thu.tran@techcorp.vn',
    password: 'Admin@1234',
  },
] as const;

const LIVE_CREDENTIALS = [
  {
    label: 'ADMIN',
    email: 'admin@example.com',
    password: '123456',
  },
  {
    label: 'HR',
    email: 'hr@example.com',
    password: '123456',
  },
  {
    label: 'MANAGER',
    email: 'manager@example.com',
    password: '123456',
  },
  {
    label: 'USER',
    email: 'user@example.com',
    password: '123456',
  },
] as const;

export function AuthPage() {
  const { authSession, currentUser, dataMode, refreshAuthSession, triggerRefresh } = useApp();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AuthTab>('login');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState(() => {
    if (dataMode === 'demo') {
      return authSession.email || 'hung.nguyen@techcorp.vn';
    }
    return authSession.loggedIn && authSession.email && authSession.email !== 'Phiên Live JWT'
      ? authSession.email
      : '';
  });
  const [loginPassword, setLoginPassword] = useState(() =>
    dataMode === 'demo' ? 'Admin@1234' : '',
  );
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const prevDataModeRef = useRef<DataMode>(dataMode);

  useEffect(() => {
    const modeChanged = prevDataModeRef.current !== dataMode;
    prevDataModeRef.current = dataMode;

    if (!modeChanged) return;

    if (dataMode === 'live') {
      if (!authSession.loggedIn) {
        setLoginEmail('');
        setLoginPassword('');
        setLoginError(null);
      } else {
        setLoginEmail(
          currentUser?.email ||
            (authSession.email && authSession.email !== 'Phiên Live JWT' ? authSession.email : ''),
        );
        setLoginPassword('');
        setLoginError(null);
      }
    } else {
      setLoginEmail(authSession.email || 'hung.nguyen@techcorp.vn');
      setLoginPassword('Admin@1234');
      setLoginError(null);
    }
  }, [dataMode, authSession.loggedIn, authSession.email, currentUser?.email]);

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);
  const [regAge, setRegAge] = useState('24');
  const [regGender, setRegGender] = useState<GenderEnum>('MALE');
  const [regAddress, setRegAddress] = useState('');
  const [regBusy, setRegBusy] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regDetails, setRegDetails] = useState<string[]>([]);

  // Session Panel State
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'access' | 'refresh' | null>(null);

  const pwBytes = utf8ByteLength(regPassword);
  const pwExceedsBcrypt = pwBytes > 72;
  const pwBytePct = Math.min(100, Math.round((pwBytes / 72) * 100));

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const trimmedEmail = loginEmail.trim();
    if (!trimmedEmail) {
      setLoginError('Vui lòng nhập email đăng nhập.');
      return;
    }
    if (loginPassword.length < 6) {
      setLoginError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoginBusy(true);
    try {
      await authApi.login({
        email: trimmedEmail,
        password: loginPassword,
      });
      refreshAuthSession();
      triggerRefresh();
      setActiveTab('session');
      showToast(`Đăng nhập thành công với ${trimmedEmail}.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.fullMessage : 'Đăng nhập thất bại.';
      setLoginError(msg);
      showToast(msg, 'error');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegDetails([]);

    const trimmedName = regName.trim();
    const trimmedEmail = regEmail.trim();
    const trimmedAddress = regAddress.trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setRegError('Họ và tên phải từ 2 đến 100 ký tự.');
      return;
    }
    if (!trimmedEmail) {
      setRegError('Email không được để trống.');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('Mật khẩu đăng ký phải có tối thiểu 8 ký tự.');
      return;
    }
    if (pwExceedsBcrypt) {
      const msg = `Mật khẩu dài ${pwBytes} / 72 byte UTF-8 (vượt giới hạn BCrypt). Vui lòng rút ngắn mật khẩu.`;
      setRegError(msg);
      showToast(msg, 'error');
      return;
    }
    const parsedAge = regAge.trim() ? Number(regAge) : null;
    if (parsedAge !== null && (Number.isNaN(parsedAge) || parsedAge < 1 || parsedAge > 150)) {
      setRegError('Tuổi hợp lệ phải từ 1 đến 150.');
      return;
    }
    if (!trimmedAddress || trimmedAddress.length > 255) {
      setRegError('Địa chỉ không được để trống và tối đa 255 ký tự.');
      return;
    }

    setRegBusy(true);
    try {
      const created = await authApi.register({
        name: trimmedName,
        email: trimmedEmail,
        password: regPassword,
        age: parsedAge,
        gender: regGender,
        address: trimmedAddress,
      });
      setLoginEmail(created.email);
      setLoginPassword('');
      setRegPassword('');
      setActiveTab('login');
      triggerRefresh();
      showToast(`Đăng ký thành công tài khoản ${created.email}.`);
    } catch (err) {
      if (err instanceof ApiError) {
        setRegError(err.message);
        setRegDetails(err.details);
        showToast(err.fullMessage, 'error');
      } else {
        const msg = 'Không thể đăng ký tài khoản mới.';
        setRegError(msg);
        showToast(msg, 'error');
      }
    } finally {
      setRegBusy(false);
    }
  };

  const handleRefreshToken = async () => {
    setSessionError(null);
    setRefreshBusy(true);
    try {
      await authApi.refresh();
      refreshAuthSession();
      triggerRefresh();
      showToast('Đã xoay vòng Refresh Token mới (POST /api/v1/auth/refresh).');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.fullMessage
          : 'Không thể làm mới token. Vui lòng đăng nhập lại.';
      setSessionError(msg);
      showToast(msg, 'error');
    } finally {
      setRefreshBusy(false);
    }
  };

  const handleLogout = async () => {
    setSessionError(null);
    setLogoutBusy(true);
    try {
      await authApi.logout();
      refreshAuthSession();
      triggerRefresh();
      showToast('Đã thu hồi refresh token và đăng xuất phiên.', 'warning');
    } catch (err) {
      refreshAuthSession();
      triggerRefresh();
      const msg =
        err instanceof ApiError ? err.fullMessage : 'Đã xóa phiên cục bộ trên trình duyệt.';
      setSessionError(msg);
      showToast(msg, 'warning');
    } finally {
      setLogoutBusy(false);
    }
  };

  const copyToken = async (value: string | null, field: 'access' | 'refresh') => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1600);
      showToast('Đã sao chép token vào clipboard.');
    } catch {
      showToast('Trình duyệt không hỗ trợ sao chép tự động.', 'warning');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header & 3-Panel Pill Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl heading-display text-ink">
            Xác thực &amp; Quản lý phiên JWT
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Đăng nhập, đăng ký kiểm tra giới hạn 72-byte BCrypt và kiểm tra vòng đời JWT / Refresh
            Token.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Chức năng xác thực"
          className="inline-flex rounded-full border border-hairline bg-canvas p-1 gap-1 self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'login'}
            onClick={() => setActiveTab('login')}
            className={`px-4 py-1.5 text-xs focus-ring cursor-pointer ${
              activeTab === 'login' ? 'tab-pill-selected' : 'tab-pill-default'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'register'}
            onClick={() => setActiveTab('register')}
            className={`px-4 py-1.5 text-xs focus-ring cursor-pointer ${
              activeTab === 'register' ? 'tab-pill-selected' : 'tab-pill-default'
            }`}
          >
            Đăng ký
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'session'}
            onClick={() => setActiveTab('session')}
            className={`px-4 py-1.5 text-xs flex items-center gap-2 focus-ring cursor-pointer ${
              activeTab === 'session' ? 'tab-pill-selected' : 'tab-pill-default'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: authSession.loggedIn
                  ? 'var(--fg-success)'
                  : 'var(--fg-magenta)',
              }}
            />
            <span>Phiên &amp; Token</span>
          </button>
        </div>
      </div>

      {/* Panel 1: Cream (#f4ecd6, #000000 ink) — Login */}
      {activeTab === 'login' && (
        <section className="color-block bg-block-cream p-6 sm:p-10">
          <div className="max-w-md mx-auto card-hairline p-6 sm:p-8 space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-ink">Đăng nhập HR Console</h2>
              <p className="text-xs text-ink-soft">
                Gửi <span className="font-mono">POST /api/v1/auth/login</span> để nhận Bearer{' '}
                <span className="font-mono">accessToken</span> và cookie{' '}
                <span className="font-mono">refresh_token</span>.
              </p>
            </div>

            {authSession.loggedIn && (
              <div className="tile-soft flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-ink">Phiên hiện tại đang bật</div>
                  <div className="text-xs font-mono text-ink-soft truncate">
                    {currentUser?.name
                      ? `${currentUser.name} · ${currentUser.email}`
                      : authSession.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('session')}
                  className="btn-secondary px-3 py-1.5 text-xs focus-ring cursor-pointer shrink-0"
                >
                  Xem JWT
                </button>
              </div>
            )}

            {dataMode === 'demo' ? (
              <div className="tile-soft space-y-2">
                <div className="text-xs font-medium text-ink">
                  Điền nhanh tài khoản Demo (mật khẩu <span className="font-mono">Admin@1234</span>):
                </div>
                <div className="flex flex-wrap gap-2">
                  {DEMO_CREDENTIALS.map((cred) => (
                    <button
                      key={cred.email}
                      type="button"
                      onClick={() => {
                        setLoginEmail(cred.email);
                        setLoginPassword(cred.password);
                        setLoginError(null);
                      }}
                      className="btn-secondary px-3 py-1.5 text-xs font-mono focus-ring cursor-pointer"
                    >
                      {cred.label}: {cred.email}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="tile-soft space-y-2">
                <div className="text-xs font-medium text-ink">
                  Điền nhanh tài khoản Live Seed (<span className="font-mono">DatabaseSeeder</span> · mật khẩu{' '}
                  <span className="font-mono">123456</span>):
                </div>
                <div className="flex flex-wrap gap-2">
                  {LIVE_CREDENTIALS.map((cred) => (
                    <button
                      key={cred.email}
                      type="button"
                      onClick={() => {
                        setLoginEmail(cred.email);
                        setLoginPassword(cred.password);
                        setLoginError(null);
                      }}
                      className="btn-secondary px-3 py-1.5 text-xs font-mono focus-ring cursor-pointer"
                    >
                      {cred.label}: {cred.email}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loginError && (
              <div
                role="alert"
                className="rounded-xl p-3 bg-block-pink border border-ink text-xs text-ink font-medium"
              >
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="auth-login-email" className="block text-xs font-medium text-ink mb-1.5">
                  Email *
                </label>
                <input
                  id="auth-login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder={dataMode === 'live' ? 'admin@example.com' : 'name@company.vn'}
                  className="input-field w-full px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-login-password"
                  className="block text-xs font-medium text-ink mb-1.5"
                >
                  Mật khẩu * (tối thiểu 6 ký tự)
                </label>
                <div className="relative">
                  <input
                    id="auth-login-password"
                    type={showLoginPw ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="input-field w-full pl-3.5 pr-11 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPw((v) => !v)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:bg-soft absolute right-1.5 top-1/2 -translate-y-1/2 focus-ring cursor-pointer"
                    aria-label={showLoginPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginBusy}
                className="btn-primary w-full py-2.5 text-sm focus-ring cursor-pointer"
              >
                {loginBusy ? 'Đang xác thực...' : 'Đăng nhập'}
              </button>
            </form>

            <div className="pt-3 border-t border-hairline flex items-center justify-between text-xs text-ink-soft">
              <span>Chưa có tài khoản?</span>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="btn-secondary px-3.5 py-1.5 text-xs focus-ring cursor-pointer"
              >
                Chuyển sang Đăng ký
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Panel 2: Lime (#dceeb1, #000000 ink) — Register */}
      {activeTab === 'register' && (
        <section className="color-block bg-block-lime p-6 sm:p-10">
          <div className="max-w-lg mx-auto card-hairline p-6 sm:p-8 space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-ink">Đăng ký tài khoản mới</h2>
              <p className="text-xs text-ink-soft">
                Ánh xạ <span className="font-mono">POST /api/v1/auth/register</span> (
                <span className="font-mono">RegisterRequest</span>) với kiểm tra độ dài UTF-8 tối
                đa 72 bytes cho BCrypt.
              </p>
            </div>

            {regError && (
              <div
                role="alert"
                className="rounded-xl p-3 bg-block-pink border border-ink text-xs text-ink space-y-1"
              >
                <div className="font-semibold">{regError}</div>
                {regDetails.length > 0 && (
                  <ul className="list-disc pl-4 space-y-0.5">
                    {regDetails.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-name" className="block text-xs font-medium text-ink mb-1.5">
                    Họ và tên *
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Trần Văn B"
                    className="input-field w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="reg-email" className="block text-xs font-medium text-ink mb-1.5">
                    Email *
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="b.tran@company.vn"
                    className="input-field w-full px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="reg-password" className="text-xs font-medium text-ink">
                    Mật khẩu * (tối thiểu 8 ký tự)
                  </label>
                  <span
                    className={`px-2.5 py-1 text-xs font-mono tabular-nums font-semibold ${
                      pwExceedsBcrypt
                        ? 'badge-pink border border-ink'
                        : pwBytes > 60
                          ? 'badge-coral'
                          : 'badge-soft'
                    }`}
                  >
                    {pwBytes} / 72 bytes UTF-8
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="reg-password"
                    type={showRegPw ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (regError) setRegError(null);
                    }}
                    placeholder="Nhập mật khẩu..."
                    className={`input-field w-full pl-3 pr-11 py-2 text-sm ${
                      pwExceedsBcrypt ? 'border-ink' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPw((v) => !v)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:bg-soft absolute right-1.5 top-1/2 -translate-y-1/2 focus-ring cursor-pointer"
                    aria-label={showRegPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="h-2 rounded-full bg-soft border border-hairline overflow-hidden">
                  <div
                    className="bar-fill-x rounded-full"
                    style={{
                      '--bar-scale': (pwBytePct / 100).toFixed(3),
                      backgroundColor: pwExceedsBcrypt
                        ? 'var(--fg-magenta)'
                        : pwBytes > 60
                          ? 'var(--fg-block-coral)'
                          : 'var(--fg-primary)',
                    } as React.CSSProperties}
                  />
                </div>

                {pwExceedsBcrypt && (
                  <div
                    role="alert"
                    className="rounded-xl p-3 bg-block-pink border border-ink text-xs text-ink font-medium"
                  >
                    Cảnh báo BCrypt: Mật khẩu đang chiếm {pwBytes} byte UTF-8 (vượt giới hạn 72
                    bytes). Hệ thống sẽ chặn gửi cho tới khi bạn rút ngắn mật khẩu.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-age" className="block text-xs font-medium text-ink mb-1.5">
                    Tuổi (1–150)
                  </label>
                  <input
                    id="reg-age"
                    type="number"
                    min={1}
                    max={150}
                    value={regAge}
                    onChange={(e) => setRegAge(e.target.value)}
                    className="input-field w-full px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="reg-gender" className="block text-xs font-medium text-ink mb-1.5">
                    Giới tính
                  </label>
                  <select
                    id="reg-gender"
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as GenderEnum)}
                    className="input-field w-full px-3 py-2 text-sm"
                  >
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {genderLabel(g)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="reg-address" className="block text-xs font-medium text-ink mb-1.5">
                  Địa chỉ *
                </label>
                <input
                  id="reg-address"
                  type="text"
                  required
                  maxLength={255}
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="Quận/Huyện, Tỉnh/Thành phố"
                  className="input-field w-full px-3 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={regBusy || pwExceedsBcrypt}
                className={`w-full py-2.5 text-sm focus-ring ${
                  pwExceedsBcrypt
                    ? 'rounded-full bg-block-pink text-ink border border-ink font-semibold cursor-not-allowed'
                    : regBusy
                      ? 'rounded-full bg-soft text-ink-soft border border-hairline font-medium cursor-not-allowed'
                      : 'btn-primary cursor-pointer'
                }`}
              >
                {regBusy
                  ? 'Đang tạo tài khoản...'
                  : pwExceedsBcrypt
                    ? 'Vượt quá 72 bytes UTF-8 — Không thể gửi'
                    : 'Tạo tài khoản'}
              </button>
            </form>

            <div className="pt-3 border-t border-hairline flex items-center justify-between text-xs text-ink-soft">
              <span>Đã có tài khoản?</span>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="btn-secondary px-3.5 py-1.5 text-xs focus-ring cursor-pointer"
              >
                Quay lại Đăng nhập
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Panel 3: Navy (#1f1d3d, #ffffff ink) — Active JWT Session */}
      {activeTab === 'session' && (
        <section className="color-block bg-block-navy p-6 sm:p-8 space-y-5">
          <div
            className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4"
            style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-semibold text-white">Trạng thái phiên xác thực</h2>
                <span
                  className={`px-3 py-1 text-xs font-semibold ${
                    authSession.loggedIn ? 'badge-mint' : 'badge-coral'
                  }`}
                >
                  {authSession.loggedIn ? 'Đang hoạt động' : 'Đã thu hồi / Chưa đăng nhập'}
                </span>
                <span className="px-3 py-1 text-xs font-mono uppercase badge-lilac">
                  {dataMode}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                Tài khoản:{' '}
                <span className="font-mono text-white">
                  {currentUser?.email || authSession.email || 'Chưa xác định'}
                </span>{' '}
                · Thiết bị: {authSession.deviceInfo} · IP:{' '}
                <span className="font-mono">{authSession.ipClient}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!authSession.loggedIn && (
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="btn-secondary px-4 py-2 text-xs focus-ring cursor-pointer"
                >
                  Đi tới Đăng nhập
                </button>
              )}

              <button
                type="button"
                disabled={refreshBusy || logoutBusy}
                onClick={() => void handleRefreshToken()}
                className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5 focus-ring cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshBusy ? 'animate-spin' : ''}`} />
                <span>{refreshBusy ? 'Đang làm mới...' : 'Làm mới Token'}</span>
              </button>

              <button
                type="button"
                disabled={!authSession.loggedIn || logoutBusy || refreshBusy}
                onClick={() => void handleLogout()}
                className={`px-4 py-2 text-xs font-semibold flex items-center gap-1.5 focus-ring ${
                  !authSession.loggedIn || logoutBusy || refreshBusy
                    ? 'rounded-full border border-white/25 bg-white/10 text-white/80 cursor-not-allowed'
                    : 'badge-pink hover:opacity-90 cursor-pointer'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{logoutBusy ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
              </button>
            </div>
          </div>

          {sessionError && (
            <div
              role="alert"
              className="rounded-xl p-3 bg-block-pink border border-ink text-xs text-ink font-medium"
            >
              {sessionError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className="rounded-2xl p-4 space-y-2"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-mono uppercase tracking-wider"
                  style={{ color: 'rgba(255, 255, 255, 0.88)' }}
                >
                  Bearer Access Token (JWT HS256)
                </span>
                {authSession.accessToken && (
                  <button
                    type="button"
                    onClick={() => void copyToken(authSession.accessToken, 'access')}
                    className="btn-secondary px-3 py-1 text-xs flex items-center gap-1 focus-ring cursor-pointer"
                  >
                    {copiedField === 'access' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <pre className="text-xs font-mono text-white break-all whitespace-pre-wrap leading-relaxed">
                {authSession.accessToken || 'null (chưa đăng nhập hoặc đã đăng xuất)'}
              </pre>
            </div>

            <div
              className="rounded-2xl p-4 space-y-2"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-mono uppercase tracking-wider"
                  style={{ color: 'rgba(255, 255, 255, 0.88)' }}
                >
                  Refresh Token / HttpOnly Cookie
                </span>
                {authSession.refreshToken && (
                  <button
                    type="button"
                    onClick={() => void copyToken(authSession.refreshToken, 'refresh')}
                    className="btn-secondary px-3 py-1 text-xs flex items-center gap-1 focus-ring cursor-pointer"
                  >
                    {copiedField === 'refresh' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <pre className="text-xs font-mono text-white break-all whitespace-pre-wrap leading-relaxed">
                {authSession.refreshToken
                  ? authSession.refreshToken
                  : authSession.loggedIn
                    ? 'Đang lưu trong HttpOnly cookie refresh_token (Path=/api/v1/auth)'
                    : 'Max-Age=0 (đã xóa / chưa cấp)'}
              </pre>
            </div>
          </div>

          {/* Current User Summary (/api/v1/auth/me) beside Decoded JWT Payload Viewer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div
              className="lg:col-span-5 rounded-2xl p-4 space-y-3"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-white">
                  Hồ sơ /api/v1/auth/me
                </span>
                <span
                  className={`px-3 py-1 text-xs font-mono font-semibold ${
                    currentUser ? 'badge-lime' : 'badge-soft'
                  }`}
                >
                  {currentUser ? `#${currentUser.id}` : 'Chưa tải'}
                </span>
              </div>

              {currentUser ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      id={currentUser.id}
                      name={currentUser.name}
                      avatar={currentUser.avatar}
                      sizeClass="w-12 h-12 text-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-white truncate">
                        {currentUser.name}
                      </p>
                      <p
                        className="text-xs font-mono truncate"
                        style={{ color: 'rgba(255, 255, 255, 0.85)' }}
                      >
                        {currentUser.email}
                      </p>
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-3 space-y-2 text-xs"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.24)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ color: 'rgba(255, 255, 255, 0.78)' }}>Công ty</span>
                      <span className="font-medium text-white truncate">
                        {currentUser.companyInfo?.name ?? 'Chưa gán công ty'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ color: 'rgba(255, 255, 255, 0.78)' }}>Tuổi · Giới tính</span>
                      <span className="font-mono text-white">
                        {currentUser.age ?? '-'} · {genderLabel(currentUser.gender)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="shrink-0" style={{ color: 'rgba(255, 255, 255, 0.78)' }}>
                        Địa chỉ
                      </span>
                      <span className="text-white text-right break-words">
                        {currentUser.address || '-'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span
                      className="block text-xs font-mono uppercase tracking-wider"
                      style={{ color: 'rgba(255, 255, 255, 0.82)' }}
                    >
                      Vai trò (roleInfo)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentUser.roleInfo.length > 0 ? (
                        currentUser.roleInfo.map((role) => (
                          <span
                            key={role.id}
                            className="px-3 py-1 text-xs font-mono font-semibold badge-lilac"
                          >
                            {role.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.78)' }}>
                          Chưa gán vai trò
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'rgba(255, 255, 255, 0.86)' }}
                >
                  {authSession.loggedIn
                    ? 'Không thể tải hồ sơ từ GET /api/v1/auth/me (kiểm tra backend Spring Boot hoặc đăng nhập lại).'
                    : 'Đăng nhập để nạp hồ sơ người dùng hiện tại từ GET /api/v1/auth/me.'}
                </p>
              )}
            </div>

            <div className="lg:col-span-7">
              <JwtPayloadViewer
                accessToken={authSession.accessToken}
                loggedIn={authSession.loggedIn}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default AuthPage;
