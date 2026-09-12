import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('play_arena_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('play_arena_token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      authService
        .getProfile()
        .then((res) => {
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('play_arena_user', JSON.stringify(res.data.user));
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [token, user]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    const { token: newToken, user: newUser } = res.data;

    // Enforce customer role boundary
    if (newUser.role !== 'customer') {
      throw new Error('Access denied: Customer portal requires a customer account.');
    }

    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('play_arena_token', newToken);
    localStorage.setItem('play_arena_user', JSON.stringify(newUser));
    return newUser;
  };

  const loginStaff = async (email, password) => {
    const res = await authService.login(email, password);
    const { token: newToken, user: newUser } = res.data;

    // Enforce staff/admin role boundary
    if (newUser.role !== 'staff' && newUser.role !== 'admin') {
      throw new Error('Access denied: Staff operations portal requires staff or admin credentials.');
    }

    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('play_arena_token', newToken);
    localStorage.setItem('play_arena_user', JSON.stringify(newUser));
    return newUser;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    const { token: newToken, user: newUser } = res.data;

    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('play_arena_token', newToken);
    localStorage.setItem('play_arena_user', JSON.stringify(newUser));
    return newUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('play_arena_token');
    localStorage.removeItem('play_arena_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && user?.role === 'customer',
        isStaffAuthenticated: !!token && (user?.role === 'staff' || user?.role === 'admin'),
        loading,
        login,
        loginStaff,
        register,
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
