# CRM Backend

REST API for a counselor CRM. Prospective students submit a public enquiry form, every counselor sees unclaimed enquiries, and a counselor can **claim** an enquiry so that it becomes private to them.

**Stack:** Node.js 20+, Express 5, PostgreSQL, JWT (`jsonwebtoken`), `bcryptjs`, `zod` validation.

## Setup

```bash
npm install
cp .env.example .env          # set DATABASE_URL and a strong JWT_SECRET
createdb crm
npm run db:migrate            # also runs automatically on `npm start`
npm start                     # http://localhost:4000
```

### Tests

```bash
createdb crm_test
printf 'DATABASE_URL=postgres://localhost:5432/crm_test\nJWT_SECRET=test-secret\n' > .env.test
npm test
```

## API

Authenticated routes need `Authorization: Bearer <token>`. You get the token from register or login.

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/api/auth/register` | – | Register an employee `{ name, email, password }` → `{ token, employee }` |
| POST | `/api/auth/login` | – | Log in `{ email, password }` → `{ token, employee }` |
| POST | `/api/enquiries` | – | **Public enquiry form** `{ name, email, courseInterest, phone?, message? }` |
| GET | `/api/enquiries/public` | JWT | Unclaimed leads, visible to all counselors |
| GET | `/api/enquiries/mine` | JWT | Leads claimed by the logged-in counselor |
| PATCH | `/api/enquiries/:id/claim` | JWT | Claim a lead. Returns `409` if it is already claimed and `404` if it does not exist |
| GET | `/health` | – | Liveness check |

Errors use the shape `{ "error": "message" }`. Validation errors also include `details: [{ field, message }]`.

### Example

```bash
TOKEN=$(curl -s -X POST localhost:4000/api/auth/register -H 'content-type: application/json' \
  -d '{"name":"Asha","email":"asha@co.com","password":"password123"}' | jq -r .token)

curl -X POST localhost:4000/api/enquiries -H 'content-type: application/json' \
  -d '{"name":"Riya","email":"riya@mail.com","courseInterest":"MBA"}'

curl localhost:4000/api/enquiries/public -H "authorization: Bearer $TOKEN"
curl -X PATCH localhost:4000/api/enquiries/1/claim -H "authorization: Bearer $TOKEN"
curl localhost:4000/api/enquiries/mine -H "authorization: Bearer $TOKEN"
```

## Design notes

- **Claiming is race-safe.** A claim is a single conditional `UPDATE … WHERE id = $1 AND claimed_by IS NULL`. If two counselors claim the same lead at the same moment, exactly one succeeds and the other gets `409`. A test covers this.
- **Public vs private** comes from `claimed_by IS NULL`, so there is no separate status column that could drift out of sync. A partial index keeps the public-lead query fast.
- Emails are normalized to lowercase, so `A@x.com` and `a@x.com` count as the same account.
- Passwords are hashed with bcrypt. Responses never include the hash.

## Project layout

```
src/
  app.js               Express app (middleware + routes)
  server.js            Runs migrations, then starts listening
  config.js            Env loading/validation
  db/                  pg pool, schema.sql, migrate script
  middleware/          JWT auth, validation, error handling
  routes/              auth.js, enquiries.js
test/api.test.js       Integration tests (node:test + supertest)
```
