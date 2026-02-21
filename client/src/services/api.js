/**
 * Central API service - no hardcoded URLs.
 * Uses VITE_API_BASE_URL from .env.development / .env.production.
 */

const isDev = import.meta.env.DEV;

function getApiBase() {
  const base = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ''
  ).trim().replace(/\/$/, '');
  if (base) return base;
  if (typeof window !== 'undefined') return window.location.origin || '';
  return '';
}

const API_BASE = getApiBase();

const TOKEN_KEYS = {
  vehicle: 'miet_vehicle_token',
  admin: 'miet_admin_token',
};

/** Optional: set by app to handle 401 (e.g. logout + redirect). Called with 'vehicle' | 'admin'. */
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/**
 * Central fetch: attaches token, uses API_BASE, parses JSON.
 * @param {string} endpoint - e.g. '/api/auth/login'
 * @param {RequestInit} options - method, body, headers
 * @param {{ tokenKey?: 'vehicle'|'admin', parseJson?: boolean }} opts - tokenKey to attach Bearer token
 * @returns {Promise<{ res: Response, data: any }>}
 */
export async function apiFetch(endpoint, options = {}, opts = {}) {
  const { tokenKey, parseJson = true } = opts;
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }
  if (tokenKey && TOKEN_KEYS[tokenKey]) {
    const token = localStorage.getItem(TOKEN_KEYS[tokenKey]);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const url = `${API_BASE}${endpoint}`;
  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    if (isDev) console.error('[API] Fetch error:', err.message);
    const msg =
      err.message === 'Failed to fetch'
        ? 'Cannot reach server. Check that the backend is running and VITE_API_BASE_URL is correct.'
        : err.message;
    throw new Error(msg);
  }
  if (res.status === 401 && onUnauthorized && tokenKey) {
    onUnauthorized(tokenKey);
  }
  const data = parseJson ? await res.json().catch(() => ({})) : await res.blob().catch(() => null);
  if (isDev && !res.ok) {
    console.warn('[API]', res.status, endpoint, parseJson ? data?.message : '');
  }
  return { res, data };
}

/** Get API base URL (for external use) */
export function getBaseUrl() {
  return API_BASE;
}

export { TOKEN_KEYS };
