import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, TrendingUp, GraduationCap, Award, Star, ClipboardCheck, BookOpen } from 'lucide-react';
import { api, CourseAnalytics } from '../../api';
import { TopBar, Spinner, Avatar, ProgressBar } from '../../components/ui';

export default function AdminCourseAnalytics() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<CourseAnalytics | null>(null);

  useEffect(() => { api.get<CourseAnalytics>(`/admin/courses/${slug}/analytics`).then(setData); }, [slug]);

  if (!data) return <div className="flex flex-col min-h-full"><TopBar title="Analytics" onBack={() => nav('/admin/courses')} /><Spinner /></div>;

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Analytics" subtitle={data.course.title} onBack={() => nav('/admin/courses')} />
      <div className="px-5 py-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <Card icon={<Users size={18} />} bg="bg-brand-50" color="text-brand" value={data.enrolled} label="Enrolled learners" />
          <Card icon={<TrendingUp size={18} />} bg="bg-violet-100" color="text-violet-600" value={`${data.avgProgress}%`} label="Avg. progress" />
          <Card icon={<GraduationCap size={18} />} bg="bg-emerald-100" color="text-emerald-600" value={data.completedCount} label="Completed course" />
          <Card icon={<Award size={18} />} bg="bg-amber-100" color="text-amber-600" value={data.certificates} label="Certificates issued" />
          <Card icon={<ClipboardCheck size={18} />} bg="bg-indigo-100" color="text-indigo-600" value={data.avgQuizScore != null ? `${data.avgQuizScore}%` : '—'} label={`Avg. quiz (${data.quizAttempts})`} />
          <Card icon={<Star size={18} />} bg="bg-orange-100" color="text-orange-500" value={data.avgRating != null ? data.avgRating.toFixed(1) : '—'} label={`Rating (${data.reviewCount})`} />
        </div>

        {data.assignmentCount > 0 && (
          <div className="card p-4 mt-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-navy flex items-center gap-2"><BookOpen size={16} className="text-brand" /> Assignment submission rate</span>
              <span className="font-extrabold text-navy">{data.submissionRate ?? 0}%</span>
            </div>
            <ProgressBar value={data.submissionRate ?? 0} className="mt-2" />
            <p className="text-xs text-sub mt-2">{data.assignmentCount} assignment{data.assignmentCount > 1 ? 's' : ''} across {data.enrolled} learners</p>
          </div>
        )}

        <h2 className="font-extrabold text-navy text-lg mt-5 mb-2">Learner progress</h2>
        {data.learners.length === 0 ? (
          <p className="text-sub text-sm text-center py-6">No enrolled learners yet.</p>
        ) : (
          <div className="space-y-2">
            {data.learners.map((l) => (
              <div key={l.userId} className="card p-3 flex items-center gap-3">
                <Avatar name={l.name} src={l.avatar} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy truncate">{l.name}</p>
                  <ProgressBar value={l.progress} className="mt-1.5" />
                </div>
                <span className="font-bold text-navy text-sm w-10 text-right">{l.progress}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ icon, bg, color, value, label }: { icon: React.ReactNode; bg: string; color: string; value: React.ReactNode; label: string }) {
  return (
    <div className="card p-4">
      <span className={`w-9 h-9 rounded-full ${bg} ${color} flex items-center justify-center mb-2`}>{icon}</span>
      <p className="text-2xl font-extrabold text-navy leading-none">{value}</p>
      <p className="text-xs text-sub mt-1">{label}</p>
    </div>
  );
}
