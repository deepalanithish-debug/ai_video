import { NextRequest, NextResponse } from "next/server";
import { getRecentGenerations } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") ?? "asaya";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

    const rows = await getRecentGenerations({ workspaceSlug, limit });

    return NextResponse.json({
      generations: rows.map((g) => ({
        id: g.id,
        promptPreview: g.prompt_text.slice(0, 120),
        cluster: g.cluster,
        evalScore: g.eval_score,
        createdAt: g.created_at,
        aspectRatio: g.aspect_ratio,
        durationSec: g.duration_sec,
        timelineJson: g.timeline_json,
      })),
    });
  } catch (e) {
    console.error("[api/generations]", e);
    return NextResponse.json({ generations: [] });
  }
}
