import React, { useState, useEffect } from 'react';
import { AdminNavbar } from '../../components/AdminNavbar';
import { supportService } from '../../services/supportService';
import { LoadingState, ErrorState } from '../../components/StateComponents';
import { ShieldCheck, MessageSquare, AlertCircle, CheckCircle2, UserCheck, Sliders, Send, Lock } from 'lucide-react';
import './AdminSupportPage.css';

export const AdminSupportPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [issues, setIssues] = useState([]);
  const [selectedIssueData, setSelectedIssueData] = useState(null);

  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [replyText, setReplyText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [sending, setSending] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    fetchAdminQueue();
  }, [filterPriority, filterStatus]);

  const fetchAdminQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supportService.getStaffQueue({
        priority: filterPriority,
        status: filterStatus,
      });
      if (res && res.data) {
        setIssues(res.data.issues || []);
        if (res.data.issues?.length > 0 && !selectedIssueData) {
          selectIssueForAdminView(res.data.issues[0]._id);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load admin support console queue.');
    } finally {
      setLoading(false);
    }
  };

  const selectIssueForAdminView = async (issueId) => {
    setError(null);
    setActionSuccess('');
    try {
      const res = await supportService.getStaffIssueById(issueId);
      if (res && res.data) {
        setSelectedIssueData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load admin issue detail.');
    }
  };

  const handleUpdatePriority = async (newPriority) => {
    if (!selectedIssueData) return;
    setActionSuccess('');
    try {
      await supportService.updateIssuePriority(selectedIssueData.issue._id, newPriority);
      setActionSuccess(`Priority updated to ${newPriority.toUpperCase()}`);
      selectIssueForAdminView(selectedIssueData.issue._id);
      fetchAdminQueue();
    } catch (err) {
      setError(err.message || 'Failed to update priority.');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedIssueData) return;
    setActionSuccess('');
    try {
      await supportService.updateIssueStatus(selectedIssueData.issue._id, newStatus);
      setActionSuccess(`Status updated to ${newStatus.toUpperCase()}`);
      selectIssueForAdminView(selectedIssueData.issue._id);
      fetchAdminQueue();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    }
  };

  const handleAdminReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedIssueData) return;

    setSending(true);
    setActionSuccess('');
    try {
      await supportService.addStaffMessage(selectedIssueData.issue._id, replyText);
      setReplyText('');
      setActionSuccess('Admin response sent to customer!');
      selectIssueForAdminView(selectedIssueData.issue._id);
      fetchAdminQueue();
    } catch (err) {
      setError(err.message || 'Failed to send admin response.');
    } finally {
      setSending(false);
    }
  };

  const handleAdminInternalNote = async (e) => {
    e.preventDefault();
    if (!internalNoteText.trim() || !selectedIssueData) return;

    setSending(true);
    setActionSuccess('');
    try {
      await supportService.addStaffInternalNote(selectedIssueData.issue._id, internalNoteText);
      setInternalNoteText('');
      setActionSuccess('Admin internal note saved.');
      selectIssueForAdminView(selectedIssueData.issue._id);
    } catch (err) {
      setError(err.message || 'Failed to save internal note.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingState message="Loading Admin Support Operations Console..." />;

  const currentIssue = selectedIssueData?.issue;
  const messages = selectedIssueData?.messages || [];

  return (
    <div className="admin-support-page">
      <AdminNavbar />
      <div className="container admin-support-container">
        <div className="admin-support-header">
          <div>
            <h1>🛡️ Admin Support Control Console</h1>
            <p>Full operational oversight across customer issues, priority escalation, assignment, and internal audit notes.</p>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={fetchAdminQueue} />}
        {actionSuccess && <div className="admin-action-alert"><CheckCircle2 className="icon-sm" /> {actionSuccess}</div>}

        {/* Overview Stats */}
        <div className="support-stats-bar">
          <div className="stat-card">
            <span className="stat-num">{issues.length}</span>
            <span className="stat-label">Total Tickets</span>
          </div>
          <div className="stat-card">
            <span className="stat-num stat-urgent">{issues.filter((i) => i.priority === 'urgent').length}</span>
            <span className="stat-label">Urgent Priority</span>
          </div>
          <div className="stat-card">
            <span className="stat-num stat-open">{issues.filter((i) => i.status === 'open' || i.status === 'in_progress').length}</span>
            <span className="stat-label">Active Open</span>
          </div>
          <div className="stat-card">
            <span className="stat-num stat-resolved">{issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length}</span>
            <span className="stat-label">Resolved / Closed</span>
          </div>
        </div>

        <div className="admin-support-grid">
          {/* Admin Support Queue */}
          <div className="admin-queue-card">
            <div className="filter-controls">
              <select className="filter-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_for_customer">Waiting</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="queue-scroll">
              {issues.map((iss) => {
                const isSelected = currentIssue && String(currentIssue._id) === String(iss._id);
                return (
                  <button
                    key={iss._id}
                    className={`queue-card-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectIssueForAdminView(iss._id)}
                  >
                    <div className="item-row1">
                      <span className="iss-num">#{iss.issueNumber}</span>
                      <span className={`prio-badge prio-${iss.priority}`}>{iss.priority.toUpperCase()}</span>
                      <span className="status-tag">{iss.status}</span>
                    </div>
                    <div className="iss-title">{iss.subject}</div>
                    <div className="iss-sub">👤 {iss.userId?.name} • Category: {iss.category}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin Ticket Detail & Controls */}
          <div className="admin-detail-card">
            {currentIssue ? (
              <div className="admin-detail-content">
                <div className="admin-detail-header">
                  <div className="header-meta">
                    <span className="num-pill">#{currentIssue.issueNumber}</span>
                    <span className="cat-pill">{currentIssue.category.toUpperCase()}</span>
                    <span className={`prio-badge prio-${currentIssue.priority}`}>Priority: {currentIssue.priority.toUpperCase()}</span>
                  </div>

                  <h2>{currentIssue.subject}</h2>

                  <div className="meta-box">
                    <div>👤 Customer: <strong>{currentIssue.userId?.name}</strong> ({currentIssue.userId?.email})</div>
                    {currentIssue.bookingId && <div>📌 Linked Booking: <strong>#{currentIssue.bookingId.bookingReference}</strong></div>}
                  </div>

                  {/* Priority & Status Controls */}
                  <div className="admin-controls-row">
                    <div className="control-group">
                      <span className="label">Set Priority:</span>
                      <button className="btn-prio-opt" onClick={() => handleUpdatePriority('urgent')}>Urgent</button>
                      <button className="btn-prio-opt" onClick={() => handleUpdatePriority('high')}>High</button>
                      <button className="btn-prio-opt" onClick={() => handleUpdatePriority('medium')}>Medium</button>
                    </div>

                    <div className="control-group">
                      <span className="label">Set Status:</span>
                      <button className="btn-stat-opt" onClick={() => handleUpdateStatus('in_progress')}>In Progress</button>
                      <button className="btn-stat-opt" onClick={() => handleUpdateStatus('resolved')}>Resolved</button>
                      <button className="btn-stat-opt" onClick={() => handleUpdateStatus('closed')}>Closed</button>
                    </div>
                  </div>
                </div>

                {/* Conversation & Notes Thread */}
                <div className="admin-thread-section">
                  <h4>Conversation & Operational History</h4>

                  <div className="admin-messages-list">
                    {messages.map((m) => (
                      <div key={m._id} className={`admin-msg-bubble ${m.isInternal ? 'internal-note-bubble' : 'public-msg-bubble'}`}>
                        <div className="msg-top">
                          <span>{m.isInternal ? '🔒 ADMIN/STAFF INTERNAL NOTE' : `💬 ${m.senderId?.name || 'User'} (${m.senderRole.toUpperCase()})`}</span>
                          <span className="msg-date">{new Date(m.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="msg-content">{m.message}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="admin-action-forms">
                  <form onSubmit={handleAdminReply} className="form-box">
                    <h5>💬 Send Customer Response</h5>
                    <textarea rows="2" className="form-control" placeholder="Public response..." value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                    <button type="submit" className="btn-admin-reply" disabled={sending || !replyText.trim()}>Send Response</button>
                  </form>

                  <form onSubmit={handleAdminInternalNote} className="form-box internal-box">
                    <h5>🔒 Record Admin Internal Audit Note</h5>
                    <textarea rows="2" className="form-control" placeholder="Private internal note..." value={internalNoteText} onChange={(e) => setInternalNoteText(e.target.value)} />
                    <button type="submit" className="btn-admin-note" disabled={sending || !internalNoteText.trim()}>Save Audit Note</button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="admin-no-selection">
                <ShieldCheck className="icon-lg" />
                <p>Select a ticket from the admin queue to inspect details, escalate priority, reply, or add audit notes.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
