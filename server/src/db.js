import './config.js'; // load .env into process.env BEFORE we read any settings below
import { createClient } from '@libsql/client';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Where local data lives when no cloud database is configured.
export const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

// In production set DATABASE_URL (+ DATABASE_AUTH_TOKEN) to a Turso/libSQL
// database so data is permanent. Locally it defaults to a file on disk.
const url = process.env.DATABASE_URL || `file:${join(DATA_DIR, 'teli.db')}`;
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;
export const usingCloudDb = !!process.env.DATABASE_URL;

const client = createClient(authToken ? { url, authToken } : { url });

// Treat a single object arg as named parameters (e.g. @slug); otherwise positional.
function normArgs(args) {
  if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}

// A thin async wrapper that mirrors the previous node:sqlite API
// (db.prepare(sql).get/all/run), but every call returns a promise.
export const db = {
  prepare(sql) {
    return {
      async get(...args) {
        const r = await client.execute({ sql, args: normArgs(args) });
        return r.rows[0];
      },
      async all(...args) {
        const r = await client.execute({ sql, args: normArgs(args) });
        return r.rows;
      },
      async run(...args) {
        const r = await client.execute({ sql, args: normArgs(args) });
        return {
          lastInsertRowid: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : undefined,
          changes: Number(r.rowsAffected || 0),
        };
      },
    };
  },
  async exec(sql) { await client.executeMultiple(sql); },
  client,
};

