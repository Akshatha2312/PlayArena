import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminGamesPage } from '../pages/admin/AdminGamesPage';
import { AdminResourcesPage } from '../pages/admin/AdminResourcesPage';
import { AdminBookingsPage } from '../pages/admin/AdminBookingsPage';
import { AdminCustomersPage } from '../pages/admin/AdminCustomersPage';
import { AdminStaffPage } from '../pages/admin/AdminStaffPage';
import { AdminPaymentsPage } from '../pages/admin/AdminPaymentsPage';
import { adminService } from '../services/adminService';
import { authService } from '../services/authService';

vi.mock('../services/adminService');
vi.mock('../services/authService');

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Phase 8 Admin Control Center Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Admin Authentication & RBAC Boundary', () => {
    it('1. Renders admin login portal form', () => {
      renderWithProviders(<AdminLoginPage />);
      expect(screen.getByText(/Play Arena Control Center/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Admin Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });

    it('2. Rejects non-admin user role at admin login', async () => {
      authService.login.mockResolvedValue({
        data: {
          token: 'staff_token_123',
          user: { _id: 's1', role: 'staff', name: 'Staff Operator' },
        },
      });

      renderWithProviders(<AdminLoginPage />);

      fireEvent.change(screen.getByLabelText(/Admin Email/i), { target: { value: 'staff@test.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign In to Control Center/i }));

      await waitFor(() => {
        expect(screen.getByText(/Access denied: Admin control center requires administrative credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Admin Dashboard & Management Modules', () => {
    it('3. Renders Executive Control Dashboard with revenue & metrics', async () => {
      adminService.getDashboardSummary.mockResolvedValue({
        data: {
          date: '2026-09-12',
          metrics: {
            todaysRevenue: 1200,
            activeGamesCount: 3,
            activeResourcesCount: 5,
            totalResourcesCount: 6,
            bookingCounts: {
              totalToday: 4,
              confirmed: 1,
              checkedIn: 1,
              inProgress: 1,
              completed: 1,
              cancelled: 0,
              noShow: 0,
            },
          },
          recentBookings: [],
          recentPayments: [],
        },
      });

      renderWithProviders(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Executive Control Dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/₹1200/i)).toBeInTheDocument();
      });
    });

    it('4. Admin Games page displays fetched games', async () => {
      adminService.getAllGames.mockResolvedValue({
        data: {
          games: [
            {
              _id: 'g801',
              name: 'Badminton Championship',
              category: 'court',
              basePricePerHour: 800,
              minBookingDurationMinutes: 60,
              maxBookingDurationMinutes: 120,
              bookingIntervalMinutes: 60,
              isActive: true,
            },
          ],
        },
      });

      renderWithProviders(<AdminGamesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Game Catalog Management/i)).toBeInTheDocument();
        expect(screen.getByText(/Badminton Championship/i)).toBeInTheDocument();
      });
    });

    it('5. Admin Resources page renders resource inventory', async () => {
      adminService.getAllResources.mockResolvedValue({
        data: {
          resources: [
            {
              _id: 'r801',
              name: 'Center Court 1',
              status: 'available',
              isActive: true,
              gameId: { name: 'Badminton Championship', basePricePerHour: 800 },
            },
          ],
        },
      });
      adminService.getAllGames.mockResolvedValue({ data: { games: [] } });

      renderWithProviders(<AdminResourcesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Physical Resource Inventory/i)).toBeInTheDocument();
        expect(screen.getByText(/Center Court 1/i)).toBeInTheDocument();
      });
    });

    it('6. Admin Bookings page renders master bookings table', async () => {
      adminService.getAllBookings.mockResolvedValue({
        data: {
          bookings: [
            {
              _id: 'b801',
              startAt: '2026-09-12T10:00:00Z',
              durationMinutes: 60,
              totalAmount: 800,
              status: 'confirmed',
              gameId: { title: 'Badminton' },
              resourceId: { name: 'Court 1' },
              userId: { name: 'Player One', email: 'player@example.com' },
            },
          ],
          pagination: { page: 1, totalPages: 1, total: 1 },
        },
      });

      renderWithProviders(<AdminBookingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Master Bookings Registry/i)).toBeInTheDocument();
        expect(screen.getByText(/Player One/i)).toBeInTheDocument();
      });
    });

    it('7. Admin Customers page renders customer directory without password hash', async () => {
      adminService.getCustomers.mockResolvedValue({
        data: {
          customers: [
            {
              _id: 'c801',
              name: 'Alice Player',
              email: 'alice@example.com',
              phone: '9876543210',
              createdAt: '2026-01-01T00:00:00Z',
            },
          ],
          pagination: { page: 1, totalPages: 1, total: 1 },
        },
      });

      renderWithProviders(<AdminCustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/Customer Directory/i)).toBeInTheDocument();
        expect(screen.getByText(/Alice Player/i)).toBeInTheDocument();
      });
    });

    it('8. Admin Staff page allows viewing staff personnel', async () => {
      adminService.getStaffList.mockResolvedValue({
        data: {
          staff: [
            {
              _id: 's801',
              name: 'Bob Staff',
              email: 'bob.staff@playarena.com',
              phone: '9876543211',
              createdAt: '2026-01-01T00:00:00Z',
            },
          ],
        },
      });

      renderWithProviders(<AdminStaffPage />);

      await waitFor(() => {
        expect(screen.getByText(/Staff Personnel Administration/i)).toBeInTheDocument();
        expect(screen.getByText(/Bob Staff/i)).toBeInTheDocument();
      });
    });

    it('9. Admin Payments page renders financial transactions registry', async () => {
      adminService.getAllPayments.mockResolvedValue({
        data: {
          payments: [
            {
              _id: 'p801',
              providerOrderId: 'order_p8_001',
              providerPaymentId: 'pay_p8_001',
              amount: 800,
              currency: 'INR',
              provider: 'razorpay',
              status: 'paid',
              createdAt: '2026-09-12T10:00:00Z',
              userId: { name: 'Player One', email: 'player@example.com' },
            },
          ],
          pagination: { page: 1, totalPages: 1, total: 1 },
        },
      });

      renderWithProviders(<AdminPaymentsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Financial Transactions Registry/i)).toBeInTheDocument();
        expect(screen.getByText(/order_p8_001/i)).toBeInTheDocument();
      });
    });
  });
});
