import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If provided, the user's role must match or they are redirected to /login. */
  expectedRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, expectedRole }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div style={{ minHeight: '100vh' }} />;
  }

  if (!isAuthenticated) return <Navigate to="/login" />;

  if (expectedRole && user?.role !== expectedRole) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};
