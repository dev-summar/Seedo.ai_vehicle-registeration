import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getAdminVehicles, deleteAdminVehicle } from '../api/adminClient';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Car,
  Trash2,
} from 'lucide-react';

const PAGE_SIZES = [10, 20, 30, 50];

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'verified', 'rejected'
  const [deletingId, setDeletingId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { ok, status, data } = await getAdminVehicles({
        page,
        limit,
        search,
        vehicle_type: vehicleType,
        status: statusFilter,
      });
      if (ok && (data.status === true || data.status === 'true')) {
        setVehicles(Array.isArray(data.data) ? data.data : []);
        setTotal(typeof data.total === 'number' ? data.total : 0);
        setTotalPages(typeof data.totalPages === 'number' ? data.totalPages : 1);
      } else if (status === 401) {
        logout();
        navigate('/admin/login', { replace: true });
      } else {
        setError(data?.message || 'Failed to load vehicles');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, vehicleType, statusFilter, logout, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vehicle entry? This cannot be undone.')) return;
    setDeletingId(id);
    setError('');
    try {
      const { ok, status, data } = await deleteAdminVehicle(id);
      if (ok && (data?.status === true || status === 200)) {
        setVehicles((prev) => prev.filter((v) => v._id !== id));
        setTotal((t) => Math.max(0, t - 1));
      } else if (status === 401) {
        logout();
        navigate('/admin/login', { replace: true });
      } else {
        setError(data?.message || 'Failed to delete');
      }
    } catch {
      setError('Network error');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Registered Vehicles</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {admin?.name} · {admin?.role}
          </p>
        </div>
        <p className="text-slate-500 text-sm">
          {total} vehicle{total !== 1 ? 's' : ''} total
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by vehicle number, name, email, mobile..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-600 focus:border-slate-600 outline-none"
            />
          </div>
          <select
            value={vehicleType}
            onChange={(e) => {
              setVehicleType(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-600 outline-none min-w-[140px]"
          >
            <option value="">All types</option>
            <option value="Two-Wheeler">Two-Wheeler</option>
            <option value="Four-Wheeler">Four-Wheeler</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-600 outline-none min-w-[120px]"
          >
            <option value="">All status</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2.5 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-600 border-t-transparent" />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Car size={48} className="mb-4 opacity-50" />
            <p className="font-medium">No vehicles found</p>
            <p className="text-sm mt-1">Try adjusting search</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    RC Number
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    Owner Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    Vehicle Number
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 hidden md:table-cell">
                    Vehicle Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 hidden lg:table-cell">
                    Model
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 hidden lg:table-cell">
                    Fuel Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 hidden lg:table-cell">
                    Registration Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 hidden lg:table-cell">
                    User
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 hidden lg:table-cell">
                    Created At
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => {
                  const isApproved = v.status === 'Approved' || v.status === 'verified' || v.verified === true;
                  const displayStatus = isApproved ? 'Approved' : 'Rejected';
                  return (
                  <tr
                    key={v._id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          displayStatus === 'Approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                        title={displayStatus === 'Rejected' ? v.rejection_reason : undefined}
                      >
                        {displayStatus}
                      </span>
                      {displayStatus === 'Rejected' && v.rejection_reason && (
                        <p className="text-xs text-slate-500 mt-1 max-w-[180px] truncate" title={v.rejection_reason}>
                          {v.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {v.rc_number}
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      {v.owner_name || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {v.vehicle_number || '-'}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-slate-600">
                      {v.vehicle_type || '-'}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-slate-600">
                      {v.model || '-'}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-slate-600">
                      {v.fuel_type || '-'}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-slate-600 text-sm">
                      {v.registration_date || '-'}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-slate-600">
                      <div>
                        <p className="font-medium text-slate-800">{v.student_name || v.user_name || '-'}</p>
                        {v.account_type ? (
                          <p className="text-xs text-slate-500 capitalize">{v.account_type}</p>
                        ) : null}
                        <p className="text-sm text-slate-500">{v.email || v.user_email || '-'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-slate-500 text-sm">
                      {formatDate(v.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(v._id)}
                        disabled={deletingId === v._id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete entry"
                      >
                        <Trash2 size={16} />
                        {deletingId === v._id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Rows per page</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 border border-slate-200 rounded-lg text-sm"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RC preview removed – Surepass verification stores structured data only */}
    </div>
  );
}
