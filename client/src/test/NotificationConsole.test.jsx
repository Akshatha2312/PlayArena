import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import NotificationsPage from '../pages/NotificationsPage';
import { Navbar } from '../components/Navbar';
import { notificationService } from '../services/notificationService';

vi.mock('../services/notificationService');

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Phase 9 Notifications Frontend Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('1. Renders notifications list with titles and type badges', async () => {
    const mockNotifications = [
      {
        _id: 'n1',
        type: 'booking_confirmed',
        title: 'Booking Confirmed!',
        message: 'Your booking for Badminton Court 1 is confirmed.',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'n2',
        type: 'payment_success',
        title: 'Payment Successful',
        message: 'Payment of ₹500 was received.',
        isRead: true,
        createdAt: new Date().toISOString(),
      },
    ];

    notificationService.getNotifications.mockResolvedValue({
      data: {
        notifications: mockNotifications,
        unreadCount: 1,
      },
    });

    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
      expect(screen.getByText('Payment Successful')).toBeInTheDocument();
      expect(screen.getByText('CONFIRMED')).toBeInTheDocument();
      expect(screen.getByText('PAYMENT')).toBeInTheDocument();
    });
  });

  it('2. Clicking "Mark as read" invokes service and updates state', async () => {
    const mockNotifications = [
      {
        _id: 'n1',
        type: 'booking_confirmed',
        title: 'Booking Confirmed!',
        message: 'Your booking is confirmed.',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ];

    notificationService.getNotifications.mockResolvedValue({
      data: {
        notifications: mockNotifications,
        unreadCount: 1,
      },
    });

    notificationService.markAsRead.mockResolvedValue({
      data: { notification: { ...mockNotifications[0], isRead: true } },
    });

    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Mark as read')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark as read'));

    await waitFor(() => {
      expect(notificationService.markAsRead).toHaveBeenCalledWith('n1');
    });
  });

  it('3. Clicking "Mark All as Read" invokes service', async () => {
    const mockNotifications = [
      {
        _id: 'n1',
        type: 'booking_confirmed',
        title: 'Booking Confirmed!',
        message: 'Your booking is confirmed.',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ];

    notificationService.getNotifications.mockResolvedValue({
      data: {
        notifications: mockNotifications,
        unreadCount: 1,
      },
    });

    notificationService.markAllAsRead.mockResolvedValue({
      data: { modifiedCount: 1 },
    });

    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Mark All as Read')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark All as Read'));

    await waitFor(() => {
      expect(notificationService.markAllAsRead).toHaveBeenCalled();
    });
  });

  it('4. Renders empty state when no notifications are returned', async () => {
    notificationService.getNotifications.mockResolvedValue({
      data: { notifications: [], unreadCount: 0 },
    });

    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('No notifications found')).toBeInTheDocument();
    });
  });

  it('5. Renders error state on API failure', async () => {
    notificationService.getNotifications.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('6. Navbar renders unread count badge for authenticated customer', async () => {
    const user = { id: 'u1', name: 'John Doe', role: 'customer' };
    localStorage.setItem('play_arena_token', 'mock_token');
    localStorage.setItem('play_arena_user', JSON.stringify(user));

    notificationService.getUnreadCount.mockResolvedValue({
      data: { unreadCount: 3 },
    });

    renderWithProviders(<Navbar />);

    await waitFor(() => {
      expect(screen.getAllByLabelText('Notifications').length).toBeGreaterThan(0);
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    });
  });
});
