import { fetchApi } from './api';

export const supportService = {
  // Customer APIs
  createIssue: async (issueData) => {
    return await fetchApi('/support/issues', {
      method: 'POST',
      body: JSON.stringify(issueData),
    });
  },

  getCustomerIssues: async (queryOptions = {}) => {
    const params = new URLSearchParams();
    if (queryOptions.status) params.append('status', queryOptions.status);
    if (queryOptions.page) params.append('page', queryOptions.page);
    if (queryOptions.limit) params.append('limit', queryOptions.limit);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return await fetchApi(`/support/issues${queryString}`);
  },

  getCustomerIssueById: async (id) => {
    return await fetchApi(`/support/issues/${id}`);
  },

  addCustomerMessage: async (id, message) => {
    return await fetchApi(`/support/issues/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  closeCustomerIssue: async (id) => {
    return await fetchApi(`/support/issues/${id}/close`, {
      method: 'POST',
    });
  },

  reopenCustomerIssue: async (id) => {
    return await fetchApi(`/support/issues/${id}/reopen`, {
      method: 'POST',
    });
  },

  // Staff / Admin APIs
  getStaffQueue: async (queryOptions = {}) => {
    const params = new URLSearchParams();
    if (queryOptions.status) params.append('status', queryOptions.status);
    if (queryOptions.priority) params.append('priority', queryOptions.priority);
    if (queryOptions.category) params.append('category', queryOptions.category);
    if (queryOptions.page) params.append('page', queryOptions.page);
    if (queryOptions.limit) params.append('limit', queryOptions.limit);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return await fetchApi(`/support/staff/queue${queryString}`);
  },

  getStaffIssueById: async (id) => {
    return await fetchApi(`/support/staff/issues/${id}`);
  },

  addStaffMessage: async (id, message) => {
    return await fetchApi(`/support/staff/issues/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  addStaffInternalNote: async (id, note) => {
    return await fetchApi(`/support/staff/issues/${id}/internal-notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  updateIssueStatus: async (id, status) => {
    return await fetchApi(`/support/staff/issues/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  updateIssuePriority: async (id, priority) => {
    return await fetchApi(`/support/staff/issues/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    });
  },

  assignIssue: async (id, assigneeId) => {
    return await fetchApi(`/support/staff/issues/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assigneeId }),
    });
  },
};
