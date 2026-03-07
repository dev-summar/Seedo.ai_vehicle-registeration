const mongoose = require('mongoose');

/**
 * Admin collection - separate from PI-360 users.
 * Used for admin dashboard login (email + password, our own JWT).
 */
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['super_admin', 'security'] },
  created_at: { type: Date, default: Date.now },
});
// unique: true on email above already creates the index

// Use a dedicated collection in the same DB (no separate database name in URI)
module.exports = mongoose.model('Admin', adminSchema, 'vehicle_admins');
