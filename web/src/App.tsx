import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth, homeForRole } from './auth';
import { Role } from './api';
import BottomNav from './components/BottomNav';
import AdminNav from './components/AdminNav';
import { Spinner } from './components/ui';

import AdminDashboard from './screens/admin/AdminDashboard';
import AdminCourses from './screens/admin/AdminCourses';
import AdminUsers from './screens/admin/AdminUsers';
import AdminCoupons from './screens/admin/AdminCoupons';
import AdminTickets from './screens/admin/AdminTickets';
import AdminAudit from './screens/admin/AdminAudit';
import AdminLearnerDetail from './screens/admin/AdminLearnerDetail';
import CourseContentEditor from './screens/admin/CourseContentEditor';

import Checkout from './screens/Checkout';
import CheckoutCallback from './screens/CheckoutCallback';
import Support from './screens/Support';
import Settings from './screens/Settings';
import Notifications from './screens/Notifications';
import ResetPassword from './screens/ResetPassword';

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

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full flex items-stretch md:items-center justify-center bg-[#e9ecf3] md:py-6">
      <div className="relative w-full max-w-[440px] bg-white flex flex-col overflow-hidden
                      h-[100dvh] md:h-[900px] md:rounded-[44px] md:shadow-2xl md:ring-1 md:ring-black/10">
        {children}
      </div>
    </div>
  );
}

function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Phone><Spinner /></Phone>;
  if (!user) return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeForRole(user)} replace />;
  return <>{children}</>;
}

function AdminLayout() {
  return (
    <RequireAuth roles={['admin', 'super_admin']}>
      <Phone>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <Outlet />
        </div>
        <AdminNav />
      </Phone>
    </RequireAuth>
  );
}

function TabLayout() {
  return (
    <RequireAuth>
      <Phone>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <Outlet />
        </div>
        <BottomNav />
      </Phone>
    </RequireAuth>
  );
}

function FullLayout({ guard = true, roles }: { guard?: boolean; roles?: Role[] }) {
  const content = (
    <Phone>
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
        <Outlet />
      </div>
    </Phone>
  );
  return guard ? <RequireAuth roles={roles}>{content}</RequireAuth> : content;
}

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route element={<FullLayout guard={false} />}>
        <Route path="/" element={<Splash />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset" element={<ResetPassword />} />
      </Route>

      {/* tabs */}
      <Route element={<TabLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/learning" element={<MyLearning />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* admin (admin + super_admin) — tabbed */}
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/courses" element={<AdminCourses />} />
        <Route path="/admin/coupons" element={<AdminCoupons />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/tickets" element={<AdminTickets />} />
      </Route>

      {/* admin full-screen */}
      <Route element={<FullLayout roles={['admin', 'super_admin']} />}>
        <Route path="/admin/audit" element={<AdminAudit />} />
        <Route path="/admin/users/:id" element={<AdminLearnerDetail />} />
        <Route path="/admin/courses/:slug/content" element={<CourseContentEditor />} />
      </Route>

      {/* full-screen protected */}
      <Route element={<FullLayout />}>
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
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
