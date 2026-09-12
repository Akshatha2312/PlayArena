import React, { useEffect, useState } from 'react';
import { paymentService } from '../services/paymentService';
import { LoadingState, ErrorState, EmptyState } from '../components/StateComponents';
import { CreditCard, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import './MyPaymentsPage.css';

export const MyPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div className="container page-container">
      <div className="payments-header">
        <h1 className="page-title">PAYMENT TRANSACTIONS</h1>
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
        <div className="payments-table-wrapper">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment ID</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id || p.id}>
                  <td className="font-mono">{p.providerOrderId}</td>
                  <td className="price-text">₹{p.amount} {p.currency}</td>
                  <td>
                    <span className={`badge badge-${p.status === 'paid' ? 'paid' : p.status === 'failed' ? 'failed' : 'pending'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="font-mono">{p.providerPaymentId || '—'}</td>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
