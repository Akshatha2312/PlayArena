import { fetchApi } from './api';

export const qrService = {
  getBookingQR: async (bookingId) => {
    return fetchApi(`/bookings/${bookingId}/qr`);
  },

  verifyQR: async (qrPayload) => {
    return fetchApi('/staff/check-in/verify-qr', {
      method: 'POST',
      body: JSON.stringify({ qrPayload }),
    });
  },
};
