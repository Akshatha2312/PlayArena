import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoiceService } from '../services/invoiceService';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Printer, ArrowLeft, Download, ShieldCheck, FileText, Calendar, Clock, CheckCircle } from 'lucide-react';
import './InvoiceDetailPage.css';

export const InvoiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoiceService.getCustomerInvoiceById(id);
      if (res && res.data) {
        setInvoice(res.data.invoice);
      }
    } catch (err) {
      setError(err.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <LoadingState message="Generating invoice view..." />;
  if (error) return <ErrorState message={error} />;
  if (!invoice) return <ErrorState message="Invoice record not found." />;

  const cust = invoice.customerSnapshot || {};
  const book = invoice.bookingSnapshot || {};
  const price = invoice.pricingSnapshot || {};
  const pay = invoice.paymentSnapshot || {};

  return (
    <div className="container page-container invoice-page-container">
      {/* Action Toolbar (Hidden during print) */}
      <div className="invoice-toolbar no-print">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Printable Invoice Document */}
      <div className="invoice-document" id="printable-invoice">
        {/* Invoice Header */}
        <div className="invoice-header">
          <div className="brand-column">
            <h1 className="brand-logo">PLAY<span className="brand-highlight">ARENA</span></h1>
            <p className="brand-tagline">Premium Sports & Entertainment Center</p>
            <p className="brand-address">123 Arena Parkway, Sports Complex, Tech City</p>
          </div>
          <div className="invoice-title-column">
            <h2 className="doc-title">TAX INVOICE / RECEIPT</h2>
            <div className="invoice-meta-row">
              <span className="meta-label">INVOICE NO:</span>
              <span className="meta-value highlight-num">{invoice.invoiceNumber}</span>
            </div>
            <div className="invoice-meta-row">
              <span className="meta-label">DATE ISSUED:</span>
              <span className="meta-value">{new Date(invoice.issuedAt).toLocaleDateString()}</span>
            </div>
            <div className="invoice-meta-row">
              <span className="meta-label">STATUS:</span>
              <span className="badge badge-confirmed" style={{ textTransform: 'uppercase' }}>{invoice.status}</span>
            </div>
          </div>
        </div>

        <hr className="divider" />

        {/* Customer & Booking Meta Info */}
        <div className="invoice-billing-grid">
          <div className="billing-col">
            <h3 className="sub-heading">BILL TO (CUSTOMER)</h3>
            <p className="customer-name">{cust.name}</p>
            <p className="customer-detail">Email: {cust.email}</p>
            <p className="customer-detail">Phone: {cust.phone}</p>
          </div>

          <div className="billing-col">
            <h3 className="sub-heading">RESERVATION REFERENCE</h3>
            <p className="ref-number">Booking #{book.bookingReference}</p>
            <p className="customer-detail">Game: {book.gameName}</p>
            <p className="customer-detail">Resource: {book.resourceName}</p>
            <p className="customer-detail">Slot: {book.bookingDate} ({book.startTime} - {book.endTime})</p>
          </div>
        </div>

        {/* Charges Breakdown Table */}
        <div className="table-container">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>DESCRIPTION</th>
                <th>DURATION</th>
                <th>RATE</th>
                <th style={{ textAlign: 'right' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong style={{ color: '#f8fafc' }}>{book.gameName} — {book.resourceName}</strong>
                  <br />
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Session Reservation for {book.bookingDate}</span>
                </td>
                <td>{book.durationMinutes} mins</td>
                <td>₹{price.pricePerHourAtBooking} / hr</td>
                <td style={{ textAlign: 'right' }}>₹{price.subtotal}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="invoice-totals-row">
          <div className="payment-info-box">
            <h3 className="sub-heading">PAYMENT CONFIRMATION</h3>
            <p className="customer-detail">Payment Ref: <strong>{pay.providerPaymentId}</strong></p>
            <p className="customer-detail">Payment Method: <strong>{pay.method}</strong></p>
            <p className="customer-detail">Paid At: {new Date(pay.paidAt).toLocaleString()}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: '#22c55e', fontSize: '0.85rem', fontWeight: 'bold' }}>
              <CheckCircle size={16} /> Verified Transaction Success
            </div>
          </div>

          <div className="totals-box">
            <div className="total-line">
              <span>Subtotal:</span>
              <span>₹{invoice.subtotal}</span>
            </div>
            <div className="total-line">
              <span>Discount:</span>
              <span>₹{invoice.discountAmount}</span>
            </div>
            <div className="total-line">
              <span>Tax / GST:</span>
              <span>₹{invoice.taxAmount} (Exempt/Inclusive)</span>
            </div>
            <hr className="divider-sm" />
            <div className="total-line grand-total">
              <span>TOTAL PAID:</span>
              <span>₹{invoice.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Footer Terms */}
        <div className="invoice-footer">
          <p>Thank you for choosing Play Arena! Present your booking entry pass QR at the front desk upon arrival.</p>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>This is an official system-generated invoice snapshot.</p>
        </div>
      </div>
    </div>
  );
};
