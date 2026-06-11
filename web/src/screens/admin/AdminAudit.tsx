import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import { api, AuditEvent } from '../../api';
import { TopBar, Spinner } from '../../components/ui';

const ACTION_STYLE: Record<string, string> = {
  'user.role': 'bg-navy text-white', 'user.delete': 'bg-red-100 text-red-600',
  'user.create': 'bg-emerald-100 text-emerald-700', 'user.suspend': 'bg-amber-100 text-amber-700',
  'course.delete': 'bg-red-100 text-red-600', 'coupon.create': 'bg-violet-100 text-violet-700',
};

export default function AdminAudit() {
  const nav = useNavigate();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  useEffect(() => { api.get<{ events: AuditEvent[] }>('/admin/audit').then((d) => setEvents(d.events)); }, []);

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Audit Log" subtitle="Recent admin activity" onBack={() => nav('/admin')} />
      <div className="px-5 py-4">
        {!events ? <Spinner /> : events.length === 0 ? (
          <div className="card p-8 text-center text-sub"><ScrollText size={32} className="mx-auto text-brand mb-2" />No activity recorded yet.</div>
        ) : (
          <div className="card divide-y divide-black/[0.05]">
            {events.map((e) => (
              <div key={e.id} className="p-4">
                <div className="flex items-center gap-2">
                  <span className={`chip ${ACTION_STYLE[e.action] || 'bg-black/[0.06] text-navy'}`}>{e.action}</span>
                  <span className="text-xs text-sub ml-auto">{e.at}</span>
                </div>
                <p className="text-sm text-navy mt-1.5"><b>{e.actor}</b>{e.detail && <span className="text-sub"> — {e.detail}</span>}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
