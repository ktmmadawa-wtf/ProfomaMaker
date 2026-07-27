import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './router/ProtectedRoute';

// Auth pages
import RegisterForm    from './components/auth/RegisterForm';
import LoginForm       from './components/auth/LoginForm';
import TwoFactorSetup  from './components/auth/TwoFactorSetup';

// App layout + views
import AppLayout       from './components/layout/AppLayout';
import Dashboard       from './components/dashboard/Dashboard';
import InvoiceCreator  from './components/invoice/InvoiceCreator';
import InvoiceHistory  from './components/invoice/InvoiceHistory';
import CustomerManager from './components/customers/CustomerManager';
import SettingsPanel   from './components/settings/SettingsPanel';
import UserManager     from './components/users/UserManager';

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterForm />}
      />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginForm />}
      />

      {/* Protected routes — any authenticated user */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/invoices"   element={<InvoiceCreator />} />
          <Route path="/history"    element={<InvoiceHistory />} />
          <Route path="/customers"  element={<CustomerManager />} />
          <Route path="/setup-2fa"  element={<TwoFactorSetup />} />

          {/* Admin-only routes */}
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/settings" element={<SettingsPanel />} />
            <Route path="/users"    element={<UserManager />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
}
