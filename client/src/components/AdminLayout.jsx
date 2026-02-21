import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { LogOut, LayoutDashboard } from 'lucide-react';

export default function AdminLayout({ children }) {
  const { admin, logout } = useAdminAuth();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-2 text-lg font-semibold text-slate-800 hover:text-slate-600"
          >
            <LayoutDashboard size={22} />
            Admin – Vehicle Registration
          </Link>
          <div className="flex items-center gap-4">
            {admin?.name && (
              <span className="text-sm text-slate-600 hidden sm:inline">{admin.name}</span>
            )}
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
