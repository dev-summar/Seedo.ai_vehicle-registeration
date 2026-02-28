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
  const { res, data } = await apiFetch(
    '/api/vehicle/register',
    {
      method: 'POST',
      body: JSON.stringify(formData),
    },
    { tokenKey: 'vehicle' }
  );
  return { ok: res.ok, status: res.status, data };
}
