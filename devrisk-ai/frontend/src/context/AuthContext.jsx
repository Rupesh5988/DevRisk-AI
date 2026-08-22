// ============================================================
// Auth Context — Global authentication state
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, check if there's a saved token and validate it
    const token = localStorage.getItem('devrisk_token');
    const savedUser = localStorage.getItem('devrisk_user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // Invalid saved user
      }

      // Validate token with backend
      getMe()
        .then((res) => {
          const userData = res.data.user;
          setUser(userData);
          localStorage.setItem('devrisk_user', JSON.stringify(userData));
        })
        .catch(() => {
          // Token invalid
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function login(token, userData) {
    localStorage.setItem('devrisk_token', token);
    localStorage.setItem('devrisk_user', JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('devrisk_token');
    localStorage.removeItem('devrisk_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
