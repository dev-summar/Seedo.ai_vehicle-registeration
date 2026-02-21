/**
 * Vehicle (PI-360) API - uses central service. No hardcoded URLs.
 */
import { apiFetch, getBaseUrl, TOKEN_KEYS } from '../services/api';

export async function apiRequest(endpoint, options = {}) {
  const { res } = await apiFetch(endpoint, options, { tokenKey: 'vehicle' });
  return res;
}

export async function login(email, password) {
  const { res, data } = await apiFetch(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({
        username_1: email,
        password_1: password,
        fcm_token: '',
      }),
    },
    { tokenKey: null }
  );
  return { ok: res.ok, status: res.status, data };
}

export async function registerVehicle(formData) {
  const url = `${getBaseUrl()}/api/vehicle/register`;
  const token = localStorage.getItem(TOKEN_KEYS.vehicle);
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    throw new Error(
      err.message === 'Failed to fetch'
        ? 'Cannot reach server. Check backend and VITE_API_BASE_URL.'
        : err.message
    );
  }
}
