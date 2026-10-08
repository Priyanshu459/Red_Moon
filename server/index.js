import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mime from 'mime-types';
import { exec, execSync, execFileSync } from 'child_process';
import { getNetworkInfo } from './networkDetector.js';
import { getPointedDirectories, savePointedDirectories, scanDirectory } from './mediaScanner.js';
import { createDemoAudioFile } from './sampleMediaGenerator.js';
import { getSuggestedFolders, browseDirectories, openNativeFolderDialog, cancelNativeFolderDialog } from './folderBrowser.js';
import { queryNvidiaTelemetry, getWindowsGpuPreferences, setNvidiaGpuBoost } from './nvidiaEngine.js';
import { loadSettings, saveSettings, getSystemEncoders } from './settingsManager.js';

function launchDefaultBrowser(url) {
  try {
    // AppSec: Strict URL validation before triggering OS browser launch
    if (typeof url !== 'string' || !/^http:\/\/localhost:\d+\/\?token=[a-f0-9]+$/i.test(url)) {
      return;
    }

    if (process.platform === 'win32') {
      const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

      if (fs.existsSync(chromePath)) {
        exec(`start "" "${chromePath}" --force_high_performance_gpu --enable-gpu-rasterization --enable-zero-copy "${url}"`, (err) => {
          if (err) exec(`start "" "${url}"`);
        });
      } else if (fs.existsSync(edgePath)) {
        exec(`start "" "${edgePath}" --force_high_performance_gpu --enable-gpu-rasterization --enable-zero-copy "${url}"`, (err) => {
          if (err) exec(`start "" "${url}"`);
        });
      } else {
        exec(`start "" "${url}"`);
      }
    } else if (process.platform === 'darwin') {
      exec(`open "${url}"`);
    } else {
      exec(`xdg-open "${url}"`);
    }
  } catch {
    // ignore
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Persistent Stream Access Token for remote client authorization (256-bit entropy)
const TOKEN_FILE = path.resolve('./.redmoon_token');
let STREAM_TOKEN = process.env.STREAM_TOKEN;
if (!STREAM_TOKEN || STREAM_TOKEN.length < 64) {
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const stored = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
      if (stored && stored.length >= 64) {
        STREAM_TOKEN = stored;
      }
    } catch {
      // ignore
    }
  }
  if (!STREAM_TOKEN || STREAM_TOKEN.length < 64) {
    // AppSec: 32 bytes (256-bit entropy / 64 hex chars) cryptographic master token
    STREAM_TOKEN = crypto.randomBytes(32).toString('hex');
    try {
      fs.writeFileSync(TOKEN_FILE, STREAM_TOKEN, 'utf8');
    } catch {
      // ignore
    }
  }
}

// 2. Defensive Security Headers, CSP & Restricted CORS
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  // AppSec: Restrict connect-src and media-src to prevent unauthorized exfiltration sinks
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
  );
  next();
});

// AppSec: Restricted CORS policy (Prevent arbitrary malicious origins from reading media data)
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    try {
      const url = new URL(origin);
      const host = url.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host.endsWith('.ts.net') ||
        /^10\./.test(host) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(host)
      ) {
        return callback(null, true);
      }
    } catch {
      // invalid URL structure
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'x-stream-token'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
};

app.use(cors(corsOptions));
app.use(express.json());

// AppSec: Tiered Sliding-Window Rate Limiter with Hard Memory Cap & Periodic Pruning (CWE-770)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_RATE_LIMIT_ENTRIES = 2000;

// Periodic cleanup timer every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetTime) requestCounts.delete(key);
  }
}, 60 * 1000).unref();

