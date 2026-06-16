import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { userQueries } from "@/lib/user-db";
import { createSession, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password, rememberMe } = await req.json();

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = userQueries.findByEmail(email.trim().toLowerCase());
    if (!user) {
      return NextResponse.json({ error: "No account found with this email." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password. Please try again." }, { status: 401 });
    }

    userQueries.updateLastLogin(user.id);

    const token = await createSession({
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      plan: user.plan,
    }, rememberMe === true);

    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    const res = NextResponse.json({ success: true, firstName: user.first_name });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/", maxAge,
    });
    return res;
  } catch (e) {
    console.error("login error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
