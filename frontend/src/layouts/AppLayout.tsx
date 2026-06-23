import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Wrench,
  HardHat,
  Contact,
  BadgeCheck,
  CreditCard,
  Settings,
} from 'lucide-react';
import { Sidebar, NavItem } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useClientAuth } from '@/stores/auth';
import { clientApi } from '@/lib/api';

const NAV: NavItem[] = [
  { to: '/app', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/app/employees', label: 'Employés', icon: Users },
  { to: '/app/services', label: 'Services', icon: Wrench },
  { to: '/app/projects', label: 'Chantiers', icon: HardHat },
  { to: '/app/contacts', label: 'Contacts', icon: Contact },
  { to: '/app/verify', label: 'Vérification', icon: BadgeCheck },
  { to: '/app/subscription', label: 'Abonnement', icon: CreditCard },
  { to: '/app/settings', label: 'Paramètres', icon: Settings },
];

export function AppLayout() {
  const { accessToken, user, clear } = useClientAuth();
  const navigate = useNavigate();

  if (!accessToken) return <Navigate to="/app/login" replace />;

  async function logout() {
    try {
      await clientApi.post('/auth/logout');
    } catch {
      /* ignore */
    }
    clear();
    navigate('/app/login');
  }

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      <Sidebar items={NAV} badge="Espace pro" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={user?.name}
          userEmail={user?.email}
          subtitle="Espace entreprise"
          onLogout={logout}
        />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
