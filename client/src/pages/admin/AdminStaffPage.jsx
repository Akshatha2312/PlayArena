import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateComponents';

export const AdminStaffPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State for Staff Creation
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await adminService.getStaffList({ search });
      setStaffList(res.data?.staff || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStaff();
  };

  const handleOpenCreate = () => {
    setFormData({ name: '', email: '', phone: '', password: '' });
    setModalError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.password) {
      setModalError('All fields (name, email, phone, password) are required.');
      return;
    }

    try {
      setModalLoading(true);
      await adminService.createStaffUser(formData);
      setShowModal(false);
      fetchStaff();
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Failed to create staff account');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-header-actions">
        <div>
          <h1 className="admin-title">🛡️ Staff Personnel Administration</h1>
          <p className="admin-subtitle">Manage operations staff accounts and grant staff portal access</p>
        </div>

        <div className="admin-filter-bar">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input
              type="text"
              placeholder="Search Staff Name, Email, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input-search"
            />
            <button type="submit" className="btn-admin-secondary">Search</button>
          </form>

          <button className="btn-admin-primary" onClick={handleOpenCreate}>
            ➕ Create Staff Account
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading staff personnel..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchStaff} />
      ) : staffList.length === 0 ? (
        <EmptyState title="No Staff Found" message="No staff accounts match your query." />
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>Assigned Role</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => (
                <tr key={s._id}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>{s.email}</td>
                  <td>{s.phone}</td>
                  <td>
                    <span className="status-pill pill-checked_in">STAFF</span>
                  </td>
                  <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Staff Creation Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>➕ Create Staff Account</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {modalError && <div className="error-banner">{modalError}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Operator"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Staff Email</label>
                <input
                  type="email"
                  placeholder="alex.staff@playarena.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Initial Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-admin-primary" disabled={modalLoading}>
                  {modalLoading ? 'Creating...' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
