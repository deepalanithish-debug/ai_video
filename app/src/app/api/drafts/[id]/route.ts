import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getServerSession } from "@/lib/session";
import { draftQueries } from "@/lib/user-db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const draft = await draftQueries.findById(id, session.userId);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    draft: {
      ...draft,
      timelineData: draft.timeline_data ? JSON.parse(draft.timeline_data) : null,
      captionsData: draft.captions_data ? JSON.parse(draft.captions_data) : null,
      transitionsData: draft.transitions_data ? JSON.parse(draft.transitions_data) : null,
      effectsData: draft.effects_data ? JSON.parse(draft.effects_data) : null,
      brandSettings: draft.brand_settings ? JSON.parse(draft.brand_settings) : null,
    }
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { action, ...body } = await req.json();

  if (action === "rename") {
    await draftQueries.rename(id, session.userId, body.name);
  } else if (action === "setStatus") {
    await draftQueries.setStatus(id, session.userId, body.status);
  } else if (action === "duplicate") {
    const newId = await draftQueries.duplicate(id, uuidv4(), session.userId, body.name ?? "Copy");
    return NextResponse.json({ id: newId, success: true });
  } else {
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
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await draftQueries.delete(id, session.userId);
  return NextResponse.json({ success: true });
}
