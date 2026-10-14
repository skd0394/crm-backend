process.env.NODE_ENV = 'test';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');
const migrate = require('../src/db/migrate');

const api = request(app);

async function register(email = 'alice@crm.test', name = 'Alice') {
  const res = await api.post('/api/auth/register').send({ name, email, password: 'password123' });
  assert.equal(res.status, 201);
  return res.body.token;
}

async function createEnquiry(overrides = {}) {
  const res = await api
    .post('/api/enquiries')
    .send({ name: 'Sam Student', email: 'sam@example.com', courseInterest: 'Data Science', ...overrides });
  assert.equal(res.status, 201);
  return res.body.enquiry;
}

before(migrate);
beforeEach(() => pool.query('TRUNCATE enquiries, employees RESTART IDENTITY CASCADE'));
after(() => pool.end());

test('register returns a token and rejects duplicate emails', async () => {
  await register();
  const dup = await api
    .post('/api/auth/register')
    .send({ name: 'Alice 2', email: 'ALICE@crm.test', password: 'password123' });
  assert.equal(dup.status, 409);
});

test('register validates input', async () => {
  const res = await api.post('/api/auth/register').send({ name: '', email: 'nope', password: 'short' });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.details.map((d) => d.field).sort(), ['email', 'name', 'password']);
});

test('login succeeds with correct credentials and fails otherwise', async () => {
  await register();
  const ok = await api.post('/api/auth/login').send({ email: 'alice@crm.test', password: 'password123' });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
  assert.equal(ok.body.employee.password_hash, undefined);

  const bad = await api.post('/api/auth/login').send({ email: 'alice@crm.test', password: 'wrongpass1' });
  assert.equal(bad.status, 401);
});

test('public enquiry form needs no auth; lead lists do', async () => {
  await createEnquiry();
  assert.equal((await api.get('/api/enquiries/public')).status, 401);
  assert.equal((await api.get('/api/enquiries/mine')).status, 401);
  assert.equal((await api.patch('/api/enquiries/1/claim')).status, 401);
  const bogus = await api.get('/api/enquiries/public').set('Authorization', 'Bearer not-a-jwt');
  assert.equal(bogus.status, 401);
});

test('claiming moves an enquiry from public to the claimer only', async () => {
  const alice = await register('alice@crm.test', 'Alice');
  const bob = await register('bob@crm.test', 'Bob');
  const e1 = await createEnquiry();
  await createEnquiry({ email: 'other@example.com' });

  const before = await api.get('/api/enquiries/public').set('Authorization', `Bearer ${bob}`);
  assert.equal(before.body.enquiries.length, 2);

  const claim = await api.patch(`/api/enquiries/${e1.id}/claim`).set('Authorization', `Bearer ${alice}`);
  assert.equal(claim.status, 200);
  assert.equal(claim.body.enquiry.claimedBy, 1);

  const publicAfter = await api.get('/api/enquiries/public').set('Authorization', `Bearer ${bob}`);
  assert.deepEqual(publicAfter.body.enquiries.map((e) => e.id), [2]);

  const aliceMine = await api.get('/api/enquiries/mine').set('Authorization', `Bearer ${alice}`);
  assert.deepEqual(aliceMine.body.enquiries.map((e) => e.id), [e1.id]);

  const bobMine = await api.get('/api/enquiries/mine').set('Authorization', `Bearer ${bob}`);
  assert.equal(bobMine.body.enquiries.length, 0);
});

test('claim returns 409 if already claimed and 404 if missing', async () => {
  const alice = await register('alice@crm.test', 'Alice');
  const bob = await register('bob@crm.test', 'Bob');
  const e = await createEnquiry();

  await api.patch(`/api/enquiries/${e.id}/claim`).set('Authorization', `Bearer ${alice}`);
  const again = await api.patch(`/api/enquiries/${e.id}/claim`).set('Authorization', `Bearer ${bob}`);
  assert.equal(again.status, 409);

  const missing = await api.patch('/api/enquiries/999/claim').set('Authorization', `Bearer ${bob}`);
  assert.equal(missing.status, 404);

  const invalid = await api.patch('/api/enquiries/abc/claim').set('Authorization', `Bearer ${bob}`);
  assert.equal(invalid.status, 400);
});

test('concurrent claims on the same enquiry have exactly one winner', async () => {
  const tokens = await Promise.all(
    ['a', 'b', 'c', 'd', 'e'].map((n) => register(`${n}@crm.test`, n.toUpperCase())),
  );
  const e = await createEnquiry();

  const results = await Promise.all(
    tokens.map((t) => api.patch(`/api/enquiries/${e.id}/claim`).set('Authorization', `Bearer ${t}`)),
  );
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [200, 409, 409, 409, 409]);
});
