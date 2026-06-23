import { createContext, useContext, useState, useEffect } from 'react';
import http from '../api/index';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('goalline_token');
    if (token) {
      http.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('goalline_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('goalline_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('goalline_token');
    setUser(null);
  };

  const refreshUser = () =>
    http.get('/auth/me').then((res) => {
      setUser(res.data);
      return res.data;
    });

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);