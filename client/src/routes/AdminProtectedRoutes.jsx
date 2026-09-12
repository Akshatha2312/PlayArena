import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/StateComponents';

export const AdminProtectedRoute = () => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <LoadingState message="Verifying administrative privileges..." />;
  }

  const isAdmin = !!token && user?.role === 'admin';

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export const AdminPublicOnlyRoute = () => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <LoadingState message="Checking session..." />;
  }

  const isAdmin = !!token && user?.role === 'admin';

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
};
