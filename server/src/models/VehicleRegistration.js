const mongoose = require('mongoose');

/**
 * Vehicle registration schema
 * RC files are stored on Cloudinary; rc_url is the secure_url, cloudinary_public_id for deletion
 */
const vehicleRegistrationSchema = new mongoose.Schema({
  pi_user_id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, default: '' },
  account_type: { type: String, default: '' },
  department: { type: String, default: '' },
  vehicle_number: { type: String, required: true, uppercase: true },
  vehicle_type: { type: String, required: true, enum: ['Two-Wheeler', 'Four-Wheeler'] },
  rc_url: { type: String, required: true }, // Cloudinary secure_url
  cloudinary_public_id: { type: String, required: true }, // For deletion/rollback
  created_at: { type: Date, default: Date.now },
});

vehicleRegistrationSchema.index({ pi_user_id: 1, vehicle_number: 1 }, { unique: true });

module.exports = mongoose.model('VehicleRegistration', vehicleRegistrationSchema);
