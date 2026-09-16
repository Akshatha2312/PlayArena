import React, { useState, useEffect } from 'react';
import { StaffNavbar } from '../../components/StaffNavbar';
import { supportService } from '../../services/supportService';
import { LoadingState, ErrorState } from '../../components/StateComponents';
import { MessageSquare, ShieldAlert, Send, Lock, CheckCircle2, User, Clock, FileText } from 'lucide-react';
import './StaffSupportQueuePage.css';

export const StaffSupportQueuePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [issues, setIssues] = useState([]);
  const [selectedIssueData, setSelectedIssueData] = useState(null);

  const [activeStatusFilter, setActiveStatusFilter] = useState('');
  const [replyText, setReplyText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [sending, setSending] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    fetchQueue();
  }, [activeStatusFilter]);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supportService.getStaffQueue({ status: activeStatusFilter });
      if (res && res.data) {
        setIssues(res.data.issues || []);
        if (res.data.issues?.length > 0 && !selectedIssueData) {
          selectIssueForView(res.data.issues[0]._id);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load support queue.');
    } finally {
      setLoading(false);
    }
  };

  const selectIssueForView = async (issueId) => {
    setError(null);
    setActionSuccess('');
    try {
      const res = await supportService.getStaffIssueById(issueId);
      if (res && res.data) {
        setSelectedIssueData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load issue details.');
    }
  };

  const handleSendCustomerReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedIssueData) return;

    setSending(true);
    setActionSuccess('');
    try {
      await supportService.addStaffMessage(selectedIssueData.issue._id, replyText);
      setReplyText('');
      setActionSuccess('Response sent to customer!');
      selectIssueForView(selectedIssueData.issue._id);
      fetchQueue();
    } catch (err) {
      setError(err.message || 'Failed to send response.');
    } finally {
      setSending(false);
    }
  };

  const handleAddInternalNote = async (e) => {
    e.preventDefault();
    if (!internalNoteText.trim() || !selectedIssueData) return;

    setSending(true);
    setActionSuccess('');
    try {
      await supportService.addStaffInternalNote(selectedIssueData.issue._id, internalNoteText);
      setInternalNoteText('');
      setActionSuccess('Internal note recorded (hidden from customer).');
      selectIssueForView(selectedIssueData.issue._id);
    } catch (err) {
      setError(err.message || 'Failed to record internal note.');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedIssueData) return;
    setActionSuccess('');
    try {
      await supportService.updateIssueStatus(selectedIssueData.issue._id, newStatus);
      setActionSuccess(`Status updated to ${newStatus.toUpperCase()}`);
      selectIssueForView(selectedIssueData.issue._id);
      fetchQueue();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    }
  };

  if (loading) return <LoadingState message="Loading Staff Support Operations Queue..." />;

  const currentIssue = selectedIssueData?.issue;
  const messages = selectedIssueData?.messages || [];

  return (
    <div className="staff-support-page">
      <StaffNavbar />
      <div className="container staff-support-container">
        <div className="staff-support-header">
          <div>
            <h1>💬 Staff Support Operations Queue</h1>
            <p>Review customer inquiries, respond to tickets, record internal notes, and manage issue lifecycles.</p>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={fetchQueue} />}
        {actionSuccess && <div className="staff-action-alert"><CheckCircle2 className="icon-sm" /> {actionSuccess}</div>}

        <div className="staff-support-grid">
          {/* Support Queue List */}
          <div className="queue-list-card">
            <div className="queue-filter-bar">
              <button className={`filter-btn ${activeStatusFilter === '' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('')}>All</button>
              <button className={`filter-btn ${activeStatusFilter === 'open' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('open')}>Open</button>
              <button className={`filter-btn ${activeStatusFilter === 'in_progress' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('in_progress')}>In Progress</button>
              <button className={`filter-btn ${activeStatusFilter === 'waiting_for_customer' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('waiting_for_customer')}>Waiting</button>
            </div>

            <div className="queue-items-scroll">
              {issues.map((iss) => {
                const isSelected = currentIssue && String(currentIssue._id) === String(iss._id);
                return (
                  <button
                    key={iss._id}
                    className={`queue-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectIssueForView(iss._id)}
                  >
                    <div className="item-top">
                      <span className="iss-num">#{iss.issueNumber}</span>
                      <span className={`iss-priority priority-${iss.priority}`}>{iss.priority.toUpperCase()}</span>
                      <span className={`iss-status status-${iss.status}`}>{iss.status}</span>
                    </div>
                    <div className="iss-subject">{iss.subject}</div>
                    <div className="iss-customer">👤 {iss.userId?.name || 'Customer'} • {new Date(iss.createdAt).toLocaleDateString()}</div>
                  </button>
                );
              })}

              {issues.length === 0 && (
                <div className="empty-queue">
                  <MessageSquare className="icon-lg" />
                  <p>No support tickets in this queue view.</p>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Inspection & Response Pane */}
          <div className="issue-inspection-card">
            {currentIssue ? (
              <div className="inspection-content">
                <div className="inspection-header">
                  <div className="meta-row">
                    <span className="num-tag">#{currentIssue.issueNumber}</span>
                    <span className="category-tag">{currentIssue.category.toUpperCase()}</span>
                    <span className={`priority-tag priority-${currentIssue.priority}`}>Priority: {currentIssue.priority}</span>
                  </div>

                  <h2>{currentIssue.subject}</h2>

                  <div className="customer-info-box">
                    <span>👤 Customer: <strong>{currentIssue.userId?.name}</strong> ({currentIssue.userId?.email})</span>
                    {currentIssue.bookingId && (
                      <span>📌 Linked Booking: <strong>#{currentIssue.bookingId.bookingReference}</strong></span>
                    )}
                  </div>

                  {/* Status Control Actions */}
                  <div className="status-control-bar">
                    <span className="control-label">Status:</span>
                    <button className="btn-status-action" onClick={() => handleUpdateStatus('in_progress')}>Set In Progress</button>
                    <button className="btn-status-action" onClick={() => handleUpdateStatus('resolved')}>Mark Resolved</button>
                    <button className="btn-status-action" onClick={() => handleUpdateStatus('closed')}>Close Ticket</button>
                  </div>
                </div>

                {/* Conversation Thread */}
                <div className="staff-messages-thread">
                  <h4>Message Thread & Internal Notes ({messages.length})</h4>

                  <div className="thread-messages">
                    {messages.map((m) => (
                      <div key={m._id} className={`staff-bubble ${m.isInternal ? 'bubble-internal' : m.senderRole === 'customer' ? 'bubble-cust' : 'bubble-staff-resp'}`}>
                        <div className="msg-header">
                          <span className="msg-author">
                            {m.isInternal ? '🔒 INTERNAL OPERATIONAL NOTE' : `${m.senderId?.name || 'User'} (${m.senderRole.toUpperCase()})`}
                          </span>
                          <span className="msg-time">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="msg-text">{m.message}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Response & Internal Note Forms */}
                <div className="composer-tabs">
                  <div className="form-section">
                    <h5>💬 Public Customer Response (Notifies Customer)</h5>
                    <form onSubmit={handleSendCustomerReply}>
                      <textarea
                        rows="2"
                        className="form-control"
                        placeholder="Type response to customer..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <button type="submit" className="btn-staff-send" disabled={sending || !replyText.trim()}>
                        <Send className="icon-xs" /> Send Customer Reply
                      </button>
                    </form>
                  </div>

                  <div className="form-section internal-section">
                    <h5>🔒 Internal Note (Visible to Staff/Admin ONLY)</h5>
                    <form onSubmit={handleAddInternalNote}>
                      <textarea
                        rows="2"
                        className="form-control"
                        placeholder="Add private operational notes..."
                        value={internalNoteText}
                        onChange={(e) => setInternalNoteText(e.target.value)}
                      />
                      <button type="submit" className="btn-internal-send" disabled={sending || !internalNoteText.trim()}>
                        <Lock className="icon-xs" /> Save Internal Note
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-ticket-selected">
                <MessageSquare className="icon-lg" />
                <p>Select a ticket from the queue to view full history, send replies, or record internal notes.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
