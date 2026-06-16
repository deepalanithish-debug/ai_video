import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = ["www.bensound.com", "bensound.com", "cdn.pixabay.com", "assets.mixkit.co", "incompetech.com", "freemusicarchive.org", "files.freemusicarchive.org"];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let parsed: URL;
  try { parsed = new URL(url); } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "audio/mpeg,audio/ogg,audio/*;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": `https://${parsed.hostname}/`,
        "Origin": `https://${parsed.hostname}`,
      },
      redirect: "follow",
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: upstream.status });
    }
    const contentType = upstream.headers.get("Content-Type") ?? "audio/mpeg";
    // Reject HTML responses (means the server returned an error page)
    if (contentType.includes("text/html")) {
      return NextResponse.json({ error: "Got HTML instead of audio" }, { status: 502 });
    }
    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength < 1000) {
      return NextResponse.json({ error: "Response too small to be audio" }, { status: 502 });
    }
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Fetch failed: ${msg}` }, { status: 502 });
  }
}
