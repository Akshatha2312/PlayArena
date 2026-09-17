import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { invoiceService } from '../services/invoiceService';
import { LoadingState, ErrorState, EmptyState } from '../components/StateComponents';
import { Pagination } from '../components/Pagination';
import { FileText, Calendar, ChevronRight } from 'lucide-react';
import './MyInvoicesPage.css';

export const MyInvoicesPage = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const totalPages = Math.ceil(invoices.length / itemsPerPage) || 1;
  const paginatedInvoices = invoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="container page-container">
      <div className="compact-page-header">
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
        <>
          {/* Desktop Compact Table */}
          <div className="dense-table-container dense-table-desktop">
            <table className="dense-table">
              <thead>
                <tr>
                  <th>INVOICE #</th>
                  <th>ISSUED DATE</th>
                  <th>GAME / ARENA</th>
                  <th>RESOURCE</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.map((inv) => {
                  const book = inv.bookingSnapshot || {};
                  const statusClass = inv.status === 'paid' || inv.status === 'confirmed' ? 'badge-paid' : 'badge-pending';

                  return (
                    <tr 
                      key={inv._id}
                      className="clickable-row"
                      onClick={() => navigate(`/my-invoices/${inv._id}`)}
                    >
                      <td><span className="font-mono text-dim">{inv.invoiceNumber}</span></td>
                      <td>{new Date(inv.issuedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td><strong>{book.gameName || 'Game Arena'}</strong></td>
                      <td>{book.resourceName || 'Court/Station'}</td>
                      <td><strong>₹{inv.totalAmount}</strong></td>
                      <td>
                        <span className={`badge-compact ${statusClass}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link 
                          to={`/my-invoices/${inv._id}`}
                          className="btn-icon-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ChevronRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Compact Cards */}
          <div className="compact-cards-list">
            {paginatedInvoices.map((inv) => {
              const book = inv.bookingSnapshot || {};
              const statusClass = inv.status === 'paid' || inv.status === 'confirmed' ? 'badge-paid' : 'badge-pending';

              return (
                <div 
                  key={inv._id} 
                  className="compact-card-item"
                  onClick={() => navigate(`/my-invoices/${inv._id}`)}
                >
                  <div className="compact-card-header">
                    <span className="compact-card-title">{inv.invoiceNumber}</span>
                    <span className={`badge-compact ${statusClass}`}>{inv.status}</span>
                  </div>
                  <div className="compact-card-meta">
                    <span>{book.gameName} ({book.resourceName})</span>
                    <span>Issued: {new Date(inv.issuedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="compact-card-actions">
                    <span className="font-bold text-accent">₹{inv.totalAmount}</span>
                    <Link to={`/my-invoices/${inv._id}`} className="btn-text-action" onClick={(e) => e.stopPropagation()}>
                      View Receipt →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={invoices.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </>
      )}
    </div>
  );
};

