import { NavLink } from 'react-router-dom';
import { Home, Compass, Users, BookOpen, User } from 'lucide-react';

const items = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/learning', label: 'Learning', icon: BookOpen },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  return (
    <nav className="shrink-0 bg-white border-t border-black/[0.06] px-2 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}>
      <div className="flex items-center justify-around">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-2 py-1 rounded-xl ${isActive ? 'text-brand' : 'text-sub'}`
            }>
            {({ isActive }) => (
              <>
                <Icon size={24} strokeWidth={isActive ? 2.6 : 2} fill={isActive ? 'currentColor' : 'none'} fillOpacity={isActive ? 0.12 : 0} />
                <span className="text-[11px] font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
