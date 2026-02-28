import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .map((s) => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <div className="layout-root">
      <header className="layout-header flex items-center">
        <div className="max-w-[900px] w-full mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800">
            MIET Jammu – Vehicle Registration
          </h1>
          <div className="flex items-center gap-3">
            {user?.name && (
              <>
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-slate-600 bg-slate-100 hidden sm:flex"
                  aria-hidden
                >
                  {initials}
                </span>
                <span className="text-sm text-slate-600 hidden sm:inline">{user.name}</span>
              </>
            )}
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 rounded-xl transition-colors hover:bg-slate-100 hover:text-slate-800"
              aria-label="Sign out"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="layout-main">{children}</main>
    </div>
  );
}
