import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell as BellIcon } from 'lucide-react';
import { api } from '../api';

export default function Bell() {
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const tick = () => api.get<{ unread: number }>('/notifications').then((d) => { if (alive) setUnread(d.unread); }).catch(() => {});
    tick();
    const t = setInterval(tick, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <button onClick={() => nav('/notifications')} className="relative">
      <BellIcon size={24} className="text-navy" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 bg-brand text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
