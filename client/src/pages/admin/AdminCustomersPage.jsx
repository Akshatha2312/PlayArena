import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateComponents';
import { Pagination } from '../../components/Pagination';

export const AdminCustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Customer Modal State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchCustomers = async (page = 1) => {
    try {
      setLoading(true);
      const res = await adminService.getCustomers({ page, search });
      setCustomers(res.data?.customers || []);
      setPagination(res.data?.pagination || { page: 1, totalPages: 1, total: 0 });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load customer directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers(1);
  };

  const handleOpenDetail = async (id) => {
    try {
      setModalLoading(true);
      const res = await adminService.getCustomerById(id);
      setSelectedCustomer(res.data?.customer);
      setCustomerBookings(res.data?.bookings || []);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to load customer profile');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-header-actions">
        <div>
          <h1 className="admin-title">👥 Customer Directory</h1>
          <p className="admin-subtitle">Inspect registered player profiles and historical booking activity</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="search-form" style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Search Name, Email, or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input-search"
          />
          <button type="submit" className="btn-admin-secondary">Search</button>
        </form>
      </div>

      {loading ? (
        <LoadingState message="Fetching customer records..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchCustomers(1)} />
      ) : customers.length === 0 ? (
        <EmptyState title="No Customers Found" message="No customer accounts match your search." />
      ) : (
        <>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Email Address</th>
                  <th>Phone Number</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <strong>{c.name}</strong>
                    </td>
                    <td>{c.email}</td>
                    <td>{c.phone || 'N/A'}</td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn-table-action btn-view"
                        onClick={() => handleOpenDetail(c._id)}
                      >
                        Profile & History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={pagination.page || 1}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.total}
            itemsPerPage={10}
            onPageChange={(p) => fetchCustomers(p)}
          />
        </>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-card modal-lg">
            <div className="modal-header">
              <h3>👤 Customer Profile: {selectedCustomer.name}</h3>
              <button className="btn-close" onClick={() => setSelectedCustomer(null)}>✕</button>
            </div>

            <div className="detail-modal-body">
              <div className="customer-info-box">
                <p><strong>Email:</strong> {selectedCustomer.email}</p>
                <p><strong>Phone:</strong> {selectedCustomer.phone || 'N/A'}</p>
                <p><strong>Registered:</strong> {new Date(selectedCustomer.createdAt).toLocaleString()}</p>
              </div>

              <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Booking History ({customerBookings.length})</h4>
              {customerBookings.length === 0 ? (
                <p className="sub-text">No bookings found for this customer.</p>
              ) : (
                <table className="admin-compact-table">
                  <thead>
                    <tr>
                      <th>Game & Resource</th>
                      <th>Scheduled Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerBookings.map((b) => (
                      <tr key={b._id}>
                        <td>{b.gameId?.title || b.gameId?.name} - {b.resourceId?.name}</td>
                        <td>{new Date(b.startAt).toLocaleString()}</td>
                        <td>₹{b.totalAmount}</td>
                        <td>
                          <span className={`status-pill pill-${b.status}`}>{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn-admin-secondary" onClick={() => setSelectedCustomer(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
