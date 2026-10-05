import React, { useMemo } from 'react';
import { MediaItem } from '../types/media';
import { StudioTableView } from './StudioTableView';
import { NetflixBillboard } from './NetflixBillboard';
import { NetflixRow } from './NetflixRow';
import { NetflixCard } from './NetflixCard';
import { KeycapBadge } from './KeycapBadge';
import { Folder } from 'lucide-react';
import { formatFolderLabel } from '../utils/mediaFormatter';

export type NavTab = 'home' | 'video' | 'audio' | 'queue';
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
}) => {
  // Filter items based on activeNavTab
  const navFiltered = useMemo(() => {
    if (activeNavTab === 'video') return items.filter((i) => i.type === 'video');
    if (activeNavTab === 'audio') return items.filter((i) => i.type === 'audio');
    if (activeNavTab === 'queue') return queue;
    return items;
  }, [items, queue, activeNavTab]);

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

  // Select spotlight featured item (prioritize video, then first audio)
  const featuredItem = useMemo(() => {
    if (videoItems.length > 0) return videoItems[0];
    if (items.length > 0) return items[0];
    return null;
  }, [videoItems, items]);

  const isSearchActive = !!searchQuery.trim();

  return (
    <div style={{ maxWidth: '1540px', margin: '0 auto', padding: '1.5rem 2rem 4rem' }}>
      {/* Empty State */}
      {items.length === 0 && (
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
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--cinema-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Folder size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', fontWeight: 700 }}>
            Your library is empty
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: '1.5' }}>
            Add a folder from your computer to start streaming movies, videos, and music over your local Wi-Fi or Tailscale.
          </p>
          <button className="btn btn-netflix btn-whimsy" onClick={onOpenFolderModal} style={{ marginTop: '0.5rem', padding: '0.65rem 1.4rem' }}>
            <Folder size={15} />
            <span>Choose Folders to Stream</span>
          </button>
        </div>
      )}

      {/* No Search Matches */}
      {items.length > 0 && searchFiltered.length === 0 && (
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

          {/* Up Next / Queue Rail */}
          {queue.length > 0 && (
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
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                {isSearchActive ? `Search Results for "${searchQuery}"` : 'All Titles'}
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {searchFiltered.length} {searchFiltered.length === 1 ? 'title' : 'titles'} ready to stream
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeycapBadge keys={['/']} label="Search" />
              <KeycapBadge keys={['Space']} label="Play" />
              <KeycapBadge keys={['J', 'K', 'L']} label="Shuttle" />
            </div>
          </div>

          {/* Responsive Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1.25rem',
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
