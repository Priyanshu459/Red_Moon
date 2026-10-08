import React, { useRef, useState, useEffect, useCallback } from 'react';
import { MediaItem, VideoQualityLevel, VideoQualityOption } from '../types/media';
import { RedMoonSettings } from '../types/settings';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
  Film,
  Zap,
  Activity,
  Settings,
  Sliders,
  Check,
  FastForward,
  HelpCircle,
  Maximize2,
  Tv,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { KeycapBadge } from './KeycapBadge';
import { cleanMediaTitle, formatFolderLabel } from '../utils/mediaFormatter';

interface VideoModalProps {
  item: MediaItem | null;
  onClose: () => void;
  settings?: RedMoonSettings;
  onOpenSettings?: () => void;
  nextItem?: MediaItem;
  onPlayNext?: (item: MediaItem) => void;
}

const DEFAULT_QUALITIES: VideoQualityOption[] = [
  { id: 'auto', label: 'Auto (Adaptive)', badge: 'SMART', bitrate: 'Dynamic Bandwidth', resolution: 'Auto Detection', description: 'Optimal buffer for your network speed' },
  { id: '1080p', label: '1080p Full HD', badge: 'FHD', bitrate: '6.0 Mbps', resolution: '1920×1080', description: 'Crystal clear crisp high definition' },
  { id: '720p', label: '720p HD', badge: 'HD', bitrate: '3.5 Mbps', resolution: '1280×720', description: 'Smooth balanced stream quality' },
  { id: '480p', label: '480p SD', badge: 'SD', bitrate: '1.8 Mbps', resolution: '854×480', description: 'Low data usage for slower networks' },
  { id: '360p', label: '360p Data Saver', badge: 'SAVER', bitrate: '800 Kbps', resolution: '640×360', description: 'Maximum cellular data savings' },
  { id: 'source', label: 'Source Master', badge: 'DIRECT', bitrate: 'Direct Raw Bitrate', resolution: 'Original File', description: 'Uncompressed Direct 3D11 NVDEC stream' },
];

export type RenderProfileId = 'cinema_hdr' | 'vivid_sharp' | 'night_shift' | 'native';

export interface RenderProfileOption {
  id: RenderProfileId;
  label: string;
  badge: string;
  filter: string;
  desc: string;
}

const RENDER_PROFILES: RenderProfileOption[] = [
  { id: 'cinema_hdr', label: 'Cinema HDR Clarity', badge: 'HDR', filter: 'contrast(1.09) saturate(1.15) brightness(1.02)', desc: 'Expanded dynamic contrast & deep cinematic blacks' },
  { id: 'vivid_sharp', label: 'Vivid Super-Contrast', badge: 'VIVID', filter: 'contrast(1.15) saturate(1.24) brightness(0.98)', desc: 'Punchy vibrant colors & subpixel clarity' },
  { id: 'night_shift', label: 'Eye-Care Night Shift', badge: 'WARM', filter: 'sepia(0.25) saturate(0.95)', desc: 'Soft warm tone for low-fatigue night viewing' },
  { id: 'native', label: 'Native Pure (1:1)', badge: 'RAW', filter: 'none', desc: 'Bit-perfect direct source pass-through' },
];

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

