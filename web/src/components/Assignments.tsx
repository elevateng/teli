import { useEffect, useState } from 'react';
import { ClipboardList, X, Upload, CheckCircle2, Clock, Award, Paperclip, Link2 } from 'lucide-react';
import { api, Assignment, uploadFile } from '../api';
import { RichTextView } from './RichText';
import { Spinner } from './ui';

export function LearnerAssignments({ slug }: { slug: string }) {
  const [items, setItems] = useState<Assignment[] | null>(null);
  const [active, setActive] = useState<Assignment | null>(null);

  const load = () => api.get<{ assignments: Assignment[] }>(`/courses/${slug}/assignments`).then((d) => setItems(d.assignments));
  useEffect(() => { load(); }, [slug]);

  if (!items) return <Spinner />;
  if (items.length === 0) return <p className="text-sub text-sm py-4 text-center">No assignments for this course yet.</p>;

  return (
    <div className="space-y-3">
      {items.map((a) => {
        const s = a.mySubmission;
        return (
          <div key={a.id} className="card p-4">
            <div className="flex items-start gap-2">
              <ClipboardList size={18} className="text-brand mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-navy leading-tight">{a.title}</p>
                <p className="text-xs text-sub mt-0.5">{a.maxPoints} pts · {a.format} submission{a.dueAt ? ` · due ${new Date(a.dueAt).toLocaleDateString()}` : ''}</p>
              </div>
              {s?.status === 'graded' ? (
                <span className="chip bg-emerald-100 text-emerald-700 inline-flex items-center gap-1"><Award size={12} /> {s.grade}/{a.maxPoints}</span>
              ) : s ? (
                <span className="chip bg-brand-50 text-brand inline-flex items-center gap-1"><CheckCircle2 size={12} /> Submitted</span>
              ) : (
                <span className="chip bg-amber-100 text-amber-700 inline-flex items-center gap-1"><Clock size={12} /> To do</span>
              )}
            </div>
            {a.instructions && <RichTextView html={a.instructions} className="text-sub text-sm mt-2" />}

            {s?.status === 'graded' && s.feedback && (
              <div className="mt-3 rounded-xl bg-emerald-50 p-3">
                <p className="text-xs font-bold text-emerald-700 mb-0.5">Instructor feedback</p>
                <p className="text-sm text-navy whitespace-pre-wrap">{s.feedback}</p>
              </div>
            )}

            <button onClick={() => setActive(a)} className={`mt-3 w-full py-2.5 rounded-xl font-bold text-sm ${s ? 'border-2 border-black/10 text-navy' : 'bg-brand text-white'}`}>
              {s ? 'View / update submission' : 'Submit assignment'}
            </button>
          </div>
        );
      })}
      {active && <SubmitSheet assignment={active} onClose={() => setActive(null)} onDone={() => { setActive(null); load(); }} />}
    </div>
  );
}

function SubmitSheet({ assignment, onClose, onDone }: { assignment: Assignment; onClose: () => void; onDone: () => void }) {
  const s = assignment.mySubmission;
  const [body, setBody] = useState(s?.body || '');
  const [linkUrl, setLinkUrl] = useState(s?.linkUrl || '');
  const [fileUrl, setFileUrl] = useState(s?.fileUrl || '');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true); setError('');
    try {
      await api.post(`/assignments/${assignment.id}/submit`, { body, linkUrl, fileUrl });
      onDone();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const graded = s?.status === 'graded';

  return (
    <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-5 fade-up max-h-[92%] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-navy">{assignment.title}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center"><X size={18} /></button>
        </div>
        {error && <div className="text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-3">{error}</div>}
        {graded && <div className="text-sm bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 mb-3">Graded: {s!.grade}/{assignment.maxPoints}. You can still update and resubmit.</div>}

        {assignment.format === 'text' && (
          <textarea className="field h-40" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your response…" />
        )}
        {assignment.format === 'link' && (
          <label className="block"><span className="text-sm font-bold text-navy flex items-center gap-1"><Link2 size={14} /> Link to your work</span>
            <input className="field mt-1.5" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://… (Google Doc, Drive, etc.)" />
          </label>
        )}
        {assignment.format === 'file' && (
          <div>
            <label className="text-navy font-bold text-sm flex items-center gap-2 cursor-pointer border-2 border-dashed border-black/15 rounded-2xl py-6 justify-center">
              <Upload size={18} /> {fileUrl ? 'Replace file' : 'Upload your file'}
              <input type="file" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setFileName(f.name); setFileUrl(await uploadFile(f)); } }} />
            </label>
            {(fileUrl || s?.fileUrl) && <p className="text-xs text-sub mt-2 flex items-center gap-1"><Paperclip size={13} /> {fileName || 'File attached'}</p>}
            <textarea className="field h-20 mt-3" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Optional note…" />
          </div>
        )}

        <button onClick={submit} disabled={busy} className="btn-primary w-full mt-4 disabled:opacity-60">{busy ? 'Submitting…' : s ? 'Update submission' : 'Submit'}</button>
      </div>
    </div>
  );
}
