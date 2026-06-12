import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, Bookmark, MoreVertical, Heart, Shield, Users, Lightbulb, Quote,
  ArrowRight, ArrowLeft, Play, Pause, Maximize, Captions, Settings, Clock, SignalHigh,
  FileText, Puzzle, CheckCircle2, ListChecks, Flag, Home, GraduationCap,
} from 'lucide-react';
import { api, CourseDetail as CD, LessonNode, ModuleNode } from '../api';
import { Spinner, ProgressBar } from '../components/ui';
import { RichTextView } from '../components/RichText';
import { lessonPath } from './CourseDetail';

const POINT_ICON: Record<string, any> = { heart: Heart, shield: Shield, users: Users };
const POINT_BG: Record<string, string> = { heart: 'bg-orange-100 text-brand', shield: 'bg-indigo-100 text-indigo-600', users: 'bg-emerald-100 text-emerald-600' };

interface Ctx { course: CD; module: ModuleNode; lesson: LessonNode; index: number; total: number; prev: LessonNode | null; next: LessonNode | null; }

function useLessonCtx(slug?: string, lessonId?: string) {
  const [course, setCourse] = useState<CD | null>(null);
  const reload = () => api.get<{ course: CD }>(`/courses/${slug}`).then((d) => setCourse(d.course));
  useEffect(() => { reload(); }, [slug, lessonId]);

  const ctx = useMemo<Ctx | null>(() => {
    if (!course) return null;
    const flat = course.modules.flatMap((m) => m.lessons.map((l) => ({ l, m })));
    const idx = flat.findIndex((x) => x.l.id === Number(lessonId));
    if (idx < 0) return null;
    return {
      course, module: flat[idx].m, lesson: flat[idx].l, index: idx, total: flat.length,
      prev: idx > 0 ? flat[idx - 1].l : null, next: idx < flat.length - 1 ? flat[idx + 1].l : null,
    };
  }, [course, lessonId]);

  return { ctx, reload };
}

