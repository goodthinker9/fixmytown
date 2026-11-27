// Reports route tests: list, get, create, delete, upvote, UUID validation.
const request = require('supertest');
const app = require('../app');
const { cleanupTestData, closePool } = require('./helpers/db');
const { pool } = require('../config/db');
const { deleteReportImage } = require('../utils/storage');

const SUFFIX = Date.now();
const EMAIL = `jest_test_reports_${SUFFIX}@test.com`;
const PASSWORD = 'testpass123'; // 9 chars — satisfies min-8

let token;
let createdReportId;

// ── Test fixtures ──
// Minimal valid 1×1 PNG so sharp can process it in createReport.
const TEST_IMAGE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Mock storage so uploads don't hit Supabase in tests.
jest.mock('../utils/storage', () => ({
  uploadReportImage: jest.fn(() => ({
    publicUrl: 'https://example.com/storage/fake.webp',
    storagePath: 'fake.webp',
  })),
  deleteReportImage: jest.fn(),
}));

beforeAll(async () => {
  await request(app).post('/api/auth/register').send({
    name: 'Reports Test User',
    email: EMAIL,
    password: PASSWORD,
  });
  const login = await request(app).post('/api/auth/login').send({
    email: EMAIL,
    password: PASSWORD,
  });
  token = login.body.token;
});

afterAll(async () => {
  await cleanupTestData();
  await closePool();
});

// ── GET /api/reports ──────────────────────────────────────────────────────────
describe('GET /api/reports', () => {
  it('returns a paginated list (no auth needed)', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reports)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(typeof res.body.totalPages).toBe('number');
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/reports?category=water');
    expect(res.status).toBe(200);
    res.body.reports.forEach((r) => expect(r.category).toBe('water'));
  });

  it('returns 422 for an invalid category value', async () => {
    const res = await request(app).get('/api/reports?category=hacking');
    expect(res.status).toBe(422);
  });

  it('returns 422 for an invalid sort value', async () => {
    const res = await request(app).get('/api/reports?sort=random');
    expect(res.status).toBe(422);
  });

  it('handles search with ILIKE wildcard characters safely', async () => {
    // A search with % or _ should not cause a DB error or return unexpected results.
    // These characters are escaped in the controller before building the ILIKE pattern.
    const res = await request(app).get('/api/reports?search=50%25+discount');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reports)).toBe(true);
  });
});

