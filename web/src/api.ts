const TOKEN_KEY = 'teli_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  ...(options.headers as any)
};

const token = getToken();
if (token) headers.Authorization = `Bearer ${token}`;

const API_BASE = 'https://teli-api.onrender.com';

const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });

const text = await res.text();
const data = text ? JSON.parse(text) : {};
if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
return data as T;
}

export const api = {
  get: <T,>(p: string) => request<T>(p),
  post: <T,>(p: string, body?: unknown) => request<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T,>(p: string, body?: unknown) => request<T>(p, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T,>(p: string) => request<T>(p, { method: 'DELETE' }),
};

// Resize an image File to a small data URL. Defaults to JPEG (for avatars/photos);
// pass type 'image/png' to preserve transparency (e.g. signatures).
export async function resizeImage(file: File, max = 256, type: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<string> {
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d')!.drawImage(img, 0, 0, w, h);
  return type === 'image/png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.85);
}

// read a File as a data URL and upload it; returns the served path
export async function uploadFile(file: File): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const { url } = await api.post<{ url: string }>('/admin/upload', { filename: file.name, dataUrl });
  return url;
}

// ---------------- types ----------------
export type Role = 'learner' | 'admin' | 'super_admin';
export interface User {
  id: number; fullName: string; email: string; tagline: string; role: Role;
  points: number; streakDays: number; avatar?: string | null; mustChangePassword?: boolean;
}
export interface AccessCode { id: number; code: string; email: string | null; maxUses: number; usedCount: number; active: boolean; createdAt: string; }
export interface Reward { code: string; kind: 'percent' | 'fixed'; value: number; label: string | null; used: boolean; active: boolean; }
export interface ReferralInfo { code: string; url: string; referrals: number; points: number; nextRewardAt: number; }

export interface AdminStats {
  learners: number; admins: number; courses: number; enrollments: number;
  certificates: number; quizAttempts: number; revenue: number;
  openTickets: number; activeCoupons: number;
  topCourses: { title: string; category: string; enrolls: number }[];
}
export interface AdminUser {
  id: number; fullName: string; email: string; role: Role; active: boolean;
  points: number; streakDays: number; createdAt: string; enrollments: number; certificates: number;
}

export interface CourseCard {
  id: number; slug: string; title: string; category: string; level: string; duration: string;
  summary: string; price: number; oldPrice: number | null; discount: string | null;
  rating: number; reviewsCount: number; color: string; icon: string; image?: string | null;
  progress: number; enrolled: boolean; saved: boolean; tags?: string[];
  visibility?: 'public' | 'private'; published?: boolean;
}
export interface Instructor { name: string; title: string; bio: string; avatar: string | null; }
export interface GroupMember { userId: number; name: string; avatar: string | null; leader: boolean; }
export interface CourseGroup { id: number; name: string; courseId?: number; members: GroupMember[]; }

export type AssignmentFormat = 'text' | 'file' | 'link';
export interface Submission {
  id: number; body: string; fileUrl: string | null; linkUrl: string | null;
  status: 'submitted' | 'graded'; grade: number | null; feedback: string; submittedAt: string;
}
export interface Assignment {
  id: number; courseId: number; title: string; instructions: string; format: AssignmentFormat;
  maxPoints: number; dueAt: string | null; createdAt: string;
  mySubmission?: Submission | null;
  enrolled?: number; submitted?: number; graded?: number;
}
export interface SubmissionRow { userId: number; name: string; avatar: string | null; submission: Submission | null; }
export interface CourseAnalytics {
  course: { id: number; title: string; slug: string };
  enrolled: number; completedCount: number; avgProgress: number;
  avgQuizScore: number | null; quizAttempts: number; certificates: number;
  avgRating: number | null; reviewCount: number; assignmentCount: number; submissionRate: number | null;
  learners: { userId: number; name: string; avatar: string | null; progress: number }[];
}

export type LessonKind = 'reading' | 'video' | 'activity' | 'quiz';
export interface LessonNode {
  id: number; title: string; kind: LessonKind;
  duration: string; completed: boolean; body: any; resources?: { name: string; url: string }[];
}
export interface ModuleNode {
  id: number; title: string; subtitle: string | null; position: number;
  lessonCount: number; completedCount: number; lessons: LessonNode[];
}
export interface Review { author: string; rating: number; body: string; created_at: string; }

export interface CertConditions { minProgress: number; minQuizScore: number; requireQuizzes: boolean; }
export interface CourseDetail extends Omit<CourseCard, 'progress'> {
  provider: string; description: string; outcomes: string[];
  moduleCount: number; lessonCount: number; estimatedTime: string;
  modules: ModuleNode[]; reviews: Review[]; myReview: { rating: number; body: string } | null;
  instructor: Instructor; signatoryName: string; signatoryImage?: string | null; createdBy: number | null; tags: string[];
  myGroup?: CourseGroup | null;
  lastAccessed: string | null; progress: number; completedLessons: number; totalLessons: number;
  published: boolean; visibility: 'public' | 'private'; cert: CertConditions;
}

export interface LearningCard {
  id: number; slug: string; title: string; category: string; color: string; icon: string;
  duration: string; level: string; progress: number;
  completedModules: number; moduleCount: number; lastAccessed: string | null;
}

export interface Dashboard {
  firstName: string; points: number; streakDays: number; nextRewardAt: number;
  coursesEnrolled: number; coursesCompleted: number; overallProgress: number;
  quizzesPassed: number; quizzesTaken: number; averageScore: number;
  totalLearningTime: string; certificatesEarned: number;
}

export interface Achievement { code: string; title: string; detail: string; icon: string; earned_at: string; }
export interface Certificate { title: string; slug: string; category: string; issuedAt: string; recipient: string; signatory: string; signatureImage?: string | null; provider: string; }

export interface QuizResult {
  score: number; total: number; percent: number; passed: boolean; timeTaken: string | null;
  breakdown: { index: number; question: string; options: string[]; correctAnswer: number; yourAnswer: number | null; correct: boolean; explanation: string; }[];
  courseProgress: { total: number; done: number; percent: number };
}

export interface RuntimeConfig {
  paymentProvider: 'flutterwave' | 'paystack' | 'sandbox';
  paystackPublicKey: string | null; paystackEnabled: boolean;
  flutterwavePublicKey: string | null; flutterwaveEnabled: boolean;
  googleClientId: string | null; googleEnabled: boolean;
}

export interface Coupon {
  id: number; code: string; kind: 'percent' | 'fixed'; value: number;
  courseId: number | null; courseTitle: string | null;
  maxUses: number; usedCount: number; singleUse: boolean; active: boolean; expiresAt: string | null;
}

export interface Quote { base: number; discount: number; amount: number; appliedCoupon: string | null; error: string | null; }

export interface TicketMessage { author: string; role: Role; body: string; at: string; }
export interface Ticket {
  id: number; reference: string; subject: string; category: string; priority: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  courseId: number | null; courseTitle: string | null;
  createdAt: string; updatedAt: string; messages: TicketMessage[];
  user?: { id: number; name: string; email: string };
}

export interface AuditEvent { id: number; actor: string; action: string; detail: string; targetType: string | null; at: string; }

export interface LearnerDetail {
  user: AdminUser & { active: boolean; createdAt: string };
  enrollments: { title: string; slug: string; category: string; color: string; icon: string; progress: number }[];
  certificates: { title: string; issued_at: string }[];
  quizzes: { title: string; score: number; total: number; passed: number; created_at: string }[];
  orders: { reference: string; amount: number; status: string; created_at: string; title: string }[];
}

export interface AppNotification {
  id: number; type: string; title: string; body: string; link: string | null; read: boolean; at: string;
}

export interface PostAuthor { id: number; name: string; avatar: string | null; role: Role; staff: boolean; }
export interface CommunityPost {
  id: number; body: string; image: string | null; pinned: boolean; createdAt: string;
  author: PostAuthor | null; likes: number; liked: boolean; comments: number;
}
export interface CommunityComment {
  id: number; body: string; createdAt: string; userId: number; author: PostAuthor | null;
}

export const naira = (n: number) => '₦' + n.toLocaleString('en-NG');

// Friendly relative time, e.g. "3h", "2d".
export function timeAgo(iso: string): string {
  const then = new Date(iso.includes('T') || iso.includes(' ') ? iso.replace(' ', 'T') + (iso.endsWith('Z') ? '' : 'Z') : iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7); if (w < 5) return `${w}w`;
  return new Date(then).toLocaleDateString();
}

// Share via the native share sheet, falling back to clipboard. Returns a status string.
export async function shareOrCopy(data: { title?: string; text?: string; url: string }): Promise<'shared' | 'copied'> {
  if (navigator.share) {
    try { await navigator.share(data); return 'shared'; } catch { /* user cancelled or unsupported */ }
  }
  try { await navigator.clipboard.writeText(data.url); } catch { /* ignore */ }
  return 'copied';
}
