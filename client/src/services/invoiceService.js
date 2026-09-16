import { fetchApi } from './api';

export const invoiceService = {
  getCustomerInvoices: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/invoices${queryString ? `?${queryString}` : ''}`);
  },

  getCustomerInvoiceById: async (id) => {
    return fetchApi(`/invoices/${id}`);
  },

  getInvoiceByBookingId: async (bookingId) => {
    return fetchApi(`/invoices/booking/${bookingId}`);
  },

  getAdminInvoices: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/invoices/admin/all${queryString ? `?${queryString}` : ''}`);
  },

  getAdminInvoiceById: async (id) => {
    return fetchApi(`/invoices/admin/${id}`);
  },
};
