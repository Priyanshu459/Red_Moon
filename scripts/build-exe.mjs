import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const DIST_APP = path.join(ROOT_DIR, 'dist-app');
const DIST_SERVER = path.join(ROOT_DIR, 'dist-server');
const BUNDLE_OUT = path.join(DIST_SERVER, 'bundle.cjs');
const EXE_OUT = path.join(DIST_APP, 'RedMoon.exe');

console.log('🚀 Starting Red Moon Standalone Executable Build Pipeline...\n');

// 1. Ensure required directories exist
fs.mkdirSync(DIST_APP, { recursive: true });
fs.mkdirSync(DIST_SERVER, { recursive: true });

// 2. Build Vite Frontend
console.log('📦 Step 1: Building production frontend with Vite & TypeScript...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: ROOT_DIR });
} catch (err) {
  console.error('❌ Frontend build failed.');
  process.exit(1);
}

// 3. Bundle Server with esbuild into single CommonJS file
console.log('\n⚙️ Step 2: Bundling Node.js backend with esbuild...');
try {
  execSync(
    `npx esbuild server/launcher.js --bundle --platform=node --target=node20 --format=cjs --outfile="${BUNDLE_OUT}"`,
    { stdio: 'inherit', cwd: ROOT_DIR }
  );
} catch (err) {
  console.error('❌ Server bundling failed.');
  process.exit(1);
}

// 4. Compile Standalone Windows Executable using pkg
console.log('\n🔨 Step 3: Compiling standalone native Windows executable (RedMoon.exe)...');
try {
  execSync(
    `npx @yao-pkg/pkg "${BUNDLE_OUT}" --targets node22-win-x64 --output "${EXE_OUT}"`,
    { stdio: 'inherit', cwd: ROOT_DIR }
  );
  console.log(`✅ RedMoon.exe successfully generated at: ${EXE_OUT}`);
} catch (err) {
  console.error('❌ Executable compilation failed.');
  process.exit(1);
}

// 5. Copy Frontend dist assets to dist-app/dist
console.log('\n📁 Step 4: Packaging static frontend assets into dist-app/dist...');
const srcDist = path.join(ROOT_DIR, 'dist');
const targetDist = path.join(DIST_APP, 'dist');
fs.cpSync(srcDist, targetDist, { recursive: true });

// 6. Generate 1-Click Launcher Batch file
console.log('📝 Step 5: Generating 1-click launcher shortcut (Start-RedMoon.cmd)...');
const cmdContent = `@echo off
title Red Moon Streaming Server
cd /d "%~dp0"
echo ========================================================
echo   🌕 Starting Red Moon Streaming Platform...
echo ========================================================
if exist "RedMoon.exe" (
    start "" "RedMoon.exe"
) else (
    echo [Notice] Launching via Node runtime...
    node bundle.cjs
)
`;
fs.writeFileSync(path.join(DIST_APP, 'Start-RedMoon.cmd'), cmdContent, 'utf8');

// 6b. Generate 1-Click NVIDIA GPU Launcher Batch file
console.log('⚡ Step 5b: Generating 1-click NVIDIA Discrete GPU launcher (Start-RedMoon-NVIDIA.cmd)...');
const nvidiaCmdContent = `@echo off
title Red Moon // Dedicated NVIDIA GPU Launcher
cd /d "%~dp0"
echo ========================================================
echo   🌕 Starting Red Moon with High-Performance NVIDIA GPU...
echo ========================================================

rem Register High-Performance Discrete GPU Preference (2) in Windows
powershell -NoProfile -Command "New-Item -Path 'HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences' -Force -ErrorAction SilentlyContinue | Out-Null; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences' -Name '%~dp0RedMoon.exe' -Value 'GpuPreference=2;' -Force -ErrorAction SilentlyContinue"

rem Launch Red Moon
if exist "RedMoon.exe" (
    start "" "RedMoon.exe"
) else (
    node bundle.cjs
)

rem Launch browser with discrete GPU flags
timeout /t 2 /nobreak >nul
if exist "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --force_high_performance_gpu --enable-gpu-rasterization --enable-zero-copy http://localhost:5000
) else if exist "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --force_high_performance_gpu --enable-gpu-rasterization --enable-zero-copy http://localhost:5000
)
`;
fs.writeFileSync(path.join(DIST_APP, 'Start-RedMoon-NVIDIA.cmd'), nvidiaCmdContent, 'utf8');

// 7. Generate User README
const readmeContent = `==================================================================
🌕 RED MOON - PORTABLE STREAMING SERVER FOR WINDOWS
==================================================================

HOW TO RUN:
1. Double-click "RedMoon.exe" (or "Start-RedMoon.cmd").
2. Your default web browser will automatically open to http://localhost:5000.
3. In the top bar, click the "● Point Folder" indicator to select your videos or music.
4. Stream seamlessly on your PC!

HOW TO STREAM TO YOUR PHONE / TABLET (TAILSCALE):
1. In the top right corner, click the Tailscale (Shield) icon.
2. Follow the 3-step guide:
   - Install Tailscale on your PC (https://tailscale.com/download)
   - Install Tailscale on your phone from Google Play or Apple App Store
   - Sign in with the SAME account on both devices
3. In Red Moon, click "Scan Mobile QR Code".
4. Point your phone camera at the QR code — your media library will open
   instantly and stream securely over 5G/4G or Wi-Fi!

TO STOP THE SERVER:
- Press Ctrl+C in the Red Moon terminal window, or close the terminal window.
==================================================================
`;
fs.writeFileSync(path.join(DIST_APP, 'README.txt'), readmeContent, 'utf8');

console.log('\n🎉 Build Complete! The distributable folder is ready at: dist-app/\n');
