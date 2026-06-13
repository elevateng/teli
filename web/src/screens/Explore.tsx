import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, SlidersHorizontal, Clock, SignalHigh, Bookmark, X, Check, Ticket, ChevronRight } from 'lucide-react';
import { api, CourseCard, naira } from '../api';
import { StatusBar, Wordmark, CourseThumb, Spinner } from '../components/ui';
import Bell from '../components/Bell';

const SORTS = [
  { k: 'popular', label: 'Most popular' },
  { k: 'rating', label: 'Highest rated' },
  { k: 'price', label: 'Lowest price' },
];
const LEVELS = ['All levels', 'Beginner', 'Intermediate', 'Advanced'];

export default function Explore() {
  const nav = useNavigate();
  const [cats, setCats] = useState<string[]>([]);
  const [active, setActive] = useState('All Courses');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('popular');
  const [level, setLevel] = useState('All levels');
  const [showFilter, setShowFilter] = useState(false);
  const [courses, setCourses] = useState<CourseCard[] | null>(null);

  useEffect(() => { api.get<{ categories: string[] }>('/categories').then((d) => setCats(['All Courses', ...d.categories])); }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (active !== 'All Courses') params.set('category', active);
      if (q) params.set('q', q);
      if (sort) params.set('sort', sort);
      api.get<{ courses: CourseCard[] }>(`/courses?${params}`).then((d) =>
        setCourses(level === 'All levels' ? d.courses : d.courses.filter((c) => c.level === level)));
    }, 200);
    return () => clearTimeout(t);
  }, [active, q, sort, level]);

  const sortLabel = SORTS.find((s) => s.k === sort)?.label || 'Most popular';

  const toggleSave = async (c: CourseCard, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const { saved } = await api.post<{ saved: boolean }>(`/courses/${c.id}/save`);
    setCourses((cs) => (cs || []).map((x) => (x.id === c.id ? { ...x, saved } : x)));
  };

  return (
    <div className="pb-6">
      <StatusBar />
      <div className="flex items-center justify-between px-5 pt-2">
        <button onClick={() => nav('/learning')}><Menu size={26} className="text-navy" /></button>
        <Wordmark />
        <Bell />
      </div>

      <div className="px-5 mt-4">
        <h1 className="text-[30px] font-extrabold text-navy">Explore Courses</h1>
        <p className="text-sub mt-1 max-w-[18rem]">Discover practical courses to grow your skills and elevate impact.</p>
      </div>

      <div className="px-5 mt-4 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-black/[0.04] rounded-2xl px-4 py-3.5">
          <Search size={20} className="text-sub" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for courses, skills or topics…"
            className="flex-1 bg-transparent outline-none text-[15px]" />
        </div>
        <button onClick={() => setShowFilter(true)} className="flex items-center gap-2 font-semibold text-navy relative">
          <SlidersHorizontal size={20} /> Filter
          {(level !== 'All levels' || sort !== 'popular') && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand rounded-full" />}
        </button>
      </div>

      <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-5 mt-4">
        {cats.map((c) => (
          <button key={c} onClick={() => setActive(c)}
            className={`chip whitespace-nowrap border ${active === c ? 'bg-brand text-white border-brand' : 'bg-white text-navy border-black/10'}`}>
            {c}
          </button>
        ))}
      </div>

      <button onClick={() => nav('/redeem')} className="mx-5 mt-4 w-[calc(100%-2.5rem)] flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3 text-left">
        <Ticket size={20} className="text-brand shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-navy text-sm leading-tight">Have an access code?</p>
          <p className="text-xs text-sub">Unlock a private course you were invited to.</p>
        </div>
        <ChevronRight size={18} className="text-sub" />
      </button>

      <div className="flex items-center justify-between px-5 mt-5">
        <h2 className="text-[19px] font-extrabold text-navy">{active}</h2>
        <button onClick={() => setShowFilter(true)} className="text-sm text-sub">Sort by: <b className="text-navy">{sortLabel}</b></button>
      </div>

      <div className="px-5 mt-3 grid grid-cols-1 xl:grid-cols-2 gap-4">
        {!courses ? <Spinner /> : courses.map((c) => (
          <button key={c.id} onClick={() => nav(`/course/${c.slug}`)} className="w-full card p-4 flex gap-4 text-left">
            <CourseThumb icon={c.icon} color={c.color} size={92} rounded="rounded-2xl" image={c.image} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-navy/70">{c.category}</span>
                <span role="button" tabIndex={0} aria-label={c.saved ? 'Unsave' : 'Save'} onClick={(e) => toggleSave(c, e)}
                  className="p-1 -m-1 cursor-pointer">
                  <Bookmark size={20} className={c.saved ? 'text-brand fill-brand' : 'text-navy/40'} />
                </span>
              </div>
              <h3 className="font-extrabold text-navy leading-tight mt-0.5">{c.title}</h3>
              <p className="text-sm text-sub mt-1 line-clamp-2">{c.summary}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-sub">
                <span className="flex items-center gap-1"><Clock size={14} /> {c.duration}</span>
                <span className="flex items-center gap-1"><SignalHigh size={14} /> {c.level}</span>
                <span className="ml-auto font-extrabold text-navy text-base">{c.price === 0 ? 'Free' : naira(c.price)}</span>
              </div>
            </div>
          </button>
        ))}
        {courses && courses.length === 0 && <p className="text-center text-sub py-10">No courses match your search.</p>}
      </div>

      {showFilter && (
        <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowFilter(false)}>
          <div className="bg-white w-full rounded-t-3xl p-5 fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold text-navy">Filter & Sort</h2>
              <button onClick={() => setShowFilter(false)} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center"><X size={18} /></button>
            </div>
            <p className="text-sm font-bold text-navy mb-2">Sort by</p>
            <div className="space-y-2">
              {SORTS.map((s) => (
                <button key={s.k} onClick={() => setSort(s.k)} className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 ${sort === s.k ? 'border-brand bg-brand-50' : 'border-black/10'}`}>
                  <span className="font-semibold text-navy">{s.label}</span>{sort === s.k && <Check size={18} className="text-brand" />}
                </button>
              ))}
            </div>
            <p className="text-sm font-bold text-navy mt-5 mb-2">Level</p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button key={l} onClick={() => setLevel(l)} className={`chip border ${level === l ? 'bg-brand text-white border-brand' : 'border-black/10 text-navy'}`}>{l}</button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setSort('popular'); setLevel('All levels'); }} className="flex-1 border-2 border-black/10 text-navy font-bold rounded-2xl py-3">Reset</button>
              <button onClick={() => setShowFilter(false)} className="btn-primary flex-1">Show results</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
