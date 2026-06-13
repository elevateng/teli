import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle2, XCircle, Send } from 'lucide-react';
import { api } from '../../api';
import { TopBar, Spinner } from '../../components/ui';

interface MailRec { to: string; subject: string; at: string; delivered?: boolean; error?: string; note?: string }
interface LogResp { enabled: boolean; from: string; host: string | null; port: number; user: string | null; messages: MailRec[] }

export default function AdminEmail() {
  const nav = useNavigate();
  const [data, setData] = useState<LogResp | null>(null);
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MailRec | null>(null);

  const load = () => api.get<LogResp>('/admin/email-log').then((d) => { setData(d); if (!to) setTo(''); });
  useEffect(() => { load(); }, []);

  const test = async () => {
    setBusy(true); setResult(null);
    try {
      const r = await api.post<{ result: MailRec }>('/admin/email-test', { to: to.trim() || undefined });
      setResult(r.result); load();
    } finally { setBusy(false); }
  };

  if (!data) return <div className="flex flex-col min-h-full"><TopBar title="Email diagnostics" onBack={() => nav('/admin')} /><Spinner /></div>;

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Email diagnostics" subtitle="Check delivery & errors" onBack={() => nav('/admin')} />
      <div className="px-5 py-5 space-y-5 max-w-[760px] mx-auto w-full">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Mail size={18} className="text-brand" />
            <span className="font-extrabold text-navy">SMTP configuration</span>
            {data.enabled ? <span className="chip bg-emerald-100 text-emerald-700 ml-auto">Enabled</span> : <span className="chip bg-red-100 text-red-600 ml-auto">Off</span>}
          </div>
          <Field k="From" v={data.from} />
          <Field k="Host" v={data.host || '—'} />
          <Field k="Port" v={String(data.port)} />
          <Field k="User" v={data.user || '—'} />
        </div>

        <div className="card p-4">
          <p className="font-extrabold text-navy mb-2">Send a test email</p>
          <div className="flex gap-2">
            <input className="field flex-1" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Recipient (defaults to your email)" />
            <button onClick={test} disabled={busy} className="btn-primary px-4 disabled:opacity-50"><Send size={16} /> {busy ? 'Sending…' : 'Send'}</button>
          </div>
          {result && (
            <div className={`mt-3 rounded-xl p-3 text-sm ${result.delivered ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {result.delivered
                ? <span className="flex items-center gap-1.5"><CheckCircle2 size={16} /> Sent to {result.to} — check the inbox (and spam).</span>
                : <><span className="flex items-center gap-1.5 font-bold"><XCircle size={16} /> Not delivered</span><p className="mt-1 font-mono text-xs break-words">{result.error || result.note || 'Unknown error'}</p></>}
            </div>
          )}
        </div>

        <div className="card p-4">
          <p className="font-extrabold text-navy mb-2">Recent send attempts</p>
          {data.messages.length === 0 ? <p className="text-sm text-sub">No emails sent yet.</p> : (
            <div className="space-y-2">
              {data.messages.map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-sm border-b border-black/[0.05] pb-2 last:border-0">
                  {m.delivered ? <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" /> : <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-navy truncate">{m.subject}</p>
                    <p className="text-xs text-sub truncate">{m.to}</p>
                    {!m.delivered && (m.error || m.note) && <p className="text-[11px] text-red-500 font-mono break-words mt-0.5">{m.error || m.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 py-1 text-sm"><span className="text-sub">{k}</span><span className="text-navy font-semibold truncate text-right">{v}</span></div>;
}
