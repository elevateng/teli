import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { db } from './db.js';
import { config, paystackEnabled, googleEnabled, emailEnabled } from './config.js';
import { sendMail, sentMail } from './mailer.js';

const JWT_SECRET = config.JWT_SECRET;
const PORT = config.PORT;
const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, '..', 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

// ----- audit log -----
function audit(actor, action, detail = '', targetType = null, targetId = null) {
  db.prepare('INSERT INTO audit_log (actor_id,actor_name,action,detail,target_type,target_id) VALUES (?,?,?,?,?,?)')
    .run(actor?.id ?? null, actor?.full_name ?? 'system', action, detail, targetType, targetId);
}

// ----- in-app notifications -----
function notify(userId, type, title, body = '', link = null) {
  if (!userId) return;
  db.prepare('INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)')
    .run(userId, type, title, body, link);
}

// ----------------------------- helpers -----------------------------
const sign = (user) => jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, fullName: u.full_name, email: u.email, tagline: u.tagline, role: u.role || 'learner', points: u.points, streakDays: u.streak_days };
}

function authOptional(req, _res, next) {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) {
    try {
      const { id } = jwt.verify(h.slice(7), JWT_SECRET);
      req.user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
    } catch { req.user = null; }
  }
  next();
}
function authRequired(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}
// role gate — pass the roles allowed to access the route
const ROLE_RANK = { learner: 0, admin: 1, super_admin: 2 };
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to do this' });
    next();
  };
}

function durationToSeconds(d) {
  if (!d) return 0;
  const parts = String(d).split(':').map(Number);
  return parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
}
function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const firstName = (name) => (name || '').trim().split(/\s+/)[0] || 'there';

