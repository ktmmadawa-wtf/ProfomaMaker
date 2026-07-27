import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  // Holds the short-lived partialToken between login step 1 and step 2
  const [partialToken, setPartialToken] = useState('');

  const saveSession = useCallback((newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    setPartialToken('');
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setToken('');
    setUser(null);
    setPartialToken('');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  // Configured axios instance — automatically attaches Bearer token and
  // logs the user out on any 401 response.
  const api = useMemo(() => {
    const instance = axios.create({ baseURL: '/api' });

    instance.interceptors.request.use(config => {
      const t = localStorage.getItem('token');
      if (t) config.headers.Authorization = `Bearer ${t}`;
      return config;
    });

    instance.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) logout();
        return Promise.reject(error);
      }
    );

    return instance;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    partialToken,
    setPartialToken,
    saveSession,
    logout,
    api,
    isAdmin:         user?.role === 'admin',
    isAuthenticated: !!token
  }), [token, user, partialToken, saveSession, logout, api]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
