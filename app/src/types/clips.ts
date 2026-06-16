export interface UploadedClip {
  id: string;
  name: string;
  type: "video" | "image";
  objectUrl: string;
  file: File; // kept for base64 conversion during render
  size: number;
  duration?: number; // seconds, resolved after load
  thumbnailUrl?: string;
  assignedToSceneId?: string;
}

export interface UploadedAudio {
  id: string;
  name: string;
  objectUrl: string;
  file?: File; // kept for base64 conversion during render; absent for library tracks
  size: number;
  duration?: number;
  trimStart?: number; // seconds into the audio to start playback
  trimEnd?: number;   // seconds into the audio to stop (undefined = play to end)
}
