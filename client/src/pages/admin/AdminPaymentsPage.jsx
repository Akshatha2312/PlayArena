import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateComponents';
import { Pagination } from '../../components/Pagination';

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
        limit: 20,
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
    <div className="container page-container">
      <div className="compact-page-header">
        <h1 className="page-title">FINANCIAL TRANSACTIONS REGISTRY</h1>
        <p className="page-subtitle">Inspect Razorpay payment orders, transaction statuses, and amounts.</p>
      </div>

      <div className="compact-toolbar">
        <div className="compact-toolbar-left">
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              type="text"
              placeholder="Order ID or Payment ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="compact-input"
              style={{ minWidth: 200 }}
            />
            <button type="submit" className="btn btn-secondary btn-sm">Search</button>
          </form>
        </div>

        <div className="compact-toolbar-right">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="compact-select"
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
          <div className="dense-table-container">
            <table className="dense-table">
              <thead>
                <tr>
                  <th>ORDER / PAYMENT ID</th>
                  <th>CUSTOMER</th>
                  <th>AMOUNT</th>
                  <th>PROVIDER</th>
                  <th>STATUS</th>
                  <th>DATE</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const statusClass = p.status === 'paid' ? 'badge-paid' : p.status === 'failed' ? 'badge-failed' : 'badge-pending';
                  return (
                    <tr key={p._id}>
                      <td>
                        <strong>Order:</strong> <span className="font-mono text-dim">{p.providerOrderId}</span>
                        {p.providerPaymentId && <span className="text-dim text-xs" style={{ marginLeft: 6 }}>Pay: {p.providerPaymentId}</span>}
                      </td>
                      <td>
                        <strong>{p.userId?.name || 'Customer'}</strong>
                        <span className="text-dim text-xs" style={{ marginLeft: 6 }}>{p.userId?.email}</span>
                      </td>
                      <td>
                        <strong>₹{p.amount} {p.currency || 'INR'}</strong>
                      </td>
                      <td>
                        <span className="badge-compact" style={{ background: 'rgba(100,116,139,0.2)', color: '#94a3b8' }}>{p.provider || 'Razorpay'}</span>
                      </td>
                      <td>
                        <span className={`badge-compact ${statusClass}`}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-action secondary"
                          onClick={() => handleOpenDetail(p._id)}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={pagination.page || 1}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit || 20}
            onPageChange={(p) => fetchPayments(p)}
          />
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

            <div className="modal-actions" style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn-admin-secondary" onClick={() => setSelectedPayment(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
