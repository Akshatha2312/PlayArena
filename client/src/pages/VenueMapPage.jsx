import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import venueService from '../services/venueService';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { MapPin, Navigation, Info, ShieldAlert, CheckCircle2, Wrench, AlertTriangle, Layers, LayoutGrid } from 'lucide-react';
import './VenueMapPage.css';

export const VenueMapPage = () => {
  const [searchParams] = useSearchParams();
  const highlightedResourceId = searchParams.get('highlightResource');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [layout, setLayout] = useState(null);

  const [activeFloor, setActiveFloor] = useState('');
  const [activeZone, setActiveZone] = useState('ALL');
  const [selectedResource, setSelectedResource] = useState(null);

  useEffect(() => {
    fetchLayout();
  }, []);

  const fetchLayout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await venueService.getPublicVenueLayout();
      if (res && res.data) {
        setLayout(res.data);
        const defaultFloor = res.data.floors?.[0] || 'Ground Floor';
        setActiveFloor(defaultFloor);

        // Auto-select highlighted resource if provided in query param
        if (highlightedResourceId && res.data.resources) {
          const match = res.data.resources.find((r) => String(r._id) === String(highlightedResourceId));
          if (match) {
            setSelectedResource(match);
            if (match.floor) setActiveFloor(match.floor);
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load venue layout map.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="Rendering Play Arena venue map..." />;
  if (error) return <div className="container mt-4"><ErrorState message={error} onRetry={fetchLayout} /></div>;

  const resourcesOnFloor = (layout?.resources || []).filter((r) => (r.floor || 'Ground Floor') === activeFloor);
  const zonesOnFloor = Array.from(new Set(resourcesOnFloor.map((r) => r.zone || 'Main Arena')));

  const filteredResources = activeZone === 'ALL'
    ? resourcesOnFloor
    : resourcesOnFloor.filter((r) => (r.zone || 'Main Arena') === activeZone);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return <span className="status-badge status-available"><CheckCircle2 className="icon-sm" /> Operational</span>;
      case 'maintenance':
        return <span className="status-badge status-maintenance"><Wrench className="icon-sm" /> Maintenance</span>;
      case 'out_of_service':
        return <span className="status-badge status-out-of-service"><AlertTriangle className="icon-sm" /> Out of Service</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="venue-map-page">
      <div className="venue-map-header">
        <div className="container">
          <div className="venue-header-content">
            <div>
              <span className="venue-tag">📍 Physical Facility Map</span>
              <h1>Play Arena Venue Layout</h1>
              <p>Find your booked court, table, console station, or explore facilities across floors.</p>
            </div>
            {highlightedResourceId && (
              <div className="highlight-notice">
                <Navigation className="highlight-icon" />
                <span>Showing location for your selected booking resource.</span>
              </div>
            )}
          </div>

          {/* Floor Selection Tabs */}
          <div className="floor-tabs">
            {(layout?.floors || ['Ground Floor']).map((fl) => (
              <button
                key={fl}
                className={`floor-tab-btn ${activeFloor === fl ? 'active' : ''}`}
                onClick={() => {
                  setActiveFloor(fl);
                  setActiveZone('ALL');
                }}
              >
                <Layers className="tab-icon" />
                {fl}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container venue-map-body">
        {/* Zone Filters */}
        <div className="zone-filter-bar">
          <span className="filter-label"><LayoutGrid className="icon-sm" /> Zones:</span>
          <button
            className={`zone-pill ${activeZone === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveZone('ALL')}
          >
            All Zones ({resourcesOnFloor.length})
          </button>
          {zonesOnFloor.map((zn) => {
            const count = resourcesOnFloor.filter((r) => (r.zone || 'Main Arena') === zn).length;
            return (
              <button
                key={zn}
                className={`zone-pill ${activeZone === zn ? 'active' : ''}`}
                onClick={() => setActiveZone(zn)}
              >
                {zn} ({count})
              </button>
            );
          })}
        </div>

        <div className="venue-map-layout-grid">
          {/* Spatial Blueprint Map Card */}
          <div className="blueprint-card">
            <div className="blueprint-header">
              <h3><MapPin className="icon-md" /> {activeFloor} Blueprint Layout</h3>
              <span className="blueprint-subtitle">Click any court or station for full details</span>
            </div>

            <div className="venue-blueprint-canvas">
              {/* Common Venue Facilities */}
              <div className="facility-block reception-block">
                <span>🛎️ Reception & Ticketing</span>
              </div>
              <div className="facility-block lounge-block">
                <span>☕ Arena Cafe & Lounge</span>
              </div>
              <div className="facility-block exit-block">
                <span>🚪 Main Entrance / Exit</span>
              </div>

              {/* Resource Interactive Nodes */}
              <div className="resource-nodes-grid">
                {filteredResources.map((res) => {
                  const isHighlighted = String(res._id) === String(highlightedResourceId);
                  const isSelected = selectedResource && String(selectedResource._id) === String(res._id);

                  return (
                    <div
                      key={res._id}
                      className={`resource-map-node status-${res.status} ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedResource(res)}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedResource(res)}
                      aria-label={`Select ${res.gameName} ${res.displayLabel}`}
                    >
                      <div className="node-category">{res.gameName}</div>
                      <div className="node-title">{res.displayLabel}</div>
                      <div className="node-zone">{res.zone}</div>
                      {isHighlighted && <span className="highlight-badge">YOUR BOOKING</span>}
                    </div>
                  );
                })}
              </div>

              {filteredResources.length === 0 && (
                <div className="empty-blueprint">
                  <Info className="icon-lg" />
                  <p>No active resources positioned in this zone/floor.</p>
                </div>
              )}
            </div>
          </div>

          {/* Selected Resource Sidebar Detail */}
          <div className="resource-detail-sidebar">
            {selectedResource ? (
              <div className="detail-card">
                <div className="detail-card-header">
                  <span className="game-badge">{selectedResource.gameName}</span>
                  <h2>{selectedResource.displayLabel || selectedResource.name}</h2>
                  {getStatusBadge(selectedResource.status)}
                </div>

                <div className="detail-meta-list">
                  <div className="meta-item">
                    <span className="meta-label">Floor:</span>
                    <span className="meta-value">{selectedResource.floor}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Zone / Area:</span>
                    <span className="meta-value">{selectedResource.zone}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Hourly Rate:</span>
                    <span className="meta-value highlight-price">₹{selectedResource.effectivePricePerHour}/hr</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Max Capacity:</span>
                    <span className="meta-value">{selectedResource.capacity} Players</span>
                  </div>
                  {selectedResource.locationNote && (
                    <div className="meta-item meta-note">
                      <span className="meta-label">Location Note:</span>
                      <span className="meta-value">{selectedResource.locationNote}</span>
                    </div>
                  )}
                </div>

                <div className="detail-actions">
                  {selectedResource.status === 'available' ? (
                    <Link
                      to={`/booking/${selectedResource.gameId}/${selectedResource._id}`}
                      className="btn-book-now"
                    >
                      ⚡ Book This Resource
                    </Link>
                  ) : (
                    <button className="btn-book-disabled" disabled>
                      Currently Unavailable for Booking
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="select-prompt-card">
                <MapPin className="prompt-icon" />
                <h3>Select a Resource</h3>
                <p>Click any court, table, or console node on the map to inspect location notes, capacity, and hourly rate.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
