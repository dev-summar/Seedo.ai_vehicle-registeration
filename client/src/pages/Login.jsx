import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../api/client';
import Spinner from '../components/Spinner';
import { Mail, Lock } from 'lucide-react';

const MIET_LOGO_URL = import.meta.env.VITE_MIET_LOGO_URL || 'https://mietjmu.in/wp-content/uploads/2020/02/MIET_LOGO_AUTONOMOUS.webp';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { ok, status, data } = await apiLogin(email.trim(), password);
      if (import.meta.env.DEV) console.log('LOGIN RESPONSE:', data);

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
          <p className="text-center text-sm mt-2 mb-6" style={{ color: '#64748b' }}>
            Sign in with your institute credentials
          </p>

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

          <p className="text-center text-xs mt-8" style={{ color: '#94a3b8' }}>
            © 2026 MIET Jammu. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
