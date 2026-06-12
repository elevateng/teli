import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { StatusBar, Wordmark } from '../components/ui';
import { GoogleG } from './SignUp';
import { useAuth, homeForRole } from '../auth';
import GoogleButton from '../components/GoogleButton';

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { const u = await login(email, password); nav(homeForRole(u), { replace: true }); }
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
      </div>

      <form onSubmit={submit} className="flex-1 px-6 pt-10">
        <h1 className="text-[34px] font-extrabold text-navy leading-tight">Welcome back</h1>
        <p className="text-sub mt-2">Log in to continue your learning journey.</p>

        {error && <div className="mt-4 text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3">{error}</div>}

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-[15px] font-bold text-navy">Email Address</span>
            <div className="field mt-2 flex items-center gap-3">
              <Mail size={20} className="text-navy/60" />
              <input type="email" className="flex-1 bg-transparent outline-none" placeholder="Enter your email"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </label>
          <label className="block">
            <span className="text-[15px] font-bold text-navy">Password</span>
            <div className="field mt-2 flex items-center gap-3">
              <Lock size={20} className="text-navy/60" />
              <input type={show ? 'text' : 'password'} className="flex-1 bg-transparent outline-none" placeholder="Enter your password"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShow(!show)} className="text-navy/50">{show ? <EyeOff size={20} /> : <Eye size={20} />}</button>
            </div>
          </label>
        </div>

        <div className="text-right mt-3">
          <button type="button" onClick={() => nav('/reset')} className="text-brand font-semibold text-sm">Forgot password?</button>
        </div>

        <button disabled={busy} className="btn-primary w-full mt-5 text-[17px]">
          {busy ? 'Logging in…' : 'Log in'} <ArrowRight size={20} />
        </button>

        <GoogleButton />

        <p className="text-center text-sub mt-6">
          New to TELI? <Link to="/signup" className="text-brand font-bold">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
