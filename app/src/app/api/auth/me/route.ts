import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { userQueries } from "@/lib/user-db";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  const user = await userQueries.findById(session.userId);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({
    user: {
      id: user.id, firstName: user.first_name, lastName: user.last_name,
      email: user.email, plan: user.plan, createdAt: user.created_at,
    }
  });
}
