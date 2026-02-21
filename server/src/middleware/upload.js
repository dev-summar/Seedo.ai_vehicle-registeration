/**
 * Multer memory storage middleware for file uploads.
 * Files are kept in memory (Buffer) for Cloudinary upload - NOT stored locally.
 * JWT must be validated before this middleware (handled in route order).
 */
const multer = require('multer');
const path = require('path');

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024; // 5MB
const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png'];

/**
 * Store file in memory buffer (for Cloudinary upload)
 * No local disk write
 */
const storage = multer.memoryStorage();

/**
 * Validate file type by mimetype and extension
 * Rejects unsupported types for security
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimeOk = allowedMimes.includes(file.mimetype);
  const extOk = allowedExts.includes(ext);

  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, JPG, JPEG, PNG'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = upload;
