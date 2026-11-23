// Reports controller: create (with optional image + AI classify/duplicate),
// list (filter/search/sort/paginate), get one (with status history),
// delete (owner or admin).
const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { uploadReportImage } = require('../utils/storage');
const { classifyReport, detectDuplicate } = require('../utils/aiHelpers');

// Haversine distance in metres between two lat/lng pairs.
// Used to find candidate duplicates within 200 m before asking Claude.
function haversineMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// POST /api/reports  (authRequired, optional image)
const createReport = asyncHandler(async (req, res, next) => {
  const { title, description, category, latitude, longitude } = req.body;

  // --- Step 1: Upload image (if provided) ---
  let image_url = null;
  if (req.file) {
    image_url = await uploadReportImage(req.file);
  }

  // --- Step 2: AI classification (non-blocking) ---
  // We always ask Claude for a priority. We use Claude's category suggestion
  // only when the user chose "other" — if they chose something specific we
  // respect their choice.
  // If Claude fails (timeout, quota, bad JSON), fallback = { category: null, priority: 'medium' }.
  const aiResult = await classifyReport({ title, description });
  const finalCategory =
    category === 'other' && aiResult.category ? aiResult.category : category;
  const finalPriority = aiResult.priority; // always use AI priority

  // --- Step 3: Duplicate detection (non-blocking) ---
  // 1. Pull reports in the same (final) category from the last 30 days.
  // 2. Filter in JS to those within 200 m (avoids PostGIS dependency).
  // 3. Send up to 5 candidates to Claude.
  // If anything fails we continue and return duplicate_of: null.
  let duplicate_of = null;
  try {
    const nearby = await query(
      `select id, title, description, latitude, longitude
       from reports
       where category = $1
         and created_at >= now() - interval '30 days'
       order by created_at desc
       limit 50`,
      [finalCategory]
    );

    const candidates = nearby.rows.filter(
      (r) =>
        haversineMetres(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(r.latitude),
          parseFloat(r.longitude)
        ) <= 200
    );

    if (candidates.length) {
      const { isDuplicate, matchId } = await detectDuplicate({
        title,
        description,
        category: finalCategory,
        candidates: candidates.slice(0, 5),
      });
      if (isDuplicate) duplicate_of = matchId;
    }
  } catch (err) {
    console.warn('[duplicate check] failed:', err.message);
  }

  // --- Step 4: Save ---
  // If a duplicate was found we still save the report (the user may confirm
  // it's a different issue on the frontend) but we return the matching id.
  const result = await query(
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
      image_url,
      finalPriority,
    ]
  );

  res.status(201).json({
    report: result.rows[0],
    // null = no duplicate found (or AI unavailable). Frontend uses this to
    // show "is this the same issue?" if non-null.
    duplicate_of,
    ai_applied: { category: finalCategory, priority: finalPriority },
  });
});

// GET /api/reports  (public)
const listReports = asyncHandler(async (req, res, next) => {
  const { category, status, search, sort, page, limit } = req.validated.query;

  const filters = [];
  const filterParams = [];

  if (category) {
    filterParams.push(category);
    filters.push(`category = $${filterParams.length}`);
  }
  if (status) {
    filterParams.push(status);
    filters.push(`status = $${filterParams.length}`);
  }
  if (search) {
    filterParams.push(`%${search}%`);
    filters.push(`title ilike $${filterParams.length}`);
  }

  const whereClause = filters.length ? `where ${filters.join(' and ')}` : '';
  const orderBy = sort === 'top' ? 'upvote_count desc, created_at desc' : 'created_at desc';
  const offset = (page - 1) * limit;

  const countResult = await query(
    `select count(*)::int as total from reports ${whereClause}`,
    filterParams
  );
  const total = countResult.rows[0].total;

  const dataParams = [...filterParams, limit, offset];
  const dataResult = await query(
    `select id, user_id, title, description, category, status, latitude, longitude,
            image_url, priority, upvote_count, created_at, updated_at, resolved_at
     from reports ${whereClause}
     order by ${orderBy}
     limit $${dataParams.length - 1} offset $${dataParams.length}`,
    dataParams
  );

  res.json({
    reports: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /api/reports/:id  (public)
const getReport = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const reportResult = await query(
    `select r.id, r.user_id, u.name as reporter_name, r.title, r.description,
            r.category, r.status, r.latitude, r.longitude, r.image_url, r.priority,
            r.upvote_count, r.created_at, r.updated_at, r.resolved_at
     from reports r
     join users u on u.id = r.user_id
     where r.id = $1`,
    [id]
  );

  if (reportResult.rowCount === 0) {
    return next(new AppError('Report not found.', 404));
  }

  const historyResult = await query(
    `select sh.id, sh.old_status, sh.new_status, sh.note, sh.changed_by,
            u.name as changed_by_name, sh.created_at
     from status_history sh
     left join users u on u.id = sh.changed_by
     where sh.report_id = $1
     order by sh.created_at asc`,
    [id]
  );

  res.json({
    report: reportResult.rows[0],
    status_history: historyResult.rows,
  });
});

// DELETE /api/reports/:id  (owner or admin)
const deleteReport = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const result = await query('select user_id from reports where id = $1', [id]);
  if (result.rowCount === 0) {
    return next(new AppError('Report not found.', 404));
  }

  const isOwner = result.rows[0].user_id === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return next(new AppError('You are not allowed to delete this report.', 403));
  }

  await query('delete from reports where id = $1', [id]);
  res.status(204).end();
});

module.exports = { createReport, listReports, getReport, deleteReport };
