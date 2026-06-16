import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const COOKIE_NAME = "vydeo_session";
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "vydeo-ai-secret-key-change-in-production-32chars"
);
const EXPIRY = "7d";
const REMEMBER_EXPIRY = "30d";

export interface SessionPayload {
  userId: string;
  email: string;
  firstName: string;
  plan: string;
}

export async function createSession(payload: SessionPayload, rememberMe = false): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(rememberMe ? REMEMBER_EXPIRY : EXPIRY)
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function getRequestSession(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export const SESSION_COOKIE = COOKIE_NAME;
