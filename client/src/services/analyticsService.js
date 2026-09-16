import { fetchApi } from './api';

export const analyticsService = {
  getOverview: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/admin/analytics/overview?${query}` : '/admin/analytics/overview';
    return await fetchApi(endpoint);
  },

  getRevenueAnalytics: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/admin/analytics/revenue?${query}` : '/admin/analytics/revenue';
    return await fetchApi(endpoint);
  },

  getBookingsAnalytics: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/admin/analytics/bookings?${query}` : '/admin/analytics/bookings';
    return await fetchApi(endpoint);
  },

  getGameAnalytics: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/admin/analytics/games?${query}` : '/admin/analytics/games';
    return await fetchApi(endpoint);
  },

  getResourceAnalytics: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/admin/analytics/resources?${query}` : '/admin/analytics/resources';
    return await fetchApi(endpoint);
  },

  getCustomerAnalytics: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/admin/analytics/customers?${query}` : '/admin/analytics/customers';
    return await fetchApi(endpoint);
  },
};
