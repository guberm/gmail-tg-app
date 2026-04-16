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
