import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { MyWaitlistPage } from '../pages/MyWaitlistPage';
import { BookingDetailPage } from '../pages/BookingDetailPage';
import { waitlistService } from '../services/waitlistService';
import { bookingService } from '../services/bookingService';
import { qrService } from '../services/qrService';

vi.mock('../services/waitlistService');
vi.mock('../services/bookingService');
vi.mock('../services/qrService');

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Phase 13 Waitlist & Reschedule Frontend Test Suite', () => {
  const mockWaitlists = [
    {
      _id: 'wl1',
      gameId: { name: 'Badminton', category: 'court' },
      resourceId: { name: 'Court 1', code: 'BAD-01' },
      startAt: '2026-10-01T14:00:00.000Z',
      endAt: '2026-10-01T15:00:00.000Z',
      durationMinutes: 60,
      status: 'waiting',
      createdAt: '2026-09-16T10:00:00.000Z',
    },
    {
      _id: 'wl2',
      gameId: { name: 'Laser Tag', category: 'arcade' },
      resourceId: { name: 'Arena 1', code: 'LT-01' },
      startAt: '2026-10-02T16:00:00.000Z',
      endAt: '2026-10-02T17:00:00.000Z',
      durationMinutes: 60,
      status: 'notified',
      createdAt: '2026-09-16T11:00:00.000Z',
    },
  ];

  const mockBookingConfirmed = {
    _id: 'bk123',
    status: 'confirmed',
    gameId: { name: 'Badminton' },
    resourceId: { name: 'Court 1' },
    startAt: '2026-10-10T10:00:00.000Z',
    endAt: '2026-10-10T11:00:00.000Z',
    durationMinutes: 60,
    pricePerHourAtBooking: 400,
    totalAmount: 400,
    isRescheduled: true,
    rescheduleCount: 1,
    rescheduledFromStartAt: '2026-10-09T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    waitlistService.getUserWaitlists.mockResolvedValue({
      status: 'success',
      data: { waitlists: mockWaitlists, pagination: { total: 2, page: 1, totalPages: 1 } },
    });
    waitlistService.leaveWaitlist.mockResolvedValue({
      status: 'success',
      data: { waitlist: { ...mockWaitlists[0], status: 'cancelled' } },
    });
    bookingService.getUserBookingById.mockResolvedValue({
      status: 'success',
      data: { booking: mockBookingConfirmed },
    });
    bookingService.rescheduleBooking.mockResolvedValue({
      status: 'success',
      data: { booking: { ...mockBookingConfirmed, startAt: '2026-10-10T14:00:00.000Z' } },
    });
    qrService.getBookingQR.mockResolvedValue({
      status: 'success',
      data: { qrToken: 'token123', validity: { isValid: true } },
    });
  });

  describe('MyWaitlistPage Component', () => {
    it('1. Renders customer waitlist cards and details', async () => {
      renderWithProviders(<MyWaitlistPage />);

      await waitFor(() => {
        expect(screen.getByText(/My Waitlists/i)).toBeInTheDocument();
        expect(screen.getByText(/Badminton/i)).toBeInTheDocument();
        expect(screen.getByText(/Laser Tag/i)).toBeInTheDocument();
        expect(screen.getByText(/Slot Available!/i)).toBeInTheDocument();
      });
    });

    it('2. Handles leave waitlist action', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderWithProviders(<MyWaitlistPage />);

      await waitFor(() => {
        expect(screen.getByText(/Badminton/i)).toBeInTheDocument();
      });

      const leaveBtns = screen.getAllByText(/Leave Waitlist/i);
      fireEvent.click(leaveBtns[0]);

      await waitFor(() => {
        expect(waitlistService.leaveWaitlist).toHaveBeenCalledWith('wl1');
      });
    });
  });

  describe('BookingDetailPage Component Rescheduling', () => {
    it('3. Renders Reschedule button and modal for confirmed bookings', async () => {
      renderWithProviders(<BookingDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Reschedule/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Reschedule/i }));

      await waitFor(() => {
        expect(screen.getByText(/RESCHEDULE RESERVATION/i)).toBeInTheDocument();
        expect(screen.getByText(/Confirm New Schedule/i)).toBeInTheDocument();
      });
    });
  });
});
