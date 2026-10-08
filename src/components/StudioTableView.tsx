import React, { useState } from 'react';
import { MediaItem } from '../types/media';
import { Play, Plus, Film, Music, ArrowUpDown } from 'lucide-react';
import { cleanMediaTitle, formatFolderLabel } from '../utils/mediaFormatter';

interface StudioTableViewProps {
  items: MediaItem[];
  currentAudioId: string | null;
  isPlayingAudio: boolean;
  onPlayVideo: (item: MediaItem) => void;
  onPlayAudio: (item: MediaItem) => void;
  onQueueAudio: (item: MediaItem) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const StudioTableView: React.FC<StudioTableViewProps> = ({
  items,
  currentAudioId,
  isPlayingAudio,
  onPlayVideo,
  onPlayAudio,
  onQueueAudio,
}) => {
  const [sortField, setSortField] = useState<'name' | 'size' | 'ext' | 'mtime'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: 'name' | 'size' | 'ext' | 'mtime') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    let comp = 0;
    if (sortField === 'name') comp = a.name.localeCompare(b.name);
    else if (sortField === 'size') comp = a.size - b.size;
    else if (sortField === 'ext') comp = a.ext.localeCompare(b.ext);
    else if (sortField === 'mtime') comp = new Date(a.mtime).getTime() - new Date(b.mtime).getTime();
    return sortAsc ? comp : -comp;
  });

  return (
    <div
      className="chassis-panel"
      style={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-plate)',
      }}
    >
      <table className="studio-table" style={{ minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: '40px', textAlign: 'center' }}>#</th>
            <th
              onClick={() => handleSort('name')}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Title <ArrowUpDown size={12} />
              </div>
            </th>
            <th
              className="hide-mobile"
              onClick={() => handleSort('ext')}
              style={{ width: '90px', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Format <ArrowUpDown size={12} />
              </div>
            </th>
            <th
              className="hide-mobile"
              onClick={() => handleSort('size')}
              style={{ width: '100px', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Size <ArrowUpDown size={12} />
              </div>
            </th>
            <th className="hide-mobile" style={{ width: '120px' }}>Folder</th>
            <th style={{ width: '90px', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item, idx) => {
            const isVideo = item.type === 'video';
            const isCurrent = currentAudioId === item.id;
            const { title, artist } = cleanMediaTitle(item.name);

            return (
              <tr
                key={item.id}
                className={isCurrent ? 'active-row' : ''}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  if (isVideo) onPlayVideo(item);
                  else onPlayAudio(item);
                }}
              >
                <td style={{ textAlign: 'center', color: isCurrent ? 'var(--accent-laser)' : 'var(--text-muted)' }}>
                  {isCurrent && isPlayingAudio ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '2px', height: '14px' }}>
                      <span className="soundwave-bar" />
                      <span className="soundwave-bar" />
                      <span className="soundwave-bar" />
                    </div>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{idx + 1}</span>
                  )}
                </td>

                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-xs)',
                        background: isVideo ? 'rgba(56, 189, 248, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isVideo ? 'var(--accent-laser)' : 'var(--accent-amber)',
                        flexShrink: 0,
                      }}
                    >
                      {isVideo ? <Film size={15} /> : <Music size={15} />}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: isCurrent ? 600 : 400,
                          color: isCurrent ? '#ffffff' : 'var(--text-primary)',
                          fontFamily: 'var(--font-sans)',
                          lineHeight: '1.3',
                        }}
                      >
                        {title}
                      </div>
                      {artist && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.2' }}>
                          {artist}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="hide-mobile">
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.725rem',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      background: 'var(--surface-inset)',
                      border: '1px solid var(--border-subtle)',
                      color: isVideo ? '#38bdf8' : '#fbbf24',
                    }}
                  >
                    .{item.ext}
                  </span>
                </td>

                <td className="hide-mobile" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {formatBytes(item.size)}
                </td>

                <td className="hide-mobile">
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                    }}
                  >
                    {formatFolderLabel(item.folder)}
                  </span>
                </td>

                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '4px' }}>
                    <button
                      className="btn btn-secondary btn-icon btn-whimsy"
                      style={{ width: '28px', height: '28px' }}
                      title={isVideo ? 'Watch video' : 'Play song'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isVideo) onPlayVideo(item);
                        else onPlayAudio(item);
                      }}
                    >
                      <Play size={13} />
                    </button>

                    {!isVideo && (
                      <button
                        className="btn btn-secondary btn-icon btn-whimsy"
                        style={{ width: '28px', height: '28px' }}
                        title="Add to queue"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQueueAudio(item);
                        }}
                      >
                        <Plus size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
