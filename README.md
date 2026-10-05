# 🌑 Red Moon — Personal Cinema & Tailscale Media Streaming Hub

A modern, high-performance personal cinema and music streaming server built for ultra-fast remote playback from your laptop to any mobile phone, tablet, or external PC over **Tailscale HTTPS** and **Local Wi-Fi**.

---

## ✨ Features

- **🎬 Netflix-Grade Cinema Interface**: Dynamic billboard trailers, curated rails, studio table view, and range-based HTTP 206 video streaming.
- **🌑 Interactive 3D Celestial Cosmos**: Real-time Three.js 3D red moon background with coronal shockwave physics, solar flare particle bursts, and touch raycasting.
- **🎵 Unified Audio & Video**: Ambient bottom-dock music player with persistent playlist queues, volume sliders, and continuous background audio playback.
- **🔒 Tailscale HTTPS & Funnel**: Stream to your phone with automated Let's Encrypt SSL on standard port 443 with zero port-forwarding.
- **📱 Phone Peer Telemetry**: Real-time detection of whether your mobile device is online on Tailscale, with instant 1-click fallback to Local Wi-Fi LAN.
- **📁 Interactive Media Folder Management**:
  - **1-Click Quick Add Chips** for common media locations (`Videos`, `Music`, `Downloads`, `Documents`).
  - **Native Windows Folder Picker Dialog** (`Browse PC...`) to select any folder on your laptop visually.
  - **In-Modal Directory Navigator** to explore drives and subdirectories directly inside the app.
- **🛡️ Hardened AppSec Model**:
  - 256-bit cryptographically random token authentication (`requireTokenAuth`).
  - Canonical path containment preventing path traversal exploits outside authorized directories.
  - Whitelist-only media extension filter (`.mp4`, `.mkv`, `.webm`, `.mov`, `.mp3`, `.wav`, `.flac`, etc.).
  - Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`).

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Frontend
```bash
npm run build
```

### 3. Run Red Moon Server
```bash
node server/index.js
```

The server will automatically start on port `5000`:
- **Localhost**: `http://localhost:5000`
- **Home Wi-Fi LAN**: `http://<your-lan-ip>:5000`
- **Tailscale HTTPS**: `https://<your-tailnet-domain>` (via `tailscale serve --bg 5000` or `tailscale funnel --bg 5000`)

---

## 📱 Connecting Your Phone

1. Click **Stream to Phone** in the top navigation bar.
2. **Via Tailscale HTTPS**: Ensure Tailscale is connected on your mobile device and scan the QR code.
3. **Via Local Wi-Fi**: Switch to the **Wi-Fi LAN** tab and scan the QR code to stream over your home network without any VPN.

---

## 🔒 Security Architecture

- **Token Protection**: A private access token is stored locally in `.redmoon_token` and embedded in the QR code query parameters. Unauthenticated requests are rejected with `401 Unauthorized`.
- **Path Traversal Containment**: All file operations are resolved and restricted strictly to registered media directories. Traversal requests (such as `C:\Windows\win.ini`) return `403 Forbidden`.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Three.js, Lucide Icons, Vanilla CSS Design System.
- **Backend**: Node.js, Express, Tailscale CLI Integration, PowerShell WinForms Automation.
