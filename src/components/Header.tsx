import React, { useRef, useState, useEffect } from 'react';
import { Search, Layers, ShieldCheck, FolderPlus, RefreshCw, LayoutGrid, List, Moon } from 'lucide-react';
import { NetworkInfo } from '../types/media';

export type NavTab = 'home' | 'video' | 'audio' | 'queue';
export type ViewMode = 'rails' | 'grid' | 'table';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeNavTab: NavTab;
  onNavTabChange: (tab: NavTab) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  network: NetworkInfo | null;
  onOpenTailscaleModal: () => void;
  onOpenFolderModal: () => void;
  onRefreshMedia: () => void;
  isRefreshing: boolean;
  onEasterEgg?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  activeNavTab,
  onNavTabChange,
  viewMode,
  onViewModeChange,
  network,
  onOpenTailscaleModal,
  onOpenFolderModal,
  onRefreshMedia,
  isRefreshing,
  onEasterEgg,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const clickTimestampsRef = useRef<number[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleLogoClick = () => {
    const now = Date.now();
    clickTimestampsRef.current = [...clickTimestampsRef.current.filter((t) => now - t < 2200), now];
    if (clickTimestampsRef.current.length >= 5) {
      clickTimestampsRef.current = [];
      onEasterEgg?.();
    }
  };

  // Global '/' keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(11, 12, 16, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--cinema-border)',
        padding: '0.65rem 2rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
      }}
    >
      <div
        style={{
          maxWidth: '1540px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Netflix Brand Badge & Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {/* Brand Logo with Easter Egg Trigger */}
          <div
            className="brand-logo-bounce"
            onClick={handleLogoClick}
            title="Red Moon // Tap 5 times for Party Mode ✨"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <div
              style={{
                background: 'var(--cinema-red)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.85rem',
                padding: '3px 8px',
                borderRadius: '4px',
                letterSpacing: '0.04em',
                boxShadow: '0 2px 14px var(--cinema-red-glow)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                justifyContent: 'center',
              }}
            >
              <Moon size={13} fill="#ffffff" stroke="none" />
              <span>RM</span>
            </div>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                fontFamily: 'var(--font-display)',
              }}
            >
              RED <span style={{ color: 'var(--cinema-red)' }}>MOON</span>
            </span>
          </div>

          {/* Primary Netflix Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {[
              { id: 'home', label: 'Home' },
              { id: 'video', label: 'Videos' },
              { id: 'audio', label: 'Music' },
              { id: 'queue', label: 'My Queue' },
            ].map((tab) => {
              const isActive = activeNavTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavTabChange(tab.id as NavTab)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    borderBottom: isActive ? '2px solid var(--cinema-red)' : '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Search, Views, Folders, Mesh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Animated Expanding Search Bar */}
          <div
            style={{
              position: 'relative',
              width: isSearchFocused || searchQuery ? '280px' : '200px',
              transition: 'width 0.25s ease',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: isSearchFocused ? 'var(--cinema-red)' : 'var(--text-muted)',
                transition: 'color 0.2s ease',
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search movies, songs..."
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 2.2rem 0.5rem 2.2rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: isSearchFocused ? '1px solid var(--cinema-red)' : '1px solid var(--cinema-border)',
                borderRadius: '999px',
                color: '#f8fafc',
                fontSize: '0.8rem',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
                boxShadow: isSearchFocused ? '0 0 12px var(--cinema-red-glow)' : 'none',
                transition: 'all 0.2s ease',
              }}
            />
            <kbd
              className="keycap"
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.65rem',
                padding: '1px 5px',
                borderRadius: '3px',
              }}
              title="Press '/' to search"
            >
              /
            </kbd>
          </div>

          {/* View Mode Switcher (Rails / Grid / List) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '2px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--cinema-border)',
            }}
          >
            <button
              onClick={() => onViewModeChange('rails')}
              style={{
                background: viewMode === 'rails' ? 'var(--cinema-red)' : 'transparent',
                color: viewMode === 'rails' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                padding: '5px 8px',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              title="Netflix Rails View"
            >
              <Layers size={14} />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              style={{
                background: viewMode === 'grid' ? '#1e293b' : 'transparent',
                color: viewMode === 'grid' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                padding: '5px 8px',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              title="Poster Grid"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              style={{
                background: viewMode === 'table' ? '#1e293b' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                padding: '5px 8px',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              title="Table Details"
            >
              <List size={14} />
            </button>
          </div>

          {/* Live Tailscale Mesh Host Pill */}
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '3px 9px',
              borderRadius: '999px',
              border: '1px solid var(--cinema-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{network?.hostname ? `${network.hostname}'s Laptop` : 'Personal Laptop'}</span>
            <span style={{ color: network?.tailscaleDetected ? '#34d399' : '#fbbf24', fontSize: '0.675rem', fontWeight: 600 }}>
              ● {network?.tailscaleDetected ? 'Tailscale Active' : 'Local Network'}
            </span>
          </span>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-icon btn-whimsy"
              onClick={onRefreshMedia}
              title="Scan for new videos and songs"
              disabled={isRefreshing}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>

            <button
              className="btn btn-secondary btn-whimsy"
              onClick={onOpenFolderModal}
              title="Manage Media Folders"
            >
              <FolderPlus size={14} />
              <span>Folders</span>
            </button>

            <button
              className="btn btn-netflix btn-whimsy"
              onClick={onOpenTailscaleModal}
              title="Stream to your phone or tablet via Tailscale"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.45rem 1rem' }}
            >
              <ShieldCheck size={15} />
              <span>Stream to Phone</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