// Build the full course tree, optionally annotated with a user's progress.
function getCourseDetail(slugOrId, userId) {
  const course = /^\d+$/.test(String(slugOrId))
    ? db.prepare('SELECT * FROM courses WHERE id = ?').get(Number(slugOrId))
    : db.prepare('SELECT * FROM courses WHERE slug = ?').get(slugOrId);
  if (!course) return null;

  const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position').all(course.id);
  const completedSet = userId
    ? new Set(db.prepare(`
        SELECT lp.lesson_id FROM lesson_progress lp
        JOIN lessons l ON l.id = lp.lesson_id
        JOIN modules m ON m.id = l.module_id
        WHERE lp.user_id = ? AND m.course_id = ? AND lp.completed = 1
      `).all(userId, course.id).map((r) => r.lesson_id))
    : new Set();

  let totalLessons = 0, completedLessons = 0, totalSeconds = 0;
  const moduleTree = modules.map((m) => {
    const lessons = db.prepare('SELECT * FROM lessons WHERE module_id = ? ORDER BY position').all(m.id);
    let modDone = 0;
    const lessonTree = lessons.map((l) => {
      totalLessons += 1;
      totalSeconds += durationToSeconds(l.duration);
      const completed = completedSet.has(l.id);
      if (completed) { completedLessons += 1; modDone += 1; }
      return {
        id: l.id, title: l.title, kind: l.kind, duration: l.duration,
        body: JSON.parse(l.body || '{}'), resources: JSON.parse(l.resources || '[]'), completed,
      };
    });
    return {
      id: m.id, title: m.title, subtitle: m.subtitle,
      position: m.position, lessonCount: lessons.length,
      completedCount: modDone, lessons: lessonTree,
    };
  });

  const enrollment = userId
    ? db.prepare('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, course.id)
    : null;
  const progress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const reviews = db.prepare('SELECT author,rating,body,created_at FROM reviews WHERE course_id = ? ORDER BY id').all(course.id);

  return {
    id: course.id, slug: course.slug, title: course.title, category: course.category,
    provider: course.provider, level: course.level, duration: course.duration,
    summary: course.summary, description: course.description,
    price: course.price, oldPrice: course.old_price, discount: course.discount,
    rating: course.rating, reviewsCount: course.reviews_count, color: course.color, icon: course.icon,
    outcomes: JSON.parse(course.outcomes || '[]'),
    moduleCount: modules.length, lessonCount: totalLessons,
    estimatedTime: formatDuration(totalSeconds),
    modules: moduleTree, reviews,
    enrolled: !!enrollment?.enrolled, saved: !!enrollment?.saved,
    lastAccessed: enrollment?.last_accessed || null,
    progress, completedLessons, totalLessons,
    published: course.published !== 0,
    cert: {
      minProgress: course.cert_min_progress ?? 100,
      minQuizScore: course.cert_min_quiz_score ?? 0,
      requireQuizzes: course.cert_require_quizzes !== 0,
    },
  };
}

function courseProgress(userId, courseId) {
  const total = db.prepare(`
    SELECT COUNT(*) c FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?
  `).get(courseId).c;
  const done = db.prepare(`
    SELECT COUNT(*) c FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id JOIN modules m ON m.id = l.module_id
    WHERE lp.user_id = ? AND m.course_id = ? AND lp.completed = 1
  `).get(userId, courseId).c;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

function award(userId, code, title, detail, icon) {
  try {
    db.prepare('INSERT INTO achievements (user_id,code,title,detail,icon) VALUES (?,?,?,?,?)')
      .run(userId, code, title, detail, icon);
  } catch { /* already earned */ }
}
function addPoints(userId, pts) {
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(pts, userId);
}

// Average quiz score for a user across a course's quiz lessons (best attempt each).
function courseQuizStats(userId, courseId) {
  const quizLessons = db.prepare(`
    SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id
    WHERE m.course_id = ? AND l.kind = 'quiz'
  `).all(courseId).map((r) => r.id);
  if (quizLessons.length === 0) return { total: 0, passed: 0, avg: 100, allPassed: true };
  let sum = 0, passed = 0;
  for (const lid of quizLessons) {
    const best = db.prepare('SELECT MAX(CAST(score AS REAL)/total) p, MAX(passed) passed FROM quiz_attempts WHERE user_id = ? AND lesson_id = ?').get(userId, lid);
    sum += best?.p ? best.p * 100 : 0;
    if (best?.passed) passed += 1;
  }
  return { total: quizLessons.length, passed, avg: Math.round(sum / quizLessons.length), allPassed: passed === quizLessons.length };
}

// Issue a certificate when the course's admin-defined conditions are met.
function evaluateCourseCompletion(userId, courseId) {
  const course = db.prepare('SELECT cert_min_progress, cert_min_quiz_score, cert_require_quizzes FROM courses WHERE id = ?').get(courseId);
  if (!course) return false;
  const p = courseProgress(userId, courseId);
  if (p.total === 0) return false;
  const minProgress = course.cert_min_progress ?? 100;
  const q = courseQuizStats(userId, courseId);

  const progressOk = p.percent >= minProgress;
  const quizPassOk = course.cert_require_quizzes === 0 || q.allPassed;
  const quizScoreOk = q.avg >= (course.cert_min_quiz_score ?? 0);

  if (progressOk && quizPassOk && quizScoreOk) {
    const already = db.prepare('SELECT id FROM certificates WHERE user_id = ? AND course_id = ?').get(userId, courseId);
    if (!already) {
      db.prepare('INSERT INTO certificates (user_id,course_id) VALUES (?,?)').run(userId, courseId);
      addPoints(userId, 200);
      award(userId, 'course-master', 'Course Master', 'Completed a course', 'cap');
      const c = db.prepare('SELECT title, slug FROM courses WHERE id = ?').get(courseId);
      const learner = db.prepare('SELECT full_name, email FROM users WHERE id = ?').get(userId);
      notify(userId, 'certificate', 'Certificate unlocked 🎓', `You’ve earned your certificate for “${c.title}”.`, `/certificate/${c.slug}`);
      sendMail({ to: learner.email, subject: `Your certificate for ${c.title}`, title: 'Congratulations! 🎉',
        html: `<p>Hi ${learner.full_name.split(' ')[0]},</p><p>You’ve completed <b>${c.title}</b> and earned your certificate of completion.</p><p><a href="${config.APP_URL}/certificate/${c.slug}" style="background:#F26419;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block">View certificate</a></p>` });
      return true;
    }
  }
  return false;
}

// ----------------------------- auth -----------------------------
app.post('/api/auth/register', (req, res) => {
  const { fullName, email, password } = req.body || {};
  if (!fullName || !email || !password) return res.status(400).json({ error: 'All fields are required' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (exists) return res.status(409).json({ error: 'An account with this email already exists' });
  const hash = bcrypt.hashSync(String(password), 10);
  const info = db.prepare('INSERT INTO users (full_name,email,password) VALUES (?,?,?)')
    .run(fullName, String(email).toLowerCase(), hash);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.json({ token: sign(user), user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').toLowerCase());
  if (!user || !user.password || !bcrypt.compareSync(String(password || ''), user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (user.active === 0) return res.status(403).json({ error: 'This account has been suspended. Contact support.' });
  res.json({ token: sign(user), user: publicUser(user) });
});

// public runtime config the web app needs (no secrets)
app.get('/api/config', (_req, res) => {
  res.json({
    paystackPublicKey: config.PAYSTACK_PUBLIC_KEY || null,
    paystackEnabled,
    googleClientId: config.GOOGLE_CLIENT_ID || null,
    googleEnabled,
  });
});

// Google sign-in. With a real GOOGLE_CLIENT_ID we verify the ID token via Google's
// tokeninfo endpoint; otherwise we accept a dev payload so the button works locally.
app.post('/api/auth/google', async (req, res) => {
  try {
    let email, name, sub;
    const { credential, devEmail, devName } = req.body || {};
    if (googleEnabled && credential) {
      const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (!r.ok) return res.status(401).json({ error: 'Google verification failed' });
      const p = await r.json();
      if (p.aud !== config.GOOGLE_CLIENT_ID) return res.status(401).json({ error: 'Token audience mismatch' });
      email = (p.email || '').toLowerCase(); name = p.name || email; sub = p.sub;
    } else if (!googleEnabled) {
      // dev fallback
      email = String(devEmail || 'google.user@teli.africa').toLowerCase();
      name = devName || 'Google User'; sub = 'dev-' + email;
    } else {
      return res.status(400).json({ error: 'Missing Google credential' });
    }
    let user = db.prepare('SELECT * FROM users WHERE email = ? OR google_id = ?').get(email, sub);
    if (!user) {
      const info = db.prepare('INSERT INTO users (full_name,email,password,google_id) VALUES (?,?,?,?)')
        .run(name, email, '', sub);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      audit(user, 'signup.google', email, 'user', user.id);
    } else if (!user.google_id) {
      db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(sub, user.id);
    }
    if (user.active === 0) return res.status(403).json({ error: 'This account has been suspended.' });
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (e) {
    res.status(500).json({ error: 'Google sign-in failed' });
  }
});

// password reset (in-app token flow; no email service required for the demo)
app.post('/api/auth/forgot', (req, res) => {
  const email = String(req.body?.email || '').toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  // do not leak which emails exist
  if (!user) return res.json({ ok: true });
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare("INSERT INTO password_resets (user_id,token,expires_at) VALUES (?,?,datetime('now','+1 hour'))").run(user.id, token);
  const resetUrl = `${config.APP_URL}/reset?token=${token}`;
  sendMail({ to: user.email, subject: 'Reset your TELI password', title: 'Password reset',
    html: `<p>Hi ${user.full_name.split(' ')[0]},</p><p>We received a request to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}" style="background:#F26419;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block">Reset password</a></p><p style="color:#5b6577;font-size:12px">If you didn’t request this, you can ignore this email.</p>` });
  // When SMTP isn't configured we also return the link so the flow stays testable in dev.
  res.json({ ok: true, ...(emailEnabled ? {} : { resetToken: token, resetUrl }) });
});

app.post('/api/auth/reset', (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password || String(password).length < 8) return res.status(400).json({ error: 'A token and an 8+ character password are required' });
  const row = db.prepare("SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime('now')").get(token);
  if (!row) return res.status(400).json({ error: 'This reset link is invalid or has expired' });
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(String(password), 10), row.user_id);
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

// change password while logged in
app.post('/api/auth/change-password', authOptional, authRequired, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  if (req.user.password && !bcrypt.compareSync(String(currentPassword || ''), req.user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(String(newPassword), 10), req.user.id);
  res.json({ ok: true });
});

// update own profile (name, tagline)
app.post('/api/auth/profile', authOptional, authRequired, (req, res) => {
  const { fullName, tagline } = req.body || {};
  db.prepare('UPDATE users SET full_name = COALESCE(?,full_name), tagline = COALESCE(?,tagline) WHERE id = ?')
    .run(fullName || null, tagline || null, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

app.get('/api/auth/me', authOptional, authRequired, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// ----------------------------- catalog -----------------------------
app.get('/api/categories', (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM courses ORDER BY category').all();
  res.json({ categories: rows.map((r) => r.category) });
});

app.get('/api/courses', authOptional, (req, res) => {
  const { category, q, sort } = req.query;
  let sql = 'SELECT * FROM courses';
  const where = [], params = [];
  if (category && category !== 'All Courses') { where.push('category = ?'); params.push(category); }
  if (q) { where.push('(title LIKE ? OR summary LIKE ? OR category LIKE ?)'); const like = `%${q}%`; params.push(like, like, like); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += sort === 'price' ? ' ORDER BY price ASC' : sort === 'rating' ? ' ORDER BY rating DESC' : ' ORDER BY reviews_count DESC';
  const courses = db.prepare(sql).all(...params).map((c) => {
    const prog = req.user ? courseProgress(req.user.id, c.id) : null;
    const enr = req.user ? db.prepare('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?').get(req.user.id, c.id) : null;
    return {
      id: c.id, slug: c.slug, title: c.title, category: c.category, level: c.level, duration: c.duration,
      summary: c.summary, price: c.price, oldPrice: c.old_price, discount: c.discount, rating: c.rating,
      reviewsCount: c.reviews_count, color: c.color, icon: c.icon,
      progress: prog?.percent ?? 0, enrolled: !!enr?.enrolled, saved: !!enr?.saved,
    };
  });
  res.json({ courses });
});

app.get('/api/courses/:slug', authOptional, (req, res) => {
  const detail = getCourseDetail(req.params.slug, req.user?.id);
  if (!detail) return res.status(404).json({ error: 'Course not found' });
  res.json({ course: detail });
});

// ----------------------------- enrollment -----------------------------
app.post('/api/courses/:id/enroll', authOptional, authRequired, (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? OR slug = ?').get(req.params.id, req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  db.prepare(`
    INSERT INTO enrollments (user_id,course_id,enrolled,last_accessed)
    VALUES (?,?,1,datetime('now'))
    ON CONFLICT(user_id,course_id) DO UPDATE SET enrolled = 1, last_accessed = datetime('now')
  `).run(req.user.id, course.id);
  res.json({ course: getCourseDetail(course.id, req.user.id) });
});

app.post('/api/courses/:id/save', authOptional, authRequired, (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? OR slug = ?').get(req.params.id, req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const existing = db.prepare('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?').get(req.user.id, course.id);
  const newSaved = existing?.saved ? 0 : 1;
  db.prepare(`
    INSERT INTO enrollments (user_id,course_id,saved) VALUES (?,?,?)
    ON CONFLICT(user_id,course_id) DO UPDATE SET saved = ?
  `).run(req.user.id, course.id, newSaved, newSaved);
  res.json({ saved: !!newSaved });
});

// ----------------------------- my learning -----------------------------
app.get('/api/me/learning', authOptional, authRequired, (req, res) => {
  const enrollments = db.prepare('SELECT * FROM enrollments WHERE user_id = ?').all(req.user.id);
  const inProgress = [], completed = [], saved = [];
  for (const e of enrollments) {
    const c = db.prepare('SELECT * FROM courses WHERE id = ?').get(e.course_id);
    if (!c) continue;
    const prog = courseProgress(req.user.id, c.id);
    const card = {
      id: c.id, slug: c.slug, title: c.title, category: c.category, color: c.color, icon: c.icon,
      duration: c.duration, level: c.level, progress: prog.percent,
      completedModules: db.prepare(`
        SELECT COUNT(*) c FROM modules m WHERE m.course_id = ? AND
        (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id) > 0 AND
        (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id) =
        (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id WHERE l.module_id = m.id AND lp.user_id = ? AND lp.completed = 1)
      `).get(c.id, req.user.id).c,
      moduleCount: db.prepare('SELECT COUNT(*) c FROM modules WHERE course_id = ?').get(c.id).c,
      lastAccessed: e.last_accessed,
    };
    if (e.saved && !e.enrolled) { saved.push(card); continue; }
    if (e.enrolled) {
      if (prog.total > 0 && prog.done === prog.total) completed.push(card);
      else inProgress.push(card);
    }
  }
  res.json({ inProgress, completed, saved });
});

// ----------------------------- lesson progress -----------------------------
app.post('/api/lessons/:id/complete', authOptional, authRequired, (req, res) => {
  const lesson = db.prepare('SELECT l.*, m.course_id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const already = db.prepare('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(req.user.id, lesson.id);
  if (!already?.completed) {
    db.prepare(`
      INSERT INTO lesson_progress (user_id,lesson_id,completed,completed_at) VALUES (?,?,1,datetime('now'))
      ON CONFLICT(user_id,lesson_id) DO UPDATE SET completed = 1, completed_at = datetime('now')
    `).run(req.user.id, lesson.id);
    addPoints(req.user.id, 10);
  }
  // ensure enrolled + touch last_accessed
  db.prepare(`
    INSERT INTO enrollments (user_id,course_id,enrolled,last_accessed) VALUES (?,?,1,datetime('now'))
    ON CONFLICT(user_id,course_id) DO UPDATE SET enrolled = 1, last_accessed = datetime('now')
  `).run(req.user.id, lesson.course_id);
  evaluateCourseCompletion(req.user.id, lesson.course_id);
  res.json({ progress: courseProgress(req.user.id, lesson.course_id) });
});

// ----------------------------- quiz submit -----------------------------
app.post('/api/lessons/:id/quiz', authOptional, authRequired, (req, res) => {
  const lesson = db.prepare('SELECT l.*, m.course_id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = ?').get(req.params.id);
  if (!lesson || lesson.kind !== 'quiz') return res.status(404).json({ error: 'Quiz not found' });
  const quiz = JSON.parse(lesson.body || '{}').quiz;
  if (!quiz) return res.status(400).json({ error: 'No quiz on this lesson' });

  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const timeTaken = req.body?.timeTaken || null;
  const breakdown = quiz.questions.map((qn, i) => {
    const given = answers[i];
    const correct = given === qn.answer;
    return {
      index: i, question: qn.q, options: qn.options,
      correctAnswer: qn.answer, yourAnswer: given ?? null,
      correct, explanation: qn.explanation,
    };
  });
  const score = breakdown.filter((b) => b.correct).length;
  const total = quiz.questions.length;
  const percent = Math.round((score / total) * 100);
  const passed = percent >= (quiz.passScore ?? 60);

  db.prepare('INSERT INTO quiz_attempts (user_id,lesson_id,score,total,passed,time_taken,answers) VALUES (?,?,?,?,?,?,?)')
    .run(req.user.id, lesson.id, score, total, passed ? 1 : 0, timeTaken, JSON.stringify(answers));

  if (passed) {
    // mark the quiz lesson complete
    db.prepare(`
      INSERT INTO lesson_progress (user_id,lesson_id,completed,completed_at) VALUES (?,?,1,datetime('now'))
      ON CONFLICT(user_id,lesson_id) DO UPDATE SET completed = 1, completed_at = datetime('now')
    `).run(req.user.id, lesson.id);
    addPoints(req.user.id, 50);
    award(req.user.id, 'quick-learner', 'Quick Learner', 'Passed a quiz', 'book');
    if (percent >= 80) award(req.user.id, 'on-target', 'On Target', 'Scored 80% or higher', 'bullseye');
    if (percent >= 90) award(req.user.id, 'top-performer', 'Top Performer', 'Scored 90% or higher', 'star');
    evaluateCourseCompletion(req.user.id, lesson.course_id);
  }

  res.json({
    score, total, percent, passed,
    timeTaken, breakdown,
    courseProgress: courseProgress(req.user.id, lesson.course_id),
  });
});

// ----------------------------- dashboard / gamification -----------------------------
app.get('/api/me/dashboard', authOptional, authRequired, (req, res) => {
  const uid = req.user.id;
  const enrolled = db.prepare('SELECT course_id FROM enrollments WHERE user_id = ? AND enrolled = 1').all(uid);
  let coursesCompleted = 0;
  let totalPct = 0;
  for (const e of enrolled) {
    const p = courseProgress(uid, e.course_id);
    if (p.total > 0 && p.done === p.total) coursesCompleted += 1;
    totalPct += p.percent;
  }
  const overallProgress = enrolled.length ? Math.round(totalPct / enrolled.length) : 0;

  const quizzesPassed = db.prepare('SELECT COUNT(DISTINCT lesson_id) c FROM quiz_attempts WHERE user_id = ? AND passed = 1').get(uid).c;
  const quizzesTaken = db.prepare('SELECT COUNT(DISTINCT lesson_id) c FROM quiz_attempts WHERE user_id = ?').get(uid).c;
  const avgScore = db.prepare('SELECT AVG(CAST(score AS REAL)/total)*100 a FROM quiz_attempts WHERE user_id = ?').get(uid).a;
  const certificates = db.prepare('SELECT COUNT(*) c FROM certificates WHERE user_id = ?').get(uid).c;

  const learnedSeconds = db.prepare(`
    SELECT l.duration FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
    WHERE lp.user_id = ? AND lp.completed = 1
  `).all(uid).reduce((s, r) => s + durationToSeconds(r.duration), 0);

  res.json({
    firstName: firstName(req.user.full_name),
    points: req.user.points,
    streakDays: req.user.streak_days,
    nextRewardAt: 1500,
    coursesEnrolled: enrolled.length,
    coursesCompleted,
    overallProgress,
    quizzesPassed,
    quizzesTaken,
    averageScore: avgScore ? Math.round(avgScore) : 0,
    totalLearningTime: formatDuration(learnedSeconds),
    certificatesEarned: certificates,
  });
});

app.get('/api/me/achievements', authOptional, authRequired, (req, res) => {
  const earned = db.prepare('SELECT code,title,detail,icon,earned_at FROM achievements WHERE user_id = ? ORDER BY earned_at DESC, id DESC').all(req.user.id);
  res.json({ achievements: earned });
});

app.get('/api/me/certificates', authOptional, authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT c.issued_at, co.title, co.slug, co.category FROM certificates c
    JOIN courses co ON co.id = c.course_id WHERE c.user_id = ? ORDER BY c.issued_at DESC, c.id DESC
  `).all(req.user.id);
  res.json({ certificates: rows.map((r) => ({ title: r.title, slug: r.slug, category: r.category, issuedAt: r.issued_at, recipient: req.user.full_name })) });
});

// ===================================================================
//                         ADMIN  (admin + super_admin)
// ===================================================================

// platform-wide stats
app.get('/api/admin/stats', authOptional, requireRole('admin', 'super_admin'), (_req, res) => {
  const learners = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'learner'").get().c;
  const admins = db.prepare("SELECT COUNT(*) c FROM users WHERE role IN ('admin','super_admin')").get().c;
  const courses = db.prepare('SELECT COUNT(*) c FROM courses').get().c;
  const enrollments = db.prepare('SELECT COUNT(*) c FROM enrollments WHERE enrolled = 1').get().c;
  const certificates = db.prepare('SELECT COUNT(*) c FROM certificates').get().c;
  const quizAttempts = db.prepare('SELECT COUNT(*) c FROM quiz_attempts').get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(amount),0) r FROM orders WHERE status = 'paid'").get().r;
  const openTickets = db.prepare("SELECT COUNT(*) c FROM tickets WHERE status IN ('open','pending')").get().c;
  const activeCoupons = db.prepare("SELECT COUNT(*) c FROM coupons WHERE active = 1").get().c;
  const topCourses = db.prepare(`
    SELECT co.title, co.category, COUNT(e.id) enrolls
    FROM courses co LEFT JOIN enrollments e ON e.course_id = co.id AND e.enrolled = 1
    GROUP BY co.id ORDER BY enrolls DESC, co.title LIMIT 5
  `).all();
  res.json({ learners, admins, courses, enrollments, certificates, quizAttempts, revenue, openTickets, activeCoupons, topCourses });
});

// list users (admins can view; super_admin sees everyone incl. staff)
app.get('/api/admin/users', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.role, u.points, u.streak_days, u.created_at, u.active,
      (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id AND e.enrolled = 1) enrollments,
      (SELECT COUNT(*) FROM certificates c WHERE c.user_id = u.id) certificates
    FROM users u ORDER BY u.role DESC, u.full_name
  `).all();
  res.json({ users: rows.map((u) => ({
    id: u.id, fullName: u.full_name, email: u.email, role: u.role,
    points: u.points, streakDays: u.streak_days, createdAt: u.created_at, active: u.active !== 0,
    enrollments: u.enrollments, certificates: u.certificates,
  })) });
});

// course management
app.post('/api/admin/courses', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.category) return res.status(400).json({ error: 'Title and category are required' });
  const slug = (b.slug || b.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (db.prepare('SELECT id FROM courses WHERE slug = ?').get(slug)) return res.status(409).json({ error: 'A course with this name already exists' });
  const info = db.prepare(`
    INSERT INTO courses (slug,title,category,provider,level,duration,summary,description,price,old_price,discount,rating,reviews_count,color,icon,outcomes)
    VALUES (@slug,@title,@category,@provider,@level,@duration,@summary,@description,@price,@old_price,@discount,@rating,@reviews_count,@color,@icon,@outcomes)
  `).run({
    slug, title: b.title, category: b.category,
    provider: b.provider || 'The Elevate Learning Institute',
    level: b.level || 'Beginner', duration: b.duration || '6 weeks',
    summary: b.summary || '', description: b.description || b.summary || '',
    price: Number(b.price) || 0, old_price: b.oldPrice ? Number(b.oldPrice) : null,
    discount: b.discount || null, rating: Number(b.rating) || 4.8, reviews_count: Number(b.reviewsCount) || 0,
    color: b.color || 'navy', icon: b.icon || 'target', outcomes: JSON.stringify(b.outcomes || []),
  });
  if (b.cert) {
    db.prepare('UPDATE courses SET cert_min_progress=?, cert_min_quiz_score=?, cert_require_quizzes=? WHERE id=?')
      .run(Number(b.cert.minProgress) || 100, Number(b.cert.minQuizScore) || 0, b.cert.requireQuizzes === false ? 0 : 1, info.lastInsertRowid);
  }
  audit(req.user, 'course.create', b.title, 'course', info.lastInsertRowid);
  res.json({ course: getCourseDetail(info.lastInsertRowid, null) });
});

app.put('/api/admin/courses/:id', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? OR slug = ?').get(req.params.id, req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const b = req.body || {};
  db.prepare(`
    UPDATE courses SET title=@title, category=@category, level=@level, duration=@duration,
      summary=@summary, description=@description, price=@price, old_price=@old_price,
      discount=@discount, color=@color, icon=@icon, outcomes=@outcomes, published=@published,
      cert_min_progress=@cmp, cert_min_quiz_score=@cmq, cert_require_quizzes=@crq WHERE id=@id
  `).run({
    id: course.id,
    title: b.title ?? course.title, category: b.category ?? course.category,
    level: b.level ?? course.level, duration: b.duration ?? course.duration,
    summary: b.summary ?? course.summary, description: b.description ?? course.description,
    price: b.price != null ? Number(b.price) : course.price,
    old_price: b.oldPrice != null ? Number(b.oldPrice) : course.old_price,
    discount: b.discount ?? course.discount, color: b.color ?? course.color, icon: b.icon ?? course.icon,
    outcomes: b.outcomes != null ? JSON.stringify(b.outcomes) : course.outcomes,
    published: b.published != null ? (b.published ? 1 : 0) : course.published,
    cmp: b.cert ? Number(b.cert.minProgress) || 0 : course.cert_min_progress,
    cmq: b.cert ? Number(b.cert.minQuizScore) || 0 : course.cert_min_quiz_score,
    crq: b.cert ? (b.cert.requireQuizzes === false ? 0 : 1) : course.cert_require_quizzes,
  });
  audit(req.user, 'course.update', course.title, 'course', course.id);
  res.json({ course: getCourseDetail(course.id, null) });
});

app.delete('/api/admin/courses/:id', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? OR slug = ?').get(req.params.id, req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  db.prepare('DELETE FROM courses WHERE id = ?').run(course.id);
  audit(req.user, 'course.delete', course.title, 'course', course.id);
  res.json({ ok: true });
});

// ----------------------- module & lesson management -----------------------
const reindex = (table, parentCol, parentId) => {
  const rows = db.prepare(`SELECT id FROM ${table} WHERE ${parentCol} = ? ORDER BY position`).all(parentId);
  rows.forEach((r, i) => db.prepare(`UPDATE ${table} SET position = ? WHERE id = ?`).run(i + 1, r.id));
};

app.post('/api/admin/courses/:id/modules', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? OR slug = ?').get(req.params.id, req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const pos = (db.prepare('SELECT MAX(position) m FROM modules WHERE course_id = ?').get(course.id).m || 0) + 1;
  const info = db.prepare('INSERT INTO modules (course_id,position,title,subtitle) VALUES (?,?,?,?)')
    .run(course.id, pos, req.body?.title || 'New Module', req.body?.subtitle || null);
  audit(req.user, 'module.create', req.body?.title || 'New Module', 'module', info.lastInsertRowid);
  res.json({ course: getCourseDetail(course.id, null) });
});

app.put('/api/admin/modules/:id', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const m = db.prepare('SELECT * FROM modules WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Module not found' });
  db.prepare('UPDATE modules SET title = COALESCE(?,title), subtitle = ? WHERE id = ?')
    .run(req.body?.title || null, req.body?.subtitle ?? m.subtitle, m.id);
  res.json({ course: getCourseDetail(m.course_id, null) });
});

app.delete('/api/admin/modules/:id', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const m = db.prepare('SELECT * FROM modules WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Module not found' });
  db.prepare('DELETE FROM modules WHERE id = ?').run(m.id);
  reindex('modules', 'course_id', m.course_id);
  audit(req.user, 'module.delete', m.title, 'module', m.id);
  res.json({ course: getCourseDetail(m.course_id, null) });
});

function moduleCourseId(moduleId) {
  return db.prepare('SELECT course_id FROM modules WHERE id = ?').get(moduleId)?.course_id;
}

app.post('/api/admin/modules/:id/lessons', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const m = db.prepare('SELECT * FROM modules WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Module not found' });
  const b = req.body || {};
  const pos = (db.prepare('SELECT MAX(position) m FROM lessons WHERE module_id = ?').get(m.id).m || 0) + 1;
  const info = db.prepare('INSERT INTO lessons (module_id,position,title,kind,duration,body,resources) VALUES (?,?,?,?,?,?,?)')
    .run(m.id, pos, b.title || 'New Lesson', b.kind || 'reading', b.duration || '05:00',
      JSON.stringify(b.body || {}), JSON.stringify(b.resources || []));
  audit(req.user, 'lesson.create', b.title || 'New Lesson', 'lesson', info.lastInsertRowid);
  res.json({ course: getCourseDetail(m.course_id, null) });
});

app.put('/api/admin/lessons/:id', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const l = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!l) return res.status(404).json({ error: 'Lesson not found' });
  const b = req.body || {};
  db.prepare('UPDATE lessons SET title=?, kind=?, duration=?, body=?, resources=? WHERE id=?').run(
    b.title ?? l.title, b.kind ?? l.kind, b.duration ?? l.duration,
    b.body != null ? JSON.stringify(b.body) : l.body,
    b.resources != null ? JSON.stringify(b.resources) : l.resources, l.id);
  audit(req.user, 'lesson.update', b.title ?? l.title, 'lesson', l.id);
  res.json({ course: getCourseDetail(moduleCourseId(l.module_id), null) });
});

app.delete('/api/admin/lessons/:id', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const l = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!l) return res.status(404).json({ error: 'Lesson not found' });
  const courseId = moduleCourseId(l.module_id);
  db.prepare('DELETE FROM lessons WHERE id = ?').run(l.id);
  reindex('lessons', 'module_id', l.module_id);
  audit(req.user, 'lesson.delete', l.title, 'lesson', l.id);
  res.json({ course: getCourseDetail(courseId, null) });
});

// ----------------------- file upload (base64; images/resources) -----------------------
app.post('/api/admin/upload', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const { filename, dataUrl } = req.body || {};
  if (!dataUrl) return res.status(400).json({ error: 'No file provided' });
  const m = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return res.status(400).json({ error: 'Invalid file data' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 12 * 1024 * 1024) return res.status(413).json({ error: 'File too large (max 12MB)' });
  const safe = (filename || 'file').replace(/[^a-z0-9._-]/gi, '_');
  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safe}${extname(safe) ? '' : ''}`;
  writeFileSync(join(UPLOAD_DIR, name), buf);
  res.json({ url: `/uploads/${name}` });
});

// ----------------------- user management -----------------------
// create a user. Admin can add learners; only super_admin can add admins/super_admins.
app.post('/api/admin/users', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const { fullName, email, password, role = 'learner' } = req.body || {};
  if (!fullName || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!['learner', 'admin', 'super_admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (role !== 'learner' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only a Super Admin can create admin accounts' });
  }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).toLowerCase())) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }
  const info = db.prepare('INSERT INTO users (full_name,email,password,role,created_by) VALUES (?,?,?,?,?)')
    .run(fullName, String(email).toLowerCase(), bcrypt.hashSync(String(password), 10), role, req.user.id);
  audit(req.user, 'user.create', `${email} (${role})`, 'user', info.lastInsertRowid);
  notify(info.lastInsertRowid, 'system', 'Welcome to TELI 👋', 'Your account has been created. Start exploring courses.', '/explore');
  sendMail({ to: String(email).toLowerCase(), subject: 'Your TELI account is ready', title: 'Welcome to TELI 👋',
    html: `<p>Hi ${fullName.split(' ')[0]},</p><p>An account has been created for you on TELI as a <b>${role.replace('_', ' ')}</b>.</p><p><b>Email:</b> ${email}<br/><b>Temporary password:</b> ${password}</p><p>Please log in and change your password.</p><p><a href="${config.APP_URL}/login" style="background:#F26419;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block">Log in</a></p>` });
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)) });
});

// suspend / reactivate a user (admins can on learners; super on anyone but self)
app.post('/api/admin/users/:id/active', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot suspend your own account' });
  if (target.role !== 'learner' && req.user.role !== 'super_admin') return res.status(403).json({ error: 'Only a Super Admin can manage staff accounts' });
  const active = req.body?.active ? 1 : 0;
  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active, target.id);
  audit(req.user, active ? 'user.activate' : 'user.suspend', target.email, 'user', target.id);
  res.json({ id: target.id, active: !!active });
});

