import React from 'react';

interface KeycapBadgeProps {
  keys: string[];
  label?: string;
}

export const KeycapBadge: React.FC<KeycapBadgeProps> = ({ keys, label }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ display: 'inline-flex', gap: '3px' }}>
        {keys.map((k, i) => (
          <kbd key={i} className="keycap">
            {k}
          </kbd>
        ))}
      </div>
      {label && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {label}
        </span>
      )}
    </div>
  );
};
