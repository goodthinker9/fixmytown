/**
 * adminController.js — Backend-2
 *
 * Changes:
 *  - updateStatus now rejects (409) when the requested status equals the
 *    report's current status. "No change" transitions are semantically wrong
 *    and would create empty status_history rows.
 */
const { query }       = require('../config/db');
const withTransaction = require('../utils/withTransaction');
const AppError        = require('../utils/AppError');
const asyncHandler    = require('../utils/asyncHandler');
const { generateWeeklySummary } = require('../utils/aiHelpers');

const CATEGORIES = ['water', 'electricity', 'roads', 'garbage', 'safety', 'other'];
const STATUSES   = ['reported', 'in_progress', 'resolved'];
const updateStatus = asyncHandler(async (req, res, next) => {
  const { id: reportId } = req.params;
  const { status: newStatus, note } = req.body;

  const report = await withTransaction(async (client) => {
    const lock = await client.query(
      'select status from reports where id = $1 for update',
      [reportId]
    );
    if (lock.rowCount === 0) {
      throw new AppError('Report not found.', 404);
    }

    const oldStatus = lock.rows[0].status;

    // ── Backend-2: reject no-op transitions ──────────────────────────────
    if (oldStatus === newStatus) {
      throw new AppError(
        `Report is already ${newStatus.replace('_', ' ')}. Choose a different status.`,
        409
      );
    }

    const updateRes = await client.query(
      `update reports
          set status      = $1,
              resolved_at = case when $1 = 'resolved' then now() else null end
        where id = $2
        returning id, user_id, title, description, category, status, latitude,
                 longitude, image_url, priority, upvote_count, created_at,
                 updated_at, resolved_at`,
      [newStatus, reportId]
    );

    await client.query(
      `insert into status_history (report_id, old_status, new_status, note, changed_by)
       values ($1, $2, $3, $4, $5)`,
      [reportId, oldStatus, newStatus, note || null, req.user.id]
    );

    return updateRes.rows[0];
  });

  res.json({ report });
});

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res, _next) => {
  const [totalRes, categoryRes, statusRes, weekRes, avgRes] = await Promise.all([
    query('select count(*)::int as total from reports'),
    query('select category, count(*)::int as count from reports group by category'),
    query('select status,   count(*)::int as count from reports group by status'),
    query(
      `select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
              count(*)::int as count
       from reports
       where created_at >= date_trunc('week', now()) - interval '7 weeks'
       group by week order by week`
    ),
    query(
      `select round(avg(extract(epoch from (resolved_at - created_at)) / 3600)::numeric, 1) as avg_hours
       from reports where resolved_at is not null`
    ),
  ]);

  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  categoryRes.rows.forEach((r) => { byCategory[r.category] = r.count; });

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  statusRes.rows.forEach((r) => { byStatus[r.status] = r.count; });

  const now = new Date();
  const utcDay = now.getUTCDay();
  const diff   = utcDay === 0 ? -6 : 1 - utcDay;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  const weekMap = new Map(weekRes.rows.map((r) => [r.week, r.count]));
  const byWeek = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() - 7 * i);
    const label = d.toISOString().slice(0, 10);
    byWeek.push({ week: label, count: weekMap.get(label) || 0 });
  }

  const avgHoursRaw = avgRes.rows[0].avg_hours;
  res.json({
    total_reports:        totalRes.rows[0].total,
    by_category:          byCategory,
    by_status:            byStatus,
    by_week:              byWeek,
    avg_hours_to_resolve: avgHoursRaw === null ? null : Number(avgHoursRaw),
  });
});

// GET /api/admin/weekly-summary
const getWeeklySummary = asyncHandler(async (req, res, next) => {
  const [totalRes, categoryRes, statusRes, weekRes, avgRes] = await Promise.all([
    query('select count(*)::int as total from reports'),
    query('select category, count(*)::int as count from reports group by category'),
    query('select status,   count(*)::int as count from reports group by status'),
    query(
      `select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
              count(*)::int as count
       from reports
       where created_at >= date_trunc('week', now()) - interval '7 weeks'
       group by week order by week`
    ),
    query(
      `select round(avg(extract(epoch from (resolved_at - created_at)) / 3600)::numeric, 1) as avg_hours
       from reports where resolved_at is not null`
    ),
  ]);

  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  categoryRes.rows.forEach((r) => { byCategory[r.category] = r.count; });
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  statusRes.rows.forEach((r) => { byStatus[r.status] = r.count; });

  const now    = new Date();
  const utcDay = now.getUTCDay();
  const diff   = utcDay === 0 ? -6 : 1 - utcDay;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  const weekMap = new Map(weekRes.rows.map((r) => [r.week, r.count]));
  const by_week = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() - 7 * i);
    const label = d.toISOString().slice(0, 10);
    by_week.push({ week: label, count: weekMap.get(label) || 0 });
  }

  const stats = {
    total_reports:        totalRes.rows[0].total,
    by_category:          byCategory,
    by_status:            byStatus,
    by_week,
    avg_hours_to_resolve: avgRes.rows[0].avg_hours === null ? null : Number(avgRes.rows[0].avg_hours),
  };

  const summary = await generateWeeklySummary(stats);
  if (!summary) {
    return next(new AppError('AI summary is unavailable right now. Please try again later.', 503));
  }

  res.json({ summary });
});

// ── GET /api/admin/reports ──────────────────────────────────────────────────
// Paginated, filterable list of ALL reports for the admin review queue.
// Includes reporter name. Sorted newest first.
const listReportsForAdmin = asyncHandler(async (req, res, next) => {
  const { category, status, search, page, limit } = req.validated.query;

  const filters = [];
  const fp = [];

  if (category) { fp.push(category); filters.push(`r.category = $${fp.length}`); }
  if (status)   { fp.push(status);   filters.push(`r.status   = $${fp.length}`); }
  if (search) {
    const esc = search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
    fp.push(`%${esc}%`);
    filters.push(`r.title ILIKE $${fp.length} ESCAPE '\\'`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM reports r ${where}`,
    fp
  );
  const total = countRes.rows[0].total;

  const dp = [...fp, limit, offset];
  const dataRes = await query(
    `SELECT r.id, r.user_id, u.name AS reporter_name, r.title, r.description,
            r.category, r.status, r.latitude, r.longitude, r.image_url, r.priority,
            r.upvote_count, r.created_at, r.updated_at, r.resolved_at
     FROM reports r
     JOIN users u ON u.id = r.user_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT $${dp.length - 1} OFFSET $${dp.length}`,
    dp
  );

  res.json({
    reports: dataRes.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// ── GET /api/admin/reports/unreviewed-count ─────────────────────────────────
// Count of reports that still have status 'reported' (not yet actioned by an admin).
// Useful for a dashboard notification badge.
const getUnreviewedCount = asyncHandler(async (_req, res) => {
  const result = await query(
    `SELECT COUNT(*)::int AS unreviewed_count FROM reports WHERE status = 'reported'`
  );
  res.json({ unreviewed_count: result.rows[0].unreviewed_count });
});

module.exports = { updateStatus, getStats, getWeeklySummary, listReportsForAdmin, getUnreviewedCount };
