import React, { useState, useRef, useEffect } from 'react';
import { MediaItem } from '../types/media';
import { Play, Plus, Music, Check, Volume2, VolumeX, ThumbsUp, Sparkles } from 'lucide-react';
import { cleanMediaTitle, formatFolderLabel } from '../utils/mediaFormatter';
import { recommendationEngine } from '../services/recommendationEngine';

interface NetflixCardProps {
  item: MediaItem;
  isCurrentAudio: boolean;
  isPlayingAudio: boolean;
  matchScore?: number;
  onPlayVideo: (item: MediaItem) => void;
  onPlayAudio: (item: MediaItem) => void;
  onQueueAudio: (item: MediaItem) => void;
  onToggleMyList?: (item: MediaItem) => void;
  onToggleLike?: (item: MediaItem) => void;
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
  matchScore,
  onPlayVideo,
  onPlayAudio,
  onQueueAudio,
  onToggleMyList,
  onToggleLike,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [justQueued, setJustQueued] = useState(false);
  const [isInList, setIsInList] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);

  const dwellTimerRef = useRef<number | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const isVideo = item.type === 'video';
  const { title, artist, categoryTag } = cleanMediaTitle(item.name || item.title);
  const folderLabel = formatFolderLabel(item.folder);

  // Sync My List and Like state from recommendation engine
  useEffect(() => {
    setIsInList(recommendationEngine.isInMyList(item.id));
    setIsLiked(recommendationEngine.isLiked(item.id));

    const unsubscribe = recommendationEngine.subscribe(() => {
      setIsInList(recommendationEngine.isInMyList(item.id));
      setIsLiked(recommendationEngine.isLiked(item.id));
    });

    return unsubscribe;
  }, [item.id]);

  // Compute or fallback match score (Netflix-style 84% - 99%)
  const effectiveMatchScore =
    matchScore || recommendationEngine.calculateMatchScore(item, []);

  // Stream token for range preview playback
  const token =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('redmoon_token') || localStorage.getItem('redmoon_token') || ''
      : '';
  const streamUrl = token
    ? `/api/stream?id=${item.id}&quality=360p&token=${encodeURIComponent(token)}`
    : `/api/stream?id=${item.id}&quality=360p`;

  const handleMouseEnter = () => {
    setIsHovered(true);
    // 400ms intentional dwell threshold before activating video/audio preview
    dwellTimerRef.current = window.setTimeout(() => {
      setIsPreviewActive(true);
    }, 420);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPreviewActive(false);
    setPreviewProgress(0);

    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }

    if (videoPreviewRef.current) {
      videoPreviewRef.current.pause();
      videoPreviewRef.current.currentTime = 0;
    }
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
    }
  };

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

  const handleMyListClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recommendationEngine.toggleMyList(item.id);
    setIsInList(updated);
    if (onToggleMyList) onToggleMyList(item);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recommendationEngine.toggleLike(item.id);
    setIsLiked(updated);
    if (onToggleLike) onToggleLike(item);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoPreviewRef.current) videoPreviewRef.current.muted = nextMuted;
    if (audioPreviewRef.current) audioPreviewRef.current.muted = nextMuted;
  };

  // Video time update for mini scrubber bar
  const handleVideoTimeUpdate = () => {
    if (!videoPreviewRef.current) return;
    const { currentTime, duration } = videoPreviewRef.current;
    if (duration > 0) {
      setPreviewProgress((currentTime / duration) * 100);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (!videoPreviewRef.current) return;
    // Seek to 12% or 10s into the video for an engaging preview snippet
    const duration = videoPreviewRef.current.duration;
    if (duration > 20) {
      videoPreviewRef.current.currentTime = Math.min(25, duration * 0.12);
    }
    videoPreviewRef.current.play().catch(() => {
      // Browser autoplay policy catch
    });
  };

  return (
    <div
      className={`netflix-card ${isVideo ? 'netflix-card-video' : 'netflix-card-audio'} ${
        isPreviewActive ? 'is-preview-active' : ''
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
      style={{
        border:
          isCurrentAudio && isPlayingAudio
            ? '1px solid var(--accent-laser)'
            : isPreviewActive
            ? '1px solid rgba(255, 255, 255, 0.45)'
            : isHovered
            ? '1px solid rgba(255, 255, 255, 0.28)'
            : '1px solid var(--cinema-border)',
      }}
    >
      {/* Thumbnail / Preview Surface */}
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
        {/* Inline Netflix Video Preview Player */}
        {isVideo && isPreviewActive && (
          <>
            <video
              ref={videoPreviewRef}
              src={streamUrl}
              autoPlay
              playsInline
              muted={isMuted}
              loop
              className="netflix-preview-video"
              onTimeUpdate={handleVideoTimeUpdate}
              onLoadedMetadata={handleVideoLoadedMetadata}
            />
            {/* Scrubber Progress Line */}
            <div className="netflix-preview-scrubber">
              <div
                className="netflix-preview-scrubber-bar"
                style={{ width: `${Math.max(5, previewProgress)}%` }}
              />
            </div>
          </>
        )}

        {/* Audio Teaser Hidden Element (when preview is active) */}
        {!isVideo && isPreviewActive && (
          <audio
            ref={audioPreviewRef}
            src={streamUrl}
            autoPlay
            loop
            muted={isMuted}
            style={{ display: 'none' }}
          />
        )}

        {/* Subtle Specular Sheen */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isHovered
              ? 'radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.15), transparent 70%)'
              : 'transparent',
            pointerEvents: 'none',
            transition: 'background 0.3s ease',
            zIndex: 6,
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

        {/* Interactive Volume Mute/Unmute Toggle on Preview */}
        {isPreviewActive && (
          <button
            className="btn-preview-control"
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
            }}
            onClick={toggleMute}
            title={isMuted ? 'Unmute preview sound' : 'Mute preview sound'}
          >
            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
        )}

        {/* Center Artwork / Interactive Play Indicator / Audio Vinyl */}
        {(!isVideo || !isPreviewActive) && (
          <>
            {isCurrentAudio ? (
              <div
                className={`vinyl-disc ${isPlayingAudio ? '' : 'paused'}`}
                style={{
                  width: '54px',
                  height: '54px',
                  background:
                    'radial-gradient(circle, #090a0f 22%, #1e293b 24%, #0f172a 50%, #334155 52%, #0f172a 70%, #1e293b 72%, #0284c7 95%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #38bdf8',
                  zIndex: 8,
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
                  zIndex: 8,
                }}
              >
                {isVideo ? <Play size={20} style={{ marginLeft: '2px' }} /> : <Music size={18} />}
              </div>
            )}
          </>
        )}

        {/* Live Dancing Equalizer on Audio Preview */}
        {!isVideo && isPreviewActive && (
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              padding: '3px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              zIndex: 10,
            }}
          >
            <div className="netflix-audio-bars">
              <span className="netflix-audio-bar" />
              <span className="netflix-audio-bar" />
              <span className="netflix-audio-bar" />
              <span className="netflix-audio-bar" />
            </div>
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
            margin: 0,
          }}
        >
          {title}
        </h4>

        {/* Subtitle / Artist / Category */}
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

        {/* Netflix Recommendation Score & Match Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
          <span className="netflix-match-badge" title="Match rating calculated by Gemini Argon engine">
            <Sparkles size={11} />
            <span>{effectiveMatchScore}% Match</span>
          </span>

          <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isVideo ? 'Video' : 'Audio'}
          </span>
        </div>

        {/* Quick Action Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '4px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Play Button */}
            <button
              className="btn btn-primary btn-whimsy"
              style={{
                minHeight: '28px',
                height: '28px',
                padding: '0 9px',
                fontSize: '0.725rem',
                gap: '4px',
                borderRadius: '4px',
                background: 'var(--cinema-red)',
                borderColor: 'var(--cinema-red)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              <Play size={11} />
              <span>{isVideo ? 'Stream' : 'Play'}</span>
            </button>

            {/* My List Toggle Button */}
            <button
              className={`btn-preview-action ${isInList ? 'is-active' : ''}`}
              onClick={handleMyListClick}
              title={isInList ? 'Remove from My List' : 'Add to My List'}
            >
              {isInList ? <Check size={13} color="#ffffff" /> : <Plus size={13} />}
            </button>

            {/* Like Feedback Button */}
            <button
              className={`btn-preview-action ${isLiked ? 'is-active' : ''}`}
              onClick={handleLikeClick}
              title={isLiked ? 'Liked' : 'Like this title'}
            >
              <ThumbsUp size={12} color={isLiked ? '#ffffff' : '#cbd5e1'} />
            </button>

            {/* Audio Queue Button */}
            {!isVideo && (
              <button
                className={`btn btn-secondary btn-whimsy ${justQueued ? 'btn-accent' : ''}`}
                style={{
                  minHeight: '28px',
                  height: '28px',
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
        </div>
      </div>
    </div>
  );
};
