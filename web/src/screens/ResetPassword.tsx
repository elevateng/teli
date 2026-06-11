import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { StatusBar, Wordmark, TopBar } from '../components/ui';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  return token ? <DoReset token={token} /> : <RequestReset />;
}

function RequestReset() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ resetUrl?: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const r = await api.post<{ resetUrl?: string }>('/auth/forgot', { email }); setSent(r); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <StatusBar />
      <div className="px-6 pt-4"><Wordmark withTagline /></div>
      <form onSubmit={submit} className="flex-1 px-6 pt-10">
        <h1 className="text-[32px] font-extrabold text-navy leading-tight">Forgot password?</h1>
        <p className="text-sub mt-2">Enter your email and we'll send you a reset link.</p>

        {sent ? (
          <div className="mt-6 card p-5">
            <CheckCircle2 size={36} className="text-emerald-500 mb-2" />
            <p className="font-bold text-navy">Check your email</p>
            <p className="text-sub text-sm mt-1">If an account exists for {email}, a reset link is on its way.</p>
            {sent.resetUrl && (
              <div className="mt-3 rounded-xl bg-brand-50 p-3">
                <p className="text-xs text-sub mb-1">Dev mode (no SMTP configured) — use this link:</p>
                <button onClick={() => nav(sent.resetUrl!.replace(location.origin, ''))} className="text-brand font-bold text-sm break-all text-left">{sent.resetUrl}</button>
              </div>
            )}
            <button onClick={() => nav('/login')} className="btn-navy w-full mt-4">Back to login</button>
          </div>
        ) : (
          <>
            <label className="block mt-6">
              <span className="text-[15px] font-bold text-navy">Email Address</span>
              <div className="field mt-2 flex items-center gap-3">
                <Mail size={20} className="text-navy/60" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="flex-1 bg-transparent outline-none" />
              </div>
            </label>
            <button disabled={busy} className="btn-primary w-full mt-5">{busy ? 'Sending…' : 'Send reset link'} <ArrowRight size={19} /></button>
            <button type="button" onClick={() => nav('/login')} className="w-full text-sub font-bold py-3 mt-2">Back to login</button>
          </>
        )}
      </form>
    </div>
  );
}

function DoReset({ token }: { token: string }) {
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { await api.post('/auth/reset', { token, password }); setDone(true); }
    catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Reset Password" onBack={() => nav('/login')} />
      <form onSubmit={submit} className="flex-1 px-6 pt-8">
        {done ? (
          <div className="card p-6 text-center">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-2" />
            <h2 className="text-xl font-extrabold text-navy">Password updated</h2>
            <p className="text-sub mt-1">You can now log in with your new password.</p>
            <button onClick={() => nav('/login')} className="btn-primary w-full mt-5">Go to login</button>
          </div>
        ) : (
          <>
            <h1 className="text-[28px] font-extrabold text-navy">Set a new password</h1>
            {error && <div className="mt-4 text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3">{error}</div>}
            <label className="block mt-6">
              <span className="text-[15px] font-bold text-navy">New Password</span>
              <div className="field mt-2 flex items-center gap-3">
                <Lock size={20} className="text-navy/60" />
                <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="flex-1 bg-transparent outline-none" />
              </div>
            </label>
            <button disabled={busy} className="btn-primary w-full mt-5">{busy ? 'Updating…' : 'Update password'}</button>
          </>
        )}
      </form>
    </div>
  );
}
