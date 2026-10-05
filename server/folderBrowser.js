import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

const ALLOWED_MEDIA_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4v', '.wmv',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.opus'
]);

/**
 * Get quick-add suggestions for user media folders and drives.
 */
export function getSuggestedFolders(watchedDirectories = []) {
  const home = os.homedir();
  const normalizedWatched = new Set(watchedDirectories.map(d => path.normalize(d).toLowerCase()));

  const suggestions = [
    { name: 'Videos', path: path.join(home, 'Videos'), type: 'videos' },
    { name: 'Music', path: path.join(home, 'Music'), type: 'music' },
    { name: 'Downloads', path: path.join(home, 'Downloads'), type: 'downloads' },
    { name: 'Documents', path: path.join(home, 'Documents'), type: 'documents' },
  ];

  // Check C:\ and other possible drives
  const driveCandidates = ['C:\\', 'D:\\', 'E:\\', 'F:\\'];
  for (const drive of driveCandidates) {
    if (fs.existsSync(drive)) {
      // Find candidate media folders on this drive (e.g. D:\Movies)
      try {
        const subdirs = fs.readdirSync(drive, { withFileTypes: true });
        for (const s of subdirs) {
          if (s.isDirectory() && !s.name.startsWith('$') && !s.name.startsWith('.')) {
            const lower = s.name.toLowerCase();
            if (lower.includes('movie') || lower.includes('film') || lower.includes('video') || lower.includes('media') || lower.includes('music')) {
              suggestions.push({
                name: `${drive[0]}:\\${s.name}`,
                path: path.join(drive, s.name),
                type: lower.includes('music') ? 'music' : 'videos',
              });
            }
          }
        }
      } catch {
        // ignore drive scan permissions
      }
    }
  }

  // Filter existing and compute media counts
  const results = [];
  for (const item of suggestions) {
    if (fs.existsSync(item.path)) {
      let count = 0;
      try {
        const entries = fs.readdirSync(item.path, { withFileTypes: true });
        for (const e of entries) {
          if (e.isFile()) {
            const ext = path.extname(e.name).toLowerCase();
            if (ALLOWED_MEDIA_EXTENSIONS.has(ext)) count++;
          }
        }
      } catch {
        // ignore
      }

      const isAdded = normalizedWatched.has(path.normalize(item.path).toLowerCase());
      results.push({
        ...item,
        alreadyAdded: isAdded,
        mediaCount: count,
      });
    }
  }

  return results;
}

/**
 * List subdirectories within a given path for the in-modal directory explorer.
 */
export function browseDirectories(requestedPath) {
  let target = requestedPath ? path.resolve(requestedPath) : os.homedir();

  // If root requested on Windows
  if (!requestedPath || requestedPath === '/' || requestedPath === '\\') {
    target = os.homedir();
  }

  if (!fs.existsSync(target)) {
    target = os.homedir();
  }

  const stat = fs.statSync(target);
  if (!stat.isDirectory()) {
    target = path.dirname(target);
  }

  const normalized = target.toLowerCase();
  // Protected system folders check
  if (normalized.includes('\\windows') || normalized.includes('\\$recycle.bin')) {
    throw new Error('Access denied: Cannot browse protected system directory');
  }

  const entries = fs.readdirSync(target, { withFileTypes: true });
  const subdirs = [];
  let mediaCount = 0;

  for (const entry of entries) {
    // Skip hidden files and special directories
    if (entry.name.startsWith('.') || entry.name.startsWith('$') || entry.name === 'node_modules' || entry.name === 'AppData') {
      continue;
    }

    if (entry.isDirectory()) {
      subdirs.push({
        name: entry.name,
        path: path.join(target, entry.name),
      });
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ALLOWED_MEDIA_EXTENSIONS.has(ext)) mediaCount++;
    }
  }

  // Sort alphabetically
  subdirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const parent = path.dirname(target);
  const isAtRoot = parent === target;

  return {
    currentPath: target,
    parentPath: isAtRoot ? null : parent,
    subdirectories: subdirs,
    mediaFilesCount: mediaCount,
  };
}

/**
 * Trigger native Windows FolderBrowserDialog on the host desktop.
 */
export function openNativeFolderDialog() {
  return new Promise((resolve) => {
    // PowerShell STA FolderBrowserDialog command
    const psCmd = `powershell -NoProfile -STA -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select Media Folder for Red Moon'; $f.ShowNewFolderButton = $false; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::WriteLine($f.SelectedPath) }"`;

    exec(psCmd, { timeout: 60000 }, (error, stdout) => {
      if (error) {
        return resolve({ success: false, error: error.message });
      }
      const selected = stdout.trim();
      if (selected && fs.existsSync(selected)) {
        return resolve({ success: true, selectedPath: selected });
      }
      return resolve({ success: false, cancelled: true });
    });
  });
}
