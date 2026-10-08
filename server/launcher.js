#!/usr/bin/env node
import path from 'path';
import fs from 'fs';

// Process Command-Line Arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
=================================================
🌕 RED MOON - CINEMATIC MEDIA STREAMER LAUNCHER
=================================================

Usage:
  RedMoon.exe [options]
  node server/launcher.js [options]

Options:
  --port <number>    Set server listening port (default: 5000)
  --no-browser       Do not automatically open the web browser on startup
  -h, --help         Show this help information

Features:
  - Sandboxed local streaming server
  - Zero storage access by default (point your folders in the app)
  - Tailscale mesh pairing with QR code
  - Encrypted mobile streaming over 5G/LTE or local Wi-Fi
=================================================
`);
  process.exit(0);
}

// Parse custom port
const portIndex = args.indexOf('--port');
if (portIndex !== -1 && args[portIndex + 1]) {
  const customPort = parseInt(args[portIndex + 1], 10);
  if (!isNaN(customPort) && customPort > 0 && customPort < 65536) {
    process.env.PORT = customPort.toString();
  }
}

// Parse browser auto-launch flag
if (args.includes('--no-browser')) {
  process.env.OPEN_BROWSER = 'false';
}

// Display launch banner
console.log(`
  ****************************************************************
  *                                                              *
  *         🌕  R E D   M O O N   M E D I A   S E R V E R        *
  *             Cinematic Adaptive Streaming Platform            *
  *                                                              *
  ****************************************************************
`);

// Handle graceful shutdown signals
process.on('SIGINT', () => {
  console.log('\n[Red Moon] Shutting down gracefully... Goodbye!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Red Moon] Terminated. Goodbye!');
  process.exit(0);
});

// Import and start main server
import('./index.js').catch((err) => {
  console.error('[Red Moon Fatal Error] Failed to start server:', err);
  process.exit(1);
});
