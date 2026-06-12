import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, LogOut } from 'lucide-react';
import { api } from '../api';
import { StatusBar, Wordmark } from '../components/ui';
import { useAuth, homeForRole } from '../auth';

// Shown on first login for invited users — they must set their own password.
export default function SetPassword() {
  const { user, refresh, logout } = useAuth();
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (pw !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await api.post('/auth/change-password', { newPassword: pw });
      await refresh();
      nav(user ? homeForRole(user) : '/home', { replace: true });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <StatusBar />
      <div className="px-6 pt-4"><Wordmark withTagline /></div>
      <form onSubmit={submit} className="flex-1 px-6 pt-10">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4"><ShieldCheck size={28} className="text-brand" /></div>
        <h1 className="text-[30px] font-extrabold text-navy leading-tight">Set your password</h1>
        <p className="text-sub mt-2">Welcome{user ? `, ${user.fullName.split(' ')[0]}` : ''}! For your security, please create your own password before continuing.</p>

        {error && <div className="mt-4 text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3">{error}</div>}

        <label className="block mt-6"><span className="text-[15px] font-bold text-navy">New Password</span>
          <div className="field mt-2 flex items-center gap-3">
            <Lock size={20} className="text-navy/60" />
            <input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" className="flex-1 bg-transparent outline-none" />
          </div>
        </label>
        <label className="block mt-4"><span className="text-[15px] font-bold text-navy">Confirm Password</span>
          <div className="field mt-2 flex items-center gap-3">
            <Lock size={20} className="text-navy/60" />
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" className="flex-1 bg-transparent outline-none" />
          </div>
        </label>

        <button disabled={busy} className="btn-primary w-full mt-6 text-[17px]">{busy ? 'Saving…' : 'Save & Continue'}</button>
        <button type="button" onClick={() => { logout(); nav('/'); }} className="w-full text-sub font-semibold py-3 mt-2 flex items-center justify-center gap-2"><LogOut size={16} /> Log out</button>
      </form>
    </div>
  );
}
