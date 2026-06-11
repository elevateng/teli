import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, Share2, Bookmark, Clock, SignalHigh, PlayCircle, Star, CheckCircle2,
  ChevronDown, FileText, HelpCircle, Award, Play, Lock, ArrowRight, Circle,
} from 'lucide-react';
import { api, CourseDetail as CD, LessonNode, naira, shareOrCopy } from '../api';
import { CourseThumb, ProgressBar, Spinner, Wordmark } from '../components/ui';

const TABS = ['Overview', 'Curriculum', 'Instructor', 'Reviews'] as const;

export function lessonPath(slug: string, l: LessonNode) {
  return l.kind === 'quiz' ? `/learn/${slug}/quiz/${l.id}` : `/learn/${slug}/lesson/${l.id}`;
}

export default function CourseDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [course, setCourse] = useState<CD | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const load = () => api.get<{ course: CD }>(`/courses/${slug}`).then((d) => setCourse(d.course));
  useEffect(() => { load(); }, [slug]);

  if (!course) return <Spinner />;

  const enroll = () => nav(`/course/${slug}/checkout`);
  const toggleSave = async () => {
    const { saved } = await api.post<{ saved: boolean }>(`/courses/${course.id}/save`);
    setCourse({ ...course, saved });
  };
  const continueLearning = () => {
    const next = course.modules.flatMap((m) => m.lessons).find((l) => !l.completed);
    nav(next ? lessonPath(slug!, next) : lessonPath(slug!, course.modules[0].lessons[0]));
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* top bar */}
      <div className="flex items-center justify-between px-5 py-3">
        <button onClick={() => nav(-1)} className="text-navy"><ChevronLeft size={26} /></button>
        <Wordmark />
        <div className="flex items-center gap-4">
          <button onClick={async () => { const r = await shareOrCopy({ title: course.title, text: course.summary, url: `${location.origin}/course/${course.slug}` }); setToast(r === 'copied' ? 'Link copied!' : 'Shared!'); setTimeout(() => setToast(''), 1800); }}>
            <Share2 size={22} className="text-navy" />
          </button>
          <button onClick={toggleSave}><Bookmark size={22} className={course.saved ? 'text-brand fill-brand' : 'text-navy'} /></button>
        </div>
      </div>
      {toast && <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-navy text-white text-sm font-semibold px-4 py-2 rounded-full fade-up">{toast}</div>}

      {/* hero */}
      <div className="px-5 flex gap-4">
        <div className="flex-1">
          <span className="chip bg-brand-50 text-brand uppercase tracking-wide">{course.category}</span>
          <h1 className="text-[27px] font-extrabold text-navy leading-tight mt-3">{course.title}</h1>
          <p className="text-sub mt-2 text-sm">{course.summary}</p>
        </div>
        <CourseThumb icon={course.icon} color={course.color} size={120} />
      </div>

      <div className="px-5 mt-4 flex flex-wrap gap-2">
        <Meta icon={<Clock size={15} />} text={course.duration} />
        <Meta icon={<SignalHigh size={15} />} text={course.level} />
        <Meta icon={<PlayCircle size={15} />} text={`${course.lessonCount} Lessons`} />
      </div>
      <div className="px-5 mt-3 flex items-center gap-2">
        <Star size={18} className="text-amber-400 fill-amber-400" />
        <b className="text-navy">{course.rating.toFixed(1)}</b>
        <span className="text-sub text-sm">({course.reviewsCount} reviews)</span>
      </div>

      {/* enrolled progress */}
      {course.enrolled && (
        <div className="mx-5 mt-4 card p-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-navy">Course Progress</span>
            <span className="text-xl font-extrabold text-navy">{course.progress}%</span>
          </div>
          <ProgressBar value={course.progress} className="mt-2" />
          <p className="text-xs text-sub mt-2">{course.completedLessons} of {course.totalLessons} lessons completed</p>
        </div>
      )}

      {/* tabs */}
      <div className="px-5 mt-5 flex border-b border-black/[0.06]">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 pb-3 text-sm font-bold relative ${tab === t ? 'text-brand' : 'text-sub'}`}>
            {t}
            {tab === t && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-brand rounded-full" />}
          </button>
        ))}
      </div>

      <div className="px-5 py-5 flex-1">
        {tab === 'Overview' && <Overview course={course} />}
        {tab === 'Curriculum' && <Curriculum course={course} slug={slug!} />}
        {tab === 'Instructor' && <Instructor course={course} />}
        {tab === 'Reviews' && <Reviews course={course} />}
      </div>

      {/* sticky action */}
      <div className="sticky bottom-0 bg-gradient-to-t from-brand-50 to-brand-50/70 px-5 pt-4 pb-6 border-t border-black/[0.05]">
        {course.enrolled ? (
          <button onClick={continueLearning} className="btn-primary w-full text-[17px]">
            {course.progress > 0 ? 'Continue Learning' : 'Start Learning'} <ArrowRight size={20} />
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold text-navy">{naira(course.price)}</span>
                {course.oldPrice && <span className="text-sub line-through text-sm">{naira(course.oldPrice)}</span>}
                {course.discount && <span className="chip bg-brand text-white">{course.discount}</span>}
              </div>
              <p className="text-xs text-sub mt-1">7-day money-back guarantee</p>
            </div>
            <button onClick={enroll} disabled={busy} className="btn-primary flex-1 text-[16px]">
              {busy ? 'Enrolling…' : 'Enroll Now'} <ArrowRight size={19} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <span className="flex items-center gap-1.5 text-sm text-navy border border-black/10 rounded-full px-3 py-1.5">{icon}{text}</span>;
}

function Overview({ course }: { course: CD }) {
  const includes = [
    { icon: <PlayCircle size={22} />, label: `${course.lessonCount} Lessons` },
    { icon: <FileText size={22} />, label: '10 Resources' },
    { icon: <HelpCircle size={22} />, label: `${course.modules.filter((m) => m.lessons.some((l) => l.kind === 'quiz')).length} Quizzes` },
    { icon: <Award size={22} />, label: 'Certificate' },
  ];
  return (
    <div className="space-y-6 fade-up">
      <div className="card p-5">
        <h3 className="font-extrabold text-navy text-lg">What you'll learn</h3>
        <div className="grid grid-cols-1 gap-3 mt-4">
          {course.outcomes.map((o) => (
            <div key={o} className="flex items-start gap-2.5">
              <CheckCircle2 size={20} className="text-brand shrink-0 mt-0.5" />
              <span className="text-navy text-[15px]">{o}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-extrabold text-navy text-lg">About this course</h3>
        <p className="text-sub mt-2 leading-relaxed">{course.description}</p>
        <p className="text-sub mt-2 text-sm">By <b className="text-navy">{course.provider}</b></p>
      </div>

      <div className="card p-5">
        <h3 className="font-extrabold text-navy mb-4">This course includes</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {includes.map((i) => (
            <div key={i.label} className="flex flex-col items-center gap-2">
              <span className="text-navy">{i.icon}</span>
              <span className="text-[11px] font-semibold text-sub leading-tight">{i.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Curriculum({ course, slug }: { course: CD; slug: string }) {
  const [open, setOpen] = useState<number | null>(0);
  const nav = useNavigate();
  return (
    <div className="space-y-3 fade-up">
      {course.modules.map((m, i) => {
        const expanded = open === i;
        const locked = i > 0 && course.modules[i - 1].completedCount < course.modules[i - 1].lessonCount && !course.enrolled;
        return (
          <div key={m.id} className="card overflow-hidden">
            <button onClick={() => setOpen(expanded ? null : i)}
              className={`w-full flex items-center gap-3 p-4 ${expanded ? 'bg-brand-50' : ''}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${expanded ? 'bg-brand text-white' : 'bg-black/[0.06] text-navy'}`}>{i + 1}</span>
              <span className="flex-1 text-left font-bold text-navy leading-tight">{m.title}</span>
              <span className="text-sm text-sub">{m.completedCount}/{m.lessonCount}</span>
              <ChevronDown size={20} className={`text-sub transition ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
              <div className="divide-y divide-black/[0.05]">
                {m.lessons.map((l) => (
                  <button key={l.id} onClick={() => nav(lessonPath(slug, l))}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    {l.completed
                      ? <CheckCircle2 size={20} className="text-brand shrink-0" />
                      : l.kind === 'quiz' ? <HelpCircle size={20} className="text-navy/40 shrink-0" /> : <Play size={18} className="text-brand shrink-0" />}
                    <span className="flex-1 text-sm text-navy">{l.title}</span>
                    <span className="text-xs text-sub">{l.duration}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Instructor({ course }: { course: CD }) {
  return (
    <div className="fade-up">
      <div className="card p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-navy text-white flex items-center justify-center text-2xl font-extrabold">E</div>
        <div>
          <h3 className="font-extrabold text-navy text-lg">{course.provider}</h3>
          <p className="text-sub text-sm">Faculty &amp; Practitioners</p>
          <div className="flex items-center gap-1 mt-1 text-sm"><Star size={15} className="text-amber-400 fill-amber-400" /> {course.rating.toFixed(1)} instructor rating</div>
        </div>
      </div>
      <p className="text-sub mt-4 leading-relaxed">
        Courses are taught by experienced social-impact practitioners who combine real fieldwork with
        practical frameworks you can apply immediately in your organization.
      </p>
    </div>
  );
}

function Reviews({ course }: { course: CD }) {
  return (
    <div className="space-y-4 fade-up">
      <div className="flex items-center gap-3">
        <span className="text-4xl font-extrabold text-navy">{course.rating.toFixed(1)}</span>
        <div>
          <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} className={i < Math.round(course.rating) ? 'text-amber-400 fill-amber-400' : 'text-black/15'} />)}</div>
          <p className="text-sm text-sub">{course.reviewsCount} reviews</p>
        </div>
      </div>
      {course.reviews.length === 0 && <p className="text-sub text-sm">No written reviews yet — be the first!</p>}
      {course.reviews.map((r, i) => (
        <div key={i} className="card p-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-navy">{r.author}</span>
            <div className="flex">{Array.from({ length: 5 }).map((_, j) => <Star key={j} size={13} className={j < r.rating ? 'text-amber-400 fill-amber-400' : 'text-black/15'} />)}</div>
          </div>
          <p className="text-sub text-sm mt-1.5">{r.body}</p>
        </div>
      ))}
    </div>
  );
}
