import React, { useRef, useState, useEffect } from 'react';
import { MediaItem } from '../types/media';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  ListMusic,
  X,
} from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import { KeycapBadge } from './KeycapBadge';
import { cleanMediaTitle, formatFolderLabel } from '../utils/mediaFormatter';

interface AudioDockProps {
  currentTrack: MediaItem | null;
  queue: MediaItem[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectTrack: (track: MediaItem) => void;
  onRemoveFromQueue: (index: number) => void;
  onCloseDock: () => void;
  autoplayNext: boolean;
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const AudioDock: React.FC<AudioDockProps> = ({
  currentTrack,
  queue,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  onSelectTrack,
  onRemoveFromQueue,
  onCloseDock,
  autoplayNext,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isQueuePing, setIsQueuePing] = useState(false);
  const prevQueueLengthRef = useRef(queue.length);

  // Trigger whimsical bounce ping when queue expands
  useEffect(() => {
    if (queue.length > prevQueueLengthRef.current) {
      setIsQueuePing(true);
      const timer = setTimeout(() => setIsQueuePing(false), 600);
      prevQueueLengthRef.current = queue.length;
      return () => clearTimeout(timer);
    }
    prevQueueLengthRef.current = queue.length;
  }, [queue.length]);

  // Synchronize playing state with audio element
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      if (isPlaying) audioRef.current.play().catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleVolume = (val: number) => {
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !isMuted;
    audioRef.current.muted = next;
    setIsMuted(next);
  };

  const handleEnded = () => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } else if (autoplayNext) {
      onNext();
    } else {
      onTogglePlay();
    }
  };

  if (!currentTrack) return null;

  const token = typeof window !== 'undefined' ? (sessionStorage.getItem('redmoon_token') || localStorage.getItem('redmoon_token') || '') : '';
  const streamUrl = token ? `/api/stream?id=${currentTrack.id}&token=${encodeURIComponent(token)}` : `/api/stream?id=${currentTrack.id}`;

  return (
    <>
      <audio
        ref={audioRef}
        src={streamUrl}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Floating Queue Drawer */}
      {isQueueOpen && (
        <div
          className="chassis-panel animate-fade-in"
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '24px',
            width: '340px',
            maxHeight: '400px',
            zIndex: 9990,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-plate)',
          }}
        >
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--surface-inset)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ListMusic size={15} color="var(--accent-laser)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                Up Next ({queue.length})
              </span>
            </div>
            <button
              className="btn btn-secondary btn-icon"
              style={{ width: '26px', height: '26px' }}
              onClick={() => setIsQueueOpen(false)}
            >
              <X size={13} />
            </button>
          </div>

          <div style={{ padding: '0.4rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {queue.map((item, idx) => {
              const isCurrent = item.id === currentTrack.id;
              const { title: itemTitle, artist: itemArtist } = cleanMediaTitle(item.name || item.title);
              return (
                <div
                  key={`${item.id}-${idx}`}
                  onClick={() => onSelectTrack(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-xs)',
                    background: isCurrent ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.785rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <span style={{ color: isCurrent ? 'var(--accent-laser)' : 'var(--text-muted)', fontSize: '0.7rem', width: '16px', fontFamily: 'var(--font-mono)' }}>
                      {idx + 1}
                    </span>
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: isCurrent ? '#ffffff' : 'var(--text-secondary)',
                          fontWeight: isCurrent ? 600 : 400,
                        }}
                      >
                        {itemTitle}
                      </div>
                      {itemArtist && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {itemArtist}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary btn-icon"
                    style={{ width: '22px', height: '22px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromQueue(idx);
                    }}
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Bottom Broadcast Audio Deck */}
      <div
        className="chassis-panel"
        style={{
          position: 'fixed',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 24px)',
          maxWidth: '1280px',
          padding: '0.65rem 1.25rem',
          zIndex: 9900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          background: 'var(--surface-plate)',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Left: Track Information & Real FFT Visualizer */}
        {(() => {
          const currentClean = cleanMediaTitle(currentTrack.name || currentTrack.title);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: '240px', maxWidth: '340px' }}>
              {/* Authentic FFT Audio Spectrum Analyser */}
              <AudioVisualizer isPlaying={isPlaying} audioRef={audioRef} width={80} height={26} />

              <div style={{ overflow: 'hidden' }}>
                <h4
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#f8fafc',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.3',
                  }}
                >
                  {currentClean.title}
                </h4>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  {currentClean.artist ? `${currentClean.artist} • ` : ''}{formatFolderLabel(currentTrack.folder)}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Center: Playback Controls & Timeline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', maxWidth: '580px' }}>
          {/* Controls Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary btn-icon btn-whimsy"
              style={{ width: '30px', height: '30px', color: isShuffle ? 'var(--accent-laser)' : 'var(--text-muted)' }}
              onClick={() => setIsShuffle(!isShuffle)}
              title="Shuffle queue"
            >
              <Shuffle size={13} />
            </button>

            <button
              className="btn btn-secondary btn-icon btn-whimsy"
              style={{ width: '30px', height: '30px' }}
              onClick={onPrev}
              title="Previous Track"
            >
              <SkipBack size={15} />
            </button>

            <button
              className="btn btn-primary btn-icon btn-whimsy"
              style={{ width: '36px', height: '36px' }}
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
            </button>

            <button
              className="btn btn-secondary btn-icon btn-whimsy"
              style={{ width: '30px', height: '30px' }}
              onClick={onNext}
              title="Next Track"
            >
              <SkipForward size={15} />
            </button>

            <button
              className="btn btn-secondary btn-icon btn-whimsy"
              style={{ width: '30px', height: '30px', color: isRepeat ? 'var(--accent-laser)' : 'var(--text-muted)' }}
              onClick={() => setIsRepeat(!isRepeat)}
              title="Repeat Track"
            >
              <Repeat size={13} />
            </button>

            <div style={{ marginLeft: '6px' }}>
              <KeycapBadge keys={['Space']} />
            </div>
          </div>

          {/* Timeline Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%' }}>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', width: '34px' }}>
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
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', width: '34px' }}>
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Right: Volume & Queue Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: '200px', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-secondary btn-icon btn-whimsy"
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
            onChange={(e) => handleVolume(parseFloat(e.target.value))}
            style={{ width: '65px', height: '3px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
          />

          <button
            className={`btn btn-secondary btn-whimsy ${isQueuePing ? 'animate-queue-ping' : ''}`}
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            style={{
              minHeight: '30px',
              height: '30px',
              padding: '0 8px',
              fontSize: '0.725rem',
              background: isQueueOpen ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: isQueueOpen ? 'var(--accent-laser)' : 'var(--text-secondary)',
            }}
          >
            <ListMusic size={13} />
            <span>Queue</span>
          </button>

          <button
            className="btn btn-secondary btn-icon"
            onClick={onCloseDock}
            title="Dismiss Audio Deck"
            style={{ width: '26px', height: '26px' }}
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </>
  );
};
