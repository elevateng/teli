import { Home, Compass, Users, BookOpen, User, LayoutDashboard, BookCopy, TicketPercent, UsersRound, LifeBuoy } from 'lucide-react';

export interface NavItem { to: string; label: string; icon: any; end?: boolean }

export const learnerNav: NavItem[] = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/learning', label: 'Learning', icon: BookOpen },
  { to: '/profile', label: 'Profile', icon: User },
];

export const adminNav: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/courses', label: 'Courses', icon: BookCopy },
  { to: '/admin/community', label: 'Community', icon: Users },
  { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent },
  { to: '/admin/users', label: 'Users', icon: UsersRound },
  { to: '/admin/tickets', label: 'Support', icon: LifeBuoy },
];
