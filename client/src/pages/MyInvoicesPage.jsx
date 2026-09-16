import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { invoiceService } from '../services/invoiceService';
import { LoadingState, ErrorState, EmptyState } from '../components/StateComponents';
import { FileText, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import './MyInvoicesPage.css';

export const MyInvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoiceService.getCustomerInvoices();
      if (res && res.data) {
        setInvoices(res.data.invoices || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load customer invoices');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading your invoices & receipts..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="container page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">MY INVOICES & RECEIPTS</h1>
        <p className="page-subtitle">View and print official receipts for your Play Arena court bookings.</p>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title="No Invoices Issued Yet"
          message="Invoices are generated automatically once a booking payment is confirmed."
          actionLink="/games"
          actionText="Explore Games & Reserve Court"
        />
      ) : (
        <div className="invoices-grid">
          {invoices.map((inv) => {
            const book = inv.bookingSnapshot || {};

            return (
              <div key={inv._id} className="invoice-card">
                <div className="invoice-card-header">
                  <div>
                    <span className="invoice-num">{inv.invoiceNumber}</span>
                    <p className="invoice-date">Issued: {new Date(inv.issuedAt).toLocaleDateString()}</p>
                  </div>
                  <span className="badge badge-confirmed" style={{ textTransform: 'uppercase' }}>{inv.status}</span>
                </div>

                <div className="invoice-card-body">
                  <h3 className="game-name">{book.gameName} — {book.resourceName}</h3>
                  <p className="booking-ref">Booking Ref: #{book.bookingReference}</p>
                  <p className="slot-info">
                    <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {book.bookingDate} ({book.startTime} - {book.endTime})
                  </p>
                </div>

                <div className="invoice-card-footer">
                  <div className="amount-col">
                    <span className="amount-label">TOTAL PAID</span>
                    <span className="amount-val">₹{inv.totalAmount}</span>
                  </div>
                  <Link to={`/my-invoices/${inv._id}`} className="btn btn-secondary btn-sm">
                    View Receipt <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
