export interface GpuEncodingSettings {
  hardwareEncoder: 'auto' | 'nvenc' | 'qsv' | 'amf' | 'webcodecs' | 'software';
  nvencPreset: 'p1' | 'p3' | 'p5' | 'p7';
  nvdecHardwareDecode: boolean;
  targetBitrate: 'auto' | '35000k' | '16000k' | '8000k' | '4000k' | '2000k';
  codecPreference: 'auto' | 'h264' | 'hevc' | 'av1' | 'vp9';
  gpuCompositing: boolean;
  windowsDirectXPreset: boolean;
  transcodeFramerate: 'source' | '60' | '30';
  customFfmpegPath: string;
}

export interface VideoPlaybackSettings {
  defaultQuality: 'auto' | '2160p' | '1440p' | '1080p' | '720p' | '480p';
  hoverPreviewAutoplay: boolean;
  hoverPreviewDelay: number; // in milliseconds (500, 1000, 1500)
  autoplayNext: boolean;
  autoResumePosition: boolean;
  defaultPlaybackSpeed: number;
  skipInterval: number; // in seconds (5, 10, 15, 30)
  colorGradingFilter: 'none' | 'vibrant' | 'cinema' | 'darkroom' | 'nightshift';
  frameDropWatchdog: boolean;
  subtitleSize: 'small' | 'medium' | 'large' | 'huge';
  subtitleColor: string;
  subtitleBackground: 'transparent' | 'subtle' | 'solid';
}

export interface AudioMultiMediaSettings {
  webAudioEngine: boolean;
  loudnessNormalization: boolean; // Night Mode / Dialogue Boost
  spatialSurround: boolean;
  equalizerPreset: 'flat' | 'bass_boost' | 'vocal' | 'cinema' | 'electronic' | 'rock' | 'custom';
  equalizerBands: number[]; // 10 gain values (-12 to +12 dB)
  defaultVolume: number; // 0.0 to 1.0
  visualizerMode: 'bars' | 'wave' | 'peaks' | 'glow';
  visualizerFps: 30 | 60 | 120;
}

export interface NetworkStreamingSettings {
  bufferMode: 'low_latency' | 'standard' | 'high_bandwidth';
  mobileDataSaver: boolean;
  tailscaleHttpsPreferred: boolean;
  customHostOverride: string;
}

export interface AppearanceEnvironmentSettings {
  themeAccent: 'crimson' | 'emerald' | 'cyan' | 'purple' | 'amber';
  enable3DSpace: boolean;
  starParticleCount: number;
  backdropBlur: 'none' | 'subtle' | 'deep';
  uiAnimations: boolean;
}

export interface LibraryStorageSettings {
  autoScanOnStartup: boolean;
  scanSubfolderDepth: number;
  cacheCleanInterval: 'never' | 'weekly' | 'monthly';
}

export interface RedMoonSettings {
  gpu: GpuEncodingSettings;
  video: VideoPlaybackSettings;
  audio: AudioMultiMediaSettings;
  network: NetworkStreamingSettings;
  appearance: AppearanceEnvironmentSettings;
  library: LibraryStorageSettings;
}

export const EQUALIZER_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQUALIZER_PRESETS: Record<string, { name: string; bands: number[] }> = {
  flat: {
    name: 'Flat (Studio Reference)',
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  bass_boost: {
    name: 'Bass Boost (Deep Punch)',
    bands: [6, 5, 4, 2, 0, 0, 0, 1, 2, 3],
  },
  vocal: {
    name: 'Vocal Clarity (Podcast / Dialogue)',
    bands: [-2, -1, 0, 2, 4, 5, 4, 2, 1, 0],
  },
  cinema: {
    name: 'Cinema Action (Expanded V-Shape)',
    bands: [5, 4, 2, 0, -1, 1, 3, 5, 6, 6],
  },
  electronic: {
    name: 'Electronic / EDM',
    bands: [5, 4, 2, 0, -2, 2, 1, 2, 4, 5],
  },
  rock: {
    name: 'Rock / Dynamic',
    bands: [4, 3, 1, 0, -1, 0, 2, 3, 4, 4],
  },
};

export const THEME_PRESETS = {
  crimson: {
    name: 'Red Moon Crimson',
    color: '#e50914',
    hover: '#b80710',
    glow: 'rgba(229, 9, 20, 0.4)',
  },
  emerald: {
    name: 'Cyber Emerald',
    color: '#10b981',
    hover: '#059669',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  cyan: {
    name: 'Electric Cyan',
    color: '#06b6d4',
    hover: '#0891b2',
    glow: 'rgba(6, 182, 212, 0.4)',
  },
  purple: {
    name: 'Amethyst Purple',
    color: '#a855f7',
    hover: '#9333ea',
    glow: 'rgba(168, 85, 247, 0.4)',
  },
  amber: {
    name: 'Solar Amber',
    color: '#f59e0b',
    hover: '#d97706',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
};

export const DEFAULT_REDMOON_SETTINGS: RedMoonSettings = {
  gpu: {
    hardwareEncoder: 'auto',
    nvencPreset: 'p5',
    nvdecHardwareDecode: true,
    targetBitrate: 'auto',
    codecPreference: 'auto',
    gpuCompositing: true,
    windowsDirectXPreset: true,
    transcodeFramerate: 'source',
    customFfmpegPath: '',
  },
  video: {
    defaultQuality: 'auto',
    hoverPreviewAutoplay: true,
    hoverPreviewDelay: 1000,
    autoplayNext: true,
    autoResumePosition: true,
    defaultPlaybackSpeed: 1.0,
    skipInterval: 10,
    colorGradingFilter: 'none',
    frameDropWatchdog: true,
    subtitleSize: 'medium',
    subtitleColor: '#ffffff',
    subtitleBackground: 'subtle',
  },
  audio: {
    webAudioEngine: true,
    loudnessNormalization: false,
    spatialSurround: false,
    equalizerPreset: 'flat',
    equalizerBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    defaultVolume: 0.85,
    visualizerMode: 'bars',
    visualizerFps: 60,
  },
  network: {
    bufferMode: 'standard',
    mobileDataSaver: true,
    tailscaleHttpsPreferred: true,
    customHostOverride: '',
  },
  appearance: {
    themeAccent: 'crimson',
    enable3DSpace: true,
    starParticleCount: 2200,
    backdropBlur: 'deep',
    uiAnimations: true,
  },
  library: {
    autoScanOnStartup: true,
    scanSubfolderDepth: 3,
    cacheCleanInterval: 'never',
  },
};
