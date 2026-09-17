import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Real QR Code renderer component compliant with QR spec.
 * Uses `qrcode` library to generate a scannable QR code image.
 */
export const QRCodeDisplay = ({ value, size = 220, title = 'Booking QR Code' }) => {
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size * 2, // High resolution crisp rendering
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setDataUrl(url);
        setError(false);
      })
      .catch((err) => {
        console.error('Failed to generate QR code data URL:', err);
        setError(true);
      });
  }, [value, size]);

  if (!value) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
        No QR Available
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#450a0a', border: '1px solid #dc2626', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
        Failed to render QR Code
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
      }}
      aria-label={title}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={title}
          width={size}
          height={size}
          style={{ display: 'block', borderRadius: '4px' }}
        />
      ) : (
        <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          Generating Pass...
        </div>
      )}
      <span style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 'bold', color: '#0f172a', letterSpacing: '0.5px' }}>
        SCAN FOR ENTRY
      </span>
    </div>
  );
};

export default QRCodeDisplay;

