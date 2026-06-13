import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Send, Users, Crown, ShieldCheck, X, Search, Reply, Pencil, Trash2, SmilePlus, Paperclip, Image as ImageIcon, FileText, MoreVertical } from 'lucide-react';
import { api, CourseGroup, GroupMessage, ChatAuthor, resizeImage, uploadFile, timeAgo } from '../api';
import { Avatar, Spinner } from '../components/ui';
import { Member, findMentions, MentionText } from '../components/mentions';
import { useAuth } from '../auth';

interface GroupInfo extends CourseGroup { courseTitle?: string; courseSlug?: string }
const API_HOST = 'https://teli-api.onrender.com';
const EMOJIS = ['👍', '❤️', '😂', '🎉', '🙏', '🔥', '👏', '✅'];
const fileHref = (u: string) => (u.startsWith('http') ? u : API_HOST + u);

function RoleTag({ a }: { a: ChatAuthor | null }) {
  if (!a) return null;
  if (a.role === 'super_admin') return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-white bg-navy px-1.5 py-0.5 rounded-full"><ShieldCheck size={10} /> Super Admin</span>;
  if (a.role === 'admin') return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand bg-brand-50 px-1.5 py-0.5 rounded-full"><ShieldCheck size={10} /> Admin</span>;
  return <span className="text-[10px] font-bold text-sub bg-black/[0.05] px-1.5 py-0.5 rounded-full">Learner</span>;
}

