import React from 'react';
import { MediaItem } from '../types/media';
import { Play, Plus, Film, Music, ShieldCheck, Sparkles, HardDrive } from 'lucide-react';
import { cleanMediaTitle, formatFolderLabel } from '../utils/mediaFormatter';

interface NetflixBillboardProps {
  item: MediaItem | null;
  onPlay: (item: MediaItem) => void;
  onQueue: (item: MediaItem) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const NetflixBillboard: React.FC<NetflixBillboardProps> = ({ item, onPlay, onQueue }) => {
  if (!item) return null;

  const isVideo = item.type === 'video';
  const { title, artist } = cleanMediaTitle(item.name || item.title);
  const folderLabel = formatFolderLabel(item.folder);

  return (
    <div
      className="netflix-billboard"
      style={{
        background: isVideo
          ? 'linear-gradient(135deg, rgba(16, 18, 26, 0.94) 0%, rgba(13, 14, 21, 0.7) 50%, rgba(10, 11, 16, 0.08) 100%)'
          : 'linear-gradient(135deg, rgba(20, 16, 22, 0.94) 0%, rgba(15, 12, 18, 0.7) 50%, rgba(10, 8, 14, 0.08) 100%)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      {/* 3-Way Filmic Vignette Overlays */}
      <div className="netflix-billboard-vignette" />

      {/* Decorative Cinematic Background Watermark */}
      <div
        style={{
          position: 'absolute',
          right: '5%',
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0.1,
          pointerEvents: 'none',
          color: '#ffffff',
          zIndex: 0,
        }}
      >
        {isVideo ? <Film size={340} /> : <Music size={340} />}
      </div>

      {/* Foreground Content Stack */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '680px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Spotlight Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, rgba(229, 9, 20, 0.2), rgba(229, 9, 20, 0.05))',
              border: '1px solid rgba(229, 9, 20, 0.4)',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            <Sparkles size={13} color="var(--cinema-red)" />
            Featured On Red Moon
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              color: '#34d399',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <ShieldCheck size={14} /> Tailscale Mesh Ready
          </span>
        </div>

        {/* Hero Title */}
        <h1
          style={{
            fontSize: 'clamp(1.4rem, 4.5vw, 3.25rem)',
            fontWeight: 800,
            color: '#f8fafc',
            lineHeight: 1.12,
            letterSpacing: '-0.035em',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
            wordBreak: 'break-word',
          }}
        >
          {title}
        </h1>

        {/* Subtitle / Artist */}
        {artist && (
          <h3
            style={{
              fontSize: 'clamp(0.95rem, 2.5vw, 1.2rem)',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              letterSpacing: '-0.01em',
            }}
          >
            {artist}
          </h3>
        )}

        {/* Telemetry Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              background: isVideo ? 'var(--cinema-red)' : 'var(--accent-amber)',
              color: '#ffffff',
              padding: '2px 7px',
              borderRadius: '3px',
              fontSize: '0.7rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
            }}
          >
            {isVideo ? '1080P HD' : 'LOSSLESS HI-FI'}
          </span>

          <span
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#e2e8f0',
              padding: '2px 8px',
              borderRadius: '3px',
              fontSize: '0.725rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            .{item.ext.toUpperCase()}
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              color: '#94a3b8',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <HardDrive size={13} /> {formatBytes(item.size)}
          </span>

          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>&bull;</span>

          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Vault: <strong style={{ color: '#cbd5e1' }}>{folderLabel}</strong>
          </span>
        </div>

        {/* Synopsis / Description */}
        <p
          style={{
            fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
            color: '#cbd5e1',
            lineHeight: 1.5,
            maxWidth: '560px',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)',
          }}
        >
          {isVideo
            ? 'Progressive HTTP 206 range-buffered video stream hosted directly from your computer. Cast and watch remotely on phone or tablet with zero quality loss.'
            : 'Lossless studio audio stream with real FFT harmonic spectrum analysis and background spatial topography visualization.'}
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-netflix btn-whimsy"
            style={{
              padding: '0.65rem 1.6rem',
              minHeight: '42px',
              fontSize: '0.9rem',
              fontWeight: 700,
              gap: '8px',
              borderRadius: '6px',
            }}
            onClick={() => onPlay(item)}
          >
            <Play size={18} fill="#ffffff" />
            <span>Play Now</span>
          </button>

          {!isVideo && (
            <button
              className="btn btn-secondary btn-whimsy"
              style={{
                padding: '0.65rem 1.25rem',
                minHeight: '42px',
                fontSize: '0.85rem',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                borderRadius: '6px',
              }}
              onClick={() => onQueue(item)}
            >
              <Plus size={16} />
              <span>Add to Up Next</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
