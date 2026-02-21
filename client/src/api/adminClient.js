/**
 * Admin API - uses central service. No hardcoded URLs. Separate from PI-360 token.
 */
import { apiFetch, getBaseUrl, TOKEN_KEYS } from '../services/api';

function getAdminToken() {
  return localStorage.getItem(TOKEN_KEYS.admin);
}

export async function adminLogin(email, password) {
  const { res, data } = await apiFetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, { tokenKey: null });
  return { ok: res.ok, status: res.status, data };
}

export async function adminMe() {
  const { res, data } = await apiFetch('/api/admin/me', {}, { tokenKey: 'admin' });
  return { ok: res.ok, status: res.status, data };
}

export async function getAdminVehicles({ page = 1, limit = 10, search = '', vehicle_type = '' } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (search) params.set('search', search.trim());
  if (vehicle_type) params.set('vehicle_type', vehicle_type);
  const { res, data } = await apiFetch(`/api/admin/vehicles?${params.toString()}`, {}, { tokenKey: 'admin' });
  return { ok: res.ok, status: res.status, data };
}

export async function fetchAdminRcFile(id) {
  const token = getAdminToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const url = `${getBaseUrl()}/api/admin/vehicles/${id}/rc`;
  const res = await fetch(url, { headers });
  if (!res.ok) return { ok: false };
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  return { ok: true, blob, url: blobUrl, contentType: res.headers.get('content-type') || '' };
}
