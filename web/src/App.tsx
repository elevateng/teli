import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth, homeForRole } from './auth';
import { Role } from './api';
import BottomNav from './components/BottomNav';
import AdminNav from './components/AdminNav';
import SideNav, { RoleSideNav } from './components/SideNav';
import { learnerNav, adminNav, NavItem } from './components/nav-items';
import { Spinner, BookMark } from './components/ui';

import AdminDashboard from './screens/admin/AdminDashboard';
import AdminCourses from './screens/admin/AdminCourses';
import AdminUsers from './screens/admin/AdminUsers';
import AdminCoupons from './screens/admin/AdminCoupons';
import AdminTickets from './screens/admin/AdminTickets';
import AdminAudit from './screens/admin/AdminAudit';
import AdminLearnerDetail from './screens/admin/AdminLearnerDetail';
import CourseContentEditor from './screens/admin/CourseContentEditor';
import AdminCourseAssignments from './screens/admin/AdminCourseAssignments';
import AdminCourseAnalytics from './screens/admin/AdminCourseAnalytics';

import Checkout from './screens/Checkout';
import CheckoutCallback from './screens/CheckoutCallback';
import Support from './screens/Support';
import Settings from './screens/Settings';
import Notifications from './screens/Notifications';
import ResetPassword from './screens/ResetPassword';
import SetPassword from './screens/SetPassword';
import Redeem from './screens/Redeem';

import Splash from './screens/Splash';
import SignUp from './screens/SignUp';
import Login from './screens/Login';
import Home from './screens/Home';
import Explore from './screens/Explore';
import CourseDetail from './screens/CourseDetail';
import Enrolled from './screens/Enrolled';
import MyLearning from './screens/MyLearning';
import Profile from './screens/Profile';
import Lesson from './screens/Lesson';
import Quiz from './screens/Quiz';
import QuizResults from './screens/QuizResults';
import CourseComplete from './screens/CourseComplete';
import Achievements from './screens/Achievements';
import Certificate from './screens/Certificate';
import Community from './screens/Community';
import TeamChat from './screens/TeamChat';
import Messages from './screens/Messages';
import Legal from './screens/Legal';

// Centered app panel. On phones it's full-screen (with safe-area insets); on
// laptops/desktop it's a comfortable centered column. `wide` is used for the
// main app where a desktop sidebar sits alongside it; the narrow variant is for
// auth/standalone screens.
function Phone({ children, wide }: { children: ReactNode; wide?: boolean }) {
  if (wide) {
    // Focused/detail flows: fill the width but keep a comfortable reading cap.
    return (
      <div className="min-h-[100dvh] w-full flex justify-center bg-white">
        <div className="relative w-full lg:max-w-[1100px] bg-white flex flex-col h-[100dvh] overflow-hidden">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-navy-50/60 md:py-6">
      <div className="relative w-full md:max-w-[480px] bg-white flex flex-col overflow-hidden
                      min-h-[100dvh] md:min-h-0 md:h-[calc(100dvh-3rem)]
                      md:rounded-[28px] md:shadow-xl md:ring-1 md:ring-black/[0.06]">
        {children}
      </div>
    </div>
  );
}

// Main app shell: desktop side navigation + a centered content column with the
// mobile bottom nav. Phones see only the column + bottom nav; laptops see the
// sidebar and a wider layout.
function Shell({ items, mobileNav }: { items: NavItem[]; mobileNav: ReactNode }) {
  return (
    <div className="h-[100dvh] w-full flex bg-white">
      <SideNav items={items} />
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* full landscape on desktop; content fills the width up to a large cap */}
          <div className="mx-auto w-full max-w-[1360px] lg:px-6">
            <Outlet />
          </div>
        </div>
        {mobileNav}
      </div>
    </div>
  );
}

function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Phone><Spinner /></Phone>;
  if (!user) return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  // Invited users must set their own password before doing anything else.
  if (user.mustChangePassword && loc.pathname !== '/set-password') return <Navigate to="/set-password" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeForRole(user)} replace />;
  return <>{children}</>;
}

function AdminLayout() {
  return <RequireAuth roles={['admin', 'super_admin']}><Shell items={adminNav} mobileNav={<AdminNav />} /></RequireAuth>;
}

function TabLayout() {
  return <RequireAuth><Shell items={learnerNav} mobileNav={<BottomNav />} /></RequireAuth>;
}

