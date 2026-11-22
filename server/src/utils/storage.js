// Uploads a report image to the Supabase "report-images" bucket and returns
// its public URL. Uses the service role key (see config/supabase.js), so it
// bypasses Storage policies.
const crypto = require('crypto');
const supabase = require('../config/supabase');
const AppError = require('./AppError');

const BUCKET = 'report-images';
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const uploadReportImage = async (file) => {
  // A random UUID filename avoids collisions and doesn't leak the uploader's
  // original filename (minor privacy touch).
  const ext = EXT_BY_MIME[file.mimetype] || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

  if (error) {
    // 502 = the request was fine but the storage provider rejected the upload.
    throw new AppError('Failed to upload image.', 502, error.message);
  }

  // The bucket is public (set in Phase 1), so this URL is directly readable.
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

module.exports = { uploadReportImage };
