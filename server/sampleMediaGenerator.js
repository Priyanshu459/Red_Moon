import fs from 'fs';
import path from 'path';

/**
 * Creates a valid, audible 440Hz synth sine-wave WAV file for testing audio streaming.
 */
export function createDemoAudioFile(outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const tracks = [
    { filename: 'Midnight_Horizon_LoFi.wav', title: 'Midnight Horizon (Lo-Fi Chill)', freq: 330, duration: 15 },
    { filename: 'Cyber_Neon_Pulse.wav', title: 'Cyber Neon Pulse (Synthwave)', freq: 440, duration: 12 },
    { filename: 'Acoustic_Breeze.wav', title: 'Acoustic Breeze (Melodic)', freq: 523, duration: 10 }
  ];

  for (const track of tracks) {
    const filePath = path.join(outputDir, track.filename);
    if (fs.existsSync(filePath)) continue;

    const sampleRate = 44100;
    const numChannels = 2;
    const bitsPerSample = 16;
    const durationSeconds = track.duration;
    const numSamples = sampleRate * durationSeconds;
    const blockAlign = numChannels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;

    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF identifier
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt subchunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);

    // data subchunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Generate pleasing dual-tone harmonic audio
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Tone with gentle decay and vibrato
      const envelope = Math.min(1, t * 2) * Math.max(0, 1 - (t / durationSeconds) * 0.4);
      const tone1 = Math.sin(2 * Math.PI * track.freq * t);
      const tone2 = 0.5 * Math.sin(2 * Math.PI * (track.freq * 1.5) * t);
      const sampleVal = Math.floor((tone1 + tone2) * 0.4 * envelope * 32767);

      // Left channel
      buffer.writeInt16LE(sampleVal, offset);
      // Right channel
      buffer.writeInt16LE(sampleVal, offset + 2);
      offset += 4;
    }

    fs.writeFileSync(filePath, buffer);
  }
}
