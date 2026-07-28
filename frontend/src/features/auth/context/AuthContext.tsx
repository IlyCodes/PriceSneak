import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../../../api/apiClient';
import i18n from '../../../lib/i18n';

export interface User {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
  currency: string;
  currencySymbol: string;
  updateCurrency: (c: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState<string>('USD');

  const getCurrencySymbol = (c: string) => {
    switch (c) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '$';
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const [userData, settingsData] = await Promise.all([
          apiFetch<User>('/api/auth/me'),
          apiFetch<any>('/api/auth/me/settings').catch(() => null)
        ]);
        setUser(userData);
        if (settingsData) {
          if (settingsData.language) {
            i18n.changeLanguage(settingsData.language.toLowerCase());
          }
          if (settingsData.currency) {
            setCurrency(settingsData.currency);
          }
        }
      } catch (error) {
        console.error("Token invalide ou session expirée", error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
  }, [token]);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  const updateCurrency = (c: string) => {
    setCurrency(c);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, currency, currencySymbol: getCurrencySymbol(currency), updateCurrency, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
};
