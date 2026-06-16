export type MusicCategory =
  | "cinematic"
  | "travel"
  | "luxury"
  | "ugc"
  | "corporate"
  | "product-ads"
  | "energetic"
  | "emotional";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  category: MusicCategory;
  bpm: number;
  tags: string[];
  previewUrl: string;
  waveform: number[];
  mood: string;
  isRoyaltyFree: boolean;
}

export interface ActiveTrack {
  trackId: string;
  volume: number;
  muted: boolean;
  fadeIn: number;
  fadeOut: number;
  startTime: number;
  trimStart: number;
  trimEnd: number;
}

export interface AudioSettings {
  masterMusicVolume: number;
  videoAudioVolume: number;
  autoLevelingEnabled: boolean;
  voiceIsolationEnabled: boolean;
  voiceIsolationStrength: number;
  noiseReductionEnabled: boolean;
  noiseReductionStrength: number;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  masterMusicVolume: 80,
  videoAudioVolume: 100,
  autoLevelingEnabled: false,
  voiceIsolationEnabled: false,
  voiceIsolationStrength: 70,
  noiseReductionEnabled: false,
  noiseReductionStrength: 60,
};

// Helper — route all audio through the Next.js proxy to avoid CORS issues
function proxy(url: string) {
  return `/api/audio-proxy?url=${encodeURIComponent(url)}`;
}

