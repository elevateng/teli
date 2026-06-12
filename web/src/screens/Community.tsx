import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, MessageCircle, Send, Image as ImageIcon, X, Pin, Trash2, ShieldCheck, Users, ChevronRight, ChevronLeft, Megaphone, HelpCircle, Trophy, MessagesSquare } from 'lucide-react';
import { api, CommunityPost, CommunityComment, PostAuthor, resizeImage, timeAgo } from '../api';
import { Avatar, Spinner, StatusBar, CourseThumb } from '../components/ui';
import { useAuth } from '../auth';

interface CommunitySummary { slug: string; title: string; icon: string; color: string; image: string | null; posts: number; lastActivity: string | null; }

const CAT_ICON: Record<string, any> = { Discussion: MessagesSquare, Question: HelpCircle, Win: Trophy, Announcement: Megaphone };
const CAT_STYLE: Record<string, string> = {
  Discussion: 'bg-black/[0.05] text-navy', Question: 'bg-indigo-100 text-indigo-700',
  Win: 'bg-emerald-100 text-emerald-700', Announcement: 'bg-amber-100 text-amber-700',
};

export default function Community() {
  const { slug: paramSlug } = useParams();
  const [selected, setSelected] = useState<string | null>(paramSlug || null);

  if (selected) return <CourseCommunity slug={selected} onBack={() => setSelected(null)} />;
  return <CommunityHub onOpen={setSelected} />;
}

function CommunityHub({ onOpen }: { onOpen: (slug: string) => void }) {
  const [items, setItems] = useState<CommunitySummary[] | null>(null);
  useEffect(() => { api.get<{ communities: CommunitySummary[] }>('/me/communities').then((d) => setItems(d.communities)); }, []);

  return (
    <div className="pb-6">
      <StatusBar />
      <div className="px-5 pt-3 flex items-center gap-2">
        <Users size={24} className="text-brand" />
        <div className="flex-1">
          <h1 className="text-[26px] font-extrabold text-navy leading-tight">Communities</h1>
          <p className="text-sub text-sm">Each course has its own space to connect & learn together.</p>
        </div>
      </div>

      <div className="px-5 mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
        {!items ? <Spinner /> : items.length === 0 ? (
          <div className="card p-8 text-center text-sub xl:col-span-2"><Users size={32} className="mx-auto text-brand mb-2" />Enrol in a course to join its community.</div>
        ) : items.map((c) => (
          <button key={c.slug} onClick={() => onOpen(c.slug)} className="w-full card p-4 text-left flex items-center gap-3">
            <CourseThumb icon={c.icon} color={c.color} size={48} image={c.image} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-navy truncate">{c.title}</p>
              <p className="text-xs text-sub">{c.posts} post{c.posts === 1 ? '' : 's'}{c.lastActivity ? ` · active ${timeAgo(c.lastActivity)}` : ''}</p>
            </div>
            <ChevronRight size={20} className="text-sub" />
          </button>
        ))}
      </div>
    </div>
  );
}

function CourseCommunity({ slug, onBack }: { slug: string; onBack: () => void }) {
  const { user } = useAuth();
  const staff = user?.role === 'admin' || user?.role === 'super_admin';
  const [data, setData] = useState<{ course: { title: string }; categories: string[]; posts: CommunityPost[] } | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [open, setOpen] = useState<CommunityPost | null>(null);

  const load = () => {
    const q = filter === 'All' ? '' : `?category=${encodeURIComponent(filter)}`;
    return api.get<{ course: { title: string }; categories: string[]; posts: CommunityPost[] }>(`/courses/${slug}/community${q}`).then(setData);
  };
  useEffect(() => { load(); }, [slug, filter]);

  const patch = (p: CommunityPost) => setData((d) => d && { ...d, posts: d.posts.map((x) => (x.id === p.id ? p : x)) });

  if (open) return <PostThread post={open} staff={staff} slug={slug} onBack={() => { setOpen(null); load(); }} onChange={patch} />;

  const cats = ['All', ...(data?.categories || [])];

  return (
    <div className="pb-6 lg:max-w-[760px] lg:mx-auto">
      <div className="px-5 pt-3 flex items-center gap-2">
        <button onClick={onBack} className="text-navy -ml-1"><ChevronLeft size={24} /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-extrabold text-navy leading-tight truncate">{data?.course.title || 'Community'}</h1>
          <p className="text-sub text-xs">Course community</p>
        </div>
      </div>

      <div className="px-5 mt-3"><Composer slug={slug} staff={staff} categories={data?.categories || []} onPosted={load} /></div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 mt-4">
        {cats.map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`chip whitespace-nowrap border ${filter === c ? 'bg-brand text-white border-brand' : 'bg-white text-navy border-black/10'}`}>{c}</button>
        ))}
      </div>

      <div className="px-5 mt-4 space-y-3">
        {!data ? <Spinner /> : data.posts.length === 0 ? (
          <div className="card p-8 text-center text-sub"><Users size={32} className="mx-auto text-brand mb-2" />No posts yet — start the conversation!</div>
        ) : data.posts.map((p) => (
          <PostCard key={p.id} post={p} staff={staff} meId={user?.id} onChange={patch} onOpen={() => setOpen(p)} onRemoved={load} />
        ))}
      </div>
    </div>
  );
}

