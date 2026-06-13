import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, Settings, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavItem, learnerNav, adminNav } from './nav-items';
import { Wordmark, Avatar, BookMark } from './ui';
import { useAuth } from '../auth';
import { useSidebar } from './sidebar';

// Picks the right nav for the signed-in user. Used on every authed screen.
export function RoleSideNav() {
  const { user } = useAuth();
  const items = user?.role === 'learner' ? learnerNav : adminNav;
  return <SideNav items={items} />;
}

// Desktop / laptop side navigation. Hidden on small screens (bottom nav used there).
// Collapsible to an icon rail; state persists across screens.
export default function SideNav({ items }: { items: NavItem[] }) {
  const { user, logout } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const nav = useNavigate();

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl font-semibold text-[15px] ${isActive ? 'bg-brand-50 text-brand' : 'text-navy hover:bg-black/[0.04]'}`;

  const item = (to: string, label: string, Icon: any, end?: boolean) => (
    <NavLink key={to} to={to} end={end} className={link} title={collapsed ? label : undefined}>
      <Icon size={20} /> {!collapsed && <span>{label}</span>}
    </NavLink>
  );

  return (
    <aside className={`hidden lg:flex flex-col shrink-0 h-[100dvh] sticky top-0 border-r border-black/[0.06] bg-white transition-[width] duration-200 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
      <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-4'} py-5`}>
        {collapsed
          ? <button onClick={() => nav(user?.role === 'learner' ? '/home' : '/admin')} aria-label="Home"><BookMark size={30} /></button>
          : <Wordmark />}
        <button onClick={toggle} aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sub hover:bg-black/[0.05] ${collapsed ? 'mt-2 absolute top-3 right-2' : ''}`}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="px-3 space-y-1 flex-1 overflow-y-auto no-scrollbar">
        {items.map(({ to, label, icon: Icon, end }) => item(to, label, Icon, end))}
        <div className="h-px bg-black/[0.06] my-2 mx-2" />
        {item('/notifications', 'Notifications', Bell)}
        {item('/settings', 'Settings', Settings)}
      </nav>

      <div className="p-3 border-t border-black/[0.06]">
        <button onClick={() => nav(user?.role === 'learner' ? '/profile' : '/admin')}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-2'} py-2 rounded-xl hover:bg-black/[0.04] text-left`}
          title={collapsed ? user?.fullName : undefined}>
          <Avatar name={user?.fullName} src={user?.avatar} size={collapsed ? 32 : 36} />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-bold text-navy text-sm truncate">{user?.fullName}</p>
              <p className="text-[11px] text-sub capitalize truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
        </button>
        <button onClick={() => { logout(); nav('/'); }}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2 mt-1 rounded-xl text-sub hover:bg-black/[0.04] font-semibold text-sm`}
          title={collapsed ? 'Log out' : undefined}>
          <LogOut size={18} /> {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
