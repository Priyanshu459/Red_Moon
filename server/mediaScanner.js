import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import os from 'os';

// Supported media extensions
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4v', '.wmv']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.opus']);

const FOLDERS_CONFIG_FILE = path.resolve('./.redmoon_folders.json');

/**
 * Loads explicitly pointed media directories from persistent configuration.
 * Strictly adheres to zero-default storage access: does NOT auto-scan user drives or default folders.
 */
export function getPointedDirectories() {
  if (fs.existsSync(FOLDERS_CONFIG_FILE)) {
    try {
      const raw = fs.readFileSync(FOLDERS_CONFIG_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return data.filter((d) => typeof d === 'string' && fs.existsSync(d));
      }
    } catch {
      // ignore
    }
  }

  // Fallback demo sandbox: only include isolated local sample media if present
  const sampleDir = path.resolve('./media/samples');
  if (fs.existsSync(sampleDir)) {
    return [sampleDir];
  }

  return [];
}

/**
 * Persists the user's pointed media directories to .redmoon_folders.json.
 */
export function savePointedDirectories(dirs) {
  try {
    const valid = Array.from(
      new Set(dirs.filter((d) => typeof d === 'string' && fs.existsSync(d)).map((d) => path.resolve(d)))
    );
    fs.writeFileSync(FOLDERS_CONFIG_FILE, JSON.stringify(valid, null, 2), 'utf8');
    return valid;
  } catch (err) {
    console.error('Failed to save pointed directories config:', err.message);
    return dirs;
  }
}

// Backward-compatibility export
export function getDefaultDirectories() {
  return getPointedDirectories();
}

export function scanDirectory(dirPath, mediaList = [], depth = 0, maxDepth = 3) {
  if (depth > maxDepth || !fs.existsSync(dirPath)) return mediaList;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden and node_modules
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scanDirectory(fullPath, mediaList, depth + 1, maxDepth);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        let type = null;

        if (VIDEO_EXTENSIONS.has(ext)) {
          type = 'video';
        } else if (AUDIO_EXTENSIONS.has(ext)) {
          type = 'audio';
        }

        if (type) {
          try {
            const stats = fs.statSync(fullPath);
            const detectedMime = mime.lookup(ext) || (type === 'video' ? 'video/mp4' : 'audio/mpeg');

            mediaList.push({
              id: Buffer.from(fullPath).toString('base64url'),
              name: entry.name,
              title: path.basename(entry.name, ext).replace(/[._-]/g, ' '),
              path: fullPath,
              type,
              ext: ext.replace('.', ''),
              mimeType: detectedMime,
              size: stats.size,
              mtime: stats.mtime,
              folder: path.basename(dirPath),
            });
          } catch {
            // Skip unreadable files
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error scanning ${dirPath}:`, err.message);
  }

  return mediaList;
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
