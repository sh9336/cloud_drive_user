import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, AuthResponse } from '@/lib/api';
import { storage } from '@/config';

interface User {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = storage.getItem('access_token');
    const storedUser = storage.getItem('user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        storage.removeItem('access_token');
        storage.removeItem('refresh_token');
        storage.removeItem('user');
      }
    }

    setIsLoading(false);

    // Listen for logout events from API client
    const handleLogout = () => {
      setUser(null);
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response: AuthResponse = await authApi.login({ email, password });

    storage.setItem('access_token', response.access_token);
    if (response.refresh_token) {
      storage.setItem('refresh_token', response.refresh_token);
    }

    const userData: User = response.user || {
      id: 'unknown',
      email: email,
    };

    storage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = storage.getItem('refresh_token');

    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore logout errors
      }
    }

    storage.removeItem('access_token');
    storage.removeItem('refresh_token');
    storage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
