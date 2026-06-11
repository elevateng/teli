import { useEffect, useState } from 'react';
import { LifeBuoy, ChevronRight } from 'lucide-react';
import { api, Ticket } from '../../api';
import { StatusBar, Spinner } from '../../components/ui';
import { TicketThread } from '../Support';

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-brand-50 text-brand', pending: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700', closed: 'bg-black/[0.06] text-sub',
};

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState<Ticket | null>(null);

  const load = () => api.get<{ tickets: Ticket[] }>('/admin/tickets').then((d) => setTickets(d.tickets));
  useEffect(() => { load(); }, []);

  if (active) return <TicketThread ticket={active} admin onBack={() => { setActive(null); load(); }} />;

  const filtered = (tickets || []).filter((t) => filter === 'all' || t.status === filter);

  return (
    <div className="pb-6">
      <StatusBar />
      <div className="px-5 pt-3">
        <h1 className="text-[26px] font-extrabold text-navy">Support Inbox</h1>
        <p className="text-sub text-sm">{tickets?.filter((t) => t.status === 'open' || t.status === 'pending').length ?? 0} open / pending</p>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 mt-4">
        {['all', 'open', 'pending', 'resolved', 'closed'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`chip whitespace-nowrap border ${filter === s ? 'bg-brand text-white border-brand' : 'bg-white text-navy border-black/10'}`}>{s}</button>
        ))}
      </div>

      <div className="px-5 mt-4 space-y-3">
        {!tickets ? <Spinner /> : filtered.length === 0 ? (
          <div className="card p-8 text-center text-sub"><LifeBuoy size={32} className="mx-auto text-brand mb-2" />No tickets here.</div>
        ) : filtered.map((t) => (
          <button key={t.id} onClick={() => setActive(t)} className="w-full card p-4 text-left flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`chip ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                {t.priority === 'high' && <span className="chip bg-red-100 text-red-600">high</span>}
                <span className="text-xs text-sub">{t.category}</span>
              </div>
              <p className="font-bold text-navy mt-1.5 leading-tight truncate">{t.subject}</p>
              <p className="text-xs text-sub truncate">{t.user?.name} · {t.messages[t.messages.length - 1]?.body}</p>
            </div>
            <ChevronRight size={20} className="text-sub" />
          </button>
        ))}
      </div>
    </div>
  );
}
