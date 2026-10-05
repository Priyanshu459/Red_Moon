import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mime from 'mime-types';
import { getNetworkInfo } from './networkDetector.js';
import { getDefaultDirectories, scanDirectory } from './mediaScanner.js';
import { createDemoAudioFile } from './sampleMediaGenerator.js';
import { getSuggestedFolders, browseDirectories, openNativeFolderDialog } from './folderBrowser.js';

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Persistent Stream Access Token for remote client authorization
const TOKEN_FILE = path.resolve('./.redmoon_token');
let STREAM_TOKEN = process.env.STREAM_TOKEN;
if (!STREAM_TOKEN) {
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      STREAM_TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    } catch {
      // ignore
    }
  }
  if (!STREAM_TOKEN) {
    STREAM_TOKEN = crypto.randomBytes(20).toString('hex');
    try {
      fs.writeFileSync(TOKEN_FILE, STREAM_TOKEN, 'utf8');
    } catch {
      // ignore
    }
  }
}

// 2. Defensive Security Headers & CORS
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(cors());
app.use(express.json());

// Initialize demo sample media directory
const samplesDir = path.resolve('./media/samples');
createDemoAudioFile(samplesDir);

// Configured scan directories
let watchedDirectories = getDefaultDirectories();

// 3. Security Helper: Path Traversal Containment Check
const ALLOWED_MEDIA_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4v', '.wmv',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.opus'
]);

function isSafeMediaPath(targetPath, allowedDirs) {
  if (!targetPath || typeof targetPath !== 'string') return false;
  if (targetPath.indexOf('\0') !== -1) return false;

  const resolved = path.resolve(targetPath);
  const ext = path.extname(resolved).toLowerCase();
  if (!ALLOWED_MEDIA_EXTENSIONS.has(ext)) return false;

  return allowedDirs.some((dir) => {
    const resolvedDir = path.resolve(dir);
    const relative = path.relative(resolvedDir, resolved);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  });
}

// 4. Token Authentication Middleware for Remote Clients
function requireTokenAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const queryToken = req.query.token;
  const headerToken = req.headers['x-stream-token'];

  const providedToken = bearerToken || queryToken || headerToken;

  if (providedToken && providedToken === STREAM_TOKEN) {
    return next();
  }

  // Allow direct localhost browser session for desktop convenience
  const clientIp = req.ip || req.connection?.remoteAddress || '';
  const isLoopback = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
  const forwardedFor = req.headers['x-forwarded-for'];
  const hostHeader = req.headers.host || '';
  const isDirectLocalhost = isLoopback && !forwardedFor && (hostHeader.startsWith('localhost') || hostHeader.startsWith('127.0.0.1'));

  if (isDirectLocalhost) {
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
    res.json({
      success: true,
      ...netInfo,
      streamToken: STREAM_TOKEN,
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

// 7. Directory Management (Protected)
app.get('/api/media/directories', requireTokenAuth, (req, res) => {
  res.json({ success: true, directories: watchedDirectories });
});

app.post('/api/media/directories', requireTokenAuth, (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath || typeof folderPath !== 'string' || folderPath.indexOf('\0') !== -1) {
    return res.status(400).json({ success: false, error: 'Valid folderPath is required' });
  }

  const resolved = path.resolve(folderPath);
  const root = path.parse(resolved).root.toLowerCase();

  // Prevent adding drive root (e.g. C:\)
  if (path.normalize(resolved).toLowerCase() === path.normalize(root).toLowerCase()) {
    return res.status(400).json({ success: false, error: 'Cannot add drive root directly. Please select a specific folder.' });
  }

  // Prevent adding protected system paths
  const normalized = resolved.toLowerCase();
  if (normalized.includes('\\windows') || normalized.includes('\\program files') || normalized.includes('\\appdata') || normalized.includes('\\.ssh')) {
    return res.status(403).json({ success: false, error: 'Access Denied: Protected system directory cannot be indexed.' });
  }

  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ success: false, error: 'Directory does not exist on host' });
  }

  try {
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return res.status(400).json({ success: false, error: 'Target path is a file, not a directory' });
    }
  } catch {
    return res.status(400).json({ success: false, error: 'Cannot access target directory' });
  }

  if (!watchedDirectories.includes(resolved)) {
    watchedDirectories.push(resolved);
  }

  res.json({ success: true, directories: watchedDirectories });
});

app.delete('/api/media/directories', requireTokenAuth, (req, res) => {
  const { folderPath } = req.body;
  watchedDirectories = watchedDirectories.filter((d) => path.normalize(d) !== path.normalize(folderPath));
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
    res.status(400).json({ success: false, error: err.message });
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

// 8. HTTP 206 Partial Content Range Streaming Endpoint (Protected against Path Traversal)
app.get('/api/stream', requireTokenAuth, (req, res) => {
  const { id, path: queryPath } = req.query;
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

  if (range) {
    // Range: bytes=start-end
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).set('Content-Range', `bytes */${fileSize}`).send('Requested Range Not Satisfiable');
      return;
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(targetFilePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache',
    });

    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    });

    fs.createReadStream(targetFilePath).pipe(res);
  }
});

// 9. API 404 Handler & Frontend Static Serving
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

const distPath = path.resolve('./dist');
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
});
