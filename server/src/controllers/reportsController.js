// Reports controller: create (with optional image), list (filter/search/sort/
// paginate), get one (with status history), delete (owner or admin).
const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { uploadReportImage } = require('../utils/storage');

// POST /api/reports  (authRequired, optional image)
const createReport = asyncHandler(async (req, res, next) => {
  const { title, description, category, latitude, longitude } = req.body;

  // Upload the image first (if any), then persist the report row.
  // Trade-off: if the DB insert fails after a successful upload, the image is
  // orphaned in Storage. Acceptable for now; a cleanup job could remove orphans.
  let image_url = null;
  if (req.file) {
    image_url = await uploadReportImage(req.file);
  }

  // status/priority/upvote_count/created_at/updated_at use DB defaults.
  const result = await query(
    `insert into reports (user_id, title, description, category, latitude, longitude, image_url)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, user_id, title, description, category, status, latitude, longitude,
               image_url, priority, upvote_count, created_at, updated_at, resolved_at`,
    [req.user.id, title, description, category, latitude, longitude, image_url]
  );

  res.status(201).json({ report: result.rows[0] });
});

// GET /api/reports  (public)
const listReports = asyncHandler(async (req, res, next) => {
  // Values come from req.validated.query (Zod parsed + coerced + defaults).
  const { category, status, search, sort, page, limit } = req.validated.query;

  // Build the WHERE clause with parameterized placeholders ($1, $2, ...).
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

  // `sort` is constrained to a known enum by the schema, so interpolation is safe.
  const orderBy = sort === 'top' ? 'upvote_count desc, created_at desc' : 'created_at desc';
  const offset = (page - 1) * limit;

  // Total count (same filters, no pagination) for the client.
  const countResult = await query(
    `select count(*)::int as total from reports ${whereClause}`,
    filterParams
  );
  const total = countResult.rows[0].total;

  // One page of results. Limit/offset are parameterized to prevent injection.
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

// GET /api/reports/:id  (public) — report + its status history
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

  // LEFT join on changed_by: the admin who made a change may have been deleted
  // (ON DELETE SET NULL), but we still show the history entry.
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

  // ON DELETE CASCADE cleans up the report's upvotes and status_history.
  await query('delete from reports where id = $1', [id]);
  res.status(204).end();
});

module.exports = { createReport, listReports, getReport, deleteReport };