// Auth screens (login / signup / reset): on laptops a two-panel layout with a
// brand panel beside the form; on phones the form is full-screen as before.
function AuthShell() {
  return (
    <div className="min-h-[100dvh] w-full flex bg-white">
      <div className="hidden lg:flex lg:w-[46%] xl:w-1/2 bg-navy text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-2.5">
          <BookMark size={40} />
          <span className="text-2xl font-extrabold tracking-tight">TELI</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-[44px] font-extrabold leading-[1.05]">Learn. Lead.<br /><span className="text-brand">Elevate Impact.</span></h1>
          <p className="text-white/70 mt-5 text-lg max-w-md">Practical training for social-impact professionals and changemakers in Nigeria.</p>
        </div>
        <p className="relative z-10 text-white/50 text-sm">An initiative of Elevate Development Foundation</p>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-brand/20" />
        <div className="absolute top-24 -right-10 w-44 h-44 rounded-full bg-white/[0.04]" />
      </div>
      <div className="flex-1 flex flex-col min-h-[100dvh] lg:h-[100dvh] lg:overflow-y-auto no-scrollbar">
        <div className="w-full lg:max-w-[520px] lg:mx-auto flex-1 flex flex-col lg:justify-center">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function FullLayout({ guard = true, roles, wide = true }: { guard?: boolean; roles?: Role[]; wide?: boolean }) {
  // Public (unguarded) screens: no nav.
  if (!guard) {
    return (
      <Phone wide={wide}>
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col"><Outlet /></div>
      </Phone>
    );
  }
  // Authed full-screen routes keep the (collapsible) sidebar on desktop so the
  // nav never disappears; mobile stays immersive (sidebar hidden, no bottom nav).
  return (
    <RequireAuth roles={roles}>
      <div className="h-[100dvh] w-full flex bg-white">
        <RoleSideNav />
        <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
            <div className="mx-auto w-full max-w-[1100px] flex-1 flex flex-col">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <Routes>
      {/* public splash — own full-bleed desktop landing */}
      <Route path="/" element={<Splash />} />

      {/* public legal pages (reachable from signup) */}
      <Route element={<FullLayout guard={false} />}>
        <Route path="/legal/:doc" element={<Legal />} />
      </Route>

      {/* auth — desktop split layout */}
      <Route element={<AuthShell />}>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset" element={<ResetPassword />} />
      </Route>

      {/* tabs */}
      <Route element={<TabLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/community" element={<Community />} />
        <Route path="/community/:slug" element={<Community />} />
        <Route path="/learning" element={<MyLearning />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* admin (admin + super_admin) — tabbed */}
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/courses" element={<AdminCourses />} />
        <Route path="/admin/coupons" element={<AdminCoupons />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/community" element={<Community />} />
        <Route path="/admin/tickets" element={<AdminTickets />} />
      </Route>

      {/* admin full-screen */}
      <Route element={<FullLayout roles={['admin', 'super_admin']} />}>
        <Route path="/admin/audit" element={<AdminAudit />} />
        <Route path="/admin/users/:id" element={<AdminLearnerDetail />} />
        <Route path="/admin/courses/:slug/content" element={<CourseContentEditor />} />
        <Route path="/admin/courses/:slug/assignments" element={<AdminCourseAssignments />} />
        <Route path="/admin/courses/:slug/analytics" element={<AdminCourseAnalytics />} />
      </Route>

      {/* full-screen protected */}
      <Route element={<FullLayout />}>
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/redeem" element={<Redeem />} />
        <Route path="/course/:slug/checkout" element={<Checkout />} />
        <Route path="/checkout/callback" element={<CheckoutCallback />} />
        <Route path="/support" element={<Support />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/course/:slug" element={<CourseDetail />} />
        <Route path="/course/:slug/enrolled" element={<Enrolled />} />
        <Route path="/course/:slug/complete" element={<CourseComplete />} />
        <Route path="/learn/:slug/lesson/:lessonId" element={<Lesson />} />
        <Route path="/learn/:slug/quiz/:lessonId" element={<Quiz />} />
        <Route path="/learn/:slug/quiz/:lessonId/results" element={<QuizResults />} />
        <Route path="/certificate/:slug" element={<Certificate />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/team/:groupId" element={<TeamChat />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:userId" element={<Messages />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
