// Auth route tests: register, login, /me.
// Run with: npm test
const request = require('supertest');
const app = require('../app');
const { cleanupTestData, closePool } = require('./helpers/db');

// A unique suffix prevents collisions if tests run in parallel.
const SUFFIX = Date.now();
const EMAIL = `jest_test_auth_${SUFFIX}@test.com`;
const PASSWORD = 'testpass123';
const NAME = 'Jest Auth User';

afterAll(async () => {
  await cleanupTestData();
  await closePool();
});

// ── Health check ──────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.timestamp).toBeDefined();
  });
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('creates a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: NAME,
      email: EMAIL,
      password: PASSWORD,
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(EMAIL);
    expect(res.body.user.role).toBe('resident');
    // password_hash must NEVER appear in the response
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('returns 409 when registering with a duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: NAME,
      email: EMAIL, // already registered above
      password: PASSWORD,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('returns 422 when password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Short Pass',
      email: `jest_test_short_${SUFFIX}@test.com`,
      password: 'abc',
    });
    expect(res.status).toBe(422);
    expect(res.body.details).toBeDefined();
    expect(res.body.details[0].field).toBe('password');
  });

  it('returns 422 when email is invalid', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad Email',
      email: 'not-an-email',
      password: 'validpass',
    });
    expect(res.status).toBe(422);
    expect(res.body.details[0].field).toBe('email');
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('returns a token for valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: EMAIL,
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(EMAIL);
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('returns 401 for a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: EMAIL,
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
    // Generic message — must not distinguish "wrong password" from "no such user"
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  it('returns 401 for a non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'jest_test_nobody@test.com',
      password: 'whatever',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: EMAIL,
      password: PASSWORD,
    });
    token = res.body.token;
  });

  it('returns the logged-in user when token is valid', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(EMAIL);
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('returns 401 when no token is supplied', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a tampered token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.not.valid');
    expect(res.status).toBe(401);
  });
});
