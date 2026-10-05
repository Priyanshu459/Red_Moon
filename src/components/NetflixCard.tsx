import React, { useState } from 'react';
import { MediaItem } from '../types/media';
import { Play, Plus, Music, Check } from 'lucide-react';
import { cleanMediaTitle, formatFolderLabel } from '../utils/mediaFormatter';

interface NetflixCardProps {
  item: MediaItem;
  isCurrentAudio: boolean;
  isPlayingAudio: boolean;
  onPlayVideo: (item: MediaItem) => void;
  onPlayAudio: (item: MediaItem) => void;
  onQueueAudio: (item: MediaItem) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getCoverGradient(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 50) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 45%, 14%) 0%, hsl(${h2}, 60%, 8%) 100%)`;
}

export const NetflixCard: React.FC<NetflixCardProps> = ({
  item,
  isCurrentAudio,
  isPlayingAudio,
  onPlayVideo,
  onPlayAudio,
  onQueueAudio,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [justQueued, setJustQueued] = useState(false);

  const isVideo = item.type === 'video';
  const { title, artist, categoryTag } = cleanMediaTitle(item.name || item.title);
  const folderLabel = formatFolderLabel(item.folder);

  const handleCardClick = () => {
    if (isVideo) onPlayVideo(item);
    else onPlayAudio(item);
  };

  const handleQueueClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQueueAudio(item);
    setJustQueued(true);
    setTimeout(() => setJustQueued(false), 1800);
  };

  return (
    <div
      className={`netflix-card ${isVideo ? 'netflix-card-video' : 'netflix-card-audio'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      style={{
        border: isCurrentAudio && isPlayingAudio
          ? '1px solid var(--accent-laser)'
          : isHovered
          ? '1px solid rgba(255, 255, 255, 0.28)'
          : '1px solid var(--cinema-border)',
      }}
    >
      {/* Thumbnail Surface */}
      <div
        style={{
          width: '100%',
          height: isVideo ? '164px' : '150px',
          background: isVideo
            ? 'radial-gradient(ellipse at center, #1e293b 0%, #0a0d14 100%)'
            : getCoverGradient(item.title),
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Subtle Specular Sheen on hover */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isHovered
              ? 'radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.15), transparent 70%)'
              : 'transparent',
            pointerEvents: 'none',
            transition: 'background 0.3s ease',
          }}
        />

        {/* Quality Badges */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            display: 'flex',
            gap: '5px',
            zIndex: 10,
          }}
        >
          <span
            style={{
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              color: isVideo ? '#38bdf8' : '#fbbf24',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '0.625rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              textTransform: 'uppercase',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {item.ext}
          </span>

          {isVideo && (
            <span
              style={{
                background: 'rgba(229, 9, 20, 0.85)',
                color: '#ffffff',
                padding: '2px 5px',
                borderRadius: '3px',
                fontSize: '0.625rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              HD
            </span>
          )}
        </div>

        {/* Folder Origin Chip */}
        <span
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            color: '#cbd5e1',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '0.625rem',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 10,
          }}
        >
          {folderLabel}
        </span>

        {/* Center Artwork / Interactive Play Indicator */}
        {isCurrentAudio ? (
          <div
            className={`vinyl-disc ${isPlayingAudio ? '' : 'paused'}`}
            style={{
              width: '54px',
              height: '54px',
              background: 'radial-gradient(circle, #090a0f 22%, #1e293b 24%, #0f172a 50%, #334155 52%, #0f172a 70%, #1e293b 72%, #0284c7 95%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #38bdf8',
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#090a0f' }} />
            </div>
          </div>
        ) : (
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: isHovered ? '#ffffff' : 'rgba(0, 0, 0, 0.55)',
              color: isHovered ? '#090a0f' : '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: isHovered ? 'scale(1.15)' : 'scale(1)',
              boxShadow: isHovered ? '0 4px 20px rgba(0, 0, 0, 0.6)' : 'none',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            {isVideo ? <Play size={20} style={{ marginLeft: '2px' }} /> : <Music size={18} />}
          </div>
        )}

        {/* Active Soundwave Visualizer on Playing Audio */}
        {isCurrentAudio && isPlayingAudio && (
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              display: 'flex',
              gap: '2px',
              alignItems: 'flex-end',
              height: '16px',
              background: 'rgba(0,0,0,0.65)',
              padding: '2px 4px',
              borderRadius: '3px',
            }}
          >
            <span className="soundwave-bar" />
            <span className="soundwave-bar" />
            <span className="soundwave-bar" />
          </div>
        )}
      </div>

      {/* Card Info & Quick Action Drawer */}
      <div style={{ padding: '0.85rem 1rem 0.95rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {/* Title */}
        <h4
          title={title}
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#f8fafc',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '-0.01em',
            lineHeight: '1.25',
          }}
        >
          {title}
        </h4>

        {/* Subtitle / Artist */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '18px' }}>
          {artist ? (
            <span
              style={{
                fontSize: '0.775rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {artist}
            </span>
          ) : categoryTag ? (
            <span style={{ fontSize: '0.725rem', color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
              {categoryTag}
            </span>
          ) : (
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              {isVideo ? 'Movie / Clip' : 'Audio Track'}
            </span>
          )}

          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {formatBytes(item.size)}
          </span>
        </div>

        {/* Quick Action Footer on Card Hover */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '4px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="btn btn-primary btn-whimsy"
              style={{
                minHeight: '26px',
                height: '26px',
                padding: '0 8px',
                fontSize: '0.7rem',
                gap: '4px',
                borderRadius: '4px',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              <Play size={11} />
              <span>{isVideo ? 'Stream' : 'Play'}</span>
            </button>

            {!isVideo && (
              <button
                className={`btn btn-secondary btn-whimsy ${justQueued ? 'btn-accent' : ''}`}
                style={{
                  minHeight: '26px',
                  height: '26px',
                  padding: '0 8px',
                  fontSize: '0.7rem',
                  gap: '4px',
                  borderRadius: '4px',
                }}
                onClick={handleQueueClick}
                title="Add to Up Next queue"
              >
                {justQueued ? <Check size={11} /> : <Plus size={11} />}
                <span>{justQueued ? 'Queued' : 'Queue'}</span>
              </button>
            )}
          </div>

          <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isVideo ? 'Video' : 'Audio'}
          </span>
        </div>
      </div>
    </div>
  );
};
