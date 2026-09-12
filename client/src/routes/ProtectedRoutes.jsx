import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/StateComponents';

export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingState message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const PublicOnlyRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingState message="Checking authentication..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/games" replace />;
  }

  return <Outlet />;
};
