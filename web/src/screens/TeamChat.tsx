import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Send, Users, Crown, ShieldCheck, CornerDownRight, X } from 'lucide-react';
import { api, CourseGroup, GroupMessage, ChatAuthor, timeAgo } from '../api';
import { Avatar, Spinner } from '../components/ui';
import { Member, findMentions, MentionText, MentionInput } from '../components/mentions';

interface GroupInfo extends CourseGroup { courseTitle?: string; courseSlug?: string }

function RoleTag({ a }: { a: ChatAuthor | null }) {
  if (!a) return null;
  if (a.role === 'super_admin') return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-white bg-navy px-1.5 py-0.5 rounded-full"><ShieldCheck size={10} /> Super Admin</span>;
  if (a.role === 'admin') return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand bg-brand-50 px-1.5 py-0.5 rounded-full"><ShieldCheck size={10} /> Admin</span>;
  return <span className="text-[10px] font-bold text-sub bg-black/[0.05] px-1.5 py-0.5 rounded-full">Learner</span>;
}

export default function TeamChat() {
  const { groupId } = useParams();
  const nav = useNavigate();
  const [info, setInfo] = useState<{ group: GroupInfo; isMember: boolean; canManage: boolean } | null>(null);
  const [messages, setMessages] = useState<GroupMessage[] | null>(null);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [roster, setRoster] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const members: Member[] = (info?.group.members || []).map((m) => ({ id: m.userId, name: m.name, avatar: m.avatar, role: m.role || 'learner' }));

  const loadInfo = () => api.get<{ group: GroupInfo; isMember: boolean; canManage: boolean }>(`/groups/${groupId}`).then(setInfo).catch(() => nav(-1));
  const loadMsgs = () => api.get<{ messages: GroupMessage[] }>(`/groups/${groupId}/messages`).then((d) => setMessages(d.messages));
  useEffect(() => { loadInfo(); loadMsgs(); }, [groupId]);
  useEffect(() => { endRef.current?.scrollIntoView(); }, [messages?.length]);

  const send = async () => {
    if (!body.trim()) return;
    const text = body; setBody('');
    await api.post(`/groups/${groupId}/messages`, { body: text, parentId: replyTo, mentions: findMentions(text, members) });
    setReplyTo(null); await loadMsgs();
  };
  const join = async () => { await api.post(`/groups/${groupId}/join`); loadInfo(); };

  if (!info) return <Spinner />;
  const g = info.group;

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.05]">
        <button onClick={() => nav(-1)} className="text-navy"><ChevronLeft size={22} /></button>
        <button onClick={() => setRoster(true)} className="flex-1 min-w-0 text-left">
          <h1 className="font-bold text-navy leading-tight truncate">{g.name}</h1>
          <p className="text-xs text-sub truncate">{g.courseTitle} · {g.members.length} members</p>
        </button>
        {info.canManage && !info.isMember && <button onClick={join} className="chip bg-brand text-white">Join</button>}
        <button onClick={() => setRoster(true)} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center text-navy"><Users size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!messages ? <Spinner /> : messages.length === 0 ? (
          <div className="text-center text-sub py-10"><Users size={32} className="mx-auto text-brand mb-2" />No messages yet. Say hello to your team! 👋</div>
        ) : messages.map((m) => (
          <Post key={m.id} m={m} members={members} replyOpen={replyTo === m.id}
            onReply={() => setReplyTo(replyTo === m.id ? null : m.id)}
            onSent={() => { setReplyTo(null); loadMsgs(); }} groupId={groupId!} />
        ))}
        <div ref={endRef} />
      </div>

      {replyTo == null && (
        <div className="sticky bottom-0 bg-white border-t border-black/[0.06] px-4 py-3 flex items-end gap-2">
          <MentionInput value={body} onChange={setBody} members={members} onEnter={send} rows={1}
            placeholder="Message your team… use @ to mention" className="field w-full py-2.5 resize-none" />
          <button onClick={send} disabled={!body.trim()} className="w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center disabled:opacity-50 shrink-0"><Send size={18} /></button>
        </div>
      )}

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
                  <span className="font-semibold text-navy flex-1 truncate">{m.name}</span>
                  {m.leader && <span className="chip bg-amber-100 text-amber-700 inline-flex items-center gap-1"><Crown size={11} /> Leader</span>}
                  <RoleTag a={{ id: m.userId, name: m.name, avatar: m.avatar, role: (m.role as any) || 'learner', staff: m.role !== 'learner' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Post({ m, members, replyOpen, onReply, onSent, groupId }: {
  m: GroupMessage; members: Member[]; replyOpen: boolean; onReply: () => void; onSent: () => void; groupId: string;
}) {
  const [reply, setReply] = useState('');
  const send = async () => {
    if (!reply.trim()) return;
    const text = reply; setReply('');
    await api.post(`/groups/${groupId}/messages`, { body: text, parentId: m.id, mentions: findMentions(text, members) });
    onSent();
  };

  return (
    <div className="card p-3.5">
      <Head a={m.author} time={m.createdAt} />
      <p className="text-navy mt-2 whitespace-pre-wrap leading-relaxed"><MentionText text={m.body} members={members} /></p>

      {(m.replies && m.replies.length > 0) && (
        <div className="mt-3 pl-3 border-l-2 border-black/[0.06] space-y-3">
          {m.replies.map((r) => (
            <div key={r.id}>
              <Head a={r.author} time={r.createdAt} small />
              <p className="text-navy text-[15px] mt-1 whitespace-pre-wrap"><MentionText text={r.body} members={members} /></p>
            </div>
          ))}
        </div>
      )}

      <button onClick={onReply} className="mt-2 text-sub text-xs font-bold flex items-center gap-1 hover:text-brand"><CornerDownRight size={13} /> {replyOpen ? 'Cancel' : 'Reply'}</button>
      {replyOpen && (
        <div className="mt-2 flex items-end gap-2">
          <MentionInput value={reply} onChange={setReply} members={members} onEnter={send} rows={1}
            placeholder="Reply in thread…" className="field w-full py-2 text-sm resize-none" />
          <button onClick={send} disabled={!reply.trim()} className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center disabled:opacity-50 shrink-0"><Send size={16} /></button>
        </div>
      )}
    </div>
  );
}

function Head({ a, time, small }: { a: ChatAuthor | null; time: string; small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar name={a?.name} src={a?.avatar} size={small ? 28 : 34} />
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        <span className="font-bold text-navy text-sm truncate">{a?.name}</span>
        {a?.leader && <Crown size={12} className="text-amber-500" />}
        <RoleTag a={a} />
        <span className="text-[11px] text-sub">· {timeAgo(time)}</span>
      </div>
    </div>
  );
}
