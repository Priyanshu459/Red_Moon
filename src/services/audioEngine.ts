import { EQUALIZER_FREQUENCIES, EQUALIZER_PRESETS } from '../types/settings';

class AudioEngineService {
  private ctx: AudioContext | null = null;
  private mediaSourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private activeSource: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private compressor: DynamicsCompressorNode | null = null;
  private panner: StereoPannerNode | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private bypassAudioProcessing = false;


  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;

      // Analyser for waveform/visualizer
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // Loudness Normalization / Night Mode Compressor
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      // Spatial Panner
      if (this.ctx.createStereoPanner) {
        this.panner = this.ctx.createStereoPanner();
        this.panner.pan.setValueAtTime(0, this.ctx.currentTime);
      }

      // Build 10-Band Biquad Filters
      this.filters = EQUALIZER_FREQUENCIES.map((freq, index) => {
        const filter = this.ctx!.createBiquadFilter();
        filter.frequency.value = freq;
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === EQUALIZER_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.4;
        }
        filter.gain.value = 0;
        return filter;
      });

      // Chain 10-Band Filters in series
      for (let i = 0; i < this.filters.length - 1; i++) {
        this.filters[i].connect(this.filters[i + 1]);
      }
    } catch (err) {
      console.warn('[AudioEngine] Web Audio API init failed:', err);
    }
  }

  public attachMediaElement(element: HTMLMediaElement, options?: { enableDsp?: boolean }) {
    this.initContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      const resume = () => {
        this.ctx?.resume();
        window.removeEventListener('click', resume);
        window.removeEventListener('keydown', resume);
      };
      window.addEventListener('click', resume, { once: true });
      window.addEventListener('keydown', resume, { once: true });
    }

    try {
      let source = this.mediaSourceMap.get(element);
      if (!source) {
        source = this.ctx.createMediaElementSource(element);
        this.mediaSourceMap.set(element, source);
      }

      if (this.activeSource !== source) {
        if (this.activeSource) {
          try {
            this.activeSource.disconnect();
          } catch {}
        }
        this.activeSource = source;
        this.rebuildGraph(options?.enableDsp ?? true);
      }
    } catch (err) {
      console.warn('[AudioEngine] attachMediaElement error:', err);
    }
  }

  public rebuildGraph(enableDsp = true, loudnessNorm = false, spatialSurround = false) {
    if (!this.ctx || !this.activeSource || this.filters.length === 0) return;

    try {
      this.activeSource.disconnect();
      this.filters[this.filters.length - 1].disconnect();
      this.compressor?.disconnect();
      this.panner?.disconnect();
      this.analyser?.disconnect();
      this.masterGain?.disconnect();

      if (!enableDsp) {
        // Direct bypass to destination
        this.activeSource.connect(this.analyser || this.ctx.destination);
        if (this.analyser) this.analyser.connect(this.ctx.destination);
        return;
      }

      // Input -> 1st Filter
      let lastNode: AudioNode = this.activeSource;
      lastNode.connect(this.filters[0]);
      lastNode = this.filters[this.filters.length - 1];

      // Insert Loudness Normalizer (Night Mode) if enabled
      if (loudnessNorm && this.compressor) {
        lastNode.connect(this.compressor);
        lastNode = this.compressor;
      }

      // Insert Spatial Surround Panner if enabled
      if (spatialSurround && this.panner) {
        lastNode.connect(this.panner);
        lastNode = this.panner;
      }

      // Connect to Master Gain & Analyser
      if (this.masterGain) {
        lastNode.connect(this.masterGain);
        lastNode = this.masterGain;
      }

      if (this.analyser) {
        lastNode.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      } else {
        lastNode.connect(this.ctx.destination);
      }
    } catch (err) {
      console.warn('[AudioEngine] Graph rebuild error:', err);
    }
  }

  public setEqualizerBand(index: number, gainDb: number) {
    if (!this.ctx || !this.filters[index]) return;
    const clamped = Math.max(-12, Math.min(12, gainDb));
    this.filters[index].gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public setEqualizerPreset(presetKey: string) {
    const preset = EQUALIZER_PRESETS[presetKey];
    if (!preset) return;
    preset.bands.forEach((gain, i) => {
      this.setEqualizerBand(i, gain);
    });
  }

  public setEqualizerBands(bands: number[]) {
    bands.forEach((gain, i) => {
      this.setEqualizerBand(i, gain);
    });
  }

  public setLoudnessNormalization(enabled: boolean) {
    this.rebuildGraph(!this.bypassAudioProcessing, enabled);
  }

  public setMasterVolume(vol: number) {
    if (!this.ctx || !this.masterGain) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public getAnalyser(): AnalyserNode | null {
    this.initContext();
    return this.analyser;
  }
}

export const audioEngine = new AudioEngineService();
