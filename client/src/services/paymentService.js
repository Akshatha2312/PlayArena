import { fetchApi } from './api';

export const paymentService = {
  createPaymentOrder: async (bookingId) => {
    return fetchApi('/payments/order', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    });
  },

  verifyPayment: async (verificationData) => {
    return fetchApi('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(verificationData),
    });
  },

  getMyPayments: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/payments${queryString ? `?${queryString}` : ''}`);
  },

  getPaymentById: async (id) => {
    return fetchApi(`/payments/${id}`);
  },
};
