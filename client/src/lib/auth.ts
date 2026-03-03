import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  hasMattrMindr?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

let globalToken: string | null = null;

export function getAuthToken(): string | null {
  return globalToken;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAuthState = useCallback((t: string | null, u: AuthUser | null) => {
    setToken(t);
    setUser(u);
    globalToken = t;
    if (t) {
      sessionStorage.setItem('voir_dire_token', t);
    } else {
      sessionStorage.removeItem('voir_dire_token');
    }
  }, []);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('voir_dire_token');
    if (savedToken) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${savedToken}` },
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Invalid token');
        })
        .then(userData => {
          setAuthState(savedToken, userData);
        })
        .catch(() => {
          setAuthState(null, null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [setAuthState]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(err.message);
    }
    const data = await res.json();
    setAuthState(data.token, data.user);
  }, [setAuthState]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(err.message);
    }
    const data = await res.json();
    setAuthState(data.token, data.user);
  }, [setAuthState]);

  const logout = useCallback(() => {
    setAuthState(null, null);
  }, [setAuthState]);

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
      },
    },
    children
  );
}
