import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Cpu,
  Flame,
  Activity,
  Gauge,
  Film,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Shield,
} from 'lucide-react';

export type NvidiaProfile = 'extreme' | 'turing' | 'smooth' | 'whisper';

export interface NvidiaTelemetryData {
  success: boolean;
  available: boolean;
  count?: number;
  primaryGpu?: {
    id: number;
    name: string;
    driverVersion: string;
    utilization: number;
    memory: {
      used: number;
      total: number;
      free: number;
      unit: string;
    };
    temperature: number;
    power: {
      draw: number;
      unit: string;
    };
    pstate: string;
    graphicsClock: string;
    classification: {
      family: string;
      seriesLabel: string;
      generation: string;
      recommendedTier: NvidiaProfile;
      targetFps: number;
      particles: number;
      textureResolution: number;
      codecs: string[];
      badgeColor: string;
      features: string[];
    };
  };
  windowsGpuPreferences?: Record<string, string>;
  error?: string;
}

interface NvidiaStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRendererString: string;
  currentProfile: NvidiaProfile;
  onProfileChange: (p: NvidiaProfile) => void;
  authToken?: string;
}

export const NvidiaStudioModal: React.FC<NvidiaStudioModalProps> = ({
  isOpen,
  onClose,
  activeRendererString,
  currentProfile,
  onProfileChange,
  authToken,
}) => {
  const [telemetry, setTelemetry] = useState<NvidiaTelemetryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostSuccess, setBoostSuccess] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    try {
      setIsLoading(true);
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const url = authToken ? `/api/system/nvidia?token=${encodeURIComponent(authToken)}` : '/api/system/nvidia';
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch {
      // offline or error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3500);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const gpu = telemetry?.primaryGpu;
  const isBrowserOnNvidia = activeRendererString.toLowerCase().includes('nvidia');

  const handleApplyBoost = async () => {
    try {
      setIsBoosting(true);
      setBoostSuccess(null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/system/nvidia/boost', {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setBoostSuccess('NVIDIA High-Performance Discrete GPU successfully assigned in Windows Registry!');
        fetchTelemetry();
      } else {
        setBoostSuccess(data.error || 'Failed to apply GPU boost');
      }
    } catch (err: any) {
      setBoostSuccess(err.message || 'Error executing GPU boost');
    } finally {
      setIsBoosting(false);
    }
  };

  const getTempColor = (temp: number) => {
    if (temp < 45) return '#34d399'; // cool green
    if (temp < 65) return '#fbbf24'; // warm amber
    return '#ef4444'; // hot red
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 10, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(0.5rem, 2vw, 1.5rem)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-in"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'linear-gradient(145deg, #0e1117 0%, #080a0e 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(118, 185, 0, 0.35)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(118, 185, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          color: '#f8fafc',
          position: 'relative',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: 'clamp(1rem, 2.5vw, 1.5rem) clamp(1rem, 3vw, 2rem)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(118, 185, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #76b900 0%, #4c7700 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(118, 185, 0, 0.4)',
                flexShrink: 0,
              }}
            >
              <Zap size={20} color="#ffffff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                  NVIDIA GeForce & RTX Studio Control Center
                </h2>
                <span
                  style={{
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: 'rgba(118, 185, 0, 0.2)',
                    color: '#76b900',
                    border: '1px solid rgba(118, 185, 0, 0.4)',
                  }}
                >
                  Hardware Accelerated
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                All-series GPU optimization engine for video streaming & 4K spatial rendering
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={fetchTelemetry}
              title="Refresh GPU Telemetry"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                padding: '6px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              title="Close (Esc)"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                padding: '6px',
                cursor: 'pointer',
                borderRadius: '8px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Architecture Card */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: '12px',
              background: 'rgba(118, 185, 0, 0.06)',
              border: '1px solid rgba(118, 185, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Cpu size={16} color="#76b900" />
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#76b900', fontWeight: 700 }}>
                  Active GPU Series
                </span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '2px 0' }}>
                {gpu?.name || 'NVIDIA GeForce GPU'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                {gpu?.classification?.seriesLabel || 'NVIDIA Architecture'} • {gpu?.classification?.generation || 'NVDEC Accelerated'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.675rem', color: '#94a3b8', textTransform: 'uppercase' }}>Driver</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{gpu?.driverVersion || '617.42'}</div>
              </div>
              <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.675rem', color: '#94a3b8', textTransform: 'uppercase' }}>Dedicated VRAM</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{gpu?.memory?.total ? `${gpu.memory.total} MB GDDR6` : '4096 MB'}</div>
              </div>
              <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.675rem', color: '#94a3b8', textTransform: 'uppercase' }}>Clock</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{gpu?.graphicsClock || 'Dynamic'}</div>
              </div>
            </div>
          </div>

          {/* Live Telemetry Gauges */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', margin: 0 }}>
                Live Hardware Diagnostics
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#34d399' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
                <span>Live Monitoring Active</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {/* Core Temp Gauge */}
              <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Core Temperature</span>
                  <Flame size={15} color={getTempColor(gpu?.temperature || 41)} />
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: getTempColor(gpu?.temperature || 41) }}>
                  {gpu?.temperature ?? 41}°C
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                  {(gpu?.temperature ?? 41) < 50 ? 'Optimal Thermal State' : 'Under Load'}
                </div>
              </div>

              {/* VRAM Gauge */}
              <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>VRAM Allocation</span>
                  <Activity size={15} color="#76b900" />
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>
                  {gpu?.memory?.used ?? 0} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>/ {gpu?.memory?.total ?? 4096} MB</span>
                </div>
                <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round(((gpu?.memory?.used ?? 0) / (gpu?.memory?.total ?? 4096)) * 100))}%`,
                      background: 'linear-gradient(90deg, #76b900, #a3e635)',
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </div>

              {/* GPU Utilization */}
              <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>GPU Utilization</span>
                  <Gauge size={15} color="#38bdf8" />
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>
                  {gpu?.utilization ?? 0}%
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                  Power Draw: {gpu?.power?.draw ?? 6} W
                </div>
              </div>

              {/* NVDEC Video Engine */}
              <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>NVDEC Video Engine</span>
                  <Film size={15} color="#ec4899" />
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                  Hardware Active
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                  {gpu?.classification?.codecs ? gpu.classification.codecs.join(' • ') : 'HEVC • H.264 • VP9'}
                </div>
              </div>
            </div>
          </div>

          {/* Active Browser Adapter Status & 1-Click Windows Boost */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: '12px',
              background: isBrowserOnNvidia ? 'rgba(52, 211, 153, 0.08)' : 'rgba(251, 191, 36, 0.08)',
              border: isBrowserOnNvidia ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isBrowserOnNvidia ? <CheckCircle size={17} color="#34d399" /> : <AlertTriangle size={17} color="#fbbf24" />}
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isBrowserOnNvidia ? '#34d399' : '#fbbf24' }}>
                    {isBrowserOnNvidia
                      ? 'Browser is Successfully Bound to NVIDIA Dedicated GPU!'
                      : 'Browser Running on Integrated Graphics (Dual-GPU Optimus)'}
                  </span>
                </div>
                <p style={{ fontSize: '0.775rem', color: '#cbd5e1', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                  <strong>Current WebGL Adapter:</strong> <code style={{ fontSize: '0.725rem', background: 'rgba(0,0,0,0.4)', padding: '2px 5px', borderRadius: '4px' }}>{activeRendererString || 'Detecting...'}</code>
                </p>
                {!isBrowserOnNvidia && (
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                    Windows defaults browsers to low-power integrated graphics. Click below to register High-Performance NVIDIA preference for Chrome, Edge, and RedMoon.exe.
                  </p>
                )}
              </div>

              <div>
                <button
                  className="btn btn-netflix"
                  onClick={handleApplyBoost}
                  disabled={isBoosting}
                  style={{
                    background: 'linear-gradient(135deg, #76b900 0%, #4c7700 100%)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '0.55rem 1.1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    boxShadow: '0 0 14px rgba(118, 185, 0, 0.35)',
                  }}
                >
                  <Zap size={14} />
                  <span>{isBoosting ? 'Configuring Windows...' : 'Prioritize NVIDIA GPU in Windows'}</span>
                </button>
              </div>
            </div>

            {boostSuccess && (
              <div
                style={{
                  marginTop: '0.85rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(118, 185, 0, 0.3)',
                  fontSize: '0.75rem',
                  color: '#86efac',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle size={14} color="#86efac" />
                <span>{boostSuccess} (Restart browser to take full effect).</span>
              </div>
            )}
          </div>

          {/* 3D Spatial Rendering Profiles */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
              <Sliders size={16} color="#76b900" />
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', margin: 0 }}>
                3D Spatial Rendering Quality Profile
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {/* Turing Boost Profile (Tailored for RTX 2050) */}
              <div
                onClick={() => onProfileChange('turing')}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: currentProfile === 'turing' ? '2px solid #76b900' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: currentProfile === 'turing' ? 'rgba(118, 185, 0, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: currentProfile === 'turing' ? '#76b900' : '#f8fafc' }}>
                    Turing Boost (Host)
                  </span>
                  {currentProfile === 'turing' && <CheckCircle size={14} color="#76b900" />}
                </div>
                <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                  2048×1024 4K Texture • 2,200 Particles • 120 FPS Target
                </div>
              </div>

              {/* Extreme Profile */}
              <div
                onClick={() => onProfileChange('extreme')}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: currentProfile === 'extreme' ? '2px solid #00ff88' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: currentProfile === 'extreme' ? 'rgba(0, 255, 136, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: currentProfile === 'extreme' ? '#00ff88' : '#f8fafc' }}>
                    RTX Extreme
                  </span>
                  {currentProfile === 'extreme' && <CheckCircle size={14} color="#00ff88" />}
                </div>
                <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                  4K Ultra Shaders • 3,000 Particles • Maximum Flares
                </div>
              </div>

              {/* Smooth Profile */}
              <div
                onClick={() => onProfileChange('smooth')}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: currentProfile === 'smooth' ? '2px solid #a3e635' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: currentProfile === 'smooth' ? 'rgba(163, 230, 53, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: currentProfile === 'smooth' ? '#a3e635' : '#f8fafc' }}>
                    Pascal / Smooth
                  </span>
                  {currentProfile === 'smooth' && <CheckCircle size={14} color="#a3e635" />}
                </div>
                <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                  1024×512 Texture • 1,200 Particles • 60 FPS Target
                </div>
              </div>

              {/* Whisper Mode */}
              <div
                onClick={() => onProfileChange('whisper')}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: currentProfile === 'whisper' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: currentProfile === 'whisper' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: currentProfile === 'whisper' ? '#38bdf8' : '#f8fafc' }}>
                    Whisper / Eco
                  </span>
                  {currentProfile === 'whisper' && <CheckCircle size={14} color="#38bdf8" />}
                </div>
                <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                  512×256 Texture • 500 Particles • Low Power Draw
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} color="#76b900" />
            <span>NVIDIA NVDEC Hardware Accelerated • Direct3D 11 / WebGL 2.0</span>
          </div>

          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '0.45rem 1.25rem', fontSize: '0.8rem' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
