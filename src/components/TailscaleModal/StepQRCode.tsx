import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, Copy, Check, ExternalLink, ShieldCheck, Lock } from 'lucide-react';
import { NetworkInfo } from '../../types/media';

interface StepQRCodeProps {
  network: NetworkInfo | null;
  activeUrl: string;
  onChangeUrl: (url: string) => void;
  onGoToNext: () => void;
  onGoToPrev: () => void;
}

export const StepQRCode: React.FC<StepQRCodeProps> = ({
  network,
  activeUrl,
  onChangeUrl,
  onGoToNext,
  onGoToPrev,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const tokenQuery = network?.streamToken ? `?token=${network.streamToken}` : '';

  // 1. Official Tailscale HTTPS (MagicDNS + Let's Encrypt Port 443)
  const httpsUrl = network?.tailscaleHttpsUrl
    ? `${network.tailscaleHttpsUrl}/${tokenQuery}`
    : '';

  // 2. Direct Tailscale Mesh IP (Port 5000)
  const tailscaleIpUrl = network?.tailscaleIp
    ? `http://${network.tailscaleIp}:${network.serverPort || 5000}/${tokenQuery}`
    : '';

  // 3. Local Wi-Fi LAN (Port 5000)
  const lanUrl = network?.localLanIp
    ? `http://${network.localLanIp}:${network.serverPort || 5000}/${tokenQuery}`
    : `http://localhost:${network?.serverPort || 5000}/${tokenQuery}`;

  useEffect(() => {
    const urlToEncode = activeUrl || httpsUrl || tailscaleIpUrl || lanUrl;
    if (!urlToEncode) return;

    QRCode.toDataURL(urlToEncode, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0b0c10',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((dataUri) => {
        setQrDataUrl(dataUri);
        setQrError(null);
      })
      .catch((err) => {
        setQrError(err.message);
      });
  }, [activeUrl, httpsUrl, tailscaleIpUrl, lanUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHttps = activeUrl.startsWith('https://');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Phone Peer Connectivity Status Alert */}
      {network?.phonePeer && (
        <div>
          {network.phonePeer.online ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.6rem 0.9rem',
                background: 'rgba(52, 211, 153, 0.1)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: '#34d399',
              }}
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }} />
              <span>
                <strong>{network.phonePeer.name}</strong> is <strong>ONLINE</strong> on your Tailscale tailnet. Ready for instant streaming!
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '0.65rem 0.9rem',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: '#fbbf24',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }} />
                <span>
                  <strong>{network.phonePeer.name}</strong> is currently <strong>OFFLINE</strong> on Tailscale.
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', paddingLeft: '16px' }}>
                • To use HTTPS: Open the <strong>Tailscale app</strong> on your phone and tap <strong>Connect</strong>.<br />
                • Or use <strong>Wi-Fi LAN</strong>: Click the blue tab below to stream over your home Wi-Fi without any VPN!
              </div>
            </div>
          )}
        </div>
      )}

      {/* Network Selector Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-glass)',
          flexWrap: 'wrap',
        }}
      >
        {/* Tailscale HTTPS Option (Recommended) */}
        <button
          className="btn"
          style={{
            flex: 1.2,
            minHeight: '36px',
            fontSize: '0.8rem',
            background: activeUrl === httpsUrl ? 'var(--cinema-red)' : 'transparent',
            color: activeUrl === httpsUrl ? '#ffffff' : '#94a3b8',
            gap: '5px',
          }}
          onClick={() => httpsUrl && onChangeUrl(httpsUrl)}
          disabled={!httpsUrl}
          title="Official Tailscale HTTPS (Valid SSL certificate on port 443)"
        >
          <Lock size={13} />
          <span>Tailscale HTTPS {network?.isFunnelActive ? '(Public Funnel)' : '(Recommended)'}</span>
        </button>

        {/* Local Wi-Fi LAN Option */}
        <button
          className="btn"
          style={{
            flex: 1.2,
            minHeight: '36px',
            fontSize: '0.8rem',
            background: activeUrl === lanUrl ? 'var(--accent-cyan)' : 'transparent',
            color: activeUrl === lanUrl ? '#ffffff' : '#94a3b8',
            gap: '5px',
          }}
          onClick={() => onChangeUrl(lanUrl)}
          title="Stream directly over your local home Wi-Fi router (No VPN needed)"
        >
          <span>Wi-Fi LAN ({network?.localLanIp || 'Local'})</span>
        </button>

        {/* Tailscale Direct IP Option */}
        <button
          className="btn"
          style={{
            flex: 0.9,
            minHeight: '36px',
            fontSize: '0.8rem',
            background: activeUrl === tailscaleIpUrl ? 'var(--accent-primary)' : 'transparent',
            color: activeUrl === tailscaleIpUrl ? '#ffffff' : '#94a3b8',
          }}
          onClick={() => tailscaleIpUrl && onChangeUrl(tailscaleIpUrl)}
          disabled={!tailscaleIpUrl}
        >
          Tailscale IP (:5000)
        </button>
      </div>

      {/* Main QR Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '1.5rem',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-glass)',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {/* QR Code Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#ffffff',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
          }}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Scan QR code for remote streaming"
              style={{ width: '180px', height: '180px', display: 'block', borderRadius: '4px' }}
            />
          ) : (
            <div
              style={{
                width: '180px',
                height: '180px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: '0.8rem',
              }}
            >
              {qrError || 'Generating QR code...'}
            </div>
          )}
          <span style={{ fontSize: '0.675rem', color: '#475569', fontWeight: 700, marginTop: '6px', letterSpacing: '0.04em' }}>
            SCAN WITH MOBILE CAMERA
          </span>
        </div>

        {/* Steps Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Smartphone size={20} color={isHttps ? 'var(--cinema-red)' : 'var(--accent-cyan)'} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
              Connect Your Phone in 3 Seconds
            </h4>
          </div>

          <ol
            style={{
              paddingLeft: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              fontSize: '0.825rem',
              color: '#cbd5e1',
              lineHeight: '1.4',
              margin: 0,
            }}
          >
            <li>Make sure your phone has Tailscale connected (e.g. <em>realme 11 Pro 5G</em>).</li>
            <li>Point your phone camera at the QR code.</li>
            <li>Tap the link to open Red Moon in Safari or Chrome with valid SSL & token auth.</li>
          </ol>

          {/* HTTPS / Security Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: isHttps ? '#34d399' : '#38bdf8',
              background: isHttps ? 'rgba(52, 211, 153, 0.1)' : 'rgba(56, 189, 248, 0.1)',
              padding: '5px 9px',
              borderRadius: '4px',
              border: `1px solid ${isHttps ? 'rgba(52, 211, 153, 0.3)' : 'rgba(56, 189, 248, 0.25)'}`,
              width: 'fit-content',
            }}
          >
            <ShieldCheck size={14} />
            <span>
              {isHttps
                ? 'Official Tailscale HTTPS (Valid SSL, Port 443) • Encrypted'
                : 'Direct Stream Port 5000 • Authenticated Session'}
            </span>
          </div>

          {/* Active URL Copy Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.45)',
              padding: '0.5rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-glass)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              marginTop: '0.2rem',
            }}
          >
            <span style={{ color: isHttps ? '#fca5a5' : 'var(--accent-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
              {activeUrl}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-secondary"
                style={{ minHeight: '28px', height: '28px', padding: '0 8px', fontSize: '0.725rem' }}
                onClick={handleCopy}
              >
                {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <a
                href={activeUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ minHeight: '28px', height: '28px', padding: '0 8px', textDecoration: 'none' }}
                title="Open in new tab"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
        <button className="btn btn-secondary" onClick={onGoToPrev}>
          &larr; Back to Diagnostics
        </button>
        <button className="btn btn-primary" onClick={onGoToNext}>
          Streaming Settings &rarr;
        </button>
      </div>
    </div>
  );
};
