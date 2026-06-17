import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getServerSession } from "@/lib/session";
import { draftQueries } from "@/lib/user-db";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const drafts = await draftQueries.list(session.userId);
  return NextResponse.json({ drafts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = body.id ?? uuidv4();
  await draftQueries.autosave({
    id, user_id: session.userId,
    name: body.name ?? "Untitled Draft",
    prompt: body.prompt ?? null,
    timeline_data: body.timelineData ? JSON.stringify(body.timelineData) : null,
    captions_data: body.captionsData ? JSON.stringify(body.captionsData) : null,
    transitions_data: body.transitionsData ? JSON.stringify(body.transitionsData) : null,
    effects_data: body.effectsData ? JSON.stringify(body.effectsData) : null,
    brand_settings: body.brandSettings ? JSON.stringify(body.brandSettings) : null,
    aspect_ratio: body.aspectRatio ?? "9:16",
    current_playhead: body.currentPlayhead ?? 0,
    status: body.status ?? "draft",
  });
  return NextResponse.json({ id, success: true });
}
