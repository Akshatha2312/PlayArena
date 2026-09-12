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
