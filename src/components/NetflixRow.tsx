import React, { useRef, useState, useEffect } from 'react';
import { MediaItem } from '../types/media';
import { NetflixCard } from './NetflixCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NetflixRowProps {
  title: string;
  badge?: string;
  items: MediaItem[];
  currentAudioId: string | null;
  isPlayingAudio: boolean;
  onPlayVideo: (item: MediaItem) => void;
  onPlayAudio: (item: MediaItem) => void;
  onQueueAudio: (item: MediaItem) => void;
}

export const NetflixRow: React.FC<NetflixRowProps> = ({
  title,
  badge,
  items,
  currentAudioId,
  isPlayingAudio,
  onPlayVideo,
  onPlayAudio,
  onQueueAudio,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [items]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const offset = sliderRef.current.clientWidth * 0.78;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -offset : offset,
      behavior: 'smooth',
    });
    setTimeout(checkScroll, 350);
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="netflix-row">
      {/* Category Header */}
      <div className="netflix-row-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#f8fafc',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h3>
          {badge && (
            <span
              style={{
                fontSize: '0.725rem',
                color: 'var(--text-secondary)',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {badge}
            </span>
          )}
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Horizontal Rail Slider */}
      <div style={{ position: 'relative' }}>
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            className="netflix-arrow netflix-arrow-left"
            onClick={() => handleScroll('left')}
            aria-label="Scroll left"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {/* Card Track */}
        <div
          ref={sliderRef}
          className="netflix-row-slider no-scrollbar"
          onScroll={checkScroll}
        >
          {items.map((item) => (
            <NetflixCard
              key={item.id}
              item={item}
              isCurrentAudio={currentAudioId === item.id}
              isPlayingAudio={isPlayingAudio}
              onPlayVideo={onPlayVideo}
              onPlayAudio={onPlayAudio}
              onQueueAudio={onQueueAudio}
            />
          ))}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            className="netflix-arrow netflix-arrow-right"
            onClick={() => handleScroll('right')}
            aria-label="Scroll right"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>
  );
};
