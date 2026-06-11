import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { StatusBar, Wordmark } from '../components/ui';
import { useAuth, homeForRole } from '../auth';
import { useEffect } from 'react';

export default function Splash() {
  const nav = useNavigate();
  const { user } = useAuth();
  useEffect(() => { if (user) nav(homeForRole(user), { replace: true }); }, [user]);

  return (
    <div className="flex flex-col h-full">
      <StatusBar />
      <div className="flex-1 px-7 pt-6 relative overflow-hidden">
        <Wordmark withTagline className="mb-12" />

        <h1 className="text-[44px] leading-[1.05] font-extrabold text-navy">
          Learn.<br />Lead.<br /><span className="text-brand">Elevate Impact.</span>
        </h1>
        <div className="w-14 h-1.5 bg-brand rounded-full my-6" />
        <p className="text-sub text-[15px] max-w-[15rem] leading-relaxed">
          Practical training for social impact professionals and changemakers in Nigeria.
        </p>

        {/* decorative shapes */}
        <div className="absolute right-0 top-40 w-24 h-40 bg-brand-50 rounded-l-3xl" />
        <div className="absolute right-8 bottom-24 w-28 h-28 bg-brand rounded-full" />
        <div className="absolute -left-6 bottom-0 w-40 h-40 bg-navy rounded-tr-[5rem]" />
        <div className="absolute left-36 bottom-0 w-32 h-32 bg-brand rounded-t-[5rem]" />
        <div className="absolute right-0 bottom-0 w-28 h-28 bg-navy rounded-tl-[4rem]" />
      </div>

      <div className="px-7 pb-7 space-y-3 bg-white relative z-10">
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
