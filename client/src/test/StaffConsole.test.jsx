import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { StaffLoginPage } from '../pages/staff/StaffLoginPage';
import { StaffDashboardPage } from '../pages/staff/StaffDashboardPage';
import { StaffSchedulePage } from '../pages/staff/StaffSchedulePage';
import { StaffCheckInPage } from '../pages/staff/StaffCheckInPage';
import { staffService } from '../services/staffService';
import { gameService } from '../services/gameService';
import { authService } from '../services/authService';

vi.mock('../services/staffService');
vi.mock('../services/gameService');
vi.mock('../services/authService');

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Phase 7 Staff Operations Console Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Staff Authentication & Access Control', () => {
    it('1. Renders staff login portal form', () => {
      renderWithProviders(<StaffLoginPage />);
      expect(screen.getByText(/Play Arena Operations/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Staff Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });

    it('2. Authenticates staff user and rejects customer role', async () => {
      authService.login.mockResolvedValue({
        data: {
          token: 'customer_token_123',
          user: { _id: 'u1', role: 'customer', name: 'Regular Customer' },
        },
      });

      renderWithProviders(<StaffLoginPage />);

      fireEvent.change(screen.getByLabelText(/Staff Email/i), { target: { value: 'cust@test.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign In to Operations/i }));

      await waitFor(() => {
        expect(screen.getByText(/Access denied: Staff operations portal requires staff or admin credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Operations Dashboard', () => {
    it('3. Renders live operational metrics and resource occupancy', async () => {
      staffService.getDashboardSummary.mockResolvedValue({
        data: {
          date: '2026-09-12',
          counts: {
            totalToday: 10,
            upcoming: 4,
            checkedIn: 2,
            inProgress: 1,
            completed: 2,
            cancelled: 1,
            noShow: 0,
          },
          resourceOccupancy: [
            {
              _id: 'r1',
              name: 'Court 1',
              gameTitle: 'Badminton',
              status: 'available',
              isActive: true,
              occupancyState: 'available',
            },
          ],
        },
      });
      gameService.getGames.mockResolvedValue({ data: { games: [] } });

      renderWithProviders(<StaffDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Operations Control/i)).toBeInTheDocument();
        expect(screen.getByText(/Court 1/i)).toBeInTheDocument();
      });
    });
  });

  describe('Schedule & Check-In', () => {
    it('4. Renders daily schedule with booking records', async () => {
      staffService.getSchedule.mockResolvedValue({
        data: {
          bookings: [
            {
              _id: 'b101',
              startAt: '2026-09-12T10:00:00Z',
              endAt: '2026-09-12T11:00:00Z',
              durationMinutes: 60,
              status: 'confirmed',
              gameId: { title: 'Badminton' },
              resourceId: { name: 'Court 1' },
              userId: { name: 'John Doe', email: 'john@example.com' },
            },
          ],
        },
      });

      renderWithProviders(<StaffSchedulePage />);

      await waitFor(() => {
        expect(screen.getByText(/Daily Operations Schedule/i)).toBeInTheDocument();
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
    });

    it('5. Check-in lookup page allows search and perform check-in action', async () => {
      staffService.lookupBooking.mockResolvedValue({
        data: {
          bookings: [
            {
              _id: 'b102',
              startAt: '2026-09-12T10:00:00Z',
              endAt: '2026-09-12T11:00:00Z',
              durationMinutes: 60,
              status: 'confirmed',
              gameId: { title: 'Badminton' },
              resourceId: { name: 'Court 1' },
              userId: { name: 'Jane Doe', email: 'jane@example.com' },
            },
          ],
        },
      });

      renderWithProviders(<StaffCheckInPage />);

      const searchInput = screen.getByPlaceholderText(/e.g. 64b8f0/i);
      fireEvent.change(searchInput, { target: { value: 'jane@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /Search Booking/i }));

      await waitFor(() => {
        expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Check In Customer/i })).toBeInTheDocument();
      });
    });
  });
});
