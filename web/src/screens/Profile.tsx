import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Flame, Gem, ChevronRight, Clock, CheckCircle2, BarChart3, TrendingUp,
  Award, Users, Upload, LogOut, LifeBuoy, X, Copy, Send,
} from 'lucide-react';
import { api, Achievement, Certificate, Dashboard, shareOrCopy } from '../api';
import { StatusBar, ProgressBar, PointIcon, Spinner, Avatar } from '../components/ui';
import { useAuth } from '../auth';

const ACH_STYLE: Record<string, { bg: string; fg: string }> = {
  book: { bg: 'bg-emerald-500', fg: 'text-white' },
  bullseye: { bg: 'bg-blue-500', fg: 'text-white' },
  cap: { bg: 'bg-violet-500', fg: 'text-white' },
  star: { bg: 'bg-amber-400', fg: 'text-white' },
};

export default function Profile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    api.get<Dashboard>('/me/dashboard').then(setDash);
    api.get<{ achievements: Achievement[] }>('/me/achievements').then((d) => setAchievements(d.achievements));
    api.get<{ certificates: Certificate[] }>('/me/certificates').then((d) => setCerts(d.certificates));
  }, []);

  if (!dash || !user) return <Spinner />;
  const initial = user.fullName.charAt(0).toUpperCase();
  const rewardPct = Math.min(100, Math.round((dash.points / dash.nextRewardAt) * 100));

  return (
    <div className="pb-6">
      <StatusBar />
      <div className="flex items-center gap-4 px-5 pt-3">
        <Avatar name={user.fullName} src={user.avatar} size={56} />
        <div className="flex-1">
          <h1 className="text-[22px] font-extrabold text-navy leading-tight">{user.fullName}</h1>
          <p className="text-sub text-sm">{user.tagline} ☀️</p>
        </div>
        <button onClick={() => nav('/settings')}><Settings size={24} className="text-navy" /></button>
      </div>

      {/* streak / points hero */}
      <div className="mx-5 mt-5 rounded-2xl bg-[#3a2bd6] text-white p-5 relative overflow-hidden">
        <div className="flex">
          <div className="flex-1">
            <div className="flex items-center gap-2"><Flame size={26} className="text-orange-400 fill-orange-400" /><span className="text-2xl font-extrabold">{dash.streakDays}</span></div>
            <p className="text-white/70 text-sm">Day Streak</p>
          </div>
          <div className="w-px bg-white/20 mx-2" />
          <div className="flex-1 pl-3">
            <div className="flex items-center gap-2"><Gem size={24} className="text-cyan-300" /><span className="text-2xl font-extrabold">{dash.points.toLocaleString()}</span></div>
            <p className="text-white/70 text-sm">Points</p>
          </div>
          <Award size={70} className="text-amber-300 -mr-2 -mt-1" />
        </div>
        <p className="mt-3 font-semibold">Keep it up! You're doing great.</p>
        <div className="mt-2 h-2 rounded-full bg-white/20 overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${rewardPct}%` }} /></div>
        <p className="text-white/70 text-xs mt-2">Next reward at {dash.nextRewardAt.toLocaleString()} points</p>
      </div>

      {/* achievements */}
      <div className="flex items-center justify-between px-5 mt-7 mb-3">
        <h2 className="text-[20px] font-extrabold text-navy">My Achievements</h2>
        <button onClick={() => nav('/achievements')} className="text-brand font-bold text-sm flex items-center gap-1">View All <ChevronRight size={15} /></button>
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar px-5">
        {achievements.length === 0 && <p className="text-sub text-sm py-4">Complete lessons and quizzes to earn badges.</p>}
        {achievements.map((a) => {
          const st = ACH_STYLE[a.icon] || ACH_STYLE.star;
          return (
            <div key={a.code} className="flex flex-col items-center w-24 shrink-0">
              <div className={`w-16 h-16 rounded-2xl ${st.bg} ${st.fg} flex items-center justify-center`}><PointIcon name={a.icon} size={28} className="text-white" /></div>
              <p className="text-xs font-bold text-navy text-center mt-2 leading-tight">{a.title}</p>
              <p className="text-[10px] text-sub text-center">{a.detail}</p>
            </div>
          );
        })}
      </div>

      {/* learning insights */}
      <div className="mx-5 mt-7 card p-5">
        <h2 className="text-[18px] font-extrabold text-navy mb-4">Learning Insights</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Insight icon={<Clock size={20} className="text-violet-600" />} bg="bg-violet-100" value={dash.totalLearningTime} label="Time Spent" />
          <Insight icon={<CheckCircle2 size={20} className="text-emerald-600" />} bg="bg-emerald-100" value={String(dash.quizzesPassed)} label="Quizzes Passed" />
          <Insight icon={<BarChart3 size={20} className="text-brand" />} bg="bg-orange-100" value={`${dash.averageScore}%`} label="Avg Score" />
        </div>
        <div className="flex items-center justify-between mt-5">
          <div className="flex items-center gap-2"><span className="text-sm text-sub">Overall progress</span></div>
          <span className="font-extrabold text-navy flex items-center gap-1"><TrendingUp size={16} className="text-emerald-500" /> {dash.overallProgress}%</span>
        </div>
        <ProgressBar value={dash.overallProgress} className="mt-2" />
      </div>

      {/* recently earned certificate */}
      <div className="flex items-center justify-between px-5 mt-7 mb-3">
        <h2 className="text-[18px] font-extrabold text-navy">Recently Earned Certificate</h2>
      </div>
      <div className="px-5">
        {certs.length === 0 ? (
          <div className="card p-5 text-sub text-sm text-center">Complete a course to earn your first certificate 🎓</div>
        ) : (
          <button onClick={() => nav(`/certificate/${certs[0].slug}`)} className="w-full card p-4 flex items-center gap-4 text-left">
            <div className="w-20 h-24 rounded-lg border-2 border-amber-300 bg-amber-50 flex flex-col items-center justify-center shrink-0">
              <span className="text-[7px] font-bold text-navy tracking-wide">CERTIFICATE</span>
              <Award size={26} className="text-amber-500 my-1" />
              <span className="text-[6px] text-sub">of completion</span>
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-navy leading-tight">{certs[0].title}</h3>
              <p className="text-xs text-sub mt-1">Completed on {certs[0].issuedAt}</p>
              <span className="text-brand font-bold text-sm mt-2 inline-block">View Certificate →</span>
            </div>
          </button>
        )}
      </div>

      {/* invite a friend */}
      <div className="mx-5 mt-6 rounded-2xl bg-violet-50 p-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-violet-100 flex items-center justify-center"><Users size={22} className="text-violet-600" /></span>
        <div className="flex-1">
          <p className="font-bold text-navy">Invite a Friend</p>
          <p className="text-xs text-sub">Share the gift of learning and grow together.</p>
        </div>
        <button onClick={() => setInviting(true)} className="bg-violet-600 text-white text-sm font-bold rounded-xl px-3 py-2 flex items-center gap-1"><Upload size={15} /> Invite</button>
      </div>
      {inviting && <InviteSheet onClose={() => setInviting(false)} />}

      <div className="px-5 mt-6 grid grid-cols-2 gap-3">
        <button onClick={() => nav('/support')} className="flex items-center justify-center gap-2 text-navy font-bold py-3 border border-black/10 rounded-2xl">
          <LifeBuoy size={18} /> Help & Support
        </button>
        <button onClick={() => nav('/settings')} className="flex items-center justify-center gap-2 text-navy font-bold py-3 border border-black/10 rounded-2xl">
          <Settings size={18} /> Settings
        </button>
      </div>
      <div className="px-5 mt-3">
        <button onClick={() => { logout(); nav('/'); }} className="w-full flex items-center justify-center gap-2 text-red-500 font-bold py-3 border border-red-200 rounded-2xl">
          <LogOut size={18} /> Log out
        </button>
      </div>
    </div>
  );
}

