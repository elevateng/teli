import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookCopy, TicketPercent, UsersRound, LifeBuoy } from 'lucide-react';

const items = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/courses', label: 'Courses', icon: BookCopy, end: false },
  { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent, end: false },
  { to: '/admin/users', label: 'Users', icon: UsersRound, end: false },
  { to: '/admin/tickets', label: 'Support', icon: LifeBuoy, end: false },
];

export default function AdminNav() {
  return (
    <nav className="shrink-0 bg-white border-t border-black/[0.06] px-1 pb-5 pt-2">
      <div className="flex items-center justify-around">
        {items.map(({ to, label, icon: Icon, end }) => (
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
