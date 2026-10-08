import React, { useMemo, useState, useEffect } from 'react';
import { MediaItem, RecommendationMatch } from '../types/media';
import { StudioTableView } from './StudioTableView';
import { NetflixBillboard } from './NetflixBillboard';
import { NetflixRow } from './NetflixRow';
import { NetflixCard } from './NetflixCard';
import { KeycapBadge } from './KeycapBadge';
import { Bookmark, ShieldCheck, FolderOpen, Sliders, Zap, Palette, Film, Music, ChevronRight, Settings } from 'lucide-react';
import { formatFolderLabel, cleanMediaTitle } from '../utils/mediaFormatter';
import { recommendationEngine } from '../services/recommendationEngine';
import { RedMoonSettings, THEME_PRESETS, EQUALIZER_PRESETS } from '../types/settings';
import { audioEngine } from '../services/audioEngine';

export type NavTab = 'home' | 'video' | 'audio' | 'queue' | 'mylist' | 'settings';
export type ViewMode = 'rails' | 'grid' | 'table';

interface MediaLibraryProps {
  items: MediaItem[];
  queue: MediaItem[];
  searchQuery: string;
  activeNavTab: NavTab;
  viewMode: ViewMode;
  currentAudioId: string | null;
  isPlayingAudio: boolean;
  onPlayVideo: (item: MediaItem) => void;
  onPlayAudio: (item: MediaItem) => void;
  onQueueAudio: (item: MediaItem) => void;
  onOpenFolderModal: () => void;
  settings?: RedMoonSettings;
  onSaveSettings?: (newSettings: RedMoonSettings) => void;
  onNavTabChange?: (tab: NavTab) => void;
  onTriggerToast?: (msg: string, icon?: 'sparkles' | 'music' | 'check', badge?: string) => void;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  items,
  queue,
  searchQuery,
  activeNavTab,
  viewMode,
  currentAudioId,
  isPlayingAudio,
  onPlayVideo,
  onPlayAudio,
  onQueueAudio,
  onOpenFolderModal,
  settings,
  onSaveSettings,
  onNavTabChange,
  onTriggerToast,
}) => {
  // Recommendation Engine State Revision
  const [engineRevision, setEngineRevision] = useState(0);

  useEffect(() => {
    const unsubscribe = recommendationEngine.subscribe(() => {
      setEngineRevision((rev) => rev + 1);
    });
    return unsubscribe;
  }, []);

  // Compute recommendation sets
  const recommendationData = useMemo(() => {
    return recommendationEngine.getRecommendations(items);
  }, [items, engineRevision]);

  const topPickItems = useMemo(() => {
    return recommendationData.topPicks.map((p: RecommendationMatch) => p.item);
  }, [recommendationData]);

  const topPickScores = useMemo(() => {
    const scores: Record<string, number> = {};
    recommendationData.topPicks.forEach((p: RecommendationMatch) => {
      scores[p.item.id] = p.matchScore;
    });
    return scores;
  }, [recommendationData]);

  const becauseWatched = recommendationData.becauseYouWatched;

  const becauseWatchedScores = useMemo(() => {
    if (!becauseWatched) return {};
    const scores: Record<string, number> = {};
    becauseWatched.recommendations.forEach((r: RecommendationMatch) => {
      scores[r.item.id] = r.matchScore;
    });
    return scores;
  }, [becauseWatched]);

  const myListItems = useMemo(() => {
    return recommendationEngine.getMyList(items);
  }, [items, engineRevision]);

  // Filter items based on activeNavTab
  const navFiltered = useMemo(() => {
    if (activeNavTab === 'video') return items.filter((i) => i.type === 'video');
    if (activeNavTab === 'audio') return items.filter((i) => i.type === 'audio');
    if (activeNavTab === 'queue') return queue;
    if (activeNavTab === 'mylist') return myListItems;
    return items;
  }, [items, queue, activeNavTab, myListItems]);

  // Apply search query filter
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return navFiltered;
    const q = searchQuery.toLowerCase();
    return navFiltered.filter((item) =>
      item.name.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.folder.toLowerCase().includes(q)
    );
  }, [navFiltered, searchQuery]);

  // Split into categorical slices for Netflix Rows
  const videoItems = useMemo(() => items.filter((i) => i.type === 'video'), [items]);
  const audioItems = useMemo(() => items.filter((i) => i.type === 'audio'), [items]);

  // Group by folders
  const folderGroups = useMemo(() => {
    const map = new Map<string, MediaItem[]>();
    for (const item of items) {
      const arr = map.get(item.folder) || [];
      arr.push(item);
      map.set(item.folder, arr);
    }
    return Array.from(map.entries());
  }, [items]);

  // Select spotlight featured item (prioritize top recommendation, then video, then first)
  const featuredItem = useMemo(() => {
    if (topPickItems.length > 0) return topPickItems[0];
    if (videoItems.length > 0) return videoItems[0];
    if (items.length > 0) return items[0];
    return null;
  }, [topPickItems, videoItems, items]);

  const isSearchActive = !!searchQuery.trim();

  return (
    <div style={{ maxWidth: '1540px', margin: '0 auto', padding: '1.5rem 2rem 4rem' }}>
      {/* Empty State / Storage Sandbox Active */}
      {items.length === 0 && (
        <div
          className="chassis-panel"
          style={{
            padding: '4.5rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
            background: 'var(--cinema-surface)',
            border: '1px solid var(--cinema-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(52, 211, 153, 0.1)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
            }}
          >
            <ShieldCheck size={32} />
          </div>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                background: 'rgba(52, 211, 153, 0.12)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                borderRadius: '999px',
                fontSize: '0.725rem',
                color: '#34d399',
                fontWeight: 700,
                marginBottom: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <span>Zero Storage Access Sandbox</span>
            </div>
            <h3 style={{ fontSize: '1.45rem', color: '#f8fafc', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Point Red Moon to Your Media Folder
            </h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '520px', lineHeight: '1.6', margin: 0 }}>
            For your security and privacy, Red Moon has zero access to your computer's drives or personal files by default. Point to the specific folder containing your movies, video clips, or songs to grant access and start streaming.
          </p>
          <button
            className="btn btn-netflix btn-whimsy"
            onClick={onOpenFolderModal}
            style={{ marginTop: '0.5rem', padding: '0.75rem 1.6rem', fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FolderOpen size={17} />
            <span>Point Media Folder (Browse PC...)</span>
          </button>
        </div>
      )}

      {/* Empty State for My List */}
      {items.length > 0 && activeNavTab === 'mylist' && myListItems.length === 0 && !isSearchActive && (
        <div
          className="chassis-panel"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            background: 'var(--cinema-surface)',
            border: '1px solid var(--cinema-border)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(229, 9, 20, 0.1)',
              border: '1px solid rgba(229, 9, 20, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e50914',
            }}
          >
            <Bookmark size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', fontWeight: 700 }}>
            Your List is Empty
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: '1.5' }}>
            Hover over any title in your library and click the <strong>+</strong> button to bookmark movies and music here for one-click access.
          </p>
        </div>
      )}

      {/* Empty State for Queue */}
      {items.length > 0 && activeNavTab === 'queue' && queue.length === 0 && !isSearchActive && (
        <div
          className="chassis-panel"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            background: 'var(--cinema-surface)',
            border: '1px solid var(--cinema-border)',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', fontWeight: 700 }}>
            Up Next Queue is Empty
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: '1.5' }}>
            Click "+ Next" or queue tracks from the media table to queue them for continuous audio playback.
          </p>
        </div>
      )}

      {/* No Search Matches */}
      {items.length > 0 && isSearchActive && searchFiltered.length === 0 && (
        <div
          className="chassis-panel"
          style={{
            padding: '3.5rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.85rem',
            background: 'var(--cinema-surface)',
            border: '1px solid var(--cinema-border)',
          }}
        >
          <h3 style={{ fontSize: '1.15rem', color: '#f8fafc', fontWeight: 600 }}>
            No results found for "{searchQuery}"
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Try searching for a different song, movie title, or artist name.
          </p>
        </div>
      )}

      {/* Mode A: Netflix Rails View (Default for Home when not searching) */}
      {viewMode === 'rails' && !isSearchActive && items.length > 0 && (
        <div>
          {/* Hero Spotlight Billboard */}
          {activeNavTab === 'home' && featuredItem && (
            <NetflixBillboard
              item={featuredItem}
              onPlay={featuredItem.type === 'video' ? onPlayVideo : onPlayAudio}
              onQueue={onQueueAudio}
            />
          )}

          {/* System & Multi-Media Quick Control Center */}
          {activeNavTab === 'home' && settings && (
            <div
              style={{
                margin: '0.5rem 0 2rem 0',
                padding: '1.25rem 1.75rem',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(14, 17, 24, 0.8) 0%, rgba(22, 27, 38, 0.8) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              {/* Bar Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'var(--cinema-red)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 10px var(--cinema-red-glow)',
                    }}
                  >
                    <Sliders size={15} color="#ffffff" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                      System & Multi-Media Quick Controls
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Real-time GPU encoding, Web Audio DSP profile, and video color grading
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      color: '#4ade80',
                      fontWeight: 700,
                    }}
                  >
                    <Zap size={12} />
                    <span>NVENC Hardware Active</span>
                  </div>

                  {onNavTabChange && (
                    <button
                      onClick={() => onNavTabChange('settings')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#f8fafc',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--cinema-red)';
                        e.currentTarget.style.borderColor = 'var(--cinema-red)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                      }}
                    >
                      <Settings size={13} />
                      <span>Open Full Settings Hub</span>
                      <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Dial Controls Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                  gap: '0.75rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                {/* 1. Video Color Grading Filter Quick Dial */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                    <Film size={12} color="var(--cinema-red)" />
                    <span>Color Grading Filter</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {(['none', 'vibrant', 'cinema', 'nightshift'] as const).map((filter) => {
                      const isSel = settings.video.colorGradingFilter === filter;
                      const labels: Record<string, string> = {
                        none: 'Natural',
                        vibrant: 'Vibrant',
                        cinema: 'Cinema HDR',
                        nightshift: 'Night',
                      };
                      return (
                        <button
                          key={filter}
                          onClick={() => {
                            if (!onSaveSettings) return;
                            const next = { ...settings, video: { ...settings.video, colorGradingFilter: filter } };
                            onSaveSettings(next);
                            onTriggerToast?.(`Color Grading: ${labels[filter]} applied! 🎬`, 'sparkles', 'VIDEO');
                          }}
                          style={{
                            background: isSel ? 'var(--cinema-red)' : 'rgba(255, 255, 255, 0.06)',
                            border: isSel ? '1px solid var(--cinema-red)' : '1px solid rgba(255, 255, 255, 0.08)',
                            color: isSel ? '#ffffff' : '#cbd5e1',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: isSel ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {labels[filter]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Audio DSP EQ Preset Quick Dial */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                    <Music size={12} color="var(--cinema-red)" />
                    <span>Audio EQ Preset</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {(['flat', 'bass_boost', 'vocal', 'cinema'] as const).map((presetKey) => {
                      const isSel = settings.audio.equalizerPreset === presetKey;
                      const labels: Record<string, string> = {
                        flat: 'Flat',
                        bass_boost: 'Bass +',
                        vocal: 'Vocal',
                        cinema: 'Cinema',
                      };
                      return (
                        <button
                          key={presetKey}
                          onClick={() => {
                            if (!onSaveSettings) return;
                            const bands = EQUALIZER_PRESETS[presetKey]?.bands || settings.audio.equalizerBands;
                            const next = { ...settings, audio: { ...settings.audio, equalizerPreset: presetKey, equalizerBands: bands } };
                            onSaveSettings(next);
                            audioEngine.setEqualizerBands(bands);
                            onTriggerToast?.(`Equalizer Preset: ${labels[presetKey]} applied! 🎵`, 'music', 'AUDIO');
                          }}
                          style={{
                            background: isSel ? 'var(--cinema-red)' : 'rgba(255, 255, 255, 0.06)',
                            border: isSel ? '1px solid var(--cinema-red)' : '1px solid rgba(255, 255, 255, 0.08)',
                            color: isSel ? '#ffffff' : '#cbd5e1',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: isSel ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {labels[presetKey]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Theme Accent Quick Palette */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                    <Palette size={12} color="var(--cinema-red)" />
                    <span>Cinema Theme Palette</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {(Object.keys(THEME_PRESETS) as Array<keyof typeof THEME_PRESETS>).map((themeKey) => {
                      const theme = THEME_PRESETS[themeKey];
                      const isSel = settings.appearance.themeAccent === themeKey;
                      return (
                        <button
                          key={themeKey}
                          onClick={() => {
                            if (!onSaveSettings) return;
                            const next = { ...settings, appearance: { ...settings.appearance, themeAccent: themeKey } };
                            onSaveSettings(next);
                            document.documentElement.style.setProperty('--cinema-red', theme.color);
                            document.documentElement.style.setProperty('--cinema-red-hover', theme.hover);
                            document.documentElement.style.setProperty('--cinema-red-glow', theme.glow);
                            onTriggerToast?.(`Cinema Theme: ${theme.name} active! 🎨`, 'sparkles', 'THEME');
                          }}
                          title={theme.name}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: theme.color,
                            border: isSel ? '2px solid #ffffff' : '2px solid transparent',
                            boxShadow: isSel ? `0 0 10px ${theme.glow}` : 'none',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'all 0.15s ease',
                            transform: isSel ? 'scale(1.15)' : 'scale(1)',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Algorithmic Top Picks Row */}
          {activeNavTab === 'home' && topPickItems.length > 0 && (
            <NetflixRow
              title="Top Picks For You"
              badge="Algorithmic Match"
              items={topPickItems}
              matchScores={topPickScores}
              currentAudioId={currentAudioId}
              isPlayingAudio={isPlayingAudio}
              onPlayVideo={onPlayVideo}
              onPlayAudio={onPlayAudio}
              onQueueAudio={onQueueAudio}
            />
          )}

          {/* Behavioral / Contextual "Because You Watched" Row */}
          {activeNavTab === 'home' && becauseWatched && becauseWatched.recommendations.length > 0 && (
            <NetflixRow
              title={`Because You Watched: ${cleanMediaTitle(becauseWatched.sourceItem.name || becauseWatched.sourceItem.title).title}`}
              badge="Related Vibe"
              items={becauseWatched.recommendations.map((r: RecommendationMatch) => r.item)}
              matchScores={becauseWatchedScores}
              currentAudioId={currentAudioId}
              isPlayingAudio={isPlayingAudio}
              onPlayVideo={onPlayVideo}
              onPlayAudio={onPlayAudio}
              onQueueAudio={onQueueAudio}
            />
          )}

          {/* My List Row (Always shown on 'mylist' tab, or shown on home if items exist) */}
          {(activeNavTab === 'home' || activeNavTab === 'mylist') && myListItems.length > 0 && (
            <NetflixRow
              title="My List"
              badge={`${myListItems.length} Titles`}
              items={myListItems}
              currentAudioId={currentAudioId}
              isPlayingAudio={isPlayingAudio}
              onPlayVideo={onPlayVideo}
              onPlayAudio={onPlayAudio}
              onQueueAudio={onQueueAudio}
            />
          )}

          {/* Up Next / Queue Rail */}
          {(activeNavTab === 'home' || activeNavTab === 'queue') && queue.length > 0 && (
            <NetflixRow
              title="Continue Listening & Up Next"
              badge="Queue"
              items={queue}
              currentAudioId={currentAudioId}
              isPlayingAudio={isPlayingAudio}
              onPlayVideo={onPlayVideo}
              onPlayAudio={onPlayAudio}
              onQueueAudio={onQueueAudio}
            />
          )}

          {/* Videos Row */}
          {(activeNavTab === 'home' || activeNavTab === 'video') && videoItems.length > 0 && (
            <NetflixRow
              title="Featured Movies & Video Clips"
              badge="1080p HD"
              items={videoItems}
              currentAudioId={currentAudioId}
              isPlayingAudio={isPlayingAudio}
              onPlayVideo={onPlayVideo}
              onPlayAudio={onPlayAudio}
              onQueueAudio={onQueueAudio}
            />
          )}

          {/* Music Row */}
          {(activeNavTab === 'home' || activeNavTab === 'audio') && audioItems.length > 0 && (
            <NetflixRow
              title="Studio Recordings & Music"
              badge="Hi-Fi Lossless"
              items={audioItems}
              currentAudioId={currentAudioId}
              isPlayingAudio={isPlayingAudio}
              onPlayVideo={onPlayVideo}
              onPlayAudio={onPlayAudio}
              onQueueAudio={onQueueAudio}
            />
          )}

          {/* Local Vaults Grouped by Folder */}
          {activeNavTab === 'home' && folderGroups.map(([folderName, groupItems]) => (
            <NetflixRow
              key={folderName}
              title={`Vault: ${formatFolderLabel(folderName)}`}
              badge="Local Directory"
              items={groupItems}
              currentAudioId={currentAudioId}
              isPlayingAudio={isPlayingAudio}
              onPlayVideo={onPlayVideo}
              onPlayAudio={onPlayAudio}
              onQueueAudio={onQueueAudio}
            />
          ))}
        </div>
      )}

      {/* Mode B: Cinema Grid View (Used when user switches to Grid or during active Search) */}
      {(viewMode === 'grid' || isSearchActive) && searchFiltered.length > 0 && (
        <div>
          {/* Subheader */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <h2 style={{ fontSize: 'clamp(1.15rem, 3.5vw, 1.4rem)', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                {isSearchActive ? `Search Results for "${searchQuery}"` : 'All Titles'}
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {searchFiltered.length} {searchFiltered.length === 1 ? 'title' : 'titles'} ready to stream
              </span>
            </div>

            <div className="hide-mobile" style={{ alignItems: 'center', gap: '8px' }}>
              <KeycapBadge keys={['/']} label="Search" />
              <KeycapBadge keys={['Space']} label="Play" />
              <KeycapBadge keys={['J', 'K', 'L']} label="Shuttle" />
            </div>
          </div>

          {/* Responsive Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))',
              gap: 'clamp(0.75rem, 2vw, 1.25rem)',
            }}
          >
            {searchFiltered.map((item) => (
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
        </div>
      )}

      {/* Mode C: Studio Table Details View */}
      {viewMode === 'table' && !isSearchActive && searchFiltered.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
              Media Index & Metadata
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {searchFiltered.length} items
            </span>
          </div>

          <StudioTableView
            items={searchFiltered}
            currentAudioId={currentAudioId}
            isPlayingAudio={isPlayingAudio}
            onPlayVideo={onPlayVideo}
            onPlayAudio={onPlayAudio}
            onQueueAudio={onQueueAudio}
          />
        </div>
      )}
    </div>
  );
};
