/**
 * reportsController.js — Backend-2
 *
 * Changes:
 *  1. createReport — full reorder + new logic:
 *     a. Zod validation (done in route middleware before this runs)
 *     b. Require image (multer puts it in req.file)
 *     c. AI classify (non-blocking, falls back gracefully)
 *     d. SQL bounding-box + haversine duplicate search (no LIMIT before sort)
 *     e. If duplicate found AND request does NOT include force=true →
 *        respond 409 with the duplicate; DO NOT save or upload anything.
 *     f. If no duplicate (or force=true) → process image with sharp →
 *        upload → DB insert + first status_history row in one transaction.
 *     g. If DB insert fails after upload → compensating delete from Storage.
 *
 *  2. deleteReport — after deleting the row, delete its image from Storage
 *     (best-effort: logs failures, never fails the HTTP request).
 *
 *  3. listReports — unchanged from Backend-1 (proximity-search CTE).
 *  4. getReport  — unchanged.
 */
const { query } = require('../config/db');
const AppError       = require('../utils/AppError');
const asyncHandler   = require('../utils/asyncHandler');
const withTransaction = require('../utils/withTransaction');
const { processImage }             = require('../utils/processImage');
const { uploadReportImage, deleteReportImage } = require('../utils/storage');
const { classifyReport, detectDuplicate }      = require('../utils/aiHelpers');

