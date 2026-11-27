/**
 * processImage — transforms a raw upload buffer with sharp.
 *
 * Steps:
 *  1. Verify it is a real image that sharp can decode (throws if not).
 *  2. Auto-rotate from EXIF orientation so the image is visually upright.
 *  3. Strip ALL metadata (EXIF, GPS, ICC, XMP) — privacy + size.
 *  4. Resize to fit within 1600 × 1600 px; never enlarge smaller images.
 *  5. Convert to WebP at quality 80.
 *
 * Returns { buffer, mimetype, ext }
 *   buffer   — processed image bytes
 *   mimetype — 'image/webp'
 *   ext      — 'webp'
 *
 * Throws an AppError(422) if the data is not a recognisable image.
 *
 * Why sharp?
 *   - rotate()   — corrects phone photos shot in portrait/landscape.
 *     Browsers display them wrong without this step.
 *   - withMetadata(false) — strips GPS coordinates. Posting a photo taken
 *     outside someone's home with GPS embedded is a privacy risk.
 *   - resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
 *     — caps the longest dimension so storage and bandwidth are predictable.
 *   - webp({ quality: 80 }) — WebP is 25–34 % smaller than JPEG at equal
 *     perceptual quality; most modern browsers support it.
 */
const sharp = require('sharp');
const AppError = require('./AppError');

const MAX_DIMENSION = 1600;
const WEBP_QUALITY  = 80;

async function processImage(buffer) {
  let pipeline;
  try {
    // sharp() throws "Input buffer contains unsupported image format" for
    // non-images (e.g. a PDF or plain text masquerading as JPEG).
    pipeline = sharp(buffer);
    // metadata() forces a decode of the first few bytes; it throws fast.
    await pipeline.metadata();
  } catch {
    throw new AppError(
      'The file you uploaded is not a valid image. Please upload a JPEG, PNG, or WEBP.',
      422
    );
  }

  const processed = await pipeline
    .rotate()                            // honour EXIF orientation, then strip EXIF
    .resize({
      width:              MAX_DIMENSION,
      height:             MAX_DIMENSION,
      fit:                'inside',       // maintain aspect ratio
      withoutEnlargement: true,           // never upscale small images
    })
    .withMetadata(false)                 // strip ALL metadata (EXIF, GPS, ICC)
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { buffer: processed, mimetype: 'image/webp', ext: 'webp' };
}

module.exports = { processImage };
