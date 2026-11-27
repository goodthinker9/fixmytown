/**
 * storage.js — Supabase Storage helpers.
 *
 * Changes (Backend-1):
 *  - uploadReportImage now accepts a processed buffer + explicit mime/ext
 *    (the buffer is already WebP after sharp processing; mimetype/ext
 *    are passed in rather than read from the multer file object).
 *  - deleteReportImage added — best-effort Storage deletion used by
 *    deleteReport (after DB row deletion) and by createReport compensating
 *    cleanup (if the INSERT fails after the upload).
 */
const crypto   = require('crypto');
const supabase = require('../config/supabase');
const AppError = require('./AppError');
const env      = require('../config/env');

const BUCKET = 'report-images';

const _SERVICE_ROLE_KEY_PLACEHOLDER = /replace_with/i;

/**
 * Upload a processed image buffer to Supabase Storage.
 *
 * @param {Buffer} buffer     — processed image bytes (WebP after sharp)
 * @param {string} mimetype   — 'image/webp'
 * @param {string} ext        — 'webp'
 * @returns {Promise<{ publicUrl: string, storagePath: string }>}
 */
const uploadReportImage = async (buffer, mimetype, ext) => {
  if (_SERVICE_ROLE_KEY_PLACEHOLDER.test(env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new AppError(
      'Image uploads are not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env (Supabase > Project Settings > API > service_role secret) and restart the server.',
      503
    );
  }

  const storagePath = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: mimetype, upsert: false });

  if (error) {
    throw new AppError('Failed to upload image.', 502, error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, storagePath };
};

/**
 * Delete an image from Supabase Storage by its full public URL.
 *
 * Extracts the storage path from the URL by stripping the bucket prefix.
 * Best-effort: logs failures but does NOT throw, so callers never fail
 * the HTTP request because of a cleanup problem.
 *
 * @param {string} publicUrl  — the value stored in reports.image_url
 */
const deleteReportImage = async (publicUrl) => {
  if (!publicUrl) return;
  try {
    // The public URL looks like:
    //   https://<project>.supabase.co/storage/v1/object/public/report-images/<uuid>.webp
    // We only need the path after the bucket name.
    const marker = `/report-images/`;
    const idx    = publicUrl.indexOf(marker);
    if (idx === -1) {
      console.warn('[storage] deleteReportImage: unexpected URL format', publicUrl);
      return;
    }
    const storagePath = publicUrl.slice(idx + marker.length);
    const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (error) {
      console.warn('[storage] deleteReportImage failed:', error.message);
    }
  } catch (err) {
    console.warn('[storage] deleteReportImage unexpected error:', err.message);
  }
};

module.exports = { uploadReportImage, deleteReportImage };
