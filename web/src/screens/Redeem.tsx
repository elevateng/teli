import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Ticket, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { TopBar } from '../components/ui';

export default function Redeem() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [code, setCode] = useState((params.get('code') || '').toUpperCase());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Auto-submit if a code arrived in the URL (from an invite email link).
  useEffect(() => { if (params.get('code')) submit(); /* eslint-disable-next-line */ }, []);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setError('');
    try {
      const r = await api.post<{ slug: string }>('/access-codes/redeem', { code: code.trim() });
      nav(`/course/${r.slug}/enrolled`, { replace: true });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Join with an access code" onBack={() => nav('/explore')} />
      <form onSubmit={submit} className="px-5 py-6 flex-1">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4"><Ticket size={30} className="text-brand" /></div>
        <h1 className="text-[26px] font-extrabold text-navy leading-tight">Have an access code?</h1>
        <p className="text-sub mt-2">Enter the code from your invitation to unlock a private course.</p>

        {error && <div className="mt-4 text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3 flex items-center gap-2"><span>{error}</span></div>}

        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. TELI-AB12CD"
          className="field mt-5 text-center text-lg tracking-widest font-bold" />

        <button disabled={busy || !code.trim()} className="btn-primary w-full mt-5 text-[17px]">
          {busy ? 'Checking…' : <>Unlock course <ArrowRight size={19} /></>}
        </button>

        <div className="mt-6 rounded-2xl bg-emerald-50 p-4 flex gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm text-navy">Access codes are issued by your organisation for private trainings. Once redeemed, the course appears in <b>My Learning</b>.</p>
        </div>
      </form>
    </div>
  );
}
