import { createContext, useContext, useState, useEffect } from 'react';
import {
  clearStoredAuth,
  getStoredAccessToken,
  getStoredUser,
  setAccessToken,
  storeAuthSession,
} from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on page reload
    const savedUser = getStoredUser();
    const savedToken = getStoredAccessToken();
    if (savedUser && savedToken) {
      setUser(savedUser);
      setToken(savedToken);
      setAccessToken(savedToken);
    } else {
      clearStoredAuth();
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleTokenRefresh = (event) => {
      setToken(event.detail);
    };

    window.addEventListener('auth:token-refreshed', handleTokenRefresh);
    return () => window.removeEventListener('auth:token-refreshed', handleTokenRefresh);
  }, []);

  const loginUser = (userData, accessToken, refreshToken) => {
    setUser(userData);
    setToken(accessToken);
    storeAuthSession(userData, accessToken, refreshToken);
  };

  const logoutUser = () => {
    setUser(null);
    setToken(null);
    clearStoredAuth();
  };

  // Don't render until session is restored
  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, token, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
