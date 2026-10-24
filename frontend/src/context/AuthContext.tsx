import React, { useCallback, useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { User, AuthResponse } from '../types';
import { AuthContext, type RegisterPayload } from './auth-context';
import {
  STORAGE_KEYS,
  setSecureItem,
  getSecureItem,
  removeSecureItem,
  purgeLegacyStorage,
} from '../utils/security';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cachedUserStr = getSecureItem(STORAGE_KEYS.USER);
    if (cachedUserStr) {
      try {
        return JSON.parse(cachedUserStr);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => getSecureItem(STORAGE_KEYS.TOKEN));
  const [role, setRole] = useState<string | null>(() => getSecureItem(STORAGE_KEYS.ROLE) || 'INVITADO');
  const [isGuest, setIsGuest] = useState<boolean>(() => !getSecureItem(STORAGE_KEYS.TOKEN));
  const [loading, setLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    removeSecureItem(STORAGE_KEYS.TOKEN);
    removeSecureItem(STORAGE_KEYS.ROLE);
    removeSecureItem(STORAGE_KEYS.USER);
    purgeLegacyStorage();
    setToken(null);
    setUser(null);
    setRole('INVITADO');
    setIsGuest(true);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      // Purgar inmediatamente cualquier dato previo en texto plano
      purgeLegacyStorage();

      const storedToken = getSecureItem(STORAGE_KEYS.TOKEN);
      if (storedToken) {
        try {
          const res = await apiClient.get<User>('/auth/me');
          setUser(res.data);
          setRole(res.data.rol);
          setIsGuest(false);
          setSecureItem(STORAGE_KEYS.ROLE, res.data.rol);
        } catch (err: any) {
          if (err?.response && (err.response.status === 401 || err.response.status === 403)) {
            logout();
          } else {
            // En caso de corte de red o servidor temporalmente inalcanzable, preservar sesión guardada
            const cachedUserStr = getSecureItem(STORAGE_KEYS.USER);
            if (cachedUserStr) {
              try {
                const cachedUser = JSON.parse(cachedUserStr);
                setUser(cachedUser);
                setRole(cachedUser.rol || getSecureItem(STORAGE_KEYS.ROLE));
                setIsGuest(false);
              } catch {
                logout();
              }
            } else {
              logout();
            }
          }
        }
      } else {
        // Modo invitado por defecto si no hay sesión
        setRole('INVITADO');
        setIsGuest(true);
      }
      setLoading(false);
    };

    initAuth();
  }, [logout]);

  const login = async (username: string, password: string) => {
    purgeLegacyStorage();

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const res = await apiClient.post<AuthResponse>('/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, rol } = res.data;
    setSecureItem(STORAGE_KEYS.TOKEN, access_token);
    setSecureItem(STORAGE_KEYS.ROLE, rol);
    setToken(access_token);
    setRole(rol);
    setIsGuest(false);

    // Obtener datos del perfil
    const meRes = await apiClient.get<User>('/auth/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    setUser(meRes.data);
    setSecureItem(STORAGE_KEYS.USER, JSON.stringify(meRes.data));

    return { access_token, rol };
  };

  const register = async (payload: RegisterPayload) => {
    const res = await apiClient.post('/auth/registro', payload);
    return res.data;
  };

  const verifyCode = async (email: string, codigo: string) => {
    purgeLegacyStorage();
    const res = await apiClient.post<AuthResponse>('/auth/verificar-codigo', { email, codigo });
    const { access_token, rol } = res.data;

    setSecureItem(STORAGE_KEYS.TOKEN, access_token);
    setSecureItem(STORAGE_KEYS.ROLE, rol);
    setToken(access_token);
    setRole(rol);
    setIsGuest(false);

    const meRes = await apiClient.get<User>('/auth/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    setUser(meRes.data);
    setSecureItem(STORAGE_KEYS.USER, JSON.stringify(meRes.data));

    return { access_token, rol };
  };

  const resendCode = async (email: string) => {
    const res = await apiClient.post('/auth/reenviar-codigo', { email });
    return res.data.message || 'Código reenviado';
  };

  const requestPasswordReset = async (email: string) => {
    const res = await apiClient.post('/auth/solicitar-recuperacion', { email });
    return res.data.message || 'Código de recuperación enviado';
  };

  const resetPassword = async (email: string, codigo: string, nueva_password: string) => {
    const res = await apiClient.post('/auth/restablecer-password', { email, codigo, nueva_password });
    return res.data.message || 'Contraseña actualizada exitosamente';
  };

  const setGuestMode = () => {
    removeSecureItem(STORAGE_KEYS.TOKEN);
    removeSecureItem(STORAGE_KEYS.ROLE);
    removeSecureItem(STORAGE_KEYS.USER);
    purgeLegacyStorage();
    setToken(null);
    setUser(null);
    setRole('INVITADO');
    setIsGuest(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated: !!token,
        isGuest,
        loading,
        login,
        register,
        verifyCode,
        resendCode,
        requestPasswordReset,
        resetPassword,
        setGuestMode,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
