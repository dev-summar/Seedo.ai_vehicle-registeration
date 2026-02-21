/**
 * Admin controller - custom admin auth (no PI-360).
 * Handles login, me, and vehicle listing for admin dashboard.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const VehicleRegistration = require('../models/VehicleRegistration');
const { signAdminToken } = require('../middleware/adminAuth');

/**
 * POST /api/admin/login
 * Body: { email, password }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: false, message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email: String(email).trim().toLowerCase() });
    if (!admin) {
      return res.status(401).json({ status: false, message: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({ status: false, message: 'Invalid email or password' });
    }

    const token = signAdminToken(admin);
    const adminData = {
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };

    return res.json({
      status: true,
      token,
      admin: adminData,
    });
  } catch (err) {
    console.error('[Admin] Login error:', err);
    return res.status(500).json({ status: false, message: 'Server Error' });
  }
}

/**
 * GET /api/admin/me
 * Protected - returns logged-in admin (req.admin set by middleware)
 */
function me(req, res) {
  const admin = req.admin;
  return res.json({
    status: true,
    admin: {
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
}

/**
 * GET /api/admin/vehicles
 * Protected - fetch all vehicle registrations with pagination and search
 */
async function getVehicles(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = (req.query.search || '').trim();
    const vehicleType = (req.query.vehicle_type || '').trim();
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { vehicle_number: regex },
        { name: regex },
        { email: regex },
        { mobile: regex },
      ];
    }
    if (vehicleType && ['Two-Wheeler', 'Four-Wheeler'].includes(vehicleType)) {
      filter.vehicle_type = vehicleType;
    }

    const [total, data] = await Promise.all([
      VehicleRegistration.countDocuments(filter),
      VehicleRegistration.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      status: true,
      total,
      page,
      limit,
      totalPages,
      data,
    });
  } catch (err) {
    console.error('[Admin] getVehicles error:', err);
    return res.status(500).json({ status: false, message: 'Server Error' });
  }
}

/**
 * GET /api/admin/vehicles/:id/rc
 * Protected - redirect to Cloudinary RC URL
 */
async function getVehicleRc(req, res) {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: false, message: 'Invalid vehicle ID' });
    }
    const doc = await VehicleRegistration.findById(id).select('rc_url').lean();
    if (!doc || !doc.rc_url) {
      return res.status(404).json({ status: false, message: 'RC document not found' });
    }
    return res.redirect(doc.rc_url);
  } catch (err) {
    console.error('[Admin] getVehicleRc error:', err);
    return res.status(500).json({ status: false, message: 'Server Error' });
  }
}

module.exports = {
  login,
  me,
  getVehicles,
  getVehicleRc,
};
