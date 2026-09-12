import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const StaffLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginStaff } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setLoading(true);
      await loginStaff(email.trim(), password);
      navigate('/staff/dashboard');
    } catch (err) {
      setError(err.message || 'Staff login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-login-container">
      <div className="staff-login-card">
        <div className="staff-login-header">
          <h2>⚡ Play Arena Operations</h2>
          <p>Staff & Administrative Control Portal</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="staff-login-form">
          <div className="form-group">
            <label htmlFor="email">Staff Email</label>
            <input
              id="email"
              type="email"
              placeholder="operator@playarena.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-staff-primary" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In to Operations'}
          </button>
        </form>

        <div className="staff-login-footer">
          <small>Protected System — Authorized Personnel Only</small>
        </div>
      </div>
    </div>
  );
};
