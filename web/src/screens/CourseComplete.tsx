import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Bookmark, MoreVertical, Trophy, PlayCircle, CheckCircle2, Clock, BadgeCheck, ShieldCheck, BarChart3, ChevronRight, ArrowRight, Download } from 'lucide-react';
import { api, CourseDetail as CD, Dashboard } from '../api';
import { Confetti, Spinner } from '../components/ui';

export default function CourseComplete() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [course, setCourse] = useState<CD | null>(null);
  const [dash, setDash] = useState<Dashboard | null>(null);

  useEffect(() => {
    api.get<{ course: CD }>(`/courses/${slug}`).then((d) => setCourse(d.course));
    api.get<Dashboard>('/me/dashboard').then(setDash);
  }, [slug]);

  if (!course || !dash) return <Spinner />;
  const quizzes = course.modules.filter((m) => m.lessons.some((l) => l.kind === 'quiz')).length;

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.05]">
        <button onClick={() => nav('/learning')} className="text-navy"><ChevronLeft size={24} /></button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-navy text-[15px] truncate">{course.title}</h1>
          <p className="text-xs text-sub truncate">Course Complete</p>
        </div>
        <Bookmark size={20} className="text-navy" /><MoreVertical size={20} className="text-navy" />
      </div>

      <div className="relative px-5 pt-8 text-center">
        <Confetti />
        <div className="relative">
          <Trophy size={92} className="text-amber-400 mx-auto pop" />
          <h2 className="text-[32px] font-extrabold text-navy mt-3">Congratulations! 🎉</h2>
          <p className="text-sub mt-1">You've completed the course.<br />Great job on your achievement!</p>
        </div>
      </div>

      <div className="mx-5 mt-6 card p-4 grid grid-cols-4 gap-2 text-center">
        <Mini icon={<PlayCircle size={20} className="text-violet-600" />} bg="bg-violet-100" value={`${course.totalLessons}/${course.totalLessons}`} label="Lessons" />
        <Mini icon={<CheckCircle2 size={20} className="text-emerald-600" />} bg="bg-emerald-100" value={`${dash.quizzesPassed}`} label="Quizzes" />
        <Mini icon={<Clock size={20} className="text-brand" />} bg="bg-orange-100" value={course.estimatedTime} label="Total Time" />
        <Mini icon={<BadgeCheck size={20} className="text-indigo-600" />} bg="bg-indigo-100" value={`${dash.averageScore}%`} label="Avg Score" />
      </div>

      <div className="mx-5 mt-5 rounded-2xl bg-brand-50 p-5">
        <div className="flex items-center gap-2 mb-1"><ShieldCheck size={18} className="text-amber-500" /><span className="font-bold text-navy text-sm">Certificate Unlocked</span></div>
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <h3 className="text-[20px] font-extrabold text-navy leading-tight">{course.title}</h3>
            <p className="text-sub text-sm mt-1">You've earned a certificate of completion. Share it with your network and celebrate your achievement!</p>
            <button onClick={() => nav(`/certificate/${slug}`)} className="btn-outline w-full mt-4 py-3"><Download size={18} /> View Certificate</button>
          </div>
          <button onClick={() => nav(`/certificate/${slug}`)} className="w-24 h-28 rounded-lg border-2 border-navy bg-white flex flex-col items-center justify-center shrink-0">
            <span className="text-[7px] font-bold text-navy tracking-wide">CERTIFICATE</span>
            <span className="text-[5px] text-sub">OF COMPLETION</span>
            <BadgeCheck size={22} className="text-amber-500 my-1" />
            <span className="text-[6px] text-navy font-semibold px-1 text-center leading-tight">{course.title.slice(0, 22)}</span>
          </button>
        </div>
      </div>

      <div className="mx-5 mt-4 rounded-2xl bg-emerald-50 p-4 flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><BarChart3 size={20} className="text-emerald-600" /></span>
        <div className="flex-1">
          <p className="font-bold text-navy text-sm">What's Next?</p>
          <p className="text-xs text-sub">Continue your learning journey with another course.</p>
        </div>
        <ChevronRight size={20} className="text-sub" />
      </div>

      <div className="mt-auto px-5 pt-5 pb-7 space-y-2">
        <button onClick={() => nav('/explore')} className="btn-primary w-full text-[17px]">Continue Learning <ArrowRight size={20} /></button>
        <button onClick={() => nav('/learning')} className="w-full text-navy font-bold py-3">Go to My Learning</button>
      </div>
    </div>
  );
}

function Mini({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center mb-1.5`}>{icon}</span>
      <span className="font-extrabold text-navy text-sm">{value}</span>
      <span className="text-[10px] text-sub leading-tight">{label}</span>
    </div>
  );
}
