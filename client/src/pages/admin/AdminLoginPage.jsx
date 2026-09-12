import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both admin email and password.');
      return;
    }

    try {
      setLoading(true);
      await loginAdmin(email.trim(), password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Admin login failed. Invalid credentials or insufficient permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h2>👑 Play Arena Control Center</h2>
          <p>Administrative System Portal</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="admin-email">Admin Email</label>
            <input
              id="admin-email"
              type="email"
              placeholder="admin@playarena.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-admin-primary" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In to Control Center'}
          </button>
        </form>

        <div className="admin-login-footer">
          <small>Strictly Restricted — Administrative Access Only</small>
        </div>
      </div>
    </div>
  );
};
