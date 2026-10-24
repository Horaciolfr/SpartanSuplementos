import { createContext } from 'react';
import type { User } from '../types';

export interface RegisterPayload {
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  numero_documento?: string;
  id_genero?: number;
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ access_token: string; rol: string }>;
  register: (payload: RegisterPayload) => Promise<{ message: string; email?: string; requiere_verificacion?: boolean }>;
  verifyCode: (email: string, codigo: string) => Promise<{ access_token: string; rol: string }>;
  resendCode: (email: string) => Promise<string>;
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (email: string, codigo: string, nueva_password: string) => Promise<string>;
  setGuestMode: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
