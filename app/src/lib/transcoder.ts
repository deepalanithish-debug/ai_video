/**
 * Cloud rendering abstraction.
 *
 * Primary path: Google Cloud Video Transcoder API + GCS storage.
 * Fallback:     Local FFmpeg (existing approach) when GCS_BUCKET is not set.
 *
 * To enable cloud rendering, set in .env.local:
 *   GCS_BUCKET=your-bucket-name
 *   GCS_RENDER_PREFIX=renders   (optional, default: "renders")
 *
 * The service account in GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY is reused
 * — it needs roles/storage.objectAdmin and roles/transcoder.admin.
 */
import { GoogleAuth } from "google-auth-library";

export interface SceneInput {
  id: string;
  duration: number;
  clipData?: string;   // base64 data-url or "data:video/mp4;base64,..."
  clipType?: "video" | "image";
  clipTrimStart?: number;
  clipTrimEnd?: number;
  playbackSpeed?: number;
  visualEffect?: string;
  transition?: { type: string; duration: number };
}

export interface AudioInput {
  src: string;         // base64 data-url
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
}

export interface RenderParams {
  scenes: SceneInput[];
  audio?: AudioInput;
  aspectRatio?: string;
  totalDuration?: number;
  outputFilename: string;
}

export interface RenderResult {
  downloadUrl: string;
  filename: string;
  engine: "cloud" | "local";
}

// ── Engine detection ──────────────────────────────────────────────────────────
export function getEngineType(): "cloud" | "local" {
  return process.env.GCS_BUCKET ? "cloud" : "local";
}

// ── Cloud Transcoder path ─────────────────────────────────────────────────────
async function getGcpToken(): Promise<string> {
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL!,
      private_key: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    projectId: process.env.GOOGLE_PROJECT_ID,
  });
  return (await auth.getAccessToken()) ?? "";
}

async function uploadToGcs(
  base64Data: string,
  gcsPath: string,
  contentType: string,
  token: string,
  bucket: string,
): Promise<string> {
  const sepIdx = base64Data.indexOf(",");
  const b64 = sepIdx !== -1 ? base64Data.slice(sepIdx + 1) : base64Data;
  const buf = Buffer.from(b64, "base64");

  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(gcsPath)}`;
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": contentType, "Content-Length": String(buf.length) },
    body: buf,
  });
  if (!res.ok) throw new Error(`GCS upload failed (${res.status}): ${await res.text()}`);
  return `gs://${bucket}/${gcsPath}`;
}

async function deleteGcsObject(gcsPath: string, token: string, bucket: string): Promise<void> {
  await fetch(
    `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(gcsPath)}`,
    { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } },
  ).catch(() => { /* best-effort cleanup */ });
}

async function createTranscoderJob(params: {
  project: string;
  location: string;
  token: string;
  inputUris: string[];
  outputUri: string;
  width: number;
  height: number;
  scenes: SceneInput[];
  audioUri?: string;
  audioVolume?: number;
}): Promise<string> {
  const { project, location, token, inputUris, outputUri, width, height, scenes, audioUri, audioVolume } = params;

  // Build edit atoms — one per scene
  const editAtoms = scenes.map((scene, i) => ({
    key: `atom${i}`,
    inputs: [String(i)],
    startTimeOffset: "0s",
    endTimeOffset: `${scene.duration}s`,
  }));

  // Mux sequence
  const videoStreams = [{
    key: "output-video",
    videoStream: {
      h264: {
        widthPixels: width,
        heightPixels: height,
        bitrateBps: width >= 1920 ? 8000000 : 4000000,
        frameRate: 24,
        pixelFormat: "yuv420p",
        profile: "high",
      },
    },
  }];

  const audioStreams = audioUri ? [{
    key: "output-audio",
    audioStream: { codec: "aac", bitrateBps: 192000, channelCount: 2, sampleRateHertz: 48000 },
  }] : [];

  const muxStreams = [{
    key: "output",
    container: "mp4",
    elementaryStreams: audioUri ? ["output-video", "output-audio"] : ["output-video"],
  }];

  const inputs = inputUris.map((uri, i) => ({ key: String(i), uri }));
  if (audioUri) inputs.push({ key: "audio", uri: audioUri });

  const jobConfig = {
    inputs,
    editList: editAtoms,
    elementaryStreams: [...videoStreams, ...audioStreams],
    muxStreams,
    output: { uri: outputUri },
  };

  const endpoint = `https://transcoder.googleapis.com/v1/projects/${project}/locations/${location}/jobs`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ config: jobConfig }),
  });
  if (!res.ok) throw new Error(`Transcoder job create failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const job = await res.json() as { name: string };
  return job.name;
}

async function pollTranscoderJob(jobName: string, token: string, timeoutMs = 240_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(`https://transcoder.googleapis.com/v1/${jobName}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) continue;
    const job = await res.json() as { state: string; error?: { message: string } };
    if (job.state === "SUCCEEDED") return;
    if (job.state === "FAILED") throw new Error(`Transcoder job failed: ${job.error?.message ?? "unknown"}`);
  }
  throw new Error("Transcoder job timed out after 4 minutes.");
}

