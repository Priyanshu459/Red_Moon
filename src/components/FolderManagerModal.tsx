import React, { useState, useEffect, useRef } from 'react';
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
  ArrowUp,
  Shield,
  ShieldAlert,
  FolderCheck,
  AlertCircle,
  Lock,
  Search
} from 'lucide-react';
import { SuggestedFolder } from '../types/media';

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  directories: string[];
  onAddDirectory: (path: string) => Promise<boolean>;
  onSetSingleDirectory?: (path: string) => Promise<boolean>;
  onRemoveDirectory: (path: string) => Promise<void>;
  onRevokeAllDirectories?: () => Promise<void>;
  onRefreshMedia: () => void;
  authToken?: string | null;
}

interface DirectoryBrowseState {
  currentPath: string;
  parentPath: string | null;
  subdirectories: Array<{ name: string; path: string }>;
  mediaFilesCount: number;
  availableDrives?: string[];
}

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  onClose,
  directories,
  onAddDirectory,
  onSetSingleDirectory,
  onRemoveDirectory,
  onRevokeAllDirectories,
  onRefreshMedia,
  authToken,
}) => {
  const [newFolderPath, setNewFolderPath] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpeningDialog, setIsOpeningDialog] = useState(false);
  const [pointingMode, setPointingMode] = useState<'single' | 'add'>('single');

  // Suggested quick-add folders
  const [suggestedFolders, setSuggestedFolders] = useState<SuggestedFolder[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // In-modal directory browser state (Active by default for guaranteed cross-platform access)
  const [browseState, setBrowseState] = useState<DirectoryBrowseState | null>(null);
  const [browsingPath, setBrowsingPath] = useState<string>('');
  const [loadingBrowse, setLoadingBrowse] = useState(false);
  const [folderFilter, setFolderFilter] = useState<string>('');

  // Abort controller for native dialog
  const dialogAbortRef = useRef<AbortController | null>(null);

  // Fetch suggested folders and initialize directory browser when modal opens
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

    // Immediately load root/home directory for the visual browser
    if (!browseState) {
      loadDirectory('');
    }
  }, [isOpen, directories, authToken]);

  // Clear messages after 4 seconds
  useEffect(() => {
    if (!successMsg && !errorMsg) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
      setErrorMsg(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [successMsg, errorMsg]);

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
            availableDrives: data.availableDrives || [],
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

  // Open native Windows Folder Picker Dialog
  const handleOpenNativeDialog = async (overrideMode?: 'single' | 'add') => {
    if (dialogAbortRef.current) {
      dialogAbortRef.current.abort();
    }
    const controller = new AbortController();
    dialogAbortRef.current = controller;

    setIsOpeningDialog(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const mode = overrideMode || pointingMode;

    const timeoutId = setTimeout(() => {
      controller.abort();
      setIsOpeningDialog(false);
      setErrorMsg('Folder dialog request timed out. You can select your folder directly using the visual explorer below.');
      handleCancelDialog();
    }, 24000);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const url = authToken
        ? `/api/system/dialog-folder?token=${encodeURIComponent(authToken)}`
        : '/api/system/dialog-folder';

      const res = await fetch(url, { method: 'POST', headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.selectedPath) {
          const selected = data.selectedPath;
          setNewFolderPath(selected);

          let ok = false;
          if (mode === 'single' && onSetSingleDirectory) {
            ok = await onSetSingleDirectory(selected);
          } else {
            ok = await onAddDirectory(selected);
          }

          if (ok) {
            setNewFolderPath('');
            setSuccessMsg(`Pointed storage to: ${selected}`);
            loadDirectory(selected);
            onRefreshMedia();
          } else {
            setErrorMsg('Could not point to selected folder.');
          }
        } else if (data.cancelled) {
          // User clicked cancel in Windows explorer
        } else if (data.error) {
          setErrorMsg(data.error);
        }
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled or timeout
      } else {
        setErrorMsg('Could not open Windows folder selector dialog. Use the interactive browser below.');
      }
    } finally {
      setIsOpeningDialog(false);
      dialogAbortRef.current = null;
    }
  };

  const handleCancelDialog = async () => {
    if (dialogAbortRef.current) {
      dialogAbortRef.current.abort();
      dialogAbortRef.current = null;
    }
    setIsOpeningDialog(false);
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const url = authToken
        ? `/api/system/dialog-folder/cancel?token=${encodeURIComponent(authToken)}`
        : '/api/system/dialog-folder/cancel';
      await fetch(url, { method: 'POST', headers });
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  // Handle manual input pointing
  const handleExecutePoint = async (e?: React.FormEvent, forceMode?: 'single' | 'add') => {
    if (e) e.preventDefault();
    const pathToSubmit = newFolderPath.trim();
    const mode = forceMode || pointingMode;

    if (!pathToSubmit) {
      handleOpenNativeDialog(mode);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    let success = false;
    if (mode === 'single' && onSetSingleDirectory) {
      success = await onSetSingleDirectory(pathToSubmit);
    } else {
      success = await onAddDirectory(pathToSubmit);
    }
    setIsSubmitting(false);

    if (success) {
      setNewFolderPath('');
      setSuccessMsg(
        mode === 'single'
          ? `Storage pointed exclusively to: ${pathToSubmit}`
          : `Added folder to storage scope: ${pathToSubmit}`
      );
      onRefreshMedia();
    } else {
      setErrorMsg('Directory path does not exist on this machine or is inaccessible.');
    }
  };

  const handleQuickAdd = async (folderPath: string, mode: 'single' | 'add' = 'single') => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    let success = false;
    if (mode === 'single' && onSetSingleDirectory) {
      success = await onSetSingleDirectory(folderPath);
    } else {
      success = await onAddDirectory(folderPath);
    }
    setIsSubmitting(false);

    if (success) {
      setSuccessMsg(`Storage pointed to: ${folderPath}`);
      onRefreshMedia();
    } else {
      setErrorMsg('Could not point to folder');
    }
  };

  const handleRevokeSingle = async (path: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    await onRemoveDirectory(path);
    setSuccessMsg(`Revoked access to: ${path}`);
    onRefreshMedia();
  };

  const handleRevokeAll = async () => {
    if (!onRevokeAllDirectories) return;
    if (!window.confirm('Revoke access to ALL storage folders? Red Moon will have zero access to files until you point a folder again.')) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    await onRevokeAllDirectories();
    setSuccessMsg('All storage access revoked. Strict sandbox is empty.');
    onRefreshMedia();
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
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(16px)',
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
          maxWidth: '680px',
          maxHeight: '92vh',
          background: 'linear-gradient(175deg, #0d1220 0%, #070911 100%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 28px 70px rgba(0, 0, 0, 0.9)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(229, 9, 20, 0.12)',
                border: '1px solid rgba(229, 9, 20, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={20} color="var(--cinema-red)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Storage Scope & Sandboxing
                </h3>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: directories.length > 0 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                    color: directories.length > 0 ? '#34d399' : '#fbbf24',
                    border: `1px solid ${directories.length > 0 ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                  }}
                >
                  {directories.length > 0 ? 'Scoped Access' : 'Zero Access (Sandboxed)'}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, marginTop: '2px' }}>
                Red Moon only has access to the storage folder(s) you explicitly point it to.
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
          
          {/* Notifications */}
          {successMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.65rem 0.9rem',
                background: 'rgba(52, 211, 153, 0.12)',
                border: '1px solid rgba(52, 211, 153, 0.35)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: '#34d399',
              }}
            >
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.65rem 0.9rem',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: '#f87171',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Active Storage Scope */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={13} color="#94a3b8" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Current Storage Scope ({directories.length} pointed)
                </span>
              </div>

              {directories.length > 0 && onRevokeAllDirectories && (
                <button
                  type="button"
                  onClick={handleRevokeAll}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f87171',
                    fontSize: '0.725rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title="Revoke access to all storage folders"
                >
                  <Trash2 size={12} />
                  <span>Revoke All Access</span>
                </button>
              )}
            </div>

            {directories.length === 0 ? (
              <div
                style={{
                  padding: '1rem',
                  background: 'rgba(251, 191, 36, 0.05)',
                  border: '1px dashed rgba(251, 191, 36, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <ShieldAlert size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fbbf24', margin: 0 }}>
                    No Storage Access Granted
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 0', lineHeight: 1.45 }}>
                    Red Moon has zero access to your computer's files right now. Use the controls below to point to the specific folder you want to stream from.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '130px', overflowY: 'auto' }}>
                {directories.map((dir) => (
                  <div
                    key={dir}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.85rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.825rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <FolderCheck size={16} color="#34d399" style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          color: '#e2e8f0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.8rem',
                        }}
                      >
                        {dir}
                      </span>
                    </div>

                    <button
                      className="btn btn-secondary btn-icon"
                      style={{ width: '28px', height: '28px', flexShrink: 0 }}
                      onClick={() => handleRevokeSingle(dir)}
                      title="Revoke access to this folder"
                    >
                      <Trash2 size={13} color="#f87171" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Point Storage Controls */}
          <div
            style={{
              padding: '1.1rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#f8fafc' }}>
                  Point Red Moon to a Folder
                </span>
                <p style={{ fontSize: '0.725rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  Choose whether to point to one sole folder or expand multi-folder scope.
                </p>
              </div>

              {/* Scope Mode Selector */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '6px',
                  padding: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setPointingMode('single')}
                  style={{
                    padding: '3px 9px',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: pointingMode === 'single' ? 'var(--cinema-red)' : 'transparent',
                    color: pointingMode === 'single' ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.15s ease',
                  }}
                  title="Points strictly to this folder, replacing any previously pointed paths"
                >
                  Sole Folder
                </button>
                <button
                  type="button"
                  onClick={() => setPointingMode('add')}
                  style={{
                    padding: '3px 9px',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: pointingMode === 'add' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: pointingMode === 'add' ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.15s ease',
                  }}
                  title="Adds this folder alongside existing pointed folders"
                >
                  + Add Folder
                </button>
              </div>
            </div>

            {/* Quick 1-Click Native Windows Explorer Picker Button */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '0.75rem 1rem',
                background: 'rgba(229, 9, 20, 0.06)',
                border: '1px solid rgba(229, 9, 20, 0.25)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderOpen size={18} color="var(--cinema-red)" />
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#f8fafc' }}>
                      Windows File Explorer Picker
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      Opens the native Windows folder selection window on your computer
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleOpenNativeDialog()}
                  disabled={isOpeningDialog}
                  style={{
                    minHeight: '34px',
                    height: '34px',
                    padding: '0 0.9rem',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--cinema-red)',
                    flexShrink: 0,
                  }}
                >
                  {isOpeningDialog ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <FolderOpen size={15} />
                  )}
                  <span>Browse PC...</span>
                </button>
              </div>

              {/* Active Dialog Feedback & Cancel Controller */}
              {isOpeningDialog && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: '#38bdf8',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Windows dialog opened on your desktop. Look for the window in front or on your taskbar.</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: '24px', height: '24px', padding: '0 8px', fontSize: '0.7rem' }}
                    onClick={handleCancelDialog}
                  >
                    Cancel Dialog
                  </button>
                </div>
              )}
            </div>

            {/* Manual Path Input form */}
            <form onSubmit={handleExecutePoint} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Paste folder path (e.g. D:\Movies or C:\Users\Media)..."
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

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{
                    minHeight: '38px',
                    height: '38px',
                    padding: '0 1rem',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: pointingMode === 'single' ? 'var(--cinema-red)' : 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {isSubmitting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : pointingMode === 'single' ? (
                    <FolderCheck size={15} />
                  ) : (
                    <Plus size={15} />
                  )}
                  <span>{pointingMode === 'single' ? 'Point Sole' : 'Add Scope'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: Interactive Visual Folder Browser (Primary Cross-Platform Navigator) */}
          <div
            style={{
              padding: '1.1rem',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HardDrive size={15} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                  Interactive PC Folder Browser
                </span>
                <span style={{ fontSize: '0.675rem', color: '#94a3b8' }}>
                  (Click any folder to navigate & point directly)
                </span>
              </div>

              {/* Quick Drive Switcher Chips */}
              {browseState?.availableDrives && browseState.availableDrives.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {browseState.availableDrives.map((drive) => (
                    <button
                      key={drive}
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        minHeight: '22px',
                        height: '22px',
                        padding: '0 7px',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                        background: browsingPath.toLowerCase().startsWith(drive.toLowerCase())
                          ? 'rgba(56, 189, 248, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                        borderColor: browsingPath.toLowerCase().startsWith(drive.toLowerCase())
                          ? 'rgba(56, 189, 248, 0.5)'
                          : 'var(--border-glass)',
                        color: browsingPath.toLowerCase().startsWith(drive.toLowerCase())
                          ? '#38bdf8'
                          : '#cbd5e1',
                      }}
                      onClick={() => loadDirectory(drive)}
                    >
                      {drive}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Breadcrumb Navigation Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.5rem 0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {browseState?.parentPath && (
                <button
                  type="button"
                  className="btn btn-secondary btn-icon"
                  style={{ width: '26px', height: '26px', padding: 0, flexShrink: 0 }}
                  onClick={() => loadDirectory(browseState.parentPath!)}
                  title="Go up to parent folder"
                >
                  <ArrowUp size={13} />
                </button>
              )}

              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: '#38bdf8',
                  fontSize: '0.775rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {browsingPath || 'Home Directory'}
              </span>

              {browsingPath && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    minHeight: '28px',
                    height: '28px',
                    padding: '0 0.8rem',
                    fontSize: '0.75rem',
                    background: pointingMode === 'single' ? 'var(--cinema-red)' : 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                  onClick={() => {
                    if (pointingMode === 'single' && onSetSingleDirectory) {
                      onSetSingleDirectory(browsingPath).then((ok) => {
                        if (ok) {
                          setSuccessMsg(`Pointed storage to: ${browsingPath}`);
                          onRefreshMedia();
                        }
                      });
                    } else {
                      onAddDirectory(browsingPath).then((ok) => {
                        if (ok) {
                          setSuccessMsg(`Added folder to scope: ${browsingPath}`);
                          onRefreshMedia();
                        }
                      });
                    }
                  }}
                >
                  <FolderCheck size={13} />
                  <span>{pointingMode === 'single' ? 'Point Sole Folder' : '+ Add to Scope'}</span>
                </button>
              )}
            </div>

            {/* Subfolders Filter & Grid */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.35rem 0.65rem',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                placeholder="Filter folders in this directory..."
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#f8fafc',
                  fontSize: '0.75rem',
                }}
              />
              {folderFilter && (
                <button
                  type="button"
                  onClick={() => setFolderFilter('')}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', padding: '0 4px' }}
                >
                  ✕
                </button>
              )}
            </div>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem',
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              {loadingBrowse ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem', color: '#94a3b8', fontSize: '0.775rem' }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Loading directories...</span>
                </div>
              ) : (() => {
                const filtered = (browseState?.subdirectories || []).filter((sub) =>
                  sub.name.toLowerCase().includes(folderFilter.toLowerCase())
                );
                return filtered.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px' }}>
                    {filtered.map((sub) => (
                      <button
                        key={sub.path}
                        type="button"
                        onClick={() => {
                          setFolderFilter('');
                          loadDirectory(sub.path);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.45rem 0.65rem',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '4px',
                          color: '#e2e8f0',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          overflow: 'hidden',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        }}
                      >
                        <Folder size={13} color="#38bdf8" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sub.name}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.75rem', textAlign: 'center' }}>
                    {folderFilter
                      ? `No folders matching "${folderFilter}".`
                      : "No subdirectories inside this folder. Click 'Point Sole Folder' above to use this location."}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Section 4: Quick-Add Suggested Folders */}
          {(suggestedFolders.length > 0 || loadingSuggestions) && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                <Sparkles size={14} color="#fbbf24" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Quick Point Common Locations
                </span>
                {loadingSuggestions && <Loader2 size={12} className="animate-spin" color="#94a3b8" />}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '8px' }}>
                {suggestedFolders.map((item) => (
                  <button
                    key={item.path}
                    className="btn"
                    disabled={isSubmitting || item.alreadyAdded}
                    onClick={() => handleQuickAdd(item.path, pointingMode)}
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

          {/* Footer note & Done button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.25rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-glass)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.725rem', color: '#64748b' }}>
              <HardDrive size={13} />
              <span>Storage scoping is strictly enforced by Red Moon backend kernel.</span>
            </div>

            <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.45rem 1.25rem' }}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