// Royalty-free tracks from Bensound (bensound.com) via local proxy
export const MUSIC_LIBRARY: MusicTrack[] = [
  // ── Cinematic ──
  {
    id: "cin-01", title: "Epic", artist: "Bensound",
    duration: 150, category: "cinematic", bpm: 90,
    tags: ["epic", "orchestral", "dramatic"], mood: "powerful",
    previewUrl: proxy("https://www.bensound.com/bensound-music/bensound-epic.mp3"),
    waveform: [0.3,0.5,0.7,0.9,1,0.8,0.6,0.8,0.9,0.7,0.5,0.6,0.7,0.8,0.9,1,0.8,0.7,0.6,0.5,0.4,0.5,0.7,0.9,1,0.8,0.6,0.5,0.4,0.3,0.4,0.6,0.8,0.9,0.7,0.5,0.4,0.3,0.4,0.5],
    isRoyaltyFree: true,
  },
  {
    id: "cin-02", title: "Cinematic Ambient", artist: "Bensound",
    duration: 120, category: "cinematic", bpm: 75,
    tags: ["ambient", "atmospheric", "film"], mood: "intense",
    previewUrl: proxy("https://www.bensound.com/bensound-music/bensound-cinematicambient.mp3"),
    waveform: [0.2,0.3,0.5,0.6,0.8,0.9,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.9,1,0.8,0.7,0.6,0.5,0.4,0.3,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.4,0.5,0.6,0.7,0.5,0.3],
    isRoyaltyFree: true,
  },
  // ── Luxury ──
  {
    id: "lux-01", title: "Perception", artist: "Bensound",
    duration: 180, category: "luxury", bpm: 72,
    tags: ["elegant", "piano", "sophisticated"], mood: "elegant",
    previewUrl: proxy("https://www.bensound.com/bensound-music/bensound-perception.mp3"),
    waveform: [0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.4,0.5,0.6,0.7,0.8,0.7,0.5,0.3],
    isRoyaltyFree: true,
  },
  {
    id: "lux-02", title: "Slow Motion", artist: "Bensound",
    duration: 165, category: "luxury", bpm: 65,
    tags: ["slow", "luxury", "modern"], mood: "serene",
    previewUrl: proxy("https://www.bensound.com/bensound-music/bensound-slowmotion.mp3"),
    waveform: [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.6,0.5,0.4,0.3,0.4,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.4,0.3,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.4,0.5,0.6,0.7,0.6,0.4,0.2],
    isRoyaltyFree: true,
  },
  // ── Energetic ──
  {
    id: "ener-01", title: "Dubstep", artist: "Bensound",
    duration: 135, category: "energetic", bpm: 128,
    tags: ["edm", "electronic", "hype"], mood: "hyped",
    previewUrl: proxy("https://www.bensound.com/bensound-music/bensound-dubstep.mp3"),
    waveform: [0.8,1,0.9,1,0.8,0.9,1,0.8,0.7,0.9,1,0.8,0.9,1,0.8,0.7,0.8,0.9,1,0.9,0.8,1,0.9,0.8,0.7,0.9,1,0.8,0.9,1,0.9,0.8,0.7,0.8,0.9,1,0.9,0.8,0.9,1],
    isRoyaltyFree: true,
  },
  {
    id: "ener-02", title: "Action Struck", artist: "Bensound",
    duration: 110, category: "energetic", bpm: 135,
    tags: ["action", "intense", "power"], mood: "aggressive",
    previewUrl: proxy("https://www.bensound.com/bensound-music/bensound-actionstruck.mp3"),
    waveform: [0.9,1,0.8,1,0.9,0.8,1,0.9,0.7,1,0.8,0.9,1,0.8,0.7,0.9,1,0.8,0.9,0.7,0.8,1,0.9,0.8,0.7,0.9,1,0.8,0.7,0.9,1,0.8,0.9,1,0.7,0.8,0.9,1,0.9,0.8],
    isRoyaltyFree: true,
  },
  // ── Travel ──
  {
    id: "trv-01", title: "Ukulele", artist: "Bensound",
    duration: 195, category: "travel", bpm: 110,
    tags: ["adventure", "uplifting", "acoustic"], mood: "adventurous",
    previewUrl: proxy("https://www.bensound.com/bensound-music/bensound-ukulele.mp3"),
    waveform: [0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.9,1,0.9,0.8,0.7,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.5,0.4],
    isRoyaltyFree: true,
  },
  {
    id: "trv-02", title: "Sunny", artist: "Bensound",
    duration: 155, category: "travel", bpm: 95,
    tags: ["chill", "upbeat", "happy"], mood: "free-spirited",
    previewUrl: proxy("https://www.bensound.com/bensound-music/bensound-sunny.mp3"),
    waveform: [0.3,0.4,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.5],
    isRoyaltyFree: true,
  },
  // ── UGC ──
  {
    id: "ugc-01", title: "Happiness", artist: "Bensound",
    duration: 145, category: "ugc", bpm: 115,
    tags: ["upbeat", "fun", "social"], mood: "cheerful",
    previewUrl: proxy("https://www.bensound.com/bensound-music/bensound-happiness.mp3"),
    waveform: [0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.7,0.8,0.9,1,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.6,0.7],
    isRoyaltyFree: true,
  },
  {
    id: "ugc-02", title: "Funky Element", artist: "Bensound",
    duration: 90, category: "ugc", bpm: 120,
    tags: ["funky", "pop", "catchy"], mood: "trendy",
    previewUrl: proxy("https://www.bensound.com/bensound-music/bensound-funkyelement.mp3"),
    waveform: [0.6,0.7,0.8,0.9,1,0.9,0.8,0.7,0.8,0.9,1,0.9,0.8,0.7,0.6,0.7,0.8,0.9,1,0.9,0.8,0.7,0.8,0.9,1,0.9,0.8,0.7,0.6,0.7,0.8,0.9,1,0.9,0.8,0.7,0.8,0.9,0.8,0.7],
    isRoyaltyFree: true,
  },
  // ── Corporate ──
  {
    id: "corp-01", title: "Corporate", artist: "Bensound",
    duration: 200, category: "corporate", bpm: 100,
    tags: ["corporate", "clean", "motivational"], mood: "confident",
    previewUrl: proxy("https://www.bensound.com/bensound-music/bensound-corporate.mp3"),
    waveform: [0.3,0.4,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.6,0.4],
    isRoyaltyFree: true,
  },
  // ── Product Ads ──
  {
    id: "prod-01", title: "Creative Minds", artist: "Bensound",
    duration: 60, category: "product-ads", bpm: 108,
    tags: ["commercial", "bright", "crisp"], mood: "premium",
    previewUrl: proxy("https://www.bensound.com/bensound-music/bensound-creativeminds.mp3"),
    waveform: [0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.8,0.9,0.8,0.7,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.6,0.7,0.8,0.7,0.5,0.4],
    isRoyaltyFree: true,
  },
  {
    id: "prod-02", title: "Little Idea", artist: "Bensound",
    duration: 75, category: "product-ads", bpm: 92,
    tags: ["minimal", "clean", "modern"], mood: "sleek",
    previewUrl: proxy("https://www.bensound.com/bensound-music/bensound-littleidea.mp3"),
    waveform: [0.2,0.3,0.4,0.5,0.6,0.7,0.6,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.7,0.6,0.5,0.4,0.3,0.4,0.5,0.6,0.7,0.5,0.3],
    isRoyaltyFree: true,
  },
  // ── Emotional ──
  {
    id: "emo-01", title: "Memories", artist: "Bensound",
    duration: 240, category: "emotional", bpm: 68,
    tags: ["piano", "strings", "touching"], mood: "emotional",
    previewUrl: proxy("https://www.bensound.com/bensound-music/bensound-memories.mp3"),
    waveform: [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.9,1,0.9,0.8,0.7,0.6,0.5,0.4,0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.4,0.3,0.2],
    isRoyaltyFree: true,
  },
];
