import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { userQueries } from "@/lib/user-db";
import { createSession, SESSION_COOKIE } from "@/lib/session";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, password, confirmPassword } = await req.json();

    // Validation
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
    }
    if (!email?.trim() || !validateEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }
    const pwdError = validatePassword(password);
    if (pwdError) return NextResponse.json({ error: pwdError }, { status: 400 });
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    // Check duplicate
    const existing = userQueries.findByEmail(email.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    // Create user
    const id = uuidv4();
    const hash = await bcrypt.hash(password, 12);
    userQueries.create({
      id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hash,
      plan: "free",
    });

    // Auto-login
    const token = await createSession({ userId: id, email: email.trim().toLowerCase(), firstName: firstName.trim(), plan: "free" });
    const res = NextResponse.json({ success: true, firstName: firstName.trim() });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error("signup error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
