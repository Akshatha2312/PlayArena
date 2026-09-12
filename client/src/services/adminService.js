import { fetchApi } from './api';

export const adminService = {
  getDashboardSummary: async () => {
    return await fetchApi('/admin/dashboard');
  },

  // Game Management
  getAllGames: async () => {
    return await fetchApi('/admin/games');
  },
  createGame: async (payload) => {
    return await fetchApi('/admin/games', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateGame: async (id, payload) => {
    return await fetchApi(`/admin/games/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteGame: async (id) => {
    return await fetchApi(`/admin/games/${id}`, {
      method: 'DELETE',
    });
  },

  // Resource Management
  getAllResources: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/admin/resources?${query}` : '/admin/resources';
    return await fetchApi(endpoint);
  },
  createResource: async (gameId, payload) => {
    return await fetchApi(`/admin/games/${gameId}/resources`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateResource: async (id, payload) => {
    return await fetchApi(`/admin/resources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteResource: async (id) => {
    return await fetchApi(`/admin/resources/${id}`, {
      method: 'DELETE',
    });
  },

  // Bookings Management
  getAllBookings: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/admin/bookings?${query}` : '/admin/bookings';
    return await fetchApi(endpoint);
  },
  getBookingById: async (id) => {
    return await fetchApi(`/admin/bookings/${id}`);
  },

  // Customers Management
  getCustomers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/admin/customers?${query}` : '/admin/customers';
    return await fetchApi(endpoint);
  },
  getCustomerById: async (id) => {
    return await fetchApi(`/admin/customers/${id}`);
  },

  // Staff Management
  getStaffList: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/admin/staff?${query}` : '/admin/staff';
    return await fetchApi(endpoint);
  },
  createStaffUser: async (payload) => {
    return await fetchApi('/admin/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateStaffUser: async (id, payload) => {
    return await fetchApi(`/admin/staff/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // Payments Management
  getAllPayments: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/admin/payments?${query}` : '/admin/payments';
    return await fetchApi(endpoint);
  },
  getPaymentById: async (id) => {
    return await fetchApi(`/admin/payments/${id}`);
  },
};
