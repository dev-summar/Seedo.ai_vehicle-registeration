import { createContext, useContext, useState, useEffect } from 'react';

const ADMIN_TOKEN_KEY = 'miet_admin_token';
const ADMIN_USER_KEY = 'miet_admin_user';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [admin, setAdmin] = useState(() => {
    try {
      const u = localStorage.getItem(ADMIN_USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = (token, adminData) => {
    setAdminToken(token);
    setAdmin(adminData || null);
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    if (adminData) {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminData));
    }
  };

  const logout = () => {
    setAdminToken(null);
    setAdmin(null);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  };

  return (
    <AdminAuthContext.Provider value={{ adminToken, admin, login, logout, isLoading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
