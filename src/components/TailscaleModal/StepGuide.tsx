import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Globe,
  Loader2,
  AlertCircle,
  Server,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { NetworkInfo } from '../../types/media';

interface StepGuideProps {
  network: NetworkInfo | null;
  onGoToStatus: () => void;
  onGoToQR: () => void;
  authToken?: string | null;
  onRefreshNetwork?: () => void;
}

export const StepGuide: React.FC<StepGuideProps> = ({
  network,
  onGoToStatus,
  onGoToQR,
  authToken,
  onRefreshNetwork,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activatingServe, setActivatingServe] = useState(false);
  const [serveStatusMessage, setServeStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showHeadscale, setShowHeadscale] = useState(false);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleActivateServe = async () => {
    setActivatingServe(true);
    setServeStatusMessage(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const url = authToken
        ? `/api/system/tailscale/enable-serve?token=${encodeURIComponent(authToken)}`
        : '/api/system/tailscale/enable-serve';

      const res = await fetch(url, { method: 'POST', headers });
      const data = await res.json();

      if (res.ok && data.success) {
        setServeStatusMessage({
          type: 'success',
          text: 'Tailscale HTTPS activated! Let\'s Encrypt SSL certificate is live.',
        });
        if (onRefreshNetwork) onRefreshNetwork();
      } else {
        setServeStatusMessage({
          type: 'error',
          text: data.error || 'Failed to auto-activate. Run the manual command in Administrator PowerShell.',
        });
      }
    } catch {
      setServeStatusMessage({
        type: 'error',
        text: 'Failed to contact backend. Please run the command manually.',
      });
    } finally {
      setActivatingServe(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Visual Mesh Architecture Banner */}
      <div
        style={{
          background: 'linear-gradient(145deg, rgba(229, 9, 20, 0.08) 0%, rgba(56, 189, 248, 0.05) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'var(--radius-md)',
          padding: '1.2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <ShieldCheck size={20} color="var(--cinema-red)" />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            How Tailscale Works with Red Moon
          </h4>
        </div>
        <p style={{ fontSize: '0.825rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
          Tailscale creates a zero-configuration, encrypted <strong>WireGuard mesh network</strong> between your PC and phone. It lets you stream high-definition movies and lossless audio on mobile over 5G/LTE or remote Wi-Fi with <strong>no router configuration</strong> and zero exposed ports.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginTop: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
            <Lock size={14} color="#34d399" />
            <span>End-to-End WireGuard</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
            <Globe size={14} color="#38bdf8" />
            <span>Streams Anywhere (5G/4G/Wi-Fi)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
            <Zap size={14} color="#fbbf24" />
            <span>Zero Port Forwarding</span>
          </div>
        </div>
      </div>

      {/* 3-Step Setup Walkthrough */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          3-Step Connection Guide
        </h4>

        {/* Step 1: Install Tailscale on PC */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--cinema-red)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                1
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                  Install Tailscale on Your PC
                </span>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  Sign in with Google, Microsoft, Apple, or GitHub.
                </p>
              </div>
            </div>

            <a
              href="https://tailscale.com/download/windows"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ minHeight: '30px', height: '30px', padding: '0 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Download PC</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: '#cbd5e1',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>winget install tailscale</span>
            <button
              className="btn btn-secondary"
              style={{ minHeight: '24px', height: '24px', padding: '0 6px', fontSize: '0.7rem' }}
              onClick={() => handleCopy('winget install tailscale', 'winget')}
            >
              {copiedKey === 'winget' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        {/* Step 2: Install Tailscale on Mobile */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--cinema-red)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                2
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                  Install Tailscale on Your Phone / Tablet
                </span>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  Log in with the <strong>SAME</strong> account used on your PC.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <a
                href="https://play.google.com/store/apps/details?id=com.tailscale.ipn"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ minHeight: '30px', height: '30px', padding: '0 8px', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Android</span>
                <ExternalLink size={11} />
              </a>
              <a
                href="https://apps.apple.com/app/tailscale/id1470499037"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ minHeight: '30px', height: '30px', padding: '0 8px', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>iOS</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>

        {/* Step 3: Enable 1-Click Trusted HTTPS */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--cinema-red)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                3
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                    Enable Trusted HTTPS (Let's Encrypt SSL)
                  </span>
                  {network?.hasTailscaleHttps && (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '2px 6px', borderRadius: '999px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                      Active
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  Auto-generates official SSL certs for your MagicDNS domain (*.ts.net).
                </p>
              </div>
            </div>

            <button
              className="btn btn-primary"
              disabled={activatingServe || Boolean(network?.hasTailscaleHttps)}
              onClick={handleActivateServe}
              style={{
                minHeight: '32px',
                height: '32px',
                padding: '0 12px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: network?.hasTailscaleHttps ? 'rgba(52, 211, 153, 0.2)' : 'var(--cinema-red)',
                color: network?.hasTailscaleHttps ? '#34d399' : '#fff',
              }}
            >
              {activatingServe ? (
                <Loader2 size={13} className="animate-spin" />
              ) : network?.hasTailscaleHttps ? (
                <Check size={13} />
              ) : (
                <Zap size={13} />
              )}
              <span>{network?.hasTailscaleHttps ? 'HTTPS Active' : 'Activate HTTPS'}</span>
            </button>
          </div>

          {serveStatusMessage && (
            <div
              style={{
                fontSize: '0.75rem',
                color: serveStatusMessage.type === 'success' ? '#34d399' : '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {serveStatusMessage.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              <span>{serveStatusMessage.text}</span>
            </div>
          )}

          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.725rem',
              color: '#38bdf8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>tailscale serve https / http://127.0.0.1:5000</span>
            <button
              className="btn btn-secondary"
              style={{ minHeight: '24px', height: '24px', padding: '0 6px', fontSize: '0.7rem' }}
              onClick={() => handleCopy('tailscale serve https / http://127.0.0.1:5000', 'serve')}
              title="Copy manual PowerShell command"
            >
              {copiedKey === 'serve' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible: Self-Hosted Headscale Server Option */}
      <div
        style={{
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          background: 'rgba(0, 0, 0, 0.25)',
        }}
      >
        <button
          type="button"
          onClick={() => setShowHeadscale(!showHeadscale)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#cbd5e1',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
            <Server size={14} color="#94a3b8" />
            <span>Using a Self-Hosted Headscale Server? (Advanced)</span>
          </div>
          {showHeadscale ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showHeadscale && (
          <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid var(--border-glass)', fontSize: '0.775rem', color: '#94a3b8', lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              If you run your own open-source Headscale control server on a VPS or home server, point your PC and phone directly:
            </p>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.45)',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.725rem',
                color: '#38bdf8',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <span>tailscale login --login-server https://headscale.yourdomain.com</span>
              <button
                className="btn btn-secondary"
                style={{ minHeight: '22px', height: '22px', padding: '0 5px' }}
                onClick={() => handleCopy('tailscale login --login-server https://headscale.yourdomain.com', 'headscale')}
              >
                {copiedKey === 'headscale' ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
              </button>
            </div>
            <p style={{ margin: 0 }}>
              On your phone's Tailscale app, tap the three dots &rarr; <em>Change Server</em> &rarr; enter your Headscale server URL.
            </p>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-glass)' }}>
        <button
          className="btn btn-secondary"
          onClick={onGoToStatus}
          style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
        >
          &larr; View Mesh Status
        </button>

        <button
          className="btn btn-primary"
          onClick={onGoToQR}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem', fontWeight: 600, background: 'var(--cinema-red)' }}
        >
          Scan Mobile QR Code &rarr;
        </button>
      </div>
    </div>
  );
};