// ── haversine ────────────────────────────────────────────────────────────────
function haversineMetres(lat1, lon1, lat2, lon2) {
  const R    = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── POST /api/reports ────────────────────────────────────────────────────────
const createReport = asyncHandler(async (req, res, next) => {
  const { title, description, category, latitude, longitude } = req.body;
  // `force` skips the duplicate check; the client re-sends with force=true
  // when the user confirms "No, mine is different".
  const force = req.body.force === 'true' || req.body.force === true;

  // ── 1. Image is required ────────────────────────────────────────────────
  if (!req.file) {
    return next(new AppError('A photo is required.', 422));
  }

  // ── 2. AI classification (non-blocking) ─────────────────────────────────
  const aiResult = await classifyReport({ title, description });
  const finalCategory =
    category === 'other' && aiResult.category ? aiResult.category : category;
  const finalPriority = aiResult.priority;

  // ── 3. Duplicate detection ──────────────────────────────────────────────
  // Skip entirely when force=true (user has explicitly said "it's different").
  if (!force) {
    let duplicateCandidate = null;
    try {
      // Bounding-box pre-filter in SQL (~200 m at equator ≈ 0.0018°).
      // We exclude resolved reports: if the same issue was fixed and broke
      // again, it deserves a fresh report.
      // We do NOT LIMIT before computing haversine so closer matches
      // that happen to be listed after the 50th entry aren't missed.
      const DEGREES = 0.0018; // ≈ 200 m
      const nearby = await query(
        `select id, title, description, latitude, longitude, image_url, status
         from reports
         where category = $1
           and status   <> 'resolved'
           and created_at >= now() - interval '30 days'
           and latitude  between $2 - $3 and $2 + $3
           and longitude between $4 - $3 and $4 + $3
         order by
           ( (latitude  - $2) * (latitude  - $2)
           + (longitude - $4) * (longitude - $4) )
         limit 20`,
        [finalCategory, parseFloat(latitude), DEGREES, parseFloat(longitude)]
      );

      // Haversine confirmation (SQL bounding box is an approximation).
      const confirmed = nearby.rows.filter(
        (r) =>
          haversineMetres(
            parseFloat(latitude),
            parseFloat(longitude),
            parseFloat(r.latitude),
            parseFloat(r.longitude)
          ) <= 200
      );

      if (confirmed.length) {
        const { isDuplicate, matchId } = await detectDuplicate({
          title,
          description,
          category: finalCategory,
          candidates: confirmed.slice(0, 5),
        });

        if (isDuplicate) {
          const match = confirmed.find((r) => r.id === matchId) || confirmed[0];
          duplicateCandidate = {
            id:        match.id,
            title:     match.title,
            image_url: match.image_url,
            status:    match.status,
          };
        }
      }
    } catch (err) {
      console.warn('[duplicate check] failed:', err.message);
      // Non-fatal: continue and save.
    }

    if (duplicateCandidate) {
      // 409 Conflict — do NOT save or upload anything.
      return res.status(409).json({
        error:        'A similar report already exists nearby.',
        duplicate_of: duplicateCandidate.id,
        duplicate:    duplicateCandidate,
      });
    }
  }

  // ── 4. Process image with sharp ─────────────────────────────────────────
  // Throws AppError(422) if the data is not a recognisable image.
  const { buffer, mimetype, ext } = await processImage(req.file.buffer);

  // ── 5. Upload to Supabase Storage ───────────────────────────────────────
  const { publicUrl, storagePath } = await uploadReportImage(buffer, mimetype, ext);

  // ── 6. DB insert + first status_history in one transaction ──────────────
  // If the insert fails, the compensating cleanup deletes the uploaded file.
  let report;
  try {
    report = await withTransaction(async (client) => {
      const r = await client.query(
        `insert into reports
           (user_id, title, description, category, latitude, longitude, image_url, priority)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning id, user_id, title, description, category, status, latitude, longitude,
                   image_url, priority, upvote_count, created_at, updated_at, resolved_at`,
        [
          req.user.id,
          title,
          description,
          finalCategory,
          latitude,
          longitude,
          publicUrl,
          finalPriority,
        ]
      );

      const inserted = r.rows[0];

      // Insert the first status_history row (status = 'reported', old_status = null).
      await client.query(
        `insert into status_history (report_id, old_status, new_status, note, changed_by)
         values ($1, null, 'reported', null, $2)`,
        [inserted.id, req.user.id]
      );

      return inserted;
    });
  } catch (err) {
    // Compensating cleanup: delete the already-uploaded image so Storage
    // doesn't accumulate orphans.
    await deleteReportImage(publicUrl);
    throw err; // re-throw so asyncHandler → errorHandler responds.
  }

  res.status(201).json({
    report,
    duplicate_of: null,
    ai_applied: { category: finalCategory, priority: finalPriority },
  });
});

// ── GET /api/reports ─────────────────────────────────────────────────────────
const listReports = asyncHandler(async (req, res, _next) => {
  const { category, status, search, sort, page, limit, lat, lng, radius_km } = req.validated.query;

  const hasProximity = lat !== undefined && lng !== undefined;

  if (!hasProximity) {
    const filters = [];
    const fp      = [];

    if (category) { fp.push(category); filters.push(`category = $${fp.length}`); }
    if (status)   { fp.push(status);   filters.push(`status = $${fp.length}`); }
    if (search) {
      const esc = search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      fp.push(`%${esc}%`);
      filters.push(`title ilike $${fp.length} escape '\\'`);
    }

    const where   = filters.length ? `where ${filters.join(' and ')}` : '';
    const orderBy = sort === 'top' ? 'upvote_count desc, created_at desc' : 'created_at desc';
    const offset  = (page - 1) * limit;

    const count  = await query(`select count(*)::int as total from reports ${where}`, fp);
    const total  = count.rows[0].total;
    const dp     = [...fp, limit, offset];
    const data   = await query(
      `select id, user_id, title, description, category, status, latitude, longitude,
              image_url, priority, upvote_count, created_at, updated_at, resolved_at
       from reports ${where}
       order by ${orderBy}
       limit $${dp.length - 1} offset $${dp.length}`,
      dp
    );

    return res.json({ reports: data.rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  }

  // Proximity path (CTE haversine) — unchanged from Backend-1.
  const pp = [lat, lng, radius_km];
  const ef = [], ep = [];

  if (category) { ep.push(category); ef.push(`category = $${pp.length + ep.length}`); }
  if (status)   { ep.push(status);   ef.push(`status = $${pp.length + ep.length}`); }
  if (search) {
    const esc = search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
    ep.push(`%${esc}%`);
    ef.push(`title ilike $${pp.length + ep.length} escape '\\'`);
  }

  const ew      = ef.length ? `and ${ef.join(' and ')}` : '';
  const orderBy = sort === 'distance' ? 'distance_km asc' : sort === 'top' ? 'upvote_count desc, created_at desc' : 'created_at desc';
  const offset  = (page - 1) * limit;
  const ap      = [...pp, ...ep];

  const cte = `
    with nearby as (
      select id,
             round((2 * 6371 * asin(sqrt(
               power(sin(radians((latitude  - $1) / 2)), 2)
               + cos(radians($1)) * cos(radians(latitude))
               * power(sin(radians((longitude - $2) / 2)), 2)
             )))::numeric, 2) as distance_km
      from reports
      where (2 * 6371 * asin(sqrt(
               power(sin(radians((latitude  - $1) / 2)), 2)
               + cos(radians($1)) * cos(radians(latitude))
               * power(sin(radians((longitude - $2) / 2)), 2)
             ))) <= $3
    )`;

  const countRes = await query(
    `${cte} select count(*)::int as total from reports r join nearby n on n.id = r.id where true ${ew}`,
    ap
  );
  const total = countRes.rows[0].total;

  const lp = ap.length + 1, op = ap.length + 2;
  const dataRes = await query(
    `${cte}
     select r.id, r.user_id, r.title, r.description, r.category, r.status,
            r.latitude, r.longitude, r.image_url, r.priority, r.upvote_count,
            r.created_at, r.updated_at, r.resolved_at, n.distance_km
     from reports r join nearby n on n.id = r.id
     where true ${ew}
     order by ${orderBy}
     limit $${lp} offset $${op}`,
    [...ap, limit, offset]
  );

  res.json({ reports: dataRes.rows, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// ── GET /api/reports/:id ─────────────────────────────────────────────────────
const getReport = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const rr = await query(
    `select r.id, r.user_id, u.name as reporter_name, r.title, r.description,
            r.category, r.status, r.latitude, r.longitude, r.image_url, r.priority,
            r.upvote_count, r.created_at, r.updated_at, r.resolved_at
     from reports r join users u on u.id = r.user_id where r.id = $1`,
    [id]
  );
  if (rr.rowCount === 0) return next(new AppError('Report not found.', 404));

  const hr = await query(
    `select sh.id, sh.old_status, sh.new_status, sh.note, sh.changed_by,
            u.name as changed_by_name, sh.created_at
     from status_history sh left join users u on u.id = sh.changed_by
     where sh.report_id = $1 order by sh.created_at asc`,
    [id]
  );

  res.json({ report: rr.rows[0], status_history: hr.rows });
});

// ── DELETE /api/reports/:id ──────────────────────────────────────────────────
const deleteReport = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const result = await query(
    'select user_id, image_url from reports where id = $1',
    [id]
  );
  if (result.rowCount === 0) return next(new AppError('Report not found.', 404));

  const { user_id, image_url } = result.rows[0];
  const isOwner = user_id === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return next(new AppError('You are not allowed to delete this report.', 403));
  }

  await query('delete from reports where id = $1', [id]);

  // Best-effort Storage cleanup: log failures, never fail the HTTP request.
  await deleteReportImage(image_url);

  res.status(204).end();
});

module.exports = { createReport, listReports, getReport, deleteReport };
