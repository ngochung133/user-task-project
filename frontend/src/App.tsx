import { AppShell } from './components/layout/AppShell';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { AuthPage } from './pages/AuthPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { DashboardPage } from './pages/DashboardPage';
import { PermissionsPage } from './pages/PermissionsPage';
import { RolesPage } from './pages/RolesPage';
import { UsersPage } from './pages/UsersPage';

function ActiveRouteView() {
  const { route } = useApp();

  switch (route) {
    case 'dashboard':
      return <DashboardPage />;
    case 'users':
      return <UsersPage />;
    case 'companies':
      return <CompaniesPage />;
    case 'roles':
      return <RolesPage />;
    case 'permissions':
      return <PermissionsPage />;
    case 'auth':
      return <AuthPage />;
  }
}

export function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <AppShell>
          <ActiveRouteView />
        </AppShell>
      </AppProvider>
    </ToastProvider>
  );
}

export default App;