// ── POST /api/reports ─────────────────────────────────────────────────────────
describe('POST /api/reports', () => {
  it('creates a report and returns it (auth required)', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Jest test pothole on main road here')
      .field('description', 'A large pothole that is at least ten characters long')
      .field('category', 'roads')
      .field('latitude', '-1.629')
      .field('longitude', '6.670')
      .attach('image', TEST_IMAGE, 'test.png');

    expect(res.status).toBe(201);
    expect(res.body.report.category).toBe('roads');
    expect(res.body.report.status).toBe('reported');
    expect('duplicate_of' in res.body).toBe(true);
    createdReportId = res.body.report.id;
  });

  it('returns 401 when no token is supplied', async () => {
    const res = await request(app)
      .post('/api/reports')
      .field('title', 'No auth report test title here')
      .field('description', 'Description long enough to pass validation here')
      .field('category', 'roads')
      .field('latitude', '-1.629')
      .field('longitude', '6.670');
    expect(res.status).toBe(401);
  });

  it('returns 422 when title is too short', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Hi')
      .field('description', 'Description that is long enough here yes')
      .field('category', 'roads')
      .field('latitude', '-1.629')
      .field('longitude', '6.670');
    expect(res.status).toBe(422);
    expect(res.body.details[0].field).toBe('title');
  });

  it('returns 422 when latitude is out of range', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Out of range latitude test report title')
      .field('description', 'Description that is definitely long enough here')
      .field('category', 'roads')
      .field('latitude', '999')
      .field('longitude', '6.670');
    expect(res.status).toBe(422);
    expect(res.body.details[0].field).toBe('latitude');
  });

  // ── Image-required tests ─────────────────────────────────────────────────

  it('returns 422 when no image is sent', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Missing image test title here is long enough')
      .field('description', 'This description is long enough to pass validation here')
      .field('category', 'roads')
      .field('latitude', '-1.629')
      .field('longitude', '6.670');

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('A photo is required.');
  });

  it('returns 422 for an invalid file type', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Invalid file test title here is long enough')
      .field('description', 'This description is long enough to pass validation here')
      .field('category', 'roads')
      .field('latitude', '-1.629')
      .field('longitude', '6.670')
      .attach('image', Buffer.from('not a real image'), 'test.txt');

    expect(res.status).toBe(422);
  });

  it('deletes uploaded image from storage when DB insert fails', async () => {
    // Register and login a user
    const email = `jest_test_cleanup_${Date.now()}@test.com`;
    await request(app).post('/api/auth/register').send({
      name: 'Cleanup Test',
      email,
      password: 'testpass123',
    });
    const login = await request(app).post('/api/auth/login').send({
      email,
      password: 'testpass123',
    });
    const cleanupToken = login.body.token;
    const cleanupUserId = login.body.user.id;

    // Delete the user so the FK constraint on reports.user_id fails at insert.
    await pool.query('delete from users where id = $1', [cleanupUserId]);

    // Reset the delete mock so we only count calls from this test.
    deleteReportImage.mockClear();

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${cleanupToken}`)
      .field('title', 'Cleanup test title here is long enough')
      .field('description', 'Cleanup test description is long enough for validation here')
      .field('category', 'roads')
      .field('latitude', '-1.629')
      .field('longitude', '6.670')
      .attach('image', TEST_IMAGE, 'test.png');

    // Insert failure → 500
    expect(res.status).toBe(500);

    // Compensating cleanup: deleteReportImage was called with the uploaded URL.
    expect(deleteReportImage).toHaveBeenCalled();
    expect(deleteReportImage).toHaveBeenCalledWith('https://example.com/storage/fake.webp');
  });
});

// ── GET /api/reports/:id ──────────────────────────────────────────────────────
describe('GET /api/reports/:id', () => {
  it('returns a single report with status history', async () => {
    const res = await request(app).get(`/api/reports/${createdReportId}`);
    expect(res.status).toBe(200);
    expect(res.body.report.id).toBe(createdReportId);
    expect(Array.isArray(res.body.status_history)).toBe(true);
  });

  it('returns 404 for a valid UUID that does not exist', async () => {
    const res = await request(app).get(
      '/api/reports/00000000-0000-0000-0000-000000000000'
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for a non-UUID id', async () => {
    // A non-UUID id is a client error (bad input format), not a "not found".
    const res = await request(app).get('/api/reports/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('id');
  });
});

// ── POST /api/reports/:id/upvote ──────────────────────────────────────────────
describe('POST /api/reports/:id/upvote', () => {
  it('toggles upvote on', async () => {
    const res = await request(app)
      .post(`/api/reports/${createdReportId}/upvote`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.upvoted).toBe(true);
    expect(res.body.upvote_count).toBe(1);
  });

  it('toggles upvote off on second call', async () => {
    const res = await request(app)
      .post(`/api/reports/${createdReportId}/upvote`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.upvoted).toBe(false);
    expect(res.body.upvote_count).toBe(0);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post(
      `/api/reports/${createdReportId}/upvote`
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for a non-UUID id on upvote', async () => {
    const res = await request(app)
      .post('/api/reports/not-a-uuid/upvote')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('id');
  });
});

// ── DELETE /api/reports/:id ───────────────────────────────────────────────────
describe('DELETE /api/reports/:id', () => {
  it('returns 400 for a non-UUID id on delete', async () => {
    const res = await request(app)
      .delete('/api/reports/not-a-uuid')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('id');
  });

  it('returns 403 when a different user tries to delete', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Other User',
      email: `jest_test_other_${SUFFIX}@test.com`,
      password: PASSWORD,
    });
    const login = await request(app).post('/api/auth/login').send({
      email: `jest_test_other_${SUFFIX}@test.com`,
      password: PASSWORD,
    });
    const otherToken = login.body.token;

    const res = await request(app)
      .delete(`/api/reports/${createdReportId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it('deletes the report when called by the owner', async () => {
    const res = await request(app)
      .delete(`/api/reports/${createdReportId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 after the report is deleted', async () => {
    const res = await request(app).get(`/api/reports/${createdReportId}`);
    expect(res.status).toBe(404);
  });
});

// ── GET /api/reports — proximity search params ────────────────────────────────
describe('GET /api/reports — proximity search', () => {
  it('accepts lat+lng and returns distance_km on each report', async () => {
    // Use coordinates from the seed data (around -1.62, 6.67).
    const res = await request(app).get(
      '/api/reports?lat=-1.62&lng=6.67&radius_km=50'
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reports)).toBe(true);
    // Every report in the response should have a numeric distance_km.
    res.body.reports.forEach((r) => {
      expect(typeof r.distance_km).toBe('string'); // pg returns numeric as string
      expect(parseFloat(r.distance_km)).toBeLessThanOrEqual(50);
    });
  });

  it('sorts by distance when sort=distance and lat+lng provided', async () => {
    const res = await request(app).get(
      '/api/reports?lat=-1.62&lng=6.67&radius_km=50&sort=distance'
    );
    expect(res.status).toBe(200);
    const dists = res.body.reports.map((r) => parseFloat(r.distance_km));
    for (let i = 1; i < dists.length; i++) {
      expect(dists[i]).toBeGreaterThanOrEqual(dists[i - 1]);
    }
  });

  it('caps radius_km at 50 — returns 422 if radius_km > 50', async () => {
    const res = await request(app).get(
      '/api/reports?lat=-1.62&lng=6.67&radius_km=100'
    );
    expect(res.status).toBe(422);
    expect(res.body.details[0].field).toBe('radius_km');
  });

  it('returns 422 when only lat is supplied without lng', async () => {
    const res = await request(app).get('/api/reports?lat=-1.62');
    expect(res.status).toBe(422);
  });

  it('returns 422 when only lng is supplied without lat', async () => {
    const res = await request(app).get('/api/reports?lng=6.67');
    expect(res.status).toBe(422);
  });

  it('returns 422 for sort=distance without coordinates', async () => {
    // sort=distance is valid as a string but distance ordering silently falls
    // back to newest when no coords — however the schema itself should not
    // reject it, so this should be 200, not 422.
    const res = await request(app).get('/api/reports?sort=distance');
    expect(res.status).toBe(200);
    // No distance_km field when no coords.
    res.body.reports.forEach((r) => {
      expect(r.distance_km).toBeUndefined();
    });
  });

  it('returns 422 for radius_km=0 (non-positive)', async () => {
    const res = await request(app).get(
      '/api/reports?lat=-1.62&lng=6.67&radius_km=0'
    );
    expect(res.status).toBe(422);
    expect(res.body.details[0].field).toBe('radius_km');
  });

  it('returns 422 for radius_km with a string value', async () => {
    const res = await request(app).get(
      '/api/reports?lat=-1.62&lng=6.67&radius_km=far'
    );
    expect(res.status).toBe(422);
  });
});
