import { useEffect, useState } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';
import { BookMark } from './ui';
import { useInstall } from './pwa';

const DISMISS_KEY = 'teli-install-dismissed';

export default function InstallPrompt() {
  const { canInstall, isStandalone, isIos, promptInstall } = useInstall();
  const [show, setShow] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone || localStorage.getItem(DISMISS_KEY)) return;
    if (canInstall) setShow(true);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (isIos) t = setTimeout(() => setShow(true), 2000);
    return () => { if (t) clearTimeout(t); };
  }, [canInstall, isStandalone, isIos]);

  const dismiss = () => { setShow(false); setIosHelp(false); localStorage.setItem(DISMISS_KEY, '1'); };

  const install = async () => {
    const r = await promptInstall();
    if (r === 'unavailable' && isIos) { setIosHelp(true); return; }
    setShow(false); localStorage.setItem(DISMISS_KEY, '1');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 z-[80] flex justify-center px-4 pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
      <div className="pointer-events-auto w-full max-w-[440px] bg-white rounded-3xl shadow-2xl ring-1 ring-black/[0.06] p-4 fade-up">
        {!iosHelp ? (
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0">
              <BookMark size={28} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-navy leading-tight">Install TELI</p>
              <p className="text-xs text-sub leading-tight mt-0.5">Add it to your home screen and open it like an app — no browser needed.</p>
            </div>
            <button onClick={dismiss} aria-label="Dismiss" className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center shrink-0">
              <X size={16} className="text-sub" />
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-start gap-3">
              <span className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0"><BookMark size={28} /></span>
              <div className="flex-1">
                <p className="font-extrabold text-navy leading-tight">Add TELI to your home screen</p>
                <ol className="text-xs text-sub mt-1.5 space-y-1">
                  <li className="flex items-center gap-1.5">1. Tap the <Share size={13} className="inline text-brand" /> <b className="text-navy">Share</b> button below</li>
                  <li className="flex items-center gap-1.5">2. Choose <Plus size={13} className="inline text-brand" /> <b className="text-navy">Add to Home Screen</b></li>
                </ol>
              </div>
              <button onClick={dismiss} aria-label="Dismiss" className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center shrink-0">
                <X size={16} className="text-sub" />
              </button>
            </div>
          </div>
        )}
        {!iosHelp && (
          <div className="flex gap-2 mt-3">
            <button onClick={dismiss} className="flex-1 border-2 border-black/10 text-navy font-bold rounded-2xl py-2.5 text-sm">Not now</button>
            <button onClick={install} className="btn-primary flex-[1.5] py-2.5 text-sm"><Download size={16} /> Install app</button>
          </div>
        )}
      </div>
    </div>
  );
}
