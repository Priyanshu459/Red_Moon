/**
 * Intelligent Media Title Sanitizer & Formatter
 * Transforms raw file names (e.g. "Ed Sheeran - Shape of You (Official Music Video)_1080p.mp4")
 * into human-typeset titles and artist labels.
 */

export interface ParsedMediaTitle {
  title: string;
  artist?: string;
  categoryTag?: string;
}

export function cleanMediaTitle(rawFilename: string): ParsedMediaTitle {
  // Strip file extension
  let clean = rawFilename.replace(/\.[a-zA-Z0-9]+$/, '');

  // Strip common YouTube/Rip tags and video qualities
  clean = clean
    .replace(/[_.]/g, ' ')
    .replace(/\s*\(Official\s*(Music\s*)?Video\)/gi, '')
    .replace(/\s*\[Official\s*(Music\s*)?Video\]/gi, '')
    .replace(/\s*\(Lyric\s*Video\)/gi, '')
    .replace(/\s*\(Audio\)/gi, '')
    .replace(/\s*\[Audio\]/gi, '')
    .replace(/\s*\(Visualizer\)/gi, '')
    .replace(/\s*_\s*1080p/gi, '')
    .replace(/\s*1080p/gi, '')
    .replace(/\s*720p/gi, '')
    .replace(/\s*4k/gi, '')
    .replace(/\s*\[HD\]/gi, '')
    .replace(/\s*\(HD\)/gi, '')
    .trim();

  // Check for "Artist - Title" pattern
  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    if (parts.length >= 2) {
      const artist = parts[0].trim();
      const title = parts.slice(1).join(' - ').trim();
      return { title, artist };
    }
  }

  // Handle synthesized or hyphenated tracks like "Midnight_Horizon_LoFi"
  if (clean.toLowerCase().includes('lofi') || clean.toLowerCase().includes('lo-fi')) {
    const title = clean.replace(/lo-?fi/gi, '').trim();
    return { title: title || clean, categoryTag: 'Lo-Fi' };
  }

  // Handle "Moonlight-Paper-Mono-Walkthrough"
  clean = clean.replace(/-/g, ' ');
  // Collapse duplicate spaces
  clean = clean.replace(/\s+/g, ' ').trim();

  return { title: clean };
}

export function formatFolderLabel(folderName: string): string {
  if (!folderName) return 'Local';
  const lower = folderName.toLowerCase();
  if (lower === 'samples') return 'Samples';
  if (lower === 'downloads') return 'Downloads';
  if (lower === 'videos') return 'Videos';
  if (lower === 'music') return 'Music';
  return folderName;
}
