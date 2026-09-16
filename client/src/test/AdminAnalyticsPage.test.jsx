import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AdminAnalyticsPage } from '../pages/admin/AdminAnalyticsPage';
import { analyticsService } from '../services/analyticsService';

vi.mock('../services/analyticsService');

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Phase 12 Admin Analytics Page Test Suite', () => {
  const mockOverview = {
    dateRange: { preset: 'last30days', startDate: '2026-08-17T00:00:00.000Z', endDate: '2026-09-16T00:00:00.000Z' },
    bookings: { totalBookings: 15, confirmed: 5, checkedIn: 2, inProgress: 1, completed: 5, cancelled: 2, noShow: 0, cancellationRate: 13.33, noShowRate: 0 },
    revenue: { totalRevenue: 6500, successfulPaymentsCount: 12, avgTransactionValue: 541.67 },
    catalog: { activeCustomers: 30, activeGames: 6, activeResources: 14 },
    averages: { avgBookingDuration: 45, avgBookingValue: 433.33 },
  };

  const mockRevenue = {
    dateRange: { preset: 'last30days', groupBy: 'day' },
    summary: { totalRevenue: 6500, successfulCount: 12, failedCount: 1, cancelledCount: 0, avgTransactionValue: 541.67 },
    trend: [
      { date: '2026-09-01', totalRevenue: 3000, successfulCount: 5, failedCount: 0, cancelledCount: 0, avgAmount: 600 },
      { date: '2026-09-02', totalRevenue: 3500, successfulCount: 7, failedCount: 1, cancelledCount: 0, avgAmount: 500 },
    ],
  };

  const mockBookings = {
    dateRange: { preset: 'last30days', groupBy: 'day' },
    summary: { totalBookings: 15, confirmed: 5, completed: 5, cancelled: 2, noShow: 0, cancellationRate: 13.33, noShowRate: 0 },
    trend: [
      { date: '2026-09-01', totalBookings: 7, confirmed: 2, completed: 3, cancelled: 1, noShow: 0 },
      { date: '2026-09-02', totalBookings: 8, confirmed: 3, completed: 2, cancelled: 1, noShow: 0 },
    ],
    statusBreakdown: [
      { status: 'confirmed', count: 5, percentage: 33.33 },
      { status: 'completed', count: 5, percentage: 33.33 },
      { status: 'cancelled', count: 2, percentage: 13.33 },
    ],
  };

  const mockGames = {
    dateRange: { preset: 'last30days' },
    pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    games: [
      { _id: 'g1', name: 'Laser Tag', category: 'arcade', basePricePerHour: 500, isActive: true, totalBookings: 10, completedBookings: 8, cancelledBookings: 1, noShowBookings: 1, totalDurationMinutes: 600, totalRevenue: 5000, avgBookingDuration: 60, avgBookingValue: 500 },
      { _id: 'g2', name: 'Bowling', category: 'other', basePricePerHour: 400, isActive: true, totalBookings: 5, completedBookings: 4, cancelledBookings: 1, noShowBookings: 0, totalDurationMinutes: 300, totalRevenue: 2000, avgBookingDuration: 60, avgBookingValue: 400 },
    ],
  };

  const mockResources = {
    dateRange: { preset: 'last30days' },
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    resources: [
      { _id: 'r1', name: 'Lane 1', code: 'BWL-01', status: 'available', isActive: true, gameName: 'Bowling', totalBookings: 5, completedBookings: 4, cancelledBookings: 1, noShowBookings: 0, totalBookedMinutes: 300, bookedHours: 5, totalRevenue: 2000 },
    ],
  };

  const mockCustomers = {
    dateRange: { preset: 'last30days' },
    summary: { totalCustomers: 30, newCustomers: 5, activeBookingCustomers: 12, repeatCustomers: 4, avgBookingsPerActiveCustomer: 1.25 },
    hourlyDistribution: Array.from({ length: 24 }, (_, h) => ({ hour: h, hourLabel: `${h}:00`, bookingCount: h === 18 ? 8 : 1 })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    analyticsService.getOverview.mockResolvedValue({ status: 'success', data: mockOverview });
    analyticsService.getRevenueAnalytics.mockResolvedValue({ status: 'success', data: mockRevenue });
    analyticsService.getBookingsAnalytics.mockResolvedValue({ status: 'success', data: mockBookings });
    analyticsService.getGameAnalytics.mockResolvedValue({ status: 'success', data: mockGames });
    analyticsService.getResourceAnalytics.mockResolvedValue({ status: 'success', data: mockResources });
    analyticsService.getCustomerAnalytics.mockResolvedValue({ status: 'success', data: mockCustomers });
  });

  it('1. Renders admin analytics page header & KPI overview cards', async () => {
    renderWithProviders(<AdminAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Business Analytics & Operations Reporting/i)).toBeInTheDocument();
      expect(screen.getAllByText(/6500/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Registered Customers/i)).toBeInTheDocument();
    });
  });

  it('2. Switches tabs cleanly to Revenue, Booking, Games, Resources, and Customers', async () => {
    renderWithProviders(<AdminAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Performance Overview/i)).toBeInTheDocument();
    });

    // Switch to Revenue tab
    fireEvent.click(screen.getByText(/Revenue Analysis/i));
    await waitFor(() => {
      expect(screen.getByText(/Revenue Trend/i)).toBeInTheDocument();
    });

    // Switch to Game Performance tab
    fireEvent.click(screen.getByText(/Game Performance/i));
    await waitFor(() => {
      expect(screen.getByText(/Laser Tag/i)).toBeInTheDocument();
      expect(screen.getByText(/Bowling/i)).toBeInTheDocument();
    });

    // Switch to Resource Utilization tab
    fireEvent.click(screen.getByText(/Resource Utilization/i));
    await waitFor(() => {
      expect(screen.getByText(/Lane 1/i)).toBeInTheDocument();
      expect(screen.getByText(/BWL-01/i)).toBeInTheDocument();
    });

    // Switch to Peak Hours & Customers tab
    fireEvent.click(screen.getByText(/Busiest Hours & Customers/i));
    await waitFor(() => {
      expect(screen.getByText(/Customer Intelligence Metrics/i)).toBeInTheDocument();
    });
  });

  it('3. Triggers new API request when preset dropdown changes', async () => {
    renderWithProviders(<AdminAnalyticsPage />);

    await waitFor(() => {
      expect(analyticsService.getOverview).toHaveBeenCalledWith({ preset: 'last30days' });
    });

    const select = screen.getByLabelText(/Date Range:/i);
    fireEvent.change(select, { target: { value: 'last7days' } });

    await waitFor(() => {
      expect(analyticsService.getOverview).toHaveBeenCalledWith({ preset: 'last7days' });
    });
  });

  it('4. Handles error state gracefully with error banner', async () => {
    analyticsService.getOverview.mockRejectedValue(new Error('Database connection failed'));

    renderWithProviders(<AdminAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Database connection failed/i)).toBeInTheDocument();
    });
  });
});