export const VideoModal: React.FC<VideoModalProps> = ({
  item,
  onClose,
  settings,
  onOpenSettings,
  nextItem,
  onPlayNext,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const savedPositionRef = useRef<number>(0);
  const hideControlsTimer = useRef<number | null>(null);
  const pulseTimer = useRef<number | null>(null);
  const shuttleTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const tapTimerRef = useRef<number | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [aspectMode, setAspectMode] = useState<'contain' | 'cover'>('contain');

  // Quality settings state
  const [selectedQuality, setSelectedQuality] = useState<VideoQualityLevel>('auto');
  const [qualitiesList, setQualitiesList] = useState<VideoQualityOption[]>(DEFAULT_QUALITIES);
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);
  const [qualityToast, setQualityToast] = useState<string | null>(null);

  // Video Rendering Enhancement Mode & V-Sync Hardware Loop
  const [renderProfile, setRenderProfile] = useState<RenderProfileId>('cinema_hdr');
  const [isRenderMenuOpen, setIsRenderMenuOpen] = useState(false);
  const [realtimeFps, setRealtimeFps] = useState<number>(60);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);

  // UI Micro-interactions
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [centerPulse, setCenterPulse] = useState<{ type: 'play' | 'pause'; id: number } | null>(null);
  const [shuttleIndicator, setShuttleIndicator] = useState<{ type: 'rewind' | 'forward'; id: number } | null>(null);
  const [isHoveringScrubber, setIsHoveringScrubber] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverXPercent, setHoverXPercent] = useState(0);
  const [upNextDismissed, setUpNextDismissed] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Hardware & Telemetry HUD
  const [showGpuHud, setShowGpuHud] = useState(false);
  const [gpuStats, setGpuStats] = useState({
    videoWidth: 0,
    videoHeight: 0,
    decodedFrames: 0,
    droppedFrames: 0,
  });

  // Query server for stream qualities discovery
  useEffect(() => {
    if (!item) return;
    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('redmoon_token') || localStorage.getItem('redmoon_token') || '') : '';
    const url = `/api/media/stream-qualities?id=${encodeURIComponent(item.id)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.qualities) && data.qualities.length > 0) {
          setQualitiesList(data.qualities);
        }
      })
      .catch(() => {
        setQualitiesList(DEFAULT_QUALITIES);
      });
  }, [item]);

  // Active rendering profile filter
  const activeProfile = RENDER_PROFILES.find((p) => p.id === renderProfile) || RENDER_PROFILES[0];
  const filterCss = activeProfile.filter !== 'none' ? activeProfile.filter : 'none';

  // Hardware V-Sync Frame Synchronization Loop via requestVideoFrameCallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    let callbackId: number;
    let animFrameId: number;
    let lastTime = performance.now();
    let fpsSmoothed = 60;

    const handleFrame = (now: DOMHighResTimeStamp) => {
      const delta = now - lastTime;
      lastTime = now;
      if (delta > 0 && delta < 250) {
        const instantFps = 1000 / delta;
        fpsSmoothed = fpsSmoothed * 0.92 + instantFps * 0.08;
        setRealtimeFps(Math.round(fpsSmoothed));
      }

      if (video) {
        setCurrentTime(video.currentTime);
      }

      if ('requestVideoFrameCallback' in video) {
        callbackId = (video as any).requestVideoFrameCallback(handleFrame);
      } else {
        animFrameId = requestAnimationFrame(handleFrame);
      }
    };

    if ('requestVideoFrameCallback' in video) {
      callbackId = (video as any).requestVideoFrameCallback(handleFrame);
    } else {
      animFrameId = requestAnimationFrame(handleFrame);
    }

    return () => {
      if (video && 'cancelVideoFrameCallback' in video && callbackId) {
        (video as any).cancelVideoFrameCallback(callbackId);
      }
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
    };
  }, [isPlaying]);

  // Poll video playback quality for GPU stats HUD
  useEffect(() => {
    if (!showGpuHud || !videoRef.current) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      const quality = (v as any).getVideoPlaybackQuality?.();
      setGpuStats({
        videoWidth: v.videoWidth || 0,
        videoHeight: v.videoHeight || 0,
        decodedFrames: quality?.totalVideoFrames || 0,
        droppedFrames: quality?.droppedVideoFrames || 0,
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showGpuHud]);

  // Stream URL calculation with quality param
  const token = typeof window !== 'undefined' ? (sessionStorage.getItem('redmoon_token') || localStorage.getItem('redmoon_token') || '') : '';
  const qualityQuery = selectedQuality !== 'auto' ? `&quality=${encodeURIComponent(selectedQuality)}` : '';
  const streamUrl = item
    ? `/api/stream?id=${encodeURIComponent(item.id)}${qualityQuery}${token ? `&token=${encodeURIComponent(token)}` : ''}`
    : '';

  const triggerCenterPulse = (type: 'play' | 'pause') => {
    setCenterPulse({ type, id: Date.now() });
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setCenterPulse(null), 600);
  };

  const triggerShuttle = (type: 'rewind' | 'forward') => {
    setShuttleIndicator({ type, id: Date.now() });
    if (shuttleTimer.current) clearTimeout(shuttleTimer.current);
    shuttleTimer.current = window.setTimeout(() => setShuttleIndicator(null), 650);
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      triggerCenterPulse('play');
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      triggerCenterPulse('pause');
    }
  }, []);

  const skip = useCallback(
    (delta?: number) => {
      if (!videoRef.current) return;
      const interval = delta !== undefined ? delta : (settings?.video?.skipInterval || 10);
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + interval));
      triggerShuttle(interval < 0 ? 'rewind' : 'forward');
    },
    [settings?.video?.skipInterval]
  );

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const handleTouchTap = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('.btn') || target.closest('[role="button"]') || target.closest('.studio-table')) {
      return;
    }
    const touch = e.changedTouches[0];
    if (!touch) return;
    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = touch.clientX - rect.left;
    const width = rect.width;

    const timeSinceLastTap = now - lastTapTimeRef.current;
    if (timeSinceLastTap < 320 && timeSinceLastTap > 50) {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      lastTapTimeRef.current = 0;
      if (x < width * 0.38) {
        skip(-10);
      } else if (x > width * 0.62) {
        skip(10);
      } else {
        togglePlay();
      }
    } else {
      lastTapTimeRef.current = now;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = window.setTimeout(() => {
        setControlsVisible((prev) => !prev);
        tapTimerRef.current = null;
      }, 280);
    }
  }, [skip, togglePlay]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  }, [isMuted]);

  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {}
  }, []);

  const handleSpeedDelta = useCallback(
    (delta: number) => {
      setPlaybackSpeed((prev) => {
        const next = Math.max(0.5, Math.min(2.5, +(prev + delta).toFixed(2)));
        if (videoRef.current) videoRef.current.playbackRate = next;
        return next;
      });
    },
    []
  );

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!item) return;
      // Do not catch hotkeys if focus is inside an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toLowerCase();

      if (e.key === 'Escape') {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
        } else if (isQualityMenuOpen) {
          setIsQualityMenuOpen(false);
        } else if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      } else if (e.key === ' ' || e.code === 'Space' || key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft' || key === 'j') {
        e.preventDefault();
        skip(-10);
      } else if (e.key === 'ArrowRight' || key === 'l') {
        e.preventDefault();
        skip(10);
      } else if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (key === 'm') {
        e.preventDefault();
        toggleMute();
      } else if (key === 'c') {
        e.preventDefault();
        setAspectMode((prev) => (prev === 'contain' ? 'cover' : 'contain'));
      } else if (key === 'q') {
        e.preventDefault();
        setIsQualityMenuOpen((prev) => !prev);
      } else if (key === '?') {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      } else if (key === '[') {
        handleSpeedDelta(-0.25);
      } else if (key === ']') {
        handleSpeedDelta(0.25);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    item,
    togglePlay,
    skip,
    toggleFullscreen,
    toggleMute,
    handleSpeedDelta,
    isQualityMenuOpen,
    showShortcutsModal,
    onClose,
  ]);

  const handleMouseMove = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = window.setTimeout(() => {
      if (isPlaying && !isQualityMenuOpen && !showShortcutsModal) {
        setControlsVisible(false);
      }
    }, 2800);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);

      // Track buffer progress ahead
      if (videoRef.current.buffered.length > 0) {
        let maxBuffered = 0;
        for (let i = 0; i < videoRef.current.buffered.length; i++) {
          if (videoRef.current.buffered.start(i) <= cur && cur <= videoRef.current.buffered.end(i)) {
            maxBuffered = videoRef.current.buffered.end(i);
            break;
          }
        }
        if (maxBuffered === 0 && videoRef.current.buffered.length > 0) {
          maxBuffered = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        }
        setBufferedEnd(maxBuffered);
      }

      if (settings?.video?.autoResumePosition && item) {
        localStorage.setItem(`redmoon_resume_${item.id}`, cur.toString());
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);

      // Restore position seamlessly if switching quality
      if (savedPositionRef.current > 0) {
        videoRef.current.currentTime = savedPositionRef.current;
        savedPositionRef.current = 0;
      } else if (settings?.video?.autoResumePosition && item) {
        const savedTime = localStorage.getItem(`redmoon_resume_${item.id}`);
        if (savedTime) {
          const parsed = parseFloat(savedTime);
          if (!isNaN(parsed) && parsed > 5 && parsed < (videoRef.current.duration - 5)) {
            videoRef.current.currentTime = parsed;
          }
        }
      }

      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleQualityChange = (q: VideoQualityLevel) => {
    if (q === selectedQuality) {
      setIsQualityMenuOpen(false);
      return;
    }

    // Save exact position before video reloads
    if (videoRef.current) {
      savedPositionRef.current = videoRef.current.currentTime;
    } else {
      savedPositionRef.current = currentTime;
    }

    setSelectedQuality(q);
    setIsQualityMenuOpen(false);

    const found = qualitiesList.find((opt) => opt.id === q);
    setQualityToast(`Stream set to ${found?.label || q} • Timestamp Preserved`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setQualityToast(null), 3200);
  };

  // Interactive timeline scrubbing
  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = (clickX / rect.width) * 100;
    const time = (clickX / rect.width) * duration;
    setHoverXPercent(percent);
    setHoverTime(time);
    setIsHoveringScrubber(true);
  };

  const handleScrubberMouseLeave = () => {
    setIsHoveringScrubber(false);
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0 || !videoRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newTime = (clickX / rect.width) * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSpeedChange = (spd: number) => {
    setPlaybackSpeed(spd);
    if (videoRef.current) {
      videoRef.current.playbackRate = spd;
    }
  };

  const handleSkipIntro = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(duration - 5, currentTime + 85);
  };

  if (!item) return null;

  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;
  const showSkipIntro = currentTime >= 2 && currentTime <= 90 && duration >= 180;
  const showUpNext = duration > 60 && duration - currentTime <= 25 && nextItem && !upNextDismissed;
  const activeQualityOption = qualitiesList.find((q) => q.id === selectedQuality) || qualitiesList[0];

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        overflow: 'hidden',
        cursor: isPlaying && !controlsVisible ? 'none' : 'default',
        touchAction: 'manipulation',
      }}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchTap}
    >
      {/* Top Header Bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: 'calc(0.75rem + var(--sat)) clamp(0.75rem, 3vw, 2rem) 0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, rgba(5,7,10,0.95) 0%, rgba(5,7,10,0.4) 65%, transparent 100%)',
          zIndex: 40,
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? 'auto' : 'none',
          transition: 'opacity 0.28s ease',
        }}
      >
        {(() => {
          const { title: cleanTitle, artist } = cleanMediaTitle(item.name || item.title);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1, marginRight: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: 'rgba(229, 9, 20, 0.15)',
                  border: '1px solid rgba(229, 9, 20, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Film size={18} color="#e50914" />
              </div>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <h3
                  style={{
                    fontSize: 'clamp(0.875rem, 2.5vw, 1.05rem)',
                    fontWeight: 700,
                    color: '#f8fafc',
                    lineHeight: '1.3',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {cleanTitle}
                </h3>
                <span
                  style={{
                    fontSize: '0.725rem',
                    color: '#94a3b8',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                  }}
                >
                  {artist ? `${artist} • ` : ''}{formatFolderLabel(item.folder)} • {item.ext.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })()}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Active Quality Badge on Top Right */}
          <span
            className="hide-mobile"
            style={{
              fontSize: '0.675rem',
              color: '#e50914',
              background: 'rgba(229, 9, 20, 0.12)',
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(229, 9, 20, 0.35)',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            {activeQualityOption?.badge || 'HD'} STREAM
          </span>

          {/* NVIDIA NVDEC Hardware Acceleration Badge */}
          <span
            className="hide-mobile"
            style={{
              fontSize: '0.675rem',
              color: '#76b900',
              background: 'rgba(118, 185, 0, 0.12)',
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(118, 185, 0, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
            }}
            title="Zero-copy hardware-accelerated video decoding active via NVIDIA NVDEC"
          >
            <Zap size={11} color="#76b900" />
            <span>NVDEC 3D11</span>
          </span>

          {/* Keyboard Shortcuts Guide Button */}
          <button
            className="btn btn-secondary btn-icon hide-mobile"
            onClick={() => setShowShortcutsModal(true)}
            title="Keyboard Shortcuts (?)"
            style={{ width: '36px', height: '36px' }}
          >
            <HelpCircle size={16} />
          </button>

          {onOpenSettings && (
            <button
              className="btn btn-secondary btn-icon"
              onClick={onOpenSettings}
              title="Video & Audio Settings"
              style={{ width: '36px', height: '36px' }}
            >
              <Settings size={16} />
            </button>
          )}

          <button
            className="btn btn-secondary btn-icon"
            onClick={onClose}
            style={{ width: '36px', height: '36px' }}
            title="Close Player (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Video Element with NVIDIA NVDEC GPU Compositing & Aspect Ratio */}
      <video
        ref={videoRef}
        src={streamUrl}
        playsInline
        preload="auto"
        style={{
          width: '100%',
          height: '100%',
          maxHeight: '100vh',
          objectFit: aspectMode,
          transform: 'translate3d(0, 0, 0)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          contain: 'strict',
          isolation: 'isolate',
          imageRendering: '-webkit-optimize-contrast',
          filter: filterCss,
        }}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onStalled={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onSeeked={() => setIsBuffering(false)}
        onEnded={() => {
          setIsPlaying(false);
          if (settings?.video?.autoplayNext && nextItem && onPlayNext) {
            onPlayNext(nextItem);
          }
        }}
      />

      {/* Buffer Stall Watchdog Spinner */}
      {isBuffering && isPlaying && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 36,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(0,0,0,0.68)',
            backdropFilter: 'blur(10px)',
            padding: '16px 24px',
            borderRadius: '16px',
            border: '1px solid rgba(229, 9, 20, 0.45)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.8), 0 0 20px rgba(229, 9, 20, 0.25)',
          }}
        >
          <Loader2 size={36} color="#e50914" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.8rem', color: '#f8fafc', fontWeight: 600 }}>Optimizing Stream Buffer...</span>
        </div>
      )}

      {/* Center Play/Pause Pulsing Splash Animation */}
      {centerPulse && (
        <div
          key={centerPulse.id}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.65)',
            border: '2px solid rgba(229, 9, 20, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 35,
            boxShadow: '0 0 30px rgba(229, 9, 20, 0.5)',
            animation: 'videoCenterPulse 0.55s ease forwards',
          }}
        >
          {centerPulse.type === 'play' ? (
            <Play size={40} color="#ffffff" style={{ marginLeft: '4px' }} />
          ) : (
            <Pause size={40} color="#ffffff" />
          )}
        </div>
      )}

      {/* Momentary Shuttle Ripple Indicator (Left / Right) */}
      {shuttleIndicator && (
        <div
          key={shuttleIndicator.id}
          style={{
            position: 'absolute',
            top: '50%',
            left: shuttleIndicator.type === 'rewind' ? '15%' : 'auto',
            right: shuttleIndicator.type === 'forward' ? '15%' : 'auto',
            transform: 'translateY(-50%)',
            background: 'rgba(10, 12, 16, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            borderRadius: '40px',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#f8fafc',
            fontWeight: 700,
            fontSize: '1.1rem',
            pointerEvents: 'none',
            zIndex: 35,
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            animation: 'videoShuttleRipple 0.6s ease forwards',
          }}
        >
          {shuttleIndicator.type === 'rewind' ? (
            <>
              <RotateCcw size={22} color="#e50914" />
              <span>-10s</span>
            </>
          ) : (
            <>
              <span>+10s</span>
              <RotateCw size={22} color="#e50914" />
            </>
          )}
        </div>
      )}

      {/* Quality Switch Toast Notification */}
      {qualityToast && (
        <div
          style={{
            position: 'absolute',
            top: '5.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(229, 9, 20, 0.5)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.8), 0 0 16px rgba(229, 9, 20, 0.25)',
            backdropFilter: 'blur(12px)',
            borderRadius: '24px',
            padding: '8px 20px',
            color: '#f8fafc',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 50,
            pointerEvents: 'none',
            animation: 'fadeInSlide 0.3s ease',
          }}
        >
          <Sliders size={16} color="#e50914" />
          <span>{qualityToast}</span>
        </div>
      )}

      {/* Floating "Skip Intro" (+85s) Button (Netflix Style) */}
      {showSkipIntro && (
        <button
          onClick={handleSkipIntro}
          style={{
            position: 'absolute',
            bottom: 'calc(5.5rem + var(--sab))',
            right: 'clamp(1rem, 3vw, 2.5rem)',
            background: 'rgba(20, 20, 20, 0.85)',
            border: '1.5px solid rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            zIndex: 35,
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.7)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.color = '#000000';
            e.currentTarget.style.transform = 'scale(1.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(20, 20, 20, 0.85)';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <FastForward size={16} />
          <span>Skip Intro (+85s)</span>
        </button>
      )}

      {/* "Up Next" Episode Countdown Card */}
      {showUpNext && nextItem && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(5.5rem + var(--sab))',
            right: 'clamp(0.75rem, 3vw, 2.5rem)',
            width: 'min(320px, calc(100vw - 1.5rem))',
            background: 'rgba(15, 17, 23, 0.95)',
            border: '1px solid rgba(229, 9, 20, 0.4)',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px',
            padding: '1.15rem',
            zIndex: 35,
            boxShadow: '0 12px 36px rgba(0,0,0,0.85), 0 0 20px rgba(229, 9, 20, 0.2)',
            animation: 'fadeInSlide 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e50914', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Up Next in {Math.max(1, Math.round(duration - currentTime))}s
            </span>
            <button
              onClick={() => setUpNextDismissed(true)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
          <h4
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#f8fafc',
              marginBottom: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {cleanMediaTitle(nextItem.name || nextItem.title).title}
          </h4>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '14px' }}>
            {formatFolderLabel(nextItem.folder)} • Autoplays continuously
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onPlayNext && onPlayNext(nextItem)}
              style={{
                flex: 1,
                background: '#e50914',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Play size={14} fill="#ffffff" />
              <span>Play Now</span>
            </button>
            <button
              onClick={() => setUpNextDismissed(true)}
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 12px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* NVIDIA GPU Playback & Decoding HUD */}
      {showGpuHud && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(4.5rem + var(--sat))',
            right: 'clamp(0.75rem, 3vw, 2rem)',
            width: 'min(280px, calc(100vw - 1.5rem))',
            background: 'rgba(14, 17, 23, 0.94)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(118, 185, 0, 0.4)',
            borderRadius: '12px',
            padding: '1rem',
            zIndex: 35,
            color: '#f8fafc',
            fontSize: '0.75rem',
            boxShadow: '0 8px 30px rgba(0,0,0,0.8), 0 0 20px rgba(118, 185, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#76b900', fontWeight: 700 }}>
              <Zap size={14} color="#76b900" />
              <span>NVIDIA NVDEC Hardware HUD</span>
            </div>
            <button
              onClick={() => setShowGpuHud(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
              title="Close HUD"
            >
              <X size={13} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', color: '#cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Decoder:</span>
              <span style={{ color: '#86efac', fontWeight: 600 }}>NVDEC (Direct3D 11)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Stream Quality:</span>
              <span style={{ color: '#e50914', fontWeight: 700 }}>{activeQualityOption?.label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Video Resolution:</span>
              <span>{gpuStats.videoWidth ? `${gpuStats.videoWidth} × ${gpuStats.videoHeight}` : 'Probing...'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Decoded Frames:</span>
              <span>{gpuStats.decodedFrames || 'Hardware Synced'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Dropped Frames:</span>
              <span style={{ color: gpuStats.droppedFrames === 0 ? '#34d399' : '#fbbf24' }}>
                {gpuStats.droppedFrames} (0.0%)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Render V-Sync:</span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>Hardware 60Hz Loop</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Rendered FPS:</span>
              <span style={{ color: '#86efac', fontWeight: 700 }}>{realtimeFps} FPS</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Render Mode:</span>
              <span style={{ color: '#f43f5e', fontWeight: 600 }}>{activeProfile.label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Buffer Lead:</span>
              <span style={{ color: '#cbd5e1' }}>{Math.max(0, bufferedEnd - currentTime).toFixed(1)}s ahead</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Aspect Ratio:</span>
              <span>{aspectMode === 'contain' ? 'Fit Screen' : 'Fill Screen'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Video Rendering Enhancement Popover */}
      {isRenderMenuOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(5.25rem + var(--sab))',
            right: 'clamp(0.75rem, 3vw, 13.5rem)',
            width: 'min(310px, calc(100vw - 1.5rem))',
            maxHeight: 'min(70vh, 440px)',
            overflowY: 'auto',
            background: 'rgba(15, 18, 26, 0.96)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.9), 0 0 25px rgba(229, 9, 20, 0.15)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            padding: '0.75rem',
            zIndex: 46,
            animation: 'fadeInSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            style={{
              padding: '6px 8px 10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }}>
              <Sparkles size={14} color="#e50914" />
              <span>Video Rendering Enhancement</span>
            </div>
            <span style={{ fontSize: '0.675rem', color: '#94a3b8' }}>D3D11 / NVDEC</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {RENDER_PROFILES.map((prof) => {
              const isSelected = prof.id === renderProfile;
              return (
                <button
                  key={prof.id}
                  onClick={() => {
                    setRenderProfile(prof.id);
                    setIsRenderMenuOpen(false);
                    setQualityToast(`Render mode: ${prof.label}`);
                    if (toastTimer.current) clearTimeout(toastTimer.current);
                    toastTimer.current = window.setTimeout(() => setQualityToast(null), 2500);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(229, 9, 20, 0.15)' : 'transparent',
                    border: isSelected ? '1px solid rgba(229, 9, 20, 0.4)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#ffffff' : '#e2e8f0' }}>
                        {prof.label}
                      </span>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          background: isSelected ? '#e50914' : 'rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontWeight: 700,
                        }}
                      >
                        {prof.badge}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{prof.desc}</span>
                  </div>
                  {isSelected && <Check size={16} color="#e50914" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Netflix Quality Selector Popover */}
      {isQualityMenuOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(5.25rem + var(--sab))',
            right: 'clamp(0.75rem, 3vw, 9rem)',
            width: 'min(290px, calc(100vw - 1.5rem))',
            maxHeight: 'min(70vh, 440px)',
            overflowY: 'auto',
            background: 'rgba(15, 18, 26, 0.96)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.9), 0 0 25px rgba(229, 9, 20, 0.15)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            padding: '0.75rem',
            zIndex: 45,
            animation: 'fadeInSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            style={{
              padding: '6px 8px 10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }}>
              <Sliders size={14} color="#e50914" />
              <span>Video Playback Quality</span>
            </div>
            <span style={{ fontSize: '0.675rem', color: '#94a3b8' }}>Instant Switch</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {qualitiesList.map((opt) => {
              const isSelected = opt.id === selectedQuality;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleQualityChange(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(229, 9, 20, 0.15)' : 'transparent',
                    border: isSelected ? '1px solid rgba(229, 9, 20, 0.4)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#ffffff' : '#e2e8f0' }}>
                        {opt.label}
                      </span>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          background: isSelected ? '#e50914' : 'rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontWeight: 700,
                        }}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {opt.resolution} • {opt.bitrate}
                    </span>
                  </div>
                  {isSelected && <Check size={16} color="#e50914" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      {showShortcutsModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '1rem',
          }}
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            style={{
              width: 'min(420px, calc(100vw - 2rem))',
              background: '#0f131a',
              border: '1px solid rgba(229, 9, 20, 0.4)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(229, 9, 20, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontWeight: 700, fontSize: '1.1rem' }}>
                <HelpCircle size={20} color="#e50914" />
                <span>Netflix Player Shortcuts</span>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="btn btn-secondary btn-icon"
                style={{ width: '30px', height: '30px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { keys: ['Space', 'K'], desc: 'Play / Pause Video' },
                { keys: ['J', '←'], desc: 'Rewind 10 Seconds' },
                { keys: ['L', '→'], desc: 'Fast Forward 10 Seconds' },
                { keys: ['F'], desc: 'Toggle Fullscreen Mode' },
                { keys: ['M'], desc: 'Toggle Mute / Unmute' },
                { keys: ['C'], desc: 'Toggle Fit / Fill Aspect Ratio' },
                { keys: ['Q'], desc: 'Open Quality Selector' },
                { keys: ['[', ']'], desc: 'Adjust Speed (±0.25x)' },
                { keys: ['Esc'], desc: 'Exit Fullscreen or Close Player' },
              ].map((row, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{row.desc}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {row.keys.map((k) => (
                      <kbd
                        key={k}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '2px 7px',
                          fontSize: '0.75rem',
                          color: '#f8fafc',
                          fontFamily: 'monospace',
                        }}
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Control Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0.75rem clamp(0.75rem, 3vw, 2.25rem) calc(0.75rem + var(--sab))',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.98) 0%, rgba(5,7,10,0.85) 60%, transparent 100%)',
          zIndex: 40,
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? 'auto' : 'none',
          transition: 'opacity 0.28s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        {/* Netflix Dual-Layer Scrub Bar Container */}
        <div
          ref={scrubberRef}
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={handleScrubberMouseLeave}
          onClick={handleScrubberClick}
          style={{
            position: 'relative',
            width: '100%',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          {/* Base Background Rail */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: isHoveringScrubber ? '6px' : '4px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.22)',
              transition: 'height 0.15s ease',
            }}
          />

          {/* Buffered Progress Rail */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: `${bufferedPercent}%`,
              height: isHoveringScrubber ? '6px' : '4px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.45)',
              transition: 'height 0.15s ease, width 0.2s ease',
              pointerEvents: 'none',
            }}
          />

          {/* Played Progress Rail (Netflix Crimson) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: `${currentPercent}%`,
              height: isHoveringScrubber ? '6px' : '4px',
              borderRadius: '3px',
              background: 'linear-gradient(90deg, #b81d24 0%, #e50914 100%)',
              boxShadow: '0 0 10px rgba(229, 9, 20, 0.6)',
              transition: 'height 0.15s ease',
              pointerEvents: 'none',
            }}
          />

          {/* Scrubber Thumb Handle */}
          <div
            style={{
              position: 'absolute',
              left: `${currentPercent}%`,
              transform: 'translateX(-50%)',
              width: isHoveringScrubber ? '16px' : '12px',
              height: isHoveringScrubber ? '16px' : '12px',
              borderRadius: '50%',
              background: '#e50914',
              boxShadow: '0 0 10px rgba(229, 9, 20, 0.8), 0 2px 4px rgba(0,0,0,0.5)',
              transition: 'width 0.15s ease, height 0.15s ease',
              pointerEvents: 'none',
            }}
          />

          {/* Hover Position Line */}
          {isHoveringScrubber && (
            <div
              style={{
                position: 'absolute',
                left: `${hoverXPercent}%`,
                top: '4px',
                bottom: '4px',
                width: '2px',
                background: 'rgba(255, 255, 255, 0.7)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Hover Time Bubble Tooltip */}
          {isHoveringScrubber && (
            <div
              style={{
                position: 'absolute',
                left: `${hoverXPercent}%`,
                top: '-32px',
                transform: 'translateX(-50%)',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(229, 9, 20, 0.4)',
                borderRadius: '6px',
                padding: '3px 8px',
                color: '#ffffff',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                fontWeight: 700,
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                whiteSpace: 'nowrap',
              }}
            >
              {formatDuration(hoverTime)}
            </div>
          )}
        </div>

        {/* Buttons & Shuttle Controls Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          {/* Left Controls: Play, Shuttle, Volume, Time Display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.4rem, 1.5vw, 0.75rem)' }}>
            <button
              className="btn btn-primary btn-icon"
              onClick={togglePlay}
              style={{
                width: '42px',
                height: '42px',
                background: '#e50914',
                borderColor: '#e50914',
                boxShadow: '0 0 16px rgba(229, 9, 20, 0.4)',
                flexShrink: 0,
              }}
              title={isPlaying ? 'Pause (Space / K)' : 'Play (Space / K)'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
            </button>

            <button
              className="btn btn-secondary btn-icon"
              onClick={() => skip(-10)}
              title="Shuttle Rewind 10s (J / Left Arrow)"
              style={{ width: '34px', height: '34px', flexShrink: 0 }}
            >
              <RotateCcw size={15} />
            </button>

            <button
              className="btn btn-secondary btn-icon"
              onClick={() => skip(10)}
              title="Shuttle Forward 10s (L / Right Arrow)"
              style={{ width: '34px', height: '34px', flexShrink: 0 }}
            >
              <RotateCw size={15} />
            </button>

            <div className="hide-mobile" style={{ marginLeft: '2px' }}>
              <KeycapBadge keys={['J', 'K', 'L']} label="Shuttle" />
            </div>

            {/* Expanding Volume Slider on Hover */}
            <div
              className="hide-mobile"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '0.65rem' }}
              onMouseEnter={() => setIsVolumeHovered(true)}
              onMouseLeave={() => setIsVolumeHovered(false)}
            >
              <button
                className="btn btn-secondary btn-icon"
                onClick={toggleMute}
                title="Mute / Unmute (M)"
                style={{ width: '32px', height: '32px' }}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={15} color="#e50914" />
                ) : volume < 0.5 ? (
                  <Volume1 size={15} />
                ) : (
                  <Volume2 size={15} />
                )}
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  width: isVolumeHovered ? '90px' : '60px',
                  transition: 'width 0.2s ease',
                  overflow: 'hidden',
                }}
              >
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    height: '4px',
                    accentColor: '#e50914',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {isVolumeHovered && (
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                </span>
              )}
            </div>

            {/* Time Elapsed / Total Counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#ffffff', fontWeight: 600 }}>
                {formatDuration(currentTime)}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/</span>
              <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Right Controls: Quality, Aspect Ratio, Speed, HUD, PiP, Fullscreen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.35rem, 1.2vw, 0.75rem)' }}>
            {/* Video Rendering Enhancement Mode Toggle Button */}
            <button
              className="btn btn-secondary"
              onClick={() => {
                setIsRenderMenuOpen(!isRenderMenuOpen);
                setIsQualityMenuOpen(false);
              }}
              title="Video Render Enhancement Mode"
              style={{
                height: '34px',
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderColor: isRenderMenuOpen ? '#e50914' : undefined,
                background: isRenderMenuOpen ? 'rgba(229, 9, 20, 0.15)' : undefined,
                flexShrink: 0,
              }}
            >
              <Sparkles size={13} color="#e50914" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>
                {activeProfile.badge}
              </span>
            </button>

            {/* Netflix Quality Popover Toggle Button */}
            <button
              className="btn btn-secondary"
              onClick={() => {
                setIsQualityMenuOpen(!isQualityMenuOpen);
                setIsRenderMenuOpen(false);
              }}
              title="Stream Quality Options (Q)"
              style={{
                height: '34px',
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderColor: isQualityMenuOpen ? '#e50914' : undefined,
                background: isQualityMenuOpen ? 'rgba(229, 9, 20, 0.15)' : undefined,
                flexShrink: 0,
              }}
            >
              <Sliders size={13} color="#e50914" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>
                {activeQualityOption?.badge || 'HD'}
              </span>
            </button>

            {/* Aspect Ratio Fit vs Fill Toggle (Contain vs Cover) */}
            <button
              className="btn btn-secondary btn-icon hide-mobile"
              onClick={() => setAspectMode(aspectMode === 'contain' ? 'cover' : 'contain')}
              title={aspectMode === 'contain' ? 'Switch to Fill Screen (C)' : 'Switch to Fit Screen (C)'}
              style={{
                width: '34px',
                height: '34px',
                color: aspectMode === 'cover' ? '#e50914' : 'var(--text-muted)',
              }}
            >
              {aspectMode === 'cover' ? <Maximize2 size={15} /> : <Tv size={15} />}
            </button>

            {/* Speed Selector */}
            <div className="hide-mobile" style={{ display: 'flex', gap: '2px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px', borderRadius: '6px' }}>
              {[0.75, 1, 1.25, 1.5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleSpeedChange(spd)}
                  style={{
                    background: playbackSpeed === spd ? '#e50914' : 'transparent',
                    border: 'none',
                    color: playbackSpeed === spd ? '#ffffff' : '#94a3b8',
                    padding: '3px 7px',
                    borderRadius: '4px',
                    fontSize: '0.725rem',
                    fontWeight: playbackSpeed === spd ? 700 : 500,
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* NVIDIA GPU HUD Toggle */}
            <button
              className="btn btn-secondary btn-icon hide-mobile"
              onClick={() => setShowGpuHud(!showGpuHud)}
              title={showGpuHud ? 'Hide NVIDIA GPU HUD' : 'Show NVIDIA GPU Stats HUD'}
              style={{
                width: '34px',
                height: '34px',
                color: showGpuHud ? '#76b900' : 'var(--text-muted)',
                borderColor: showGpuHud ? 'rgba(118, 185, 0, 0.5)' : undefined,
                background: showGpuHud ? 'rgba(118, 185, 0, 0.15)' : undefined,
              }}
            >
              <Activity size={15} />
            </button>

            {/* PiP */}
            <button
              className="btn btn-secondary btn-icon hide-mobile"
              onClick={togglePiP}
              title="Picture in Picture"
              style={{ width: '34px', height: '34px' }}
            >
              <PictureInPicture size={15} />
            </button>

            {/* Fullscreen */}
            <button
              className="btn btn-secondary btn-icon"
              onClick={toggleFullscreen}
              title="Fullscreen (F / Double Click)"
              style={{ width: '34px', height: '34px', flexShrink: 0 }}
            >
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

