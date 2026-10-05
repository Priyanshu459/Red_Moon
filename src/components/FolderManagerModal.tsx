import React, { useState, useEffect } from 'react';
import {
  X,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  HardDrive,
  Check,
  Film,
  Music,
  Download,
  FileText,
  Sparkles,
  Loader2,
  ArrowUp
} from 'lucide-react';
import { SuggestedFolder } from '../types/media';

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  directories: string[];
  onAddDirectory: (path: string) => Promise<boolean>;
  onRemoveDirectory: (path: string) => Promise<void>;
  onRefreshMedia: () => void;
  authToken?: string | null;
}

interface DirectoryBrowseState {
  currentPath: string;
  parentPath: string | null;
  subdirectories: Array<{ name: string; path: string }>;
  mediaFilesCount: number;
}

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  onClose,
  directories,
  onAddDirectory,
  onRemoveDirectory,
  onRefreshMedia,
  authToken,
}) => {
  const [newFolderPath, setNewFolderPath] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpeningDialog, setIsOpeningDialog] = useState(false);

  // Suggested quick-add folders
  const [suggestedFolders, setSuggestedFolders] = useState<SuggestedFolder[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // In-modal directory browser state
  const [showExplorer, setShowExplorer] = useState(false);
  const [browseState, setBrowseState] = useState<DirectoryBrowseState | null>(null);
  const [browsingPath, setBrowsingPath] = useState<string>('');
  const [loadingBrowse, setLoadingBrowse] = useState(false);

  // Fetch suggested folders when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const headers: Record<string, string> = {};
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        const url = authToken
          ? `/api/system/suggested-folders?token=${encodeURIComponent(authToken)}`
          : '/api/system/suggested-folders';
        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.folders)) {
            setSuggestedFolders(data.folders);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [isOpen, directories, authToken]);

  // Browse directory tree helper
  const loadDirectory = async (targetPath: string = '') => {
    setLoadingBrowse(true);
    setErrorMsg(null);
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const url = authToken
        ? `/api/system/browse-folders?path=${encodeURIComponent(targetPath)}&token=${encodeURIComponent(authToken)}`
        : `/api/system/browse-folders?path=${encodeURIComponent(targetPath)}`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBrowseState({
            currentPath: data.currentPath,
            parentPath: data.parentPath,
            subdirectories: data.subdirectories || [],
            mediaFilesCount: data.mediaFilesCount || 0,
          });
          setBrowsingPath(data.currentPath);
        }
      }
    } catch {
      setErrorMsg('Failed to browse folder on host');
    } finally {
      setLoadingBrowse(false);
    }
  };

  const toggleExplorer = () => {
    if (!showExplorer && !browseState) {
      loadDirectory('');
    }
    setShowExplorer(!showExplorer);
  };

  // Open native Windows Folder Picker Dialog
  const handleOpenNativeDialog = async () => {
    setIsOpeningDialog(true);
    setErrorMsg(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const url = authToken
        ? `/api/system/dialog-folder?token=${encodeURIComponent(authToken)}`
        : '/api/system/dialog-folder';

      const res = await fetch(url, { method: 'POST', headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.selectedPath) {
          setNewFolderPath(data.selectedPath);
          // Directly add the selected folder
          const added = await onAddDirectory(data.selectedPath);
          if (added) {
            setNewFolderPath('');
            onRefreshMedia();
          }
        } else if (data.cancelled) {
          // User clicked cancel in Windows explorer, no error needed
        } else if (data.error) {
          setErrorMsg(data.error);
        }
      }
    } catch {
      setErrorMsg('Could not open Windows folder selector dialog');
    } finally {
      setIsOpeningDialog(false);
    }
  };

  if (!isOpen) return null;

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const pathToSubmit = newFolderPath.trim();

    if (!pathToSubmit) {
      // If user clicks Add / + when input is empty, trigger the native file dialog or open explorer!
      handleOpenNativeDialog();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const success = await onAddDirectory(pathToSubmit);
    setIsSubmitting(false);

    if (success) {
      setNewFolderPath('');
      onRefreshMedia();
    } else {
      setErrorMsg('Directory path does not exist on this machine or is inaccessible.');
    }
  };

  const handleQuickAdd = async (folderPath: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    const success = await onAddDirectory(folderPath);
    setIsSubmitting(false);
    if (success) {
      onRefreshMedia();
    } else {
      setErrorMsg('Could not add folder');
    }
  };

  const getFolderIcon = (type: string) => {
    switch (type) {
      case 'videos':
        return <Film size={15} color="#e50914" />;
      case 'music':
        return <Music size={15} color="#38bdf8" />;
      case 'downloads':
        return <Download size={15} color="#34d399" />;
      default:
        return <FileText size={15} color="#fbbf24" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel animate-modal-enter"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          background: 'linear-gradient(175deg, #101524 0%, #0a0d16 100%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <HardDrive size={20} color="var(--cinema-red)" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Media Library Folders
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, marginTop: '2px' }}>
                Point Red Moon to videos, films, or songs on your laptop
              </p>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-icon"
            onClick={onClose}
            style={{ width: '32px', height: '32px' }}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
          
          {/* Section 1: Active Watched Folders */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Currently Indexed ({directories.length})
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '160px', overflowY: 'auto' }}>
              {directories.map((dir) => (
                <div
                  key={dir}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.825rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <Folder size={16} color="var(--cinema-red)" style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dir}
                    </span>
                  </div>

                  <button
                    className="btn btn-secondary btn-icon"
                    style={{ width: '28px', height: '28px', flexShrink: 0 }}
                    onClick={async () => {
                      await onRemoveDirectory(dir);
                      onRefreshMedia();
                    }}
                    title="Remove folder from library"
                  >
                    <Trash2 size={13} color="#f87171" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Quick-Add Suggested Folders */}
          {(suggestedFolders.length > 0 || loadingSuggestions) && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                <Sparkles size={14} color="#fbbf24" />
                <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Quick Add Common Locations
                </span>
                {loadingSuggestions && <Loader2 size={12} className="animate-spin" color="#94a3b8" />}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {suggestedFolders.map((item) => (
                  <button
                    key={item.path}
                    className="btn"
                    disabled={isSubmitting || item.alreadyAdded}
                    onClick={() => handleQuickAdd(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      background: item.alreadyAdded ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                      border: item.alreadyAdded ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: item.alreadyAdded ? 'default' : 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      {getFolderIcon(item.type)}
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: item.alreadyAdded ? '#34d399' : '#f8fafc' }}>
                          {item.name}
                        </span>
                        {item.mediaCount > 0 && (
                          <span style={{ fontSize: '0.675rem', color: '#94a3b8' }}>
                            {item.mediaCount} media
                          </span>
                        )}
                      </div>
                    </div>

                    {item.alreadyAdded ? (
                      <Check size={14} color="#34d399" style={{ flexShrink: 0 }} />
                    ) : (
                      <Plus size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Native PC Folder Dialog & In-Modal Browser */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>
                Select Any Folder on This Computer
              </label>

              {/* Toggle in-modal explorer */}
              <button
                type="button"
                onClick={toggleExplorer}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <FolderOpen size={13} />
                <span>{showExplorer ? 'Hide Folder Tree' : 'Explore Folder Tree'}</span>
              </button>
            </div>

            {/* Folder Explorer Tree (collapsible) */}
            {showExplorer && (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {/* Explorer Breadcrumb bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem' }}>
                  {browseState?.parentPath && (
                    <button
                      className="btn btn-secondary btn-icon"
                      style={{ width: '26px', height: '26px', padding: 0 }}
                      onClick={() => loadDirectory(browseState.parentPath!)}
                      title="Go up to parent folder"
                    >
                      <ArrowUp size={13} />
                    </button>
                  )}
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {browsingPath || 'Home Directory'}
                  </span>
                  <button
                    className="btn btn-primary"
                    style={{ marginLeft: 'auto', minHeight: '26px', height: '26px', padding: '0 0.6rem', fontSize: '0.725rem' }}
                    onClick={() => {
                      if (browsingPath) {
                        setNewFolderPath(browsingPath);
                        onAddDirectory(browsingPath).then((ok) => {
                          if (ok) {
                            setNewFolderPath('');
                            onRefreshMedia();
                          }
                        });
                      }
                    }}
                  >
                    Select This Folder
                  </button>
                </div>

                {/* Subfolder list */}
                {loadingBrowse ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Loading folders...</span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px' }}>
                    {browseState?.subdirectories.map((sub) => (
                      <button
                        key={sub.path}
                        onClick={() => loadDirectory(sub.path)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.4rem 0.6rem',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '4px',
                          color: '#e2e8f0',
                          fontSize: '0.775rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          overflow: 'hidden',
                        }}
                      >
                        <Folder size={13} color="#38bdf8" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sub.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Input and Action Buttons */}
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Paste folder path or click 'Browse PC'..."
                  value={newFolderPath}
                  onChange={(e) => setNewFolderPath(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#f8fafc',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.825rem',
                  }}
                />

                {/* Native Windows File Dialog Button */}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleOpenNativeDialog}
                  disabled={isOpeningDialog}
                  style={{
                    minHeight: '40px',
                    height: '40px',
                    padding: '0 0.9rem',
                    fontSize: '0.825rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                  }}
                  title="Open Windows File Explorer folder picker"
                >
                  {isOpeningDialog ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <FolderOpen size={16} color="var(--cinema-red)" />
                  )}
                  <span>Browse PC...</span>
                </button>

                {/* Add Button */}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{
                    minHeight: '40px',
                    height: '40px',
                    padding: '0 1.1rem',
                    fontSize: '0.825rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--cinema-red)',
                  }}
                  title={newFolderPath.trim() ? 'Add specified folder' : 'Browse and add folder'}
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  <span>Add</span>
                </button>
              </div>

              {errorMsg && (
                <div style={{ fontSize: '0.775rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠️ {errorMsg}</span>
                </div>
              )}
            </form>
          </div>

          {/* Footer note */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-glass)' }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.45rem 1.25rem' }}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
