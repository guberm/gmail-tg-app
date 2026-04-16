import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  accessToken: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getInitialToken = () => {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    if (token) {
      localStorage.setItem('gmail_access_token', token);
      // Clean the URL hash immediately
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return token;
    }
  }
  return localStorage.getItem('gmail_access_token');
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(getInitialToken);

  const login = (token: string) => {
    setAccessToken(token);
    localStorage.setItem('gmail_access_token', token);
  };

  const logout = () => {
    setAccessToken(null);
    localStorage.removeItem('gmail_access_token');
  };

  return (
    <AuthContext.Provider value={{ accessToken, login, logout, isAuthenticated: !!accessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