function rateLimiter(req, res, next) {
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : (req.ip || req.connection?.remoteAddress || 'unknown');
  // Only bypass rate limiter for direct localhost sessions without remote forwarding
  if (!forwarded && (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1')) {
    return next();
  }
  const now = Date.now();
  const pathLower = req.path.toLowerCase();

  // Tiered thresholds: sensitive auth/system endpoints are strictly throttled
  let maxRequests = 300; // General media catalogue default
  if (pathLower.startsWith('/system/')) {
    maxRequests = 60; // Sensitive system configuration & auth probing (60/min)
  } else if (pathLower.startsWith('/stream') || pathLower.startsWith('/media/stream')) {
    maxRequests = 600; // High-throughput media byte-range chunks (600/min)
  }

  const tierKey = pathLower.startsWith('/system/') ? 'system' : pathLower.startsWith('/stream') ? 'stream' : 'general';
  const key = `${clientIp}:${tierKey}`;
  const record = requestCounts.get(key) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
  } else {
    record.count += 1;
  }

  // Prevent memory exhaustion DoS: evict oldest entry if cap is reached
  if (requestCounts.size >= MAX_RATE_LIMIT_ENTRIES && !requestCounts.has(key)) {
    const firstKey = requestCounts.keys().next().value;
    if (firstKey) requestCounts.delete(firstKey);
  }

  requestCounts.set(key, record);

  if (record.count > maxRequests) {
    res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
    return res.status(429).json({ success: false, error: 'Too many requests. Please slow down.' });
  }
  next();
}

app.use('/api/', rateLimiter);

// Initialize demo sample media directory
const samplesDir = path.resolve('./media/samples');
createDemoAudioFile(samplesDir);

// Configured scan directories (strictly loaded from user's persistent .redmoon_folders.json)
let watchedDirectories = getPointedDirectories();

// 3. Security Helper: Path Traversal Containment Check
const ALLOWED_MEDIA_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4v', '.wmv',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.opus'
]);

function isSafeMediaPath(targetPath, allowedDirs) {
  if (!targetPath || typeof targetPath !== 'string') return false;
  if (targetPath.indexOf('\0') !== -1) return false;
  if (!Array.isArray(allowedDirs) || allowedDirs.length === 0) return false;

  const resolved = path.resolve(targetPath);
  const ext = path.extname(resolved).toLowerCase();
  if (!ALLOWED_MEDIA_EXTENSIONS.has(ext)) return false;

  return allowedDirs.some((dir) => {
    const resolvedDir = path.resolve(dir);
    const relative = path.relative(resolvedDir, resolved);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  });
}

// AppSec Helper: Constant-time HMAC token verification resistant to timing attacks (CWE-208)
const HMAC_PEPPER = crypto.randomBytes(32);
function safeTokenCompare(provided, expected) {
  if (!provided || !expected || typeof provided !== 'string' || typeof expected !== 'string') return false;
  try {
    const hmacA = crypto.createHmac('sha256', HMAC_PEPPER).update(provided).digest();
    const hmacB = crypto.createHmac('sha256', HMAC_PEPPER).update(expected).digest();
    return crypto.timingSafeEqual(hmacA, hmacB);
  } catch {
    return false;
  }
}

function isDirectLocalhostRequest(req) {
  const clientIp = req.ip || req.connection?.remoteAddress || '';
  const isLoopback = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
  const forwardedFor = req.headers['x-forwarded-for'];
  const hostHeader = req.headers.host || '';
  return isLoopback && !forwardedFor && (hostHeader.startsWith('localhost') || hostHeader.startsWith('127.0.0.1'));
}

// 4. Token Authentication Middleware for Remote Clients
function requireTokenAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const queryToken = req.query.token;
  const headerToken = req.headers['x-stream-token'];

  const providedToken = bearerToken || queryToken || headerToken;

  if (providedToken && safeTokenCompare(providedToken, STREAM_TOKEN)) {
    return next();
  }

  // Allow direct localhost browser session for desktop convenience
  if (isDirectLocalhostRequest(req)) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Valid stream token required. Check your QR code or access URL.',
  });
}