// delete a user. Learners: admin+. Admin/super_admin accounts: SUPER ADMIN ONLY.
app.delete('/api/admin/users/:id', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  if (target.role !== 'learner' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only a Super Admin can delete admin accounts' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(target.id);
  audit(req.user, 'user.delete', `${target.email} (${target.role})`, 'user', target.id);
  res.json({ ok: true });
});

// change a user's role — SUPER ADMIN ONLY (defined above too; keep single source)
app.post('/api/admin/users/:id/role', authOptional, requireRole('super_admin'), (req, res) => {
  const { role } = req.body || {};
  if (!['learner', 'admin', 'super_admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, target.id);
  audit(req.user, 'user.role', `${target.email} -> ${role}`, 'user', target.id);
  res.json({ id: target.id, role });
});

// detailed learner profile for admins
app.get('/api/admin/users/:id', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  const enrollments = db.prepare('SELECT course_id FROM enrollments WHERE user_id = ? AND enrolled = 1').all(u.id).map((e) => {
    const c = db.prepare('SELECT title, slug, category, color, icon FROM courses WHERE id = ?').get(e.course_id);
    const p = courseProgress(u.id, e.course_id);
    return c ? { ...c, progress: p.percent } : null;
  }).filter(Boolean);
  const certificates = db.prepare(`
    SELECT co.title, c.issued_at FROM certificates c JOIN courses co ON co.id = c.course_id WHERE c.user_id = ? ORDER BY c.issued_at DESC
  `).all(u.id);
  const quizzes = db.prepare(`
    SELECT l.title, q.score, q.total, q.passed, q.created_at FROM quiz_attempts q JOIN lessons l ON l.id = q.lesson_id
    WHERE q.user_id = ? ORDER BY q.created_at DESC LIMIT 20
  `).all(u.id);
  const orders = db.prepare(`
    SELECT o.reference, o.amount, o.status, o.created_at, co.title FROM orders o JOIN courses co ON co.id = o.course_id
    WHERE o.user_id = ? ORDER BY o.created_at DESC
  `).all(u.id);
  res.json({ user: { ...publicUser(u), active: u.active !== 0, createdAt: u.created_at }, enrollments, certificates, quizzes, orders });
});

// ----------------------- coupons -----------------------
app.get('/api/admin/coupons', authOptional, requireRole('admin', 'super_admin'), (_req, res) => {
  const rows = db.prepare(`
    SELECT c.*, co.title course_title FROM coupons c LEFT JOIN courses co ON co.id = c.course_id ORDER BY c.id DESC
  `).all();
  res.json({ coupons: rows.map(couponView) });
});

function couponView(c) {
  return {
    id: c.id, code: c.code, kind: c.kind, value: c.value,
    courseId: c.course_id, courseTitle: c.course_title || null,
    maxUses: c.max_uses, usedCount: c.used_count, singleUse: !!c.single_use,
    active: !!c.active, expiresAt: c.expires_at,
  };
}

app.post('/api/admin/coupons', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const b = req.body || {};
  let code = (b.code || crypto.randomBytes(4).toString('hex')).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return res.status(400).json({ error: 'Invalid code' });
  if (db.prepare('SELECT id FROM coupons WHERE code = ?').get(code)) return res.status(409).json({ error: 'That coupon code already exists' });
  const kind = b.kind === 'fixed' ? 'fixed' : 'percent';
  const value = Number(b.value) || 0;
  if (kind === 'percent' && (value < 1 || value > 100)) return res.status(400).json({ error: 'Percent must be 1–100' });
  const singleUse = b.singleUse === false ? 0 : 1;
  const maxUses = singleUse ? 1 : Math.max(1, Number(b.maxUses) || 1);
  const info = db.prepare(`
    INSERT INTO coupons (code,kind,value,course_id,max_uses,single_use,active,expires_at,created_by)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(code, kind, value, b.courseId || null, maxUses, singleUse, 1, b.expiresAt || null, req.user.id);
  audit(req.user, 'coupon.create', `${code} (${kind} ${value})`, 'coupon', info.lastInsertRowid);
  res.json({ coupon: couponView(db.prepare('SELECT c.*, co.title course_title FROM coupons c LEFT JOIN courses co ON co.id=c.course_id WHERE c.id = ?').get(info.lastInsertRowid)) });
});

app.post('/api/admin/coupons/:id/toggle', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const c = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Coupon not found' });
  db.prepare('UPDATE coupons SET active = ? WHERE id = ?').run(c.active ? 0 : 1, c.id);
  res.json({ active: !c.active });
});

app.delete('/api/admin/coupons/:id', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const c = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Coupon not found' });
  db.prepare('DELETE FROM coupons WHERE id = ?').run(c.id);
  audit(req.user, 'coupon.delete', c.code, 'coupon', c.id);
  res.json({ ok: true });
});

// ----------------------- audit log -----------------------
app.get('/api/admin/audit', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 100').all();
  res.json({ events: rows.map((e) => ({ id: e.id, actor: e.actor_name, action: e.action, detail: e.detail, targetType: e.target_type, at: e.created_at })) });
});

// ===================================================================
//                         PRICING / COUPONS / CHECKOUT
// ===================================================================
function priceCourse(course, couponCode, userId) {
  const base = course.price;
  let discount = 0, appliedCoupon = null, error = null;
  if (couponCode) {
    const c = db.prepare('SELECT * FROM coupons WHERE code = ?').get(String(couponCode).toUpperCase());
    if (!c || !c.active) error = 'Invalid coupon code';
    else if (c.expires_at && new Date(c.expires_at) < new Date()) error = 'This coupon has expired';
    else if (c.course_id && c.course_id !== course.id) error = 'This coupon is not valid for this course';
    else if (c.used_count >= c.max_uses) error = 'This coupon has reached its usage limit';
    else if (userId && db.prepare('SELECT 1 FROM orders WHERE user_id = ? AND coupon_code = ? AND status = ?').get(userId, c.code, 'paid')) error = 'You have already used this coupon';
    else {
      discount = c.kind === 'percent' ? Math.round((base * c.value) / 100) : Math.min(base, c.value);
      appliedCoupon = c.code;
    }
  }
  const amount = Math.max(0, base - discount);
  return { base, discount, amount, appliedCoupon, error };
}

// validate a coupon (used by the checkout screen as the learner types)
app.post('/api/checkout/quote', authOptional, authRequired, (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? OR slug = ?').get(req.body?.courseId, req.body?.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const q = priceCourse(course, req.body?.couponCode, req.user.id);
  res.json(q);
});

// start a checkout. Free/zero -> enrol immediately. Otherwise create an order.
app.post('/api/checkout/init', authOptional, authRequired, async (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? OR slug = ?').get(req.body?.courseId, req.body?.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (db.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ? AND enrolled = 1').get(req.user.id, course.id)) {
    return res.status(400).json({ error: 'You are already enrolled in this course' });
  }
  const q = priceCourse(course, req.body?.couponCode, req.user.id);
  if (q.error) return res.status(400).json({ error: q.error });

  const reference = 'TELI-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  const provider = q.amount === 0 ? 'free' : (paystackEnabled ? 'paystack' : 'sandbox');
  db.prepare(`INSERT INTO orders (reference,user_id,course_id,base_price,discount,amount,coupon_code,status,provider)
              VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(reference, req.user.id, course.id, q.base, q.discount, q.amount, q.appliedCoupon, q.amount === 0 ? 'paid' : 'pending', provider);

  if (q.amount === 0) {
    finalizeOrder(reference);
    return res.json({ mode: 'free', reference, amount: 0 });
  }

  if (provider === 'paystack') {
    try {
      const r = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: req.user.email, amount: q.amount * 100, reference,
          currency: 'NGN', callback_url: `${config.APP_URL}/checkout/callback`,
          metadata: { courseId: course.id, userId: req.user.id },
        }),
      });
      const data = await r.json();
      if (!data.status) return res.status(502).json({ error: data.message || 'Paystack init failed' });
      return res.json({ mode: 'paystack', reference, amount: q.amount, authorizationUrl: data.data.authorization_url });
    } catch {
      return res.status(502).json({ error: 'Could not reach Paystack' });
    }
  }
  // sandbox: the frontend shows a simulated Paystack screen, then calls verify
  res.json({ mode: 'sandbox', reference, amount: q.amount, publicKey: config.PAYSTACK_PUBLIC_KEY || null });
});

