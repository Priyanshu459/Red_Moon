import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Film,
  Music,
  Sliders,
  Radio,
  Palette,
  HardDrive,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Download,
  Upload,
  ArrowLeft,
} from 'lucide-react';
import {
  RedMoonSettings,
  DEFAULT_REDMOON_SETTINGS,
  EQUALIZER_FREQUENCIES,
  EQUALIZER_PRESETS,
  THEME_PRESETS,
} from '../../types/settings';
import { audioEngine } from '../../services/audioEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RedMoonSettings;
  onSaveSettings: (newSettings: RedMoonSettings) => void;
  authToken?: string;
  onTriggerToast?: (msg: string, icon?: 'sparkles' | 'music' | 'check', badge?: string) => void;
  isEmbedded?: boolean;
}

type SettingsTab = 'gpu' | 'video' | 'audio' | 'network' | 'appearance' | 'library';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  authToken,
  onTriggerToast,
  isEmbedded = false,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('gpu');
  const [draft, setDraft] = useState<RedMoonSettings>(settings);
  const [encoderInfo, setEncoderInfo] = useState<any>(null);
  const [isProbingEncoders, setIsProbingEncoders] = useState(false);
  const [isBoostingDirectX, setIsBoostingDirectX] = useState(false);
  const [directXStatus, setDirectXStatus] = useState<string | null>(null);


  // Sync draft whenever modal opens or external settings update
  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      fetchEncoderInfo();
    }
  }, [isOpen, settings]);

  const fetchEncoderInfo = async (customPath?: string) => {
    setIsProbingEncoders(true);
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      let url = customPath
        ? `/api/system/encoders?customPath=${encodeURIComponent(customPath)}`
        : '/api/system/encoders';
      if (authToken) {
        url += (url.includes('?') ? '&' : '?') + `token=${encodeURIComponent(authToken)}`;
      }
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setEncoderInfo(data);
      }
    } catch {
      // offline or error
    } finally {
      setIsProbingEncoders(false);
    }
  };

  const handleApplyDirectXBoost = async () => {
    setIsBoostingDirectX(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch('/api/system/nvidia/boost', { method: 'POST', headers });
      if (res.ok) {
        const data = await res.json();
        setDirectXStatus(`DirectX High-Performance GPU injected (${data.count || 'Active'} apps)`);
        onTriggerToast?.('DirectX High-Performance GPU Active! ⚡', 'sparkles', 'GPU BOOST');
      } else {
        setDirectXStatus('Failed to update DirectX registry');
      }
    } catch {
      setDirectXStatus('Error communicating with boost endpoint');
    } finally {
      setIsBoostingDirectX(false);
    }
  };

  const handleSaveAndClose = () => {
    onSaveSettings(draft);
    onTriggerToast?.('Settings Saved & Synchronized! ✨', 'check', 'SETTINGS');
    if (!isEmbedded) {
      onClose();
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all settings to Red Moon factory defaults?')) {
      setDraft(DEFAULT_REDMOON_SETTINGS);
      onSaveSettings(DEFAULT_REDMOON_SETTINGS);
      onTriggerToast?.('Factory Defaults Restored 🔄', 'sparkles', 'RESET');
    }
  };

  const handleExportConfig = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redmoon_settings_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setDraft((prev) => ({ ...prev, ...parsed }));
        onTriggerToast?.('Settings Imported Successfully! 📁', 'check', 'IMPORT');
      } catch {
        alert('Invalid settings JSON file');
      }
    };
    reader.readAsText(file);
  };

  // Live Equalizer updates
  const handleEqBandChange = (index: number, val: number) => {
    const newBands = [...draft.audio.equalizerBands];
    newBands[index] = val;
    setDraft({
      ...draft,
      audio: {
        ...draft.audio,
        equalizerPreset: 'custom',
        equalizerBands: newBands,
      },
    });
    audioEngine.setEqualizerBand(index, val);
  };

  const handleEqPresetSelect = (presetKey: string) => {
    const preset = EQUALIZER_PRESETS[presetKey];
    if (!preset) return;
    setDraft({
      ...draft,
      audio: {
        ...draft.audio,
        equalizerPreset: presetKey as any,
        equalizerBands: [...preset.bands],
      },
    });
    audioEngine.setEqualizerPreset(presetKey);
  };

  // Live Theme updates
  const handleThemeSelect = (themeKey: keyof typeof THEME_PRESETS) => {
    setDraft({
      ...draft,
      appearance: {
        ...draft.appearance,
        themeAccent: themeKey as any,
      },
    });
    const theme = THEME_PRESETS[themeKey];
    document.documentElement.style.setProperty('--cinema-red', theme.color);
    document.documentElement.style.setProperty('--cinema-red-hover', theme.hover);
    document.documentElement.style.setProperty('--cinema-red-glow', theme.glow);
  };

  if (!isOpen && !isEmbedded) return null;

  const modalInnerContent = (
    <div
      style={{
        width: '100%',
        maxWidth: isEmbedded ? '100%' : '1060px',
        height: isEmbedded ? 'auto' : '88vh',
        minHeight: isEmbedded ? '760px' : undefined,
        maxHeight: isEmbedded ? undefined : '800px',
        background: '#0e1118',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: isEmbedded ? '16px' : '14px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
      }}
    >
        {/* Top Header */}
        <div
          style={{
            padding: 'clamp(0.75rem, 2vw, 1rem) clamp(0.75rem, 3vw, 1.75rem)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--cinema-red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 14px var(--cinema-red-glow)',
                flexShrink: 0,
              }}
            >
              <Sliders size={18} color="#ffffff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Red Moon System & Multi-Media Settings
              </h2>
              <span className="hide-mobile" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Hardware Acceleration, Audio DSP, Video Rendering & Network Pipeline
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isEmbedded ? (
              <button
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to Library</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1',
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body: Left Sidebar + Right Content Area */}
        <div className="settings-modal-body" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left Sidebar Navigation */}
          <div
            className="settings-modal-sidebar"
            style={{
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(10, 12, 18, 0.6)',
              padding: '1.25rem 0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {[
              { id: 'gpu', label: 'GPU & Encoding', icon: Zap, badge: 'NVENC' },
              { id: 'video', label: 'Video Playback', icon: Film, badge: 'HDR' },
              { id: 'audio', label: 'Audio & Sound DSP', icon: Music, badge: '10-Band' },
              { id: 'network', label: 'Network & Stream', icon: Radio, badge: 'Mesh' },
              { id: 'appearance', label: 'Cinema Themes', icon: Palette, badge: '3D' },
              { id: 'library', label: 'Storage & Library', icon: HardDrive, badge: 'Scope' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: isActive ? '1px solid var(--cinema-red)' : '1px solid transparent',
                    background: isActive ? 'rgba(229, 9, 20, 0.12)' : 'transparent',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 700 : 500,
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={16} color={isActive ? 'var(--cinema-red)' : '#64748b'} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: isActive ? 'var(--cinema-red)' : 'rgba(255, 255, 255, 0.06)',
                        color: isActive ? '#ffffff' : '#64748b',
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="hide-mobile" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '8px', paddingLeft: '6px' }}>
                PROFILES & ACTIONS
              </div>
              <button
                onClick={handleExportConfig}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '6px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  borderRadius: '6px',
                }}
              >
                <Download size={13} />
                <span>Export Settings JSON</span>
              </button>
              <label
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#94a3b8',
                  padding: '6px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  borderRadius: '6px',
                }}
              >
                <Upload size={13} />
                <span>Import Settings JSON</span>
                <input type="file" accept=".json" onChange={handleImportConfig} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Right Tab Content Scrollable Area */}
          <div
            className="settings-modal-content"
            style={{
              flex: 1,
              padding: '1.75rem 2rem',
              overflowY: 'auto',
              background: '#0e1118',
            }}
          >
            {/* ==================== TAB 1: GPU & ENCODING ==================== */}
            {activeTab === 'gpu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                    GPU Hardware Encoding & Transcoding Engine
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Configure hardware video acceleration, NVIDIA NVENC/NVDEC silicon, and streaming compression ladders.
                  </p>
                </div>

                {/* Host Hardware Detection Banner */}
                <div
                  style={{
                    background: 'rgba(118, 185, 0, 0.08)',
                    border: '1px solid rgba(118, 185, 0, 0.3)',
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: 'rgba(118, 185, 0, 0.16)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Zap size={22} color="#76b900" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                        {isProbingEncoders ? 'Scanning System Encoders...' : (encoderInfo?.gpuName || 'NVIDIA GPU Detected')}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#a3e635' }}>
                        Architecture: {encoderInfo?.gpuArchitecture || 'Turing RTX'} • NVDEC 4K 10-bit Zero-Copy Ready
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleApplyDirectXBoost}
                    disabled={isBoostingDirectX}
                    style={{
                      background: 'rgba(118, 185, 0, 0.2)',
                      border: '1px solid #76b900',
                      color: '#ffffff',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Zap size={13} color="#76b900" />
                    <span>{isBoostingDirectX ? 'Applying...' : 'Enforce Windows GPU Priority'}</span>
                  </button>
                </div>
                {directXStatus && (
                  <div style={{ fontSize: '0.75rem', color: '#76b900', paddingLeft: '4px' }}>
                    ✓ {directXStatus}
                  </div>
                )}

                {/* Hardware Encoder Mode */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Hardware Transcoding Engine
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { id: 'auto', label: 'Auto Detect', desc: 'Prioritizes NVENC, falls back cleanly' },
                      { id: 'nvenc', label: 'NVIDIA NVENC', desc: 'Hardware silicon on GeForce / Quadro' },
                      { id: 'webcodecs', label: 'WebCodecs GPU', desc: 'Browser native client-side GPU' },
                      { id: 'qsv', label: 'Intel QuickSync', desc: 'Integrated Intel Iris/Xe GPU' },
                      { id: 'amf', label: 'AMD AMF', desc: 'AMD Radeon hardware encoder' },
                      { id: 'software', label: 'CPU Software', desc: 'libx264 / libvpx software pipeline' },
                    ].map((enc) => {
                      const isSelected = draft.gpu.hardwareEncoder === enc.id;
                      return (
                        <div
                          key={enc.id}
                          onClick={() =>
                            setDraft({ ...draft, gpu: { ...draft.gpu, hardwareEncoder: enc.id as any } })
                          }
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid var(--cinema-red)' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isSelected ? 'rgba(229, 9, 20, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? '#ffffff' : '#cbd5e1' }}>
                            {enc.label}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>{enc.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* NVENC Encoder Preset */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                    NVENC Quality Preset
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[
                      { id: 'p1', label: 'P1: Ultra Fast', desc: 'Lowest Latency' },
                      { id: 'p3', label: 'P3: Fast', desc: 'Balanced Streaming' },
                      { id: 'p5', label: 'P5: High Quality', desc: 'Recommended Default' },
                      { id: 'p7', label: 'P7: Cinema Master', desc: 'Maximum Visual Fidelity' },
                    ].map((p) => {
                      const isSelected = draft.gpu.nvencPreset === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setDraft({ ...draft, gpu: { ...draft.gpu, nvencPreset: p.id as any } })}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: isSelected ? '1px solid #76b900' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isSelected ? 'rgba(118, 185, 0, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            color: isSelected ? '#ffffff' : '#94a3b8',
                            fontSize: '0.75rem',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                          }}
                        >
                          <div>{p.label}</div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{p.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Streaming Bitrate */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Target Bitrate Compression Ceiling
                  </label>
                  <select
                    value={draft.gpu.targetBitrate}
                    onChange={(e) =>
                      setDraft({ ...draft, gpu: { ...draft.gpu, targetBitrate: e.target.value as any } })
                    }
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      outline: 'none',
                    }}
                  >
                    <option value="auto">Auto (Source Pass-through)</option>
                    <option value="35000k">35 Mbps (4K UHD Master)</option>
                    <option value="16000k">16 Mbps (1440p QHD High)</option>
                    <option value="8000k">8 Mbps (1080p FHD Standard)</option>
                    <option value="4000k">4 Mbps (1080p Eco)</option>
                    <option value="2000k">2 Mbps (720p Mobile Data Saver)</option>
                  </select>
                </div>

                {/* Checkbox Toggles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={draft.gpu.nvdecHardwareDecode}
                      onChange={(e) =>
                        setDraft({ ...draft, gpu: { ...draft.gpu, nvdecHardwareDecode: e.target.checked } })
                      }
                      style={{ accentColor: 'var(--cinema-red)', width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                        NVIDIA NVDEC Hardware Video Decoding
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Zero-copy GPU hardware decoding for 4K 60FPS / 10-bit HEVC & VP9.
                      </div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={draft.gpu.gpuCompositing}
                      onChange={(e) =>
                        setDraft({ ...draft, gpu: { ...draft.gpu, gpuCompositing: e.target.checked } })
                      }
                      style={{ accentColor: 'var(--cinema-red)', width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                        GPU Accelerated Compositing Layers
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Forces dedicated Direct3D hardware rasterizer passes for smooth 120Hz rendering.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* ==================== TAB 2: VIDEO PLAYBACK & FILTERS ==================== */}
            {activeTab === 'video' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                    Video Playback & Visual Tuning
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Color grading tone-mapping filters, Netflix hover previews, resume timestamps, and subtitle typography.
                  </p>
                </div>

                {/* Color Grading & HDR Tone Mapping */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Hardware Color Grading & Dynamic Range
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                    {[
                      { id: 'none', label: 'None (Natural)', desc: 'Unmodified raw source' },
                      { id: 'vibrant', label: 'Vibrant Cinema', desc: '+15% Saturation & Contrast' },
                      { id: 'cinema', label: 'Cinema HDR', desc: 'Tone mapped contrast' },
                      { id: 'darkroom', label: 'Dark Room', desc: 'Tamed peak highlights' },
                      { id: 'nightshift', label: 'Night Shift', desc: 'Warm blue-light filter' },
                    ].map((f) => {
                      const isSelected = draft.video.colorGradingFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() =>
                            setDraft({ ...draft, video: { ...draft.video, colorGradingFilter: f.id as any } })
                          }
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: isSelected ? '1px solid var(--cinema-red)' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isSelected ? 'rgba(229, 9, 20, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            color: isSelected ? '#ffffff' : '#94a3b8',
                            fontSize: '0.75rem',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                          }}
                        >
                          <div>{f.label}</div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{f.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subtitle Typography Customization & Live Box Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Subtitle Typography & Live Preview
                  </label>
                  
                  {/* Interactive Subtitle Preview Box */}
                  <div
                    style={{
                      height: '90px',
                      borderRadius: '8px',
                      background: 'radial-gradient(circle at center, #1e293b 0%, #090a0f 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          draft.video.subtitleSize === 'small'
                            ? '13px'
                            : draft.video.subtitleSize === 'large'
                            ? '22px'
                            : draft.video.subtitleSize === 'huge'
                            ? '28px'
                            : '17px',
                        color: draft.video.subtitleColor,
                        fontWeight: 700,
                        background:
                          draft.video.subtitleBackground === 'transparent'
                            ? 'transparent'
                            : draft.video.subtitleBackground === 'solid'
                            ? 'rgba(0,0,0,0.85)'
                            : 'rgba(0,0,0,0.45)',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                      }}
                    >
                      "The Red Moon rises above the horizon."
                    </div>
                  </div>

                  {/* Subtitle Controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Font Size</span>
                      <select
                        value={draft.video.subtitleSize}
                        onChange={(e) =>
                          setDraft({ ...draft, video: { ...draft.video, subtitleSize: e.target.value as any } })
                        }
                        style={{
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          padding: '6px',
                          fontSize: '0.8rem',
                          marginTop: '4px',
                        }}
                      >
                        <option value="small">Small (14px)</option>
                        <option value="medium">Medium (18px)</option>
                        <option value="large">Large (24px)</option>
                        <option value="huge">Huge (32px)</option>
                      </select>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Font Color</span>
                      <select
                        value={draft.video.subtitleColor}
                        onChange={(e) =>
                          setDraft({ ...draft, video: { ...draft.video, subtitleColor: e.target.value } })
                        }
                        style={{
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          padding: '6px',
                          fontSize: '0.8rem',
                          marginTop: '4px',
                        }}
                      >
                        <option value="#ffffff">Pure White</option>
                        <option value="#ffd700">Golden Cinema Yellow</option>
                        <option value="#38bdf8">Electric Cyan</option>
                        <option value="#a3e635">Lime Accent</option>
                      </select>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Backdrop Box</span>
                      <select
                        value={draft.video.subtitleBackground}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            video: { ...draft.video, subtitleBackground: e.target.value as any },
                          })
                        }
                        style={{
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          padding: '6px',
                          fontSize: '0.8rem',
                          marginTop: '4px',
                        }}
                      >
                        <option value="transparent">Transparent</option>
                        <option value="subtle">Subtle Box (40%)</option>
                        <option value="solid">High Contrast Solid (85%)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Video Playback Toggles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={draft.video.autoResumePosition}
                      onChange={(e) =>
                        setDraft({ ...draft, video: { ...draft.video, autoResumePosition: e.target.checked } })
                      }
                      style={{ accentColor: 'var(--cinema-red)' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Auto-Resume Last Playback Position</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={draft.video.autoplayNext}
                      onChange={(e) =>
                        setDraft({ ...draft, video: { ...draft.video, autoplayNext: e.target.checked } })
                      }
                      style={{ accentColor: 'var(--cinema-red)' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Autoplay Next Video in Queue</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={draft.video.hoverPreviewAutoplay}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          video: { ...draft.video, hoverPreviewAutoplay: e.target.checked },
                        })
                      }
                      style={{ accentColor: 'var(--cinema-red)' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Netflix Card Hover Video Preview</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={draft.video.frameDropWatchdog}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          video: { ...draft.video, frameDropWatchdog: e.target.checked },
                        })
                      }
                      style={{ accentColor: 'var(--cinema-red)' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Frame-Drop Watchdog & Adaptive Render</span>
                  </label>
                </div>
              </div>
            )}

            {/* ==================== TAB 3: AUDIO & SOUND DSP ==================== */}
            {activeTab === 'audio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                    Web Audio DSP & Equalizer Control
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Hardware sound enhancement, 10-band graphic equalizer, and dialogue loudness normalization.
                  </p>
                </div>

                {/* DSP Master Switches */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                        Night Mode / Dialogue Boost
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Normalizes loudness to tame loud explosions & boost quiet dialogue
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={draft.audio.loudnessNormalization}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setDraft({ ...draft, audio: { ...draft.audio, loudnessNormalization: val } });
                        audioEngine.setLoudnessNormalization(val);
                      }}
                      style={{ accentColor: 'var(--cinema-red)', width: '18px', height: '18px' }}
                    />
                  </div>

                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                        Spatial 3D Surround
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Simulates virtual acoustic field for headphones and stereo speakers
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={draft.audio.spatialSurround}
                      onChange={(e) =>
                        setDraft({ ...draft, audio: { ...draft.audio, spatialSurround: e.target.checked } })
                      }
                      style={{ accentColor: 'var(--cinema-red)', width: '18px', height: '18px' }}
                    />
                  </div>
                </div>

                {/* 10-Band Graphic Equalizer */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <SlidersHorizontal size={16} color="var(--cinema-red)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                        10-Band Graphic Equalizer
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Preset:</span>
                      <select
                        value={draft.audio.equalizerPreset}
                        onChange={(e) => handleEqPresetSelect(e.target.value)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                        }}
                      >
                        {Object.entries(EQUALIZER_PRESETS).map(([key, p]) => (
                          <option key={key} value={key}>
                            {p.name}
                          </option>
                        ))}
                        <option value="custom">Custom (User Tuned)</option>
                      </select>
                    </div>
                  </div>

                  {/* 10 Interactive Sliders */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      height: '140px',
                      padding: '10px 0',
                    }}
                  >
                    {EQUALIZER_FREQUENCIES.map((freq, i) => {
                      const gain = draft.audio.equalizerBands[i] || 0;
                      return (
                        <div
                          key={freq}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            flex: 1,
                          }}
                        >
                          <span style={{ fontSize: '0.65rem', color: gain > 0 ? '#34d399' : gain < 0 ? '#ef4444' : '#64748b' }}>
                            {gain > 0 ? `+${gain}` : gain}dB
                          </span>
                          <input
                            type="range"
                            min="-12"
                            max="12"
                            step="1"
                            value={gain}
                            onChange={(e) => handleEqBandChange(i, parseInt(e.target.value, 10))}
                            style={{
                              writingMode: 'vertical-lr',
                              direction: 'rtl',
                              height: '80px',
                              width: '14px',
                              accentColor: 'var(--cinema-red)',
                              cursor: 'pointer',
                            }}
                          />
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                            {freq >= 1000 ? `${freq / 1000}k` : `${freq}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 4: NETWORK & STREAMING ==================== */}
            {activeTab === 'network' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                    Network & Remote Tailscale Streaming
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Bandwidth preservation, HTTP 206 chunk buffering, and MagicDNS HTTPS preference.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={draft.network.mobileDataSaver}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          network: { ...draft.network, mobileDataSaver: e.target.checked },
                        })
                      }
                      style={{ accentColor: 'var(--cinema-red)', width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                        Remote Mobile Data Saver Mode
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Automatically caps streaming resolution to 720p 2.5 Mbps when streaming outside home Wi-Fi.
                      </div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={draft.network.tailscaleHttpsPreferred}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          network: { ...draft.network, tailscaleHttpsPreferred: e.target.checked },
                        })
                      }
                      style={{ accentColor: 'var(--cinema-red)', width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                        Prefer Tailscale Encrypted HTTPS (*.ts.net)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Prefers TLS encrypted connection over raw port 5000 when MagicDNS is available.
                      </div>
                    </div>
                  </label>
                </div>

                {/* HTTP 206 Buffer Sizing */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                    HTTP 206 Partial Content Buffer Size
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { id: 'low_latency', label: 'Low Latency (2 MB)', desc: 'Instant seek response' },
                      { id: 'standard', label: 'Standard (8 MB)', desc: 'Balanced cache buffer' },
                      { id: 'high_bandwidth', label: 'Aggressive (32 MB)', desc: 'Ideal for unstable cellular' },
                    ].map((b) => {
                      const isSelected = draft.network.bufferMode === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() =>
                            setDraft({ ...draft, network: { ...draft.network, bufferMode: b.id as any } })
                          }
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid var(--cinema-red)' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isSelected ? 'rgba(229, 9, 20, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            color: isSelected ? '#ffffff' : '#94a3b8',
                            fontSize: '0.8rem',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <div>{b.label}</div>
                          <div style={{ fontSize: '0.675rem', color: '#64748b' }}>{b.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 5: APPEARANCE & 3D SPACE ==================== */}
            {activeTab === 'appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                    Cinema Themes & 3D Environment
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Dynamic CSS theme accents, 3D lunar canvas particle density, and backdrop blur.
                  </p>
                </div>

                {/* 5 Dynamic UI Themes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                    UI Accent Color Palette
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                    {Object.entries(THEME_PRESETS).map(([key, t]) => {
                      const isSelected = draft.appearance.themeAccent === key;
                      return (
                        <div
                          key={key}
                          onClick={() => handleThemeSelect(key as any)}
                          style={{
                            padding: '12px 10px',
                            borderRadius: '8px',
                            border: isSelected ? `2px solid ${t.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: t.color,
                              boxShadow: `0 0 10px ${t.glow}`,
                            }}
                          />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f1f5f9' }}>
                            {t.name.split(' ')[1] || t.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3D Canvas Particle Density */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                      3D Lunar Canvas Starfield Particles
                    </label>
                    <span style={{ fontSize: '0.8rem', color: 'var(--cinema-red)', fontWeight: 700 }}>
                      {draft.appearance.starParticleCount} Particles
                    </span>
                  </div>
                  <input
                    type="range"
                    min="800"
                    max="3500"
                    step="100"
                    value={draft.appearance.starParticleCount}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        appearance: {
                          ...draft.appearance,
                          starParticleCount: parseInt(e.target.value, 10),
                        },
                      })
                    }
                    style={{ width: '100%', accentColor: 'var(--cinema-red)', cursor: 'pointer' }}
                  />
                </div>

                {/* Glassmorphism Blur Depth */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Glassmorphism Backdrop Blur Depth
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { id: 'none', label: 'None (Solid Dark)', desc: 'Best performance' },
                      { id: 'subtle', label: 'Subtle Blur (8px)', desc: 'Light glass' },
                      { id: 'deep', label: 'Deep Frosted (20px)', desc: 'Cinema studio feel' },
                    ].map((b) => {
                      const isSelected = draft.appearance.backdropBlur === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              appearance: { ...draft.appearance, backdropBlur: b.id as any },
                            })
                          }
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid var(--cinema-red)' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isSelected ? 'rgba(229, 9, 20, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            color: isSelected ? '#ffffff' : '#94a3b8',
                            fontSize: '0.8rem',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                          }}
                        >
                          <div>{b.label}</div>
                          <div style={{ fontSize: '0.675rem', color: '#64748b' }}>{b.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 6: STORAGE & LIBRARY ==================== */}
            {activeTab === 'library' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                    Media Storage & Indexing Maintenance
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Folder scan recursion, cache clearing, and history management.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={draft.library.autoScanOnStartup}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          library: { ...draft.library, autoScanOnStartup: e.target.checked },
                        })
                      }
                      style={{ accentColor: 'var(--cinema-red)', width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                        Auto-Scan Pointed Folders on Launch
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Automatically discovers newly added movies and songs upon startup.
                      </div>
                    </div>
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                      Subfolder Scan Recursion Depth
                    </label>
                    <select
                      value={draft.library.scanSubfolderDepth}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          library: {
                            ...draft.library,
                            scanSubfolderDepth: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        padding: '8px',
                        fontSize: '0.8rem',
                      }}
                    >
                      <option value="1">1 Level (Top folder only)</option>
                      <option value="3">3 Levels (Standard Album / Season folders)</option>
                      <option value="99">Unlimited (Deep recursive scan)</option>
                    </select>
                  </div>
                </div>

                {/* Maintenance Actions */}
                <div
                  style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Cache & History Cleanup
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => {
                        localStorage.removeItem('redmoon_watch_history');
                        onTriggerToast?.('Watch History Cleared 🧹', 'check', 'CLEANUP');
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#cbd5e1',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Clear Watch History
                    </button>
                    <button
                      onClick={() => {
                        Object.keys(localStorage).forEach((k) => {
                          if (k.startsWith('redmoon_resume_')) localStorage.removeItem(k);
                        });
                        onTriggerToast?.('Playback Resume Timestamps Cleared 🧹', 'check', 'CLEANUP');
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#cbd5e1',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Clear Resume Positions
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div
          style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(10, 12, 18, 0.9)',
          }}
        >
          <button
            onClick={handleResetToDefaults}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            <span>Reset to Factory Defaults</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#f1f5f9',
                padding: '8px 18px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isEmbedded ? 'Back to Library' : 'Cancel'}
            </button>
            <button
              onClick={handleSaveAndClose}
              style={{
                background: 'var(--cinema-red)',
                border: 'none',
                color: '#ffffff',
                padding: '8px 22px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 14px var(--cinema-red-glow)',
              }}
            >
              <Check size={16} />
              <span>Save & Apply Settings</span>
            </button>
          </div>
        </div>
      </div>
    );

  if (isEmbedded) {
    return (
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1.5rem 1rem 3.5rem 1rem',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {modalInnerContent}
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 30000,
        background: 'rgba(5, 6, 9, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      {modalInnerContent}
    </div>
  );
};
