# TELI — The Elevate Learning Institute

A mobile-first e-learning PWA for social-impact professionals and changemakers in Nigeria,
built to the supplied design mockups. Orange (`#F26419`) + navy (`#0F2147`) brand.

> Learn. Lead. Elevate Impact.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + React Router (mobile-first PWA) |
| Backend  | Node + Express + JWT auth + `node:sqlite` (built-in, zero native deps) |
| Icons    | lucide-react |

## Project layout

```
teli/
├── server/   Express API + SQLite (schema, seed, REST endpoints)
└── web/      Vite React PWA (all screens)
```

## Running locally

You need **two terminals** (Node 22+ required for the built-in SQLite module).

This project lives at `C:\dev\teli` (a standalone repo — not part of any other project).

**1. API server** (port 4000):
```bash
cd server
npm install
npm run seed     # creates + seeds teli.db (9 courses, 24 modules, 84 lessons, 3 demo accounts)
npm start
```

**2. Web app** (port 5173, proxies /api → 4000):
```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173

### Demo accounts (password: `password123`)
The login screen lists these — tap one to fill it, then **Log in**:

| Role          | Email                  | Lands on |
|---------------|------------------------|----------|
| Learner       | `frances@teli.africa`  | Learner app (`/home`) |
| Admin         | `admin@teli.africa`    | Admin console (`/admin`) |
| Super Admin   | `super@teli.africa`    | Admin console (`/admin`) |

New self-service sign-ups are always created as **learners**.

## Roles & access control (RBAC)

Three roles, enforced on the server via a `requireRole(...)` gate and reflected in the UI by
role-based routing (`homeForRole`) + route guards:

| Capability                                   | Learner | Admin | Super Admin |
|----------------------------------------------|:-------:|:-----:|:-----------:|
| Browse / pay / learn / quiz / certs          |   ✅    |  ✅   |     ✅      |
| Open support tickets                         |   ✅    |  ✅   |     ✅      |
| Admin console + platform stats + audit log   |   ❌    |  ✅   |     ✅      |
| Create / edit / delete courses & content     |   ❌    |  ✅   |     ✅      |
| Manage coupons & discounts                   |   ❌    |  ✅   |     ✅      |
| Answer support tickets                       |   ❌    |  ✅   |     ✅      |
| Add **learners**                             |   ❌    |  ✅   |     ✅      |
| Add / delete **admin** accounts              |   ❌    |  ❌   |     ✅      |
| Suspend / delete learners                    |   ❌    |  ✅   |     ✅      |
| Change a user's role                         |   ❌    |  ❌   |     ✅      |

Admin endpoints live under `/api/admin/*`. Unauthorised calls return **403**. A super admin
cannot change/suspend/delete their own account (self-lockout guard). Sensitive actions are
written to an **audit log**.

## Payments (Paystack) & coupons

- Checkout flow: `POST /api/checkout/init` → pay → `POST /api/checkout/verify` → enrol.
- Set `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` in `server/.env` for the live flow
  (test keys work end-to-end). **Without keys it runs a built-in sandbox** so the whole
  flow is demoable now. A webhook endpoint (`/api/webhooks/paystack`) confirms server-side.
- **Coupons:** percentage or fixed (₦), per-course or global, single-use or multi-use,
  optional expiry. Validated at checkout, redemption tracked, auto-disabled when exhausted.
  Seeded examples: `WELCOME20` (20%), `LAUNCH5000` (₦5,000), `FREEFUND` (single-use 100% off Fundraising).

## Google sign-in

Real Google Identity Services when `GOOGLE_CLIENT_ID` (server) + `VITE_GOOGLE_CLIENT_ID` (web)
are set; otherwise a **dev-Google fallback** keeps the button fully functional locally.
See `server/.env.example` and `web/.env.example`.

## Certificates

Auto-issued when a learner meets the **course-creator-defined conditions** (min progress %,
min average quiz score, require all quizzes passed) — editable per course in the admin course editor.

## Implemented screens

Auth: Splash · Sign Up · Login (role-based redirect) · Google sign-in · password reset
Learner tabs: Home · Explore · My Learning · Profile
Learner flow: Course detail · **Checkout (coupon + Paystack)** · Enrollment success · Reading/Video lesson · Activity · Quiz · Results · Completion · Certificate · **Help & Support (tickets)** · **Settings (profile + change password)**
Gamification: Achievements / streak / points / learning insights
Admin tabs: Overview (revenue, stats, top courses) · Manage Courses · Coupons · Manage Users · Support inbox
Admin flow: **Course content editor (modules/lessons/quiz/video/uploads)** · Certificate-condition + publish settings · Add/suspend/delete users · Per-learner profile (progress, certs, quizzes, payments) · Audit log

## Notes

- **Media uploads:** images/PDF resources upload via the content editor (stored in `server/uploads/`,
  served at `/uploads`). Video lessons use a URL field (YouTube/Vimeo/MP4) — paste a link.
- Data persists in `server/data/teli.db`. Re-run `npm run seed` to reset catalog + coupons
  (user accounts and progress are preserved).
- Env templates: copy `server/.env.example` → `server/.env` and `web/.env.example` → `web/.env`.
