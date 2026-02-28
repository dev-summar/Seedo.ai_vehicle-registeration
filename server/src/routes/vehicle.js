const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth').authMiddleware;
const VehicleRegistration = require('../models/VehicleRegistration');
const { verifyRc, normalizeName } = require('../services/surepassService');

const router = express.Router();

const isProduction = process.env.NODE_ENV === 'production';

const rcNumberRegex = /^[A-Z0-9\- ]{6,20}$/i;
const validateRcNumber = (val) => rcNumberRegex.test(String(val).toUpperCase().trim());

const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.VEHICLE_REGISTER_RATE_LIMIT ? Number(process.env.VEHICLE_REGISTER_RATE_LIMIT) : 10,
  message: { success: false, message: 'Too many attempts. Try again later.', data: {} },
  standardHeaders: true,
  legacyHeaders: false,
});

function pickFirst(obj, keys, fallback = '') {
  if (!obj || typeof obj !== 'object') return fallback;
  for (const key of keys) {
    if (obj[key] != null && String(obj[key]).trim() !== '') return String(obj[key]).trim();
  }
  return fallback;
}

/**
 * Extract PI-360 user fields for storage.
 * Uses JWT payload (req.user) and falls back to req.body so frontend can send
 * name/email/account_type from the login response when the JWT does not include them.
 */
function extractPi360User(req) {
  const user = req.user || {};
  const body = req.body || {};
  const payload = (user.data && typeof user.data === 'object') ? user.data : user;

  const get = (...keys) => {
    const fromBody = keys.map((k) => body[k]).find((v) => v != null && String(v).trim() !== '');
    if (fromBody != null && String(fromBody).trim() !== '') return String(fromBody).trim();
    return pickFirst(payload, keys) || pickFirst(user, keys);
  };

  const userId =
    get('sub', 'id', 'user_id', 'userId') ||
    get('email', 'username_1', 'username');
  let student_name = get('name', 'full_name', 'fullName', 'username', 'username_1', 'student_name');
  if (!student_name) {
    const first = get('first_name');
    const last = get('last_name');
    if (first || last) student_name = [first, last].filter(Boolean).join(' ').trim();
  }
  const email = get('email', 'username_1', 'username');
  const mobile = get('mobileno', 'mobile', 'phone', 'mobile_no', 'contact');
  const account_type = get('accountType', 'account_type', 'role');
  const department = get('department_name', 'department', 'program');

  return { userId, student_name: student_name || '', email, mobile, account_type, department };
}

function jsonResponse(res, status, success, message, data = {}) {
  return res.status(status).json({ success, message, data });
}

/**
 * POST /api/vehicle/register
 * Strict RC verification via Surepass Sandbox. Owner name must match (normalized).
 * Response: { success, message, data }.
 */
router.post(
  '/register',
  authMiddleware,
  registerLimiter,
  [
    body('rc_number').trim().notEmpty().withMessage('RC number is required').custom(validateRcNumber).withMessage('Invalid RC number format'),
    body('owner_name').trim().notEmpty().withMessage('Owner name is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return jsonResponse(res, 400, false, errors.array()[0].msg, {});
      }

      const rc_number_raw = String(req.body.rc_number || '').trim();
      const owner_name_form = String(req.body.owner_name || '').trim();
      const rc_number = rc_number_raw.toUpperCase().replace(/\s+/g, '');

      const { userId, student_name, email, mobile, account_type, department } = extractPi360User(req);
      if (!userId || !email) {
        return jsonResponse(res, 400, false, 'User identity missing. Please log in again.', {});
      }

      const existingApproved = await VehicleRegistration.findOne({ rc_number, status: 'Approved' });
      if (existingApproved) {
        return jsonResponse(res, 409, false, 'RC number is already registered', {});
      }

      async function saveRejected(ownerNameFromSurepass, rejectionReason) {
        try {
          await VehicleRegistration.create({
            rc_number,
            owner_name: ownerNameFromSurepass || '',
            user_id: userId,
            student_name: student_name || '',
            email: email || '',
            mobile: mobile || '',
            account_type: account_type || '',
            department: department || '',
            user_name: student_name || '',
            user_email: email || '',
            status: 'Rejected',
            rejection_reason: rejectionReason || 'Verification failed',
          });
        } catch (e) {
          if (!isProduction) console.error('[Vehicle] saveRejected:', e.message);
        }
      }

      let surepassData;
      try {
        surepassData = await verifyRc({ rc_number });
      } catch (err) {
        const msg =
          err.code === 'SUREPASS_CONFIG_MISSING' || err.code === 'SUREPASS_BAD_REQUEST'
            ? err.message
            : err.code === 'SUREPASS_TIMEOUT' || err.code === 'SUREPASS_NETWORK_ERROR'
              ? 'Vehicle data provider is temporarily unavailable. Please try again later.'
              : err.message || 'RC verification failed';
        await saveRejected(surepassData?.owner_name ?? '', msg);
        const status = err.code === 'SUREPASS_CONFIG_MISSING' || err.code === 'SUREPASS_BAD_REQUEST' ? 500 : 500;
        return jsonResponse(res, status, false, msg, {});
      }

      const ownerNameFromSurepass = surepassData.owner_name || '';
      const normalizedForm = normalizeName(owner_name_form);
      const normalizedSurepass = normalizeName(ownerNameFromSurepass);

      if (!normalizedSurepass || normalizedForm !== normalizedSurepass) {
        await saveRejected(ownerNameFromSurepass, 'Owner name does not match RC records');
        return jsonResponse(res, 400, false, 'Owner name does not match RC records', {});
      }

      const registration = new VehicleRegistration({
        rc_number: surepassData.rc_number || rc_number,
        owner_name: ownerNameFromSurepass,
        vehicle_number: (surepassData.vehicle_number || '').toUpperCase().replace(/\s+/g, ''),
        vehicle_type: surepassData.vehicle_type || '',
        vehicle_class: surepassData.vehicle_class || '',
        fuel_type: surepassData.fuel_type || '',
        manufacturer: surepassData.manufacturer || '',
        model: surepassData.model || '',
        registration_date: surepassData.registration_date || '',
        insurance_valid_till: surepassData.insurance_valid_till || '',
        user_id: userId,
        student_name: student_name || '',
        email: email || '',
        mobile: mobile || '',
        account_type: account_type || '',
        department: department || '',
        user_name: student_name || '',
        user_email: email || '',
        status: 'Approved',
      });

      await registration.save();

      return jsonResponse(res, 201, true, 'Vehicle registered successfully', {
        id: registration._id,
        rc_number: registration.rc_number,
        owner_name: registration.owner_name,
        vehicle_number: registration.vehicle_number,
        status: registration.status,
      });
    } catch (err) {
      if (err.code === 11000 || err.code === '11000') {
        return jsonResponse(res, 409, false, 'RC number is already registered', {});
      }
      if (!isProduction) console.error('[Vehicle] register error:', err.message);
      return jsonResponse(res, 500, false, err.message && err.message !== 'Server Error' ? err.message : 'Server Error', {});
    }
  }
);

module.exports = router;
