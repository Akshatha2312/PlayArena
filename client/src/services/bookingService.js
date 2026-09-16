import { fetchApi } from './api';

export const bookingService = {
  createBooking: async (bookingData) => {
    return fetchApi('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  getUserBookings: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/bookings${queryString ? `?${queryString}` : ''}`);
  },

  getUserBookingById: async (id) => {
    return fetchApi(`/bookings/${id}`);
  },

  cancelBooking: async (id, cancellationReason = '') => {
    return fetchApi(`/bookings/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ cancellationReason }),
    });
  },

  rescheduleBooking: async (id, payload) => {
    return fetchApi(`/bookings/${id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
