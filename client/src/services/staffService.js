import { fetchApi } from './api';

export const staffService = {
  getDashboardSummary: async () => {
    return await fetchApi('/staff/dashboard');
  },

  getSchedule: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/staff/bookings?${query}` : '/staff/bookings';
    return await fetchApi(endpoint);
  },

  getBookingDetails: async (id) => {
    return await fetchApi(`/staff/bookings/${id}`);
  },

  lookupBooking: async (query) => {
    return await fetchApi('/staff/check-in/lookup', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },

  checkInBooking: async (id) => {
    return await fetchApi(`/staff/bookings/${id}/check-in`, {
      method: 'POST',
    });
  },

  startSession: async (id) => {
    return await fetchApi(`/staff/bookings/${id}/start`, {
      method: 'POST',
    });
  },

  completeSession: async (id) => {
    return await fetchApi(`/staff/bookings/${id}/complete`, {
      method: 'POST',
    });
  },

  markNoShow: async (id) => {
    return await fetchApi(`/staff/bookings/${id}/no-show`, {
      method: 'POST',
    });
  },

  createWalkInBooking: async (payload) => {
    return await fetchApi('/staff/walk-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
