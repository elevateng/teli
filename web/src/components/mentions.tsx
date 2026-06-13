import { useRef, useState } from 'react';
import { Avatar } from './ui';

export interface Member { id: number; name: string; avatar: string | null; role: string }
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Resolve which members are @mentioned in a piece of text → their ids.
export function findMentions(text: string, members: Member[]): number[] {
  const ids = members.filter((m) => text.includes('@' + m.name)).map((m) => m.id);
  return [...new Set(ids)];
}

// Render text with @mentions of known members highlighted.
export function MentionText({ text, members }: { text: string; members: Member[] }) {
  if (!members.length || !text.includes('@')) return <>{text}</>;
  const names = members.map((m) => m.name).sort((a, b) => b.length - a.length).map(escapeRe);
  const re = new RegExp('@(' + names.join('|') + ')', 'g');
  const out: React.ReactNode[] = []; let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<span key={m.index} className="text-brand font-semibold">@{m[1]}</span>);
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

// Textarea with an @mention autocomplete dropdown.
export function MentionInput({ value, onChange, members, placeholder, rows = 2, className = '', onEnter }: {
  value: string; onChange: (v: string) => void; members: Member[]; placeholder?: string; rows?: number; className?: string; onEnter?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);

  const detect = (text: string) => {
    const el = ref.current; if (!el) { setQuery(null); return; }
    const upto = text.slice(0, el.selectionStart);
    const mm = upto.match(/(?:^|\s)@([\w]*)$/);
    setQuery(mm ? mm[1] : null);
  };
  const pick = (member: Member) => {
    const el = ref.current; if (!el) return;
    const caret = el.selectionStart;
    const upto = value.slice(0, caret).replace(/(^|\s)@([\w]*)$/, (_f, pre) => `${pre}@${member.name} `);
    onChange(upto + value.slice(caret)); setQuery(null);
    setTimeout(() => ref.current?.focus(), 0);
  };
  const matches = query != null ? members.filter((m) => m.name.toLowerCase().includes(query!.toLowerCase())).slice(0, 6) : [];

  return (
    <div className="relative flex-1">
      <textarea ref={ref} value={value} rows={rows} placeholder={placeholder} className={className}
        onChange={(e) => { onChange(e.target.value); detect(e.target.value); }}
        onKeyUp={(e) => detect((e.target as HTMLTextAreaElement).value)}
        onKeyDown={(e) => { if (onEnter && e.key === 'Enter' && !e.shiftKey && query == null) { e.preventDefault(); onEnter(); } }} />
      {matches.length > 0 && (
        <div className="absolute z-[70] left-0 right-0 bottom-full mb-1 bg-white rounded-xl shadow-xl ring-1 ring-black/10 max-h-52 overflow-y-auto">
          {matches.map((m) => (
            <button key={m.id} type="button" onMouseDown={(e) => { e.preventDefault(); pick(m); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/[0.05] text-left">
              <Avatar name={m.name} src={m.avatar} size={26} /><span className="text-sm text-navy flex-1 truncate">{m.name}</span>
              {m.role !== 'learner' && <span className="text-[10px] font-bold text-brand">{m.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
