import os from 'os';
import { execSync, execFileSync } from 'child_process';

/**
 * Robust network detector for Tailscale (with MagicDNS & HTTPS Serve support)
 * and physical Wi-Fi/Ethernet LAN interfaces.
 */
export function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const hostname = os.hostname();

  let tailscaleIp = null;
  let tailscaleState = 'disconnected'; // 'connected' | 'needs_login' | 'not_installed'
  let localLanIp = null;
  let magicDnsDomain = null;
  let tailscaleHttpsUrl = null;
  let hasTailscaleHttps = false;
  let isFunnelActive = false;
  const peers = [];
  let phonePeer = null;
  let isPhoneConnected = false;
  const allInterfaces = [];

  // 1. Query Tailscale CLI JSON status for MagicDNS and CertDomains
  try {
    const statusRaw = execFileSync('tailscale', ['status', '--json'], {
      encoding: 'utf8',
      timeout: 2500,
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const statusData = JSON.parse(statusRaw);

    if (statusData?.TailscaleIPs?.[0]) {
      tailscaleIp = statusData.TailscaleIPs[0];
      tailscaleState = 'connected';
    }

    if (statusData?.Self?.DNSName) {
      magicDnsDomain = statusData.Self.DNSName.replace(/\.$/, '');
      tailscaleHttpsUrl = `https://${magicDnsDomain}`;
    }
    // Extract peer devices (especially mobile phones like realme 11 Pro 5G)
    if (statusData?.Peer) {
      for (const peer of Object.values(statusData.Peer)) {
        const peerName = peer.HostName || (peer.DNSName ? peer.DNSName.split('.')[0] : 'Device');
        if (peerName.toLowerCase().includes('funnel-ingress')) continue;
        const isOnline = Boolean(peer.Online);
        const peerOS = (peer.OS || '').toLowerCase();
        const isPhone = peerOS === 'android' || peerOS === 'ios' || peerName.toLowerCase().includes('realme') || peerName.toLowerCase().includes('phone');

        peers.push({
          name: peerName,
          hostname: peer.HostName,
          os: peerOS,
          ip: peer.TailscaleIPs?.[0] || '',
          online: isOnline,
          lastSeen: peer.LastSeen,
          isPhone,
        });

        if (isPhone) {
          phonePeer = {
            name: peerName,
            os: peerOS,
            ip: peer.TailscaleIPs?.[0] || '',
            online: isOnline,
          };
          if (isOnline) isPhoneConnected = true;
        }
      }
    }
  } catch {
    // Fallback: check tailscale ip -4
    try {
      const cliOutput = execSync('tailscale ip -4', { encoding: 'utf8', timeout: 1500, stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (cliOutput && cliOutput.startsWith('100.')) {
        tailscaleIp = cliOutput;
        tailscaleState = 'connected';
      }
    } catch {
      // CLI may fail if disconnected or not on path
    }
  }

  // 2. Check if Tailscale Serve / Funnel proxy is active
  try {
    const serveRaw = execFileSync('tailscale', ['serve', 'status'], {
      encoding: 'utf8',
      timeout: 2000,
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    if (serveRaw && serveRaw.includes('https://') && (serveRaw.includes('5000') || serveRaw.includes('proxy'))) {
      hasTailscaleHttps = true;
    }
  } catch {
    // ignore
  }

  try {
    const funnelRaw = execFileSync('tailscale', ['funnel', 'status', '--json'], {
      encoding: 'utf8',
      timeout: 2000,
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    if (funnelRaw && funnelRaw.includes('AllowFunnel')) {
      const fData = JSON.parse(funnelRaw);
      if (fData.AllowFunnel && Object.keys(fData.AllowFunnel).length > 0) {
        isFunnelActive = true;
      }
    }
  } catch {
    // ignore
  }

  // 3. Scan OS network interfaces
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;

    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const ip = addr.address;
        const isTailscaleBySubnet = ip.startsWith('100.');
        const isTailscaleByName = name.toLowerCase().includes('tailscale');

        allInterfaces.push({
          name,
          address: ip,
          isTailscale: isTailscaleBySubnet || isTailscaleByName,
          netmask: addr.netmask,
        });

        if (isTailscaleBySubnet) {
          tailscaleIp = ip;
          tailscaleState = 'connected';
        } else if (isTailscaleByName && ip.startsWith('169.254')) {
          if (tailscaleState !== 'connected') {
            tailscaleState = 'needs_login';
          }
        }

        // Prioritize Wi-Fi or physical Ethernet over virtual adapters (e.g. 192.168.56.x VirtualBox)
        const isVirtual = name.toLowerCase().includes('virtual') || ip.startsWith('192.168.56.');
        const isWifiOrEth = name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('ethernet');

        if (!isTailscaleByName && !isTailscaleBySubnet && !ip.startsWith('127.')) {
          if (!localLanIp || (!isVirtual && isWifiOrEth)) {
            localLanIp = ip;
          }
        }
      }
    }
  }

  // If no Tailscale adapter found at all
  const hasTailscaleInterface = allInterfaces.some((i) => i.isTailscale);
  if (!hasTailscaleInterface && tailscaleState === 'disconnected') {
    tailscaleState = 'not_installed';
  }

  return {
    hostname,
    tailscaleIp,
    tailscaleState, // 'connected' | 'needs_login' | 'disconnected' | 'not_installed'
    tailscaleDetected: Boolean(tailscaleIp),
    magicDnsDomain,
    tailscaleHttpsUrl,
    hasTailscaleHttps,
    isFunnelActive,
    peers,
    phonePeer,
    isPhoneConnected,
    localLanIp: localLanIp || '127.0.0.1',
    serverPort: 5000,
    clientPort: 5000, // Synchronized with serverPort 5000
    interfaces: allInterfaces,
  };
}
