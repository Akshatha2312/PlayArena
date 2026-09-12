import React from 'react';
import { Loader2 } from 'lucide-react';
import './StateComponents.css';

export const LoadingState = ({ message = 'Loading Play Arena data...' }) => (
  <div className="state-container">
    <Loader2 className="spinner state-icon" />
    <p className="state-message">{message}</p>
  </div>
);

export const ErrorState = ({ message = 'Something went wrong', onRetry }) => (
  <div className="state-container state-error">
    <div className="error-badge">Error</div>
    <h3 className="state-title">Unable to Load Data</h3>
    <p className="state-message">{message}</p>
    {onRetry && (
      <button className="btn btn-secondary retry-btn" onClick={onRetry}>
        Try Again
      </button>
    )}
  </div>
);

export const EmptyState = ({ title = 'No Data Found', message = 'There are no items available right now.', actionLink, actionText }) => (
  <div className="state-container">
    <h3 className="state-title">{title}</h3>
    <p className="state-message">{message}</p>
    {actionLink && actionText && (
      <a href={actionLink} className="btn btn-primary margin-top">
        {actionText}
      </a>
    )}
  </div>
);
