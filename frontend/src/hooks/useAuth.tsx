'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface User { user_id: string; username: string; email: string; token: string; }

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, username: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 启动时从 localStorage 恢复会话
  useEffect(() => {
    const saved = localStorage.getItem('simulagent_user');
    if (saved) {
      const u = JSON.parse(saved);
      fetch(`${API}/api/v1/auth/me?token=${u.token}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setUser(data); else localStorage.removeItem('simulagent_user'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return (await res.json()).detail || '登录失败';
    const u: User = await res.json();
    setUser(u); localStorage.setItem('simulagent_user', JSON.stringify(u));
    return null;
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const res = await fetch(`${API}/api/v1/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });
    if (!res.ok) return (await res.json()).detail || '注册失败';
    const u: User = await res.json();
    setUser(u); localStorage.setItem('simulagent_user', JSON.stringify(u));
    return null;
  }, []);

  const logout = useCallback(() => {
    setUser(null); localStorage.removeItem('simulagent_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
