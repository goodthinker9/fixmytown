// Admin controller: status updates + aggregate stats + AI weekly summary.
const { query } = require('../config/db');
const withTransaction = require('../utils/withTransaction');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { generateWeeklySummary } = require('../utils/aiHelpers');

const CATEGORIES = ['water', 'electricity', 'roads', 'garbage', 'safety', 'other'];
const STATUSES = ['reported', 'in_progress', 'resolved'];

// PATCH /api/admin/reports/:id/status  (admin only)
const updateStatus = asyncHandler(async (req, res, next) => {
  const { id: reportId } = req.params;
  const { status: newStatus, note } = req.body;

  const report = await withTransaction(async (client) => {
    // Lock the report so two admins updating the same report don't interleave.
    const lock = await client.query(
      'select status from reports where id = $1 for update',
      [reportId]
    );
    if (lock.rowCount === 0) {
      throw new AppError('Report not found.', 404);
    }
    const oldStatus = lock.rows[0].status;

    // status + resolved_at in one statement. resolved_at is set when the report
    // becomes 'resolved', cleared otherwise (e.g. reopened from resolved).
    const updateRes = await client.query(
      `update reports
          set status = $1,
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

// GET /api/admin/stats  (admin only)
const getStats = asyncHandler(async (req, res, next) => {
  // All five queries are independent reads, so run them concurrently.
  const [totalRes, categoryRes, statusRes, weekRes, avgRes] = await Promise.all([
    query('select count(*)::int as total from reports'),
    query('select category, count(*)::int as count from reports group by category'),
    query('select status, count(*)::int as count from reports group by status'),
    query(
      `select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
              count(*)::int as count
       from reports
       where created_at >= date_trunc('week', now()) - interval '7 weeks'
       group by week
       order by week`
    ),
    query(
      `select round(avg(extract(epoch from (resolved_at - created_at)) / 3600)::numeric, 1) as avg_hours
       from reports
       where resolved_at is not null`
    ),
  ]);

  // Fill every category with 0 so the chart always shows all six bars.
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  categoryRes.rows.forEach((r) => { byCategory[r.category] = r.count; });

  // Fill every status with 0 so all three states always appear.
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  statusRes.rows.forEach((r) => { byStatus[r.status] = r.count; });

  // Build the full 8-week series (oldest -> newest), 0 for empty weeks.
  // date_trunc('week') returns the Monday in UTC, so we compute Mondays in UTC.
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0 = Sunday
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;
  const thisMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday));

  const weekMap = new Map(weekRes.rows.map((r) => [r.week, r.count]));
  const byWeek = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(thisMonday);
    d.setUTCDate(thisMonday.getUTCDate() - 7 * i);
    const label = d.toISOString().slice(0, 10);
    byWeek.push({ week: label, count: weekMap.get(label) || 0 });
  }

  // pg returns numeric as a string to preserve precision -> convert to Number.
  const avgHoursRaw = avgRes.rows[0].avg_hours;

  res.json({
    total_reports: totalRes.rows[0].total,
    by_category: byCategory,
    by_status: byStatus,
    by_week: byWeek,
    avg_hours_to_resolve: avgHoursRaw === null ? null : Number(avgHoursRaw),
  });
});

// GET /api/admin/weekly-summary  (admin only)
// Builds stats on the fly and passes them to Claude for a prose summary.
const getWeeklySummary = asyncHandler(async (req, res, next) => {
  // Re-use the same stats query as getStats so we don't duplicate logic.
  const [totalRes, categoryRes, statusRes, weekRes, avgRes] = await Promise.all([
    query('select count(*)::int as total from reports'),
    query('select category, count(*)::int as count from reports group by category'),
    query('select status, count(*)::int as count from reports group by status'),
    query(
      `select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
              count(*)::int as count
       from reports
       where created_at >= date_trunc('week', now()) - interval '7 weeks'
       group by week
       order by week`
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
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;
  const thisMonday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(),
    now.getUTCDate() + diffToMonday
  ));
  const weekMap = new Map(weekRes.rows.map((r) => [r.week, r.count]));
  const by_week = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(thisMonday);
    d.setUTCDate(thisMonday.getUTCDate() - 7 * i);
    const label = d.toISOString().slice(0, 10);
    by_week.push({ week: label, count: weekMap.get(label) || 0 });
  }

  const stats = {
    total_reports: totalRes.rows[0].total,
    by_category: byCategory,
    by_status: byStatus,
    by_week,
    avg_hours_to_resolve: avgRes.rows[0].avg_hours === null
      ? null
      : Number(avgRes.rows[0].avg_hours),
  };

  const summary = await generateWeeklySummary(stats);

  if (!summary) {
    return next(new AppError('AI summary is unavailable right now. Please try again later.', 503));
  }

  res.json({ summary });
});

module.exports = { updateStatus, getStats, getWeeklySummary };