function finalizeOrder(reference) {
  const order = db.prepare('SELECT * FROM orders WHERE reference = ?').get(reference);
  if (!order || order.status !== 'paid') {
    if (order && order.status !== 'paid') {
      db.prepare("UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE id = ?").run(order.id);
    }
  }
  const o = db.prepare('SELECT * FROM orders WHERE reference = ?').get(reference);
  const wasEnrolled = db.prepare('SELECT enrolled FROM enrollments WHERE user_id = ? AND course_id = ?').get(o.user_id, o.course_id)?.enrolled;
  // enrol
  db.prepare(`INSERT INTO enrollments (user_id,course_id,enrolled,last_accessed) VALUES (?,?,1,datetime('now'))
              ON CONFLICT(user_id,course_id) DO UPDATE SET enrolled = 1, last_accessed = datetime('now')`)
    .run(o.user_id, o.course_id);
  if (!wasEnrolled) {
    const course = db.prepare('SELECT title, slug FROM courses WHERE id = ?').get(o.course_id);
    const learner = db.prepare('SELECT full_name, email FROM users WHERE id = ?').get(o.user_id);
    notify(o.user_id, 'success', 'You’re enrolled!', `You now have access to “${course.title}”. Start learning anytime.`, `/course/${course.slug}`);
    sendMail({ to: learner.email, subject: `Welcome to ${course.title}`, title: 'Enrollment confirmed 🎉',
      html: `<p>Hi ${learner.full_name.split(' ')[0]},</p><p>You’ve successfully enrolled in <b>${course.title}</b>${o.amount ? ` for ₦${o.amount.toLocaleString()}` : ''}. Your learning journey starts now.</p><p><a href="${config.APP_URL}/course/${course.slug}" style="background:#F26419;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block">Start learning</a></p>` });
  }
  // redeem coupon
  if (o.coupon_code) {
    const c = db.prepare('SELECT * FROM coupons WHERE code = ?').get(o.coupon_code);
    if (c) {
      db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(c.id);
      if (c.single_use || c.used_count + 1 >= c.max_uses) db.prepare('UPDATE coupons SET active = 0 WHERE id = ?').run(c.id);
    }
  }
  return o;
}

