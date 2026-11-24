// Reports route tests: list, get, create, delete, upvote.
const request = require('supertest');
const app = require('../app');
const { cleanupTestData, closePool } = require('./helpers/db');

const SUFFIX = Date.now();
const EMAIL = `jest_test_reports_${SUFFIX}@test.com`;
const PASSWORD = 'testpass123';

let token; // resident JWT
let createdReportId; // set by the create test, used by later tests

// Register a fresh user and log in once for all tests in this file.
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
      .field('longitude', '6.670');

    expect(res.status).toBe(201);
    expect(res.body.report.category).toBe('roads');
    expect(res.body.report.status).toBe('reported');
    // duplicate_of is returned (may be null or a string)
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
});

// ── GET /api/reports/:id ──────────────────────────────────────────────────────
describe('GET /api/reports/:id', () => {
  it('returns a single report with status history', async () => {
    // Uses the report created in the POST tests above.
    const res = await request(app).get(`/api/reports/${createdReportId}`);
    expect(res.status).toBe(200);
    expect(res.body.report.id).toBe(createdReportId);
    expect(Array.isArray(res.body.status_history)).toBe(true);
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app).get(
      '/api/reports/00000000-0000-0000-0000-000000000000'
    );
    expect(res.status).toBe(404);
  });
});

// ── POST /api/reports/:id/upvote ──────────────────────────────────────────────
describe('POST /api/reports/:id/upvote', () => {
  it('toggles the upvote on and returns updated count', async () => {
    const res = await request(app)
      .post(`/api/reports/${createdReportId}/upvote`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.upvoted).toBe(true);
    expect(res.body.upvote_count).toBe(1);
  });

  it('toggles the upvote off on a second call', async () => {
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
});

// ── DELETE /api/reports/:id ───────────────────────────────────────────────────
describe('DELETE /api/reports/:id', () => {
  it('returns 403 when a different user tries to delete', async () => {
    // Register a second user.
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

  it('returns 404 after the report has been deleted', async () => {
    const res = await request(app).get(`/api/reports/${createdReportId}`);
    expect(res.status).toBe(404);
  });
});
