import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  width?: number;
  height?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  audioRef,
  width = 96,
  height = 28,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Initialize Web Audio API nodes when audio element is active
  useEffect(() => {
    if (!audioRef?.current) return;

    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 64; // 32 frequency bins
          analyserRef.current.smoothingTimeConstant = 0.8;

          sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
        }
      }

      if (audioContextRef.current?.state === 'suspended' && isPlaying) {
        audioContextRef.current.resume();
      }
    } catch {
      // In some browsers createMediaElementSource can throw if already attached
    }
  }, [audioRef, isPlaying]);

  // Render loop on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(32);

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArray);
      } else if (isPlaying) {
        // Fallback acoustic oscillation if Web Audio context is waiting for gesture
        phase += 0.15;
        for (let i = 0; i < 16; i++) {
          const wave = Math.sin(phase + i * 0.4) * 0.5 + 0.5;
          const damp = 1 - (i / 16) * 0.3;
          dataArray[i] = Math.floor(wave * 200 * damp);
        }
      } else {
        // Flatline idle state
        dataArray.fill(0);
      }

      const barCount = 16;
      const barWidth = Math.floor((width - (barCount - 1) * 2) / barCount);
      const gap = 2;

      for (let i = 0; i < barCount; i++) {
        const value = isPlaying ? dataArray[i] || 0 : 4;
        const percent = Math.min(1, Math.max(0.08, value / 255));
        const barHeight = Math.max(3, percent * height);
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        // Broadcast spectrum color gradient (Cyan to Amber to Scarlet)
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#06b6d4');   // Lows: Cyan
        gradient.addColorStop(0.7, '#38bdf8'); // Mids: Laser
        gradient.addColorStop(1, '#f59e0b');   // Peaks: Amber

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, width, height]);

  return (
    <div
      style={{
        background: 'var(--surface-inset)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xs)',
        padding: '3px 5px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)',
      }}
      title="Hardware Audio Frequency Spectrum Analyser"
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: 'block', width: `${width}px`, height: `${height}px` }}
      />
    </div>
  );
};
