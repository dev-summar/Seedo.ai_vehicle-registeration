/**
 * Admin API - uses central service. No hardcoded URLs. Separate from PI-360 token.
 */
import { apiFetch } from '../services/api';

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

export async function getAdminVehicles({ page = 1, limit = 10, search = '', vehicle_type = '', status = '' } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (search) params.set('search', search.trim());
  if (vehicle_type) params.set('vehicle_type', vehicle_type);
  if (status) params.set('status', status.trim());
  const { res, data } = await apiFetch(`/api/admin/vehicles?${params.toString()}`, {}, { tokenKey: 'admin' });
  return { ok: res.ok, status: res.status, data };
}

export async function deleteAdminVehicle(id) {
  const { res, data } = await apiFetch(`/api/admin/vehicles/${id}`, { method: 'DELETE' }, { tokenKey: 'admin' });
  return { ok: res.ok, status: res.status, data };
}
