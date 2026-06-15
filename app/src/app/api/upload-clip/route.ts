import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";

export const maxDuration = 120;

const GEMINI_UPLOAD_BASE = "https://generativelanguage.googleapis.com";

async function getAuthSuffix(): Promise<{ qp: string; headers: Record<string, string> }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return { qp: `?key=${apiKey}`, headers: {} };

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL!;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  const auth = new GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/generative-language"],
    projectId: process.env.GOOGLE_PROJECT_ID,
  });
  const token = await auth.getAccessToken();
  return { qp: "", headers: { Authorization: `Bearer ${token}` } };
}

async function pollUntilActive(
  fileName: string,
  qp: string,
  authHeaders: Record<string, string>,
  maxWaitMs = 120_000
): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${GEMINI_UPLOAD_BASE}/v1beta/${fileName}${qp}`, {
      headers: authHeaders,
      cache: "no-store",
    });
    if (!res.ok) return; // non-fatal — proceed and let generateContent fail if needed
    const data = await res.json();
    if (data.state === "ACTIVE") return;
    if (data.state === "FAILED")
      throw new Error(`Gemini file processing failed: ${data.error?.message ?? "unknown"}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Timed out waiting for Gemini to process the uploaded file.");
}

export async function POST(req: NextRequest) {
  try {
    const { qp, headers: authHeaders } = await getAuthSuffix();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "video/mp4";
    const displayName = file.name;

    // Step 1 — initiate resumable upload
    const initRes = await fetch(
      `${GEMINI_UPLOAD_BASE}/upload/v1beta/files${qp}`,
      {
        method: "POST",
        headers: {
          ...authHeaders,
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": String(fileBuffer.length),
          "X-Goog-Upload-Header-Content-Type": mimeType,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file: { display_name: displayName } }),
      }
    );

    if (!initRes.ok) {
      const err = await initRes.text();
      throw new Error(`Failed to initiate Gemini upload: ${err.slice(0, 400)}`);
    }

    const uploadUrl = initRes.headers.get("x-goog-upload-url");
    if (!uploadUrl) throw new Error("Gemini did not return an upload URL.");

    // Step 2 — upload file bytes
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Length": String(fileBuffer.length),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Gemini file upload failed: ${err.slice(0, 400)}`);
    }

    const fileData = await uploadRes.json();
    const geminiFile = fileData.file ?? fileData;

    // Step 3 — wait until ACTIVE (videos need processing time)
    if (geminiFile.state !== "ACTIVE") {
      await pollUntilActive(geminiFile.name, qp, authHeaders);
    }

    return NextResponse.json({
      uri: geminiFile.uri,
      name: geminiFile.name,
      mimeType: geminiFile.mimeType ?? mimeType,
      displayName: geminiFile.displayName ?? displayName,
    });
  } catch (error) {
    console.error("upload-clip error:", error);
    return NextResponse.json(
      { error: "Upload failed.", message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