async function addColumn(table, col, ddl) {
  const cols = (await client.execute(`PRAGMA table_info(${table})`)).rows.map((c) => c.name);
  if (!cols.includes(col)) await client.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

// Create tables + run migrations. Must be awaited before serving requests.
export async function initDb() {
  try { await client.execute('PRAGMA foreign_keys = ON'); } catch { /* best effort */ }

  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  password     TEXT NOT NULL,
  tagline      TEXT DEFAULT 'Making an impact through learning',
  role         TEXT NOT NULL DEFAULT 'learner',
  points       INTEGER NOT NULL DEFAULT 0,
  streak_days  INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS courses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL,
  provider      TEXT NOT NULL DEFAULT 'The Elevate Learning Institute',
  level         TEXT NOT NULL DEFAULT 'Beginner',
  duration      TEXT NOT NULL DEFAULT '6 weeks',
  summary       TEXT NOT NULL,
  description   TEXT NOT NULL,
  price         INTEGER NOT NULL DEFAULT 0,
  old_price     INTEGER,
  discount      TEXT,
  rating        REAL NOT NULL DEFAULT 4.8,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  color         TEXT NOT NULL DEFAULT 'navy',
  icon          TEXT NOT NULL DEFAULT 'target',
  outcomes      TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS modules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  title       TEXT NOT NULL,
  subtitle    TEXT
);
CREATE TABLE IF NOT EXISTS lessons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id   INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  title       TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'reading',
  duration    TEXT NOT NULL DEFAULT '05:00',
  body        TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  author      TEXT NOT NULL,
  rating      INTEGER NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (date('now'))
);
CREATE TABLE IF NOT EXISTS enrollments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id     INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  saved         INTEGER NOT NULL DEFAULT 0,
  enrolled      INTEGER NOT NULL DEFAULT 0,
  last_accessed TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, course_id)
);
CREATE TABLE IF NOT EXISTS lesson_progress (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id   INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed   INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  UNIQUE(user_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id   INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  score       INTEGER NOT NULL,
  total       INTEGER NOT NULL,
  passed      INTEGER NOT NULL,
  time_taken  TEXT,
  answers     TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS certificates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  issued_at   TEXT NOT NULL DEFAULT (date('now')),
  UNIQUE(user_id, course_id)
);
CREATE TABLE IF NOT EXISTS achievements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  title       TEXT NOT NULL,
  detail      TEXT NOT NULL,
  icon        TEXT NOT NULL,
  earned_at   TEXT NOT NULL DEFAULT (date('now')),
  UNIQUE(user_id, code)
);
`);

  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS coupons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  kind        TEXT NOT NULL DEFAULT 'percent',
  value       INTEGER NOT NULL,
  course_id   INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  max_uses    INTEGER NOT NULL DEFAULT 1,
  used_count  INTEGER NOT NULL DEFAULT 0,
  single_use  INTEGER NOT NULL DEFAULT 1,
  active      INTEGER NOT NULL DEFAULT 1,
  expires_at  TEXT,
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  reference   TEXT NOT NULL UNIQUE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  base_price  INTEGER NOT NULL,
  discount    INTEGER NOT NULL DEFAULT 0,
  amount      INTEGER NOT NULL,
  coupon_code TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  provider    TEXT NOT NULL DEFAULT 'paystack',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at     TEXT
);
CREATE TABLE IF NOT EXISTS tickets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'General',
  priority    TEXT NOT NULL DEFAULT 'normal',
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS ticket_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name  TEXT NOT NULL,
  action      TEXT NOT NULL,
  detail      TEXT NOT NULL DEFAULT '',
  target_type TEXT,
  target_id   INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS password_resets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'info',
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  link        TEXT,
  read        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS referrals (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS access_codes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  email       TEXT,                       -- optional: lock a code to one email
  max_uses    INTEGER NOT NULL DEFAULT 1,
  used_count  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS community_posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  image       TEXT,
  course_id   INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  pinned      INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS community_comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id     INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS community_likes (
  post_id     INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);
CREATE TABLE IF NOT EXISTS tags (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  label       TEXT NOT NULL UNIQUE,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS course_groups (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS group_members (
  group_id    INTEGER NOT NULL REFERENCES course_groups(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_leader   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, user_id)
);
CREATE TABLE IF NOT EXISTS assignments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id     INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  instructions  TEXT NOT NULL DEFAULT '',
  format        TEXT NOT NULL DEFAULT 'text',   -- text | file | link
  max_points    INTEGER NOT NULL DEFAULT 100,
  due_at        TEXT,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body          TEXT,
  file_url      TEXT,
  link_url      TEXT,
  status        TEXT NOT NULL DEFAULT 'submitted', -- submitted | graded
  grade         INTEGER,
  feedback      TEXT,
  submitted_at  TEXT NOT NULL DEFAULT (datetime('now')),
  graded_at     TEXT,
  graded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(assignment_id, user_id)
);
`);

  // migrations for pre-existing databases
  await addColumn('users', 'google_id', 'google_id TEXT');
  await addColumn('users', 'active', 'active INTEGER NOT NULL DEFAULT 1');
  await addColumn('users', 'created_by', 'created_by INTEGER');
  await addColumn('users', 'avatar', 'avatar TEXT');
  await addColumn('users', 'must_change_password', 'must_change_password INTEGER NOT NULL DEFAULT 0');
  await addColumn('users', 'referral_points', 'referral_points INTEGER NOT NULL DEFAULT 0');
  await addColumn('users', 'referred_by', 'referred_by INTEGER'); // referrer user id
  await addColumn('courses', 'visibility', "visibility TEXT NOT NULL DEFAULT 'public'"); // public | private
  await addColumn('courses', 'created_by', 'created_by INTEGER'); // owner (admin who created it)
  await addColumn('courses', 'image', 'image TEXT'); // course photo (data URL)
  await addColumn('courses', 'instructor_name', 'instructor_name TEXT');
  await addColumn('courses', 'instructor_title', 'instructor_title TEXT');
  await addColumn('courses', 'instructor_bio', 'instructor_bio TEXT');
  await addColumn('courses', 'instructor_avatar', 'instructor_avatar TEXT'); // data URL
  await addColumn('courses', 'signatory_name', 'signatory_name TEXT'); // name signed on certificates
  await addColumn('courses', 'signatory_image', 'signatory_image TEXT'); // signature image (data URL)
  await addColumn('courses', 'tags', "tags TEXT NOT NULL DEFAULT '[]'"); // up to 3 tag labels (JSON array)
  // personal (user-owned) coupons, e.g. referral rewards
  await addColumn('coupons', 'user_id', 'user_id INTEGER'); // null = public coupon
  await addColumn('coupons', 'label', 'label TEXT');
  // reviews tied to a user (one per user per course)
  await addColumn('reviews', 'user_id', 'user_id INTEGER');
  // tickets: trackable reference + optional course link
  await addColumn('tickets', 'reference', 'reference TEXT');
  await addColumn('tickets', 'course_id', 'course_id INTEGER');
  await addColumn('courses', 'cert_min_progress', 'cert_min_progress INTEGER NOT NULL DEFAULT 100');
  await addColumn('courses', 'cert_min_quiz_score', 'cert_min_quiz_score INTEGER NOT NULL DEFAULT 0');
  await addColumn('courses', 'cert_require_quizzes', 'cert_require_quizzes INTEGER NOT NULL DEFAULT 1');
  await addColumn('courses', 'published', 'published INTEGER NOT NULL DEFAULT 1');
  await addColumn('lessons', 'resources', "resources TEXT NOT NULL DEFAULT '[]'");

  // seed a starter set of tag categories the first time
  const tagCount = Number((await client.execute('SELECT COUNT(*) c FROM tags')).rows[0].c);
  if (tagCount === 0) {
    for (const label of ['Fundraising', 'Leadership', 'Monitoring & Evaluation', 'Grant Writing', 'Advocacy', 'Project Management', 'Finance', 'Communications', 'Governance', 'Volunteering']) {
      await client.execute({ sql: 'INSERT OR IGNORE INTO tags (label) VALUES (?)', args: [label] });
    }
  }
}
