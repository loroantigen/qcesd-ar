import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../components/layout/DashboardLayout';

import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import Dashboard from '../pages/Dashboard';
import InsertDailyReport from '../pages/InsertDailyReport';
import DailyReports from '../pages/DailyReports';
import AccomplishedReport from '../pages/AccomplishedReport';
import AdminPanel from '../pages/AdminPanel';
import LandingSettings from '../pages/LandingSettings';
import PendingApproval from '../pages/PendingApproval';
import NotFound from '../pages/NotFound';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/pending-approval" element={<PendingApproval />} />

      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/daily-reports" element={<DailyReports />} />
        <Route path="/insert-daily-report" element={<InsertDailyReport />} />
        <Route path="/accomplished-report" element={<AccomplishedReport />} />
        <Route path="/landing-settings" element={<LandingSettings />} />
      </Route>

      <Route element={<ProtectedRoute requireAdmin={true}><DashboardLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<AdminPanel />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;