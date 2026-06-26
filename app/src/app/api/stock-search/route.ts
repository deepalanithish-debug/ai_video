import { NextRequest, NextResponse } from "next/server";

const PEXELS_BASE = "https://api.pexels.com/videos/search";

interface PexelsVideoFile {
  link: string;
  quality: string;
  width: number;
  height: number;
}
interface PexelsVideo {
  id: number;
  image: string;
  video_files: PexelsVideoFile[];
}
interface PexelsResponse {
  videos?: PexelsVideo[];
  error?: string;
}

function pickBestFile(files: PexelsVideoFile[], prefer: "portrait" | "landscape" | "square"): PexelsVideoFile | null {
  if (!files?.length) return null;

  // Filter to MP4 / streamable quality
  const hd = files.filter(f => f.quality === "hd");
  const sd = files.filter(f => f.quality === "sd");
  const pool = hd.length ? hd : (sd.length ? sd : files);

  if (prefer === "portrait") {
    const portrait = pool.filter(f => f.height > f.width);
    if (portrait.length) return portrait[0];
  } else if (prefer === "landscape") {
    const landscape = pool.filter(f => f.width > f.height);
    if (landscape.length) return landscape[0];
  }
  return pool[0];
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const orientation = (req.nextUrl.searchParams.get("orientation") ?? "landscape") as "portrait" | "landscape" | "square";

  const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
  if (!PEXELS_API_KEY) {
    return NextResponse.json({ error: "PEXELS_API_KEY not set", url: null }, { status: 503 });
  }
  if (!q.trim()) {
    return NextResponse.json({ url: null });
  }

  try {
    const url = `${PEXELS_BASE}?query=${encodeURIComponent(q)}&per_page=5&orientation=${orientation}&size=medium`;
    const res = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Pexels API error ${res.status}`, url: null }, { status: res.status });
    }

    const data: PexelsResponse = await res.json();
    const video = data.videos?.[0];
    if (!video) return NextResponse.json({ url: null });

    const file = pickBestFile(video.video_files, orientation);
    return NextResponse.json({ url: file?.link ?? null, thumbnail: video.image, videoId: video.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg, url: null }, { status: 500 });
  }
}
