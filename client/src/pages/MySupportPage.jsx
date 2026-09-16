import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supportService } from '../services/supportService';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { MessageSquare, Plus, Clock, CheckCircle2, AlertTriangle, HelpCircle, FileText, ArrowRight, X } from 'lucide-react';
import './MySupportPage.css';

export const MySupportPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const linkedBookingId = searchParams.get('bookingId');
  const linkedBookingRef = searchParams.get('bookingRef');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [issues, setIssues] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');

  // New Issue Modal Form State
  const [showModal, setShowModal] = useState(Boolean(linkedBookingId));
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [formData, setFormData] = useState({
    category: 'booking',
    subject: linkedBookingRef ? `Issue regarding Booking #${linkedBookingRef}` : '',
    description: '',
    bookingId: linkedBookingId || '',
  });

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supportService.getCustomerIssues();
      if (res && res.data) {
        setIssues(res.data.issues || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load support issues.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      const res = await supportService.createIssue(formData);
      if (res && res.data && res.data.issue) {
        setShowModal(false);
        setFormData({ category: 'booking', subject: '', description: '', bookingId: '' });
        fetchIssues();
        navigate(`/support/${res.data.issue._id}`);
      }
    } catch (err) {
      setModalError(err.message || 'Failed to create support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIssues = activeTab === 'ALL'
    ? issues
    : issues.filter((i) => {
        if (activeTab === 'OPEN') return i.status === 'open' || i.status === 'in_progress' || i.status === 'waiting_for_customer';
        if (activeTab === 'RESOLVED') return i.status === 'resolved';
        if (activeTab === 'CLOSED') return i.status === 'closed';
        return true;
      });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="status-badge badge-open"><Clock className="icon-xs" /> Open</span>;
      case 'in_progress':
        return <span className="status-badge badge-in-progress">⚡ In Progress</span>;
      case 'waiting_for_customer':
        return <span className="status-badge badge-waiting">⏳ Response Requested</span>;
      case 'resolved':
        return <span className="status-badge badge-resolved"><CheckCircle2 className="icon-xs" /> Resolved</span>;
      case 'closed':
        return <span className="status-badge badge-closed">Closed</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  if (loading) return <LoadingState message="Loading your support tickets..." />;
  if (error) return <div className="container mt-4"><ErrorState message={error} onRetry={fetchIssues} /></div>;

  return (
    <div className="my-support-page">
      <div className="support-header">
        <div className="container support-header-content">
          <div>
            <span className="support-tag">💬 Customer Assistance</span>
            <h1>Help & Support Center</h1>
            <p>Submit a ticket, report booking issues, or follow up on operational assistance.</p>
          </div>
          <button className="btn-create-ticket" onClick={() => setShowModal(true)}>
            <Plus className="icon-sm" /> Create Support Ticket
          </button>
        </div>
      </div>

      <div className="container support-body">
        {/* Status Tabs */}
        <div className="support-tab-bar">
          <button className={`tab-pill ${activeTab === 'ALL' ? 'active' : ''}`} onClick={() => setActiveTab('ALL')}>
            All Tickets ({issues.length})
          </button>
          <button className={`tab-pill ${activeTab === 'OPEN' ? 'active' : ''}`} onClick={() => setActiveTab('OPEN')}>
            Active / Open ({issues.filter((i) => i.status !== 'resolved' && i.status !== 'closed').length})
          </button>
          <button className={`tab-pill ${activeTab === 'RESOLVED' ? 'active' : ''}`} onClick={() => setActiveTab('RESOLVED')}>
            Resolved ({issues.filter((i) => i.status === 'resolved').length})
          </button>
          <button className={`tab-pill ${activeTab === 'CLOSED' ? 'active' : ''}`} onClick={() => setActiveTab('CLOSED')}>
            Closed ({issues.filter((i) => i.status === 'closed').length})
          </button>
        </div>

        {/* Tickets List */}
        <div className="support-issues-list">
          {filteredIssues.map((issue) => (
            <div key={issue._id} className="support-issue-card">
              <div className="card-top">
                <span className="issue-number">#{issue.issueNumber}</span>
                <span className="issue-category">{issue.category.toUpperCase().replace('_', ' ')}</span>
                {getStatusBadge(issue.status)}
              </div>

              <h3 className="issue-subject">{issue.subject}</h3>
              <p className="issue-description-snippet">{issue.description.slice(0, 140)}...</p>

              {issue.bookingId && (
                <div className="issue-booking-meta">
                  📌 Linked to Booking: <strong>#{issue.bookingId.bookingReference}</strong>
                </div>
              )}

              <div className="card-footer">
                <span className="issue-date">Submitted: {new Date(issue.createdAt).toLocaleDateString()}</span>
                <Link to={`/support/${issue._id}`} className="btn-view-thread">
                  View Thread <ArrowRight className="icon-xs" />
                </Link>
              </div>
            </div>
          ))}

          {filteredIssues.length === 0 && (
            <div className="empty-support-card">
              <HelpCircle className="empty-icon" />
              <h3>No Support Tickets Found</h3>
              <p>You haven't submitted any support tickets under this filter view.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Issue Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="support-modal">
            <div className="modal-header">
              <h2>💬 Submit Support Ticket</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X /></button>
            </div>

            {modalError && <div className="modal-error-alert">{modalError}</div>}

            <form onSubmit={handleCreateSubmit} className="support-form">
              <div className="form-group">
                <label htmlFor="categorySelect">Issue Category</label>
                <select
                  id="categorySelect"
                  className="form-control"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="booking">Booking / Reservation</option>
                  <option value="payment">Payment & Billing</option>
                  <option value="refund">Refund Request</option>
                  <option value="venue">Venue & Facilities</option>
                  <option value="game_resource">Game / Resource Issue</option>
                  <option value="check_in">QR / Check-In</option>
                  <option value="invoice">Invoice / Receipt</option>
                  <option value="technical">Technical Support</option>
                  <option value="other">Other Inquiry</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="subjectInput">Subject</label>
                <input
                  id="subjectInput"
                  type="text"
                  className="form-control"
                  placeholder="Brief summary of the issue"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="descriptionInput">Detailed Description</label>
                <textarea
                  id="descriptionInput"
                  rows="4"
                  className="form-control"
                  placeholder="Please describe what happened and how we can assist you..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
