import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { registerVehicle } from '../api/client';
import { Lock, CheckCircle } from 'lucide-react';
import Spinner from '../components/Spinner';
import './VehicleForm.css';

// Use official MIET logo; override with VITE_MIET_LOGO_URL in .env if needed.
const MIET_LOGO_URL = import.meta.env.VITE_MIET_LOGO_URL || 'https://mietjmu.in/wp-content/uploads/2020/02/MIET_LOGO_AUTONOMOUS.webp';

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

function ReadOnlyHint() {
  return (
    <p className="vehicle-registration-field-hint" role="status">
      <Lock size={12} aria-hidden />
      Auto-filled from PI-360
    </p>
  );
}

export default function VehicleForm() {
  const { user } = useAuth();
  const pi360 = useMemo(() => fromPi360(user), [user]);

  const [rc_number, setRcNumber] = useState('');
  const [owner_name, setOwnerName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [account_type, setAccountType] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(pi360.name);
    setEmail(pi360.email);
    setMobile(pi360.mobile);
    setAccountType(pi360.account_type);
    setDepartment(pi360.department);
  }, [pi360.name, pi360.email, pi360.mobile, pi360.account_type, pi360.department]);

  const handleRcChange = (e) => {
    setRcNumber(e.target.value.toUpperCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!rc_number.trim() || !owner_name.trim()) {
      setError('Vehicle number and Owner name are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        rc_number: rc_number.trim(),
        owner_name: owner_name.trim(),
        student_name: (name || pi360.name || '').trim() || undefined,
        email: (email || pi360.email || '').trim() || undefined,
        mobile: (mobile || pi360.mobile || '').trim() || undefined,
        account_type: (account_type || pi360.account_type || '').trim() || undefined,
        department: (department || pi360.department || '').trim() || undefined,
      };

      const { ok, status, data } = await registerVehicle(payload);
      if (ok && (data?.success === true || status === 201)) {
        setSuccess(data?.message || 'Vehicle registered successfully.');
        setRcNumber('');
        setOwnerName('');
      } else {
        setError(data?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = (key) => {
    const v = pi360[key];
    return v != null && String(v).trim() !== '';
  };

  return (
    <div className="vehicle-registration-page">
      <article className="vehicle-registration-card" aria-label="Vehicle registration form">
        {/* Header */}
        <header className="vehicle-registration-header">
          <div>
            {MIET_LOGO_URL ? (
              <img
                src={MIET_LOGO_URL}
                alt="MIET Jammu"
                className="vehicle-registration-logo"
                width={140}
                height={56}
              />
            ) : (
              <span className="vehicle-registration-logo-text">MIET Jammu</span>
            )}
          </div>
          <div className="vehicle-registration-header-right">
            <h1 className="vehicle-registration-title">Vehicle Registration Portal</h1>
            <p className="vehicle-registration-subtitle">Register your vehicle with RC verification</p>
            <span className="vehicle-registration-badge">Secure Verification System</span>
          </div>
        </header>

        {/* Step indicator */}
        <nav className="vehicle-registration-steps" aria-label="Registration steps">
          <div className="vehicle-registration-step active" aria-current="step">
            <span className="vehicle-registration-step-num" aria-hidden>1</span>
            <span>Verify RC Details</span>
          </div>
          <div className="vehicle-registration-step-sep" aria-hidden />
          <div className="vehicle-registration-step">
            <span className="vehicle-registration-step-num" aria-hidden>2</span>
            <span>Confirm Personal Info</span>
          </div>
          <div className="vehicle-registration-step-sep" aria-hidden />
          <div className="vehicle-registration-step">
            <span className="vehicle-registration-step-num" aria-hidden>3</span>
            <span>Submit</span>
          </div>
        </nav>

        <form onSubmit={handleSubmit} noValidate>
          {/* Section A: Vehicle Verification */}
          <section className="vehicle-registration-section" aria-labelledby="section-vehicle-heading">
            <h2 id="section-vehicle-heading" className="vehicle-registration-section-title">
              Vehicle Verification
            </h2>
            <div className="vehicle-registration-grid two-cols">
              <div className="vehicle-registration-field">
                <label htmlFor="rc_number" className="vehicle-registration-label">
                  Vehicle Number <span className="required" aria-hidden>*</span>
                </label>
                <input
                  id="rc_number"
                  type="text"
                  value={rc_number}
                  onChange={handleRcChange}
                  required
                  placeholder="Enter vehicle number"
                  maxLength={25}
                  className="vehicle-registration-input rc-uppercase"
                  autoComplete="off"
                  aria-required="true"
                  aria-invalid={error && !rc_number.trim() ? 'true' : undefined}
                  aria-describedby="rc_number-hint"
                />
                <p className="vehicle-registration-field-hint" id="rc_number-hint">
                  Enter the vehicle number as per your RC.
                </p>
              </div>
              <div className="vehicle-registration-field">
                <label htmlFor="owner_name" className="vehicle-registration-label">
                  Owner Name <span className="required" aria-hidden>*</span>
                </label>
                <input
                  id="owner_name"
                  type="text"
                  value={owner_name}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                  placeholder="As printed on RC"
                  className="vehicle-registration-input"
                  autoComplete="off"
                  aria-required="true"
                  aria-invalid={error && !owner_name.trim() ? 'true' : undefined}
                  aria-describedby="owner_name-hint"
                />
                <p className="vehicle-registration-field-hint" id="owner_name-hint">
                  Name in which the vehicle is registered. Enter exactly as printed on RC (with or without title like Mr/Mrs)—must match RC exactly.
                </p>
              </div>
            </div>
          </section>

          {/* Section B: Personal Information */}
          <section className="vehicle-registration-section" aria-labelledby="section-personal-heading">
            <h2 id="section-personal-heading" className="vehicle-registration-section-title">
              Personal Information
            </h2>
            <div className="vehicle-registration-grid two-cols">
              <div className="vehicle-registration-field">
                <label htmlFor="name" className="vehicle-registration-label">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => !isReadOnly('name') && setName(e.target.value)}
                  readOnly={isReadOnly('name')}
                  className={`vehicle-registration-input ${isReadOnly('name') ? 'read-only' : ''}`}
                  placeholder="Your name"
                  aria-readonly={isReadOnly('name')}
                />
                {isReadOnly('name') && <ReadOnlyHint />}
              </div>
              <div className="vehicle-registration-field">
                <label htmlFor="email" className="vehicle-registration-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => !isReadOnly('email') && setEmail(e.target.value)}
                  readOnly={isReadOnly('email')}
                  className={`vehicle-registration-input ${isReadOnly('email') ? 'read-only' : ''}`}
                  placeholder="Email"
                  aria-readonly={isReadOnly('email')}
                />
                {isReadOnly('email') && <ReadOnlyHint />}
              </div>
              <div className="vehicle-registration-field">
                <label htmlFor="mobile" className="vehicle-registration-label">
                  Mobile
                </label>
                <input
                  id="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => !isReadOnly('mobile') && setMobile(e.target.value)}
                  readOnly={isReadOnly('mobile')}
                  className={`vehicle-registration-input ${isReadOnly('mobile') ? 'read-only' : ''}`}
                  placeholder="Mobile number"
                  aria-readonly={isReadOnly('mobile')}
                />
                {isReadOnly('mobile') && <ReadOnlyHint />}
              </div>
              <div className="vehicle-registration-field">
                <label htmlFor="account_type" className="vehicle-registration-label">
                  Account Type
                </label>
                <input
                  id="account_type"
                  type="text"
                  value={account_type}
                  onChange={(e) => !isReadOnly('account_type') && setAccountType(e.target.value)}
                  readOnly={isReadOnly('account_type')}
                  className={`vehicle-registration-input ${isReadOnly('account_type') ? 'read-only' : ''}`}
                  placeholder="e.g. Student, Staff"
                  aria-readonly={isReadOnly('account_type')}
                />
                {isReadOnly('account_type') && <ReadOnlyHint />}
              </div>
            </div>
            <div className="vehicle-registration-field">
              <label htmlFor="department" className="vehicle-registration-label">
                Department / Program
              </label>
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => !isReadOnly('department') && setDepartment(e.target.value)}
                readOnly={isReadOnly('department')}
                className={`vehicle-registration-input ${isReadOnly('department') ? 'read-only' : ''}`}
                placeholder="Department or program"
                aria-readonly={isReadOnly('department')}
              />
              {isReadOnly('department') && <ReadOnlyHint />}
            </div>
          </section>

          {/* Validation messages */}
          {error && (
            <div className="vehicle-registration-validation error" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="vehicle-registration-validation success" role="status">
              <CheckCircle size={18} aria-hidden />
              {success}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="vehicle-registration-submit"
            aria-busy={loading}
            aria-live="polite"
          >
            {loading ? (
              <>
                <Spinner white size={20} />
                Verifying &amp; registering…
              </>
            ) : (
              'Verify & Register Vehicle'
            )}
          </button>

          {/* Trust footer */}
          <p className="vehicle-registration-trust">
            <Lock size={14} aria-hidden />
            Your vehicle details are securely verified and stored as per institutional policy.
          </p>
        </form>
      </article>
    </div>
  );
}