export default function TeamChat() {
  const { groupId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [info, setInfo] = useState<{ group: GroupInfo; isMember: boolean; canManage: boolean } | null>(null);
  const [messages, setMessages] = useState<GroupMessage[] | null>(null);
  const [roster, setRoster] = useState(false);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [editing, setEditing] = useState<GroupMessage | null>(null);
  const [emojiFor, setEmojiFor] = useState<number | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const members: Member[] = (info?.group.members || []).map((m) => ({ id: m.userId, name: m.name, avatar: m.avatar, role: m.role || 'learner' }));

  const loadInfo = () => api.get<{ group: GroupInfo; isMember: boolean; canManage: boolean }>(`/groups/${groupId}`).then(setInfo).catch(() => nav(-1));
  const loadMsgs = () => api.get<{ messages: GroupMessage[] }>(`/groups/${groupId}/messages`).then((d) => setMessages(d.messages));
  useEffect(() => { loadInfo(); loadMsgs(); }, [groupId]);
  useEffect(() => { if (!searching) endRef.current?.scrollIntoView(); }, [messages?.length, searching]);

  const join = async () => { await api.post(`/groups/${groupId}/join`); loadInfo(); };
  const react = async (id: number, emoji: string) => { setEmojiFor(null); await api.post(`/groups/messages/${id}/react`, { emoji }); loadMsgs(); };
  const del = async (id: number) => { setMenuFor(null); if (!confirm('Delete this message?')) return; await api.del(`/groups/messages/${id}`); loadMsgs(); };

  if (!info) return <Spinner />;
  const g = info.group;
  const shown = q.trim() ? (messages || []).filter((m) => (m.body || '').toLowerCase().includes(q.toLowerCase())) : (messages || []);

  return (
    <div className="flex flex-col min-h-full">
      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.05]">
        <button onClick={() => nav(-1)} className="text-navy"><ChevronLeft size={22} /></button>
        {searching ? (
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages…" className="flex-1 bg-transparent outline-none text-[15px]" />
        ) : (
          <button onClick={() => setRoster(true)} className="flex-1 min-w-0 text-left">
            <h1 className="font-bold text-navy leading-tight truncate">{g.name}</h1>
            <p className="text-xs text-sub truncate">{g.courseTitle} · {g.members.length} members</p>
          </button>
        )}
        {info.canManage && !info.isMember && !searching && <button onClick={join} className="chip bg-brand text-white">Join</button>}
        <button onClick={() => { setSearching((s) => !s); setQ(''); }} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center text-navy">{searching ? <X size={18} /> : <Search size={18} />}</button>
        {!searching && <button onClick={() => setRoster(true)} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center text-navy"><Users size={18} /></button>}
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5" onClick={() => { setEmojiFor(null); setMenuFor(null); }}>
        {!messages ? <Spinner /> : shown.length === 0 ? (
          <div className="text-center text-sub py-10">{q ? 'No messages match your search.' : <><Users size={32} className="mx-auto text-brand mb-2" />No messages yet. Say hello to your team! 👋</>}</div>
        ) : shown.map((m) => {
          const mine = m.author?.id === user?.id;
          return (
            <Bubble key={m.id} m={m} mine={mine} members={members} canManage={info.canManage}
              onReply={() => setReplyTo(m)} onEdit={() => setEditing(m)} onDelete={() => del(m.id)}
              onReact={(e) => react(m.id, e)} emojiOpen={emojiFor === m.id} setEmojiOpen={(v) => setEmojiFor(v ? m.id : null)}
              menuOpen={menuFor === m.id} setMenuOpen={(v) => setMenuFor(v ? m.id : null)} />
          );
        })}
        <div ref={endRef} />
      </div>

      <Composer groupId={groupId!} members={members} replyTo={replyTo} editing={editing}
        onClearReply={() => setReplyTo(null)} onClearEdit={() => setEditing(null)} onSent={() => { setReplyTo(null); setEditing(null); loadMsgs(); }} />

      {roster && (
        <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={() => setRoster(false)}>
          <div className="bg-white w-full rounded-t-3xl p-5 fade-up max-h-[80%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-extrabold text-navy">{g.name} · members</h2>
              <button onClick={() => setRoster(false)} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              {g.members.map((m) => (
                <div key={m.userId} className="flex items-center gap-3">
                  <Avatar name={m.name} src={m.avatar} size={36} />
                  <span className="font-semibold text-navy flex-1 truncate">{m.name}{m.userId === user?.id ? ' (you)' : ''}</span>
                  {m.leader && <span className="chip bg-amber-100 text-amber-700 inline-flex items-center gap-1"><Crown size={11} /> Leader</span>}
                  <RoleTag a={{ id: m.userId, name: m.name, avatar: m.avatar, role: (m.role as any) || 'learner', staff: m.role !== 'learner' }} />
                  {m.userId !== user?.id && <button onClick={() => nav(`/messages/${m.userId}`)} className="text-brand"><Send size={16} /></button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ m, mine, members, canManage, onReply, onEdit, onDelete, onReact, emojiOpen, setEmojiOpen, menuOpen, setMenuOpen }: {
  m: GroupMessage; mine: boolean; members: Member[]; canManage: boolean;
  onReply: () => void; onEdit: () => void; onDelete: () => void; onReact: (e: string) => void;
  emojiOpen: boolean; setEmojiOpen: (v: boolean) => void; menuOpen: boolean; setMenuOpen: (v: boolean) => void;
}) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[82%] relative" onClick={(e) => e.stopPropagation()}>
        <div className={`rounded-2xl px-3 py-2 ${mine ? 'bg-brand text-white' : 'bg-black/[0.05] text-navy'}`}>
          {!mine && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] font-bold text-navy">{m.author?.name}</span>
              {m.author?.leader && <Crown size={10} className="text-amber-500" />}
              <RoleTag a={m.author} />
            </div>
          )}
          {m.replyTo && (
            <div className={`text-xs rounded-lg px-2 py-1 mb-1 border-l-2 ${mine ? 'bg-white/15 border-white/60' : 'bg-black/[0.04] border-brand'}`}>
              <p className="font-bold opacity-90">{m.replyTo.author}</p>
              <p className="opacity-80 line-clamp-2">{m.replyTo.body}</p>
            </div>
          )}
          {m.image && <img src={fileHref(m.image)} alt="" className="rounded-lg mb-1 max-h-72 w-auto" />}
          {m.fileUrl && (
            <a href={fileHref(m.fileUrl)} target="_blank" rel="noreferrer" className={`flex items-center gap-2 rounded-lg px-2 py-1.5 mb-1 ${mine ? 'bg-white/15' : 'bg-black/[0.05]'}`}>
              <FileText size={18} className="shrink-0" /><span className="text-sm truncate">{m.fileName || 'Document'}</span>
            </a>
          )}
          {m.body && <p className="text-[15px] whitespace-pre-wrap break-words"><MentionText text={m.body} members={members} /></p>}
          <p className={`text-[10px] mt-0.5 ${mine ? 'text-white/70' : 'text-sub'}`}>{timeAgo(m.createdAt)}{m.editedAt ? ' · edited' : ''}</p>
        </div>

        {m.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${mine ? 'justify-end' : ''}`}>
            {m.reactions.map((r) => (
              <button key={r.emoji} onClick={() => onReact(r.emoji)} className={`text-xs rounded-full px-1.5 py-0.5 border ${r.mine ? 'bg-brand-50 border-brand/40' : 'bg-white border-black/10'}`}>{r.emoji} {r.count}</button>
            ))}
          </div>
        )}

        {/* action row */}
        <div className={`absolute -top-2 ${mine ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} flex items-center gap-1`}>
          <button onClick={() => setEmojiOpen(!emojiOpen)} className="w-7 h-7 rounded-full bg-white shadow ring-1 ring-black/5 flex items-center justify-center text-sub"><SmilePlus size={14} /></button>
          <button onClick={onReply} className="w-7 h-7 rounded-full bg-white shadow ring-1 ring-black/5 flex items-center justify-center text-sub"><Reply size={14} /></button>
          {(mine || canManage) && <button onClick={() => setMenuOpen(!menuOpen)} className="w-7 h-7 rounded-full bg-white shadow ring-1 ring-black/5 flex items-center justify-center text-sub"><MoreVertical size={14} /></button>}
        </div>

        {emojiOpen && (
          <div className={`absolute z-30 -top-10 ${mine ? 'right-0' : 'left-0'} bg-white rounded-full shadow-xl ring-1 ring-black/10 px-2 py-1 flex gap-1`}>
            {EMOJIS.map((e) => <button key={e} onClick={() => onReact(e)} className="text-lg hover:scale-125 transition">{e}</button>)}
          </div>
        )}
        {menuOpen && (
          <div className={`absolute z-30 top-6 ${mine ? 'right-0' : 'left-0'} bg-white rounded-xl shadow-xl ring-1 ring-black/10 py-1 w-32`}>
            {mine && <button onClick={() => { setMenuOpen(false); onEdit(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-navy hover:bg-black/[0.04]"><Pencil size={14} /> Edit</button>}
            <button onClick={onDelete} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-black/[0.04]"><Trash2 size={14} /> Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Composer({ groupId, members, replyTo, editing, onClearReply, onClearEdit, onSent }: {
  groupId: string; members: Member[]; replyTo: GroupMessage | null; editing: GroupMessage | null;
  onClearReply: () => void; onClearEdit: () => void; onSent: () => void;
}) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<{ url: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) { setText(editing.body); setImage(null); setFile(null); taRef.current?.focus(); } }, [editing]);
  // auto-grow textarea
  useEffect(() => { const ta = taRef.current; if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; } }, [text]);

  const send = async () => {
    if (!text.trim() && !image && !file && !editing) return;
    setBusy(true);
    try {
      if (editing) {
        await api.put(`/groups/messages/${editing.id}`, { body: text });
      } else {
        await api.post(`/groups/${groupId}/messages`, {
          body: text, parentId: replyTo?.id || null, image,
          fileUrl: file?.url || null, fileName: file?.name || null,
          mentions: findMentions(text, members),
        });
      }
      setText(''); setImage(null); setFile(null); onSent();
    } finally { setBusy(false); }
  };

  return (
    <div className="sticky bottom-0 bg-white border-t border-black/[0.06]">
      {(replyTo || editing) && (
        <div className="flex items-center gap-2 px-4 pt-2">
          <div className="flex-1 min-w-0 border-l-2 border-brand pl-2 text-xs">
            <p className="font-bold text-brand">{editing ? 'Editing message' : `Replying to ${replyTo?.author?.name}`}</p>
            <p className="text-sub truncate">{editing ? editing.body : replyTo?.body || 'Attachment'}</p>
          </div>
          <button onClick={() => { editing ? onClearEdit() : onClearReply(); setText(''); }} className="text-sub"><X size={16} /></button>
        </div>
      )}
      {(image || file) && (
        <div className="px-4 pt-2 flex items-center gap-2">
          {image && <img src={image} alt="" className="h-14 w-14 rounded-lg object-cover" />}
          {file && <span className="text-sm text-navy flex items-center gap-1"><FileText size={16} /> {file.name}</span>}
          <button onClick={() => { setImage(null); setFile(null); }} className="text-sub"><X size={16} /></button>
        </div>
      )}
      <div className="px-3 py-2.5 flex items-end gap-1.5">
        {!editing && (
          <>
            <button onClick={() => imgRef.current?.click()} className="w-10 h-10 rounded-full flex items-center justify-center text-sub hover:bg-black/[0.05] shrink-0"><ImageIcon size={20} /></button>
            <button onClick={() => docRef.current?.click()} className="w-10 h-10 rounded-full flex items-center justify-center text-sub hover:bg-black/[0.05] shrink-0"><Paperclip size={20} /></button>
            <input ref={imgRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImage(await resizeImage(f, 1280)); }} />
            <input ref={docRef} type="file" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await uploadFile(f); setFile({ url, name: f.name }); } }} />
          </>
        )}
        <textarea ref={taRef} value={text} onChange={(e) => setText(e.target.value)} rows={1}
          placeholder="Message… (Enter for new line)" className="field flex-1 py-2.5 resize-none leading-snug" />
        <button onClick={send} disabled={busy || (!text.trim() && !image && !file)} className="w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center disabled:opacity-50 shrink-0"><Send size={18} /></button>
      </div>
    </div>
  );
}
