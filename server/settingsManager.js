import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { queryNvidiaTelemetry } from './nvidiaEngine.js';

const SETTINGS_FILE = path.resolve('./user_settings.json');

const DEFAULT_SERVER_SETTINGS = {
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

/**
 * AppSec Helper: Strict validation for user-supplied ffmpeg executable paths (CWE-78 mitigation)
 */
export function isValidCustomFfmpegPath(p) {
  if (!p || typeof p !== 'string' || p.trim() === '') return false;
  if (p.indexOf('\0') !== -1) return false;
  // Disallow shell metacharacters & whitespace injection
  if (/[&|;`$><\n\r"']/.test(p)) return false;

  const normalized = path.normalize(p).toLowerCase();
  // Prevent pointing into Windows system directories or sensitive folders
  if (
    normalized.includes('\\windows') ||
    normalized.includes('\\$recycle.bin') ||
    normalized.includes('\\program files\\windows') ||
    normalized.includes('\\.ssh') ||
    normalized.includes('\\.aws')
  ) {
    return false;
  }

  // Must end in ffmpeg or ffmpeg.exe
  if (!/(\/|\\|^)ffmpeg(\.exe)?$/i.test(p)) {
    return false;
  }

  try {
    if (!fs.existsSync(p)) return false;
    const stat = fs.statSync(p);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Deep merge helper with strict Prototype Pollution guards (CWE-1321 mitigation)
 */
function deepMerge(target, source) {
  const output = { ...target };
  if (!source || typeof source !== 'object' || Array.isArray(source)) return output;

  for (const key of Object.keys(source)) {
    // AppSec: Block prototype poisoning keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }

    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      output[key] = source[key];
    }
  }
  return output;
}

/**
 * Load settings from file or initialize defaults
 */
export function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return deepMerge(DEFAULT_SERVER_SETTINGS, parsed);
    }
  } catch (err) {
    console.warn('[SettingsManager] Error reading user_settings.json, reverting to defaults:', err.message);
  }
  return { ...DEFAULT_SERVER_SETTINGS };
}

/**
 * Save settings to user_settings.json with schema validation & sanitization
 */
export function saveSettings(partialSettings) {
  try {
    if (!partialSettings || typeof partialSettings !== 'object' || Array.isArray(partialSettings)) {
      return { success: false, error: 'Invalid settings payload' };
    }

    // AppSec: Strict Schema Allowlist - only accept known categories
    const ALLOWED_CATEGORIES = new Set(['gpu', 'video', 'audio', 'network', 'appearance', 'library']);
    const sanitizedInput = {};

    for (const [category, val] of Object.entries(partialSettings)) {
      if (ALLOWED_CATEGORIES.has(category) && typeof val === 'object' && val !== null && !Array.isArray(val)) {
        sanitizedInput[category] = {};
        for (const [subKey, subVal] of Object.entries(val)) {
          // Block prototype pollution
          if (subKey === '__proto__' || subKey === 'constructor' || subKey === 'prototype') continue;

          // Special sanitization for customFfmpegPath
          if (category === 'gpu' && subKey === 'customFfmpegPath') {
            if (typeof subVal === 'string' && subVal.trim() !== '') {
              if (isValidCustomFfmpegPath(subVal)) {
                sanitizedInput[category][subKey] = subVal.trim();
              } else {
                sanitizedInput[category][subKey] = ''; // Reset invalid path
              }
            } else {
              sanitizedInput[category][subKey] = '';
            }
          } else {
            sanitizedInput[category][subKey] = subVal;
          }
        }
      }
    }

    const current = loadSettings();
    const merged = deepMerge(current, sanitizedInput);
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf8');
    return { success: true, settings: merged };
  } catch (err) {
    console.error('[SettingsManager] Failed to save settings:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Probe host system for ffmpeg and hardware encoder capabilities without shell invocation (CWE-78 mitigation)
 */
export function getSystemEncoders(customPath = '') {
  const nvidia = queryNvidiaTelemetry();
  let ffmpegPath = null;
  let ffmpegVersion = null;
  let encoders = {
    h264_nvenc: false,
    hevc_nvenc: false,
    av1_nvenc: false,
    h264_qsv: false,
    h264_amf: false,
  };

  // Search candidate paths for ffmpeg (strictly validated)
  const candidatePaths = [];

  if (typeof customPath === 'string' && customPath.trim() !== '') {
    if (isValidCustomFfmpegPath(customPath)) {
      candidatePaths.push(customPath.trim());
    }
  }

  // Standard safe candidate locations
  const safeLocations = [
    'ffmpeg',
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
  ];

  for (const loc of safeLocations) {
    if (loc === 'ffmpeg' || fs.existsSync(loc)) {
      candidatePaths.push(loc);
    }
  }

  for (const p of candidatePaths) {
    try {
      // AppSec: execFileSync with separate arguments array — ZERO shell execution
      const stdout = execFileSync(p, ['-version'], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 2500,
      });
      if (stdout && stdout.includes('ffmpeg version')) {
        ffmpegPath = p;
        const firstLine = stdout.split('\n')[0];
        ffmpegVersion = firstLine ? firstLine.trim() : 'Active';
        break;
      }
    } catch {
      // not in this path or non-zero exit
    }
  }

  // If ffmpeg was found, check for hardware encoders
  if (ffmpegPath) {
    try {
      const encStdout = execFileSync(ffmpegPath, ['-encoders'], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 3000,
      });
      if (encStdout) {
        encoders.h264_nvenc = encStdout.includes('h264_nvenc');
        encoders.hevc_nvenc = encStdout.includes('hevc_nvenc');
        encoders.av1_nvenc = encStdout.includes('av1_nvenc');
        encoders.h264_qsv = encStdout.includes('h264_qsv');
        encoders.h264_amf = encStdout.includes('h264_amf');
      }
    } catch {
      // ignore
    }
  } else if (nvidia.available && nvidia.primaryGpu) {
    // NVIDIA is present even without standalone ffmpeg binary:
    // NVDEC zero-copy browser video engine is 100% supported!
    const family = nvidia.primaryGpu.classification?.family;
    encoders.h264_nvenc = true;
    encoders.hevc_nvenc = true;
    if (family === 'Blackwell' || family === 'Ada Lovelace') {
      encoders.av1_nvenc = true;
    }
  }

  return {
    ffmpegAvailable: Boolean(ffmpegPath),
    ffmpegPath,
    ffmpegVersion,
    nvidiaAvailable: Boolean(nvidia.available && nvidia.primaryGpu),
    gpuName: nvidia.primaryGpu?.name || 'Integrated / Default GPU',
    gpuArchitecture: nvidia.primaryGpu?.classification?.seriesLabel || 'Standard Graphics',
    encoders,
    webCodecsSupported: true, // Chromium native browser hardware acceleration
  };
}
