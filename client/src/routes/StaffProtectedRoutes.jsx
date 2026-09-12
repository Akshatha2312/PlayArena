import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/StateComponents';

export const StaffProtectedRoute = () => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <LoadingState message="Checking staff authorization..." />;
  }

  const isStaffOrAdmin = !!token && (user?.role === 'staff' || user?.role === 'admin');

  if (!isStaffOrAdmin) {
    return <Navigate to="/staff/login" replace />;
  }

  return <Outlet />;
};

export const StaffPublicOnlyRoute = () => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <LoadingState message="Checking session..." />;
  }

  const isStaffOrAdmin = !!token && (user?.role === 'staff' || user?.role === 'admin');

  if (isStaffOrAdmin) {
    return <Navigate to="/staff/dashboard" replace />;
  }

  return <Outlet />;
};
