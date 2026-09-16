import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const typeAndData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function createPng(width, height, drawPixel) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const rawLines = [];
  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(1 + width * 4);
    line[0] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const offset = 1 + x * 4;
      line[offset] = r;
      line[offset + 1] = g;
      line[offset + 2] = b;
      line[offset + 3] = a;
    }
    rawLines.push(line);
  }

  const rawData = Buffer.concat(rawLines);
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw Play Arena Logo Pixel Math
function playArenaPixel(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.hypot(x - cx, y - cy);
  const maxR = w / 2;

  // Background: Dark slate (#0f172a)
  let bgR = 15, bgG = 23, bgB = 42, bgA = 255;

  if (!isMaskable && r > maxR - 2) {
    if (r > maxR) return [0, 0, 0, 0];
    const alpha = Math.max(0, Math.min(255, Math.floor((maxR - r) * 255)));
    bgA = alpha;
  }

  // Outer Glowing Accent Ring
  const ringInner = maxR * 0.78;
  const ringOuter = maxR * 0.88;
  if (r >= ringInner && r <= ringOuter) {
    const t = (r - ringInner) / (ringOuter - ringInner);
    const ringR = Math.floor(6 + t * (99 - 6));
    const ringG = Math.floor(182 + t * (102 - 182));
    const ringB = Math.floor(212 + t * (241 - 212));
    return [ringR, ringG, ringB, bgA];
  }

  // Draw 'PA' Game Controller / Play Symbol in Center
  const nx = (x - cx) / (w / 2);
  const ny = (y - cy) / (h / 2);

  const triLeft = -0.22;
  const triRight = 0.28;
  if (nx >= triLeft && nx <= triRight) {
    const maxY = 0.32 * (1 - (nx - triLeft) / (triRight - triLeft));
    if (Math.abs(ny) <= maxY) {
      const gradT = (nx - triLeft) / (triRight - triLeft);
      const pr = Math.floor(16 + gradT * (168 - 16));
      const pg = Math.floor(185 + gradT * (85 - 185));
      const pb = Math.floor(129 + gradT * (247 - 129));
      return [pr, pg, pb, bgA];
    }
  }

  if (Math.hypot(nx - 0.35, ny + 0.25) < 0.08 || Math.hypot(nx - 0.35, ny - 0.25) < 0.08) {
    return [244, 63, 94, bgA];
  }

  return [bgR, bgG, bgB, bgA];
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA PNG icons...');

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, (x, y, w, h) => playArenaPixel(x, y, w, h, false)));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, (x, y, w, h) => playArenaPixel(x, y, w, h, false)));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, (x, y, w, h) => playArenaPixel(x, y, w, h, true)));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, (x, y, w, h) => playArenaPixel(x, y, w, h, false)));

console.log('Icons successfully created in client/public/');
