/** Detect video files even when the browser reports an empty MIME type (common for .MOV). */
export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return /\.(mov|mp4|webm|m4v|avi|mkv|mpeg|mpg)$/i.test(file.name);
}

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);
}

export function isAudioFile(file: File): boolean {
  if (file.type.startsWith("audio/")) return true;
  return /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name);
}