function RoleBadge({ author }: { author: PostAuthor | null }) {
  if (!author) return null;
  if (author.role === 'super_admin') return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-white bg-navy px-1.5 py-0.5 rounded-full"><ShieldCheck size={11} /> Super Admin</span>;
  if (author.role === 'admin') return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand bg-brand-50 px-1.5 py-0.5 rounded-full"><ShieldCheck size={11} /> Admin</span>;
  return <span className="text-[10px] font-bold text-sub bg-black/[0.05] px-1.5 py-0.5 rounded-full">Learner</span>;
}

function CatChip({ category }: { category: string }) {
  const Ico = CAT_ICON[category] || MessagesSquare;
  return <span className={`chip inline-flex items-center gap-1 ${CAT_STYLE[category] || CAT_STYLE.Discussion}`}><Ico size={12} /> {category}</span>;
}

function Composer({ slug, staff, categories, onPosted }: { slug: string; staff?: boolean; categories: string[]; onPosted: () => void }) {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('Discussion');
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const choices = categories.filter((c) => c !== 'Announcement' || staff);

  const submit = async () => {
    if (!body.trim() && !image) return;
    setBusy(true);
    try { await api.post(`/courses/${slug}/community`, { body, image, category }); setBody(''); setImage(null); setCategory('Discussion'); onPosted(); }
    finally { setBusy(false); }
  };
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setImage(await resizeImage(f, 1000)); };

  return (
    <div className="card p-3">
      <div className="flex gap-3">
        <Avatar name={user?.fullName} src={user?.avatar} size={40} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share something with the class…"
          className="flex-1 bg-transparent outline-none resize-none text-[15px] pt-1.5 min-h-[44px]" rows={2} />
      </div>
      {image && (
        <div className="relative mt-2 ml-12">
          <img src={image} alt="" className="rounded-xl max-h-52 w-auto" />
          <button onClick={() => setImage(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={15} /></button>
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 pl-12">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="text-xs font-semibold bg-black/[0.05] rounded-lg px-2 py-1.5 outline-none">
          {choices.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 text-sub text-sm font-semibold px-2 py-1.5 rounded-lg hover:bg-black/[0.04]"><ImageIcon size={17} /></button>
        <span className="flex-1" />
        <button onClick={submit} disabled={busy || (!body.trim() && !image)} className="btn-primary px-5 py-2 text-sm disabled:opacity-50">{busy ? 'Posting…' : 'Post'}</button>
      </div>
    </div>
  );
}

function PostCard({ post, staff, meId, onChange, onOpen, onRemoved }: {
  post: CommunityPost; staff?: boolean; meId?: number; onChange: (p: CommunityPost) => void; onOpen: () => void; onRemoved: () => void;
}) {
  const like = async () => { const { post: p } = await api.post<{ post: CommunityPost }>(`/community/${post.id}/like`); onChange(p); };
  const pin = async () => { await api.post(`/community/${post.id}/pin`); onRemoved(); };
  const remove = async () => { if (!confirm('Delete this post?')) return; await api.del(`/community/${post.id}`); onRemoved(); };
  const canDelete = staff || post.author?.id === meId;

  return (
    <div className={`card p-4 ${post.category === 'Announcement' ? 'ring-1 ring-amber-300 bg-amber-50/40' : ''}`}>
      {post.pinned && <div className="flex items-center gap-1 text-[11px] font-bold text-brand mb-2"><Pin size={12} /> Pinned</div>}
      <div className="flex items-center gap-3">
        <Avatar name={post.author?.name} src={post.author?.avatar} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-navy truncate">{post.author?.name || 'Member'}</span>
            <RoleBadge author={post.author} />
          </div>
          <p className="text-xs text-sub">{timeAgo(post.createdAt)}</p>
        </div>
        {(staff || canDelete) && (
          <div className="flex items-center gap-1">
            {staff && <button onClick={pin} className="w-8 h-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center text-sub" title="Pin"><Pin size={16} className={post.pinned ? 'text-brand' : ''} /></button>}
            {canDelete && <button onClick={remove} className="w-8 h-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center text-sub" title="Delete"><Trash2 size={16} /></button>}
          </div>
        )}
      </div>

      <div className="mt-2"><CatChip category={post.category} /></div>
      {post.body && <p className="text-navy mt-2 whitespace-pre-wrap leading-relaxed">{post.body}</p>}
      {post.image && <img src={post.image} alt="" className="rounded-xl mt-3 w-full object-cover" />}

      <div className="flex items-center gap-5 mt-3 pt-3 border-t border-black/5">
        <button onClick={like} className={`flex items-center gap-1.5 text-sm font-semibold ${post.liked ? 'text-brand' : 'text-sub'}`}>
          <Heart size={18} className={post.liked ? 'fill-brand' : ''} /> {post.likes > 0 && post.likes}
        </button>
        <button onClick={onOpen} className="flex items-center gap-1.5 text-sm font-semibold text-sub">
          <MessageCircle size={18} /> {post.comments > 0 ? post.comments : ''} <span>Comment</span>
        </button>
      </div>
    </div>
  );
}

function PostThread({ post, staff, slug, onBack, onChange }: { post: CommunityPost; staff?: boolean; slug: string; onBack: () => void; onChange: (p: CommunityPost) => void; }) {
  const { user } = useAuth();
  const [data, setData] = useState<{ post: CommunityPost; comments: CommunityComment[] } | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get<{ post: CommunityPost; comments: CommunityComment[] }>(`/community/${post.id}`).then((d) => { setData(d); onChange(d.post); });
  useEffect(() => { load(); }, [post.id]);

  const like = async () => { const { post: p } = await api.post<{ post: CommunityPost }>(`/community/${post.id}/like`); setData((d) => d && { ...d, post: p }); onChange(p); };
  const comment = async () => {
    if (!body.trim()) return; setBusy(true);
    try { await api.post(`/community/${post.id}/comments`, { body }); setBody(''); await load(); }
    finally { setBusy(false); }
  };
  const delComment = async (id: number) => { await api.del(`/community/comments/${id}`); load(); };

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.05]">
        <button onClick={onBack} className="text-navy"><ChevronLeft size={22} /></button>
        <h1 className="flex-1 font-bold text-navy">Post</h1>
      </div>

      {!data ? <Spinner /> : (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Avatar name={data.post.author?.name} src={data.post.author?.avatar} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap"><span className="font-bold text-navy truncate">{data.post.author?.name}</span><RoleBadge author={data.post.author} /></div>
                  <p className="text-xs text-sub">{timeAgo(data.post.createdAt)}</p>
                </div>
              </div>
              <div className="mt-2"><CatChip category={data.post.category} /></div>
              {data.post.body && <p className="text-navy mt-2 whitespace-pre-wrap leading-relaxed">{data.post.body}</p>}
              {data.post.image && <img src={data.post.image} alt="" className="rounded-xl mt-3 w-full" />}
              <button onClick={like} className={`flex items-center gap-1.5 text-sm font-semibold mt-3 ${data.post.liked ? 'text-brand' : 'text-sub'}`}>
                <Heart size={18} className={data.post.liked ? 'fill-brand' : ''} /> {data.post.likes} {data.post.likes === 1 ? 'like' : 'likes'}
              </button>
            </div>

            <div className="border-t border-black/[0.06] px-4 py-3 space-y-4">
              <p className="text-sm font-bold text-sub">{data.comments.length} {data.comments.length === 1 ? 'Comment' : 'Comments'}</p>
              {data.comments.map((c) => {
                const mine = c.userId === user?.id;
                return (
                  <div key={c.id} className="flex gap-3">
                    <Avatar name={c.author?.name} src={c.author?.avatar} size={34} />
                    <div className="flex-1">
                      <div className="bg-black/[0.04] rounded-2xl px-3.5 py-2">
                        <div className="flex items-center gap-1.5 flex-wrap"><span className="font-bold text-navy text-sm">{c.author?.name}</span><RoleBadge author={c.author} /></div>
                        <p className="text-navy text-[15px] whitespace-pre-wrap">{c.body}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 pl-2">
                        <span className="text-[11px] text-sub">{timeAgo(c.createdAt)}</span>
                        {(mine || staff) && <button onClick={() => delComment(c.id)} className="text-[11px] text-sub font-semibold">Delete</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-black/[0.06] px-4 py-3 flex items-center gap-2">
            <Avatar name={user?.fullName} src={user?.avatar} size={34} />
            <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && comment()}
              placeholder="Write a comment…" className="field flex-1 py-2.5" />
            <button onClick={comment} disabled={busy || !body.trim()} className="w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center disabled:opacity-50"><Send size={18} /></button>
          </div>
        </>
      )}
    </div>
  );
}
