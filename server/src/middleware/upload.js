// Multer config: files are held in memory (not written to disk) so we can
// stream the buffer straight to Supabase Storage. 5MB max, JPEG/PNG/WEBP only.
const multer = require('multer');
const AppError = require('../utils/AppError');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only JPEG, PNG, and WEBP images are allowed.', 422));
    }
  },
});

// Wrap upload.single('image') so MulterErrors (e.g. LIMIT_FILE_SIZE) are turned
// into clean 422 AppErrors instead of falling through as generic 500s.
const uploadImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE: 'Image must be 5MB or smaller.',
        LIMIT_UNEXPECTED_FILE: 'Use the field name "image" for the file.',
      };
      return next(new AppError(messages[err.code] || 'Upload error.', 422, err.code));
    }
    return next(err); // fileFilter AppError passes through unchanged
  });
};

module.exports = uploadImage;
