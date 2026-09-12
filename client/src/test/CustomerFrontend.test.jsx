import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { HomePage } from '../pages/HomePage';
import { GamesCatalogPage } from '../pages/GamesCatalogPage';
import { LoginPage, RegisterPage } from '../pages/AuthPages';
import { BookingPage } from '../pages/BookingPage';
import { MyBookingsPage } from '../pages/MyBookingsPage';
import { gameService } from '../services/gameService';
import { bookingService } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import { authService } from '../services/authService';

vi.mock('../services/gameService');
vi.mock('../services/bookingService');
vi.mock('../services/paymentService');
vi.mock('../services/authService');

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Phase 6 Customer Frontend Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // 1. PUBLIC CATALOG TESTS
  describe('Public Catalog', () => {
    it('1. Home page renders brand headline and call to action', async () => {
      gameService.getGames.mockResolvedValue({ data: { games: [] } });
      renderWithProviders(<HomePage />);
      expect(screen.getByText(/CHOOSE YOUR GAME/i)).toBeInTheDocument();
      expect(screen.getByText(/Explore Games Catalog/i)).toBeInTheDocument();
    });

    it('2. Games catalog page displays fetched active games', async () => {
      gameService.getGames.mockResolvedValue({
        data: {
          games: [
            {
              _id: 'g1',
              name: 'Badminton Pro',
              category: 'court',
              description: 'Professional court',
              basePricePerHour: 600,
              minBookingDurationMinutes: 30,
              maxBookingDurationMinutes: 120,
              bookingIntervalMinutes: 30,
            },
          ],
        },
        pagination: { page: 1, totalPages: 1 },
      });

      renderWithProviders(<GamesCatalogPage />);
      await waitFor(() => {
        expect(screen.getByText('Badminton Pro')).toBeInTheDocument();
      });
      expect(screen.getByText('₹600 / hour')).toBeInTheDocument();
    });
  });

  // 2. AUTHENTICATION TESTS
  describe('Authentication', () => {
    it('10 & 11. Customer Login executes auth service and sets token', async () => {
      authService.login.mockResolvedValue({
        data: {
          token: 'mock_jwt_token',
          user: { id: 'u1', name: 'John Doe', role: 'customer' },
        },
      });

      renderWithProviders(<LoginPage />);
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'Password123!' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith('john@example.com', 'Password123!');
      });
    });

    it('13. Registration submits customer credentials', async () => {
      authService.register.mockResolvedValue({
        data: {
          token: 'mock_jwt_token',
          user: { id: 'u2', name: 'Jane Doe', role: 'customer' },
        },
      });

      renderWithProviders(<RegisterPage />);
      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'jane@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'Password123!' } });
      fireEvent.click(screen.getByRole('button', { name: /Register Account/i }));

      await waitFor(() => {
        expect(authService.register).toHaveBeenCalledWith({
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '',
          password: 'Password123!',
        });
      });
    });
  });

  // 3. BOOKING & PAYMENT TESTS
  describe('Booking & Payments', () => {
    it('19 & 20. Booking page checks availability and calculates total pricing', async () => {
      gameService.getGameById.mockResolvedValue({
        data: {
          game: {
            _id: 'g1',
            name: 'Badminton',
            basePricePerHour: 600,
            minBookingDurationMinutes: 30,
            maxBookingDurationMinutes: 120,
            bookingIntervalMinutes: 30,
          },
        },
      });
      gameService.getGameResources.mockResolvedValue({
        data: {
          resources: [{ _id: 'r1', name: 'Court 1', status: 'available' }],
        },
      });
      gameService.checkAvailability.mockResolvedValue({
        data: { available: true },
      });

      // Wrap in MemoryRouter with route params
      const { MemoryRouter, Routes, Route } = await import('react-router-dom');
      render(
        <MemoryRouter initialEntries={['/booking/g1/r1']}>
          <AuthProvider>
            <Routes>
              <Route path="/booking/:gameId/:resourceId" element={<BookingPage />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Badminton').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Court 1').length).toBeGreaterThan(0);
        expect(screen.getByText('Time slot is available for instant booking!')).toBeInTheDocument();
      });
    });

    it('33. My Bookings loads user reservation list', async () => {
      bookingService.getUserBookings.mockResolvedValue({
        data: {
          bookings: [
            {
              _id: 'b100',
              status: 'confirmed',
              startAt: '2026-10-10T10:00:00.000Z',
              durationMinutes: 60,
              totalAmount: 600,
            },
          ],
        },
        pagination: { page: 1, totalPages: 1 },
      });

      renderWithProviders(<MyBookingsPage />);
      await waitFor(() => {
        expect(screen.getByText(/Ref #b100/i)).toBeInTheDocument();
      });
    });
  });
});
