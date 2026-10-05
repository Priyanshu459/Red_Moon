import React from 'react';
import { Sparkles, Music, CheckCircle } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  icon?: 'sparkles' | 'music' | 'check';
  badge?: string;
}

interface WhimsyToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const WhimsyToast: React.FC<WhimsyToastProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '86px',
        left: '24px',
        zIndex: 10050,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="whimsy-toast-enter"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(56, 189, 248, 0.25)',
            borderRadius: '999px',
            color: '#f8fafc',
            fontSize: '0.825rem',
            fontWeight: 500,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #38bdf8, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#090a0f',
              flexShrink: 0,
            }}
          >
            {toast.icon === 'music' ? (
              <Music size={12} />
            ) : toast.icon === 'check' ? (
              <CheckCircle size={12} />
            ) : (
              <Sparkles size={12} />
            )}
          </div>
          <span>{toast.text}</span>
          {toast.badge && (
            <span
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                padding: '1px 6px',
                borderRadius: '999px',
              }}
            >
              {toast.badge}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
