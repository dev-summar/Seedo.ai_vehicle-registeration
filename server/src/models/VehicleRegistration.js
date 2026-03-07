const mongoose = require('mongoose');

/**
 * Vehicle registration schema (Surepass RC verification).
 * owner_name is always from Surepass response; never store user-entered owner_name directly.
 */
const vehicleRegistrationSchema = new mongoose.Schema({
  rc_number: { type: String, required: true, trim: true },
  owner_name: { type: String, default: '', trim: true }, // From Surepass only

  vehicle_number: { type: String, default: '', trim: true, uppercase: true },
  vehicle_type: { type: String, default: '', trim: true },
  vehicle_class: { type: String, default: '', trim: true },
  fuel_type: { type: String, default: '', trim: true },
  manufacturer: { type: String, default: '', trim: true },
  model: { type: String, default: '', trim: true },
  registration_date: { type: String, default: '', trim: true },
  insurance_valid_till: { type: String, default: '', trim: true },

  user_id: { type: String, required: true, trim: true },
  student_name: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true },
  mobile: { type: String, default: '', trim: true },
  account_type: { type: String, default: '', trim: true },
  department: { type: String, default: '', trim: true },

  user_name: { type: String, default: '', trim: true }, // Alias for dashboard
  user_email: { type: String, default: '', trim: true },

  status: { type: String, enum: ['Approved', 'Rejected'], default: 'Approved' },
  rejection_reason: { type: String, default: '', trim: true },
  created_at: { type: Date, default: Date.now },
});

vehicleRegistrationSchema.index(
  { rc_number: 1 },
  { unique: true, partialFilterExpression: { status: 'Approved' } }
);

// Use a dedicated collection in the same DB (no separate database name in URI)
module.exports = mongoose.model(
  'VehicleRegistration',
  vehicleRegistrationSchema,
  'vehicle_registrations'
);
