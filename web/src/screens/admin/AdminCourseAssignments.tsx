import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X, Trash2, ClipboardList, CheckCircle2, Clock, Award, Paperclip, Link2, ChevronRight } from 'lucide-react';
import { api, Assignment, SubmissionRow, AssignmentFormat } from '../../api';
import { TopBar, Spinner, Avatar } from '../../components/ui';
import { RichText, RichTextView } from '../../components/RichText';

const API_BASE = 'https://teli-api.onrender.com';

export default function AdminCourseAssignments() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [items, setItems] = useState<Assignment[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [tracking, setTracking] = useState<Assignment | null>(null);

  const load = () => api.get<{ assignments: Assignment[] }>(`/admin/courses/${slug}/assignments`).then((d) => setItems(d.assignments));
  useEffect(() => { load(); }, [slug]);

  if (tracking) return <Tracker assignment={tracking} onBack={() => { setTracking(null); load(); }} />;

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Assignments" subtitle="Create, track & grade" onBack={() => nav('/admin/courses')} />
      <div className="px-5 py-4 flex-1">
        <button onClick={() => setCreating(true)} className="btn-primary w-full mb-4"><Plus size={18} /> New assignment</button>
        {!items ? <Spinner /> : items.length === 0 ? (
          <div className="card p-8 text-center text-sub"><ClipboardList size={32} className="mx-auto text-brand mb-2" />No assignments yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((a) => {
              const pending = (a.enrolled || 0) - (a.submitted || 0);
              return (
                <button key={a.id} onClick={() => setTracking(a)} className="w-full card p-4 text-left">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={18} className="text-brand shrink-0" />
                    <p className="font-bold text-navy flex-1 truncate">{a.title}</p>
                    <ChevronRight size={18} className="text-sub" />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="chip bg-brand-50 text-brand">{a.submitted || 0}/{a.enrolled || 0} submitted</span>
                    <span className="chip bg-emerald-100 text-emerald-700">{a.graded || 0} graded</span>
                    {pending > 0 && <span className="chip bg-amber-100 text-amber-700">{pending} to follow up</span>}
                    <span className="chip bg-black/[0.05] text-navy">{a.format}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {creating && <AssignmentEditor slug={slug!} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function AssignmentEditor({ slug, onClose, onSaved }: { slug: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [format, setFormat] = useState<AssignmentFormat>('text');
  const [maxPoints, setMaxPoints] = useState('100');
  const [dueAt, setDueAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true); setError('');
    try {
      await api.post(`/admin/courses/${slug}/assignments`, { title, instructions, format, maxPoints: Number(maxPoints), dueAt: dueAt || null });
      onSaved();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const FORMATS: { k: AssignmentFormat; label: string; hint: string }[] = [
    { k: 'text', label: 'Written', hint: 'Type a response' },
    { k: 'file', label: 'File upload', hint: 'Attach a document' },
    { k: 'link', label: 'Link', hint: 'Submit a URL' },
  ];

  return (
    <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-5 fade-up max-h-[92%] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-navy">New assignment</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center"><X size={18} /></button>
        </div>
        {error && <div className="text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-3">{error}</div>}
        <div className="space-y-4">
          <label className="block"><span className="text-sm font-bold text-navy">Title</span>
            <input className="field mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Draft a fundraising plan" /></label>
          <label className="block"><span className="text-sm font-bold text-navy">Instructions</span>
            <div className="mt-1.5"><RichText value={instructions} onChange={setInstructions} placeholder="What should learners do?" /></div></label>
          <div>
            <span className="text-sm font-bold text-navy">Submission format</span>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {FORMATS.map((f) => (
                <button key={f.k} onClick={() => setFormat(f.k)} className={`py-3 rounded-xl border-2 ${format === f.k ? 'border-brand bg-brand-50' : 'border-black/10'}`}>
                  <p className="text-sm font-bold text-navy">{f.label}</p><p className="text-[10px] text-sub">{f.hint}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-sm font-bold text-navy">Max points</span>
              <input className="field mt-1.5" type="number" value={maxPoints} onChange={(e) => setMaxPoints(e.target.value)} /></label>
            <label className="block"><span className="text-sm font-bold text-navy">Due date (optional)</span>
              <input className="field mt-1.5" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></label>
          </div>
        </div>
        <button onClick={save} disabled={busy || !title} className="btn-primary w-full mt-5 disabled:opacity-50">{busy ? 'Creating…' : 'Create & notify learners'}</button>
      </div>
    </div>
  );
}

function Tracker({ assignment, onBack }: { assignment: Assignment; onBack: () => void }) {
  const [rows, setRows] = useState<SubmissionRow[] | null>(null);
  const [grading, setGrading] = useState<SubmissionRow | null>(null);

  const load = () => api.get<{ submissions: SubmissionRow[] }>(`/admin/assignments/${assignment.id}/submissions`).then((d) => setRows(d.submissions));
  useEffect(() => { load(); }, [assignment.id]);

  const del = async () => { if (confirm('Delete this assignment?')) { await api.del(`/admin/assignments/${assignment.id}`); onBack(); } };

  const submitted = (rows || []).filter((r) => r.submission);
  const missing = (rows || []).filter((r) => !r.submission);

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title={assignment.title} subtitle="Submission tracker" onBack={onBack} right={<button onClick={del} className="text-red-500"><Trash2 size={18} /></button>} />
      {!rows ? <Spinner /> : (
        <div className="px-5 py-4 flex-1">
          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <Stat value={submitted.length} label="Submitted" />
            <Stat value={submitted.filter((r) => r.submission?.status === 'graded').length} label="Graded" />
            <Stat value={missing.length} label="Not yet" amber />
          </div>

          {submitted.length > 0 && <p className="text-xs font-bold text-sub uppercase mb-2">Submissions</p>}
          <div className="space-y-2">
            {submitted.map((r) => (
              <button key={r.userId} onClick={() => setGrading(r)} className="w-full card p-3 text-left flex items-center gap-3">
                <Avatar name={r.name} src={r.avatar} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy truncate">{r.name}</p>
                  <p className="text-xs text-sub">{r.submission?.status === 'graded' ? `Graded · ${r.submission.grade}/${assignment.maxPoints}` : 'Awaiting grade'}</p>
                </div>
                {r.submission?.status === 'graded'
                  ? <CheckCircle2 size={18} className="text-emerald-500" />
                  : <span className="chip bg-brand-50 text-brand">Grade</span>}
              </button>
            ))}
          </div>

          {missing.length > 0 && (
            <>
              <p className="text-xs font-bold text-sub uppercase mt-5 mb-2">Not submitted — follow up ({missing.length})</p>
              <div className="space-y-2">
                {missing.map((r) => (
                  <div key={r.userId} className="card p-3 flex items-center gap-3 opacity-90">
                    <Avatar name={r.name} src={r.avatar} size={36} />
                    <p className="font-semibold text-navy flex-1 truncate">{r.name}</p>
                    <span className="chip bg-amber-100 text-amber-700 inline-flex items-center gap-1"><Clock size={12} /> Pending</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {grading && <GradeSheet row={grading} assignment={assignment} onClose={() => setGrading(null)} onDone={() => { setGrading(null); load(); }} />}
    </div>
  );
}

function Stat({ value, label, amber }: { value: number; label: string; amber?: boolean }) {
  return <div className={`card p-3 ${amber ? 'bg-amber-50' : ''}`}><p className="text-2xl font-extrabold text-navy">{value}</p><p className="text-[11px] text-sub">{label}</p></div>;
}

function GradeSheet({ row, assignment, onClose, onDone }: { row: SubmissionRow; assignment: Assignment; onClose: () => void; onDone: () => void }) {
  const s = row.submission!;
  const [grade, setGrade] = useState(s.grade != null ? String(s.grade) : '');
  const [feedback, setFeedback] = useState(s.feedback || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try { await api.post(`/admin/submissions/${s.id}/grade`, { grade: Number(grade), feedback }); onDone(); }
    finally { setBusy(false); }
  };

  return (
    <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-5 fade-up max-h-[92%] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Avatar name={row.name} src={row.avatar} size={36} /><h2 className="text-lg font-extrabold text-navy">{row.name}</h2></div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center"><X size={18} /></button>
        </div>

        <p className="text-xs font-bold text-sub uppercase mb-1">Submission</p>
        <div className="card p-3 bg-black/[0.02] mb-4">
          {s.body && <RichTextView html={s.body} className="text-navy text-sm whitespace-pre-wrap" />}
          {s.linkUrl && <a href={s.linkUrl} target="_blank" rel="noreferrer" className="text-brand font-semibold text-sm flex items-center gap-1 mt-1"><Link2 size={14} /> Open link</a>}
          {s.fileUrl && <a href={s.fileUrl.startsWith('http') ? s.fileUrl : API_BASE + s.fileUrl} target="_blank" rel="noreferrer" className="text-brand font-semibold text-sm flex items-center gap-1 mt-1"><Paperclip size={14} /> Download file</a>}
          {!s.body && !s.linkUrl && !s.fileUrl && <p className="text-sub text-sm">Empty submission.</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <label className="block"><span className="text-sm font-bold text-navy flex items-center gap-1"><Award size={14} /> Grade (/{assignment.maxPoints})</span>
            <input className="field mt-1.5" type="number" value={grade} onChange={(e) => setGrade(e.target.value)} max={assignment.maxPoints} /></label>
        </div>
        <label className="block mt-3"><span className="text-sm font-bold text-navy">Feedback</span>
          <textarea className="field h-28 mt-1.5" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What did they do well? What to improve?" /></label>
        <button onClick={save} disabled={busy || grade === ''} className="btn-primary w-full mt-4 disabled:opacity-50">{busy ? 'Saving…' : 'Save grade & notify learner'}</button>
      </div>
    </div>
  );
}
