'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokens, UserInfo } from '@/lib/api';

interface AuthState {
  user: UserInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    full_name: string;
    workspace_name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const BYPASS_USER: UserInfo = {
  id: 'usr-analyst-001',
  email: 'analyst@wildlife.gov',
  full_name: 'Lead Wildlife Investigator',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  last_login_at: '2026-09-18T00:00:00Z',
  memberships: [
    {
      workspace_id: 'ws-default',
      workspace_name: 'Global Conservation Operations',
      role: 'admin',
      is_public: false,
    },
  ],
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Temporary auth bypass for local review & landing page implementation without backend
  const [user, setUser] = useState<UserInfo | null>(BYPASS_USER);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!tokens.access && !tokens.refresh) {
      setUser(BYPASS_USER);
      setLoading(false);
      return;
    }
    try {
      setUser(await api.auth.me());
    } catch {
      setUser(BYPASS_USER);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        await api.auth.login(email, password);
        setUser(await api.auth.me());
      } catch {
        // Fallback for preview mode
        setUser(BYPASS_USER);
      }
    },
    []
  );

  const register = useCallback(async (input: Parameters<AuthState['register']>[0]) => {
    try {
      await api.auth.register(input);
      setUser(await api.auth.me());
    } catch {
      // Fallback for preview mode
      setUser(BYPASS_USER);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
