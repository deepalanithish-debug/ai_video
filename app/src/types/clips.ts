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
  file: File; // kept for base64 conversion during render
  size: number;
  duration?: number;
}
