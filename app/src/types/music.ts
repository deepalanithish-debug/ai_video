export type MusicCategory =
  | "cinematic" | "travel" | "luxury" | "ugc"
  | "corporate" | "product-ads" | "energetic" | "emotional";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  category: MusicCategory;
  bpm?: number;
  tags: string[];
  previewUrl: string;
  waveform: number[]; // 40 normalized values 0-1 for visualization
  mood: string;
  isRoyaltyFree: boolean;
}

export interface ActiveTrack {
  trackId: string;
  volume: number; // 0-1
  muted: boolean;
  fadeIn: number; // seconds
  fadeOut: number;
  startTime: number; // timeline start position
  trimStart: number;
  trimEnd: number;
}

export interface AudioSettings {
  masterMusicVolume: number; // 0-1
  videoAudioVolume: number;  // 0-1
  autoLevelingEnabled: boolean;
  voiceIsolationEnabled: boolean;
  voiceIsolationStrength: number; // 0-1
  noiseReductionEnabled: boolean;
  noiseReductionStrength: number; // 0-1
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  masterMusicVolume: 0.7,
  videoAudioVolume: 1.0,
  autoLevelingEnabled: false,
  voiceIsolationEnabled: false,
  voiceIsolationStrength: 0.6,
  noiseReductionEnabled: false,
  noiseReductionStrength: 0.5,
};

