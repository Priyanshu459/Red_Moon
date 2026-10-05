import React, { useRef, useState, useEffect } from 'react';
import { MediaItem } from '../types/media';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
  Film,
} from 'lucide-react';
import { KeycapBadge } from './KeycapBadge';
import { cleanMediaTitle, formatFolderLabel } from '../utils/mediaFormatter';

interface VideoModalProps {
  item: MediaItem | null;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    const remMins = mins % 60;
    return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const VideoModal: React.FC<VideoModalProps> = ({ item, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);

  const hideControlsTimer = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!item) return;

      const key = e.key.toLowerCase();

      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      } else if (e.key === ' ' || e.code === 'Space' || key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft' || key === 'j') {
        skip(-10);
      } else if (e.key === 'ArrowRight' || key === 'l') {
        skip(10);
      } else if (key === 'f') {
        toggleFullscreen();
      } else if (key === 'm') {
        toggleMute();
      } else if (key === '[') {
        handleSpeedDelta(-0.25);
      } else if (key === ']') {
        handleSpeedDelta(0.25);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, isPlaying, volume, isMuted, playbackSpeed]);

  const handleMouseMove = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = window.setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
    }, 2800);
  };

  if (!item) return null;

  const token = typeof window !== 'undefined' ? (sessionStorage.getItem('redmoon_token') || localStorage.getItem('redmoon_token') || '') : '';
  const streamUrl = token ? `/api/stream?id=${item.id}&token=${encodeURIComponent(token)}` : `/api/stream?id=${item.id}`;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const skip = (delta: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + delta));
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await videoRef.current.requestPictureInPicture();
    }
  };

  const handleSpeedChange = (spd: number) => {
    setPlaybackSpeed(spd);
    if (videoRef.current) {
      videoRef.current.playbackRate = spd;
    }
  };

  const handleSpeedDelta = (delta: number) => {
    const next = Math.max(0.5, Math.min(2.5, playbackSpeed + delta));
    handleSpeedChange(next);
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: '#090a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseMove={handleMouseMove}
    >
      {/* Top Header Bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, rgba(9,10,15,0.95) 0%, transparent 100%)',
          zIndex: 20,
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? 'auto' : 'none',
          transition: 'opacity var(--transition-normal)',
        }}
      >
        {(() => {
          const { title: cleanTitle, artist } = cleanMediaTitle(item.name || item.title);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Film size={20} color="var(--accent-laser)" />
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', lineHeight: '1.3' }}>
                  {cleanTitle}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {artist ? `${artist} • ` : ''}{formatFolderLabel(item.folder)} • {item.ext.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })()}

        <button
          className="btn btn-secondary btn-icon"
          onClick={onClose}
          style={{ width: '34px', height: '34px' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Video Element with HTTP Range 206 Streaming */}
      <video
        ref={videoRef}
        src={streamUrl}
        playsInline
        style={{
          width: '100%',
          height: '100%',
          maxHeight: '100vh',
          objectFit: 'contain',
          cursor: isPlaying ? 'none' : 'default',
        }}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Bottom Floating Control Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '1rem 1.75rem 1.25rem',
          background: 'linear-gradient(0deg, rgba(9,10,15,0.98) 0%, rgba(9,10,15,0.7) 60%, transparent 100%)',
          zIndex: 20,
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? 'auto' : 'none',
          transition: 'opacity var(--transition-normal)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        {/* Scrubbing timeline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              accentColor: 'var(--accent-laser)',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {formatDuration(duration)}
          </span>
        </div>

        {/* Buttons & Shuttle Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          {/* Left Controls: Shuttle, Play, Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              className="btn btn-primary btn-icon"
              onClick={togglePlay}
              style={{ width: '38px', height: '38px' }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
            </button>

            <button
              className="btn btn-secondary btn-icon"
              onClick={() => skip(-10)}
              title="Shuttle Rewind 10s (J / Left Arrow)"
              style={{ width: '32px', height: '32px' }}
            >
              <RotateCcw size={14} />
            </button>

            <button
              className="btn btn-secondary btn-icon"
              onClick={() => skip(10)}
              title="Shuttle Forward 10s (L / Right Arrow)"
              style={{ width: '32px', height: '32px' }}
            >
              <RotateCw size={14} />
            </button>

            <div style={{ marginLeft: '4px' }}>
              <KeycapBadge keys={['J', 'K', 'L']} label="Shuttle" />
            </div>

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-icon"
                onClick={toggleMute}
                style={{ width: '30px', height: '30px' }}
              >
                {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                style={{ width: '65px', height: '3px', accentColor: 'var(--accent-laser)', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Right Controls: Speed, PiP, Fullscreen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Speed Selector */}
            <div style={{ display: 'flex', gap: '2px' }}>
              {[0.75, 1, 1.25, 1.5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleSpeedChange(spd)}
                  style={{
                    background: playbackSpeed === spd ? '#1e293b' : 'transparent',
                    border: playbackSpeed === spd ? '1px solid var(--border-strong)' : '1px solid transparent',
                    color: playbackSpeed === spd ? 'var(--accent-laser)' : 'var(--text-muted)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '0.725rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <button
              className="btn btn-secondary btn-icon"
              onClick={togglePiP}
              title="Picture in Picture"
              style={{ width: '32px', height: '32px' }}
            >
              <PictureInPicture size={14} />
            </button>

            <button
              className="btn btn-secondary btn-icon"
              onClick={toggleFullscreen}
              title="Fullscreen (F)"
              style={{ width: '32px', height: '32px' }}
            >
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
