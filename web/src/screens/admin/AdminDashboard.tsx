import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookCopy, GraduationCap, Award, TrendingUp, LogOut, ShieldCheck, BadgeCheck, ScrollText, Mail } from 'lucide-react';
import { api, AdminStats, naira } from '../../api';
import { StatusBar, Wordmark, Spinner } from '../../components/ui';
import { useAuth } from '../../auth';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => { api.get<AdminStats>('/admin/stats').then(setStats); }, []);
  if (!stats || !user) return <Spinner />;

  const isSuper = user.role === 'super_admin';
  const cards = [
    { icon: <Users size={22} className="text-violet-600" />, bg: 'bg-violet-100', value: stats.learners, label: 'Learners' },
    { icon: <BookCopy size={22} className="text-brand" />, bg: 'bg-orange-100', value: stats.courses, label: 'Courses' },
    { icon: <GraduationCap size={22} className="text-emerald-600" />, bg: 'bg-emerald-100', value: stats.enrollments, label: 'Enrollments' },
    { icon: <Award size={22} className="text-amber-600" />, bg: 'bg-amber-100', value: stats.certificates, label: 'Certificates' },
  ];

  return (
    <div className="pb-6">
      <StatusBar />
      <div className="flex items-center justify-between px-5 pt-2">
        <Wordmark />
        <span className={`chip ${isSuper ? 'bg-navy text-white' : 'bg-brand-50 text-brand'} flex items-center gap-1`}>
          <ShieldCheck size={14} /> {isSuper ? 'Super Admin' : 'Admin'}
        </span>
      </div>

      <div className="px-5 mt-4">
        <h1 className="text-[28px] font-extrabold text-navy">Admin Console</h1>
        <p className="text-sub">Welcome back, {user.fullName.split(' ')[0]}. Here's your platform at a glance.</p>
      </div>

      {/* revenue hero */}
      <div className="mx-5 mt-5 rounded-2xl bg-navy text-white p-5">
        <p className="text-white/70 text-sm">Total enrollment revenue</p>
        <div className="flex items-end justify-between mt-1">
          <span className="text-[34px] font-extrabold leading-none">{naira(stats.revenue)}</span>
          <span className="flex items-center gap-1 text-emerald-300 text-sm font-bold"><TrendingUp size={16} /> {stats.enrollments} enrolled</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-xl bg-white/10 p-3"><p className="text-white/60 text-xs">Quizzes</p><p className="text-lg font-extrabold">{stats.quizAttempts}</p></div>
          <button onClick={() => nav('/admin/tickets')} className="rounded-xl bg-white/10 p-3 text-left"><p className="text-white/60 text-xs">Open tickets</p><p className="text-lg font-extrabold">{stats.openTickets}</p></button>
          <button onClick={() => nav('/admin/coupons')} className="rounded-xl bg-white/10 p-3 text-left"><p className="text-white/60 text-xs">Coupons</p><p className="text-lg font-extrabold">{stats.activeCoupons}</p></button>
        </div>
      </div>

      {/* stat cards */}
      <div className="px-5 mt-5 grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <span className={`w-11 h-11 rounded-full ${c.bg} flex items-center justify-center`}>{c.icon}</span>
            <p className="text-2xl font-extrabold text-navy mt-3">{c.value}</p>
            <p className="text-sm text-sub">{c.label}</p>
          </div>
        ))}
      </div>

      {/* top courses */}
      <div className="px-5 mt-7">
        <h2 className="text-[20px] font-extrabold text-navy mb-3">Top Courses by Enrollment</h2>
        <div className="card divide-y divide-black/[0.05]">
          {stats.topCourses.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <span className="w-7 h-7 rounded-full bg-brand-50 text-brand font-bold text-sm flex items-center justify-center shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-navy text-sm leading-tight truncate">{c.title}</p>
                <p className="text-xs text-sub">{c.category}</p>
              </div>
              <span className="flex items-center gap-1 text-sm font-bold text-navy"><BadgeCheck size={15} className="text-emerald-500" /> {c.enrolls}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-6 grid grid-cols-2 gap-3">
        <button onClick={() => nav('/admin/courses')} className="btn-primary py-3.5">Manage Courses</button>
        <button onClick={() => nav('/admin/users')} className="btn-navy py-3.5">Manage Users</button>
      </div>
      <div className="px-5 mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => nav('/admin/coupons')} className="py-3 rounded-2xl border-2 border-black/10 font-bold text-navy">Coupons</button>
        <button onClick={() => nav('/admin/audit')} className="py-3 rounded-2xl border-2 border-black/10 font-bold text-navy flex items-center justify-center gap-2"><ScrollText size={17} /> Audit Log</button>
        <button onClick={() => nav('/admin/email')} className="py-3 rounded-2xl border-2 border-black/10 font-bold text-navy flex items-center justify-center gap-2 col-span-2"><Mail size={17} /> Email diagnostics</button>
      </div>

      <div className="px-5 mt-4">
        <button onClick={() => { logout(); nav('/'); }} className="w-full flex items-center justify-center gap-2 text-red-500 font-bold py-3 border border-red-200 rounded-2xl">
          <LogOut size={18} /> Log out
        </button>
      </div>
    </div>
  );
}
