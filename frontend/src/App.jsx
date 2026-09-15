// Main App component
// React Router with protected routes
// Auth and Board providers

import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthContext, AuthProvider } from './context/AuthContext';
import { BoardProvider } from './context/BoardContext';

import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Dashboard from './components/Dashboard';
import BoardDetail from './components/Dashboard/BoardDetail';

import './styles/app.css';

// AppContent component handles routing and auth-protected navigation
const AppContent = () => {
  const authContext = useContext(AuthContext);
  const loading = authContext?.loading;
  const isAuthenticated = Boolean(authContext?.user && authContext?.token);

  // Show loading indicator while authentication state is initializing
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />}
      />

      {/* Protected Dashboard & Board Routes */}
      <Route
        path="/dashboard"
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/board/:id"
        element={isAuthenticated ? <BoardDetail /> : <Navigate to="/login" replace />}
      />




      {/* Root Route Redirect */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />

      {/* 404 Catch All Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Main App component wrapping providers and router
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BoardProvider>
          <AppContent />
        </BoardProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
