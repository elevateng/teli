import { useEffect, useState } from 'react';
import { Plus, X, Send, LifeBuoy, ChevronRight, Mail } from 'lucide-react';
import { api, Ticket, CourseCard } from '../api';
import { TopBar, Spinner } from '../components/ui';
import { useNavigate } from 'react-router-dom';

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-brand-50 text-brand', pending: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700', closed: 'bg-black/[0.06] text-sub',
};

export default function Support() {
  const nav = useNavigate();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<Ticket | null>(null);

  const load = () => api.get<{ tickets: Ticket[] }>('/tickets').then((d) => setTickets(d.tickets));
  useEffect(() => { load(); }, []);

  if (active) return <TicketThread ticket={active} onBack={() => { setActive(null); load(); }} />;

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Help & Support" subtitle="We're here to help" onBack={() => nav('/profile')} />
      <div className="px-5 py-5 flex-1">
        <button onClick={() => setCreating(true)} className="btn-primary w-full"><Plus size={18} /> New Support Ticket</button>

        <a href="mailto:teli@elevateng.org" className="mt-3 w-full flex items-center gap-3 rounded-2xl bg-black/[0.03] px-4 py-3">
          <Mail size={18} className="text-brand shrink-0" />
          <div className="flex-1"><p className="text-sm font-bold text-navy leading-tight">Prefer email?</p><p className="text-xs text-sub">teli@elevateng.org</p></div>
        </a>

        <h2 className="font-extrabold text-navy text-lg mt-6 mb-3">Your Tickets</h2>
        {!tickets ? <Spinner /> : tickets.length === 0 ? (
          <div className="card p-8 text-center text-sub">
            <LifeBuoy size={36} className="mx-auto text-brand mb-2" />
            No tickets yet. Tap “New Support Ticket” if you need help.
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <button key={t.id} onClick={() => setActive(t)} className="w-full card p-4 text-left flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`chip ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                    <span className="text-[11px] font-mono text-sub">{t.reference}</span>
                  </div>
                  <p className="font-bold text-navy mt-1.5 leading-tight truncate">{t.subject}</p>
                  <p className="text-xs text-sub truncate">{t.courseTitle ? `${t.courseTitle} · ` : ''}{t.messages[t.messages.length - 1]?.body}</p>
                </div>
                <ChevronRight size={20} className="text-sub" />
              </button>
            ))}
          </div>
        )}
      </div>
      {creating && <NewTicket onClose={() => setCreating(false)} onCreated={(t) => { setCreating(false); load(); setActive(t); }} />}
    </div>
  );
}

function NewTicket({ onClose, onCreated }: { onClose: () => void; onCreated: (t: Ticket) => void }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('normal');
  const [message, setMessage] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.get<{ inProgress: any[]; completed: any[] }>('/me/learning').then((d) => setCourses([...d.inProgress, ...d.completed] as any)); }, []);

  const submit = async () => {
    setBusy(true); setError('');
    try { const { ticket } = await api.post<{ ticket: Ticket }>('/tickets', { subject, category, priority, message, courseId: courseId || undefined }); onCreated(ticket); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-5 fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-navy">New Ticket</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center"><X size={18} /></button>
        </div>
        {error && <div className="text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-3">{error}</div>}
        <div className="space-y-4">
          <input className="field" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
              {['General', 'Payment', 'Course Access', 'Technical', 'Certificate', 'Other'].map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="field" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {['low', 'normal', 'high'].map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)} priority</option>)}
            </select>
          </div>
          {courses.length > 0 && (
            <select className="field" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Not about a specific course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          )}
          <textarea className="field h-28" placeholder="Describe your issue…" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <button onClick={submit} disabled={busy || !subject || !message} className="btn-primary w-full mt-5 disabled:opacity-50">
          {busy ? 'Sending…' : 'Submit Ticket'}
        </button>
      </div>
    </div>
  );
}

export function TicketThread({ ticket, onBack, admin = false }: { ticket: Ticket; onBack: () => void; admin?: boolean }) {
  const [t, setT] = useState<Ticket>(ticket);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const reply = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try { const { ticket } = await api.post<{ ticket: Ticket }>(`/tickets/${t.id}/reply`, { body }); setT(ticket); setBody(''); }
    finally { setBusy(false); }
  };
  const setStatus = async (status: string) => {
    await api.post(`/admin/tickets/${t.id}/status`, { status });
    setT({ ...t, status: status as any });
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title={t.subject} subtitle={`${t.reference} · ${t.status}${t.courseTitle ? ' · ' + t.courseTitle : ''}`} onBack={onBack} />
      {admin && (
        <div className="flex gap-2 px-5 py-3 border-b border-black/[0.05] overflow-x-auto no-scrollbar">
          {['open', 'pending', 'resolved', 'closed'].map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`chip whitespace-nowrap border ${t.status === s ? 'bg-navy text-white border-navy' : 'border-black/15 text-navy'}`}>{s}</button>
          ))}
        </div>
      )}
      <div className="flex-1 px-5 py-4 space-y-3 overflow-y-auto">
        {t.messages.map((m, i) => {
          const mine = m.role === 'learner' ? !admin : admin;
          const staff = m.role !== 'learner';
          return (
            <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${mine ? 'bg-brand text-white' : 'bg-black/[0.05] text-navy'}`}>
                <p className="text-[10px] font-bold opacity-80 mb-0.5">{m.author}{staff && ' · Support'}</p>
                <p className="text-sm whitespace-pre-wrap">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>
      {t.status !== 'closed' && (
        <div className="sticky bottom-0 bg-white border-t border-black/[0.06] px-4 py-3 flex items-center gap-2">
          <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && reply()}
            placeholder="Type a reply…" className="field flex-1 py-3" />
          <button onClick={reply} disabled={busy || !body.trim()} className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center disabled:opacity-50"><Send size={18} /></button>
        </div>
      )}
    </div>
  );
}
