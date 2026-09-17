import React, { useEffect, useState } from 'react';
import { paymentService } from '../services/paymentService';
import { LoadingState, ErrorState, EmptyState } from '../components/StateComponents';
import { Pagination } from '../components/Pagination';
import { CreditCard, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import './MyPaymentsPage.css';

export const MyPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    paymentService
      .getMyPayments()
      .then((res) => {
        setPayments(res.data || []);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load payment history');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingState message="Loading payment transactions history..." />;
  if (error) return <ErrorState message={error} />;

  const totalPages = Math.ceil(payments.length / itemsPerPage) || 1;
  const paginatedPayments = payments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="container page-container">
      <div className="compact-page-header">
        <h1 className="page-title">MY PAYMENTS</h1>
        <p className="page-subtitle">Historical log of Razorpay payment orders and verification statuses.</p>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          title="No Payment History"
          message="You have no recorded payment transactions yet."
          actionLink="/games"
          actionText="Book a Game"
        />
      ) : (
        <>
          {/* Desktop Compact Table */}
          <div className="dense-table-container dense-table-desktop">
            <table className="dense-table">
              <thead>
                <tr>
                  <th>ORDER ID</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>PAYMENT ID</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayments.map((p) => {
                  const statusClass = p.status === 'paid' ? 'badge-paid' : p.status === 'failed' ? 'badge-failed' : 'badge-pending';
                  return (
                    <tr key={p._id || p.id}>
                      <td><span className="font-mono text-dim">{p.providerOrderId || (p._id ? `#${p._id.substring(0, 10)}` : '—')}</span></td>
                      <td><strong>₹{p.amount} {p.currency || 'INR'}</strong></td>
                      <td>
                        <span className={`badge-compact ${statusClass}`}>
                          {p.status}
                        </span>
                      </td>
                      <td><span className="font-mono text-dim">{p.providerPaymentId || '—'}</span></td>
                      <td>{new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Compact Cards */}
          <div className="compact-cards-list">
            {paginatedPayments.map((p) => {
              const statusClass = p.status === 'paid' ? 'badge-paid' : p.status === 'failed' ? 'badge-failed' : 'badge-pending';
              return (
                <div key={p._id || p.id} className="compact-card-item">
                  <div className="compact-card-header">
                    <span className="compact-card-title">₹{p.amount} {p.currency || 'INR'}</span>
                    <span className={`badge-compact ${statusClass}`}>{p.status}</span>
                  </div>
                  <div className="compact-card-meta">
                    <span>Order: {p.providerOrderId || '—'}</span>
                    <span>Date: {new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                  {p.providerPaymentId && (
                    <div className="text-xs text-dim font-mono">
                      Pay ID: {p.providerPaymentId}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={payments.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </>
      )}
    </div>
  );
};

