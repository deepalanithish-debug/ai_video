import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getServerSession } from "@/lib/session";
import { projectQueries } from "@/lib/user-db";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projects = projectQueries.list(session.userId);
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, projectType, thumbnail } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  const id = uuidv4();
  projectQueries.create({ id, user_id: session.userId, name: name.trim(), thumbnail: thumbnail ?? null, project_type: projectType ?? "custom", status: "active" });
  return NextResponse.json({ id, success: true });
}
