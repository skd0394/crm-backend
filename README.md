# Counselor CRM

A CRM for education counselors. Prospective students fill in a **public enquiry form**, and every counselor sees the unclaimed enquiries. A counselor can **claim** an enquiry, which makes it private to them.

**Live demo**
- Web app: https://skd-counselor-crm.vercel.app (public form at [`/enquire`](https://skd-counselor-crm.vercel.app/enquire))
- API: https://skd-crm-api.vercel.app (try [`/health`](https://skd-crm-api.vercel.app/health))
- Demo counselor login: `asha@crm.test` / `password123` (or register a new account)

This is an npm-workspaces monorepo:

| App | Path | Stack |
| --- | ---- | ----- |
| REST API | [`apps/api`](apps/api) | Node.js 20+, Express 5, PostgreSQL, JWT, bcrypt, zod |
| Web client | [`apps/web`](apps/web) | React 19, React Router 7, Vite |

## Local development

Prerequisites: Node 20+ and a local PostgreSQL.

```bash
npm install                                   # installs both apps
createdb crm
cp apps/api/.env.example apps/api/.env        # set DATABASE_URL and a strong JWT_SECRET
npm run dev                                   # API on :4000, web on :5173
```

The web dev server proxies `/api` to `localhost:4000`, so no CORS setup is needed locally. The API creates its tables on startup.

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Run the API and web app together |
| `npm run dev:api` / `npm run dev:web` | Run one of them |
| `npm test` | API integration tests (needs a `crm_test` DB, see below) |
| `npm run build` | Production build of the web app |
| `npm run lint` | Lint the web app |

Test setup:

```bash
createdb crm_test
printf 'DATABASE_URL=postgres://localhost:5432/crm_test\nJWT_SECRET=test-secret\n' > apps/api/.env.test
npm test
```

## Web client

| Route | Auth | Purpose |
| ----- | ---- | ------- |
| `/enquire` | Public | Enquiry form for students (name, email, phone, course, message) |
| `/login` | – | Counselor sign-in / registration |
| `/` | JWT | Dashboard: **Unclaimed leads** (with *Claim*) and **My leads**. Also has *Copy form link* and *Refresh* |

If another counselor claims a lead first, the API returns `409`, and the dashboard removes the lead and says so. An expired token signs the user out.

## API

Authenticated routes need `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/api/auth/register` | – | `{ name, email, password }` → `{ token, employee }` |
| POST | `/api/auth/login` | – | `{ email, password }` → `{ token, employee }` |
| POST | `/api/enquiries` | – | **Public form**: `{ name, email, courseInterest, phone?, message? }` |
| GET | `/api/enquiries/public` | JWT | Unclaimed leads (visible to all counselors) |
| GET | `/api/enquiries/mine` | JWT | Leads claimed by the logged-in counselor |
| PATCH | `/api/enquiries/:id/claim` | JWT | Claim a lead. Returns `409` if it's already claimed, `404` if it doesn't exist |
| GET | `/health` | – | Liveness check |

Errors are returned as `{ "error": "..." }`. Validation errors also include `details: [{ field, message }]`.

**Design notes**
- **Claiming is race-safe.** It runs as one conditional `UPDATE … WHERE claimed_by IS NULL`, so if two counselors claim at once, exactly one wins. A test covers this.
- **Public vs private** is derived from `claimed_by IS NULL`, so there's no separate status column that could drift. A partial index keeps the public-lead query fast.
- Emails are normalized to lowercase. Passwords are hashed with bcrypt and never returned.

## Deployment (free): Vercel + Neon

Both apps deploy as two Vercel projects from this one repo. Postgres runs on [Neon](https://neon.tech)'s free tier.

1. **Database.** Create a Neon project and copy the **pooled** connection string (`postgres://…-pooler…/neondb?sslmode=require`).
2. **API project.** In Vercel: *Add New → Project*, import this repo, and set **Root Directory = `apps/api`**. Add these environment variables:
   - `DATABASE_URL`: the Neon pooled URL
   - `JWT_SECRET`: a long random string (`openssl rand -hex 32`)
   - `CORS_ORIGIN`: the web app's URL (fill this in after step 3, then redeploy)

   `apps/api/api/index.js` is the serverless entry. It creates the tables on the first request.
3. **Web project.** Import the same repo again, set **Root Directory = `apps/web`** (Vite preset), and add `VITE_API_URL` = the API URL from step 2.
4. Open `<web-url>/enquire`, submit an enquiry, then register at `<web-url>/login` and claim it.

`vercel.json` in each app handles the routing: the API rewrites every path to the function, and the web app falls back to `index.html` for client-side routes.
