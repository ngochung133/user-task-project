import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  authApi,
  dashboardApi,
  getDataMode,
  resetDemoData,
  setDataMode as persistDataMode,
} from '../api/hrService';
import {
  ApiError,
  clearStoredTokens,
  setStoredAuthEmail,
  subscribeTokenChanges,
} from '../api/client';
import type {
  AppRoute,
  AuthSession,
  DashboardResponse,
  DataMode,
  PermissionFilterPreset,
  UserFilterPreset,
  UserResponseDTO,
} from '../types/hr';
import { useToast } from './ToastContext';

const VALID_ROUTES: readonly AppRoute[] = [
  'dashboard',
  'users',
  'companies',
  'roles',
  'permissions',
  'auth',
] as const;

export interface NavigateOptions {
  roleId?: number | null;
  userFilter?: UserFilterPreset | null;
  permissionFilter?: PermissionFilterPreset | null;
}

export interface AppContextValue {
  route: AppRoute;
  dataMode: DataMode;
  authSession: AuthSession;
  currentUser: UserResponseDTO | null;
  counts: DashboardResponse;
  selectedRoleId: number | null;
  userFilterPreset: UserFilterPreset | null;
  permissionFilterPreset: PermissionFilterPreset | null;
  refreshTick: number;
  navigate: (nextRoute: AppRoute, opts?: NavigateOptions) => void;
  switchDataMode: (mode: DataMode) => void;
  setSelectedRoleId: (id: number | null) => void;
  clearUserFilterPreset: () => void;
  clearPermissionFilterPreset: () => void;
  refreshAuthSession: () => void;
  triggerRefresh: () => void;
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function resolveInitialRoute(): AppRoute {
  if (typeof window === 'undefined') return 'dashboard';
  const param = new URLSearchParams(window.location.search).get('view');
  if (param && (VALID_ROUTES as readonly string[]).includes(param)) {
    return param as AppRoute;
  }
  return 'dashboard';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [route, setRoute] = useState<AppRoute>(resolveInitialRoute);
  const [dataMode, setDataModeState] = useState<DataMode>(() => getDataMode());
  const [authSession, setAuthSession] = useState<AuthSession>(() => authApi.getSession());
  const [currentUser, setCurrentUser] = useState<UserResponseDTO | null>(null);
  const [counts, setCounts] = useState<DashboardResponse>({
    totalUsers: 0,
    totalCompanies: 0,
    totalRoles: 0,
    totalPermissions: 0,
  });
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(1);
  const [userFilterPreset, setUserFilterPreset] = useState<UserFilterPreset | null>(null);
  const [permissionFilterPreset, setPermissionFilterPreset] =
    useState<PermissionFilterPreset | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [authSyncTick, setAuthSyncTick] = useState(0);
  const meSeqRef = useRef(0);

  const refreshAuthSession = useCallback(() => {
    const next = authApi.getSession();
    setAuthSession(next);
    if (!next.loggedIn) {
      setCurrentUser(null);
    }
    setAuthSyncTick((t) => t + 1);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const seq = ++meSeqRef.current;
    if (!authSession.loggedIn) {
      setCurrentUser(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const me = await authApi.me();
        if (cancelled || seq !== meSeqRef.current) return;
        setCurrentUser(me);
        if (me.email) {
          if (dataMode === 'live') {
            setStoredAuthEmail(me.email);
          }
          setAuthSession((prev) =>
            prev.email === me.email ? prev : { ...prev, email: me.email },
          );
        }
      } catch (err) {
        if (cancelled || seq !== meSeqRef.current) return;
        setCurrentUser(null);
        if (err instanceof ApiError && err.statusCode === 401 && dataMode === 'live') {
          clearStoredTokens();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authSession.loggedIn, authSession.accessToken, dataMode, refreshTick, authSyncTick]);

  const loadCounts = useCallback(async () => {
    if (dataMode === 'live' && !authSession.loggedIn) {
      setCounts({
        totalUsers: 0,
        totalCompanies: 0,
        totalRoles: 0,
        totalPermissions: 0,
      });
      return;
    }
    try {
      const summary = await dashboardApi.getSummary();
      setCounts(summary);
    } catch {
      if (dataMode === 'live') {
        setCounts({
          totalUsers: 0,
          totalCompanies: 0,
          totalRoles: 0,
          totalPermissions: 0,
        });
      }
    }
  }, [dataMode, authSession.loggedIn]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts, refreshTick]);

  useEffect(() => {
    return subscribeTokenChanges(() => {
      const next = authApi.getSession();
      setAuthSession(next);
      if (!next.loggedIn) {
        setCurrentUser(null);
      }
    });
  }, []);

  // Support browser back/forward if URL query changes
  useEffect(() => {
    const onPopState = () => {
      setRoute(resolveInitialRoute());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextRoute: AppRoute, opts?: NavigateOptions) => {
    if (opts?.roleId !== undefined) {
      setSelectedRoleId(opts.roleId);
    }
    if (opts?.userFilter !== undefined) {
      setUserFilterPreset(opts.userFilter);
    }
    if (opts?.permissionFilter !== undefined) {
      setPermissionFilterPreset(opts.permissionFilter);
    }

    setRoute(nextRoute);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', nextRoute);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const switchDataMode = useCallback(
    (mode: DataMode) => {
      if (mode === dataMode) return;
      persistDataMode(mode);
      setDataModeState(mode);
      setCurrentUser(null);
      setAuthSession(authApi.getSession());
      setAuthSyncTick((t) => t + 1);
      setRefreshTick((t) => t + 1);
      showToast(
        mode === 'live'
          ? 'Đã chuyển sang Live API (Spring Boot localhost:8080).'
          : 'Đã chuyển sang chế độ Demo (dữ liệu mẫu trong bộ nhớ).',
        mode === 'live' ? 'warning' : 'success',
      );
    },
    [dataMode, showToast],
  );

  const resetDemo = useCallback(() => {
    resetDemoData();
    setSelectedRoleId(1);
    setUserFilterPreset(null);
    setPermissionFilterPreset(null);
    setCurrentUser(null);
    setAuthSession(authApi.getSession());
    setAuthSyncTick((t) => t + 1);
    setRefreshTick((t) => t + 1);
    showToast('Đã khôi phục dữ liệu mẫu theo schema HR Management.');
  }, [showToast]);

  const clearUserFilterPreset = useCallback(() => setUserFilterPreset(null), []);
  const clearPermissionFilterPreset = useCallback(() => setPermissionFilterPreset(null), []);

  return (
    <AppContext.Provider
      value={{
        route,
        dataMode,
        authSession,
        currentUser,
        counts,
        selectedRoleId,
        userFilterPreset,
        permissionFilterPreset,
        refreshTick,
        navigate,
        switchDataMode,
        setSelectedRoleId,
        clearUserFilterPreset,
        clearPermissionFilterPreset,
        refreshAuthSession,
        triggerRefresh,
        resetDemo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}
