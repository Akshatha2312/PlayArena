import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateComponents';

export const AdminGamesPage = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'court',
    basePricePerHour: 500,
    minBookingDurationMinutes: 30,
    maxBookingDurationMinutes: 120,
    bookingIntervalMinutes: 30,
  });
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const res = await adminService.getAllGames();
      setGames(res.data?.games || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load games catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleOpenCreate = () => {
    setEditingGame(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      category: 'court',
      basePricePerHour: 500,
      minBookingDurationMinutes: 30,
      maxBookingDurationMinutes: 120,
      bookingIntervalMinutes: 30,
    });
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEdit = (game) => {
    setEditingGame(game);
    setFormData({
      name: game.name || game.title || '',
      slug: game.slug || '',
      description: game.description || '',
      category: game.category || 'court',
      basePricePerHour: game.basePricePerHour || 500,
      minBookingDurationMinutes: game.minBookingDurationMinutes || 30,
      maxBookingDurationMinutes: game.maxBookingDurationMinutes || 120,
      bookingIntervalMinutes: game.bookingIntervalMinutes || 30,
    });
    setModalError('');
    setShowModal(true);
  };

  const handleToggleActive = async (game) => {
    try {
      await adminService.updateGame(game._id, { isActive: !game.isActive });
      fetchGames();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update game status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.name.trim()) {
      setModalError('Game name is required.');
      return;
    }

    const payload = {
      ...formData,
      slug: formData.slug.trim() || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      basePricePerHour: Number(formData.basePricePerHour),
      minBookingDurationMinutes: Number(formData.minBookingDurationMinutes),
      maxBookingDurationMinutes: Number(formData.maxBookingDurationMinutes),
      bookingIntervalMinutes: Number(formData.bookingIntervalMinutes),
    };

    try {
      setModalLoading(true);
      if (editingGame) {
        await adminService.updateGame(editingGame._id, payload);
      } else {
        await adminService.createGame(payload);
      }
      setShowModal(false);
      fetchGames();
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Failed to save game');
    } finally {
      setModalLoading(false);
    }
  };

  const filteredGames = games.filter((g) =>
    (g.name || g.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (g.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-page-container">
      <div className="admin-header-actions">
        <div>
          <h1 className="admin-title">🎮 Game Catalog Management</h1>
          <p className="admin-subtitle">Configure playable games, hourly pricing, and booking duration rules</p>
        </div>

        <div className="admin-filter-bar">
          <input
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input-search"
          />
          <button className="btn-admin-primary" onClick={handleOpenCreate}>
            ➕ Add New Game
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading games..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchGames} />
      ) : filteredGames.length === 0 ? (
        <EmptyState title="No Games Found" message="No games match your search criteria." />
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Game Name</th>
                <th>Category</th>
                <th>Base Price</th>
                <th>Duration Limits</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map((g) => (
                <tr key={g._id} className={!g.isActive ? 'row-inactive' : ''}>
                  <td>
                    <strong>{g.name || g.title}</strong>
                    <div className="sub-text">Slug: {g.slug}</div>
                  </td>
                  <td>
                    <span className="category-badge">{g.category}</span>
                  </td>
                  <td>
                    <strong>₹{g.basePricePerHour}</strong> / hr
                  </td>
                  <td>
                    <div className="sub-text">Min: {g.minBookingDurationMinutes}m | Max: {g.maxBookingDurationMinutes}m</div>
                    <div className="sub-text">Increment: {g.bookingIntervalMinutes}m</div>
                  </td>
                  <td>
                    <span className={`status-pill ${g.isActive ? 'pill-active' : 'pill-inactive'}`}>
                      {g.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td>
                    <div className="table-action-btns">
                      <button className="btn-table-action btn-view" onClick={() => handleOpenEdit(g)}>
                        Edit
                      </button>
                      <button
                        className={`btn-table-action ${g.isActive ? 'btn-danger' : 'btn-start'}`}
                        onClick={() => handleToggleActive(g)}
                      >
                        {g.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editingGame ? '✏️ Edit Game' : '➕ Create New Game'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {modalError && <div className="error-banner">{modalError}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Game Name</label>
                <input
                  type="text"
                  placeholder="e.g. Badminton Pro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Slug (URL Identifier)</label>
                <input
                  type="text"
                  placeholder="badminton-pro"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="court">Court</option>
                  <option value="table">Table</option>
                  <option value="console">Console</option>
                  <option value="vr">VR</option>
                  <option value="simulator">Simulator</option>
                  <option value="arcade">Arcade</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Base Price / Hr (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.basePricePerHour}
                    onChange={(e) => setFormData({ ...formData, basePricePerHour: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Min Duration (Mins)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={formData.minBookingDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, minBookingDurationMinutes: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Max Duration (Mins)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={formData.maxBookingDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, maxBookingDurationMinutes: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-admin-primary" disabled={modalLoading}>
                  {modalLoading ? 'Saving...' : 'Save Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
