import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for auth rehydration to finish before deciding.
  if (isLoading) {
    return <div style={{ minHeight: '100vh' }} />;
  }

  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
};
