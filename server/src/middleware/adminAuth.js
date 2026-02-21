/**
 * Admin JWT auth middleware - for /api/admin/* routes only.
 * Completely separate from PI-360 JWT. Uses ADMIN_JWT_SECRET.
 * Verifies token and attaches req.admin (no password).
 */
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-secret-change-in-production';
const EXPIRY = '8h';

function signAdminToken(admin) {
  return jwt.sign(
    { id: admin._id.toString(), email: admin.email, role: admin.role },
    ADMIN_JWT_SECRET,
    { expiresIn: EXPIRY }
  );
}

async function adminAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - Admin token required' });
  }

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select('-password').lean();
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }
    req.admin = admin;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired - Please login again' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

module.exports = { adminAuthMiddleware, signAdminToken };
