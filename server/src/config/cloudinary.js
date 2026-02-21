/**
 * Cloudinary v2 configuration
 * Loads credentials from environment variables.
 * Never expose CLOUDINARY_API_SECRET to frontend.
 */
const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Configure Cloudinary with env vars (loaded from process.env by dotenv in index.js)
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});
if (!cloudName || !apiKey || !apiSecret) {
  console.warn('[Cloudinary] Missing env: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET');
}

/**
 * Check if Cloudinary is properly configured
 */
function isConfigured() {
  return !!(cloudName && apiKey && apiSecret);
}

module.exports = { cloudinary, isConfigured };
