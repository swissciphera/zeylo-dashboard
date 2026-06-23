import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AppLayout } from '@/layouts/AppLayout';

// Admin pages
import { AdminSetup } from '@/pages/admin/AdminSetup';
import { AdminLogin } from '@/pages/admin/AdminLogin';
import { AdminOverview } from '@/pages/admin/AdminOverview';
import { AdminUsers } from '@/pages/admin/AdminUsers';
import { AdminCompanies } from '@/pages/admin/AdminCompanies';
import { AdminCompanyDetail } from '@/pages/admin/AdminCompanyDetail';
import { AdminBilling } from '@/pages/admin/AdminBilling';
import { AdminReferrals } from '@/pages/admin/AdminReferrals';
import { AdminAudit } from '@/pages/admin/AdminAudit';
import { AdminIpLookup } from '@/pages/admin/AdminIpLookup';
import { AdminSystem } from '@/pages/admin/AdminSystem';
import { AdminSettings } from '@/pages/admin/AdminSettings';

// Client pages
import { ClientLogin } from '@/pages/app/ClientLogin';
import { ClientRegister } from '@/pages/app/ClientRegister';
import { AppDashboard } from '@/pages/app/AppDashboard';
import { AppEmployees } from '@/pages/app/AppEmployees';
import { AppEmployeeDetail } from '@/pages/app/AppEmployeeDetail';
import { AppServices } from '@/pages/app/AppServices';
import { AppProjects } from '@/pages/app/AppProjects';
import { AppProjectDetail } from '@/pages/app/AppProjectDetail';
import { AppContacts } from '@/pages/app/AppContacts';
import { AppVerify } from '@/pages/app/AppVerify';
import { AppSubscription } from '@/pages/app/AppSubscription';
import { AppSettings } from '@/pages/app/AppSettings';

// Public pages
import { TempAccessPage } from '@/pages/public/TempAccessPage';
import { RatingPage } from '@/pages/public/RatingPage';
import { RootGate, CompanyPublicPage } from '@/pages/public/CompanyPublic';
import { NotFound } from '@/pages/NotFound';

export default function App() {
  return (
    <Routes>
      {/* Root: company public page on a connected domain, else the app */}
      <Route path="/" element={<RootGate />} />
      <Route path="/page/:id" element={<CompanyPublicPage />} />

      {/* Admin auth / setup */}
      <Route path="/admin/setup" element={<AdminSetup />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin dashboard */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="companies" element={<AdminCompanies />} />
        <Route path="companies/:id" element={<AdminCompanyDetail />} />
        <Route path="billing" element={<AdminBilling />} />
        <Route path="referrals" element={<AdminReferrals />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="ip-lookup" element={<AdminIpLookup />} />
        <Route path="system" element={<AdminSystem />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Client auth */}
      <Route path="/app/login" element={<ClientLogin />} />
      <Route path="/app/register" element={<ClientRegister />} />

      {/* Client dashboard */}
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<AppDashboard />} />
        <Route path="employees" element={<AppEmployees />} />
        <Route path="employees/:id" element={<AppEmployeeDetail />} />
        <Route path="services" element={<AppServices />} />
        <Route path="projects" element={<AppProjects />} />
        <Route path="projects/:id" element={<AppProjectDetail />} />
        <Route path="contacts" element={<AppContacts />} />
        <Route path="verify" element={<AppVerify />} />
        <Route path="subscription" element={<AppSubscription />} />
        <Route path="settings" element={<AppSettings />} />
      </Route>

      {/* Public token pages */}
      <Route path="/access/:token" element={<TempAccessPage />} />
      <Route path="/rate/:token" element={<RatingPage />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
