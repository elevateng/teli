import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, X, Search, ListTree, Eye, EyeOff, Award, Ticket, Copy, Check, Power, Image as ImageIcon, Tag, Users, Crown, UserPlus, ClipboardList, BarChart3 } from 'lucide-react';
import { api, CourseCard, CourseDetail, AccessCode, CourseGroup, resizeImage, naira } from '../../api';
import { StatusBar, CourseThumb, Spinner, Avatar } from '../../components/ui';

const ICONS = ['target', 'megaphone', 'handshake', 'plant', 'doc', 'institution', 'shield', 'chart'];
const COLORS = ['navy', 'violet', 'peach', 'green', 'sand', 'blue'];
const CATEGORIES = ['Fundraising', 'Communication', 'Leadership', 'Monitoring & Evaluation', 'Project Management', 'Policy', 'Sustainability'];

export default function AdminCourses() {
  const nav = useNavigate();
  const [courses, setCourses] = useState<CourseCard[] | null>(null);
  const [q, setQ] = useState('');
  const [editId, setEditId] = useState<number | 'new' | null>(null);
  const [codesFor, setCodesFor] = useState<CourseCard | null>(null);
  const [groupsFor, setGroupsFor] = useState<CourseCard | null>(null);

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
            <div className="flex items-center gap-2 mt-2">
              {c.visibility === 'private' && <span className="chip bg-navy/10 text-navy">🔒 Private</span>}
              {c.published === false && <span className="chip bg-amber-100 text-amber-700">Unpublished</span>}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={() => nav(`/admin/courses/${c.slug}/content`)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-brand/30 text-brand font-bold text-sm">
                <ListTree size={16} /> Content
              </button>
              <button onClick={() => setCodesFor(c)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-black/10 text-navy font-bold text-sm">
                <Ticket size={16} /> Access codes
              </button>
              <button onClick={() => setGroupsFor(c)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-black/10 text-navy font-bold text-sm">
                <Users size={16} /> Teams
              </button>
              <button onClick={() => nav(`/admin/courses/${c.slug}/assignments`)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-black/10 text-navy font-bold text-sm">
                <ClipboardList size={16} /> Assignments
              </button>
              <button onClick={() => nav(`/admin/courses/${c.slug}/analytics`)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-black/10 text-navy font-bold text-sm">
                <BarChart3 size={16} /> Analytics
              </button>
            </div>
          </div>
        ))}
      </div>

      {editId !== null && <CourseEditor id={editId} onClose={() => setEditId(null)} onSaved={() => { setEditId(null); load(); }} />}
      {codesFor && <AccessCodes course={codesFor} onClose={() => setCodesFor(null)} />}
      {groupsFor && <GroupsManager course={groupsFor} onClose={() => setGroupsFor(null)} />}
    </div>
  );
}

interface Form {
  title: string; category: string; level: string; duration: string; price: string; oldPrice: string;
  summary: string; description: string; color: string; icon: string; outcomes: string[];
  image: string | null;
  instructor: { name: string; title: string; bio: string; avatar: string | null };
  signatoryName: string; tags: string[];
  published: boolean; visibility: 'public' | 'private'; cert: { minProgress: string; minQuizScore: string; requireQuizzes: boolean };
}
const empty: Form = {
  title: '', category: 'Fundraising', level: 'Beginner', duration: '6 weeks', price: '20000', oldPrice: '',
  summary: '', description: '', color: 'navy', icon: 'target', outcomes: [],
  image: null, instructor: { name: '', title: 'Instructor', bio: '', avatar: null }, signatoryName: '', tags: [],
  published: true, visibility: 'public', cert: { minProgress: '100', minQuizScore: '0', requireQuizzes: true },
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
      outcomes: c.outcomes, published: c.published, visibility: c.visibility || 'public',
      image: c.image || null,
      instructor: { name: c.instructor.name, title: c.instructor.title, bio: c.instructor.bio, avatar: c.instructor.avatar },
      signatoryName: c.signatoryName || '', tags: c.tags || [],
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
        outcomes: f.outcomes.filter(Boolean), published: f.published, visibility: f.visibility,
        image: f.image, instructor: f.instructor, signatoryName: f.signatoryName, tags: f.tags,
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

          {/* course image */}
          <L label="Course image (optional — replaces the icon as the thumbnail)">
            <div className="flex items-center gap-3">
              {f.image ? <img src={f.image} className="w-16 h-16 rounded-xl object-cover" /> : <CourseThumb icon={f.icon} color={f.color} size={64} />}
              <label className="text-brand font-bold text-sm cursor-pointer flex items-center gap-1">
                <ImageIcon size={15} /> {f.image ? 'Replace' : 'Upload'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => { const fl = e.target.files?.[0]; if (fl) set('image', await resizeImage(fl, 640)); }} />
              </label>
              {f.image && <button onClick={() => set('image', null)} className="text-sub text-sm">Remove</button>}
            </div>
          </L>

          {/* instructor */}
          <div className="card p-4 bg-black/[0.02]">
            <p className="font-bold text-navy mb-3">Instructor (shown on the course + certificate)</p>
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={f.instructor.name || '?'} src={f.instructor.avatar} size={56} />
              <label className="text-brand font-bold text-sm cursor-pointer flex items-center gap-1">
                <ImageIcon size={15} /> {f.instructor.avatar ? 'Replace photo' : 'Upload photo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => { const fl = e.target.files?.[0]; if (fl) set('instructor', { ...f.instructor, avatar: await resizeImage(fl, 256) }); }} />
              </label>
              {f.instructor.avatar && <button onClick={() => set('instructor', { ...f.instructor, avatar: null })} className="text-sub text-sm">Remove</button>}
            </div>
            <input className="field mb-2" placeholder="Instructor name" value={f.instructor.name} onChange={(e) => set('instructor', { ...f.instructor, name: e.target.value })} />
            <input className="field mb-2" placeholder="Title (e.g. Fundraising Lead)" value={f.instructor.title} onChange={(e) => set('instructor', { ...f.instructor, title: e.target.value })} />
            <textarea className="field h-16" placeholder="Short bio" value={f.instructor.bio} onChange={(e) => set('instructor', { ...f.instructor, bio: e.target.value })} />
          </div>

          <L label="Certificate signatory name (signed on certificates)">
            <input className="field" placeholder="e.g. Ayo Okafor, Director" value={f.signatoryName} onChange={(e) => set('signatoryName', e.target.value)} />
          </L>

          <L label="Tags (choose up to 3)">
            <TagPicker selected={f.tags} onChange={(t) => set('tags', t)} />
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

          {/* visibility */}
          <L label="Visibility">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => set('visibility', 'public')} className={`py-3 rounded-xl border-2 text-sm font-bold ${f.visibility === 'public' ? 'border-brand bg-brand-50 text-brand' : 'border-black/10 text-navy'}`}>
                🌍 Public<br /><span className="text-[10px] font-normal text-sub">Anyone can buy</span>
              </button>
              <button onClick={() => set('visibility', 'private')} className={`py-3 rounded-xl border-2 text-sm font-bold ${f.visibility === 'private' ? 'border-brand bg-brand-50 text-brand' : 'border-black/10 text-navy'}`}>
                🔒 Private<br /><span className="text-[10px] font-normal text-sub">Access code only</span>
              </button>
            </div>
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

function TagPicker({ selected, onChange }: { selected: string[]; onChange: (t: string[]) => void }) {
  const [all, setAll] = useState<string[]>([]);
  const [adding, setAdding] = useState('');
  useEffect(() => { api.get<{ tags: string[] }>('/tags').then((d) => setAll(d.tags)); }, []);

  const toggle = (tag: string) => {
    if (selected.includes(tag)) onChange(selected.filter((t) => t !== tag));
    else if (selected.length < 3) onChange([...selected, tag]);
  };
  const createTag = async () => {
    const label = adding.trim(); if (!label) return;
    const { tags } = await api.post<{ tags: string[] }>('/admin/tags', { label });
    setAll(tags); setAdding('');
    if (selected.length < 3 && !selected.includes(label)) onChange([...selected, label]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {all.map((tag) => {
          const on = selected.includes(tag);
          const disabled = !on && selected.length >= 3;
          return (
            <button key={tag} type="button" onClick={() => toggle(tag)} disabled={disabled}
              className={`chip border inline-flex items-center gap-1 ${on ? 'bg-brand text-white border-brand' : disabled ? 'border-black/10 text-black/30' : 'border-black/15 text-navy'}`}>
              <Tag size={12} /> {tag}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-sub mt-2">{selected.length}/3 selected</p>
      <div className="flex gap-2 mt-2">
        <input className="field py-2 text-sm flex-1" value={adding} onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), createTag())} placeholder="Create a new tag category…" />
        <button type="button" onClick={createTag} disabled={!adding.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-50"><Plus size={15} /></button>
      </div>
    </div>
  );
}

function AccessCodes({ course, onClose }: { course: CourseCard; onClose: () => void }) {
  const [codes, setCodes] = useState<AccessCode[] | null>(null);
  const [emails, setEmails] = useState('');
  const [count, setCount] = useState('5');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState('');

  const load = () => api.get<{ codes: AccessCode[] }>(`/admin/courses/${course.id}/access-codes`).then((d) => setCodes(d.codes));
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await api.post<{ created: any[]; emailed: boolean }>(`/admin/courses/${course.id}/access-codes`,
        emails.trim() ? { emails } : { count: Number(count) });
      setMsg(`${r.created.length} code(s) created${r.emailed ? ' and emailed' : ''}.`);
      setEmails(''); load();
    } finally { setBusy(false); }
  };
  const toggle = async (c: AccessCode) => { await api.post(`/admin/access-codes/${c.id}/toggle`); load(); };
  const copy = (code: string) => { navigator.clipboard?.writeText(code); setCopied(code); setTimeout(() => setCopied(''), 1500); };

  return (
    <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-5 fade-up max-h-[90%] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-extrabold text-navy">Access codes</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center"><X size={18} /></button>
        </div>
        <p className="text-sm text-sub mb-4">{course.title}{course.visibility !== 'private' && <span className="text-amber-600"> — tip: set this course to Private so codes are required.</span>}</p>

        <div className="card p-4 bg-brand-50/40">
          <p className="text-sm font-bold text-navy mb-2">Invite by email (one personalised code each, emailed automatically)</p>
          <textarea className="field h-16 text-sm" placeholder="person1@email.com, person2@email.com" value={emails} onChange={(e) => setEmails(e.target.value)} />
          {!emails.trim() && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-sub">or generate</span>
              <input className="field w-20 py-2 text-sm" type="number" value={count} onChange={(e) => setCount(e.target.value)} />
              <span className="text-sm text-sub">generic codes</span>
            </div>
          )}
          <button onClick={generate} disabled={busy} className="btn-primary w-full mt-3">{busy ? 'Working…' : emails.trim() ? 'Create & email codes' : 'Generate codes'}</button>
          {msg && <p className="text-sm text-emerald-600 mt-2">{msg}</p>}
        </div>

        <p className="text-sm font-bold text-navy mt-5 mb-2">Existing codes</p>
        <div className="space-y-2">
          {!codes ? <Spinner /> : codes.length === 0 ? <p className="text-sub text-sm">No codes yet.</p> : codes.map((c) => (
            <div key={c.id} className={`card p-3 flex items-center gap-2 ${c.active ? '' : 'opacity-50'}`}>
              <button onClick={() => copy(c.code)} className="font-mono font-bold text-navy flex items-center gap-1.5">{c.code} {copied === c.code ? <Check size={14} className="text-emerald-500" /> : <Copy size={13} className="text-sub" />}</button>
              <div className="flex-1 text-xs text-sub truncate">{c.email || 'anyone'} · used {c.usedCount}/{c.maxUses}</div>
              <button onClick={() => toggle(c)} className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center text-navy"><Power size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupsManager({ course, onClose }: { course: CourseCard; onClose: () => void }) {
  const [groups, setGroups] = useState<CourseGroup[] | null>(null);
  const [learners, setLearners] = useState<{ id: number; name: string; avatar: string | null }[]>([]);
  const [name, setName] = useState('');
  const [pickFor, setPickFor] = useState<number | null>(null);

  const load = () => api.get<{ groups: CourseGroup[] }>(`/admin/courses/${course.id}/groups`).then((d) => setGroups(d.groups));
  useEffect(() => {
    load();
    api.get<{ learners: { id: number; name: string; avatar: string | null }[] }>(`/admin/courses/${course.id}/learners`).then((d) => setLearners(d.learners));
  }, [course.id]);

  const create = async () => { if (!name.trim()) return; await api.post(`/admin/courses/${course.id}/groups`, { name }); setName(''); load(); };
  const delGroup = async (id: number) => { if (confirm('Delete this team?')) { await api.del(`/admin/groups/${id}`); load(); } };
  const addMember = async (gid: number, userId: number) => { const { group } = await api.post<{ group: CourseGroup }>(`/admin/groups/${gid}/members`, { userId }); setGroups((g) => (g || []).map((x) => x.id === gid ? group : x)); setPickFor(null); };
  const removeMember = async (gid: number, userId: number) => { const { group } = await api.del<{ group: CourseGroup }>(`/admin/groups/${gid}/members/${userId}`); setGroups((g) => (g || []).map((x) => x.id === gid ? group : x)); };
  const toggleLeader = async (gid: number, userId: number, isLeader: boolean) => { const { group } = await api.post<{ group: CourseGroup }>(`/admin/groups/${gid}/leader`, { userId, isLeader }); setGroups((g) => (g || []).map((x) => x.id === gid ? group : x)); };

  return (
    <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl max-h-[92%] overflow-y-auto no-scrollbar p-5 fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-extrabold text-navy">Teams</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center"><X size={18} /></button>
        </div>
        <p className="text-sm text-sub mb-4">{course.title} · group learners and nominate leaders.</p>

        <div className="flex gap-2 mb-4">
          <input className="field py-2.5 text-sm flex-1" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} placeholder="New team name (e.g. Team A)" />
          <button onClick={create} disabled={!name.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-50"><Plus size={15} /> Add</button>
        </div>

        {!groups ? <Spinner /> : groups.length === 0 ? (
          <p className="text-center text-sub py-8">No teams yet. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => {
              const memberIds = new Set(g.members.map((m) => m.userId));
              const available = learners.filter((l) => !memberIds.has(l.id));
              return (
                <div key={g.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-navy">{g.name}</span>
                    <button onClick={() => delGroup(g.id)} className="text-red-500"><Trash2 size={15} /></button>
                  </div>
                  <div className="space-y-2">
                    {g.members.length === 0 && <p className="text-xs text-sub">No members yet.</p>}
                    {g.members.map((m) => (
                      <div key={m.userId} className="flex items-center gap-2">
                        <Avatar name={m.name} src={m.avatar} size={32} />
                        <span className="text-sm font-semibold text-navy flex-1 truncate">{m.name}{m.leader && <span className="chip bg-amber-100 text-amber-700 ml-2 inline-flex items-center gap-1"><Crown size={11} /> Leader</span>}</span>
                        <button onClick={() => toggleLeader(g.id, m.userId, !m.leader)} title={m.leader ? 'Remove leader' : 'Make leader'}
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${m.leader ? 'bg-amber-100 text-amber-600' : 'bg-black/[0.05] text-sub'}`}><Crown size={14} /></button>
                        <button onClick={() => removeMember(g.id, m.userId)} className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center text-sub"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                  {pickFor === g.id ? (
                    <div className="mt-3 border-t border-black/5 pt-3">
                      {available.length === 0 ? <p className="text-xs text-sub">All enrolled learners are already in a list.</p> : (
                        <div className="max-h-44 overflow-y-auto space-y-1">
                          {available.map((l) => (
                            <button key={l.id} onClick={() => addMember(g.id, l.id)} className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-black/[0.04] text-left">
                              <Avatar name={l.name} src={l.avatar} size={28} /><span className="text-sm text-navy flex-1 truncate">{l.name}</span><Plus size={15} className="text-brand" />
                            </button>
                          ))}
                        </div>
                      )}
                      <button onClick={() => setPickFor(null)} className="text-sub text-sm font-semibold mt-2">Done</button>
                    </div>
                  ) : (
                    <button onClick={() => setPickFor(g.id)} className="mt-3 text-brand font-bold text-sm flex items-center gap-1"><UserPlus size={15} /> Add member</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
