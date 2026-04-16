import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  accessToken: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check if token is in URL hash (from Google redirect auth flow)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1)); // remove '#'
      const token = params.get('access_token');
      if (token) {
        setAccessToken(token);
        localStorage.setItem('gmail_access_token', token);
        // Clean the URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        return;
      }
    }

    // 2. Fallback to localStorage
    const storedToken = localStorage.getItem('gmail_access_token');
    if (storedToken) {
      setAccessToken(storedToken);
    }
  }, []);

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
