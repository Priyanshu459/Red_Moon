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
import { recommendationEngine } from './services/recommendationEngine';
import { NvidiaStudioModal, NvidiaProfile, NvidiaTelemetryData } from './components/NvidiaStudioModal';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { RedMoonSettings, DEFAULT_REDMOON_SETTINGS, THEME_PRESETS } from './types/settings';


export const App: React.FC = () => {
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [directories, setDirectories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('home');
  const [viewMode, setViewMode] = useState<ViewMode>('rails');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stream Access Token Extraction & Persistence (Prefers sessionStorage for tab isolation)
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
  const [isNvidiaModalOpen, setIsNvidiaModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [nvidiaTelemetry, setNvidiaTelemetry] = useState<NvidiaTelemetryData | null>(null);
  const [activeRendererString, setActiveRendererString] = useState<string>('');
  const [nvidiaProfile, setNvidiaProfile] = useState<NvidiaProfile>(() => {
    try {
      return (localStorage.getItem('redmoon_nvidia_profile') as NvidiaProfile) || 'turing';
    } catch {
      return 'turing';
    }
  });

  const handleProfileChange = (p: NvidiaProfile) => {
    setNvidiaProfile(p);
    localStorage.setItem('redmoon_nvidia_profile', p);
    addToast(`NVIDIA Profile: ${p.toUpperCase()} ⚡`, 'sparkles', 'GPU');
  };

  const fetchNvidiaTelemetry = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const url = authToken ? `/api/system/nvidia?token=${encodeURIComponent(authToken)}` : '/api/system/nvidia';
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setNvidiaTelemetry(data);
      }
    } catch {
      // offline
    }
  }, [authToken]);

  useEffect(() => {
    fetchNvidiaTelemetry();
    const interval = setInterval(fetchNvidiaTelemetry, 8000);
    return () => clearInterval(interval);
  }, [fetchNvidiaTelemetry]);

  // Global Red Moon Settings & Persistence
  const [settings, setSettings] = useState<RedMoonSettings>(() => {
    try {
      const saved = localStorage.getItem('redmoon_user_settings');
      return saved ? { ...DEFAULT_REDMOON_SETTINGS, ...JSON.parse(saved) } : DEFAULT_REDMOON_SETTINGS;
    } catch {
      return DEFAULT_REDMOON_SETTINGS;
    }
  });

  // Fetch server-persisted settings on mount (Authenticated)
  useEffect(() => {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const url = authToken ? `/api/system/settings?token=${encodeURIComponent(authToken)}` : '/api/system/settings';
    fetch(url, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .catch(() => {});
  }, [authToken]);

  // Synchronize CSS Theme Tokens on :root dynamically
  useEffect(() => {
    const theme = THEME_PRESETS[settings.appearance.themeAccent] || THEME_PRESETS.crimson;
    document.documentElement.style.setProperty('--cinema-red', theme.color);
    document.documentElement.style.setProperty('--cinema-red-hover', theme.hover);
    document.documentElement.style.setProperty('--cinema-red-glow', theme.glow);
  }, [settings.appearance.themeAccent]);

  const handleSaveSettings = (newSettings: RedMoonSettings) => {
    setSettings(newSettings);
    localStorage.setItem('redmoon_user_settings', JSON.stringify(newSettings));
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    fetch('/api/system/settings', {
      method: 'POST',
      headers,
      body: JSON.stringify(newSettings),
    }).catch(() => {});
  };

  const tailscaleSettingsAdapter: StreamSettings = {
    bufferMode: settings.network.bufferMode,
    audioVolume: settings.audio.defaultVolume,
    videoAutoplay: settings.video.autoplayNext,
    customHostOverride: settings.network.customHostOverride,
  };

  const handleTailscaleSaveSettings = (partial: StreamSettings) => {
    const updated: RedMoonSettings = {
      ...settings,
      network: {
        ...settings.network,
        bufferMode: partial.bufferMode,
        customHostOverride: partial.customHostOverride,
      },
      audio: {
        ...settings.audio,
        defaultVolume: partial.audioVolume,
      },
      video: {
        ...settings.video,
        autoplayNext: partial.videoAutoplay,
      },
    };
    handleSaveSettings(updated);
  };




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

    // Record user playback telemetry for recommendation engine
    recommendationEngine.recordPlay(item);

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
      recommendationEngine.recordPlay(item);
    }
  };

  const handleNextAudio = () => {
    if (!currentAudio || audioQueue.length <= 1) return;
    const currentIndex = audioQueue.findIndex((q) => q.id === currentAudio.id);
    const nextIndex = (currentIndex + 1) % audioQueue.length;
    setCurrentAudio(audioQueue[nextIndex]);
    setIsPlayingAudio(true);
    recommendationEngine.recordPlay(audioQueue[nextIndex]);
  };

  const handlePrevAudio = () => {
    if (!currentAudio || audioQueue.length <= 1) return;
    const currentIndex = audioQueue.findIndex((q) => q.id === currentAudio.id);
    const prevIndex = (currentIndex - 1 + audioQueue.length) % audioQueue.length;
    setCurrentAudio(audioQueue[prevIndex]);
    setIsPlayingAudio(true);
    recommendationEngine.recordPlay(audioQueue[prevIndex]);
  };

  const handleRemoveFromQueue = (index: number) => {
    setAudioQueue((prev) => prev.filter((_, i) => i !== index));
  };

  // Video Playback Handlers
  const handlePlayVideo = (item: MediaItem) => {
    // Pause audio while playing video
    if (isPlayingAudio) setIsPlayingAudio(false);
    setActiveVideo(item);

    // Record user playback telemetry for recommendation engine
    recommendationEngine.recordPlay(item);

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
        addToast('Folder removed from scope', 'check');
        fetchMedia();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetSingleDirectory = async (folderPath: string): Promise<boolean> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const url = authToken ? `/api/media/directories/set?token=${encodeURIComponent(authToken)}` : '/api/media/directories/set';
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ folderPath }),
      });
      if (res.ok) {
        const data = await res.json();
        setDirectories(data.directories);
        const folderName = folderPath.split('\\').pop() || folderPath.split('/').pop() || 'folder';
        addToast(`Storage scoped strictly to "${folderName}"`, 'sparkles', 'SANDBOX');
        fetchMedia();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleRevokeAllDirectories = async (): Promise<void> => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const url = authToken ? `/api/media/directories/all?token=${encodeURIComponent(authToken)}` : '/api/media/directories/all';
      const res = await fetch(url, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setDirectories(data.directories || []);
        addToast('All storage access revoked', 'check', 'LOCKED');
        fetchMedia();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: currentAudio ? '120px' : '32px', position: 'relative' }}>
      {/* Three.js 3D Celestial Red Moon Scene (NVIDIA Profile Tuned) */}
      {settings.appearance.enable3DSpace && (
        <Spatial3DCanvas
          isPlaying={isPlayingAudio || isPartyMode}
          onMoonInteract={handleMoonInteract}
          profile={nvidiaProfile}
          onGpuDetected={setActiveRendererString}
        />
      )}

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
        directories={directories}
        nvidiaTelemetry={nvidiaTelemetry}
        activeRendererString={activeRendererString}
        onOpenTailscaleModal={() => setIsTailscaleModalOpen(true)}
        onOpenFolderModal={() => setIsFolderModalOpen(true)}
        onOpenNvidiaModal={() => setIsNvidiaModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onRefreshMedia={fetchMedia}
        isRefreshing={isRefreshing}
        onEasterEgg={handleEasterEgg}
      />

      <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        {activeNavTab === 'settings' ? (
          <SettingsModal
            isOpen={true}
            isEmbedded={true}
            onClose={() => setActiveNavTab('home')}
            settings={settings}
            onSaveSettings={handleSaveSettings}
            authToken={authToken}
            onTriggerToast={addToast}
          />
        ) : (
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
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onNavTabChange={setActiveNavTab}
            onTriggerToast={addToast}
          />
        )}
      </main>

      {/* Video Cinema Player Modal */}
      {activeVideo && (() => {
        const videoList = mediaItems.filter((i) => i.type === 'video');
        const currIdx = videoList.findIndex((i) => i.id === activeVideo.id);
        const nextVideoItem = currIdx >= 0 && currIdx < videoList.length - 1 ? videoList[currIdx + 1] : undefined;
        return (
          <VideoModal
            item={activeVideo}
            onClose={() => setActiveVideo(null)}
            settings={settings}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            nextItem={nextVideoItem}
            onPlayNext={(item) => setActiveVideo(item)}
          />
        );
      })()}

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
          autoplayNext={settings.video.autoplayNext}
          settings={settings}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />
      )}

      {/* Responsive Tailscale Connection Modal */}
      <TailscaleModal
        isOpen={isTailscaleModalOpen}
        onClose={() => setIsTailscaleModalOpen(false)}
        network={network}
        settings={tailscaleSettingsAdapter}
        onSaveSettings={handleTailscaleSaveSettings}
        authToken={authToken}
        onRefreshNetwork={fetchNetwork}
      />

      {/* Storage Scope & Folder Manager Modal */}
      <FolderManagerModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        directories={directories}
        onAddDirectory={handleAddDirectory}
        onSetSingleDirectory={handleSetSingleDirectory}
        onRemoveDirectory={handleRemoveDirectory}
        onRevokeAllDirectories={handleRevokeAllDirectories}
        onRefreshMedia={fetchMedia}
        authToken={authToken}
      />

      {/* NVIDIA GeForce & RTX Studio Modal */}
      <NvidiaStudioModal
        isOpen={isNvidiaModalOpen}
        onClose={() => setIsNvidiaModalOpen(false)}
        activeRendererString={activeRendererString}
        currentProfile={nvidiaProfile}
        onProfileChange={handleProfileChange}
        authToken={authToken}
      />

      {/* Global Settings & Multi-Media Control Center Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        authToken={authToken}
        onTriggerToast={addToast}
      />
    </div>
  );

};

export default App;
