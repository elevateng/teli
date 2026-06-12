import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, Settings, LogOut } from 'lucide-react';
import { NavItem } from './nav-items';
import { Wordmark, Avatar } from './ui';
import { useAuth } from '../auth';

// Desktop / laptop side navigation. Hidden on small screens (bottom nav used there).
export default function SideNav({ items }: { items: NavItem[] }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-[15px] ${isActive ? 'bg-brand-50 text-brand' : 'text-navy hover:bg-black/[0.04]'}`;

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-[100dvh] sticky top-0 border-r border-black/[0.06] bg-white">
      <div className="px-5 py-5"><Wordmark /></div>

      <nav className="px-3 space-y-1 flex-1 overflow-y-auto no-scrollbar">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={link}>
            <Icon size={20} /> <span>{label}</span>
          </NavLink>
        ))}
        <div className="h-px bg-black/[0.06] my-2 mx-3" />
        <NavLink to="/notifications" className={link}><Bell size={20} /> <span>Notifications</span></NavLink>
        <NavLink to="/settings" className={link}><Settings size={20} /> <span>Settings</span></NavLink>
      </nav>

      <div className="p-3 border-t border-black/[0.06]">
        <button onClick={() => nav(user?.role === 'learner' ? '/profile' : '/admin')} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-black/[0.04] text-left">
          <Avatar name={user?.fullName} src={user?.avatar} size={36} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-navy text-sm truncate">{user?.fullName}</p>
            <p className="text-[11px] text-sub capitalize truncate">{user?.role?.replace('_', ' ')}</p>
          </div>
        </button>
        <button onClick={() => { logout(); nav('/'); }} className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-xl text-sub hover:bg-black/[0.04] font-semibold text-sm">
          <LogOut size={18} /> <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
