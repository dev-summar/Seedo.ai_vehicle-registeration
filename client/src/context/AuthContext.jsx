import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'miet_vehicle_token';
const USER_KEY = 'miet_vehicle_user';
const EXPIRY_KEY = 'miet_vehicle_expiry';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const isTokenExpired = useCallback(() => {
    const expiry = localStorage.getItem(EXPIRY_KEY);
    // If no expiry stored (e.g. old session), don't treat as expired - token may still be valid
    if (!expiry) return false;
    return Date.now() >= parseInt(expiry, 10);
  }, []);

  useEffect(() => {
    if (!token || isTokenExpired()) {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(EXPIRY_KEY);
    }
    setIsLoading(false);
  }, [token, isTokenExpired]);

  const login = (newToken, userData) => {
    const expiresIn = 60 * 60 * 1000; // 1 hour
    const expiry = Date.now() + expiresIn;
    setToken(newToken);
    setUser(userData || null);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(EXPIRY_KEY, String(expiry));
    if (userData) {
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isLoading, isTokenExpired }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