function Insight({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`w-11 h-11 rounded-full ${bg} flex items-center justify-center mb-2`}>{icon}</span>
      <span className="text-lg font-extrabold text-navy">{value}</span>
      <span className="text-[11px] text-sub leading-tight">{label}</span>
    </div>
  );
}

function InviteSheet({ onClose }: { onClose: () => void }) {
  const [ref, setRef] = useState<{ code: string; url: string } | null>(null);
  const [emails, setEmails] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get<{ code: string; url: string }>('/me/referral').then(setRef); }, []);

  const copy = async () => { if (ref) { const r = await shareOrCopy({ title: 'Join me on TELI', url: ref.url }); setMsg(r === 'copied' ? 'Link copied!' : 'Shared!'); setTimeout(() => setMsg(''), 1800); } };
  const send = async () => {
    setBusy(true); setMsg('');
    try { const r = await api.post<{ sent: number }>('/me/invite', { emails }); setMsg(`Invite sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}!`); setEmails(''); }
    catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-5 fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-navy">Invite Friends</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center"><X size={18} /></button>
        </div>
        <p className="text-sm font-bold text-navy mb-2">Your referral link</p>
        <div className="flex gap-2">
          <input readOnly value={ref?.url || 'Loading…'} className="field flex-1 text-sm" />
          <button onClick={copy} className="btn-navy px-4 py-3 text-sm flex items-center gap-1"><Copy size={15} /> Copy</button>
        </div>
        <div className="flex items-center gap-3 my-4 text-sub text-sm"><div className="h-px flex-1 bg-black/10" /> or email them <div className="h-px flex-1 bg-black/10" /></div>
        <textarea value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="friend@email.com, another@email.com" className="field h-20" />
        <button onClick={send} disabled={busy || !emails.trim()} className="btn-primary w-full mt-3 disabled:opacity-50"><Send size={17} /> {busy ? 'Sending…' : 'Send Invites'}</button>
        {msg && <p className="text-sm text-emerald-600 mt-2 text-center font-semibold">{msg}</p>}
      </div>
    </div>
  );
}
