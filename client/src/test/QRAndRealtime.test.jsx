import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { StaffCheckInPage } from '../pages/staff/StaffCheckInPage';
import { qrService } from '../services/qrService';
import { staffService } from '../services/staffService';
import { socketService } from '../services/socketService';

vi.mock('../services/qrService');
vi.mock('../services/staffService');
vi.mock('../services/socketService');

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Phase 10 QR & Real-Time Frontend Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    socketService.connect.mockReturnValue({});
    socketService.subscribe.mockReturnValue(() => {});
  });

  it('1. QRCodeDisplay renders SVG QR matrix with SCAN FOR ENTRY caption', () => {
    render(<QRCodeDisplay value="PAQR:v1:booking123:123456789:signature" size={200} />);
    expect(screen.getByText('SCAN FOR ENTRY')).toBeInTheDocument();
  });

  it('2. StaffCheckInPage verifies valid QR payload and shows booking details', async () => {
    const mockVerifiedData = {
      booking: {
        _id: 'b101',
        bookingReference: 'BK101',
        status: 'confirmed',
        startAt: new Date().toISOString(),
        endAt: new Date().toISOString(),
        userId: { name: 'John Doe', email: 'john@example.com' },
        gameId: { title: 'Badminton' },
        resourceId: { name: 'Court 1' },
      },
      validity: { eligible: true, reason: 'Eligible for check-in' },
    };

    qrService.verifyQR.mockResolvedValue({ data: mockVerifiedData });

    renderWithProviders(<StaffCheckInPage />);

    const input = screen.getByPlaceholderText(/Paste QR payload/i);
    fireEvent.change(input, { target: { value: 'PAQR:v1:b101:123456:sig' } });

    fireEvent.click(screen.getByText('Search Booking / Verify QR Code'));

    await waitFor(() => {
      expect(qrService.verifyQR).toHaveBeenCalledWith('PAQR:v1:b101:123456:sig');
      expect(screen.getByText('Booking #BK101')).toBeInTheDocument();
      expect(screen.getByText('CONFIRMED')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Badminton')).toBeInTheDocument();
    });
  });

  it('3. Staff clicking "CONFIRM CHECK-IN" calls checkInBooking and updates status', async () => {
    const mockVerifiedData = {
      booking: {
        _id: 'b101',
        bookingReference: 'BK101',
        status: 'confirmed',
        startAt: new Date().toISOString(),
        endAt: new Date().toISOString(),
        userId: { name: 'John Doe' },
        gameId: { title: 'Badminton' },
        resourceId: { name: 'Court 1' },
      },
      validity: { eligible: true, reason: 'Eligible for check-in' },
    };

    qrService.verifyQR.mockResolvedValue({ data: mockVerifiedData });
    staffService.checkInBooking.mockResolvedValue({ data: { booking: { ...mockVerifiedData.booking, status: 'checked_in' } } });

    renderWithProviders(<StaffCheckInPage />);

    const input = screen.getByPlaceholderText(/Paste QR payload/i);
    fireEvent.change(input, { target: { value: 'PAQR:v1:b101:123456:sig' } });
    fireEvent.click(screen.getByText('Search Booking / Verify QR Code'));

    await waitFor(() => {
      expect(screen.getByText('✔ CONFIRM CHECK-IN')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('✔ CONFIRM CHECK-IN'));

    await waitFor(() => {
      expect(staffService.checkInBooking).toHaveBeenCalledWith('b101');
      expect(screen.getByText(/Check-In Successful/i)).toBeInTheDocument();
    });
  });

  it('4. Handles invalid or expired QR payload error gracefully', async () => {
    qrService.verifyQR.mockRejectedValue(new Error('Invalid or expired QR payload'));

    renderWithProviders(<StaffCheckInPage />);

    const input = screen.getByPlaceholderText(/Paste QR payload/i);
    fireEvent.change(input, { target: { value: 'PAQR:invalid:payload' } });
    fireEvent.click(screen.getByText('Search Booking / Verify QR Code'));

    await waitFor(() => {
      expect(screen.getByText(/Invalid or expired QR payload/i)).toBeInTheDocument();
    });
  });

  it('5. Manual Lookup tab allows searching customer by email or phone', async () => {
    staffService.lookupBooking.mockResolvedValue({
      data: {
        bookings: [
          {
            _id: 'b202',
            status: 'confirmed',
            startAt: new Date().toISOString(),
            userId: { name: 'Alice Smith', email: 'alice@example.com' },
            gameId: { title: 'Table Tennis' },
            resourceId: { name: 'Table 1' },
          },
        ],
      },
    });

    renderWithProviders(<StaffCheckInPage />);

    fireEvent.click(screen.getByText(/Manual Lookup/i));

    const input = screen.getByPlaceholderText(/Search by ID/i);
    fireEvent.change(input, { target: { value: 'alice@example.com' } });
    fireEvent.click(screen.getByText('Search Booking'));

    await waitFor(() => {
      expect(staffService.lookupBooking).toHaveBeenCalledWith('alice@example.com');
      expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
    });
  });
});
