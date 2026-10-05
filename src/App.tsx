import React, { useState, useEffect, useCallback } from 'react';
import { MediaItem, NetworkInfo, StreamSettings } from './types/media';
import { Header, NavTab, ViewMode } from './components/Header';
import { MediaLibrary } from './components/MediaLibrary';
import { VideoModal } from './components/VideoModal';
import { AudioDock } from './components/AudioDock';
import { TailscaleModal } from './components/TailscaleModal/TailscaleModal';
import { FolderManagerModal } from './components/FolderManagerModal';
import { Spatial3DCanvas } from './components/Spatial3DCanvas';
import { WhimsyToast, ToastMessage } from './components/WhimsyToast';
import { WhimsyParty } from './components/WhimsyParty';
import { cleanMediaTitle } from './utils/mediaFormatter';

const DEFAULT_SETTINGS: StreamSettings = {
  bufferMode: 'standard',
  audioVolume: 0.85,
  videoAutoplay: true,
  customHostOverride: '',
};

export const App: React.FC = () => {
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [directories, setDirectories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('home');
  const [viewMode, setViewMode] = useState<ViewMode>('rails');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Players State
  const [activeVideo, setActiveVideo] = useState<MediaItem | null>(null);
  const [currentAudio, setCurrentAudio] = useState<MediaItem | null>(null);
  const [audioQueue, setAudioQueue] = useState<MediaItem[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Whimsical Delight & Party State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isPartyMode, setIsPartyMode] = useState<boolean>(false);

  const addToast = (text: string, icon: 'sparkles' | 'music' | 'check' = 'sparkles', badge?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-2), { id, text, icon, badge }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  const handleEasterEgg = () => {
    setIsPartyMode(true);
    addToast('Party Mode Unlocked! 🎧 Turntable needles engaged', 'sparkles', 'SECRET');
  };

  const handleMoonInteract = () => {
    addToast('Eclipse Awakened! 🌑 Gravitational resonance active', 'sparkles', 'RED MOON');
  };

  // Modals
  const [isTailscaleModalOpen, setIsTailscaleModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

  // Settings
  const [settings, setSettings] = useState<StreamSettings>(() => {
    try {
      const saved = localStorage.getItem('tailstream_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const handleSaveSettings = (newSettings: StreamSettings) => {
    setSettings(newSettings);
    localStorage.setItem('tailstream_settings', JSON.stringify(newSettings));
  };

  // Stream Access Token Extraction & Persistence
  const [authToken, setAuthToken] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken) {
        sessionStorage.setItem('redmoon_token', urlToken);
        localStorage.setItem('redmoon_token', urlToken);
        return urlToken;
      }
      return sessionStorage.getItem('redmoon_token') || localStorage.getItem('redmoon_token') || '';
    } catch {
      return '';
    }
  });

  // Fetch Network diagnostics
  const fetchNetwork = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const url = authToken ? `/api/system/network?token=${encodeURIComponent(authToken)}` : '/api/system/network';
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setNetwork(data);
        if (data.streamToken && !authToken) {
          setAuthToken(data.streamToken);
          sessionStorage.setItem('redmoon_token', data.streamToken);
          localStorage.setItem('redmoon_token', data.streamToken);
        }
      }
    } catch (err) {
      console.warn('Network probe error:', err);
    }
  }, [authToken]);

  // Fetch Media Catalog
  const fetchMedia = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const url = authToken ? `/api/media?token=${encodeURIComponent(authToken)}` : '/api/media';
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.items || []);
        setDirectories(data.directories || []);
      }
    } catch (err) {
      console.error('Failed to load media catalog:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchNetwork();
    fetchMedia();
    const interval = setInterval(fetchNetwork, 15000);
    return () => clearInterval(interval);
  }, [fetchNetwork, fetchMedia]);

  // Audio Playback Handlers
  const handlePlayAudio = (item: MediaItem) => {
    // If selecting a new audio, pause any active video
    if (activeVideo) setActiveVideo(null);

    setCurrentAudio(item);
    setIsPlayingAudio(true);

    // If queue is empty or doesn't have this item, add it
    if (!audioQueue.some((q) => q.id === item.id)) {
      setAudioQueue((prev) => [item, ...prev]);
    }
  };

  const handleQueueAudio = (item: MediaItem) => {
    const { title } = cleanMediaTitle(item.name || item.title);
    if (!audioQueue.some((q) => q.id === item.id)) {
      setAudioQueue((prev) => [...prev, item]);
      addToast(`Added "${title}" to Up Next`, 'music', '+1');
    } else {
      addToast(`"${title}" is already in Up Next`, 'check');
    }
    if (!currentAudio) {
      setCurrentAudio(item);
      setIsPlayingAudio(true);
    }
  };

  const handleNextAudio = () => {
    if (!currentAudio || audioQueue.length <= 1) return;
    const currentIndex = audioQueue.findIndex((q) => q.id === currentAudio.id);
    const nextIndex = (currentIndex + 1) % audioQueue.length;
    setCurrentAudio(audioQueue[nextIndex]);
    setIsPlayingAudio(true);
  };

  const handlePrevAudio = () => {
    if (!currentAudio || audioQueue.length <= 1) return;
    const currentIndex = audioQueue.findIndex((q) => q.id === currentAudio.id);
    const prevIndex = (currentIndex - 1 + audioQueue.length) % audioQueue.length;
    setCurrentAudio(audioQueue[prevIndex]);
    setIsPlayingAudio(true);
  };

  const handleRemoveFromQueue = (index: number) => {
    setAudioQueue((prev) => prev.filter((_, i) => i !== index));
  };

  // Video Playback Handlers
  const handlePlayVideo = (item: MediaItem) => {
    // Pause audio while playing video
    if (isPlayingAudio) setIsPlayingAudio(false);
    setActiveVideo(item);
    const { title } = cleanMediaTitle(item.name || item.title);
    addToast(`Playing "${title}"`, 'sparkles');
  };

  // Directory Management Handlers
  const handleAddDirectory = async (folderPath: string): Promise<boolean> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const url = authToken ? `/api/media/directories?token=${encodeURIComponent(authToken)}` : '/api/media/directories';
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ folderPath }),
      });
      if (res.ok) {
        const data = await res.json();
        setDirectories(data.directories);
        addToast('Folder added to library', 'check');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleRemoveDirectory = async (folderPath: string): Promise<void> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const url = authToken ? `/api/media/directories?token=${encodeURIComponent(authToken)}` : '/api/media/directories';
      const res = await fetch(url, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ folderPath }),
      });
      if (res.ok) {
        const data = await res.json();
        setDirectories(data.directories);
        addToast('Folder removed', 'check');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: currentAudio ? '120px' : '32px', position: 'relative' }}>
      {/* Three.js 3D Celestial Red Moon Scene */}
      <Spatial3DCanvas
        isPlaying={isPlayingAudio || isPartyMode}
        onMoonInteract={handleMoonInteract}
      />

      {/* Celebratory Easter Egg Particle Overlay */}
      <WhimsyParty isActive={isPartyMode} onComplete={() => setIsPartyMode(false)} />

      {/* Whimsical Micro-Toasts */}
      <WhimsyToast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeNavTab={activeNavTab}
        onNavTabChange={setActiveNavTab}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        network={network}
        onOpenTailscaleModal={() => setIsTailscaleModalOpen(true)}
        onOpenFolderModal={() => setIsFolderModalOpen(true)}
        onRefreshMedia={fetchMedia}
        isRefreshing={isRefreshing}
        onEasterEgg={handleEasterEgg}
      />

      <main style={{ flex: 1 }}>
        <MediaLibrary
          items={mediaItems}
          queue={audioQueue}
          searchQuery={searchQuery}
          activeNavTab={activeNavTab}
          viewMode={viewMode}
          currentAudioId={currentAudio?.id || null}
          isPlayingAudio={isPlayingAudio}
          onPlayVideo={handlePlayVideo}
          onPlayAudio={handlePlayAudio}
          onQueueAudio={handleQueueAudio}
          onOpenFolderModal={() => setIsFolderModalOpen(true)}
        />
      </main>

      {/* Video Cinema Player Modal */}
      {activeVideo && (
        <VideoModal item={activeVideo} onClose={() => setActiveVideo(null)} />
      )}

      {/* Floating Persistent Audio Deck */}
      {currentAudio && (
        <AudioDock
          currentTrack={currentAudio}
          queue={audioQueue}
          isPlaying={isPlayingAudio}
          onTogglePlay={() => setIsPlayingAudio(!isPlayingAudio)}
          onNext={handleNextAudio}
          onPrev={handlePrevAudio}
          onSelectTrack={(track) => {
            setCurrentAudio(track);
            setIsPlayingAudio(true);
          }}
          onRemoveFromQueue={handleRemoveFromQueue}
          onCloseDock={() => {
            setIsPlayingAudio(false);
            setCurrentAudio(null);
          }}
          autoplayNext={settings.videoAutoplay}
        />
      )}

      {/* Responsive Tailscale Connection Modal */}
      <TailscaleModal
        isOpen={isTailscaleModalOpen}
        onClose={() => setIsTailscaleModalOpen(false)}
        network={network}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Folder Manager Modal */}
      <FolderManagerModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        directories={directories}
        onAddDirectory={handleAddDirectory}
        onRemoveDirectory={handleRemoveDirectory}
        onRefreshMedia={fetchMedia}
        authToken={authToken}
      />
    </div>
  );
};

export default App;
