const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { cloudinary, isConfigured } = require('../config/cloudinary');
const VehicleRegistration = require('../models/VehicleRegistration');

const router = express.Router();

// Indian vehicle number format: XX99X99 or XX99XX9999
const vehicleNumberRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
const validateVehicleNumber = (val) => {
  const normalized = String(val).toUpperCase().replace(/\s/g, '');
  return vehicleNumberRegex.test(normalized);
};

const CLOUDINARY_FOLDER = 'miet-vehicle-rc';
const CLOUDINARY_RESOURCE_TYPE = 'auto';

/**
 * POST /api/vehicle/register
 * Middleware order: auth (JWT) -> multer -> controller
 * Frontend sends FormData: vehicle_number, vehicle_type, rc_file
 */
router.post(
  '/register',
  (req, res, next) => {
    console.log('[Vehicle] POST /register hit', { hasAuth: !!req.headers.authorization });
    next();
  },
  authMiddleware,
  (req, res, next) => {
    upload.single('rc_file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File size exceeds 5MB limit' });
        }
        if (err.message?.includes('Invalid file type')) {
          return res.status(400).json({ message: err.message });
        }
        console.error('[Vehicle] Multer error:', err);
        return res.status(500).json({ message: 'File upload error' });
      }
      next();
    });
  },
  [
    body('vehicle_number')
      .trim()
      .notEmpty()
      .withMessage('Vehicle number is required')
      .custom(validateVehicleNumber)
      .withMessage('Invalid vehicle number format (e.g., DL01AB1234)'),
    body('vehicle_type')
      .trim()
      .notEmpty()
      .withMessage('Vehicle type is required')
      .isIn(['Two-Wheeler', 'Four-Wheeler'])
      .withMessage('Vehicle type must be Two-Wheeler or Four-Wheeler'),
  ],
  async (req, res) => {
    let cloudinaryPublicId = null; // For rollback on failure
    const u = req.user || {};
    console.log('[Vehicle] register controller started, token keys:', Object.keys(u));

    try {
      // Validate request body
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
      }

      // File must be present (multer rejects invalid types before this)
      if (!req.file) {
        return res.status(400).json({ message: 'RC document is required' });
      }

      // Cloudinary must be configured
      if (!isConfigured()) {
        console.error('[Vehicle] Cloudinary not configured - check CLOUDINARY_* env vars');
        return res.status(500).json({ message: 'Server configuration error' });
      }

      const user = req.user || {};
      // PI-360 JWT often has user details nested under "data"
      const fromToken = (user.data && typeof user.data === 'object') ? user.data : user;

      const piUserId =
        fromToken.sub ||
        fromToken.id ||
        fromToken.user_id ||
        fromToken.userId ||
        user.sub ||
        user.id ||
        fromToken.email ||
        user.email ||
        (req.body.email && String(req.body.email).trim()) ||
        '';
      if (!piUserId) {
        console.error('[Vehicle] No user id in token or body. Token payload keys:', Object.keys(user));
        return res.status(400).json({ message: 'User identity missing. Please log in again.' });
      }

      const vehicleNumber = String(req.body.vehicle_number).toUpperCase().replace(/\s/g, '');
      const vehicleType = req.body.vehicle_type;

      // Prevent duplicate vehicle per user
      const existing = await VehicleRegistration.findOne({
        pi_user_id: piUserId,
        vehicle_number: vehicleNumber,
      });

      if (existing) {
        return res.status(400).json({ message: 'Vehicle number already registered by you' });
      }

      console.log('[Vehicle] Starting Cloudinary upload for', vehicleNumber);
      // Upload to Cloudinary (buffer -> base64 Data URI) with timeout to avoid hanging
      const isPdf = req.file.mimetype === 'application/pdf';
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const uploadPromise = cloudinary.uploader.upload(dataUri, {
        folder: CLOUDINARY_FOLDER,
        resource_type: isPdf ? 'raw' : CLOUDINARY_RESOURCE_TYPE,
      });
      const timeoutMs = 60000; // 60s
      const uploadResult = await Promise.race([
        uploadPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Cloudinary upload timed out')), timeoutMs)
        ),
      ]);

      cloudinaryPublicId = uploadResult.public_id;
      const rcUrl = uploadResult.secure_url;
      console.log('[Vehicle] Cloudinary upload done, public_id:', cloudinaryPublicId);

      // Read name, email, mobile etc from token (fromToken) or body
      const getName = () => fromToken.name || fromToken.full_name || user.name || user.full_name || '';
      const getEmail = () => fromToken.email || user.email || '';
      const getMobile = () => fromToken.mobile || fromToken.phone || fromToken.mobile_no || fromToken.contact || user.mobile || user.phone || '';
      const getAccountType = () => fromToken.account_type || fromToken.accountType || fromToken.role || user.account_type || user.role || '';
      const getDepartment = () => fromToken.department || fromToken.program || user.department || user.program || '';

      // Save to database
      console.log('[Vehicle] Saving to MongoDB...');
      const registration = new VehicleRegistration({
        pi_user_id: piUserId,
        name: sanitize(req.body.name || getName()),
        email: sanitize(req.body.email || getEmail()),
        mobile: sanitize(req.body.mobile || getMobile()),
        account_type: sanitize(req.body.account_type || getAccountType()),
        department: sanitize(req.body.department || getDepartment()),
        vehicle_number: vehicleNumber,
        vehicle_type: vehicleType,
        rc_url: rcUrl,
        cloudinary_public_id: cloudinaryPublicId,
      });

      await registration.save();
      console.log('[Vehicle] Mongo save success:', registration.vehicle_number, registration._id);

      return res.status(201).json({
        message: 'Vehicle registered successfully',
        id: registration._id,
        vehicle_number: registration.vehicle_number,
      });
    } catch (err) {
      // Rollback: delete uploaded file from Cloudinary if registration failed
      if (cloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(cloudinaryPublicId);
          console.log('[Vehicle] Rollback: deleted Cloudinary file', cloudinaryPublicId);
        } catch (destroyErr) {
          console.error('[Vehicle] Rollback failed:', destroyErr.message);
        }
      }

      console.error('Vehicle registration error:', err);

      // Cloudinary upload failure or timeout
      if (err.http_code || err.message?.includes('Cloudinary') || err.message?.includes('timed out')) {
        return res.status(500).json({ message: 'File upload failed. Check Cloudinary config and try again.' });
      }

      // Duplicate key (MongoDB)
      if (err.code === 11000) {
        return res.status(400).json({ message: 'Vehicle number already registered' });
      }

      return res.status(500).json({ message: 'Server Error' });
    }
  }
);

function sanitize(val) {
  if (val == null) return '';
  return String(val)
    .replace(/[<>'"&]/g, '')
    .trim()
    .slice(0, 500);
}

module.exports = router;
