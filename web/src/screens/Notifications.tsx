import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, BellOff, CheckCircle2, CreditCard, Award, LifeBuoy, Info, Sparkles } from 'lucide-react';
import { api, AppNotification } from '../api';
import { TopBar, Spinner } from '../components/ui';

const ICON: Record<string, { icon: any; bg: string; fg: string }> = {
  success: { icon: CheckCircle2, bg: 'bg-emerald-100', fg: 'text-emerald-600' },
  payment: { icon: CreditCard, bg: 'bg-violet-100', fg: 'text-violet-600' },
  certificate: { icon: Award, bg: 'bg-amber-100', fg: 'text-amber-600' },
  ticket: { icon: LifeBuoy, bg: 'bg-brand-50', fg: 'text-brand' },
  system: { icon: Sparkles, bg: 'bg-indigo-100', fg: 'text-indigo-600' },
  info: { icon: Info, bg: 'bg-black/[0.05]', fg: 'text-navy' },
};

export default function Notifications() {
  const nav = useNavigate();
  const [items, setItems] = useState<AppNotification[] | null>(null);

  const load = () => api.get<{ notifications: AppNotification[] }>('/notifications').then((d) => setItems(d.notifications));
  useEffect(() => { load(); }, []);

  const markAll = async () => { await api.post('/notifications/read', {}); load(); };
  const openOne = async (n: AppNotification) => {
    if (!n.read) await api.post('/notifications/read', { id: n.id });
    if (n.link) nav(n.link); else load();
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Notifications" onBack={() => nav(-1)}
        right={items && items.some((n) => !n.read) ? <button onClick={markAll} className="text-brand font-bold text-sm flex items-center gap-1"><CheckCheck size={16} /> Mark all</button> : undefined} />
      <div className="px-5 py-4 flex-1">
        {!items ? <Spinner /> : items.length === 0 ? (
          <div className="card p-10 text-center text-sub"><BellOff size={36} className="mx-auto text-sub mb-2" />You're all caught up.</div>
        ) : (
          <div className="space-y-2.5">
            {items.map((n) => {
              const cfg = ICON[n.type] || ICON.info;
              const Ico = cfg.icon;
              return (
                <button key={n.id} onClick={() => openOne(n)}
                  className={`w-full card p-4 flex gap-3 text-left ${n.read ? '' : 'border-brand/30 bg-brand-50/30'}`}>
                  <span className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center shrink-0`}><Ico size={20} className={cfg.fg} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-navy text-sm leading-tight">{n.title}</p>
                    {n.body && <p className="text-xs text-sub mt-0.5">{n.body}</p>}
                    <p className="text-[11px] text-sub mt-1">{n.at}</p>
                  </div>
                  {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-brand shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
