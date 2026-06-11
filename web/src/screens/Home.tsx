import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Play, ChevronRight, Clock } from 'lucide-react';
import { api, CourseCard, Dashboard, LearningCard } from '../api';
import { StatusBar, Wordmark, CourseThumb, ProgressBar, Spinner } from '../components/ui';
import Bell from '../components/Bell';

export default function Home() {
  const nav = useNavigate();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [learning, setLearning] = useState<{ inProgress: LearningCard[] }>({ inProgress: [] });
  const [explore, setExplore] = useState<CourseCard[]>([]);

  useEffect(() => {
    api.get<Dashboard>('/me/dashboard').then(setDash);
    api.get<{ inProgress: LearningCard[] }>('/me/learning').then((d) => setLearning({ inProgress: d.inProgress }));
    api.get<{ courses: CourseCard[] }>('/courses').then((d) => setExplore(d.courses));
  }, []);

  if (!dash) return <Spinner />;
  const cont = learning.inProgress[0];

  return (
    <div className="pb-6">
      <StatusBar />
      <div className="flex items-center justify-between px-5 pt-2">
        <button onClick={() => nav('/explore')}><Menu size={26} className="text-navy" /></button>
        <Wordmark />
        <Bell />
      </div>

      <div className="px-5 mt-4">
        <h1 className="text-[30px] font-extrabold text-navy">Hello, {dash.firstName}! <span className="inline-block">👋</span></h1>
        <p className="text-sub">Let's continue your learning journey.</p>
      </div>

      {/* continue learning */}
      {cont && (
        <button onClick={() => nav(`/course/${cont.slug}`)}
          className="mx-5 mt-5 w-[calc(100%-2.5rem)] text-left card overflow-hidden">
          <div className="bg-gradient-to-br from-brand-50 to-orange-100/60 p-5 flex items-center gap-4">
            <div className="flex-1">
              <span className="text-brand font-bold text-xs uppercase tracking-wide">Continue Learning</span>
              <h3 className="text-[19px] font-extrabold text-navy leading-tight mt-1">{cont.title}</h3>
              <p className="text-sub text-sm mt-2">{cont.progress}% complete</p>
              <ProgressBar value={cont.progress} className="mt-2 max-w-[12rem]" />
              <div className="mt-4 inline-flex items-center gap-2 bg-navy text-white text-sm font-bold rounded-xl px-4 py-2.5">
                <Play size={16} fill="currentColor" /> Resume Course
              </div>
            </div>
            <CourseThumb icon={cont.icon} color={cont.color} size={84} />
          </div>
        </button>
      )}

      {/* my courses */}
      <SectionHeader title="My Courses" action="View all" onAction={() => nav('/learning')} />
      <div className="px-5 space-y-3">
        {learning.inProgress.map((c) => (
          <button key={c.id} onClick={() => nav(`/course/${c.slug}`)} className="w-full card p-3.5 flex items-center gap-3.5 text-left">
            <CourseThumb icon={c.icon} color={c.color} size={56} />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-navy leading-tight">{c.title}</h4>
              <p className="text-xs text-sub mt-0.5">{c.completedModules} of {c.moduleCount} modules completed</p>
              <ProgressBar value={c.progress} className="mt-2" />
            </div>
            <div className="text-right shrink-0">
              <span className="font-extrabold text-navy">{c.progress}%</span>
              <ChevronRight size={20} className="text-sub ml-auto mt-1" />
            </div>
          </button>
        ))}
        {learning.inProgress.length === 0 && (
          <p className="text-sub text-sm text-center py-4">You haven't started any courses yet. Explore below 👇</p>
        )}
      </div>

      {/* explore */}
      <SectionHeader title="Explore Courses" action="See all" onAction={() => nav('/explore')} />
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-2">
        {explore.slice(0, 6).map((c) => (
          <button key={c.id} onClick={() => nav(`/course/${c.slug}`)} className="card p-4 w-40 shrink-0 text-left">
            <CourseThumb icon={c.icon} color={c.color} size={64} rounded="rounded-2xl" />
            <h4 className="font-bold text-navy text-sm leading-tight mt-3 line-clamp-2 min-h-[2.5rem]">{c.title}</h4>
            <div className="flex items-center gap-1 text-xs text-sub mt-2">
              <Clock size={13} /> {c.duration}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 mt-7 mb-3">
      <h2 className="text-[20px] font-extrabold text-navy">{title}</h2>
      <button onClick={onAction} className="text-brand font-bold text-sm">{action}</button>
    </div>
  );
}
