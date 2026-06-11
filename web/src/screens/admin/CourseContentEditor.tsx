import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus, Trash2, Pencil, X, ChevronDown, GripVertical, Video, FileText, Puzzle, HelpCircle,
  Upload, Link2, Save,
} from 'lucide-react';
import { api, CourseDetail as CD, LessonNode, LessonKind, uploadFile } from '../../api';
import { TopBar, Spinner } from '../../components/ui';

const KIND_ICON: Record<string, any> = { video: Video, reading: FileText, activity: Puzzle, quiz: HelpCircle };

export default function CourseContentEditor() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [course, setCourse] = useState<CD | null>(null);
  const [open, setOpen] = useState<number | null>(0);
  const [editLesson, setEditLesson] = useState<{ moduleId: number; lesson: LessonNode | null } | null>(null);

  const reload = (c: CD) => setCourse(c);
  const load = () => api.get<{ course: CD }>(`/courses/${slug}`).then((d) => setCourse(d.course));
  useEffect(() => { load(); }, [slug]);
  if (!course) return <Spinner />;

  const addModule = async () => { const res = await api.post<{ course: CD }>(`/admin/courses/${course!.id}/modules`, { title: 'New Module' }); reload(res.course); };
  const renameModule = async (id: number, title: string) => { const { course } = await api.put<{ course: CD }>(`/admin/modules/${id}`, { title }); reload(course); };
  const deleteModule = async (id: number) => { if (confirm('Delete this module and its lessons?')) { const { course } = await api.del<{ course: CD }>(`/admin/modules/${id}`); reload(course); } };
  const deleteLesson = async (id: number) => { if (confirm('Delete this lesson?')) { const { course } = await api.del<{ course: CD }>(`/admin/lessons/${id}`); reload(course); } };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Edit Content" subtitle={course.title} onBack={() => nav('/admin/courses')} />
      <div className="px-5 py-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-sub">{course.moduleCount} modules · {course.lessonCount} lessons</p>
          <button onClick={addModule} className="btn-primary px-3 py-2 text-sm"><Plus size={16} /> Module</button>
        </div>

        <div className="space-y-3">
          {course.modules.map((m, i) => {
            const expanded = open === i;
            return (
              <div key={m.id} className="card overflow-hidden">
                <div className={`flex items-center gap-2 p-3 ${expanded ? 'bg-brand-50' : ''}`}>
                  <GripVertical size={18} className="text-sub" />
                  <button onClick={() => setOpen(expanded ? null : i)} className="flex-1 text-left font-bold text-navy">{i + 1}. {m.title}</button>
                  <button onClick={() => { const t = prompt('Module title', m.title); if (t) renameModule(m.id, t); }} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-navy"><Pencil size={14} /></button>
                  <button onClick={() => deleteModule(m.id)} className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500"><Trash2 size={14} /></button>
                  <button onClick={() => setOpen(expanded ? null : i)}><ChevronDown size={18} className={`text-sub transition ${expanded ? 'rotate-180' : ''}`} /></button>
                </div>
                {expanded && (
                  <div className="divide-y divide-black/[0.05]">
                    {m.lessons.map((l) => {
                      const Ico = KIND_ICON[l.kind] || FileText;
                      return (
                        <div key={l.id} className="flex items-center gap-3 px-3 py-2.5">
                          <Ico size={17} className="text-brand shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-navy truncate">{l.title}</p>
                            <p className="text-[11px] text-sub capitalize">{l.kind} · {l.duration}</p>
                          </div>
                          <button onClick={() => setEditLesson({ moduleId: m.id, lesson: l })} className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center text-navy"><Pencil size={14} /></button>
                          <button onClick={() => deleteLesson(l.id)} className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500"><Trash2 size={14} /></button>
                        </div>
                      );
                    })}
                    <button onClick={() => setEditLesson({ moduleId: m.id, lesson: null })} className="w-full flex items-center justify-center gap-2 py-3 text-brand font-bold text-sm"><Plus size={16} /> Add Lesson</button>
                  </div>
                )}
              </div>
            );
          })}
          {course.modules.length === 0 && <p className="text-center text-sub py-10">No modules yet. Add one to get started.</p>}
        </div>
      </div>

      {editLesson && (
        <LessonEditor moduleId={editLesson.moduleId} lesson={editLesson.lesson}
          onClose={() => setEditLesson(null)} onSaved={(c) => { reload(c); setEditLesson(null); }} />
      )}
    </div>
  );
}

const KINDS = [
  { k: 'video', label: 'Video', icon: Video },
  { k: 'reading', label: 'Reading', icon: FileText },
  { k: 'quiz', label: 'Quiz', icon: HelpCircle },
  { k: 'activity', label: 'Activity', icon: Puzzle },
];

