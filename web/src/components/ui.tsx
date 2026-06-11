import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, Megaphone, Handshake, Sprout, FileText, Landmark, Shield, BarChart3,
  Heart, Users, GraduationCap, Star, Crosshair, ChevronLeft, Wifi, BatteryFull, SignalHigh,
} from 'lucide-react';

// ---------- course icon + color theming ----------
const ICONS: Record<string, any> = {
  target: Target, megaphone: Megaphone, handshake: Handshake, plant: Sprout,
  doc: FileText, institution: Landmark, shield: Shield, chart: BarChart3,
  heart: Heart, users: Users, cap: GraduationCap, star: Star, bullseye: Crosshair,
};

export const COLOR_BG: Record<string, string> = {
  navy: 'bg-navy/10', violet: 'bg-violet-100', peach: 'bg-orange-100',
  green: 'bg-emerald-100', sand: 'bg-amber-100', blue: 'bg-indigo-100',
};
export const COLOR_FG: Record<string, string> = {
  navy: 'text-navy', violet: 'text-violet-600', peach: 'text-brand',
  green: 'text-emerald-600', sand: 'text-amber-600', blue: 'text-indigo-600',
};

export function CourseThumb({ icon, color, size = 56, rounded = 'rounded-2xl' }: { icon: string; color: string; size?: number; rounded?: string }) {
  const Ico = ICONS[icon] || Target;
  return (
    <div className={`${COLOR_BG[color] || 'bg-navy/10'} ${rounded} flex items-center justify-center shrink-0`} style={{ width: size, height: size }}>
      <Ico className={COLOR_FG[color] || 'text-navy'} size={size * 0.46} strokeWidth={2.2} />
    </div>
  );
}

export function PointIcon({ name, className, size = 22 }: { name: string; className?: string; size?: number }) {
  const Ico = ICONS[name] || Star;
  return <Ico className={className} size={size} strokeWidth={2.2} />;
}

// ---------- phone status bar ----------
export function StatusBar({ dark = false }: { dark?: boolean }) {
  const c = dark ? 'text-white' : 'text-navy';
  return (
    <div className={`flex items-center justify-between px-6 pt-3 pb-1 text-[15px] font-semibold ${c}`}>
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <SignalHigh size={17} />
        <Wifi size={17} />
        <BatteryFull size={20} />
      </div>
    </div>
  );
}

// ---------- screen header ----------
export function TopBar({ title, subtitle, right, onBack }: { title?: ReactNode; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  const nav = useNavigate();
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.05]">
      <button onClick={() => (onBack ? onBack() : nav(-1))} className="p-1 -ml-1 text-navy active:opacity-60">
        <ChevronLeft size={26} />
      </button>
      <div className="flex-1 min-w-0">
        {typeof title === 'string' ? <h1 className="font-bold text-navy text-[17px] leading-tight truncate">{title}</h1> : title}
        {subtitle && <p className="text-xs text-sub truncate">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

// ---------- brand wordmark ----------
export function Wordmark({ withTagline = false, className = '' }: { withTagline?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <BookMark size={32} />
      <div className="leading-none">
        <span className="font-extrabold tracking-tight text-navy text-[26px]">TELI</span>
        {withTagline && <div className="text-[9px] font-bold tracking-wide text-navy/70 mt-1">THE ELEVATE<br />LEARNING INSTITUTE</div>}
      </div>
    </div>
  );
}

export function BookMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="shrink-0">
      <path d="M32 16c-5-3.2-11-3.6-16-1.6v30c5-2 11-1.6 16 1.6V16z" fill="#0F2147" />
      <path d="M32 16c5-3.2 11-3.6 16-1.6v30c-5-2-11-1.6-16 1.6V16z" fill="#F26419" />
      <path d="M32 16v30" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`progress-track ${className}`}>
      <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Ring({ value, size = 132, stroke = 12 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceff5" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#6d4bf6" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
    </svg>
  );
}

export function Confetti() {
  const bits = Array.from({ length: 18 });
  const colors = ['#F26419', '#0F2147', '#22c55e', '#6d4bf6', '#3b82f6', '#fbbf24'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {bits.map((_, i) => (
        <span key={i} className="absolute rounded-[2px] pop"
          style={{
            left: `${(i * 53) % 100}%`, top: `${(i * 31) % 60}%`,
            width: 8, height: 8, background: colors[i % colors.length],
            transform: `rotate(${i * 40}deg)`, animationDelay: `${(i % 6) * 60}ms`,
          }} />
      ))}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-[3px] border-brand/20 border-t-brand animate-spin" />
    </div>
  );
}
