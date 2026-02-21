import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { registerVehicle } from '../api/client';
import { Car, Upload, CheckCircle } from 'lucide-react';
import Spinner from '../components/Spinner';

const MIET_LOGO_URL = import.meta.env.VITE_MIET_LOGO_URL || 'https://mietjmu.in/wp-content/uploads/2020/02/MIET_LOGO_AUTONOMOUS.webp';

const VEHICLE_TYPES = ['Two-Wheeler', 'Four-Wheeler'];
const ACCEPT_FILES = '.pdf,.jpg,.jpeg,.png';
const MAX_FILE_MB = 5;

// Values derived from PI-360 user; API returns mobileno, name, email, accountType, department_name
// Read from top-level and user.data (nested) for compatibility
function fromPi360(user) {
  if (!user) return { name: '', email: '', mobile: '', account_type: '', department: '' };
  const d = (user.data && typeof user.data === 'object') ? user.data : user;
  const get = (keys) => [].concat(keys).flatMap((k) => [d[k], user[k]]).find((v) => v != null && v !== '') || '';
  const getStr = (keys) => {
    const v = get(keys);
    return v != null ? String(v).trim() : '';
  };
  return {
    name: getStr(['name', 'full_name', 'fullName']),
    email: getStr(['email', 'username_1', 'username']),
    mobile: getStr(['mobileno', 'mobile', 'phone', 'mobile_no', 'phone_no', 'contact', 'contact_no']),
    account_type: getStr(['accountType', 'account_type', 'role']),
    department: getStr(['department_name', 'department', 'program']),
  };
}

