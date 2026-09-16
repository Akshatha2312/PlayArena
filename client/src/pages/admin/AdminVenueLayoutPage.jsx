import React, { useState, useEffect } from 'react';
import { AdminNavbar } from '../../components/AdminNavbar';
import { venueService } from '../../services/venueService';
import { LoadingState, ErrorState } from '../../components/StateComponents';
import { MapPin, Save, Layers, LayoutGrid, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import './AdminVenueLayoutPage.css';

export const AdminVenueLayoutPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [layoutData, setLayoutData] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);

  // Editable Form State
  const [formData, setFormData] = useState({
    floor: 'Ground Floor',
    zone: 'Main Arena',
    positionOrder: 1,
    displayLabel: '',
    isVisibleOnMap: true,
  });

  useEffect(() => {
    fetchAdminLayout();
  }, []);

  const fetchAdminLayout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await venueService.getAdminVenueLayout();
      if (res && res.data) {
        setLayoutData(res.data);
        if (res.data.resources?.length > 0) {
          selectResourceForEdit(res.data.resources[0]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin venue layout data.');
    } finally {
      setLoading(false);
    }
  };

  const selectResourceForEdit = (resource) => {
    setSelectedResource(resource);
    setFormData({
      floor: resource.floor || 'Ground Floor',
      zone: resource.zone || 'Main Arena',
      positionOrder: resource.positionOrder || 1,
      displayLabel: resource.displayLabel || resource.name,
      isVisibleOnMap: resource.isVisibleOnMap !== false,
    });
    setSuccessMsg('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedResource) return;

    setSaving(true);
    setError(null);
    setSuccessMsg('');

    try {
      const res = await venueService.updateResourceLocation(selectedResource._id, formData);
      setSuccessMsg(`Layout positioning saved for ${selectedResource.name}`);

      // Refresh layout data cleanly
      const updatedLayout = await venueService.getAdminVenueLayout();
      if (updatedLayout && updatedLayout.data) {
        setLayoutData(updatedLayout.data);
        const match = updatedLayout.data.resources.find((r) => String(r._id) === String(selectedResource._id));
        if (match) setSelectedResource(match);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update resource location settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading Admin Venue Layout Editor..." />;

  return (
    <div className="admin-venue-page">
      <AdminNavbar />
      <div className="container admin-venue-container">
        <div className="admin-venue-header">
          <div>
            <h1>🗺️ Venue Layout Management Editor</h1>
            <p>Configure floors, zones, map order, display labels, and spatial visibility for all resources.</p>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={fetchAdminLayout} />}
        {successMsg && (
          <div className="admin-success-alert">
            <CheckCircle2 className="icon-sm" /> {successMsg}
          </div>
        )}

        <div className="admin-venue-grid">
          {/* Resource Selector & Layout List */}
          <div className="admin-resource-list-card">
            <h3><Layers className="icon-sm" /> Configured Resources</h3>
            <div className="admin-resources-scroll">
              {(layoutData?.resources || []).map((r) => {
                const isSelected = selectedResource && String(selectedResource._id) === String(r._id);
                return (
                  <button
                    key={r._id}
                    className={`admin-resource-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectResourceForEdit(r)}
                  >
                    <div className="item-header">
                      <span className="item-game">{r.gameName}</span>
                      <span className={`item-visibility ${r.isVisibleOnMap ? 'visible' : 'hidden'}`}>
                        {r.isVisibleOnMap ? <Eye className="icon-xs" /> : <EyeOff className="icon-xs" />}
                      </span>
                    </div>
                    <div className="item-name">{r.displayLabel || r.name}</div>
                    <div className="item-meta">
                      📍 {r.floor} • {r.zone} (Order: {r.positionOrder})
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Editor Form */}
          <div className="admin-location-editor-card">
            {selectedResource ? (
              <form onSubmit={handleSave} className="admin-editor-form">
                <h3>Editing: {selectedResource.name} ({selectedResource.gameName})</h3>

                <div className="form-group">
                  <label htmlFor="floorSelect">Floor / Level</label>
                  <input
                    id="floorSelect"
                    type="text"
                    className="form-control"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    placeholder="e.g. Ground Floor, First Floor"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="zoneSelect">Zone / Area</label>
                  <input
                    id="zoneSelect"
                    type="text"
                    className="form-control"
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    placeholder="e.g. Zone A - Courts, Gaming Lounge"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="displayLabelInput">Custom Map Display Label</label>
                  <input
                    id="displayLabelInput"
                    type="text"
                    className="form-control"
                    value={formData.displayLabel}
                    onChange={(e) => setFormData({ ...formData, displayLabel: e.target.value })}
                    placeholder="Custom map label (defaults to resource name)"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="positionOrderInput">Display Position / Order Index</label>
                  <input
                    id="positionOrderInput"
                    type="number"
                    min="1"
                    className="form-control"
                    value={formData.positionOrder}
                    onChange={(e) => setFormData({ ...formData, positionOrder: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group form-checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isVisibleOnMap}
                      onChange={(e) => setFormData({ ...formData, isVisibleOnMap: e.target.checked })}
                    />
                    Show Resource on Public Venue Map
                  </label>
                </div>

                <div className="editor-actions">
                  <button type="submit" className="btn-admin-save" disabled={saving}>
                    <Save className="icon-sm" /> {saving ? 'Saving...' : 'Save Location Settings'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="no-selection">
                <MapPin className="icon-lg" />
                <p>Select a resource from the list to edit its floor, zone, and map position.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
