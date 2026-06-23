import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Gift,
  ScrollText,
  Activity,
  Settings,
  MapPin,
} from 'lucide-react';
import { Sidebar, NavItem } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { CipheraWordmark, CipheraIcon } from '@/components/branding/CipheraLogo';
import { useAdminAuth } from '@/stores/auth';
import { adminApi } from '@/lib/api';

const NAV: NavItem[] = [
  { to: '/admin', label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users },
  { to: '/admin/billing', label: 'Facturation', icon: CreditCard },
  { to: '/admin/referrals', label: 'Parrainage', icon: Gift },
  { to: '/admin/audit', label: "Journal d'audit", icon: ScrollText },
  { to: '/admin/ip-lookup', label: 'Localiser IP', icon: MapPin },
  { to: '/admin/system', label: 'Santé système', icon: Activity },
  { to: '/admin/settings', label: 'Paramètres', icon: Settings },
];

export function AdminLayout() {
  const { accessToken, user, clear } = useAdminAuth();
  const navigate = useNavigate();

  if (!accessToken) return <Navigate to="/admin/login" replace />;

  async function logout() {
    try {
      await adminApi.post('/admin/auth/logout');
    } catch {
      /* ignore */
    }
    clear();
    navigate('/admin/login');
  }

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      <Sidebar
        items={NAV}
        badge="Plateforme"
        logoFull={<CipheraWordmark className="h-6 w-auto" />}
        logoIcon={<CipheraIcon className="h-5 w-5 text-white" />}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={user?.name}
          userEmail={user?.email}
          subtitle="Admin plateforme"
          onLogout={logout}
        />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
