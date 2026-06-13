import { useEffect, useLayoutEffect, useState } from 'react';

export interface TourStep { selector?: string; title: string; text: string; }

function findVisible(selector?: string): HTMLElement | null {
  if (!selector) return null;
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return els.find((e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0) || els[0] || null;
}

export default function Tour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[i];

  useLayoutEffect(() => {
    const measure = () => {
      const el = findVisible(step.selector);
      if (el) { el.scrollIntoView({ block: 'nearest' }); setRect(el.getBoundingClientRect()); }
      else setRect(null);
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [i]);

  // re-measure shortly after mount (nav may still be settling)
  useEffect(() => { const t = setTimeout(() => setI((x) => x), 60); return () => clearTimeout(t); }, []);

  const next = () => (i < steps.length - 1 ? setI(i + 1) : onDone());
  const back = () => setI(Math.max(0, i - 1));

  const pad = 8;
  const vw = window.innerWidth, vh = window.innerHeight;
  const spot = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;

  // tooltip placement
  const tipW = Math.min(320, vw - 32);
  let tipStyle: React.CSSProperties;
  if (!spot) {
    tipStyle = { left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: tipW };
  } else {
    const below = spot.top + spot.height + 12 + 170 < vh;
    const top = below ? spot.top + spot.height + 12 : Math.max(12, spot.top - 12 - 170);
    let left = spot.left + spot.width / 2 - tipW / 2;
    left = Math.max(16, Math.min(left, vw - tipW - 16));
    tipStyle = { left, top, width: tipW };
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* spotlight (or full dim when no target) */}
      {spot ? (
        <div className="absolute rounded-2xl ring-2 ring-brand pointer-events-none transition-all duration-200"
          style={{ ...spot, boxShadow: '0 0 0 9999px rgba(8,16,24,0.72)' }} />
      ) : (
        <div className="absolute inset-0" style={{ background: 'rgba(8,16,24,0.72)' }} />
      )}

      {/* tooltip */}
      <div className="absolute card p-4 shadow-2xl" style={tipStyle}>
        <p className="text-[11px] font-bold text-brand">STEP {i + 1} OF {steps.length}</p>
        <h3 className="font-extrabold text-navy text-lg mt-0.5">{step.title}</h3>
        <p className="text-sub text-sm mt-1 leading-relaxed">{step.text}</p>
        <div className="flex items-center justify-between mt-4">
          <button onClick={onDone} className="text-sub text-sm font-semibold">Skip</button>
          <div className="flex items-center gap-2">
            {i > 0 && <button onClick={back} className="px-3 py-2 rounded-xl border-2 border-black/10 text-navy font-bold text-sm">Back</button>}
            <button onClick={next} className="btn-primary px-4 py-2 text-sm">{i < steps.length - 1 ? 'Next' : 'Get started'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
