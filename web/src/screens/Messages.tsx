import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Send, MessageSquare, ShieldCheck } from 'lucide-react';
import { api, DMConversation, DMMessage, ChatAuthor, timeAgo } from '../api';
import { Avatar, Spinner, TopBar } from '../components/ui';

function RoleTag({ a }: { a: ChatAuthor | null }) {
  if (!a || a.role === 'learner') return null;
  return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand bg-brand-50 px-1.5 py-0.5 rounded-full"><ShieldCheck size={10} /> {a.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span>;
}

export default function Messages() {
  const { userId } = useParams();
  if (userId) return <DMThread userId={userId} />;
  return <DMInbox />;
}

function DMInbox() {
  const nav = useNavigate();
  const [items, setItems] = useState<DMConversation[] | null>(null);
  useEffect(() => { api.get<{ conversations: DMConversation[] }>('/dm').then((d) => setItems(d.conversations)); }, []);

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Messages" subtitle="Direct messages" onBack={() => nav(-1)} />
      <div className="px-5 py-4 flex-1">
        {!items ? <Spinner /> : items.length === 0 ? (
          <div className="card p-8 text-center text-sub"><MessageSquare size={32} className="mx-auto text-brand mb-2" />No messages yet.</div>
        ) : (
          <div className="space-y-2">
            {items.map((c) => c.user && (
              <button key={c.user.id} onClick={() => nav(`/messages/${c.user!.id}`)} className="w-full card p-3.5 flex items-center gap-3 text-left">
                <Avatar name={c.user.name} src={c.user.avatar} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5"><span className="font-bold text-navy truncate">{c.user.name}</span><RoleTag a={c.user} /></div>
                  <p className="text-xs text-sub truncate">{c.last.mine ? 'You: ' : ''}{c.last.body}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-sub">{timeAgo(c.last.createdAt)}</p>
                  {c.unread > 0 && <span className="inline-block mt-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[11px] font-bold leading-[18px] text-center">{c.unread}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DMThread({ userId }: { userId: string }) {
  const nav = useNavigate();
  const [data, setData] = useState<{ user: ChatAuthor | null; messages: DMMessage[] } | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = () => api.get<{ user: ChatAuthor | null; messages: DMMessage[] }>(`/dm/${userId}`).then(setData).catch(() => nav('/messages'));
  useEffect(() => { load(); }, [userId]);
  useEffect(() => { endRef.current?.scrollIntoView(); }, [data?.messages.length]);

  const send = async () => {
    if (!body.trim()) return;
    const text = body; setBody(''); setBusy(true);
    try { await api.post(`/dm/${userId}`, { body: text }); await load(); } finally { setBusy(false); }
  };

  if (!data) return <Spinner />;

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.05]">
        <button onClick={() => nav('/messages')} className="text-navy"><ChevronLeft size={22} /></button>
        <Avatar name={data.user?.name} src={data.user?.avatar} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5"><h1 className="font-bold text-navy truncate">{data.user?.name}</h1><RoleTag a={data.user} /></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {data.messages.length === 0 && <p className="text-center text-sub text-sm py-10">Start the conversation.</p>}
        {data.messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.mine ? 'bg-brand text-white' : 'bg-black/[0.05] text-navy'}`}>
              <p className="text-[15px] whitespace-pre-wrap">{m.body}</p>
              <p className={`text-[10px] mt-0.5 ${m.mine ? 'text-white/70' : 'text-sub'}`}>{timeAgo(m.createdAt)}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 bg-white border-t border-black/[0.06] px-4 py-3 flex items-center gap-2">
        <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message…" className="field flex-1 py-3" />
        <button onClick={send} disabled={busy || !body.trim()} className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center disabled:opacity-50"><Send size={18} /></button>
      </div>
    </div>
  );
}
