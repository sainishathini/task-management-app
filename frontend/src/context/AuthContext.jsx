// React Context for user authentication
// Manages login, register, logout
// Stores JWT token and user data

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Create API instance with base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Setup request interceptor to attach JWT Authorization header automatically
  useEffect(() => {
    const interceptor = api.interceptors.request.use(
      (config) => {
        const storedToken = token || localStorage.getItem('token');
        if (storedToken) {
          config.headers.Authorization = `Bearer ${storedToken}`;
        }
        return config;
      },
      (err) => Promise.reject(err)
    );

    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, [token]);

  // Load token and user from localStorage on mount & verify token
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch (e) {
              console.error('Failed to parse cached user:', e);
            }
          }

          // Verify token against backend /api/auth/me
          try {
            const res = await api.get('/auth/me', {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            if (res.data.user) {
              setUser(res.data.user);
              localStorage.setItem('user', JSON.stringify(res.data.user));
            }
          } catch (apiErr) {
            console.warn('Token validation failed, logging out:', apiErr.response?.data?.error || apiErr.message);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error initializing auth state:', err);
        setError('Failed to initialize authentication state.');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Helper to persist auth data
  const saveAuthData = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    setError(null);
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }

    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
    }
  };

  // Register function
  const register = useCallback(async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { token: newToken, user: userData } = response.data;
      saveAuthData(newToken, userData);
      return { success: true, user: userData };
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Registration failed. Please try again.';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data;
      saveAuthData(newToken, userData);
      return { success: true, user: userData };
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Invalid email or password.';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    saveAuthData(null, null);
    setError(null);
  }, []);

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
    api,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