export default function VehicleForm() {
  const { user } = useAuth();
  const pi360 = useMemo(() => fromPi360(user), [user]);

  const [vehicle_number, setVehicleNumber] = useState('');
  const [vehicle_type, setVehicleType] = useState('Two-Wheeler');
  const [rc_file, setRcFile] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [account_type, setAccountType] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync form with PI-360 user when it becomes available
  useEffect(() => {
    setName(pi360.name);
    setEmail(pi360.email);
    setMobile(pi360.mobile);
    setAccountType(pi360.account_type);
    setDepartment(pi360.department);
  }, [pi360.name, pi360.email, pi360.mobile, pi360.account_type, pi360.department]);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setRcFile(null);
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_FILE_MB}MB`);
      setRcFile(null);
      e.target.value = '';
      return;
    }
    setError('');
    setRcFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!rc_file) {
      setError('Please upload your RC document (PDF, JPG or PNG, max 5MB).');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('vehicle_number', vehicle_number.trim().toUpperCase().replace(/\s/g, ''));
      formData.append('vehicle_type', vehicle_type);
      formData.append('rc_file', rc_file);
      formData.append('name', name.trim());
      formData.append('email', email.trim());
      formData.append('mobile', mobile.trim());
      formData.append('account_type', account_type.trim());
      formData.append('department', department.trim());

      const { ok, status, data } = await registerVehicle(formData);
      if (ok && (status === 201 || data?.id)) {
        setSuccess(data?.message || 'Vehicle registered successfully.');
        setVehicleNumber('');
        setRcFile(null);
        setVehicleType('Two-Wheeler');
        const input = document.querySelector('input[type="file"]');
        if (input) input.value = '';
      } else {
        setError(data?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { borderColor: '#e2e8f0', backgroundColor: '#ffffff' };
  const inputFocus = 'outline-none transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]';
  const inputBase = `w-full h-[50px] pl-[14px] pr-4 rounded-[12px] border ${inputFocus}`;
  const inputReadOnly = 'bg-[#f1f5f9] text-slate-700 cursor-not-allowed';

  return (
    <div
      className="vehicle-page-entrance max-w-[900px] mx-auto my-10 p-10 bg-white rounded-[20px]"
      style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.06)' }}
    >
      <div className="flex justify-center mb-6">
        <img
          src={MIET_LOGO_URL}
          alt="MIET Logo"
          className="max-h-[70px] w-auto object-contain"
        />
      </div>
      <div className="mb-8">
        <h1 className="text-[26px] font-semibold text-slate-800 flex items-center gap-2" style={{ fontWeight: 600 }}>
          <Car size={26} />
          Register Vehicle
        </h1>
        <p className="text-sm mt-1.5" style={{ color: '#64748b' }}>
          Enter vehicle details and upload RC document
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Vehicle Number | Vehicle Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="vehicle_number" className="block text-sm font-medium text-slate-700 mb-1.5">
              Vehicle number <span className="text-red-500">*</span>
            </label>
            <input
              id="vehicle_number"
              type="text"
              value={vehicle_number}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              required
              placeholder="e.g. DL01AB1234"
              maxLength={15}
              className={`${inputBase} font-mono`}
              style={inputStyle}
            />
            <p className="text-xs text-slate-500 mt-1">Format: XX99X99 or XX99XX9999</p>
          </div>
          <div>
            <label htmlFor="vehicle_type" className="block text-sm font-medium text-slate-700 mb-1.5">
              Vehicle type <span className="text-red-500">*</span>
            </label>
            <select
              id="vehicle_type"
              value={vehicle_type}
              onChange={(e) => setVehicleType(e.target.value)}
              required
              className={inputBase}
              style={inputStyle}
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: RC Upload full width */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            RC document <span className="text-red-500">*</span>
          </label>
          <label
            className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full min-h-[120px] rounded-xl border-2 border-dashed transition-colors cursor-pointer hover:border-blue-400 hover:bg-slate-50/80 py-6 px-6"
            style={{ borderColor: '#cbd5e1', backgroundColor: '#f8fafc' }}
          >
            <Upload size={32} className="text-slate-400 shrink-0" />
            <span className="text-sm font-medium text-slate-600 text-center sm:text-left">
              {rc_file ? rc_file.name : 'Choose PDF, JPG or PNG (max 5MB) — or drag and drop'}
            </span>
            <input
              type="file"
              accept={ACCEPT_FILES}
              onChange={onFileChange}
              className="sr-only"
            />
          </label>
        </div>

        {/* Row 3: Name | Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => !pi360.name && setName(e.target.value)}
              readOnly={!!pi360.name}
              className={`${inputBase} ${pi360.name ? inputReadOnly : ''}`}
              style={pi360.name ? { ...inputStyle, backgroundColor: '#f1f5f9' } : inputStyle}
            />
            {pi360.name && (
              <p className="text-xs text-slate-500 mt-1">From PI-360 login (read-only)</p>
            )}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => !pi360.email && setEmail(e.target.value)}
              readOnly={!!pi360.email}
              className={`${inputBase} ${pi360.email ? inputReadOnly : ''}`}
              style={pi360.email ? { ...inputStyle, backgroundColor: '#f1f5f9' } : inputStyle}
            />
            {pi360.email && (
              <p className="text-xs text-slate-500 mt-1">From PI-360 login (read-only)</p>
            )}
          </div>
        </div>

        {/* Row 4: Mobile | Account Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="mobile" className="block text-sm font-medium text-slate-700 mb-1.5">
              Mobile
            </label>
            <input
              id="mobile"
              type="tel"
              value={mobile}
              onChange={(e) => !pi360.mobile && setMobile(e.target.value)}
              readOnly={!!pi360.mobile}
              className={`${inputBase} ${pi360.mobile ? inputReadOnly : ''}`}
              style={pi360.mobile ? { ...inputStyle, backgroundColor: '#f1f5f9' } : inputStyle}
            />
            {pi360.mobile && (
              <p className="text-xs text-slate-500 mt-1">From PI-360 login (read-only)</p>
            )}
          </div>
          <div>
            <label htmlFor="account_type" className="block text-sm font-medium text-slate-700 mb-1.5">
              Account type
            </label>
            <input
              id="account_type"
              type="text"
              value={account_type}
              onChange={(e) => !pi360.account_type && setAccountType(e.target.value)}
              readOnly={!!pi360.account_type}
              placeholder="e.g. Student, Faculty"
              className={`${inputBase} ${pi360.account_type ? inputReadOnly : ''}`}
              style={pi360.account_type ? { ...inputStyle, backgroundColor: '#f1f5f9' } : inputStyle}
            />
            {pi360.account_type && (
              <p className="text-xs text-slate-500 mt-1">From PI-360 login (read-only)</p>
            )}
          </div>
        </div>

        {/* Department full width */}
        <div>
          <label htmlFor="department" className="block text-sm font-medium text-slate-700 mb-1.5">
            Department / Program
          </label>
          <input
            id="department"
            type="text"
            value={department}
            onChange={(e) => !pi360.department && setDepartment(e.target.value)}
            readOnly={!!pi360.department}
            className={`${inputBase} ${pi360.department ? inputReadOnly : ''}`}
            style={pi360.department ? { ...inputStyle, backgroundColor: '#f1f5f9' } : inputStyle}
          />
          {pi360.department && (
            <p className="text-xs text-slate-500 mt-1">From PI-360 login (read-only)</p>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm flex items-center gap-2">
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-[52px] rounded-[14px] text-white font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none hover:-translate-y-0.5 hover:shadow-lg"
          style={{
            background: 'linear-gradient(to right, #2563eb, #3b82f6)',
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
          }}
        >
          {loading ? (
            <>
              <Spinner white size={20} />
              Registering...
            </>
          ) : (
            'Register vehicle'
          )}
        </button>
      </form>
    </div>
  );
}
