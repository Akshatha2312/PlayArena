import { fetchApi } from './api';

export const authService = {
  login: async (email, password) => {
    return fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (userData) => {
    return fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  getProfile: async () => {
    return fetchApi('/customer/profile');
  },
};