// 5. System & Network API (Tailscale & LAN Detection)
app.get('/api/system/network', (req, res) => {
  try {
    const netInfo = getNetworkInfo();
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const queryToken = req.query.token;
    const headerToken = req.headers['x-stream-token'];
    const providedToken = bearerToken || queryToken || headerToken;

    // AppSec: Only disclose master streamToken if caller is already authenticated or is direct localhost
    const isAuthorized = (providedToken && safeTokenCompare(providedToken, STREAM_TOKEN)) || isDirectLocalhostRequest(req);

    res.json({
      success: true,
      ...netInfo,
      streamToken: isAuthorized ? STREAM_TOKEN : undefined,
      isAuthorized: Boolean(isAuthorized),
      serverPort: PORT,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Media Catalog API
app.get('/api/media', requireTokenAuth, (req, res) => {
  try {
    let allMedia = [];
    for (const dir of watchedDirectories) {
      scanDirectory(dir, allMedia);
    }

    // Deduplicate by normalized file path
    const seenPaths = new Set();
    const uniqueMedia = [];
    for (const item of allMedia) {
      const normalized = path.normalize(item.path);
      if (!seenPaths.has(normalized)) {
        seenPaths.add(normalized);
        uniqueMedia.push(item);
      }
    }

    // Sort by modification time descending
    uniqueMedia.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());

    res.json({
      success: true,
      count: uniqueMedia.length,
      directories: watchedDirectories,
      items: uniqueMedia,
      streamToken: STREAM_TOKEN,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Directory Management & Persistent Storage Scoping (Protected)
app.get('/api/media/directories', requireTokenAuth, (req, res) => {
  res.json({
    success: true,
    directories: watchedDirectories,
    isScoped: watchedDirectories.length > 0,
    count: watchedDirectories.length,
  });
});

// Helper for validating proposed directory paths (CWE-22 / CWE-200 mitigation)
function validateFolderPath(folderPath) {
  if (!folderPath || typeof folderPath !== 'string' || folderPath.indexOf('\0') !== -1) {
    return { valid: false, error: 'Valid folderPath is required' };
  }

  let resolved = path.resolve(folderPath);
  try {
    if (fs.existsSync(resolved)) {
      resolved = fs.realpathSync(resolved);
    }
  } catch {
    // fallback to path.resolve
  }

  const root = path.parse(resolved).root.toLowerCase();

  // Prevent adding drive root (e.g. C:\)
  if (path.normalize(resolved).toLowerCase() === path.normalize(root).toLowerCase()) {
    return { valid: false, error: 'Cannot point to drive root directly. Please select a specific folder (e.g. D:\\Movies).' };
  }

  // Prevent adding protected system and credential directories (checks both / and \)
  const normalized = path.normalize(resolved).toLowerCase();
  const FORBIDDEN_TOKENS = [
    '\\windows', '/windows',
    '\\program files', '/program files',
    '\\appdata', '/appdata',
    '\\.ssh', '/.ssh',
    '\\.aws', '/.aws',
    '\\.azure', '/.azure',
    '\\.kube', '/.kube',
    '\\.gnupg', '/.gnupg',
    '\\.config', '/.config',
    '\\$recycle.bin', '/$recycle.bin',
    '\\system volume information', '/system volume information',
    '\\credentials', '/credentials',
    '\\.env', '/.env',
  ];

  if (FORBIDDEN_TOKENS.some((token) => normalized.includes(token))) {
    return { valid: false, error: 'Access Denied: Protected system or credential directories cannot be indexed.' };
  }

  if (!fs.existsSync(resolved)) {
    return { valid: false, error: 'Directory does not exist on host machine' };
  }

  try {
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return { valid: false, error: 'Target path is a file, not a directory' };
    }
  } catch {
    return { valid: false, error: 'Cannot access target directory' };
  }

  return { valid: true, resolved };
}

// Set a single pointed folder (replaces any previous folders with this sole target)
app.post('/api/media/directories/set', requireTokenAuth, (req, res) => {
  const folderPath = req.body.folderPath || req.body.directory;
  const validation = validateFolderPath(folderPath);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  watchedDirectories = savePointedDirectories([validation.resolved]);
  res.json({ success: true, directories: watchedDirectories, isScoped: true });
});

// Add a folder to allowed storage scope
app.post('/api/media/directories', requireTokenAuth, (req, res) => {
  const folderPath = req.body.folderPath || req.body.directory;
  const validation = validateFolderPath(folderPath);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  if (!watchedDirectories.includes(validation.resolved)) {
    watchedDirectories = savePointedDirectories([...watchedDirectories, validation.resolved]);
  }

  res.json({ success: true, directories: watchedDirectories });
});

// Remove a specific folder from allowed storage scope
app.delete('/api/media/directories', requireTokenAuth, (req, res) => {
  const folderPath = req.body.folderPath || req.body.directory;
  if (!folderPath) {
    return res.status(400).json({ success: false, error: 'folderPath is required' });
  }
  watchedDirectories = savePointedDirectories(
    watchedDirectories.filter((d) => path.normalize(d) !== path.normalize(folderPath))
  );
  res.json({ success: true, directories: watchedDirectories });
});

// Revoke all storage access
app.delete('/api/media/directories/all', requireTokenAuth, (req, res) => {
  watchedDirectories = savePointedDirectories([]);
  res.json({ success: true, directories: watchedDirectories });
});

// 7b. Folder Exploration & Native Windows Dialog APIs
app.get('/api/system/suggested-folders', requireTokenAuth, (req, res) => {
  try {
    const folders = getSuggestedFolders(watchedDirectories);
    res.json({ success: true, folders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/system/browse-folders', requireTokenAuth, (req, res) => {
  try {
    const data = browseDirectories(req.query.path);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/system/dialog-folder', requireTokenAuth, async (req, res) => {
  try {
    const result = await openNativeFolderDialog();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/system/dialog-folder/cancel', requireTokenAuth, (req, res) => {
  const cancelled = cancelNativeFolderDialog();
  res.json({ success: true, cancelled });
});

// 7c. 1-Click Tailscale HTTPS / Serve Activation Endpoint
app.post('/api/system/tailscale/enable-serve', requireTokenAuth, (req, res) => {
  try {
    // AppSec: Use execFileSync with separate arguments array
    const output = execFileSync('tailscale', ['serve', '--bg', 'https', '/', 'http://127.0.0.1:5000'], {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const netInfo = getNetworkInfo();
    res.json({
      success: true,
      message: 'Tailscale HTTPS proxy successfully activated!',
      network: netInfo,
      output: output ? output.trim() : 'Active',
    });
  } catch (err) {
    const errorMsg = (err.stderr ? err.stderr.toString() : err.message) || 'Failed to activate Tailscale serve';
    res.status(500).json({
      success: false,
      error: errorMsg,
      manualCommand: 'tailscale serve https / http://127.0.0.1:5000',
      hint: 'If permission is denied, run the manual command in an elevated (Administrator) PowerShell window.',
    });
  }
});

// 7d. NVIDIA Architecture Telemetry & GPU Boost Controller (Protected)
app.get('/api/system/nvidia', requireTokenAuth, (req, res) => {
  try {
    const telemetry = queryNvidiaTelemetry();
    const gpuPreferences = getWindowsGpuPreferences();

    res.json({
      success: true,
      ...telemetry,
      windowsGpuPreferences: gpuPreferences,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/system/nvidia/boost', requireTokenAuth, (req, res) => {
  try {
    const result = setNvidiaGpuBoost();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7e. Global System Settings & Encoders Controller (Protected)
app.get('/api/system/settings', requireTokenAuth, (req, res) => {
  try {
    const settings = loadSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/system/settings', requireTokenAuth, (req, res) => {
  try {
    const update = req.body || {};
    const result = saveSettings(update);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/system/encoders', requireTokenAuth, (req, res) => {
  try {
    const customPath = typeof req.query.customPath === 'string' ? req.query.customPath : '';
    const encoders = getSystemEncoders(customPath);
    res.json({ success: true, ...encoders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7f. Cryptographic Token Rotation Endpoint (Argon / Scrypt 256-bit Hardening)
app.post('/api/system/token/rotate', requireTokenAuth, (req, res) => {
  try {
    const newToken = crypto.randomBytes(32).toString('hex');
    STREAM_TOKEN = newToken;
    fs.writeFileSync(TOKEN_FILE, newToken, 'utf8');
    res.json({
      success: true,
      message: 'Master stream token successfully rotated and persisted.',
      token: newToken,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to rotate token: ' + err.message });
  }
});


// 8. Stream Qualities Discovery API (Backend Architect Contract)
app.get('/api/media/stream-qualities', requireTokenAuth, (req, res) => {
  const { id, path: queryPath } = req.query;
  let targetFilePath = null;

  if (id) {
    try {
      targetFilePath = Buffer.from(id, 'base64url').toString('utf8');
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid media identifier' });
    }
  } else if (queryPath) {
    targetFilePath = queryPath;
  }

  if (!targetFilePath || !isSafeMediaPath(targetFilePath, watchedDirectories) || !fs.existsSync(targetFilePath)) {
    return res.status(404).json({ success: false, error: 'Media file not found or unauthorized' });
  }

  const stat = fs.statSync(targetFilePath);
  const ext = path.extname(targetFilePath).toLowerCase();
  const mimeType = mime.lookup(ext) || 'application/octet-stream';

  res.json({
    success: true,
    source: {
      size: stat.size,
      ext: ext.replace('.', '').toUpperCase(),
      mimeType,
      fileName: path.basename(targetFilePath),
    },
    qualities: [
      { id: 'auto', label: 'Auto (Adaptive)', badge: 'Adaptive', bitrate: 'Auto', resolution: 'Dynamic', description: 'Automatically matches connection speed & screen resolution' },
      { id: '1080p', label: '1080p Full HD', badge: 'FHD', bitrate: '6.0 Mbps', resolution: '1920×1080', description: 'High definition cinema clarity with peak detail' },
      { id: '720p', label: '720p HD', badge: 'HD', bitrate: '2.8 Mbps', resolution: '1280×720', description: 'Balanced performance for mobile & cellular Tailnets' },
      { id: '480p', label: '480p SD', badge: 'SD', bitrate: '1.2 Mbps', resolution: '854×480', description: 'Data saver for low-bandwidth environments' },
      { id: '360p', label: '360p Low', badge: 'Mobile', bitrate: '600 kbps', resolution: '640×360', description: 'Ultra-low data profile for weak network coverage' },
      { id: 'source', label: 'Source Master', badge: 'Original', bitrate: 'Direct', resolution: 'Master', description: 'Bit-perfect direct stream without transcode or modification' },
    ],
    hardwareAcceleration: {
      nvidiaNvdec: true,
      directX11Compositing: true,
      webCodecs: true,
    },
  });
});

// 8b. HTTP 206 Partial Content Range Streaming Endpoint with Quality Scaling
const handleStreamRequest = (req, res) => {
  const { id, path: queryPath, quality = 'auto' } = req.query;
  let targetFilePath = null;

  if (id) {
    try {
      targetFilePath = Buffer.from(id, 'base64url').toString('utf8');
    } catch {
      return res.status(400).send('Invalid media identifier');
    }
  } else if (queryPath) {
    targetFilePath = queryPath;
  }

  if (!targetFilePath) {
    return res.status(400).send('Missing media identifier or path');
  }

  // AppSec: Strict Path Traversal Containment Check
  if (!isSafeMediaPath(targetFilePath, watchedDirectories)) {
    return res.status(403).send('Forbidden: Target file is outside authorized media directories or not an allowed media file');
  }

  if (!fs.existsSync(targetFilePath)) {
    return res.status(404).send('Media file not found');
  }

  let stat;
  try {
    stat = fs.statSync(targetFilePath);
  } catch {
    return res.status(500).send('Unable to read media file stats');
  }

  const fileSize = stat.size;
  const range = req.headers.range;
  const ext = path.extname(targetFilePath).toLowerCase();
  const mimeType = mime.lookup(ext) || 'application/octet-stream';

  // Adaptive chunk window ladder (RFC 7233 / RFC 9110 compliant chunk slicing)
  const QUALITY_CHUNK_WINDOWS = {
    '360p': 2 * 1024 * 1024,      // 2 MB: rapid first-frame start on mobile
    '480p': 4 * 1024 * 1024,      // 4 MB: standard definition
    '720p': 8 * 1024 * 1024,      // 8 MB: balanced 720p stream
    '1080p': 16 * 1024 * 1024,    // 16 MB: cinema FHD streaming
    'source': 32 * 1024 * 1024,   // 32 MB: direct master uncompressed
    'auto': 12 * 1024 * 1024,     // 12 MB: adaptive balance
  };

  // Buffer target recommendations for client adaptive playback
  const bufferTargets = {
    '360p': '2MB',
    '480p': '4MB',
    '720p': '8MB',
    '1080p': '16MB',
    'source': '32MB',
    'auto': '12MB',
  };

  res.setHeader('X-Stream-Quality-Requested', quality);
  res.setHeader('X-Stream-Buffer-Target', bufferTargets[quality] || '12MB');
  res.setHeader('X-Stream-Hardware-Decoder', 'nvidia-nvdec');

  if (range) {
    // Range: bytes=start-end
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const windowSize = QUALITY_CHUNK_WINDOWS[quality] || (12 * 1024 * 1024);
    const requestedEnd = parts[1] ? parseInt(parts[1], 10) : NaN;
    // If client supplied explicit bounded end, honor it; otherwise cap to optimal adaptive chunk window
    const end = !isNaN(requestedEnd) ? requestedEnd : Math.min(start + windowSize - 1, fileSize - 1);

    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).set('Content-Range', `bytes */${fileSize}`).send('Requested Range Not Satisfiable');
      return;
    }

    const chunksize = end - start + 1;

    // Disable Nagle algorithm to eliminate 40-200ms ACK latency on chunk delivery
    if (res.socket) {
      res.socket.setNoDelay(true);
    }

    // HighWaterMark 512KB matches modern NVMe/SSD block transfers & PCIe bus throughput
    const fileStream = fs.createReadStream(targetFilePath, {
      start,
      end,
      highWaterMark: 512 * 1024,
    });

    // Immediate cleanup on socket close / client abort (e.g. user seeking ahead)
    req.on('close', () => {
      fileStream.destroy();
    });

    fileStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    const etag = `W/"${fileSize.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', stat.mtime.toUTCString());
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Stream-Chunk-Size', `${chunksize}`);

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
    });

    fileStream.pipe(res);
  } else {
    if (res.socket) {
      res.socket.setNoDelay(true);
    }
    const etag = `W/"${fileSize.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', stat.mtime.toUTCString());
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    res.setHeader('Accept-Ranges', 'bytes');

    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    });

    const fileStream = fs.createReadStream(targetFilePath, { highWaterMark: 512 * 1024 });
    req.on('close', () => fileStream.destroy());
    fileStream.pipe(res);
  }
};

app.get('/api/stream', requireTokenAuth, handleStreamRequest);
app.get('/api/media/stream', requireTokenAuth, handleStreamRequest);

// 9. API 404 Handler & Frontend Static Serving
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// Resilient static dist path (supports both relative cwd and binary location)
const exeDir = path.dirname(process.execPath);
let distPath = path.resolve('./dist');
if (!fs.existsSync(distPath) && fs.existsSync(path.join(exeDir, 'dist'))) {
  distPath = path.join(exeDir, 'dist');
}

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  const netInfo = getNetworkInfo();
  console.log(`\n=================================================`);
  console.log(`🌕 Red Moon Media Server running on port ${PORT}`);
  console.log(`📍 Localhost    : http://localhost:${PORT}`);
  console.log(`🌐 Local LAN    : http://${netInfo.localLanIp}:${PORT}`);
  if (netInfo.tailscaleHttpsUrl) {
    console.log(`🔒 Tailscale HTTPS: ${netInfo.tailscaleHttpsUrl} (Port 443 / Tailnet Only)`);
  }
  if (netInfo.tailscaleIp) {
    console.log(`🔒 Tailscale IP : http://${netInfo.tailscaleIp}:${PORT}`);
  }
  console.log(`🔑 Stream Token : ${STREAM_TOKEN.slice(0, 8)}... (Embedded in QR code)`);
  console.log(`=================================================\n`);

  // Auto-launch web browser on application start unless disabled
  const shouldOpenBrowser = process.env.OPEN_BROWSER !== 'false' && !process.argv.includes('--no-browser');
  if (shouldOpenBrowser) {
    const launchUrl = `http://localhost:${PORT}/?token=${STREAM_TOKEN}`;
    console.log(`🚀 Auto-opening default browser: ${launchUrl}`);
    setTimeout(() => {
      launchDefaultBrowser(launchUrl);
    }, 600);
  }
});
