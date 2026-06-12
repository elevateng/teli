import { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Send, Image as ImageIcon, X, Pin, Trash2, ShieldCheck, Users } from 'lucide-react';
import { api, CommunityPost, CommunityComment, resizeImage, timeAgo } from '../api';
import { Avatar, Spinner, StatusBar } from '../components/ui';
import { useAuth } from '../auth';

export default function Community() {
  const { user } = useAuth();
  const staff = user?.role === 'admin' || user?.role === 'super_admin';
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [open, setOpen] = useState<CommunityPost | null>(null);

  const load = () => api.get<{ posts: CommunityPost[] }>('/community').then((d) => setPosts(d.posts));
  useEffect(() => { load(); }, []);

  const patch = (p: CommunityPost) => setPosts((cur) => (cur || []).map((x) => (x.id === p.id ? p : x)));

  if (open) return <PostThread post={open} staff={staff} onBack={() => { setOpen(null); load(); }} onChange={patch} />;

  return (
    <div className="pb-6">
      <StatusBar />
      <div className="px-5 pt-3 flex items-center gap-2">
        <Users size={24} className="text-brand" />
        <div className="flex-1">
          <h1 className="text-[26px] font-extrabold text-navy leading-tight">Community</h1>
          <p className="text-sub text-sm">Share wins, ask questions, learn together.</p>
        </div>
      </div>

      <div className="px-5 mt-4"><Composer onPosted={load} /></div>

      <div className="px-5 mt-4 space-y-3">
        {!posts ? <Spinner /> : posts.length === 0 ? (
          <div className="card p-8 text-center text-sub"><Users size={32} className="mx-auto text-brand mb-2" />Be the first to post something!</div>
        ) : posts.map((p) => (
          <PostCard key={p.id} post={p} staff={staff} meId={user?.id} onChange={patch} onOpen={() => setOpen(p)} onRemoved={load} />
        ))}
      </div>
    </div>
  );
}

function Composer({ onPosted, compact }: { onPosted: () => void; compact?: boolean }) {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!body.trim() && !image) return;
    setBusy(true);
    try { await api.post('/community', { body, image }); setBody(''); setImage(null); onPosted(); }
    finally { setBusy(false); }
  };

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImage(await resizeImage(f, 1000));
  };

  return (
    <div className="card p-3">
      <div className="flex gap-3">
        <Avatar name={user?.fullName} src={user?.avatar} size={compact ? 32 : 40} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share something with the community…"
          className="flex-1 bg-transparent outline-none resize-none text-[15px] pt-1.5 min-h-[44px]" rows={2} />
      </div>
      {image && (
        <div className="relative mt-2 ml-12">
          <img src={image} alt="" className="rounded-xl max-h-52 w-auto" />
          <button onClick={() => setImage(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={15} /></button>
        </div>
      )}
      <div className="flex items-center justify-between mt-2 pl-12">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-sub text-sm font-semibold px-2 py-1.5 rounded-lg hover:bg-black/[0.04]"><ImageIcon size={18} /> Photo</button>
        <button onClick={submit} disabled={busy || (!body.trim() && !image)} className="btn-primary px-5 py-2 text-sm disabled:opacity-50">{busy ? 'Posting…' : 'Post'}</button>
      </div>
    </div>
  );
}

function StaffBadge() {
  return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand bg-brand-50 px-1.5 py-0.5 rounded-full"><ShieldCheck size={11} /> TELI</span>;
}

function PostCard({ post, staff, meId, onChange, onOpen, onRemoved }: {
  post: CommunityPost; staff?: boolean; meId?: number; onChange: (p: CommunityPost) => void; onOpen: () => void; onRemoved: () => void;
}) {
  const like = async () => { const { post: p } = await api.post<{ post: CommunityPost }>(`/community/${post.id}/like`); onChange(p); };
  const pin = async () => { await api.post(`/community/${post.id}/pin`); onRemoved(); };
  const remove = async () => { if (!confirm('Delete this post?')) return; await api.del(`/community/${post.id}`); onRemoved(); };
  const canDelete = staff || post.author?.id === meId;

  return (
    <div className="card p-4">
      {post.pinned && <div className="flex items-center gap-1 text-[11px] font-bold text-brand mb-2"><Pin size={12} /> Pinned</div>}
      <div className="flex items-center gap-3">
        <Avatar name={post.author?.name} src={post.author?.avatar} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-navy truncate">{post.author?.name || 'Member'}</span>
            {post.author?.staff && <StaffBadge />}
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

      {post.body && <p className="text-navy mt-3 whitespace-pre-wrap leading-relaxed">{post.body}</p>}
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

function PostThread({ post, staff, onBack, onChange }: { post: CommunityPost; staff?: boolean; onBack: () => void; onChange: (p: CommunityPost) => void; }) {
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
        <button onClick={onBack} className="text-navy font-bold">← Back</button>
        <h1 className="flex-1 font-bold text-navy">Post</h1>
      </div>

      {!data ? <Spinner /> : (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Avatar name={data.post.author?.name} src={data.post.author?.avatar} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5"><span className="font-bold text-navy truncate">{data.post.author?.name}</span>{data.post.author?.staff && <StaffBadge />}</div>
                  <p className="text-xs text-sub">{timeAgo(data.post.createdAt)}</p>
                </div>
              </div>
              {data.post.body && <p className="text-navy mt-3 whitespace-pre-wrap leading-relaxed">{data.post.body}</p>}
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
                        <div className="flex items-center gap-1.5"><span className="font-bold text-navy text-sm">{c.author?.name}</span>{c.author?.staff && <StaffBadge />}</div>
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