// verify payment (sandbox auto-confirms; paystack confirms via API)
app.post('/api/checkout/verify', authOptional, authRequired, async (req, res) => {
  const reference = req.body?.reference;
  const order = db.prepare('SELECT * FROM orders WHERE reference = ? AND user_id = ?').get(reference, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status === 'paid') {
    finalizeOrder(reference);
    return res.json({ status: 'paid', course: getCourseDetail(order.course_id, req.user.id) });
  }
  if (order.provider === 'paystack') {
    try {
      const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}` },
      });
      const data = await r.json();
      if (!(data.status && data.data?.status === 'success')) return res.status(402).json({ error: 'Payment not completed' });
    } catch {
      return res.status(502).json({ error: 'Could not verify with Paystack' });
    }
  }
  // sandbox or verified paystack
  db.prepare("UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE id = ?").run(order.id);
  finalizeOrder(reference);
  audit(req.user, 'order.paid', `${reference} (${order.amount})`, 'order', order.id);
  res.json({ status: 'paid', course: getCourseDetail(order.course_id, req.user.id) });
});

// Paystack webhook (server-to-server confirmation)
app.post('/api/webhooks/paystack', (req, res) => {
  if (paystackEnabled) {
    const sig = req.headers['x-paystack-signature'];
    const hash = crypto.createHmac('sha512', config.PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');
    if (sig !== hash) return res.sendStatus(401);
  }
  const evt = req.body;
  if (evt?.event === 'charge.success' && evt.data?.reference) {
    const order = db.prepare('SELECT * FROM orders WHERE reference = ?').get(evt.data.reference);
    if (order && order.status !== 'paid') { db.prepare("UPDATE orders SET status='paid', paid_at=datetime('now') WHERE id = ?").run(order.id); finalizeOrder(order.reference); }
  }
  res.sendStatus(200);
});

// ===================================================================
//                         SUPPORT TICKETS
// ===================================================================
function ticketView(t) {
  const messages = db.prepare('SELECT author_name,author_role,body,created_at FROM ticket_messages WHERE ticket_id = ? ORDER BY id').all(t.id);
  return {
    id: t.id, subject: t.subject, category: t.category, priority: t.priority, status: t.status,
    createdAt: t.created_at, updatedAt: t.updated_at,
    user: t.full_name ? { id: t.user_id, name: t.full_name, email: t.email } : undefined,
    messages: messages.map((m) => ({ author: m.author_name, role: m.author_role, body: m.body, at: m.created_at })),
  };
}

// learner: my tickets / create
app.get('/api/tickets', authOptional, authRequired, (req, res) => {
  const rows = db.prepare('SELECT * FROM tickets WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id);
  res.json({ tickets: rows.map(ticketView) });
});

app.post('/api/tickets', authOptional, authRequired, (req, res) => {
  const { subject, category, priority, message } = req.body || {};
  if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required' });
  const info = db.prepare('INSERT INTO tickets (user_id,subject,category,priority) VALUES (?,?,?,?)')
    .run(req.user.id, subject, category || 'General', priority || 'normal');
  db.prepare('INSERT INTO ticket_messages (ticket_id,author_id,author_name,author_role,body) VALUES (?,?,?,?,?)')
    .run(info.lastInsertRowid, req.user.id, req.user.full_name, req.user.role, message);
  res.json({ ticket: ticketView(db.prepare('SELECT * FROM tickets WHERE id = ?').get(info.lastInsertRowid)) });
});

// reply to my own ticket
app.post('/api/tickets/:id/reply', authOptional, authRequired, (req, res) => {
  const t = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Ticket not found' });
  const isStaff = req.user.role !== 'learner';
  if (!isStaff && t.user_id !== req.user.id) return res.status(403).json({ error: 'Not your ticket' });
  if (!req.body?.body) return res.status(400).json({ error: 'Message is required' });
  db.prepare('INSERT INTO ticket_messages (ticket_id,author_id,author_name,author_role,body) VALUES (?,?,?,?,?)')
    .run(t.id, req.user.id, req.user.full_name, req.user.role, req.body.body);
  db.prepare("UPDATE tickets SET updated_at = datetime('now'), status = ? WHERE id = ?")
    .run(isStaff ? 'pending' : 'open', t.id);
  if (isStaff) {
    // notify the learner their ticket got a reply
    const owner = db.prepare('SELECT full_name, email FROM users WHERE id = ?').get(t.user_id);
    notify(t.user_id, 'ticket', 'Support replied to your ticket', `“${t.subject}” has a new reply.`, '/support');
    if (owner) sendMail({ to: owner.email, subject: `Re: ${t.subject}`, title: 'Support has replied',
      html: `<p>Hi ${owner.full_name.split(' ')[0]},</p><p>Our team replied to your ticket <b>“${t.subject}”</b>:</p><blockquote style="border-left:3px solid #F26419;padding-left:12px;color:#5b6577">${req.body.body}</blockquote><p><a href="${config.APP_URL}/support">View conversation</a></p>` });
  }
  res.json({ ticket: ticketView(db.prepare('SELECT t.*, u.full_name, u.email FROM tickets t JOIN users u ON u.id=t.user_id WHERE t.id = ?').get(t.id)) });
});

// admin: all tickets + status change
app.get('/api/admin/tickets', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT t.*, u.full_name, u.email FROM tickets t JOIN users u ON u.id = t.user_id
    ${req.query.status ? 'WHERE t.status = @status' : ''} ORDER BY
    CASE t.status WHEN 'open' THEN 0 WHEN 'pending' THEN 1 WHEN 'resolved' THEN 2 ELSE 3 END, t.updated_at DESC
  `).all(req.query.status ? { status: req.query.status } : {});
  res.json({ tickets: rows.map(ticketView) });
});