function LessonEditor({ moduleId, lesson, onClose, onSaved }: { moduleId: number; lesson: LessonNode | null; onClose: () => void; onSaved: (c: CD) => void }) {
  const [title, setTitle] = useState(lesson?.title || '');
  const [kind, setKind] = useState<LessonKind>(lesson?.kind || 'reading');
  const [duration, setDuration] = useState(lesson?.duration || '05:00');
  const [body, setBody] = useState<any>(lesson?.body || {});
  const [resources, setResources] = useState<{ name: string; url: string }[]>(lesson?.resources || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: any) => setBody((b: any) => ({ ...b, [k]: v }));

  const save = async () => {
    setBusy(true); setError('');
    try {
      const payload = { title, kind, duration, body, resources };
      const res = lesson
        ? await api.put<{ course: CD }>(`/admin/lessons/${lesson.id}`, payload)
        : await api.post<{ course: CD }>(`/admin/modules/${moduleId}/lessons`, payload);
      onSaved(res.course);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const onUpload = async (file: File, cb: (url: string) => void) => {
    try { const url = await uploadFile(file); cb(url); } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-5 fade-up max-h-[92%] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-navy">{lesson ? 'Edit Lesson' : 'New Lesson'}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center"><X size={18} /></button>
        </div>
        {error && <div className="text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-3">{error}</div>}

        <div className="space-y-4">
          <Field label="Lesson title"><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Type">
            <div className="grid grid-cols-4 gap-2">
              {KINDS.map(({ k, label, icon: Ico }) => (
                <button key={k} onClick={() => setKind(k as LessonKind)} className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 ${kind === k ? 'border-brand bg-brand-50' : 'border-black/10'}`}>
                  <Ico size={18} className={kind === k ? 'text-brand' : 'text-sub'} />
                  <span className="text-[11px] font-semibold text-navy">{label}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Duration (mm:ss)"><input className="field" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="05:00" /></Field>

          {kind === 'video' && (
            <>
              <Field label="Video URL (YouTube, Vimeo, MP4…)">
                <input className="field" value={body.videoUrl || ''} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://…" />
              </Field>
              <Field label="Introduction"><textarea className="field h-20" value={body.intro || ''} onChange={(e) => set('intro', e.target.value)} /></Field>
              <ListEditor label="Key takeaways" items={body.takeaways || []} onChange={(v) => set('takeaways', v)} />
            </>
          )}

          {kind === 'reading' && (
            <>
              <Field label="Heading"><input className="field" value={body.heading || ''} onChange={(e) => set('heading', e.target.value)} /></Field>
              <Field label="Introduction"><textarea className="field h-20" value={body.intro || ''} onChange={(e) => set('intro', e.target.value)} /></Field>
              <PointsEditor points={body.points || []} onChange={(v) => set('points', v)} />
              <Field label="Remember (callout)"><textarea className="field h-16" value={body.remember || ''} onChange={(e) => set('remember', e.target.value)} /></Field>
              <Field label="Quote / example"><input className="field" value={body.quote || ''} onChange={(e) => set('quote', e.target.value)} /></Field>
            </>
          )}

          {kind === 'quiz' && <QuizEditor quiz={body.quiz || { passScore: 60, questions: [] }} onChange={(q) => set('quiz', q)} />}

          {kind === 'activity' && <ActivityEditor activity={body.activity || { prompt: '', pairs: [] }} onChange={(a) => set('activity', a)} />}

          {/* resources + upload (all kinds) */}
          <div>
            <p className="text-sm font-bold text-navy mb-2">Resources & uploads</p>
            {resources.map((r, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <Link2 size={15} className="text-sub" />
                <input className="field flex-1 py-2 text-sm" value={r.name} onChange={(e) => setResources(resources.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Name" />
                <button onClick={() => setResources(resources.filter((_, j) => j !== i))} className="text-red-500"><Trash2 size={15} /></button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <button onClick={() => setResources([...resources, { name: 'New resource', url: '#' }])} className="text-brand font-bold text-sm flex items-center gap-1"><Plus size={15} /> Add link</button>
              <label className="text-navy font-bold text-sm flex items-center gap-1 cursor-pointer">
                <Upload size={15} /> Upload file
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f, (url) => setResources([...resources, { name: f.name, url }])); }} />
              </label>
            </div>
          </div>
        </div>

        <button onClick={save} disabled={busy || !title} className="btn-primary w-full mt-5"><Save size={18} /> {busy ? 'Saving…' : 'Save Lesson'}</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-bold text-navy">{label}</span><div className="mt-1.5">{children}</div></label>;
}

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <p className="text-sm font-bold text-navy mb-2">{label}</p>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 mb-2">
          <input className="field flex-1 py-2 text-sm" value={it} onChange={(e) => onChange(items.map((x, j) => j === i ? e.target.value : x))} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-red-500"><Trash2 size={15} /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ''])} className="text-brand font-bold text-sm flex items-center gap-1"><Plus size={15} /> Add</button>
    </div>
  );
}

function PointsEditor({ points, onChange }: { points: any[]; onChange: (v: any[]) => void }) {
  const upd = (i: number, k: string, v: string) => onChange(points.map((p, j) => j === i ? { ...p, [k]: v } : p));
  return (
    <div>
      <p className="text-sm font-bold text-navy mb-2">Key points</p>
      {points.map((p, i) => (
        <div key={i} className="card p-3 mb-2 bg-black/[0.02]">
          <div className="flex gap-2">
            <select className="field py-2 text-sm w-24" value={p.icon || 'heart'} onChange={(e) => upd(i, 'icon', e.target.value)}>
              {['heart', 'shield', 'users'].map((x) => <option key={x}>{x}</option>)}
            </select>
            <input className="field py-2 text-sm flex-1" value={p.title || ''} onChange={(e) => upd(i, 'title', e.target.value)} placeholder="Title" />
            <button onClick={() => onChange(points.filter((_, j) => j !== i))} className="text-red-500"><Trash2 size={15} /></button>
          </div>
          <textarea className="field py-2 text-sm h-14 mt-2" value={p.text || ''} onChange={(e) => upd(i, 'text', e.target.value)} placeholder="Description" />
        </div>
      ))}
      <button onClick={() => onChange([...points, { icon: 'heart', title: '', text: '' }])} className="text-brand font-bold text-sm flex items-center gap-1"><Plus size={15} /> Add point</button>
    </div>
  );
}

function QuizEditor({ quiz, onChange }: { quiz: any; onChange: (q: any) => void }) {
  const questions = quiz.questions || [];
  const updQ = (i: number, patch: any) => onChange({ ...quiz, questions: questions.map((q: any, j: number) => j === i ? { ...q, ...patch } : q) });
  return (
    <div>
      <Field label="Pass score (%)"><input className="field" type="number" value={quiz.passScore ?? 60} onChange={(e) => onChange({ ...quiz, passScore: Number(e.target.value) })} /></Field>
      <p className="text-sm font-bold text-navy mt-3 mb-2">Questions</p>
      {questions.map((q: any, i: number) => (
        <div key={i} className="card p-3 mb-3 bg-black/[0.02]">
          <div className="flex gap-2">
            <input className="field py-2 text-sm flex-1" value={q.q || ''} onChange={(e) => updQ(i, { q: e.target.value })} placeholder={`Question ${i + 1}`} />
            <button onClick={() => onChange({ ...quiz, questions: questions.filter((_: any, j: number) => j !== i) })} className="text-red-500"><Trash2 size={15} /></button>
          </div>
          {(q.options || ['', '', '', '']).map((opt: string, oi: number) => (
            <label key={oi} className="flex items-center gap-2 mt-2">
              <input type="radio" name={`ans-${i}`} checked={q.answer === oi} onChange={() => updQ(i, { answer: oi })} className="accent-brand w-4 h-4" />
              <input className="field py-1.5 text-sm flex-1" value={opt} onChange={(e) => updQ(i, { options: (q.options || ['', '', '', '']).map((x: string, j: number) => j === oi ? e.target.value : x) })} placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
            </label>
          ))}
          <textarea className="field py-2 text-sm h-12 mt-2" value={q.explanation || ''} onChange={(e) => updQ(i, { explanation: e.target.value })} placeholder="Explanation" />
        </div>
      ))}
      <button onClick={() => onChange({ ...quiz, questions: [...questions, { q: '', options: ['', '', '', ''], answer: 0, explanation: '' }] })} className="text-brand font-bold text-sm flex items-center gap-1"><Plus size={15} /> Add question</button>
    </div>
  );
}

function ActivityEditor({ activity, onChange }: { activity: any; onChange: (a: any) => void }) {
  const pairs = activity.pairs || [];
  const upd = (i: number, k: string, v: string) => onChange({ ...activity, pairs: pairs.map((p: any, j: number) => j === i ? { ...p, [k]: v } : p) });
  return (
    <div>
      <Field label="Prompt"><input className="field" value={activity.prompt || ''} onChange={(e) => onChange({ ...activity, prompt: e.target.value })} /></Field>
      <p className="text-sm font-bold text-navy mt-3 mb-2">Match pairs</p>
      {pairs.map((p: any, i: number) => (
        <div key={i} className="card p-3 mb-2 bg-black/[0.02]">
          <div className="flex gap-2">
            <input className="field py-2 text-sm flex-1" value={p.left || ''} onChange={(e) => upd(i, 'left', e.target.value)} placeholder="Left (term)" />
            <button onClick={() => onChange({ ...activity, pairs: pairs.filter((_: any, j: number) => j !== i) })} className="text-red-500"><Trash2 size={15} /></button>
          </div>
          <input className="field py-2 text-sm mt-2 w-full" value={p.right || ''} onChange={(e) => upd(i, 'right', e.target.value)} placeholder="Right (match)" />
          <input className="field py-1.5 text-sm mt-2 w-full" value={p.leftHint || ''} onChange={(e) => upd(i, 'leftHint', e.target.value)} placeholder="Hint (optional)" />
        </div>
      ))}
      <button onClick={() => onChange({ ...activity, pairs: [...pairs, { left: '', right: '', leftHint: '' }] })} className="text-brand font-bold text-sm flex items-center gap-1"><Plus size={15} /> Add pair</button>
    </div>
  );
}
