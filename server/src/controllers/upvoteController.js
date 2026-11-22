// Upvote toggle. A transaction + SELECT ... FOR UPDATE on the report row
// serializes concurrent toggles, so upvote_count can't drift and a user can't
// double-upvote. The composite PK on upvotes is the hard backstop.
const withTransaction = require('../utils/withTransaction');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/reports/:id/upvote  (authRequired)
const toggleUpvote = asyncHandler(async (req, res, next) => {
  const { id: reportId } = req.params;
  const userId = req.user.id;

  const result = await withTransaction(async (client) => {
    // Lock the report row. Concurrent upvotes on the SAME report block here
    // until this transaction commits, so the check/insert-or-delete + count
    // update run as one indivisible unit.
    const lock = await client.query(
      'select id from reports where id = $1 for update',
      [reportId]
    );
    if (lock.rowCount === 0) {
      throw new AppError('Report not found.', 404);
    }

    const existing = await client.query(
      'select 1 from upvotes where user_id = $1 and report_id = $2',
      [userId, reportId]
    );

    let upvoted;
    if (existing.rowCount > 0) {
      // Already upvoted -> remove it (toggle off).
      await client.query(
        'delete from upvotes where user_id = $1 and report_id = $2',
        [userId, reportId]
      );
      await client.query(
        'update reports set upvote_count = upvote_count - 1 where id = $1',
        [reportId]
      );
      upvoted = false;
    } else {
      // Not upvoted -> add it (toggle on). The composite PK guarantees no
      // duplicate even if two requests slip past the check.
      await client.query(
        'insert into upvotes (user_id, report_id) values ($1, $2)',
        [userId, reportId]
      );
      await client.query(
        'update reports set upvote_count = upvote_count + 1 where id = $1',
        [reportId]
      );
      upvoted = true;
    }

    const countRes = await client.query(
      'select upvote_count from reports where id = $1',
      [reportId]
    );
    return { upvoted, upvote_count: countRes.rows[0].upvote_count };
  });

  res.json(result);
});

module.exports = { toggleUpvote };