app.post('/api/admin/tickets/:id/status', authOptional, requireRole('admin', 'super_admin'), (req, res) => {
  const { status } = req.body || {};
  if (!['open', 'pending', 'resolved', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const t = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Ticket not found' });
  db.prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, t.id);
  res.json({ ok: true, status });
});

// ===================================================================
//                    NOTIFICATIONS / INVITES / EMAIL LOG
// ===================================================================
app.get('/api/notifications', authOptional, authRequired, (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50').all(req.user.id);
  const unread = db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id).c;
  res.json({ unread, notifications: rows.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, read: !!n.read, at: n.created_at })) });
});

app.post('/api/notifications/read', authOptional, authRequired, (req, res) => {
  if (req.body?.id) db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.body.id, req.user.id);
  else db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

// referral link + send an invite email
app.get('/api/me/referral', authOptional, authRequired, (req, res) => {
  let row = db.prepare('SELECT code FROM referrals WHERE user_id = ?').get(req.user.id);
  if (!row) {
    const code = 'REF-' + req.user.full_name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    db.prepare('INSERT INTO referrals (user_id,code) VALUES (?,?)').run(req.user.id, code);
    row = { code };
  }
  res.json({ code: row.code, url: `${config.APP_URL}/signup?ref=${row.code}` });
});

app.post('/api/me/invite', authOptional, authRequired, (req, res) => {
  const emails = (req.body?.emails || '').split(/[,\s]+/).filter((e) => /.+@.+\..+/.test(e));
  if (!emails.length) return res.status(400).json({ error: 'Enter at least one valid email' });
  const ref = db.prepare('SELECT code FROM referrals WHERE user_id = ?').get(req.user.id)?.code || '';
  const url = `${config.APP_URL}/signup${ref ? `?ref=${ref}` : ''}`;
  for (const to of emails) {
    sendMail({ to, subject: `${req.user.full_name} invited you to learn on TELI`, title: 'You’re invited to TELI 🎓',
      html: `<p><b>${req.user.full_name}</b> thinks you’d love learning on TELI — practical training for social-impact professionals.</p><p><a href="${url}" style="background:#F26419;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block">Join TELI</a></p>` });
  }
  res.json({ ok: true, sent: emails.length });
});

// admin email log (so admins can see what would be / was sent)
app.get('/api/admin/email-log', authOptional, requireRole('admin', 'super_admin'), (_req, res) => {
  res.json({ enabled: emailEnabled, messages: sentMail.slice(0, 50) });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`TELI API running on http://localhost:${PORT}`));
