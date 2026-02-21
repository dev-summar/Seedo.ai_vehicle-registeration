import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getAdminVehicles, fetchAdminRcFile } from '../api/adminClient';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
  ExternalLink,
  Car,
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
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { ok, status, data } = await getAdminVehicles({
        page,
        limit,
        search,
        vehicle_type: vehicleType,
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
  }, [page, limit, search, vehicleType, logout, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handlePreview = async (vehicle) => {
    setPreviewLoading(true);
    setPreview(null);
    try {
      const result = await fetchAdminRcFile(vehicle._id);
      if (result.ok) {
        setPreview({
          vehicle,
          url: result.url,
          contentType: result.contentType,
        });
      } else {
        setError('Could not load RC document');
      }
    } catch {
      setError('Could not load RC document');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Owner</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    Vehicle
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 hidden md:table-cell">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 hidden md:table-cell">
                    Account Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 hidden lg:table-cell">
                    Mobile
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 hidden lg:table-cell">
                    Registered
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">RC</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr
                    key={v._id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-slate-800">{v.name || '-'}</p>
                        <p className="text-sm text-slate-500">{v.email || '-'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {v.vehicle_number}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-slate-600">
                      {v.vehicle_type}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-slate-600">
                      {v.account_type || '-'}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-slate-600">
                      {v.mobile || '-'}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-slate-500 text-sm">
                      {formatDate(v.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handlePreview(v)}
                        disabled={previewLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <FileText size={16} />
                        View RC
                      </button>
                    </td>
                  </tr>
                ))}
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

      {previewLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent" />
        </div>
      )}
      {preview && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
          aria-label="RC Preview"
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">
                RC - {preview.vehicle?.vehicle_number}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={preview.url}
                  download={`RC_${preview.vehicle?.vehicle_number}${preview.contentType?.includes('pdf') ? '.pdf' : '.jpg'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  <ExternalLink size={16} />
                  Open
                </a>
                <button
                  onClick={closePreview}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-50 min-h-[400px]">
              {preview.contentType?.includes('pdf') ? (
                <iframe
                  src={preview.url}
                  title="RC Document"
                  className="w-full h-[70vh] rounded-lg border-0"
                />
              ) : (
                <img
                  src={preview.url}
                  alt="RC Document"
                  className="max-w-full max-h-[70vh] mx-auto rounded-lg shadow"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
