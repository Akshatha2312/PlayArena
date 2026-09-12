import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateComponents';

export const AdminResourcesPage = () => {
  const [resources, setResources] = useState([]);
  const [games, setGames] = useState([]);
  const [gameFilter, setGameFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState({
    gameId: '',
    name: '',
    status: 'available',
    customPricePerHour: '',
  });
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchResourcesAndGames = async () => {
    try {
      setLoading(true);
      const [resData, gamesData] = await Promise.all([
        adminService.getAllResources({ gameId: gameFilter }),
        adminService.getAllGames(),
      ]);

      setResources(resData.data?.resources || []);
      setGames(gamesData.data?.games || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResourcesAndGames();
  }, [gameFilter]);

  const handleOpenCreate = () => {
    setEditingResource(null);
    setFormData({
      gameId: games[0]?._id || '',
      name: '',
      status: 'available',
      customPricePerHour: '',
    });
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEdit = (res) => {
    setEditingResource(res);
    setFormData({
      gameId: res.gameId?._id || res.gameId || '',
      name: res.name || '',
      status: res.status || 'available',
      customPricePerHour: res.customPricePerHour !== undefined && res.customPricePerHour !== null ? res.customPricePerHour : '',
    });
    setModalError('');
    setShowModal(true);
  };

  const handleToggleActive = async (resItem) => {
    try {
      await adminService.updateResource(resItem._id, { isActive: !resItem.isActive });
      fetchResourcesAndGames();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update resource status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.name.trim()) {
      setModalError('Resource name is required.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      status: formData.status,
      customPricePerHour: formData.customPricePerHour !== '' ? Number(formData.customPricePerHour) : undefined,
    };

    try {
      setModalLoading(true);
      if (editingResource) {
        await adminService.updateResource(editingResource._id, payload);
      } else {
        if (!formData.gameId) {
          setModalError('Please select a game.');
          setModalLoading(false);
          return;
        }
        await adminService.createResource(formData.gameId, payload);
      }
      setShowModal(false);
      fetchResourcesAndGames();
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Failed to save resource');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-header-actions">
        <div>
          <h1 className="admin-title">🏟️ Physical Resource Inventory</h1>
          <p className="admin-subtitle">Manage courts, tables, consoles, status, and price overrides</p>
        </div>

        <div className="admin-filter-bar">
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="admin-select"
          >
            <option value="">All Games</option>
            {games.map((g) => (
              <option key={g._id} value={g._id}>{g.name || g.title}</option>
            ))}
          </select>

          <button className="btn-admin-primary" onClick={handleOpenCreate}>
            ➕ Add New Resource
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading resource inventory..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchResourcesAndGames} />
      ) : resources.length === 0 ? (
        <EmptyState title="No Resources Found" message="No physical resources configured for this filter." />
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Resource Name</th>
                <th>Game Category</th>
                <th>Effective Hourly Rate</th>
                <th>Operational Status</th>
                <th>Active State</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => {
                const gameTitle = r.gameId?.name || r.gameId?.title || 'Game';
                const basePrice = r.gameId?.basePricePerHour || 0;
                const effectivePrice = r.customPricePerHour !== undefined && r.customPricePerHour !== null ? r.customPricePerHour : basePrice;

                return (
                  <tr key={r._id} className={!r.isActive ? 'row-inactive' : ''}>
                    <td>
                      <strong>{r.name}</strong>
                    </td>
                    <td>
                      <span className="category-badge">{gameTitle}</span>
                    </td>
                    <td>
                      <strong>₹{effectivePrice}</strong> / hr
                      {r.customPricePerHour !== undefined && r.customPricePerHour !== null && (
                        <div className="sub-text text-accent">(Custom Override, Base: ₹{basePrice})</div>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill pill-${r.status}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${r.isActive ? 'pill-active' : 'pill-inactive'}`}>
                        {r.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <div className="table-action-btns">
                        <button className="btn-table-action btn-view" onClick={() => handleOpenEdit(r)}>
                          Edit
                        </button>
                        <button
                          className={`btn-table-action ${r.isActive ? 'btn-danger' : 'btn-start'}`}
                          onClick={() => handleToggleActive(r)}
                        >
                          {r.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editingResource ? '✏️ Edit Resource' : '➕ Create New Resource'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {modalError && <div className="error-banner">{modalError}</div>}

            <form onSubmit={handleSubmit}>
              {!editingResource && (
                <div className="form-group">
                  <label>Game</label>
                  <select
                    value={formData.gameId}
                    onChange={(e) => setFormData({ ...formData, gameId: e.target.value })}
                    required
                  >
                    <option value="">-- Select Game --</option>
                    {games.map((g) => (
                      <option key={g._id} value={g._id}>{g.name || g.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Resource Name</label>
                <input
                  type="text"
                  placeholder="e.g. Badminton Court 1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Operational Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="out_of_service">Out of Service</option>
                </select>
              </div>

              <div className="form-group">
                <label>Custom Price / Hr Override (Optional)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Leave empty to use Game base price"
                  value={formData.customPricePerHour}
                  onChange={(e) => setFormData({ ...formData, customPricePerHour: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-admin-primary" disabled={modalLoading}>
                  {modalLoading ? 'Saving...' : 'Save Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
