import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { projectQueries } from "@/lib/user-db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const patch = await req.json();
  await projectQueries.update(id, session.userId, patch);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await projectQueries.delete(id, session.userId);
  return NextResponse.json({ success: true });
}
