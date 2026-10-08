import React, { useRef, useState, useEffect } from 'react';
import { Search, Layers, ShieldCheck, FolderPlus, RefreshCw, LayoutGrid, List, Moon, Zap, Settings, X } from 'lucide-react';
import { NetworkInfo } from '../types/media';
import { NvidiaTelemetryData } from './NvidiaStudioModal';

export type NavTab = 'home' | 'video' | 'audio' | 'queue' | 'mylist' | 'settings';
export type ViewMode = 'rails' | 'grid' | 'table';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeNavTab: NavTab;
  onNavTabChange: (tab: NavTab) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  network: NetworkInfo | null;
  directories?: string[];
  nvidiaTelemetry?: NvidiaTelemetryData | null;
  activeRendererString?: string;
  onOpenTailscaleModal: () => void;
  onOpenFolderModal: () => void;
  onOpenNvidiaModal?: () => void;
  onOpenSettingsModal?: () => void;
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
  directories,
  nvidiaTelemetry,
  activeRendererString,
  onOpenTailscaleModal,
  onOpenFolderModal,
  onOpenNvidiaModal,
  onOpenSettingsModal,
  onRefreshMedia,
  isRefreshing,
  onEasterEgg,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const clickTimestampsRef = useRef<number[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const handleLogoClick = () => {
    const now = Date.now();
    clickTimestampsRef.current = [...clickTimestampsRef.current.filter((t) => now - t < 2200), now];
    if (clickTimestampsRef.current.length >= 5) {
      clickTimestampsRef.current = [];
      onEasterEgg?.();
    }
  };

  // Global '/' keyboard shortcut to focus search, 's' / ',' to open Settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 's' || e.key === 'S' || e.key === ',') {
        e.preventDefault();
        onOpenSettingsModal?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSettingsModal]);


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
        padding: '0.65rem clamp(0.75rem, 2.5vw, 2rem)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* ==================== DESKTOP BROADCAST HEADER ==================== */}
      <div
        className="hide-mobile"
        style={{
          maxWidth: '1540px',
          width: '100%',
          margin: '0 auto',
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
              { id: 'mylist', label: 'My List' },
              { id: 'queue', label: 'My Queue' },
              { id: 'settings', label: 'Settings' },
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

          {/* NVIDIA GPU Series & Telemetry Pill */}
          {nvidiaTelemetry?.available && nvidiaTelemetry?.primaryGpu && (
            <button
              onClick={onOpenNvidiaModal}
              title={`NVIDIA Studio: ${nvidiaTelemetry.primaryGpu.name} (${nvidiaTelemetry.primaryGpu.temperature}°C). Active WebGL: ${activeRendererString || 'Default'}. Click to open GPU Control Center.`}
              style={{
                fontSize: '0.75rem',
                color: '#f8fafc',
                background: 'rgba(118, 185, 0, 0.08)',
                padding: '3px 10px',
                borderRadius: '999px',
                border: '1px solid rgba(118, 185, 0, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: '0 0 10px rgba(118, 185, 0, 0.15)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(118, 185, 0, 0.16)';
                e.currentTarget.style.borderColor = 'rgba(118, 185, 0, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(118, 185, 0, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(118, 185, 0, 0.35)';
              }}
            >
              <Zap size={12} color="#76b900" />
              <span style={{ fontWeight: 600 }}>
                {nvidiaTelemetry.primaryGpu.classification?.family
                  ? `${nvidiaTelemetry.primaryGpu.classification.family}`
                  : 'NVIDIA RTX'}
              </span>
              <span style={{ color: '#76b900', fontSize: '0.675rem', fontWeight: 700 }}>
                ● {nvidiaTelemetry.primaryGpu.temperature}°C
              </span>
            </button>
          )}

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

            {/* Storage Scope Indicator & Folder Pointer */}
            <button
              className="btn btn-secondary btn-whimsy"
              onClick={onOpenFolderModal}
              title={
                directories && directories.length > 0
                  ? `Storage Scoped: ${directories.map((d) => d.split('\\').pop() || d.split('/').pop() || d).join(', ')}`
                  : 'Zero Access Sandbox: Point to a folder to begin'
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                border: directories && directories.length > 0 ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(251, 191, 36, 0.4)',
                background: directories && directories.length > 0 ? 'rgba(52, 211, 153, 0.08)' : 'rgba(251, 191, 36, 0.08)',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: directories && directories.length > 0 ? '#34d399' : '#fbbf24',
                  boxShadow: directories && directories.length > 0 ? '0 0 8px #34d399' : '0 0 8px #fbbf24',
                }}
              />
              <FolderPlus size={14} style={{ color: directories && directories.length > 0 ? '#34d399' : '#fbbf24' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                {directories && directories.length > 0
                  ? directories.length === 1
                    ? `Scope: ${directories[0].split('\\').pop() || directories[0].split('/').pop() || 'Folder'}`
                    : `Scope: ${directories.length} Folders`
                  : 'Point Folder'}
              </span>
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

            {/* Global Settings Hub Button */}
            <button
              className="btn btn-secondary btn-whimsy"
              onClick={onOpenSettingsModal}
              title="Red Moon System & Multi-Media Settings (Press 'S')"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.45rem 0.85rem',
              }}
            >
              <Settings size={15} />
              <span>Settings</span>
              <kbd
                className="keycap"
                style={{
                  fontSize: '0.65rem',
                  padding: '1px 5px',
                  borderRadius: '3px',
                }}
              >
                S
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== MOBILE PHONE & TABLET COMPACT HEADER ==================== */}
      <div className="show-mobile" style={{ flexDirection: 'column', width: '100%', gap: '0.6rem' }}>
        {/* Row 1: Brand Logo & Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div
            className="brand-logo-bounce"
            onClick={handleLogoClick}
            title="Red Moon"
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
              }}
            >
              <Moon size={13} fill="#ffffff" stroke="none" />
              <span>RM</span>
            </div>
            <span
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                fontFamily: 'var(--font-display)',
              }}
            >
              RED <span style={{ color: 'var(--cinema-red)' }}>MOON</span>
            </span>
          </div>

          {/* Mobile Action Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="btn btn-secondary btn-icon"
              onClick={() => {
                setIsMobileSearchOpen(!isMobileSearchOpen);
                if (!isMobileSearchOpen) {
                  setTimeout(() => mobileSearchInputRef.current?.focus(), 100);
                }
              }}
              style={{ width: '36px', height: '36px', borderRadius: '8px' }}
              title="Search"
              aria-label="Search media"
            >
              <Search size={16} />
            </button>

            <button
              className="btn btn-secondary btn-icon"
              onClick={onRefreshMedia}
              disabled={isRefreshing}
              style={{ width: '36px', height: '36px', borderRadius: '8px' }}
              title="Refresh Media"
              aria-label="Refresh media"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            </button>

            <button
              className="btn btn-secondary btn-icon"
              onClick={onOpenFolderModal}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                borderColor: directories && directories.length > 0 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 191, 36, 0.4)',
                background: directories && directories.length > 0 ? 'rgba(52, 211, 153, 0.08)' : 'rgba(251, 191, 36, 0.08)',
              }}
              title="Storage Scope"
              aria-label="Storage Scope"
            >
              <FolderPlus size={16} style={{ color: directories && directories.length > 0 ? '#34d399' : '#fbbf24' }} />
            </button>

            <button
              className="btn btn-netflix btn-icon"
              onClick={onOpenTailscaleModal}
              style={{ width: '36px', height: '36px', borderRadius: '8px', padding: 0 }}
              title="Stream to Phone"
              aria-label="Stream to Phone"
            >
              <ShieldCheck size={17} />
            </button>

            <button
              className="btn btn-secondary btn-icon"
              onClick={onOpenSettingsModal}
              style={{ width: '36px', height: '36px', borderRadius: '8px' }}
              title="Settings"
              aria-label="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Row 2: Animated Expandable Mobile Search Bar */}
        {(isMobileSearchOpen || searchQuery) && (
          <div style={{ position: 'relative', width: '100%', animation: 'fadeIn 0.2s ease' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--cinema-red)',
              }}
            />
            <input
              ref={mobileSearchInputRef}
              type="text"
              placeholder="Search movies, series, songs..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 2.4rem 0.55rem 2.2rem',
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid var(--cinema-red)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.85rem',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
            <button
              onClick={() => {
                if (searchQuery) onSearchChange('');
                else setIsMobileSearchOpen(false);
              }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Row 3: Horizontal Swipeable Category Tabs */}
        <nav
          className="scroll-snap-x"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            padding: '2px 0 4px',
            width: '100%',
          }}
        >
          {[
            { id: 'home', label: 'Home' },
            { id: 'video', label: 'Videos' },
            { id: 'audio', label: 'Music' },
            { id: 'mylist', label: 'My List' },
            { id: 'queue', label: 'My Queue' },
            { id: 'settings', label: 'Settings' },
          ].map((tab) => {
            const isActive = activeNavTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavTabChange(tab.id as NavTab)}
                className="scroll-snap-item"
                style={{
                  background: isActive ? 'var(--cinema-red)' : 'rgba(255, 255, 255, 0.05)',
                  border: isActive ? '1px solid var(--cinema-red)' : '1px solid var(--cinema-border)',
                  padding: '5px 14px',
                  borderRadius: '999px',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontSize: '0.785rem',
                  fontWeight: isActive ? 700 : 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  boxShadow: isActive ? '0 2px 10px var(--cinema-red-glow)' : 'none',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Row 4: Compact Sub-Row (View Mode & Live Status) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingTop: '2px' }}>
          {/* View Mode Switcher */}
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
                padding: '4px 7px',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
              }}
              title="Rails View"
            >
              <Layers size={13} />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              style={{
                background: viewMode === 'grid' ? '#1e293b' : 'transparent',
                color: viewMode === 'grid' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 7px',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
              }}
              title="Grid View"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              style={{
                background: viewMode === 'table' ? '#1e293b' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 7px',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
              }}
              title="Table View"
            >
              <List size={13} />
            </button>
          </div>

          {/* Compact Telemetry & Network Chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '0.7rem',
                color: network?.tailscaleDetected ? '#34d399' : '#fbbf24',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '2px 8px',
                borderRadius: '999px',
                border: '1px solid var(--cinema-border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: network?.tailscaleDetected ? '#34d399' : '#fbbf24' }} />
              <span>{network?.tailscaleDetected ? 'Tailscale Active' : 'Local'}</span>
            </span>

            {nvidiaTelemetry?.available && nvidiaTelemetry?.primaryGpu && (
              <button
                onClick={onOpenNvidiaModal}
                style={{
                  fontSize: '0.7rem',
                  color: '#76b900',
                  background: 'rgba(118, 185, 0, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  border: '1px solid rgba(118, 185, 0, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Zap size={10} color="#76b900" />
                <span>{nvidiaTelemetry.primaryGpu.temperature}°C</span>
              </button>
            )}
          </div>
        </div>
      </div>

    </header>
  );
};
