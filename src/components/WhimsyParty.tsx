import React, { useEffect, useState } from 'react';

interface Particle {
  id: number;
  emoji: string;
  left: number;
  duration: number;
  delay: number;
  size: number;
}

interface WhimsyPartyProps {
  isActive: boolean;
  onComplete: () => void;
}

const PARTY_EMOJIS = ['🎵', '🎶', '✨', '🎧', '🎸', '🍿', '🔥', '🎷', '⚡', '🛸'];

export const WhimsyParty: React.FC<WhimsyPartyProps> = ({ isActive, onComplete }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!isActive) {
      setParticles([]);
      return;
    }

    // Generate 25 playful floating particles
    const items: Particle[] = Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      emoji: PARTY_EMOJIS[Math.floor(Math.random() * PARTY_EMOJIS.length)],
      left: Math.random() * 94 + 3, // 3% to 97%
      duration: Math.random() * 2.2 + 2.5, // 2.5s - 4.7s
      delay: Math.random() * 1.8, // 0 - 1.8s
      size: Math.floor(Math.random() * 16 + 20), // 20px - 36px
    }));

    setParticles(items);

    const timer = setTimeout(() => {
      onComplete();
    }, 5500);

    return () => clearTimeout(timer);
  }, [isActive, onComplete]);

  if (!isActive || particles.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10040,
        overflow: 'hidden',
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="whimsy-floating-emoji"
          style={{
            position: 'absolute',
            bottom: '-40px',
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5))',
          }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
};
