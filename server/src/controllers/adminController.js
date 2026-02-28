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
    if (process.env.NODE_ENV !== 'production') console.error('[Admin] Login error:', err);
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
    const statusFilter = (req.query.status || '').trim().toLowerCase(); // '', 'approved', 'rejected', 'verified'
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { rc_number: regex },
        { owner_name: regex },
        { vehicle_number: regex },
        { user_name: regex },
        { user_email: regex },
        { student_name: regex },
        { email: regex },
        { rejection_reason: regex },
      ];
    }
    // Map filter "Two-Wheeler" / "Four-Wheeler" to Surepass vehicle_type values (e.g. Moped(2WN), Motor Car(LMV))
    if (vehicleType === 'Two-Wheeler') {
      filter.vehicle_type = { $regex: /moped|motorcycle|scooter|2\s*wn|2\s*[- ]?wheeler|2w/i };
    } else if (vehicleType === 'Four-Wheeler') {
      filter.vehicle_type = { $regex: /motor\s*car|lmv|jeep|car\s*\(|4\s*[- ]?wheeler|sedan|suv|hmv/i };
    }
    if (statusFilter === 'approved' || statusFilter === 'verified') {
      filter.$and = [
        { $or: [{ status: 'Approved' }, { status: 'verified' }, { verified: true }] },
      ];
    } else if (statusFilter === 'rejected') {
      filter.$and = [{ $or: [{ status: 'Rejected' }, { status: 'rejected' }] }];
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
    if (process.env.NODE_ENV !== 'production') console.error('[Admin] getVehicles error:', err);
    return res.status(500).json({ status: false, message: 'Server Error' });
  }
}

/**
 * DELETE /api/admin/vehicles/:id
 * Protected - delete a vehicle registration entry
 */
async function deleteVehicle(req, res) {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: false, message: 'Invalid vehicle ID' });
    }
    const doc = await VehicleRegistration.findByIdAndDelete(id);
    if (!doc) {
      return res.status(404).json({ status: false, message: 'Entry not found' });
    }
    return res.json({ status: true, message: 'Entry deleted successfully' });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.error('[Admin] deleteVehicle error:', err);
    return res.status(500).json({ status: false, message: 'Server Error' });
  }
}

module.exports = {
  login,
  me,
  getVehicles,
  deleteVehicle,
};

