import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, X, Search, ListTree, Eye, EyeOff, Award } from 'lucide-react';
import { api, CourseCard, CourseDetail, naira } from '../../api';
import { StatusBar, CourseThumb, Spinner } from '../../components/ui';

const ICONS = ['target', 'megaphone', 'handshake', 'plant', 'doc', 'institution', 'shield', 'chart'];
const COLORS = ['navy', 'violet', 'peach', 'green', 'sand', 'blue'];
const CATEGORIES = ['Fundraising', 'Communication', 'Leadership', 'Monitoring & Evaluation', 'Project Management', 'Policy', 'Sustainability'];

export default function AdminCourses() {
  const nav = useNavigate();
  const [courses, setCourses] = useState<CourseCard[] | null>(null);
  const [q, setQ] = useState('');
  const [editId, setEditId] = useState<number | 'new' | null>(null);

  const load = () => api.get<{ courses: CourseCard[] }>('/courses').then((d) => setCourses(d.courses));
  useEffect(() => { load(); }, []);

  const remove = async (c: CourseCard) => {
    if (!confirm(`Delete "${c.title}"? This removes its modules, lessons and enrollments.`)) return;
    await api.del(`/admin/courses/${c.id}`); load();
  };

  const filtered = (courses || []).filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="pb-6">
      <StatusBar />
      <div className="px-5 pt-3 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold text-navy">Manage Courses</h1>
          <p className="text-sub text-sm">{courses?.length ?? 0} courses in the catalog</p>
        </div>
        <button onClick={() => setEditId('new')} className="btn-primary px-4 py-2.5 text-sm"><Plus size={18} /> New</button>
      </div>

      <div className="px-5 mt-4">
        <div className="flex items-center gap-2 bg-black/[0.04] rounded-2xl px-4 py-3">
          <Search size={18} className="text-sub" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses…" className="flex-1 bg-transparent outline-none text-[15px]" />
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {!courses ? <Spinner /> : filtered.map((c) => (
          <div key={c.id} className="card p-4">
            <div className="flex items-center gap-3">
              <CourseThumb icon={c.icon} color={c.color} size={56} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-navy leading-tight truncate">{c.title}</p>
                <p className="text-xs text-sub mt-0.5">{c.category} · {c.level} · {naira(c.price)}</p>
              </div>
              <button onClick={() => setEditId(c.id)} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center text-navy"><Pencil size={16} /></button>
              <button onClick={() => remove(c)} className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-500"><Trash2 size={16} /></button>
            </div>
            <button onClick={() => nav(`/admin/courses/${c.slug}/content`)}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-brand/30 text-brand font-bold text-sm">
              <ListTree size={16} /> Edit Content (modules & lessons)
            </button>
          </div>
        ))}
      </div>

      {editId !== null && <CourseEditor id={editId} onClose={() => setEditId(null)} onSaved={() => { setEditId(null); load(); }} />}
    </div>
  );
}

interface Form {
  title: string; category: string; level: string; duration: string; price: string; oldPrice: string;
  summary: string; description: string; color: string; icon: string; outcomes: string[];
  published: boolean; cert: { minProgress: string; minQuizScore: string; requireQuizzes: boolean };
}
const empty: Form = {
  title: '', category: 'Fundraising', level: 'Beginner', duration: '6 weeks', price: '20000', oldPrice: '',
  summary: '', description: '', color: 'navy', icon: 'target', outcomes: [],
  published: true, cert: { minProgress: '100', minQuizScore: '0', requireQuizzes: true },
};

