import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { login as apiLogin } from '../api/client';
import { adminLogin } from '../api/adminClient';
import Spinner from '../components/Spinner';
import { Mail, Lock } from 'lucide-react';

const MIET_LOGO_URL = import.meta.env.VITE_MIET_LOGO_URL || 'https://mietjmu.in/wp-content/uploads/2020/02/MIET_LOGO_AUTONOMOUS.webp';
const PI360_ICON_URL = import.meta.env.VITE_PI360_ICON_URL || 'https://pi360.net/pi360_website/wordpress/wp-content/uploads/2025/12/icon-pi360.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { login: adminLoginContext } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (adminMode) {
        const { ok, status, data } = await adminLogin(email.trim(), password);
        if (ok && data?.token) {
          adminLoginContext(data.token, data.admin || null);
          navigate('/admin/dashboard', { replace: true });
          return;
        }
        setError(data?.message || 'Invalid email or password.');
        return;
      }

      const { ok, status, data } = await apiLogin(email.trim(), password);

      // API returns { statusCode: 200, message, token, data: { name, email, mobileno, ... } }
      const token = data?.token;
      const userData = data?.data ?? data?.user ?? data;
      const isSuccess = (ok || data?.statusCode === 200) && token;

      if (isSuccess) {
        login(token, userData || null);
        return;
      }
      if (status === 204) setError('Invalid email or password.');
      else if (status === 202) setError('Account is inactive. Please contact support.');
      else setError(data?.message || 'Login failed. Please try again.');
    } catch (err) {
      setError(err.message || 'Cannot reach server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #eef2ff, #f8fafc)' }}
    >
      <div className="w-full max-w-[420px] login-card-entrance">
        <div
          className="bg-white rounded-2xl p-10 border border-slate-100"
          style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}
        >
          <div className="flex justify-center mb-6">
            <img
              src={MIET_LOGO_URL}
              alt="MIET Logo"
              className="max-h-[80px] w-auto object-contain"
            />
          </div>

          <h1 className="text-center text-[26px] font-semibold text-slate-800" style={{ fontWeight: 600 }}>
            MIET Jammu – Vehicle Registration
          </h1>
          <p className="text-center text-lg font-bold mt-2 mb-6 text-slate-700">
            Sign in with your PI-360 Credentials
          </p>
          <div className="flex justify-center mb-3">
            <img
              src={PI360_ICON_URL}
              alt="PI-360"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                  aria-hidden
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border outline-none transition-all focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                  aria-hidden
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border outline-none transition-all focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>
            </div>
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[50px] rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                background: 'linear-gradient(to right, #2563eb, #3b82f6)',
                boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
              }}
            >
              {loading ? (
                <>
                  <Spinner white size={18} />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="flex flex-col items-center mt-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-sm text-slate-600">Login as Admin</span>
              <button
                type="button"
                role="switch"
                aria-checked={adminMode}
                onClick={() => setAdminMode(!adminMode)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${adminMode ? 'bg-blue-500 border-blue-500' : 'bg-slate-200 border-slate-200'}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white border border-slate-200 transition-transform ${adminMode ? 'translate-x-5' : 'translate-x-0.5'}`} style={{ marginTop: '1px' }} />
              </button>
            </label>
          </div>

          <p className="text-center text-xs mt-8" style={{ color: '#94a3b8' }}>
            © 2026 MIET Jammu. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
