# 📡 Tailscale Setup & Connection Guide for Red Moon

This guide explains how any user can establish their own **Tailscale mesh network** (or self-host **Headscale**) to securely stream movies and music from their Windows PC to their mobile phones, tablets, or remote laptops **from anywhere in the world** — with zero port forwarding, no router configuration, and end-to-end encryption.

---

## 🌟 Why Tailscale with Red Moon?

| Traditional Remote Streaming | Tailscale + Red Moon |
| :--- | :--- |
| Requires opening ports on home router (vulnerable to internet port scanners). | **Zero Open Ports**: Uses WireGuard peer-to-peer encryption directly between devices. |
| Breaks when home ISP changes public IP address. | **Stable MagicDNS**: Devices always reach each other via permanent `100.x.y.z` IPs and `*.ts.net` domain names. |
| Insecure HTTP or complex custom SSL cert setups. | **Automatic Trusted HTTPS**: Tailscale provisions official Let's Encrypt SSL certificates automatically. |
| Complex VPN configuration files and port mapping. | **1-Click Pairing**: Scan the Red Moon QR code from your phone and stream immediately over 5G, LTE, or Wi-Fi. |

---

## 🚀 Method 1: Official Free Tailnet (Recommended for 99% of Users)

Tailscale provides a **free personal tier** supporting up to 3 users and 100 connected devices.

### Step 1: Create a Free Tailscale Account
1. Visit **[login.tailscale.com/start](https://login.tailscale.com/start)** in your browser.
2. Sign in using your existing Google, Microsoft, Apple, or GitHub account.

---

### Step 2: Install Tailscale on Your Host PC (Running Red Moon)
1. Download Tailscale for Windows: **[tailscale.com/download/windows](https://tailscale.com/download/windows)**
   - *Alternative (PowerShell)*: `winget install tailscale`
2. Run the installer and click **Log in...** from the Windows system tray icon.
3. Once logged in, your PC joins your private Tailnet and receives:
   - A private Tailscale IP (e.g. `100.85.120.45`)
   - A MagicDNS name (e.g. `mypc.tailnet-xyz.ts.net`)

---

### Step 3: Install Tailscale on Your Mobile Phone or Tablet
1. Download Tailscale on your mobile device:
   - **Android**: [Google Play Store](https://play.google.com/store/apps/details?id=com.tailscale.ipn)
   - **iOS / iPadOS**: [Apple App Store](https://apps.apple.com/app/tailscale/id1470499037)
2. Open the Tailscale app and **log in using the EXACT SAME account** you used on your PC.
3. Toggle the switch to **Active / Connected**.
4. Both your PC and phone are now directly connected on a private encrypted WireGuard mesh network!

---

### Step 4: Enable Official Trusted HTTPS (1-Click Let's Encrypt SSL)
Browsers on mobile phones (Safari, Chrome) work best over HTTPS. Tailscale includes built-in HTTPS proxying:

#### Option A: 1-Click via Red Moon UI
1. Open Red Moon on your PC.
2. Click the **Tailscale (Shield)** icon in the top right.
3. Click tab **2: Setup Guide**.
4. Click the **"Activate HTTPS"** button.

#### Option B: Manual Command
Open Windows PowerShell (Run as Administrator) and execute:
```powershell
tailscale serve https / http://127.0.0.1:5000
```
> Tailscale will automatically issue an official Let's Encrypt certificate for your `https://[your-pc].[tailnet].ts.net` address.

---

### Step 5: Connect and Stream!
1. In Red Moon, click the **Tailscale (Shield)** icon and go to **Step 3: Mobile QR Pairing**.
2. Open the Camera app on your phone and scan the QR code.
3. Your Red Moon library will instantly open on your phone with full video and audio playback!

---

## 🛡️ Method 2: Self-Hosted Headscale Server (For Privacy Enthusiasts)

If you do not want to use Tailscale's cloud coordination server and want **100% self-hosted infrastructure**, you can use **Headscale** (an open-source implementation of the Tailscale control server).

### 1. Set Up Headscale Server (On your VPS / Linux Server)
1. Deploy Headscale using Docker:
   ```yaml
   services:
     headscale:
       image: headscale/headscale:latest
       volumes:
         - ./config:/etc/headscale
         - ./data:/var/lib/headscale
       ports:
         - "8080:8080"
         - "9087:9087"
       command: headscale serve
   ```
2. Create a user:
   ```bash
   headscale users create myuser
   ```

### 2. Connect Your Host PC to Your Headscale Server
In Windows PowerShell, run:
```powershell
tailscale login --login-server https://headscale.yourdomain.com
```
Follow the URL provided to register your machine on your Headscale instance.

### 3. Connect Your Mobile Phone to Headscale
1. Open the Tailscale app on your phone.
2. Before logging in, tap the **three dots (⋮)** in the top right corner.
3. Tap **Change Server** (or **Custom Server**).
4. Enter your Headscale URL: `https://headscale.yourdomain.com`.
5. Tap **Save** and complete authentication.

Once both devices are registered with your Headscale server, Red Moon connects and streams identically through the private WireGuard mesh!

---

## ❓ Frequently Asked Questions & Troubleshooting

### Q: Does Tailscale use my home internet bandwidth when I'm streaming outside?
**A**: Yes. The video stream is sent directly from your home PC upload connection to your mobile phone download connection via peer-to-peer WireGuard.

### Q: Why does Red Moon say "Needs Login" or "Action Required"?
**A**: This means the Tailscale virtual adapter is installed on your Windows PC, but the application is logged out. Click the Tailscale icon in your Windows notification tray and select **Log In**.

### Q: What if I am on the same Wi-Fi network at home?
**A**: You don't even need Tailscale if both devices are on the same home Wi-Fi! Red Moon automatically detects your local LAN IP (e.g. `http://192.168.1.50:5000`) and displays a Local Wi-Fi QR code.

### Q: Can I share Red Moon with a friend outside my Tailnet?
**A**: Yes! Tailscale offers **Tailscale Funnel**, which securely forwards traffic from the public internet. Run:
```powershell
tailscale funnel 5000
```
This gives you a public HTTPS URL accessible to anyone you share the link with.
