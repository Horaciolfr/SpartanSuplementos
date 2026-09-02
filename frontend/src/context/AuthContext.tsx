import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { User, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await apiClient.get<User>('/auth/me');
          setUser(res.data);
          setRole(res.data.rol);
          localStorage.setItem('role', res.data.rol);
        } catch {
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const res = await apiClient.post<AuthResponse>('/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, rol } = res.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('role', rol);
    setToken(access_token);
    setRole(rol);

    // Obtener datos del perfil
    const meRes = await apiClient.get<User>('/auth/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    setUser(meRes.data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