export default function Lesson() {
  const { slug, lessonId } = useParams();
  const nav = useNavigate();
  const { ctx } = useLessonCtx(slug, lessonId);
  const [completing, setCompleting] = useState(false);
  const [menu, setMenu] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (ctx) setSaved(ctx.course.saved); }, [ctx?.course.saved]);

  if (!ctx) return <Spinner />;
  const { course, module, lesson, prev, next } = ctx;

  const goNext = async () => {
    setCompleting(true);
    try {
      const { progress } = await api.post<{ progress: { done: number; total: number } }>(`/lessons/${lesson.id}/complete`);
      if (!next) {
        if (progress.done === progress.total) nav(`/course/${slug}/complete`);
        else nav(`/course/${slug}`);
        return;
      }
      nav(lessonPath(slug!, next));
    } finally { setCompleting(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.05]">
        <button onClick={() => nav(`/course/${slug}`)} className="text-navy"><ChevronLeft size={24} /></button>
        <div className="flex-1 min-w-0 text-center">
          <h1 className="font-bold text-navy text-[15px] truncate">{course.title}</h1>
          <p className="text-xs text-sub truncate">{module.title}</p>
        </div>
        <button onClick={async () => { const { saved: s } = await api.post<{ saved: boolean }>(`/courses/${course.id}/save`); setSaved(s); }}>
          <Bookmark size={20} className={saved ? 'text-brand fill-brand' : 'text-navy'} />
        </button>
        <button onClick={() => nav('/home')} aria-label="Home"><Home size={20} className="text-navy" /></button>
        <button onClick={() => setMenu(true)}><MoreVertical size={20} className="text-navy" /></button>
      </div>
      {menu && (
        <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={() => setMenu(false)}>
          <div className="bg-white w-full rounded-t-3xl p-4 fade-up" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => nav('/home')} className="w-full flex items-center gap-3 p-3 text-navy font-semibold"><Home size={20} /> Home</button>
            <button onClick={() => nav(`/course/${slug}`)} className="w-full flex items-center gap-3 p-3 text-navy font-semibold"><ListChecks size={20} /> Course overview</button>
            <button onClick={() => nav('/learning')} className="w-full flex items-center gap-3 p-3 text-navy font-semibold"><GraduationCap size={20} /> My Learning</button>
            <button onClick={() => nav('/support')} className="w-full flex items-center gap-3 p-3 text-navy font-semibold"><Flag size={20} /> Report an issue</button>
            <button onClick={() => setMenu(false)} className="w-full p-3 text-sub font-semibold mt-1">Cancel</button>
          </div>
        </div>
      )}

      {/* progress */}
      <div className="px-5 py-3 flex items-center gap-3 border-b border-black/[0.05]">
        <span className="text-sm font-semibold text-navy whitespace-nowrap">Lesson {ctx.index + 1} of {ctx.total}</span>
        <ProgressBar value={Math.round(((ctx.index) / ctx.total) * 100)} className="flex-1" />
        <span className="text-sm font-bold text-navy">{Math.round((ctx.index / ctx.total) * 100)}%</span>
      </div>

      <div className="flex-1">
        {lesson.kind === 'video' && <VideoLesson lesson={lesson} />}
        {lesson.kind === 'reading' && <ReadingLesson lesson={lesson} />}
        {lesson.kind === 'activity' && <ActivityLesson lesson={lesson} />}
        {lesson.kind !== 'video' && lesson.resources && lesson.resources.length > 0 && (
          <div className="px-5 pb-5">
            <h3 className="text-sm font-bold text-navy mb-2 flex items-center gap-1.5"><FileText size={16} className="text-brand" /> Materials</h3>
            <ResourcesPanel resources={lesson.resources} />
          </div>
        )}
      </div>

      {/* footer nav */}
      <div className="sticky bottom-0 bg-white border-t border-black/[0.06] px-4 py-3 flex gap-3">
        <button disabled={!prev} onClick={() => prev && nav(lessonPath(slug!, prev))}
          className="flex-1 border-2 border-black/10 text-navy font-bold rounded-2xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-40">
          <ArrowLeft size={18} /> Previous
        </button>
        <button onClick={goNext} disabled={completing} className="btn-primary flex-[1.3]">
          {next ? (next.kind === 'quiz' ? 'Start Quiz' : 'Next Lesson') : 'Finish Course'} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

/* ---------------- VIDEO ---------------- */
function toEmbed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}
function VideoLesson({ lesson }: { lesson: LessonNode }) {
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState<'Overview' | 'Notes' | 'Resources'>('Overview');
  const b = lesson.body;
  const url: string | undefined = b.videoUrl;
  const embed = url ? toEmbed(url) : null;
  const isFile = url && /\.(mp4|webm|ogg)(\?|$)/i.test(url);
  return (
    <div>
      {embed ? (
        <div className="relative bg-black aspect-video"><iframe src={embed} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={lesson.title} /></div>
      ) : isFile ? (
        <video src={url} controls className="w-full aspect-video bg-black" />
      ) : (
      <div className="relative bg-navy aspect-video flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-navy to-[#1b2f5e]" />
        <span className="absolute top-3 left-3 bg-black/40 text-white text-xs font-semibold px-2.5 py-1 rounded-full">1.0x</span>
        <span className="absolute top-3 right-3 bg-black/40 text-white p-1.5 rounded-full"><Maximize size={16} /></span>
        <button onClick={() => setPlaying(!playing)} className="relative z-10 w-16 h-16 rounded-full bg-white/95 flex items-center justify-center">
          {playing ? <Pause size={28} className="text-brand" fill="currentColor" /> : <Play size={28} className="text-brand ml-1" fill="currentColor" />}
        </button>
        <div className="absolute bottom-0 left-0 right-0 px-3 py-3 flex items-center gap-2 text-white">
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          <span className="text-xs font-semibold">04:12</span>
          <div className="flex-1 h-1 bg-white/30 rounded-full"><div className="h-full bg-brand rounded-full w-1/2" /></div>
          <span className="text-xs font-semibold">{lesson.duration}</span>
          <Captions size={18} /><Settings size={16} />
        </div>
      </div>
      )}

      <div className="flex border-b border-black/[0.06] px-5">
        {(['Overview', 'Notes', 'Resources'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-sm font-bold relative ${tab === t ? 'text-brand' : 'text-sub'}`}>
            {t}{tab === t && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-brand rounded-full" />}
          </button>
        ))}
      </div>

      <div className="px-5 py-5">
        {tab === 'Overview' && (
          <>
            <h2 className="text-[22px] font-extrabold text-navy">{lesson.title}</h2>
            <RichTextView html={b.intro || ''} className="text-sub mt-2 leading-relaxed" />
            {b.takeaways && (
              <div className="mt-4 rounded-2xl bg-brand-50 p-4">
                <div className="flex items-center gap-2 mb-2"><span className="w-9 h-9 rounded-full bg-white flex items-center justify-center"><Lightbulb size={18} className="text-brand" /></span><b className="text-navy">Key Takeaways</b></div>
                <ul className="space-y-1.5">
                  {b.takeaways.map((t: string, i: number) => <li key={i} className="text-sm text-navy flex gap-2"><span className="text-brand">•</span> {t}</li>)}
                </ul>
              </div>
            )}
            <div className="flex items-center gap-4 mt-5 text-xs text-sub border-t border-black/5 pt-4">
              <span className="flex items-center gap-1"><Clock size={14} /> {lesson.duration} min</span>
              <span className="flex items-center gap-1"><SignalHigh size={14} /> Beginner</span>
            </div>
          </>
        )}
        {tab === 'Notes' && <NotesPanel />}
        {tab === 'Resources' && <ResourcesPanel resources={lesson.resources} />}
      </div>
    </div>
  );
}

/* ---------------- READING ---------------- */
function ReadingLesson({ lesson }: { lesson: LessonNode }) {
  const b = lesson.body;
  return (
    <div className="px-5 py-6">
      <span className="chip bg-violet-100 text-violet-700 inline-flex items-center gap-1.5"><FileText size={14} /> Reading</span>
      <h2 className="text-[26px] font-extrabold text-navy mt-3 leading-tight">{b.heading || lesson.title}</h2>
      <RichTextView html={b.intro || ''} className="text-sub mt-2 leading-relaxed" />

      {b.points && (
        <div className="mt-5 space-y-4">
          {b.points.map((p: any, i: number) => {
            const Ico = POINT_ICON[p.icon] || Heart;
            return (
              <div key={i} className="flex gap-4">
                <span className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${POINT_BG[p.icon] || POINT_BG.heart}`}><Ico size={24} /></span>
                <div>
                  <h3 className="font-extrabold text-navy">{p.title}</h3>
                  <RichTextView html={p.text || ''} className="text-sub text-sm mt-0.5 leading-relaxed" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {b.remember && (
        <div className="mt-6 rounded-2xl bg-brand-50 p-4 flex gap-3">
          <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0"><Lightbulb size={20} className="text-brand" /></span>
          <div className="text-sm text-navy"><b className="text-brand">Remember:</b> <RichTextView html={b.remember || ''} className="inline" /></div>
        </div>
      )}

      {b.quote && (
        <>
          <h3 className="text-lg font-extrabold text-navy mt-7">Examples in Action</h3>
          <div className="mt-3 rounded-2xl bg-indigo-50 p-4 flex gap-3 items-start">
            <Quote size={22} className="text-indigo-400 shrink-0" />
            <RichTextView html={b.quote || ''} className="text-navy italic" />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- ACTIVITY (tap to match) ---------------- */
function ActivityLesson({ lesson }: { lesson: LessonNode }) {
  const activity = lesson.body.activity as { prompt: string; pairs: { left: string; leftHint: string; right: string }[] };
  const lefts = activity.pairs;
  const rights = useMemo(() => shuffle(activity.pairs.map((p) => p.right)), [lesson.id]);

  const [selected, setSelected] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({}); // left -> right
  const [checked, setChecked] = useState(false);

  const place = (left: string) => {
    if (!selected) return;
    setMatches((m) => {
      const next = { ...m };
      // remove this right from any other slot
      for (const k of Object.keys(next)) if (next[k] === selected) delete next[k];
      next[left] = selected;
      return next;
    });
    setSelected(null);
    setChecked(false);
  };

  const usedRights = new Set(Object.values(matches));
  const allMatched = Object.keys(matches).length === lefts.length;
  const correctCount = lefts.filter((p) => matches[p.left] === p.right).length;
  const allCorrect = checked && correctCount === lefts.length;

  return (
    <div className="px-5 py-6">
      <span className="chip bg-violet-100 text-violet-700 inline-flex items-center gap-1.5"><Puzzle size={14} /> Interactive Activity</span>
      <h2 className="text-[22px] font-extrabold text-navy mt-3 leading-tight">{activity.prompt}</h2>
      <p className="text-sub text-sm mt-2">Tap a strategy, then tap the donor type it fits best.</p>

      <div className="grid grid-cols-2 gap-3 mt-5">
        {/* left: donor types + drop zones */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-sub uppercase">Donor Types</p>
          {lefts.map((p) => {
            const placed = matches[p.left];
            const ok = checked ? placed === p.right : null;
            return (
              <button key={p.left} onClick={() => place(p.left)}
                className={`w-full text-left rounded-2xl border p-3 transition ${ok === true ? 'border-emerald-400 bg-emerald-50' : ok === false ? 'border-red-300 bg-red-50' : 'border-black/10 bg-white'}`}>
                <h4 className="font-bold text-navy text-sm">{p.left}</h4>
                <p className="text-[11px] text-sub leading-tight mt-0.5">{p.leftHint}</p>
                <div className={`mt-2 rounded-xl border border-dashed px-2 py-2 text-xs font-semibold text-center ${placed ? 'border-brand/40 bg-brand-50 text-navy' : 'border-black/20 text-sub'}`}>
                  {placed || 'Drop here'}
                </div>
              </button>
            );
          })}
        </div>

        {/* right: strategies */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-sub uppercase">Strategies</p>
          {rights.map((r) => {
            const used = usedRights.has(r);
            const sel = selected === r;
            return (
              <button key={r} onClick={() => setSelected(sel ? null : r)} disabled={used && !sel}
                className={`w-full text-left rounded-2xl border p-3 text-sm font-semibold transition ${sel ? 'border-brand bg-brand text-white' : used ? 'border-black/5 bg-black/[0.03] text-sub' : 'border-black/10 bg-white text-navy'}`}>
                {r}{used && !sel && <span className="text-[10px] block font-normal">placed ✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`mt-6 rounded-2xl p-4 flex items-center gap-3 ${allCorrect ? 'bg-emerald-50' : 'bg-violet-50'}`}>
        <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${allCorrect ? 'bg-emerald-500' : 'bg-violet-500'}`}>
          {allCorrect ? <CheckCircle2 size={20} className="text-white" /> : <Lightbulb size={20} className="text-white" />}
        </span>
        <div className="flex-1">
          <p className="font-bold text-navy text-sm">{allCorrect ? 'Perfect match! Well done.' : "You're doing great."}</p>
          <p className="text-xs text-sub">{allCorrect ? 'You can continue to the next lesson.' : 'Match all the items, then check your answers.'}</p>
        </div>
        <span className="chip bg-white text-navy border border-black/10">{checked ? correctCount : Object.keys(matches).length} / {lefts.length}</span>
      </div>

      {!allCorrect && (
        <button onClick={() => setChecked(true)} disabled={!allMatched} className="btn-primary w-full mt-4 disabled:opacity-50">
          Check Answers
        </button>
      )}
    </div>
  );
}

function NotesPanel() {
  const [note, setNote] = useState('');
  return (
    <div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write a note for this lesson…"
        className="w-full h-32 rounded-2xl border border-black/10 p-4 outline-none focus:border-brand/50 text-[15px]" />
      <p className="text-xs text-sub mt-2">Notes are saved on your device for this demo.</p>
    </div>
  );
}
function ResourcesPanel({ resources }: { resources?: { name: string; url: string }[] }) {
  const items = resources && resources.length ? resources : [];
  if (items.length === 0) return <p className="text-sub text-sm">No resources for this lesson.</p>;
  return (
    <div className="space-y-3">
      {items.map((r, i) => (
        <a key={i} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 card p-3.5">
          <FileText size={20} className="text-brand" /><span className="text-sm font-semibold text-navy flex-1">{r.name}</span><span className="text-xs text-brand font-bold">Open</span>
        </a>
      ))}
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
