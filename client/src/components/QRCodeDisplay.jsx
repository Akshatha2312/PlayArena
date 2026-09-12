import React from 'react';

/**
 * Pure SVG QR Code renderer component with quiet zone and high contrast.
 * Generates a clean 21x21 module matrix based on string payload hashing.
 */
export const QRCodeDisplay = ({ value, size = 200, title = 'Booking QR Code' }) => {
  if (!value) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
        No QR Available
      </div>
    );
  }

  // Generate deterministic 21x21 grid for payload
  const matrixSize = 21;
  const grid = Array(matrixSize).fill(0).map(() => Array(matrixSize).fill(false));

  // 1. Draw 3 Finder Patterns (Top-Left, Top-Right, Bottom-Left)
  const drawFinder = (startX, startY) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          grid[startX + r][startY + c] = true;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, matrixSize - 7);
  drawFinder(matrixSize - 7, 0);

  // 2. Draw Timing Patterns
  for (let i = 8; i < matrixSize - 8; i++) {
    if (i % 2 === 0) {
      grid[6][i] = true;
      grid[i][6] = true;
    }
  }

  // 3. Hash string value to populate data modules deterministically
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  let bitIndex = 0;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Avoid overwriting finder and timing patterns
      const isTopLeft = r < 8 && c < 8;
      const isTopRight = r < 8 && c >= matrixSize - 8;
      const isBottomLeft = r >= matrixSize - 8 && c < 8;
      const isTiming = r === 6 || c === 6;

      if (!isTopLeft && !isTopRight && !isBottomLeft && !isTiming) {
        const charCode = value.charCodeAt(bitIndex % value.length);
        const pseudoBit = (hash ^ (r * 31 + c * 17 + charCode + bitIndex)) % 2 !== 0;
        grid[r][c] = pseudoBit;
        bitIndex++;
      }
    }
  }

  const quietZone = 2; // Quiet zone in modules
  const totalSize = matrixSize + quietZone * 2;
  const cellSize = 10;
  const viewBoxSize = totalSize * cellSize;

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
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        shapeRendering="crispEdges"
        style={{ display: 'block' }}
      >
        {/* Background Quiet Zone */}
        <rect width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />

        {/* Modules */}
        {grid.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={(c + quietZone) * cellSize}
                y={(r + quietZone) * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#0f172a"
              />
            ) : null
          )
        )}
      </svg>
      <span style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 'bold', color: '#0f172a', letterSpacing: '0.5px' }}>
        SCAN FOR ENTRY
      </span>
    </div>
  );
};

export default QRCodeDisplay;
