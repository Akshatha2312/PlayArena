import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supportService } from '../services/supportService';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Pagination } from '../components/Pagination';
import { Plus, Clock, CheckCircle2, HelpCircle, ChevronRight, X } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage) || 1;
  const paginatedIssues = filteredIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="badge-compact badge-pending">OPEN</span>;
      case 'in_progress':
        return <span className="badge-compact badge-pending">⚡ IN PROGRESS</span>;
      case 'waiting_for_customer':
        return <span className="badge-compact badge-pending">⏳ ACTION REQ</span>;
      case 'resolved':
        return <span className="badge-compact badge-confirmed">RESOLVED</span>;
      case 'closed':
        return <span className="badge-compact badge-cancelled">CLOSED</span>;
      default:
        return <span className="badge-compact">{status}</span>;
    }
  };

  if (loading) return <LoadingState message="Loading your support tickets..." />;
  if (error) return <div className="container page-container"><ErrorState message={error} onRetry={fetchIssues} /></div>;

  return (
    <div className="container page-container">
      <div className="compact-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 className="page-title">HELP & SUPPORT CENTER</h1>
          <p className="page-subtitle">Submit tickets, report booking issues, or track support requests.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          <Plus size={15} style={{ marginRight: 4 }} /> New Support Ticket
        </button>
      </div>

      {/* Filter Tabs Toolbar */}
      <div className="compact-toolbar">
        <div className="compact-toolbar-left">
          <button className={`tab-btn ${activeTab === 'ALL' ? 'active' : ''}`} onClick={() => { setActiveTab('ALL'); setCurrentPage(1); }}>
            ALL TICKETS ({issues.length})
          </button>
          <button className={`tab-btn ${activeTab === 'OPEN' ? 'active' : ''}`} onClick={() => { setActiveTab('OPEN'); setCurrentPage(1); }}>
            OPEN ({issues.filter((i) => i.status !== 'resolved' && i.status !== 'closed').length})
          </button>
          <button className={`tab-btn ${activeTab === 'RESOLVED' ? 'active' : ''}`} onClick={() => { setActiveTab('RESOLVED'); setCurrentPage(1); }}>
            RESOLVED ({issues.filter((i) => i.status === 'resolved').length})
          </button>
          <button className={`tab-btn ${activeTab === 'CLOSED' ? 'active' : ''}`} onClick={() => { setActiveTab('CLOSED'); setCurrentPage(1); }}>
            CLOSED ({issues.filter((i) => i.status === 'closed').length})
          </button>
        </div>
      </div>

      {filteredIssues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', backgroundColor: '#12141a', borderRadius: '8px', border: '1px solid #262936' }}>
          <HelpCircle size={32} style={{ color: '#6b7280', marginBottom: '8px' }} />
          <h3 style={{ color: '#e2e8f0', marginBottom: '4px' }}>No Support Tickets Found</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>You haven't submitted any support tickets under this filter view.</p>
        </div>
      ) : (
        <>
          {/* Desktop Dense Table */}
          <div className="dense-table-container dense-table-desktop">
            <table className="dense-table">
              <thead>
                <tr>
                  <th>TICKET #</th>
                  <th>CATEGORY</th>
                  <th>SUBJECT</th>
                  <th>LINKED BOOKING</th>
                  <th>STATUS</th>
                  <th>SUBMITTED</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {paginatedIssues.map((issue) => (
                  <tr 
                    key={issue._id}
                    className="clickable-row"
                    onClick={() => navigate(`/support/${issue._id}`)}
                  >
                    <td><span className="font-mono text-dim">#{issue.issueNumber}</span></td>
                    <td><span className="text-xs uppercase">{issue.category.replace('_', ' ')}</span></td>
                    <td><strong>{issue.subject}</strong></td>
                    <td>{issue.bookingId?.bookingReference ? `#${issue.bookingId.bookingReference}` : '—'}</td>
                    <td>{getStatusBadge(issue.status)}</td>
                    <td className="text-dim text-xs">{new Date(issue.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/support/${issue._id}`} className="btn-icon-link" onClick={(e) => e.stopPropagation()}>
                        <ChevronRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Compact Cards */}
          <div className="compact-cards-list">
            {paginatedIssues.map((issue) => (
              <div key={issue._id} className="compact-card-item" onClick={() => navigate(`/support/${issue._id}`)}>
                <div className="compact-card-header">
                  <span className="compact-card-title">#{issue.issueNumber} · {issue.subject}</span>
                  {getStatusBadge(issue.status)}
                </div>
                <div className="compact-card-meta">
                  <span>Cat: {issue.category}</span>
                  <span>Submitted: {new Date(issue.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="compact-card-actions">
                  <Link to={`/support/${issue._id}`} className="btn-text-action" onClick={(e) => e.stopPropagation()}>
                    View Thread →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredIssues.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </>
      )}

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

