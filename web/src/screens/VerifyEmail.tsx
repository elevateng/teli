import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { api, User } from '../api';
import { StatusBar, Wordmark } from '../components/ui';
import { useAuth, homeForRole } from '../auth';

export default function VerifyEmail() {
  const nav = useNavigate();
  const { user, loading, setUser, refresh, logout } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (loading) return;
    if (!user) { nav('/login', { replace: true }); return; }
    if (user.emailVerified) nav(homeForRole(user), { replace: true });
  }, [user, loading]);

  useEffect(() => {
    if (cooldown <= 0) return;
    tick.current = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(tick.current);
  }, [cooldown]);

  const verify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(''); setBusy(true);
    try {
      const { user: u } = await api.post<{ user: User }>('/auth/verify-email', { code: code.trim() });
      setUser(u);
      nav(homeForRole(u), { replace: true });
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  const resend = async () => {
    setError(''); setResent('');
    try {
      const r = await api.post<{ ok: boolean; verified?: boolean }>('/auth/resend-verification');
      if (r.verified) { await refresh(); return; } // email couldn't be sent → auto-verified
      setResent('A new code is on its way.'); setCooldown(45);
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <StatusBar />
      <div className="px-6 pt-4"><Wordmark withTagline /></div>
      <form onSubmit={verify} className="flex-1 px-6 pt-10">
        <span className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center"><MailCheck size={28} className="text-brand" /></span>
        <h1 className="text-[30px] font-extrabold text-navy leading-tight mt-4">Verify your email</h1>
        <p className="text-sub mt-2">We sent a 6-digit code to <b className="text-navy">{user?.email}</b>. Enter it below to activate your account.</p>

        {error && <div className="mt-4 text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3">{error}</div>}
        {resent && <div className="mt-4 text-sm bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3">{resent}</div>}

        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric" autoFocus placeholder="------"
          className="field mt-6 text-center text-[28px] tracking-[0.5em] font-extrabold" />

        <button disabled={busy || code.length < 6} className="btn-primary w-full mt-5 text-[17px] disabled:opacity-50">
          {busy ? 'Verifying…' : 'Verify & continue'} <ArrowRight size={20} />
        </button>

        <div className="flex items-center justify-center gap-1 mt-5 text-sm text-sub">
          Didn’t get it?
          <button type="button" onClick={resend} disabled={cooldown > 0} className="text-brand font-bold flex items-center gap-1 disabled:opacity-50">
            <RefreshCw size={14} /> {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
        <button type="button" onClick={() => { logout(); nav('/login'); }} className="w-full text-sub text-sm mt-6">Use a different account</button>
      </form>
    </div>
  );
}