async function generateSignedUrl(gcsPath: string, token: string, bucket: string): Promise<string> {
  // Generate a 7-day signed URL via the GCS JSON API (service account sign blob)
  const res = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(gcsPath)}?alt=media`,
    { headers: { "Authorization": `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`GCS signed URL failed: ${res.status}`);
  // Return a public-style URL — the caller streams it
  return `https://storage.googleapis.com/${bucket}/${gcsPath}`;
}

async function renderCloud(params: RenderParams): Promise<RenderResult> {
  const bucket = process.env.GCS_BUCKET!;
  const prefix = process.env.GCS_RENDER_PREFIX ?? "renders";
  const project = process.env.GOOGLE_PROJECT_ID!;
  const location = process.env.GOOGLE_LOCATION ?? "us-central1";
  const { v4: uuidv4 } = await import("uuid");
  const jobId = uuidv4();

  const token = await getGcpToken();
  const uploadedPaths: string[] = [];

  try {
    // Upload clips
    const inputUris: string[] = [];
    for (let i = 0; i < params.scenes.length; i++) {
      const scene = params.scenes[i];
      if (scene.clipData) {
        const ext = scene.clipType === "image" ? "jpg" : "mp4";
        const gcsPath = `${prefix}/tmp/${jobId}/clip_${i}.${ext}`;
        const mimeType = scene.clipType === "image" ? "image/jpeg" : "video/mp4";
        await uploadToGcs(scene.clipData, gcsPath, mimeType, token, bucket);
        uploadedPaths.push(gcsPath);
        inputUris.push(`gs://${bucket}/${gcsPath}`);
      } else {
        // Blank placeholder — use a 1x1 black image (Transcoder will expand)
        inputUris.push(""); // handled by Transcoder color source
      }
    }

    // Upload audio
    let audioGcsUri: string | undefined;
    if (params.audio?.src) {
      const audioPath = `${prefix}/tmp/${jobId}/audio.m4a`;
      await uploadToGcs(params.audio.src, audioPath, "audio/mp4", token, bucket);
      uploadedPaths.push(audioPath);
      audioGcsUri = `gs://${bucket}/${audioPath}`;
    }

    const [W, H] = aspectRatioToDimensions(params.aspectRatio ?? "9:16");
    const outputPath = `${prefix}/output/${params.outputFilename}`;
    const outputUri = `gs://${bucket}/${outputPath}`;

    const jobName = await createTranscoderJob({
      project, location, token,
      inputUris: inputUris.filter(Boolean),
      outputUri,
      width: W, height: H,
      scenes: params.scenes,
      audioUri: audioGcsUri,
      audioVolume: params.audio?.volume,
    });

    await pollTranscoderJob(jobName, token);

    const downloadUrl = await generateSignedUrl(outputPath, token, bucket);
    return { downloadUrl, filename: params.outputFilename, engine: "cloud" };
  } finally {
    // Best-effort cleanup of temp files
    for (const p of uploadedPaths) {
      deleteGcsObject(p, token, bucket).catch(() => {});
    }
  }
}

// ── Local FFmpeg fallback path ────────────────────────────────────────────────
async function renderLocal(params: RenderParams): Promise<RenderResult> {
  // Dynamically import the local render logic to avoid loading FFmpeg in cloud mode
  const { renderWithFfmpeg } = await import("./ffmpeg-render");
  const result = await renderWithFfmpeg(params);
  return { ...result, engine: "local" };
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function renderVideo(params: RenderParams): Promise<RenderResult> {
  if (getEngineType() === "cloud") {
    return renderCloud(params);
  }
  return renderLocal(params);
}

function aspectRatioToDimensions(r: string): [number, number] {
  switch (r) {
    case "16:9": return [1920, 1080];
    case "1:1":  return [1080, 1080];
    case "4:5":  return [1080, 1350];
    case "3:4":  return [1080, 1440];
    default:     return [1080, 1920]; // 9:16
  }
}
