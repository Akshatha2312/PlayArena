import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { GamesCatalogPage } from '../pages/GamesCatalogPage';
import { GameDetailPage } from '../pages/GameDetailPage';
import { LoginPage, RegisterPage } from '../pages/AuthPages';
import { BookingPage } from '../pages/BookingPage';
import { BookingSuccessPage } from '../pages/BookingSuccessPage';
import { MyBookingsPage } from '../pages/MyBookingsPage';
import { BookingDetailPage } from '../pages/BookingDetailPage';
import { MyPaymentsPage } from '../pages/MyPaymentsPage';
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoutes';

import { StaffLoginPage } from '../pages/staff/StaffLoginPage';
import { StaffDashboardPage } from '../pages/staff/StaffDashboardPage';
import { StaffSchedulePage } from '../pages/staff/StaffSchedulePage';
import { StaffCheckInPage } from '../pages/staff/StaffCheckInPage';
import { StaffSessionsPage } from '../pages/staff/StaffSessionsPage';
import { StaffBookingDetailPage } from '../pages/staff/StaffBookingDetailPage';
import { StaffProtectedRoute, StaffPublicOnlyRoute } from './StaffProtectedRoutes';

import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminGamesPage } from '../pages/admin/AdminGamesPage';
import { AdminResourcesPage } from '../pages/admin/AdminResourcesPage';
import { AdminBookingsPage } from '../pages/admin/AdminBookingsPage';
import { AdminCustomersPage } from '../pages/admin/AdminCustomersPage';
import { AdminStaffPage } from '../pages/admin/AdminStaffPage';
import { AdminPaymentsPage } from '../pages/admin/AdminPaymentsPage';
import { AdminProtectedRoute, AdminPublicOnlyRoute } from './AdminProtectedRoutes';

import { EmptyState } from '../components/StateComponents';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Customer Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/games" element={<GamesCatalogPage />} />
      <Route path="/games/:id" element={<GameDetailPage />} />

      {/* Guest Only Auth Routes */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected Customer Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/booking/:gameId/:resourceId" element={<BookingPage />} />
        <Route path="/booking-success/:id" element={<BookingSuccessPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/my-bookings/:id" element={<BookingDetailPage />} />
        <Route path="/my-payments" element={<MyPaymentsPage />} />
      </Route>

      {/* Staff Operations Public Routes */}
      <Route element={<StaffPublicOnlyRoute />}>
        <Route path="/staff/login" element={<StaffLoginPage />} />
      </Route>

      {/* Staff Operations Protected Routes */}
      <Route element={<StaffProtectedRoute />}>
        <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
        <Route path="/staff/schedule" element={<StaffSchedulePage />} />
        <Route path="/staff/check-in" element={<StaffCheckInPage />} />
        <Route path="/staff/sessions" element={<StaffSessionsPage />} />
        <Route path="/staff/bookings/:id" element={<StaffBookingDetailPage />} />
      </Route>

      {/* Admin Control Center Public Routes */}
      <Route element={<AdminPublicOnlyRoute />}>
        <Route path="/admin/login" element={<AdminLoginPage />} />
      </Route>

      {/* Admin Control Center Protected Routes */}
      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/games" element={<AdminGamesPage />} />
        <Route path="/admin/resources" element={<AdminResourcesPage />} />
        <Route path="/admin/bookings" element={<AdminBookingsPage />} />
        <Route path="/admin/customers" element={<AdminCustomersPage />} />
        <Route path="/admin/staff" element={<AdminStaffPage />} />
        <Route path="/admin/payments" element={<AdminPaymentsPage />} />
      </Route>

      {/* 404 Route */}
      <Route
        path="*"
        element={
          <div className="container page-container">
            <EmptyState
              title="404 - Page Not Found"
              message="The page you are looking for does not exist."
              actionLink="/"
              actionText="Return to Home"
            />
          </div>
        }
      />
    </Routes>
  );
};
