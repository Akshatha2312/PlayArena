import React, { useEffect, useState } from 'react';
import { fetchApi } from '../services/api';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Bell, Phone, MessageSquare, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import './NotificationSettingsPage.css';

export const NotificationSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [phone, setPhone] = useState('');
  const [preferences, setPreferences] = useState({
    emailEnabled: true,
    inAppEnabled: true,
    whatsappEnabled: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/settings/notifications');
      if (res && res.data) {
        setPhone(res.data.phone || '');
        setPreferences(res.data.notificationPreferences || {
          emailEnabled: true,
          inAppEnabled: true,
          whatsappEnabled: true,
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetchApi('/settings/notifications', {
        method: 'PATCH',
        body: JSON.stringify({
          phone,
          emailEnabled: preferences.emailEnabled,
          inAppEnabled: preferences.inAppEnabled,
          whatsappEnabled: preferences.whatsappEnabled,
        }),
      });

      setSuccess('Notification preferences updated successfully!');
      if (res && res.data) {
        setPhone(res.data.phone);
        setPreferences(res.data.notificationPreferences);
      }
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading notification settings..." />;
  if (error && !preferences) return <ErrorState message={error} />;

  return (
    <div className="container page-container">
      <div className="settings-card">
        <div className="settings-header">
          <Bell className="header-icon" />
          <div>
            <h1 className="settings-title">NOTIFICATION PREFERENCES</h1>
            <p className="settings-subtitle">Manage how you receive booking updates, reminders, and alerts.</p>
          </div>
        </div>

        {success && (
          <div className="alert-box alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="alert-box alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Phone Number Field */}
          <div className="form-section">
            <h3 className="section-title">
              <Phone size={18} /> Phone Number (Required for WhatsApp)
            </h3>
            <div className="form-group">
              <label htmlFor="user-phone">Mobile Phone (with country code, e.g. +91 9876543210)</label>
              <input
                id="user-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="input-field"
                required
              />
              <span className="field-hint">Used exclusively for transactional booking status alerts via WhatsApp.</span>
            </div>
          </div>

          {/* Delivery Channels */}
          <div className="form-section">
            <h3 className="section-title">Delivery Channels</h3>

            {/* Email Toggle */}
            <div className="toggle-row">
              <div className="toggle-info">
                <span className="toggle-label"><Mail size={16} /> Email Notifications</span>
                <span className="toggle-desc">Receive receipts, booking confirmations, and reminders via email.</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.emailEnabled}
                  onChange={() => handleToggle('emailEnabled')}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* In-App Toggle */}
            <div className="toggle-row">
              <div className="toggle-info">
                <span className="toggle-label"><Bell size={16} /> In-App Alerts</span>
                <span className="toggle-desc">Show notification badge and bell updates inside Play Arena app.</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.inAppEnabled}
                  onChange={() => handleToggle('inAppEnabled')}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* WhatsApp Toggle */}
            <div className="toggle-row">
              <div className="toggle-info">
                <span className="toggle-label"><MessageSquare size={16} /> WhatsApp Business Alerts</span>
                <span className="toggle-desc">Receive instant WhatsApp messages for confirmed bookings, waitlist claims, and start alerts.</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.whatsappEnabled}
                  onChange={() => handleToggle('whatsappEnabled')}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving Preferences...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
