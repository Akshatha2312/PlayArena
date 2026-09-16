import { fetchApi } from './api';

export const waitlistService = {
  createWaitlistEntry: async (payload) => {
    return await fetchApi('/waitlist', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getUserWaitlists: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/waitlist?${query}` : '/waitlist';
    return await fetchApi(endpoint);
  },

  getUserWaitlistById: async (id) => {
    return await fetchApi(`/waitlist/${id}`);
  },

  leaveWaitlist: async (id) => {
    return await fetchApi(`/waitlist/${id}`, {
      method: 'DELETE',
    });
  },
};
