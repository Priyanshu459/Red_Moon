import React, { useState } from 'react';
import { StreamSettings } from '../../types/media';
import { Sliders, Zap, Check, Globe } from 'lucide-react';

interface StepSettingsProps {
  settings: StreamSettings;
  onSaveSettings: (settings: StreamSettings) => void;
  onClose: () => void;
  onGoToPrev: () => void;
}

export const StepSettings: React.FC<StepSettingsProps> = ({
  settings,
  onSaveSettings,
  onClose,
  onGoToPrev,
}) => {
  const [localSettings, setLocalSettings] = useState<StreamSettings>({ ...settings });
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Buffer Mode Preference */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <Sliders size={18} color="var(--accent-primary)" />
          Stream Buffering Profile
        </label>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
          Tune how media chunks are requested based on your connection when using Tailscale remotely.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {[
            { id: 'low_latency', label: 'Low Latency', desc: 'Fastest seeking, smaller buffer chunks' },
            { id: 'standard', label: 'Standard (Auto)', desc: 'Balanced seeking and smooth preloading' },
            { id: 'high_bandwidth', label: 'Heavy Buffer', desc: 'Aggressive prefetch for cellular travel' },
          ].map((mode) => (
            <div
              key={mode.id}
              onClick={() => setLocalSettings({ ...localSettings, bufferMode: mode.id as any })}
              style={{
                cursor: 'pointer',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: localSettings.bufferMode === mode.id
                  ? '2px solid var(--accent-primary)'
                  : '1px solid var(--border-glass)',
                background: localSettings.bufferMode === mode.id
                  ? 'rgba(139, 92, 246, 0.15)'
                  : 'rgba(255, 255, 255, 0.02)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f8fafc', marginBottom: '4px' }}>
                {mode.label}
              </div>
              <div style={{ fontSize: '0.725rem', color: '#94a3b8', lineHeight: '1.3' }}>
                {mode.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tailscale MagicDNS / Custom Domain */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <Globe size={18} color="var(--accent-cyan)" />
          Tailscale MagicDNS / Domain Override (Optional)
        </label>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
          If you have Tailscale MagicDNS enabled, you can enter your laptop's friendly name (e.g. <code>my-laptop.tailnet.ts.net</code>)
        </p>
        <input
          type="text"
          placeholder="e.g. priyanshu-laptop.puffin-beta.ts.net:3000"
          value={localSettings.customHostOverride}
          onChange={(e) => setLocalSettings({ ...localSettings, customHostOverride: e.target.value })}
          style={{
            width: '100%',
            padding: '0.65rem 0.9rem',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-sm)',
            color: '#f8fafc',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
          }}
        />
      </div>

      {/* Autoplay toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-glass)',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc' }}>
            Autoplay Next Track in Music Queue
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Automatically advance to the next song when current track finishes
          </div>
        </div>
        <input
          type="checkbox"
          checked={localSettings.videoAutoplay}
          onChange={(e) => setLocalSettings({ ...localSettings, videoAutoplay: e.target.checked })}
          style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
        />
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        <button className="btn btn-secondary" onClick={onGoToPrev}>
          &larr; Back to QR
        </button>

        <button className="btn btn-primary" onClick={handleSave} style={{ minWidth: '140px' }}>
          {savedToast ? <Check size={18} /> : <Zap size={18} />}
          {savedToast ? 'Saved!' : 'Save & Finish'}
        </button>
      </div>
    </div>
  );
};
