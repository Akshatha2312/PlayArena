import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateComponents';

export const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Payment Modal State
  const [selectedPayment, setSelectedPayment] = useState(null);

  const fetchPayments = async (page = 1) => {
    try {
      setLoading(true);
      const res = await adminService.getAllPayments({
        page,
        status: statusFilter,
        search,
      });
      setPayments(res.data?.payments || []);
      setPagination(res.data?.pagination || { page: 1, totalPages: 1, total: 0 });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPayments(1);
  };

  const handleOpenDetail = async (id) => {
    try {
      const res = await adminService.getPaymentById(id);
      setSelectedPayment(res.data);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to load payment detail');
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-header-actions">
        <div>
          <h1 className="admin-title">💳 Financial Transactions Registry</h1>
          <p className="admin-subtitle">Inspect Razorpay payment orders, transaction statuses, and amounts</p>
        </div>

        <div className="admin-filter-bar">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input
              type="text"
              placeholder="Order ID or Payment ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input-search"
            />
            <button type="submit" className="btn-admin-secondary">Search</button>
          </form>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-select"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="created">Created</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Fetching payment transactions..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchPayments(1)} />
      ) : payments.length === 0 ? (
        <EmptyState title="No Payments Found" message="No payment transactions match the selected query." />
      ) : (
        <>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order / Payment ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div><strong>Order:</strong> {p.providerOrderId}</div>
                      {p.providerPaymentId && <div className="sub-text">Pay: {p.providerPaymentId}</div>}
                    </td>
                    <td>
                      <strong>{p.userId?.name || 'Customer'}</strong>
                      <div className="sub-text">{p.userId?.email}</div>
                    </td>
                    <td>
                      <strong>₹{p.amount}</strong> {p.currency}
                    </td>
                    <td>
                      <span className="category-badge">{p.provider}</span>
                    </td>
                    <td>
                      <span className={`status-pill pill-${p.status}`}>
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{new Date(p.createdAt).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn-table-action btn-view"
                        onClick={() => handleOpenDetail(p._id)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination-bar">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchPayments(pagination.page - 1)}
                className="btn-secondary"
              >
                ← Previous
              </button>
              <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchPayments(pagination.page + 1)}
                className="btn-secondary"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>💳 Transaction Record #{selectedPayment._id}</h3>
              <button className="btn-close" onClick={() => setSelectedPayment(null)}>✕</button>
            </div>

            <div className="detail-modal-body">
              <p><strong>Customer:</strong> {selectedPayment.userId?.name} ({selectedPayment.userId?.email})</p>
              <p><strong>Provider Order ID:</strong> {selectedPayment.providerOrderId}</p>
              <p><strong>Provider Payment ID:</strong> {selectedPayment.providerPaymentId || 'None / Not Captured'}</p>
              <p><strong>Amount:</strong> ₹{selectedPayment.amount} {selectedPayment.currency}</p>
              <p><strong>Status:</strong> <span className={`status-pill pill-${selectedPayment.status}`}>{selectedPayment.status}</span></p>
              <p><strong>Created At:</strong> {new Date(selectedPayment.createdAt).toLocaleString()}</p>
              {selectedPayment.paidAt && <p><strong>Paid At:</strong> {new Date(selectedPayment.paidAt).toLocaleString()}</p>}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setSelectedPayment(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
