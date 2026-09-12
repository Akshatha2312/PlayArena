import { fetchApi } from './api';

export const notificationService = {
  getNotifications: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/notifications${query ? `?${query}` : ''}`);
  },

  getUnreadCount: async () => {
    return fetchApi('/notifications/unread-count');
  },

  markAsRead: async (id) => {
    return fetchApi(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  markAllAsRead: async () => {
    return fetchApi('/notifications/read-all', {
      method: 'PATCH',
    });
  },
};