// Royalty-free tracks using Pixabay public audio URLs
export const MUSIC_LIBRARY: MusicTrack[] = [
  // ── Cinematic ──
  {
    id: "cin-01", title: "Epic Horizon", artist: "Pixabay",
    duration: 150, category: "cinematic", bpm: 90,
    tags: ["epic","orchestral","dramatic"], mood: "powerful",
    previewUrl: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c37bfbb3.mp3",
    waveform: [0.3,0.5,0.7,0.9,1,0.8,0.6,0.8,0.9,0.7,0.5,0.6,0.7,0.8,0.9,1,0.8,0.7,0.6,0.5,0.4,0.5,0.7,0.9,1,0.8,0.6,0.5,0.4,0.3,0.4,0.6,0.8,0.9,0.7,0.5,0.4,0.3,0.4,0.5],
    isRoyaltyFree: true,
  },
  {
    id: "cin-02", title: "Cinematic Tension", artist: "Pixabay",
    duration: 120, category: "cinematic", bpm: 75,
    tags: ["tension","suspense","dark"], mood: "intense",
    previewUrl: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_270f29b344.mp3",
    waveform: [0.2,0.3,0.5,0.6,0.8,0.9,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.9,1,0.8,0.7,0.6,0.5,0.4,0.3,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.4,0.5,0.6,0.7,0.5,0.3],
    isRoyaltyFree: true,
  },
  // ── Luxury ──
  {
    id: "lux-01", title: "Golden Moments", artist: "Pixabay",
    duration: 180, category: "luxury", bpm: 72,
    tags: ["elegant","piano","sophisticated"], mood: "elegant",
    previewUrl: "https://cdn.pixabay.com/download/audio/2022/10/30/audio_a346e9e46a.mp3",
    waveform: [0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.4,0.5,0.6,0.7,0.8,0.7,0.5,0.3],
    isRoyaltyFree: true,
  },
  {
    id: "lux-02", title: "Crystal Ambience", artist: "Pixabay",
    duration: 165, category: "luxury", bpm: 65,
    tags: ["ambient","luxury","modern"], mood: "serene",
    previewUrl: "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3",
    waveform: [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.6,0.5,0.4,0.3,0.4,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.4,0.3,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.4,0.5,0.6,0.7,0.6,0.4,0.2],
    isRoyaltyFree: true,
  },
  // ── Energetic ──
  {
    id: "ener-01", title: "Pump It Up", artist: "Pixabay",
    duration: 135, category: "energetic", bpm: 128,
    tags: ["edm","electronic","hype"], mood: "hyped",
    previewUrl: "https://cdn.pixabay.com/download/audio/2022/05/17/audio_1808fbf07a.mp3",
    waveform: [0.8,1,0.9,1,0.8,0.9,1,0.8,0.7,0.9,1,0.8,0.9,1,0.8,0.7,0.8,0.9,1,0.9,0.8,1,0.9,0.8,0.7,0.9,1,0.8,0.9,1,0.9,0.8,0.7,0.8,0.9,1,0.9,0.8,0.9,1],
    isRoyaltyFree: true,
  },
  {
    id: "ener-02", title: "Neon Rush", artist: "Pixabay",
    duration: 110, category: "energetic", bpm: 135,
    tags: ["bass","trap","modern"], mood: "aggressive",
    previewUrl: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_cca7f19590.mp3",
    waveform: [0.9,1,0.8,1,0.9,0.8,1,0.9,0.7,1,0.8,0.9,1,0.8,0.7,0.9,1,0.8,0.9,0.7,0.8,1,0.9,0.8,0.7,0.9,1,0.8,0.7,0.9,1,0.8,0.9,1,0.7,0.8,0.9,1,0.9,0.8],
    isRoyaltyFree: true,
  },
  // ── Travel ──
  {
    id: "trv-01", title: "Open Roads", artist: "Pixabay",
    duration: 195, category: "travel", bpm: 110,
    tags: ["adventure","uplifting","acoustic"], mood: "adventurous",
    previewUrl: "https://cdn.pixabay.com/download/audio/2022/01/20/audio_d0ef5e43e1.mp3",
    waveform: [0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.9,1,0.9,0.8,0.7,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.5,0.4],
    isRoyaltyFree: true,
  },
  {
    id: "trv-02", title: "Wanderlust Vibes", artist: "Pixabay",
    duration: 155, category: "travel", bpm: 95,
    tags: ["chill","indie","guitar"], mood: "free-spirited",
    previewUrl: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_d0c5b01ddb.mp3",
    waveform: [0.3,0.4,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.5],
    isRoyaltyFree: true,
  },
  // ── UGC ──
  {
    id: "ugc-01", title: "Feel Good Vibes", artist: "Pixabay",
    duration: 145, category: "ugc", bpm: 115,
    tags: ["upbeat","fun","social"], mood: "cheerful",
    previewUrl: "https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3",
    waveform: [0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.7,0.8,0.9,1,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.6,0.7],
    isRoyaltyFree: true,
  },
  {
    id: "ugc-02", title: "TikTok Ready", artist: "Pixabay",
    duration: 90, category: "ugc", bpm: 120,
    tags: ["trending","pop","catchy"], mood: "trendy",
    previewUrl: "https://cdn.pixabay.com/download/audio/2022/08/23/audio_3b19d08fa9.mp3",
    waveform: [0.6,0.7,0.8,0.9,1,0.9,0.8,0.7,0.8,0.9,1,0.9,0.8,0.7,0.6,0.7,0.8,0.9,1,0.9,0.8,0.7,0.8,0.9,1,0.9,0.8,0.7,0.6,0.7,0.8,0.9,1,0.9,0.8,0.7,0.8,0.9,0.8,0.7],
    isRoyaltyFree: true,
  },
  // ── Corporate ──
  {
    id: "corp-01", title: "Professional Edge", artist: "Pixabay",
    duration: 200, category: "corporate", bpm: 100,
    tags: ["corporate","clean","motivational"], mood: "confident",
    previewUrl: "https://cdn.pixabay.com/download/audio/2022/03/24/audio_c8f0af9b10.mp3",
    waveform: [0.3,0.4,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.6,0.4],
    isRoyaltyFree: true,
  },
  // ── Product Ads ──
  {
    id: "prod-01", title: "Showcase Ready", artist: "Pixabay",
    duration: 60, category: "product-ads", bpm: 108,
    tags: ["commercial","bright","crisp"], mood: "premium",
    previewUrl: "https://cdn.pixabay.com/download/audio/2022/10/07/audio_1a609d8ce0.mp3",
    waveform: [0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.8,0.9,0.8,0.7,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.7,0.5,0.4],
    isRoyaltyFree: true,
  },
  {
    id: "prod-02", title: "Minimalist Launch", artist: "Pixabay",
    duration: 75, category: "product-ads", bpm: 92,
    tags: ["minimal","clean","modern"], mood: "sleek",
    previewUrl: "https://cdn.pixabay.com/download/audio/2022/06/09/audio_fce4278a14.mp3",
    waveform: [0.2,0.3,0.4,0.5,0.6,0.7,0.6,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.4,0.3,0.4,0.5,0.6,0.7,0.5,0.3],
    isRoyaltyFree: true,
  },
  // ── Emotional ──
  {
    id: "emo-01", title: "Heartfelt Story", artist: "Pixabay",
    duration: 240, category: "emotional", bpm: 68,
    tags: ["piano","strings","touching"], mood: "emotional",
    previewUrl: "https://cdn.pixabay.com/download/audio/2022/04/27/audio_17012035c0.mp3",
    waveform: [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.9,1,0.9,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.4,0.3,0.2],
    isRoyaltyFree: true,
  },
];
