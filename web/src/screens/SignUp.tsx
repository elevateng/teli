import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, User, Mail, Lock, Eye, EyeOff, ShieldCheck, Gift } from 'lucide-react';
import { StatusBar, Wordmark } from '../components/ui';
import { useAuth } from '../auth';
import GoogleButton from '../components/GoogleButton';

export default function SignUp() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [show2, setShow2] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = params.get('ref') || sessionStorage.getItem('teli_ref') || '';

  // remember the referral code so it survives the Google sign-in redirect too
  useEffect(() => { if (params.get('ref')) sessionStorage.setItem('teli_ref', params.get('ref')!); }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try { const u = await register(`${firstName.trim()} ${lastName.trim()}`.trim(), email, password, ref || undefined); sessionStorage.removeItem('teli_ref'); nav(u.role === 'learner' ? '/home' : '/admin', { replace: true }); }
    catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <StatusBar />
      <div className="px-6 pt-4 relative">
        <Wordmark withTagline />
        <div className="absolute -right-6 top-6 w-24 h-24 bg-brand-50 rounded-full" />
        <div className="absolute right-8 top-16 w-16 h-16 bg-brand rounded-full" />
        <div className="absolute -right-4 top-28 w-24 h-24 bg-navy rounded-full" />
      </div>

      <form onSubmit={submit} className="flex-1 px-6 pt-8">
        <h1 className="text-[34px] font-extrabold text-navy leading-tight">Create your account</h1>
        <p className="text-sub mt-2 max-w-[18rem]">Join TELI and start your journey to learn, lead and elevate impact.</p>

        {ref && (
          <div className="mt-4 rounded-2xl bg-brand-50 p-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center"><Gift size={18} className="text-brand" /></span>
            <p className="text-sm text-navy">You were invited! Sign up to get a <b>10% off</b> welcome code.</p>
          </div>
        )}

        {error && <div className="mt-4 text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3">{error}</div>}

        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name">
              <User size={20} className="text-navy/60" />
              <input className="flex-1 min-w-0 bg-transparent outline-none" placeholder="First"
                value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </Field>
            <Field label="Last Name">
              <input className="flex-1 min-w-0 bg-transparent outline-none" placeholder="Last"
                value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </Field>
          </div>
          <Field label="Email Address">
            <Mail size={20} className="text-navy/60" />
            <input type="email" className="flex-1 bg-transparent outline-none" placeholder="Enter your email address"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <div>
            <Field label="Password">
              <Lock size={20} className="text-navy/60" />
              <input type={show ? 'text' : 'password'} className="flex-1 bg-transparent outline-none" placeholder="Create a password"
                value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              <button type="button" onClick={() => setShow(!show)} className="text-navy/50">{show ? <EyeOff size={20} /> : <Eye size={20} />}</button>
            </Field>
            <p className="text-xs text-sub mt-2">Use at least 8 characters with a mix of letters, numbers &amp; symbols.</p>
          </div>
          <Field label="Confirm Password">
            <Lock size={20} className="text-navy/60" />
            <input type={show2 ? 'text' : 'password'} className="flex-1 bg-transparent outline-none" placeholder="Confirm your password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            <button type="button" onClick={() => setShow2(!show2)} className="text-navy/50">{show2 ? <EyeOff size={20} /> : <Eye size={20} />}</button>
          </Field>
        </div>

        <button disabled={busy} className="btn-primary w-full mt-6 text-[17px]">
          {busy ? 'Creating…' : 'Create Account'} <ArrowRight size={20} />
        </button>

        <GoogleButton />

        <p className="text-center text-sub mt-5">
          Already have an account? <Link to="/login" className="text-brand font-bold">Log in</Link>
        </p>
        <div className="flex items-center justify-center gap-2 text-sub text-sm mt-5 mb-6">
          <ShieldCheck size={18} className="text-navy" /> Built for social impact professionals in Nigeria.
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[15px] font-bold text-navy">{label}</span>
      <div className="field mt-2 flex items-center gap-3">{children}</div>
    </label>
  );
}

export function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.3 0-11.5-5.2-11.5-11.5S17.7 12.5 24 12.5c2.9 0 5.5 1.1 7.5 2.9l5.7-5.7C33.6 6.5 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.5 1.1 7.5 2.9l5.7-5.7C33.6 6.5 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5.2 0 9.6-2 12.9-5.2l-6-5c-1.9 1.4-4.3 2.2-6.9 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.3l6 5c-.4.4 6.7-4.9 6.7-14.3 0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
