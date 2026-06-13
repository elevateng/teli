import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { BookMark } from '../components/ui';
import { useAuth, homeForRole } from '../auth';
import { useEffect } from 'react';

export default function Splash() {
  const nav = useNavigate();
  const { user } = useAuth();
  useEffect(() => { if (user) nav(homeForRole(user), { replace: true }); }, [user]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col lg:flex-row bg-white">
      {/* brand hero */}
      <div className="relative overflow-hidden flex-1 bg-navy text-white px-7 pb-16 lg:px-16 lg:flex lg:flex-col lg:justify-center"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 3rem)' }}>
        <div className="relative z-10 flex items-center gap-2.5 mb-10">
          <BookMark size={40} />
          <span className="text-2xl font-extrabold tracking-tight">TELI</span>
        </div>
        <h1 className="relative z-10 text-[44px] lg:text-[64px] leading-[1.04] font-extrabold">
          Learn.<br />Lead.<br /><span className="text-brand">Elevate Impact.</span>
        </h1>
        <div className="relative z-10 w-14 h-1.5 bg-brand rounded-full my-6" />
        <p className="relative z-10 text-white/70 text-base lg:text-lg max-w-md leading-relaxed">
          Practical training for social impact professionals and changemakers in Nigeria.
        </p>
        <p className="relative z-10 hidden lg:block text-white/50 text-sm mt-10">An initiative of Elevate Development Foundation</p>
        {/* decorative shapes */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-brand/20" />
        <div className="absolute top-1/4 -right-12 w-44 h-44 rounded-full bg-white/[0.04]" />
      </div>

      {/* CTA panel */}
      <div className="lg:w-[40%] xl:w-[34%] flex flex-col justify-center px-7 py-8 lg:px-14 gap-3 bg-white">
        <h2 className="hidden lg:block text-2xl font-extrabold text-navy mb-2">Start learning today</h2>
        <button onClick={() => nav('/signup')} className="btn-primary w-full text-[17px]">
          Get Started <ArrowRight size={20} />
        </button>
        <button onClick={() => nav('/login')} className="w-full border-2 border-navy text-navy font-bold rounded-2xl py-4 active:scale-[0.99] transition">
          Log in
        </button>
        <div className="flex items-center justify-center gap-2 text-sub text-sm pt-1">
          <ShieldCheck size={18} className="text-navy" /> Trusted learning. Real impact.
        </div>
      </div>
    </div>
  );
}
