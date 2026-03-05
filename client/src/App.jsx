import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useAdminAuth } from './context/AdminAuthContext';
import { setUnauthorizedHandler } from './services/api';
import Login from './pages/Login';
import VehicleForm from './pages/VehicleForm';
import AdminDashboard from './pages/AdminDashboard';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';

// -------- PI-360 (Vehicle Registration) --------
function ProtectedRoute({ children }) {
  const { token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (token) return <Navigate to="/vehicle-form" replace />;
  return children;
}

// -------- Admin (login via main page with "Login as Admin" toggle) --------
function AdminProtectedRoute({ children }) {
  const { adminToken, isLoading } = useAdminAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-600" />
      </div>
    );
  }
  if (!adminToken) return <Navigate to="/login" replace />;
  return children;
}

function ApiUnauthorizedSetup() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { logout: adminLogout } = useAdminAuth();
  useEffect(() => {
    setUnauthorizedHandler((key) => {
      if (key === 'vehicle') {
        logout();
        navigate('/login', { replace: true });
      } else {
        adminLogout();
        navigate('/login', { replace: true });
      }
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate, logout, adminLogout]);
  return null;
}

export default function App() {
  return (
    <>
      <ApiUnauthorizedSetup />
      <Routes>
      {/* PI-360: Vehicle registration */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/vehicle-form"
        element={
          <ProtectedRoute>
            <Layout>
              <VehicleForm />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Admin: login via main Login page with "Login as Admin" toggle */}
      <Route path="/admin" element={<Navigate to="/login" replace />} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route
        path="/admin/dashboard"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/vehicle-form" replace />} />
      <Route path="*" element={<Navigate to="/vehicle-form" replace />} />
      </Routes>
    </>
  );
}
