import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, Play, Trophy } from 'lucide-react';
import { api, CourseCard, LearningCard } from '../api';
import { StatusBar, Wordmark, CourseThumb, ProgressBar, Spinner } from '../components/ui';
import Bell from '../components/Bell';
import { useAuth } from '../auth';

type Tab = 'In Progress' | 'Completed' | 'Saved';

export default function MyLearning() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('In Progress');
  const [data, setData] = useState<{ inProgress: LearningCard[]; completed: LearningCard[]; saved: LearningCard[] } | null>(null);
  const [recommended, setRecommended] = useState<CourseCard[]>([]);

  useEffect(() => {
    api.get<typeof data>('/me/learning').then(setData as any);
    api.get<{ courses: CourseCard[] }>('/courses').then((d) => setRecommended(d.courses.filter((c) => !c.enrolled).slice(0, 2)));
  }, []);

  if (!data) return <Spinner />;
  const list = tab === 'In Progress' ? data.inProgress : tab === 'Completed' ? data.completed : data.saved;
  const tabs: { k: Tab; n: number }[] = [
    { k: 'In Progress', n: data.inProgress.length },
    { k: 'Completed', n: data.completed.length },
    { k: 'Saved', n: data.saved.length },
  ];

  return (
    <div className="pb-6">
      <StatusBar />
      <div className="flex items-center justify-between px-5 pt-2">
        <Wordmark />
        <Bell />
      </div>

      <div className="px-5 mt-4">
        <h1 className="text-[30px] font-extrabold text-navy">My Learning</h1>
        <p className="text-sub">Track your progress and pick up where you left off.</p>
      </div>

      <div className="px-5 mt-5 flex border-b border-black/[0.06]">
        {tabs.map(({ k, n }) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 pb-3 text-[15px] font-bold relative ${tab === k ? 'text-brand' : 'text-sub'}`}>
            {k} ({n})
            {tab === k && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-brand rounded-full" />}
          </button>
        ))}
      </div>

      <div className="px-5 mt-4 space-y-3">
        {list.length === 0 && (
          <div className="text-center text-sub py-10">
            {tab === 'Saved' ? 'No saved courses yet.' : tab === 'Completed' ? 'No completed courses yet — keep going!' : 'Nothing in progress. Explore courses to begin.'}
          </div>
        )}
        {list.map((c) => (
          <button key={c.id} onClick={() => nav(`/course/${c.slug}`)} className="w-full card p-4 flex items-center gap-4 text-left">
            <CourseThumb icon={c.icon} color={c.color} size={64} />
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-navy leading-tight">{c.title}</h3>
              {tab === 'Saved'
                ? <p className="text-xs text-sub mt-1 flex items-center gap-1"><Clock size={13} /> {c.duration} · {c.level}</p>
                : <>
                    <p className="text-xs text-sub mt-1">Course Progress · {c.progress}%</p>
                    <ProgressBar value={c.progress} className="mt-2" />
                  </>}
            </div>
            {tab === 'In Progress'
              ? <div className="flex flex-col items-center"><Play size={26} className="text-brand" fill="currentColor" /><span className="text-[11px] font-bold text-brand mt-1">Continue</span></div>
              : <ChevronRight size={22} className="text-sub" />}
          </button>
        ))}
      </div>

      {tab === 'In Progress' && recommended.length > 0 && (
        <>
          <div className="flex items-center justify-between px-5 mt-7 mb-3">
            <h2 className="text-[20px] font-extrabold text-navy">Recommended for You</h2>
            <button onClick={() => nav('/explore')} className="text-brand font-bold text-sm">View all</button>
          </div>
          <div className="px-5 space-y-3">
            {recommended.map((c) => (
              <div key={c.id} className="card p-4 flex items-center gap-4">
                <CourseThumb icon={c.icon} color={c.color} size={64} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-navy leading-tight">{c.title}</h3>
                  <p className="text-xs text-sub mt-1 line-clamp-2">{c.summary}</p>
                </div>
                <button onClick={() => nav(`/course/${c.slug}`)} className="border-2 border-brand text-brand font-bold rounded-xl px-4 py-2 text-sm">Enroll</button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mx-5 mt-6 rounded-2xl bg-gradient-to-r from-brand-50 to-orange-100/70 p-5 flex items-center gap-4">
        <div className="flex-1">
          <h3 className="font-extrabold text-navy text-lg">Keep going, {user?.fullName.split(' ')[0]}!</h3>
          <p className="text-sub text-sm">Consistency today creates impact tomorrow.</p>
          <button onClick={() => nav('/achievements')} className="text-brand font-bold text-sm mt-2 flex items-center gap-1">View your achievements <ChevronRight size={15} /></button>
        </div>
        <Trophy size={56} className="text-brand" />
      </div>
    </div>
  );
}
