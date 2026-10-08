import { exec, execSync, execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * NVIDIA Architecture Classifier
 * Maps GPU name to architectural family, NVDEC generation, and default performance profiles.
 */
export function classifyNvidiaGpu(gpuName = '') {
  const name = gpuName.trim();
  const lower = name.toLowerCase();

  // 1. Blackwell Architecture (RTX 50 Series & B-series Datacenter)
  if (/rtx\s*50\d0|b100|b200|blackwell/i.test(lower)) {
    return {
      family: 'Blackwell',
      seriesLabel: 'RTX 50 Series (Blackwell)',
      generation: '9th Gen NVENC / NVDEC',
      recommendedTier: 'extreme',
      targetFps: 144,
      particles: 3500,
      textureResolution: 2048,
      codecs: ['AV1 Dual', 'HEVC 10-bit', 'H.264', 'VP9 P2'],
      badgeColor: '#00ff88',
      features: ['Dual AV1 Hardware Encoders', 'DLSS 4 Neural Shaders', '4th Gen RT Cores', 'DirectX 12 Ultimate'],
    };
  }

  // 2. Ada Lovelace Architecture (RTX 40 Series & L-series Datacenter)
  if (/rtx\s*40\d0|l40|l4\b|ada\s*lovelace/i.test(lower)) {
    return {
      family: 'Ada Lovelace',
      seriesLabel: 'RTX 40 Series (Ada Lovelace)',
      generation: '8th Gen NVENC / NVDEC',
      recommendedTier: 'extreme',
      targetFps: 120,
      particles: 3000,
      textureResolution: 2048,
      codecs: ['AV1', 'HEVC 10-bit', 'H.264', 'VP9 P2'],
      badgeColor: '#76b900',
      features: ['AV1 Hardware Encoding & Decoding', 'Optical Flow Accelerator', '3rd Gen RT Cores', 'DirectX 12 Ultimate'],
    };
  }

  // 3. Ampere Architecture (RTX 30 Series, A-series Datacenter & Workstation)
  if (/rtx\s*30\d0|a100|a40|a30|a10\b|a16|a2\b|ampere/i.test(lower)) {
    return {
      family: 'Ampere',
      seriesLabel: 'RTX 30 Series (Ampere)',
      generation: '7th Gen NVENC / NVDEC',
      recommendedTier: 'high',
      targetFps: 120,
      particles: 2500,
      textureResolution: 2048,
      codecs: ['AV1 Decode', 'HEVC 10-bit', 'H.264', 'VP9 P2'],
      badgeColor: '#76b900',
      features: ['AV1 Hardware Decoding', '2nd Gen RT Cores', 'Tensor Cores 3rd Gen', 'DirectX 12 Ultimate'],
    };
  }

  // 4. Turing Architecture (RTX 20 Series, GTX 16 Series, T-series Workstation)
  // Matches RTX 2050 (User's GPU), RTX 2060, RTX 2070, RTX 2080, GTX 1650, GTX 1660, T1000, T600, etc.
  if (/rtx\s*20\d0|gtx\s*16\d0|t1000|t600|t400|t4\b|titan\s*rtx|turing/i.test(lower)) {
    return {
      family: 'Turing',
      seriesLabel: 'RTX 20 & GTX 16 Series (Turing)',
      generation: '6th/7th Gen NVENC / NVDEC',
      recommendedTier: 'turing',
      targetFps: 120,
      particles: 2200,
      textureResolution: 2048,
      codecs: ['HEVC 10-bit B-Frames', 'H.264', 'VP9 P2'],
      badgeColor: '#76b900',
      features: ['Turing NVENC with HEVC B-frames', '1st Gen RT Cores / Turing Shaders', 'Dedicated NVDEC Video Engine'],
    };
  }

  // 5. Pascal Architecture (GTX 10 Series, P-series Workstation)
  if (/gtx\s*10\d0|p100|p40|p4\b|titan\s*x\s*\(pascal\)|pascal/i.test(lower)) {
    return {
      family: 'Pascal',
      seriesLabel: 'GTX 10 Series (Pascal)',
      generation: '5th Gen NVENC / NVDEC',
      recommendedTier: 'smooth',
      targetFps: 60,
      particles: 1200,
      textureResolution: 1024,
      codecs: ['HEVC 10-bit', 'H.264', 'VP9 P0/P2'],
      badgeColor: '#a3e635',
      features: ['Pascal NVENC HEVC 10-bit', 'DirectX 12 Feature Level 12_1', 'High-Efficiency Video Engine'],
    };
  }

  // 6. Maxwell & Kepler Architectures (GTX 900 / 700 Series)
  if (/gtx\s*[79]\d0|maxwell|kepler/i.test(lower)) {
    return {
      family: 'Maxwell',
      seriesLabel: 'GTX 900 Series (Maxwell)',
      generation: '4th Gen NVENC / NVDEC',
      recommendedTier: 'smooth',
      targetFps: 60,
      particles: 800,
      textureResolution: 1024,
      codecs: ['H.264', 'HEVC 8-bit'],
      badgeColor: '#a3e635',
      features: ['Maxwell NVENC H.264', 'DirectX 11.2 / 12 Hardware Level'],
    };
  }

  // 7. RTX Professional / Quadro Workstation
  if (/quadro|rtx\s*a\d000/i.test(lower)) {
    return {
      family: 'Workstation',
      seriesLabel: 'NVIDIA RTX Workstation / Quadro',
      generation: 'Enterprise NVENC / NVDEC',
      recommendedTier: 'extreme',
      targetFps: 120,
      particles: 2800,
      textureResolution: 2048,
      codecs: ['HEVC 10-bit', 'H.264', 'AV1 (if Ada/Ampere)', 'VP9'],
      badgeColor: '#76b900',
      features: ['Unrestricted Simultaneous NVENC Streams', 'ECC Memory Support', 'ISV Certified Drivers'],
    };
  }

  // Default fallback for any other NVIDIA GPU
  return {
    family: 'NVIDIA Standard',
    seriesLabel: name || 'NVIDIA Graphics Processor',
    generation: 'NVIDIA Hardware Accelerated',
    recommendedTier: 'turing',
    targetFps: 60,
    particles: 1500,
    textureResolution: 1024,
    codecs: ['H.264', 'HEVC', 'VP9'],
    badgeColor: '#76b900',
    features: ['NVIDIA CUDA Accelerated', 'Hardware Video Decoding (NVDEC)'],
  };
}

/**
 * Query real-time NVIDIA GPU telemetry using nvidia-smi
 */
export function queryNvidiaTelemetry() {
  if (process.platform !== 'win32') {
    return { available: false, error: 'Windows OS platform required' };
  }

  try {
    const raw = execFileSync(
      'nvidia-smi',
      ['--query-gpu=name,driver_version,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,pstate,clocks.current.graphics', '--format=csv,noheader,nounits'],
      { encoding: 'utf8', timeout: 3500, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    if (!raw) {
      return { available: false, error: 'Empty telemetry response from nvidia-smi' };
    }

    const lines = raw.split(/\r?\n/);
    const gpus = lines.map((line, idx) => {
      const parts = line.split(',').map((s) => s.trim());
      const [
        name,
        driverVersion,
        utilization,
        memUsed,
        memTotal,
        temperature,
        power,
        pstate,
        graphicsClock,
      ] = parts;

      const classification = classifyNvidiaGpu(name);

      return {
        id: idx,
        name: name || 'NVIDIA GeForce GPU',
        driverVersion: driverVersion || 'Unknown',
        utilization: parseInt(utilization, 10) || 0,
        memory: {
          used: parseInt(memUsed, 10) || 0,
          total: parseInt(memTotal, 10) || 0,
          free: Math.max(0, (parseInt(memTotal, 10) || 0) - (parseInt(memUsed, 10) || 0)),
          unit: 'MB',
        },
        temperature: parseInt(temperature, 10) || 0,
        power: {
          draw: parseFloat(power) || 0,
          unit: 'W',
        },
        pstate: pstate || 'P0',
        graphicsClock: graphicsClock ? `${graphicsClock} MHz` : 'Dynamic',
        classification,
      };
    });

    const primaryGpu = gpus[0];

    return {
      available: true,
      count: gpus.length,
      primaryGpu,
      allGpus: gpus,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      available: false,
      error: (err.stderr ? err.stderr.toString() : err.message) || 'nvidia-smi not available or busy',
    };
  }
}

/**
 * Read current Windows DirectX UserGpuPreferences
 */
export function getWindowsGpuPreferences() {
  if (process.platform !== 'win32') return {};

  try {
    const psCommand = `Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences" -ErrorAction SilentlyContinue | ConvertTo-Json`;
    const output = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', psCommand],
      {
        encoding: 'utf8',
        timeout: 4000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    ).trim();

    if (!output) return {};
    const parsed = JSON.parse(output);
    const result = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.includes('GpuPreference=')) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Configure Windows UserGpuPreferences to force Discrete GPU (GpuPreference=2;)
 */
export function setNvidiaGpuBoost() {
  if (process.platform !== 'win32') {
    return { success: false, error: 'Only applicable to Windows' };
  }

  // Targets to prioritize
  const candidatePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    path.resolve('./dist-app/RedMoon.exe'),
    process.execPath, // Node or packaged RedMoon.exe
  ];

  const existingPaths = candidatePaths.filter((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

  if (existingPaths.length === 0) {
    // If exact paths not found on disk, register standard chrome.exe and msedge.exe anyway
    existingPaths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    );
  }

  try {
    const lines = [
      `$regKey = 'HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences'`,
      `if (!(Test-Path $regKey)) { New-Item -Path $regKey -Force | Out-Null }`,
    ];

    for (const p of existingPaths) {
      lines.push(`Set-ItemProperty -Path $regKey -Name '${p.replace(/'/g, "''")}' -Value 'GpuPreference=2;'`);
    }

    const script = lines.join('\n');
    const encoded = Buffer.from(script, 'utf16le').toString('base64');

    execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      {
        encoding: 'utf8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    // Also write a 1-click launcher script in dist-app/Launch-RedMoon-NVIDIA.cmd
    generateNvidiaLauncherBatch();

    return {
      success: true,
      message: 'NVIDIA Discrete GPU (High Performance) priority successfully configured in Windows Registry!',
      configuredTargets: existingPaths,
      gpuPreference: 'High Performance (GpuPreference=2)',
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Failed to update Windows GPU preferences',
    };
  }
}

/**
 * Generate a 1-click high-performance batch launcher for NVIDIA GPUs
 */
export function generateNvidiaLauncherBatch() {
  const batchPath = path.resolve('./dist-app/Launch-RedMoon-NVIDIA.cmd');
  const dir = path.dirname(batchPath);

  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const content = `@echo off
title Red Moon // NVIDIA GeForce RTX High-Performance Launcher
cd /d "%~dp0"
echo ========================================================
echo   🌕 Starting Red Moon with Dedicated NVIDIA GPU...
echo ========================================================

rem 1. Set Windows GPU Preference to High Performance (2)
powershell -NoProfile -Command "New-Item -Path 'HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences' -Force -ErrorAction SilentlyContinue | Out-Null; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences' -Name '%~dp0RedMoon.exe' -Value 'GpuPreference=2;' -Force -ErrorAction SilentlyContinue"

rem 2. Launch Red Moon
if exist "RedMoon.exe" (
    start "" "RedMoon.exe"
) else (
    node bundle.cjs
)

rem 3. Launch Chrome or Edge with high-performance discrete GPU flags
timeout /t 2 /nobreak >nul
if exist "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --force_high_performance_gpu --enable-gpu-rasterization --enable-zero-copy http://localhost:5000
) else if exist "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --force_high_performance_gpu --enable-gpu-rasterization --enable-zero-copy http://localhost:5000
)
`;
    fs.writeFileSync(batchPath, content, 'utf8');
    return batchPath;
  } catch {
    return null;
  }
}
