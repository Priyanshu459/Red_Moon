import React, { useState, useEffect } from 'react';
import { X, Network, QrCode, Sliders, Shield, BookOpen } from 'lucide-react';
import { NetworkInfo, StreamSettings } from '../../types/media';
import { StepStatus } from './StepStatus';
import { StepQRCode } from './StepQRCode';
import { StepSettings } from './StepSettings';
import { StepGuide } from './StepGuide';

interface TailscaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  network: NetworkInfo | null;
  settings: StreamSettings;
  onSaveSettings: (settings: StreamSettings) => void;
  authToken?: string | null;
  onRefreshNetwork?: () => void;
}

export const TailscaleModal: React.FC<TailscaleModalProps> = ({
  isOpen,
  onClose,
  network,
  settings,
  onSaveSettings,
  authToken,
  onRefreshNetwork,
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedUrlForQR, setSelectedUrlForQR] = useState<string>('');

  // Default target URL for QR code (prioritize official Tailscale HTTPS with token)
  useEffect(() => {
    if (network) {
      const tokenSuffix = network.streamToken ? `?token=${network.streamToken}` : '';
      if (network.tailscaleHttpsUrl) {
        setSelectedUrlForQR(`${network.tailscaleHttpsUrl}/${tokenSuffix}`);
      } else if (network.tailscaleIp) {
        setSelectedUrlForQR(`http://${network.tailscaleIp}:${network.serverPort || 5000}/${tokenSuffix}`);
      } else if (network.localLanIp) {
        setSelectedUrlForQR(`http://${network.localLanIp}:${network.serverPort || 5000}/${tokenSuffix}`);
      }
    }
  }, [network]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const steps = [
    { number: 1, title: 'Network & Mesh', icon: Network },
    { number: 2, title: 'Setup Guide', icon: BookOpen },
    { number: 3, title: 'Mobile QR Pairing', icon: QrCode },
    { number: 4, title: 'Stream Settings', icon: Sliders },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tailscale-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel animate-modal-enter"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
          overflow: 'hidden',
          background: 'linear-gradient(175deg, #101524 0%, #0a0d16 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'clamp(0.75rem, 2.5vw, 1.25rem) clamp(0.75rem, 3vw, 1.5rem)',
            borderBottom: '1px solid var(--border-glass)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 8px var(--accent-primary-glow)',
                flexShrink: 0,
              }}
            >
              <Shield size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 id="tailscale-modal-title" style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Tailscale Remote Access Hub
              </h3>
              <p style={{ fontSize: '0.725rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Stream your laptop's media safely from any phone or tablet
              </p>
            </div>
          </div>

          <button
            className="btn btn-secondary btn-icon"
            onClick={onClose}
            aria-label="Close dialog"
            style={{ width: '36px', height: '36px', flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div style={{ padding: '0 clamp(0.75rem, 3vw, 1.5rem)', marginTop: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}
          >
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = activeStep === s.number;
              const isDone = activeStep > s.number;

              return (
                <button
                  key={s.number}
                  onClick={() => setActiveStep(s.number)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: isActive ? '#f8fafc' : isDone ? 'var(--color-success)' : '#64748b',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 600 : 500,
                    padding: '4px 6px',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isActive
                        ? 'var(--accent-primary)'
                        : isDone
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: isDone ? '1px solid var(--color-success)' : '1px solid transparent',
                      color: isActive ? '#ffffff' : isDone ? 'var(--color-success)' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? '✓' : s.number}
                  </div>
                  <span className="hide-mobile" style={{ alignItems: 'center', gap: '5px' }}>
                    <Icon size={14} />
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Progress Line */}
          <div style={{ width: '100%', height: '3px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: activeStep === 1 ? '25%' : activeStep === 2 ? '50%' : activeStep === 3 ? '75%' : '100%',
                background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-cyan))',
                transition: 'width var(--transition-normal)',
              }}
            />
          </div>
        </div>

        {/* Modal Body Step Content */}
        <div style={{ padding: '1rem clamp(0.75rem, 3vw, 1.5rem) 1.25rem', overflowY: 'auto' }}>
          {activeStep === 1 && (
            <StepStatus
              network={network}
              onSelectUrlForQR={(url) => setSelectedUrlForQR(url)}
              onGoToNext={() => setActiveStep(3)}
              onGoToGuide={() => setActiveStep(2)}
            />
          )}

          {activeStep === 2 && (
            <StepGuide
              network={network}
              onGoToStatus={() => setActiveStep(1)}
              onGoToQR={() => setActiveStep(3)}
              authToken={authToken}
              onRefreshNetwork={onRefreshNetwork}
            />
          )}

          {activeStep === 3 && (
            <StepQRCode
              network={network}
              activeUrl={selectedUrlForQR}
              onChangeUrl={(url) => setSelectedUrlForQR(url)}
              onGoToNext={() => setActiveStep(4)}
              onGoToPrev={() => setActiveStep(1)}
            />
          )}

          {activeStep === 4 && (
            <StepSettings
              settings={settings}
              onSaveSettings={onSaveSettings}
              onClose={onClose}
              onGoToPrev={() => setActiveStep(3)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
