import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, spawn, execFileSync } from 'child_process';

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
 * Get available drive letters on Windows (e.g. C:\, D:\)
 */
export function getAvailableDrives() {
  if (process.platform !== 'win32') {
    return ['/'];
  }
  const drives = [];
  const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZAB'.split('');
  for (const letter of letters) {
    const driveRoot = `${letter}:\\`;
    try {
      if (fs.existsSync(driveRoot)) {
        drives.push(driveRoot);
      }
    } catch {
      // ignore
    }
  }
  return drives.length > 0 ? drives : ['C:\\'];
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

  try {
    if (fs.existsSync(target)) {
      target = fs.realpathSync(target);
    }
  } catch {
    // fallback
  }

  const stat = fs.statSync(target);
  if (!stat.isDirectory()) {
    target = path.dirname(target);
  }

  const normalized = path.normalize(target).toLowerCase();
  // AppSec: Protected system & credential folders check (CWE-22 / CWE-200 mitigation)
  const FORBIDDEN_DIRS = [
    '\\windows', '/windows',
    '\\$recycle.bin', '/$recycle.bin',
    '\\program files', '/program files',
    '\\.ssh', '/.ssh',
    '\\.aws', '/.aws',
    '\\.azure', '/.azure',
    '\\.kube', '/.kube',
    '\\.gnupg', '/.gnupg',
    '\\.config', '/.config',
    '\\system volume information', '/system volume information',
    '\\credentials', '/credentials',
    '\\appdata\\local\\elevateddiagnostics', '/appdata/local/elevateddiagnostics',
  ];

  if (FORBIDDEN_DIRS.some((token) => normalized.includes(token))) {
    throw new Error('Access denied: Cannot browse protected directory');
  }

  const entries = fs.readdirSync(target, { withFileTypes: true });
  const subdirs = [];
  let mediaCount = 0;

  for (const entry of entries) {
    // Skip hidden files, system directories, and sensitive credential folders
    const nameLower = entry.name.toLowerCase();
    if (
      entry.name.startsWith('.') ||
      entry.name.startsWith('$') ||
      nameLower === 'node_modules' ||
      nameLower === 'appdata' ||
      nameLower === 'credentials' ||
      nameLower === '.git' ||
      nameLower === '.env' ||
      nameLower === 'id_rsa' ||
      nameLower === 'id_ed25519'
    ) {
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
    availableDrives: getAvailableDrives(),
  };
}

let currentDialogProcess = null;
let currentDialogResolve = null;

/**
 * Cancel any ongoing native folder picker process immediately without shell invocation (CWE-78 mitigation)
 */
export function cancelNativeFolderDialog() {
  if (currentDialogResolve) {
    currentDialogResolve({ success: false, cancelled: true });
    currentDialogResolve = null;
  }
  if (currentDialogProcess) {
    try {
      const pid = currentDialogProcess.pid;
      if (process.platform === 'win32' && pid) {
        // AppSec: Use execFileSync instead of shell command
        execFileSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        currentDialogProcess.kill();
      }
    } catch {
      // ignore
    }
    currentDialogProcess = null;
    return true;
  }
  return false;
}

/**
 * Trigger native Windows FolderBrowserDialog on the host desktop.
 * Uses Base64 EncodedCommand and attaches directly to the active foreground
 * browser window handle via Win32 user32.dll GetForegroundWindow.
 */
export function openNativeFolderDialog() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({ success: false, error: 'Native folder dialog is only supported on Windows' });
    }

    // Terminate any existing orphan dialog process before launching a new one
    cancelNativeFolderDialog();

    const psScript = `
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Windows.Forms;
using System.Runtime.InteropServices;

public class WindowWrapper : IWin32Window {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    public IntPtr Handle {
        get {
            IntPtr fg = GetForegroundWindow();
            return fg != IntPtr.Zero ? fg : IntPtr.Zero;
        }
    }
}
'@ -ReferencedAssemblies System.Windows.Forms

$owner = New-Object WindowWrapper
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "Select Media Folder for Red Moon"
$dialog.ShowNewFolderButton = $true
$dialog.RootFolder = [System.Environment+SpecialFolder]::MyComputer

$res = $dialog.ShowDialog($owner)
if ($res -eq [System.Windows.Forms.DialogResult]::OK -and $dialog.SelectedPath) {
    [Console]::WriteLine($dialog.SelectedPath)
} else {
    [Console]::WriteLine("__CANCELLED__")
}
`;

    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    let stdoutData = '';

    const proc = spawn('powershell.exe', ['-NoProfile', '-STA', '-EncodedCommand', encoded], {
      stdio: ['ignore', 'pipe', 'ignore']
    });

    currentDialogProcess = proc;
    currentDialogResolve = resolve;

    proc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    const timeout = setTimeout(() => {
      cancelNativeFolderDialog();
    }, 25000);

    proc.on('close', () => {
      clearTimeout(timeout);
      currentDialogProcess = null;
      if (currentDialogResolve) {
        const selected = stdoutData.trim();
        if (selected && selected !== '__CANCELLED__' && fs.existsSync(selected)) {
          currentDialogResolve({ success: true, selectedPath: selected });
        } else {
          currentDialogResolve({ success: false, cancelled: true });
        }
        currentDialogResolve = null;
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      currentDialogProcess = null;
      if (currentDialogResolve) {
        currentDialogResolve({ success: false, error: err.message });
        currentDialogResolve = null;
      }
    });
  });
}

