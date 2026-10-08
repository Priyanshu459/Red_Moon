export type MediaType = 'video' | 'audio';

export type VideoQualityLevel = 'auto' | '1080p' | '720p' | '480p' | '360p' | 'source';

export interface VideoQualityOption {
  id: VideoQualityLevel;
  label: string;
  badge: string;
  bitrate: string;
  resolution: string;
  description?: string;
}

export interface MediaItem {
  id: string;
  name: string;
  title: string;
  path: string;
  type: MediaType;
  ext: string;
  mimeType: string;
  size: number;
  mtime: string;
  folder: string;
}

export type TailscaleState = 'connected' | 'needs_login' | 'disconnected' | 'not_installed';

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  isTailscale: boolean;
  netmask: string;
}

export interface PeerInfo {
  name: string;
  hostname?: string;
  os?: string;
  ip: string;
  online: boolean;
  lastSeen?: string;
  isPhone?: boolean;
}

export interface SuggestedFolder {
  name: string;
  path: string;
  type: 'videos' | 'music' | 'downloads' | 'documents' | 'drive' | 'custom';
  alreadyAdded: boolean;
  mediaCount: number;
}

export interface NetworkInfo {
  hostname: string;
  tailscaleIp: string | null;
  tailscaleState: TailscaleState;
  tailscaleDetected: boolean;
  magicDnsDomain?: string | null;
  tailscaleHttpsUrl?: string | null;
  hasTailscaleHttps?: boolean;
  isFunnelActive?: boolean;
  peers?: PeerInfo[];
  phonePeer?: PeerInfo | null;
  isPhoneConnected?: boolean;
  streamToken?: string;
  localLanIp: string;
  serverPort: number;
  clientPort: number;
  interfaces: NetworkInterfaceInfo[];
}

export interface StreamSettings {
  bufferMode: 'low_latency' | 'standard' | 'high_bandwidth';
  audioVolume: number;
  videoAutoplay: boolean;
  customHostOverride: string;
}

export interface RecommendationMatch {
  item: MediaItem;
  matchScore: number;
  reason: string;
}

export interface UserHistoryRecord {
  id: string;
  lastPlayed: number;
  playCount: number;
  completionRatio: number;
}


