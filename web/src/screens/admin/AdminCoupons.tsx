import { useEffect, useState } from 'react';
import { Plus, X, Trash2, Power, Tag, Copy, Check } from 'lucide-react';
import { api, Coupon, CourseCard, naira } from '../../api';
import { StatusBar, Spinner } from '../../components/ui';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');

  const load = () => api.get<{ coupons: Coupon[] }>('/admin/coupons').then((d) => setCoupons(d.coupons));
  useEffect(() => {
    load();
    api.get<{ courses: CourseCard[] }>('/courses').then((d) => setCourses(d.courses));
  }, []);

  const toggle = async (c: Coupon) => { await api.post(`/admin/coupons/${c.id}/toggle`); load(); };
  const remove = async (c: Coupon) => { if (confirm(`Delete coupon ${c.code}?`)) { await api.del(`/admin/coupons/${c.id}`); load(); } };
  const copy = (code: string) => { navigator.clipboard?.writeText(code); setCopied(code); setTimeout(() => setCopied(''), 1500); };

  return (
    <div className="pb-6">
      <StatusBar />
      <div className="px-5 pt-3 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold text-navy">Coupons & Discounts</h1>
          <p className="text-sub text-sm">{coupons?.length ?? 0} coupons</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary px-4 py-2.5 text-sm"><Plus size={18} /> New</button>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {!coupons ? <Spinner /> : coupons.length === 0 ? (
          <div className="card p-8 text-center text-sub"><Tag size={32} className="mx-auto text-brand mb-2" />No coupons yet.</div>
        ) : coupons.map((c) => (
          <div key={c.id} className={`card p-4 ${c.active ? '' : 'opacity-60'}`}>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <button onClick={() => copy(c.code)} className="font-extrabold text-navy text-lg tracking-wide flex items-center gap-1.5">
                    {c.code} {copied === c.code ? <Check size={15} className="text-emerald-500" /> : <Copy size={14} className="text-sub" />}
                  </button>
                  <span className={`chip ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-black/[0.06] text-sub'}`}>{c.active ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="text-sm text-brand font-bold mt-1">
                  {c.kind === 'percent' ? `${c.value}% off` : `${naira(c.value)} off`}
                  <span className="text-sub font-normal"> · {c.courseTitle ? c.courseTitle : 'Any course'}</span>
                </p>
                <p className="text-xs text-sub mt-0.5">
                  {c.singleUse ? 'Single-use' : `Used ${c.usedCount}/${c.maxUses}`}{c.expiresAt ? ` · expires ${c.expiresAt.slice(0, 10)}` : ''}
                </p>
              </div>
              <button onClick={() => toggle(c)} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center text-navy"><Power size={16} /></button>
              <button onClick={() => remove(c)} className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-500"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {creating && <CouponForm courses={courses} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function CouponForm({ courses, onClose, onSaved }: { courses: CourseCard[]; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('20');
  const [courseId, setCourseId] = useState('');
  const [singleUse, setSingleUse] = useState(true);
  const [maxUses, setMaxUses] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const gen = () => setCode(Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join(''));

  const save = async () => {
    setBusy(true); setError('');
    try {
      await api.post('/admin/coupons', {
        code: code || undefined, kind, value: Number(value),
        courseId: courseId ? Number(courseId) : null,
        singleUse, maxUses: Number(maxUses), expiresAt: expiresAt || null,
      });
      onSaved();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-5 fade-up max-h-[90%] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-navy">New Coupon</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center"><X size={18} /></button>
        </div>
        {error && <div className="text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-3">{error}</div>}
        <div className="space-y-4">
          <label className="block"><span className="text-sm font-bold text-navy">Code</span>
            <div className="flex gap-2 mt-1.5">
              <input className="field flex-1 uppercase" placeholder="Auto-generate if blank" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
              <button onClick={gen} className="btn-navy px-4 py-3 text-sm">Generate</button>
            </div>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-sm font-bold text-navy">Type</span>
              <select className="field mt-1.5" value={kind} onChange={(e) => setKind(e.target.value as any)}>
                <option value="percent">Percentage</option><option value="fixed">Fixed (₦)</option>
              </select></label>
            <label className="block"><span className="text-sm font-bold text-navy">{kind === 'percent' ? 'Percent (1–100)' : 'Amount (₦)'}</span>
              <input className="field mt-1.5" type="number" value={value} onChange={(e) => setValue(e.target.value)} /></label>
          </div>
          <label className="block"><span className="text-sm font-bold text-navy">Applies to</span>
            <select className="field mt-1.5" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Any course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select></label>
          <label className="flex items-center gap-3 py-1">
            <input type="checkbox" className="w-5 h-5 accent-brand" checked={singleUse} onChange={(e) => setSingleUse(e.target.checked)} />
            <span className="text-sm font-semibold text-navy">Single-use (one redemption only)</span>
          </label>
          {!singleUse && (
            <label className="block"><span className="text-sm font-bold text-navy">Max uses</span>
              <input className="field mt-1.5" type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} /></label>
          )}
          <label className="block"><span className="text-sm font-bold text-navy">Expires (optional)</span>
            <input className="field mt-1.5" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></label>
        </div>
        <button onClick={save} disabled={busy} className="btn-primary w-full mt-5">{busy ? 'Creating…' : 'Create Coupon'}</button>
      </div>
    </div>
  );
}
