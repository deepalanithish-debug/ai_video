import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Forward to lineup API
  const body = await req.json();
  const res = await fetch(new URL("/api/lineup", req.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: body.message, workspaceSlug: "asaya", ...body }),
  });

  // Stream or forward the response as-is
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
