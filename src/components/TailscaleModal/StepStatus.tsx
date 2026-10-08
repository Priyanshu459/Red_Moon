import React, { useState } from 'react';
import { NetworkInfo } from '../../types/media';
import { ShieldCheck, AlertCircle, Wifi, Laptop, Copy, Check, Terminal } from 'lucide-react';

interface StepStatusProps {
  network: NetworkInfo | null;
  onSelectUrlForQR: (url: string) => void;
  onGoToNext: () => void;
  onGoToGuide?: () => void;
}

export const StepStatus: React.FC<StepStatusProps> = ({ network, onSelectUrlForQR, onGoToNext, onGoToGuide }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const tailscaleUrl = network?.tailscaleIp
    ? `http://${network.tailscaleIp}:${network.clientPort || 3000}`
    : null;

  const lanUrl = network?.localLanIp
    ? `http://${network.localLanIp}:${network.clientPort || 3000}`
    : 'http://localhost:3000';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Host Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-glass)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <Laptop size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Host Machine Server
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>
              {network?.hostname || 'Personal Laptop'}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Streaming Port</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
            :{network?.clientPort || 3000} (Web) / :{network?.serverPort || 5000} (API)
          </div>
        </div>
      </div>

      {/* Tailscale Connection Card */}
      <div
        style={{
          border: network?.tailscaleDetected
            ? '1px solid rgba(16, 185, 129, 0.35)'
            : '1px solid rgba(245, 158, 11, 0.35)',
          background: network?.tailscaleDetected
            ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.03))'
            : 'linear-gradient(145deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.6))',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={20} color={network?.tailscaleDetected ? '#10b981' : '#f59e0b'} />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Tailscale Mesh Status</span>
          </div>

          {network?.tailscaleDetected ? (
            <span className="badge-status badge-status-online">
              <span className="pulsing-dot" /> Connected to Tailnet
            </span>
          ) : (
            <span className="badge-status badge-status-warning">
              <span className="pulsing-dot" /> Action Required
            </span>
          )}
        </div>

        {network?.tailscaleDetected ? (
          <div>
            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.85rem', lineHeight: '1.4' }}>
              Your Tailscale mesh IP is active! You can securely stream anywhere in the world on any device signed into your Tailnet.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
              }}
            >
              <span style={{ color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tailscaleUrl}</span>
              <button
                className="btn btn-secondary"
                style={{ minHeight: '32px', height: '32px', padding: '0 10px', fontSize: '0.75rem' }}
                onClick={() => tailscaleUrl && handleCopy(tailscaleUrl, 'tailscale')}
              >
                {copiedKey === 'tailscale' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                {copiedKey === 'tailscale' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <AlertCircle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: '1.4' }}>
                {network?.tailscaleState === 'needs_login'
                  ? 'Tailscale adapter detected on your PC, but not currently signed in or authenticated.'
                  : 'Tailscale was not detected. Sign in to Tailscale on this laptop to stream over cellular/remote Wi-Fi.'}
              </p>
            </div>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: '#f8fafc',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={14} color="#38bdf8" />
                <span>tailscale up</span>
              </div>
              <button
                className="btn btn-secondary"
                style={{ minHeight: '28px', height: '28px', padding: '0 8px', fontSize: '0.7rem' }}
                onClick={() => handleCopy('tailscale up', 'cmd')}
              >
                {copiedKey === 'cmd' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                {copiedKey === 'cmd' ? 'Copied' : 'Copy'}
              </button>
            </div>

            {onGoToGuide && (
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  marginTop: '0.65rem',
                  padding: '0.6rem 0.9rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'var(--cinema-red)',
                }}
                onClick={onGoToGuide}
              >
                <span>Open 3-Step Tailscale Setup Guide &rarr;</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Local Wi-Fi LAN Alternate */}
      <div
        style={{
          border: '1px solid var(--border-glass)',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Wifi size={18} color="#06b6d4" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Local Home Wi-Fi Alternative</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Same Wi-Fi Network</span>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.65rem' }}>
          If your phone or smart TV is on the same local Wi-Fi router, you can also stream directly using your LAN address:
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '0.5rem 0.8rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-glass)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.825rem',
          }}
        >
          <span style={{ color: '#94a3b8' }}>{lanUrl}</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn btn-secondary"
              style={{ minHeight: '30px', height: '30px', padding: '0 8px', fontSize: '0.75rem' }}
              onClick={() => handleCopy(lanUrl, 'lan')}
            >
              {copiedKey === 'lan' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              {copiedKey === 'lan' ? 'Copied' : 'Copy'}
            </button>
            <button
              className="btn btn-cyan"
              style={{ minHeight: '30px', height: '30px', padding: '0 10px', fontSize: '0.75rem' }}
              onClick={() => {
                onSelectUrlForQR(lanUrl);
                onGoToNext();
              }}
            >
              Generate QR
            </button>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button
          className="btn btn-primary"
          style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}
          onClick={() => {
            const target = tailscaleUrl || lanUrl;
            onSelectUrlForQR(target);
            onGoToNext();
          }}
        >
          Proceed to Mobile QR Pairing &rarr;
        </button>
      </div>
    </div>
  );
};
