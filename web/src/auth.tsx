import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, getToken, setToken, User } from './api';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (fullName: string, email: string, password: string) => Promise<User>;
  googleAuth: (payload: { credential?: string; devEmail?: string; devName?: string }) => Promise<User>;
  setUser: (u: User) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

export const homeForRole = (u: User) => (u.role === 'learner' ? '/home' : '/admin');

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (getToken()) {
        try { const { user } = await api.get<{ user: User }>('/auth/me'); setUser(user); }
        catch { setToken(null); }
      }
      setLoading(false);
    })();
  }, []);

  const handleAuth = (token: string, user: User) => { setToken(token); setUser(user); };

  const login = async (email: string, password: string) => {
    const { token, user } = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    handleAuth(token, user);
    return user;
  };
  const register = async (fullName: string, email: string, password: string) => {
    const { token, user } = await api.post<{ token: string; user: User }>('/auth/register', { fullName, email, password });
    handleAuth(token, user);
    return user;
  };
  const googleAuth = async (payload: { credential?: string; devEmail?: string; devName?: string }) => {
    const { token, user } = await api.post<{ token: string; user: User }>('/auth/google', payload);
    handleAuth(token, user);
    return user;
  };
  const logout = () => { setToken(null); setUser(null); };
  const refresh = async () => {
    if (!getToken()) return;
    try { const { user } = await api.get<{ user: User }>('/auth/me'); setUser(user); } catch { /* noop */ }
  };

  return <Ctx.Provider value={{ user, loading, login, register, googleAuth, setUser, logout, refresh }}>{children}</Ctx.Provider>;
}
