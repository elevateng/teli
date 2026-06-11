import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Play, ClipboardList, Award, ChevronRight, BookOpen } from 'lucide-react';
import { api, CourseDetail as CD } from '../api';
import { StatusBar, CourseThumb, Confetti, Spinner } from '../components/ui';
import { lessonPath } from './CourseDetail';

export default function Enrolled() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [course, setCourse] = useState<CD | null>(null);

  useEffect(() => { api.get<{ course: CD }>(`/courses/${slug}`).then((d) => setCourse(d.course)); }, [slug]);
  if (!course) return <Spinner />;

  const start = () => nav(lessonPath(slug!, course.modules[0].lessons[0]));

  const steps = [
    { icon: <Play size={20} className="text-violet-600" />, bg: 'bg-violet-100', title: 'Start learning', sub: `Begin with Module 1: ${course.modules[0].title}` },
    { icon: <ClipboardList size={20} className="text-brand" />, bg: 'bg-orange-100', title: 'Track your progress', sub: 'Pick up where you left off anytime' },
    { icon: <Award size={20} className="text-emerald-600" />, bg: 'bg-emerald-100', title: 'Earn your certificate', sub: 'Complete all lessons and quizzes' },
  ];

  return (
    <div className="flex flex-col min-h-full bg-navy-50/40">
      <StatusBar />
      <div className="text-center px-6 pt-2">
        <h1 className="font-bold text-navy text-[17px]">Enrollment Successful</h1>
      </div>

      <div className="relative px-6 pt-8 text-center">
        <Confetti />
        <div className="w-24 h-24 mx-auto rounded-full bg-emerald-100 flex items-center justify-center pop">
          <CheckCircle2 size={56} className="text-emerald-500" />
        </div>
        <h2 className="text-[32px] font-extrabold text-navy mt-5">You're all set!</h2>
        <p className="text-sub mt-1">You have successfully enrolled in</p>
        <p className="text-[20px] font-extrabold text-navy mt-1">{course.title}</p>
        <p className="text-sub text-sm mt-2 max-w-[18rem] mx-auto">Let's start your learning journey and build stronger impact together.</p>
      </div>

      <div className="mx-6 mt-6 card p-4 flex items-center gap-4">
        <CourseThumb icon={course.icon} color={course.color} size={88} />
        <div>
          <span className="chip bg-brand-50 text-brand">Full Course</span>
          <h3 className="font-extrabold text-navy leading-tight mt-2">{course.title}</h3>
          <p className="text-xs text-sub mt-1 flex items-center gap-1"><BookOpen size={13} /> {course.moduleCount} Modules · {course.lessonCount} Lessons</p>
        </div>
      </div>

      <div className="mx-6 mt-4 card p-4">
        <h3 className="font-extrabold text-navy mb-1">What happens next?</h3>
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-black/[0.05] last:border-0">
            <span className={`w-10 h-10 rounded-full ${s.bg} flex items-center justify-center shrink-0`}>{s.icon}</span>
            <div className="flex-1">
              <p className="font-bold text-navy text-[15px]">{s.title}</p>
              <p className="text-xs text-sub">{s.sub}</p>
            </div>
            <ChevronRight size={18} className="text-sub" />
          </div>
        ))}
      </div>

      <div className="mt-auto px-6 pt-5 pb-7 space-y-2">
        <button onClick={start} className="btn-primary w-full text-[17px]"><Play size={18} fill="currentColor" /> Start Learning Now</button>
        <button onClick={() => nav('/learning')} className="w-full text-brand font-bold py-3">Go to My Learning</button>
      </div>
    </div>
  );
}
