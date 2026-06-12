import { NavLink } from 'react-router-dom';
import { adminNav } from './nav-items';

export default function AdminNav() {
  return (
    <nav className="shrink-0 bg-white border-t border-black/[0.06] px-1 pt-2 lg:hidden" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}>
      <div className="flex items-center justify-around">
        {adminNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `flex flex-col items-center gap-1 px-2 py-1 ${isActive ? 'text-brand' : 'text-sub'}`}>
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.6 : 2} />
                <span className="text-[10px] font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
