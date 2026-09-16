import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supportService } from '../services/supportService';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { MessageSquare, Send, CheckCircle2, AlertCircle, ArrowLeft, Clock, ShieldCheck, Lock } from 'lucide-react';
import './SupportDetailPage.css';

export const SupportDetailPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [issueData, setIssueData] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    fetchThread();
  }, [id]);

  const fetchThread = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supportService.getCustomerIssueById(id);
      if (res && res.data) {
        setIssueData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load support issue thread.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSending(true);
    setActionError(null);

    try {
      await supportService.addCustomerMessage(id, replyText);
      setReplyText('');
      fetchThread();
    } catch (err) {
      setActionError(err.message || 'Failed to send reply.');
    } finally {
      setSending(false);
    }
  };

  const handleCloseIssue = async () => {
    if (!window.confirm('Are you sure you want to mark this support ticket as closed?')) return;
    setActionError(null);

    try {
      await supportService.closeCustomerIssue(id);
      fetchThread();
    } catch (err) {
      setActionError(err.message || 'Failed to close ticket.');
    }
  };

  const handleReopenIssue = async () => {
    setActionError(null);
    try {
      await supportService.reopenCustomerIssue(id);
      fetchThread();
    } catch (err) {
      setActionError(err.message || 'Failed to reopen ticket.');
    }
  };

  if (loading) return <LoadingState message="Loading support ticket thread..." />;
  if (error) return <div className="container mt-4"><ErrorState message={error} onRetry={fetchThread} /></div>;

  const issue = issueData?.issue;
  const messages = issueData?.messages || [];

  return (
    <div className="container support-detail-page">
      <Link to="/my-support" className="back-link">
        <ArrowLeft className="icon-xs" /> Back to My Support Tickets
      </Link>

      {actionError && <div className="detail-error-alert">{actionError}</div>}

      {issue && (
        <div className="support-thread-card">
          <div className="thread-header">
            <div className="header-meta">
              <span className="issue-number-badge">#{issue.issueNumber}</span>
              <span className="category-pill">{issue.category.toUpperCase()}</span>
              <span className={`status-pill status-${issue.status}`}>{issue.status.replace('_', ' ').toUpperCase()}</span>
            </div>

            <h1 className="thread-title">{issue.subject}</h1>

            <div className="thread-timestamps">
              <span>Submitted: {new Date(issue.createdAt).toLocaleString()}</span>
              {issue.bookingId && (
                <span className="linked-booking-tag">
                  📌 Linked Booking: #{issue.bookingId.bookingReference}
                </span>
              )}
            </div>

            <div className="thread-controls">
              {issue.status !== 'closed' ? (
                <button className="btn-close-ticket" onClick={handleCloseIssue}>
                  <Lock className="icon-xs" /> Close Ticket
                </button>
              ) : (
                <button className="btn-reopen-ticket" onClick={handleReopenIssue}>
                  🔄 Reopen Ticket
                </button>
              )}
            </div>
          </div>

          {/* Messages Timeline */}
          <div className="messages-timeline">
            <h3>💬 Ticket Conversation ({messages.length})</h3>

            <div className="messages-list">
              {messages.map((msg) => {
                const isCustomer = msg.senderRole === 'customer';
                return (
                  <div key={msg._id} className={`message-bubble ${isCustomer ? 'bubble-customer' : 'bubble-staff'}`}>
                    <div className="bubble-header">
                      <span className="sender-name">
                        {isCustomer ? 'You' : `🛡️ ${msg.senderId?.name || 'Support Team'} (${msg.senderRole.toUpperCase()})`}
                      </span>
                      <span className="message-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="bubble-body">{msg.message}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reply Composer */}
          {issue.status !== 'closed' ? (
            <form onSubmit={handleSendReply} className="reply-composer">
              <textarea
                rows="3"
                className="reply-textarea"
                placeholder="Type your response to support staff..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                required
              />
              <div className="composer-footer">
                <button type="submit" className="btn-send-reply" disabled={sending || !replyText.trim()}>
                  <Send className="icon-xs" /> {sending ? 'Sending...' : 'Send Response'}
                </button>
              </div>
            </form>
          ) : (
            <div className="closed-notice">
              <Lock className="icon-sm" /> This ticket is closed. Click "Reopen Ticket" above to continue the conversation.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
