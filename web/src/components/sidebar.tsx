import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const KEY = 'teli-sidebar-collapsed';
const Ctx = createContext<{ collapsed: boolean; toggle: () => void }>({ collapsed: false, toggle: () => {} });
export const useSidebar = () => useContext(Ctx);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(KEY) === '1');
  useEffect(() => { localStorage.setItem(KEY, collapsed ? '1' : '0'); }, [collapsed]);
  return <Ctx.Provider value={{ collapsed, toggle: () => setCollapsed((c) => !c) }}>{children}</Ctx.Provider>;
}