function CourseEditor({ id, onClose, onSaved }: { id: number | 'new'; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Form | null>(id === 'new' ? empty : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof Form, v: any) => setF((p) => ({ ...(p as Form), [k]: v }));

  useEffect(() => {
    if (id === 'new') return;
    api.get<{ course: CourseDetail }>(`/courses/${id}`).then(({ course: c }) => setF({
      title: c.title, category: c.category, level: c.level, duration: c.duration,
      price: String(c.price), oldPrice: c.oldPrice ? String(c.oldPrice) : '',
      summary: c.summary, description: c.description, color: c.color, icon: c.icon,
      outcomes: c.outcomes, published: c.published,
      cert: { minProgress: String(c.cert.minProgress), minQuizScore: String(c.cert.minQuizScore), requireQuizzes: c.cert.requireQuizzes },
    }));
  }, [id]);

  if (!f) return null;

  const save = async () => {
    setError(''); setBusy(true);
    try {
      const payload = {
        title: f.title, category: f.category, level: f.level, duration: f.duration,
        price: Number(f.price), oldPrice: f.oldPrice ? Number(f.oldPrice) : null,
        summary: f.summary, description: f.description || f.summary, color: f.color, icon: f.icon,
        outcomes: f.outcomes.filter(Boolean), published: f.published,
        cert: { minProgress: Number(f.cert.minProgress), minQuizScore: Number(f.cert.minQuizScore), requireQuizzes: f.cert.requireQuizzes },
      };
      if (id === 'new') await api.post('/admin/courses', payload);
      else await api.put(`/admin/courses/${id}`, payload);
      onSaved();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl max-h-[92%] overflow-y-auto no-scrollbar p-5 fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-navy">{id === 'new' ? 'New Course' : 'Edit Course'}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center"><X size={18} /></button>
        </div>
        {error && <div className="text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-3">{error}</div>}

        <div className="space-y-4">
          <L label="Title"><input className="field" value={f.title} onChange={(e) => set('title', e.target.value)} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Category"><select className="field" value={f.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></L>
            <L label="Level"><select className="field" value={f.level} onChange={(e) => set('level', e.target.value)}>{['Beginner', 'Intermediate', 'Advanced'].map((c) => <option key={c}>{c}</option>)}</select></L>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <L label="Duration"><input className="field" value={f.duration} onChange={(e) => set('duration', e.target.value)} /></L>
            <L label="Price (₦)"><input className="field" type="number" value={f.price} onChange={(e) => set('price', e.target.value)} /></L>
            <L label="Old price"><input className="field" type="number" value={f.oldPrice} onChange={(e) => set('oldPrice', e.target.value)} placeholder="—" /></L>
          </div>
          <L label="Summary"><textarea className="field h-16" value={f.summary} onChange={(e) => set('summary', e.target.value)} /></L>
          <L label="Description"><textarea className="field h-24" value={f.description} onChange={(e) => set('description', e.target.value)} /></L>

          <L label="What you'll learn">
            {f.outcomes.map((o, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className="field py-2 text-sm flex-1" value={o} onChange={(e) => set('outcomes', f.outcomes.map((x, j) => j === i ? e.target.value : x))} />
                <button onClick={() => set('outcomes', f.outcomes.filter((_, j) => j !== i))} className="text-red-500"><Trash2 size={15} /></button>
              </div>
            ))}
            <button onClick={() => set('outcomes', [...f.outcomes, ''])} className="text-brand font-bold text-sm flex items-center gap-1"><Plus size={15} /> Add outcome</button>
          </L>

          <L label="Icon">
            <div className="flex gap-2 flex-wrap">{ICONS.map((ic) => (
              <button key={ic} onClick={() => set('icon', ic)} className={`p-1 rounded-xl border-2 ${f.icon === ic ? 'border-brand' : 'border-transparent'}`}><CourseThumb icon={ic} color={f.color} size={40} /></button>
            ))}</div>
          </L>
          <L label="Colour">
            <div className="flex gap-2">{COLORS.map((col) => (
              <button key={col} onClick={() => set('color', col)} className={`rounded-full border-2 ${f.color === col ? 'border-navy' : 'border-transparent'}`}><CourseThumb icon={f.icon} color={col} size={36} rounded="rounded-full" /></button>
            ))}</div>
          </L>

          {/* certificate conditions */}
          <div className="card p-4 bg-brand-50/40 border-brand/10">
            <p className="font-bold text-navy flex items-center gap-2 mb-3"><Award size={17} className="text-brand" /> Certificate auto-issue conditions</p>
            <div className="grid grid-cols-2 gap-3">
              <L label="Min progress (%)"><input className="field" type="number" value={f.cert.minProgress} onChange={(e) => set('cert', { ...f.cert, minProgress: e.target.value })} /></L>
              <L label="Min avg quiz (%)"><input className="field" type="number" value={f.cert.minQuizScore} onChange={(e) => set('cert', { ...f.cert, minQuizScore: e.target.value })} /></L>
            </div>
            <label className="flex items-center gap-3 mt-3">
              <input type="checkbox" className="w-5 h-5 accent-brand" checked={f.cert.requireQuizzes} onChange={(e) => set('cert', { ...f.cert, requireQuizzes: e.target.checked })} />
              <span className="text-sm font-semibold text-navy">Require all quizzes to be passed</span>
            </label>
            <p className="text-xs text-sub mt-2">Certificates are generated automatically once a learner meets these conditions.</p>
          </div>

          {/* publish */}
          <button onClick={() => set('published', !f.published)} className="w-full flex items-center justify-between card p-4">
            <span className="font-bold text-navy flex items-center gap-2">{f.published ? <Eye size={18} className="text-emerald-500" /> : <EyeOff size={18} className="text-sub" />} {f.published ? 'Published (visible to learners)' : 'Unpublished (hidden)'}</span>
            <span className={`w-12 h-7 rounded-full p-1 transition ${f.published ? 'bg-emerald-500' : 'bg-black/15'}`}><span className={`block w-5 h-5 bg-white rounded-full transition ${f.published ? 'translate-x-5' : ''}`} /></span>
          </button>
        </div>

        <button onClick={save} disabled={busy || !f.title} className="btn-primary w-full mt-5">{busy ? 'Saving…' : id === 'new' ? 'Create Course' : 'Save Changes'}</button>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-bold text-navy">{label}</span><div className="mt-1.5">{children}</div></label>;
}
