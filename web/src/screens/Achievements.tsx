import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Gem, Award, Clock, CheckCircle2, BarChart3 } from 'lucide-react';
import { api, Achievement, Dashboard } from '../api';
import { TopBar, PointIcon, Spinner } from '../components/ui';

const ALL_BADGES = [
  // progression
  { icon: 'rocket', title: 'First Step', detail: 'Complete your first lesson', bg: 'bg-brand' },
  { icon: 'bolt', title: 'Getting Going', detail: 'Complete 5 lessons', bg: 'bg-indigo-500' },
  { icon: 'flame', title: 'Dedicated', detail: 'Complete 20 lessons', bg: 'bg-orange-500' },
  { icon: 'medal', title: 'Unstoppable', detail: 'Complete 50 lessons', bg: 'bg-rose-500' },
  // courses
  { icon: 'cap', title: 'Course Master', detail: 'Complete a course', bg: 'bg-violet-500' },
  { icon: 'trophy', title: 'Triple Threat', detail: 'Complete 3 courses', bg: 'bg-amber-500' },
  { icon: 'medal', title: 'Scholar', detail: 'Complete 5 courses', bg: 'bg-emerald-600' },
  // quizzes
  { icon: 'book', title: 'Quick Learner', detail: 'Pass a quiz', bg: 'bg-emerald-500' },
  { icon: 'bullseye', title: 'On Target', detail: 'Scored 80% or higher', bg: 'bg-blue-500' },
  { icon: 'star', title: 'Top Performer', detail: 'Scored 90% or higher', bg: 'bg-amber-400' },
  { icon: 'trophy', title: 'Perfectionist', detail: 'Aced a quiz with 100%', bg: 'bg-yellow-500' },
  // participation
  { icon: 'pen', title: 'Reviewer', detail: 'Leave a course review', bg: 'bg-cyan-600' },
  { icon: 'message', title: 'Community Voice', detail: 'Post in a community', bg: 'bg-sky-500' },
  { icon: 'feather', title: 'Go-Getter', detail: 'Submit an assignment', bg: 'bg-teal-600' },
  // streaks
  { icon: 'flame', title: 'On a Roll', detail: '3-day learning streak', bg: 'bg-orange-500' },
  { icon: 'flame', title: 'Week Warrior', detail: '7-day learning streak', bg: 'bg-orange-600' },
  { icon: 'flame', title: 'Committed', detail: '14-day learning streak', bg: 'bg-red-500' },
  { icon: 'flame', title: 'Unbreakable', detail: '30-day learning streak', bg: 'bg-red-600' },
  // points milestones
  { icon: 'star', title: 'Rising Star', detail: 'Earn 500 points', bg: 'bg-amber-400' },
  { icon: 'medal', title: 'Learning Legend', detail: 'Earn 1,000 points', bg: 'bg-violet-600' },
  { icon: 'trophy', title: 'TELI Champion', detail: 'Earn 2,500 points', bg: 'bg-amber-600' },
];

export default function Achievements() {
  const nav = useNavigate();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [earned, setEarned] = useState<Achievement[]>([]);

  useEffect(() => {
    api.get<Dashboard>('/me/dashboard').then(setDash);
    api.get<{ achievements: Achievement[] }>('/me/achievements').then((d) => setEarned(d.achievements));
  }, []);

  if (!dash) return <Spinner />;
  const earnedTitles = new Set(earned.map((e) => e.title));
  const rewardPct = Math.min(100, Math.round((dash.points / dash.nextRewardAt) * 100));

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Achievements" subtitle="Your learning milestones" onBack={() => nav('/profile')} />

      <div className="px-5 py-5">
        <div className="rounded-2xl bg-[#3a2bd6] text-white p-5">
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
            <Award size={64} className="text-amber-300" />
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${rewardPct}%` }} /></div>
          <p className="text-white/70 text-xs mt-2">Next reward at {dash.nextRewardAt.toLocaleString()} points</p>
        </div>

        <h2 className="text-[20px] font-extrabold text-navy mt-7 mb-4">Badges</h2>
        <div className="grid grid-cols-2 gap-4">
          {ALL_BADGES.map((b) => {
            const got = earnedTitles.has(b.title);
            return (
              <div key={b.title} className={`card p-4 flex flex-col items-center text-center ${got ? '' : 'opacity-50 grayscale'}`}>
                <div className={`w-16 h-16 rounded-2xl ${b.bg} flex items-center justify-center`}><PointIcon name={b.icon} size={30} className="text-white" /></div>
                <p className="font-bold text-navy mt-2.5 leading-tight">{b.title}</p>
                <p className="text-xs text-sub">{b.detail}</p>
                <span className={`chip mt-2 ${got ? 'bg-emerald-100 text-emerald-700' : 'bg-black/[0.06] text-sub'}`}>{got ? 'Earned' : 'Locked'}</span>
              </div>
            );
          })}
        </div>

        <h2 className="text-[20px] font-extrabold text-navy mt-7 mb-4">Learning Insights</h2>
        <div className="card p-5 grid grid-cols-3 gap-2 text-center">
          <Insight icon={<Clock size={20} className="text-violet-600" />} bg="bg-violet-100" value={dash.totalLearningTime} label="Time Spent" />
          <Insight icon={<CheckCircle2 size={20} className="text-emerald-600" />} bg="bg-emerald-100" value={String(dash.quizzesPassed)} label="Quizzes Passed" />
          <Insight icon={<BarChart3 size={20} className="text-brand" />} bg="bg-orange-100" value={`${dash.averageScore}%`} label="Avg Score" />
        </div>
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
