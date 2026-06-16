# VydeoAI

An AI-powered video editor built with Next.js 14. Describe what you want in plain English, upload your raw footage, and the AI assembles a production-ready timeline — matching specific people or objects to the right scenes, picking transitions and music, and scoring the result. Edit every detail in the visual editor and export when done.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Architecture Overview](#architecture-overview)
- [AI Models](#ai-models)
- [Pages](#pages)
- [API Routes](#api-routes)
- [Database](#database)
- [Known Limitations](#known-limitations)

---

## Features

### Vibe AI Chat

A full-screen chat modal with three distinct creation modes:

**Storyboard (Lineup Planner)**
- Type a brief in plain English — "Start with the girl speaking, end with the guy in sunglasses, include the other replies in between"
- Attach one or more video or image files (paperclip icon) — supports MP4, MOV, WebM, JPG, PNG, WebP, HEIC
- For each video file, the browser extracts 3 keyframes (at 15%, 45%, and 75% of the clip's duration) using a sequential `onseeked` state machine and sends them to Gemini as inline base64 images — this lets the AI reliably identify specific people, clothing, accessories, and what happens later in each clip
- Gemini 2.5 Pro analyzes all clips multimodally, generates a `clipAssignments` array that maps each clip to its scene slot in the order the brief requests
- The AI cross-checks ordering — "start with X" puts that clip at scene 0, "end with Y" puts that clip last — and verifies the mapping before returning
- The output is a complete timeline JSON (scenes, transitions, captions, music direction) loaded directly into the editor
- Follow-up messages refine the existing timeline in-place — the same draft is updated (PATCH), no duplicate drafts accumulate
- Input placeholder changes to "Refine: …" after the first generation

**Image Generator**
- Generates a single high-quality image from any prompt
- Optional parameters: mood, style, realism level, aspect ratio, reference image (img2img)
- Generated image displayed inline in the chat with a download link

**Video Clip Generator**
- Generates a real moving video clip up to 10 seconds from a scene description
- Uses Google Veo 3.0, automatically falls back to Veo 2.0 if unavailable in the project
- Video displayed inline in the chat with native playback controls and a download link

**Chat UX details:**
- Mode selector screen on open — three large cards with icon, label, sublabel, and description
- Step-by-step progress bar during generation with per-step icon, label, and detail text
- Red pulsing stop button replaces the send button during generation; cancels via AbortController
- "← Back" button in the header returns to mode selector without losing the conversation
- Mode chip in the header shows the active mode in its accent color
- Suggested prompt chips shown when the input is empty
- Closes with fade + slide animation; resets to mode selector 350ms after closing

---

### AI Video Editor

A multi-panel layout editor that loads any saved draft.

#### Canvas Preview

**Rendering:**
- Renders the active scene using a real `<video>` element for video clips or `<img>` for images
- When no clip is assigned, shows a mood-colored placeholder with scene label, description, and "assign clip" hint
- Scene transitions animated via Web Animations API — outgoing and incoming scene layers animate simultaneously
- Supports 30+ transition types without CSS timing race conditions

**Gapless scene playback:**
- The next 2 scenes after the current scene are preloaded as hidden off-screen `<video>` elements
- Because the browser shares decoded container data across `<video>` elements with the same blob URL, when the active scene switches the new `<video>` mounts with `readyState >= 2` immediately — eliminating the 2–3 second decode gap between clips
- Trim start is also applied on mount so playback begins at the correct position without an extra seek

**Color grading (8 presets):**
Asaya Luxury · Film Noir · Warm Summer · Cool Winter · Matte Fade · Vibrant Pop · Golden Hour · Moody Dark

**Per-scene visual effects:**
Grayscale/B&W · Sepia/Vintage · Warm/Golden · Cool/Cold · Vignette · Blur/Dreamy · Cinematic · Matte/Fade · Vibrant/Pop · Moody/Dark · Bright/Light

**Overlays and guides:**
- Left filmstrip sidebar — click any scene to seek to its start
- Right scene info panel — label, mood, transition, duration, description, captions, brand overrides
- Safe-zone guide (dashed 8% inset border)
- Aspect ratio badge (top-left)
- Scene counter N/Total (top-right)
- Live caption playback — captions fade in at their start time, out at their end time
- Text Studio interactive caption layer (drag, resize, rotate)
- Brand Outro overlay on the designated outro scene
- Red recording dot + elapsed timestamp during playback

#### Playback Controls
- Play / Pause / Stop
- Previous scene / Next scene
- Scrub bar with scene boundary tick marks and a draggable thumb
- Current time and total duration display (M:SS.D format)
- BGM sync — snaps audio position to current timeline time on every resume, looping within the selected trim region
- Mute/unmute toggle
- Volume slider (shown when BGM is active and unmuted)

#### Timeline Panel
- Horizontal timeline with scene widths proportional to duration
- Drag-and-drop scene reordering
- Drag the right edge of a scene to resize its duration
- Zoom slider controls pixels-per-second density
- Playhead scrubber synced to canvas current time
- Transition icons between scene blocks — click to open the Transition Library for that gap
- Text Studio caption track lane below the scene track
- Outro scene indicator
- Drop zones between scenes — drop a file to insert it at that position
- Export button in the panel header

#### Asset Panel — Clips Tab
- Upload video (MP4, MOV, WebM) or image (JPG, PNG, WebP, HEIC)
- Drag a clip thumbnail onto any scene to assign it
- File name and type badge (VID / IMG) per clip
- Remove a clip from a scene without deleting the file
- AI-assigned clips are placed automatically when a Storyboard lineup is generated — the correct clip appears on the correct scene based on Gemini's keyframe analysis

#### Asset Panel — Music Tab
- 14 royalty-free background tracks
- Categories: Corporate, Cinematic, Upbeat, Ambient, Electronic
- Category filter buttons
- Play/pause inline preview per track
- Static waveform visualization per track
- **Trim Selector** — click `+ Add` on any track to expand the trim UI:
  - Drag-to-select a region on the waveform to choose exactly which portion of the track to use
  - Live audio playback while dragging — the track plays from the drag position in real time
  - Left and right handles on the selection region; drag the selection body to shift it without resizing
  - Waveform bars inside the selection are highlighted in purple; outside bars are dimmed
  - Animated playback cursor shows current position while the track is playing
  - Duration badge updates as you drag: "Add 0:24" shows how long the selected region is
  - Add button disabled when selected region is under 0.5 seconds
  - Clicking "Add Xs" adds the track to the timeline with trimStart and trimEnd saved
- Upload your own audio file — same Trim Selector UI applies
- Volume slider (0–100%)
- Fade-in and fade-out duration sliders (0–5s each)

**BGM playback** in CanvasPreview respects trimStart and trimEnd — audio loops within the selected trim region so only the chosen segment plays during preview.

#### Asset Panel — Brand Tab
- Primary color picker (hex input)
- Font family selector
- Logo position selector (bottom-center enforced in Asaya workspace)
- Color grade selector (8 presets)
- All overrides applied globally to the canvas render

#### Asset Panel — Text Studio Tab
- Add free-floating caption cards anywhere on the canvas
- **Transform:** drag to move, corner handles to resize, rotation handle to rotate
- **Text:** content, font (18 options), size, color
- **Style:** bold, italic, uppercase toggles
- **Layout:** alignment (left/center/right), letter spacing, line height
- **Drop shadow:** toggle on/off
- **Background box:** toggle, color, opacity
- **Stroke:** toggle, color, width
- **Entrance animation (11):** Fade In, Slide Up, Slide Down, Slide Left, Slide Right, Zoom In, Zoom Out, Bounce In, Spin In, Flip In, Typewriter
- **Exit animation (6):** Fade Out, Slide Up, Slide Down, Slide Left, Slide Right, Zoom Out
- **Loop animation (6):** Pulse, Glow, Shake, Float, Rotate, Bounce
- Start time / end time / duration controls
- Template presets: Modern Title, Bold CTA, Subtitle, Lower Third, Highlight
- Delete caption button

#### Asset Panel — History Tab
- Lists past AI generations for the workspace (from memory database)
- Shows: prompt excerpt, date, evaluation score, cluster label
- Load button re-applies a past generation's timeline to the current draft

#### Asset Panel — Settings Tab
- Grid overlay toggle
- Safe zones overlay toggle
- Rule of thirds overlay toggle

#### Properties Panel (right sidebar)
- Overall evaluation score (0–100) — red <60, yellow 60–79, green ≥80
- Pass / fail QA indicator
- Per-criteria score breakdown (pacing, hook, brand alignment, etc.)
- Per-platform score breakdown (Instagram, TikTok, YouTube)
- Issues list — problems flagged by the evaluator
- Improvements list — specific actionable suggestions
- Compliments list — what was generated well
- Gemini AI suggestions text

#### Generation — Prompt Bar
- Prompt text input (expands on focus)
- Aspect ratio picker: 9:16 · 16:9 · 1:1 · 4:5 · 3:4
- Platform chip: Instagram Reels, TikTok, YouTube Shorts, YouTube, LinkedIn
- Duration chip: 15s, 30s, 45s, 60s, 90s, 5m, custom
- Style chip: Fast-Paced, Cinematic, Minimal, Energetic, Luxury
- Elapsed timer shown during generation
- Pre-generation clarify flow: AI may ask 0–3 questions; user answers inline before generation proceeds
- Agent trace panel after generation: tool name, model used, duration per step
- Cluster label displayed after generation
- Demo mode fallback: if Gemini is unavailable, a sample timeline loads so the editor stays usable
- Refinement mode: second prompt modifies the existing timeline in-place (existing timeline sent as context)

#### Transition Library (modal)
30+ transition types across 10 categories:

| Category | Examples |
|---|---|
| Basic | Cut, Fade, Dissolve |
| Blur | Blur In, Blur Out, Motion Blur |
| Color | Flash White, Flash Black, Color Burn |
| Creative | Film Burn, Glitch, VHS |
| Distortion | Wave Warp, Ripple, Lens Distort |
| Light | Light Leak, Lens Flare, Bloom |
| Motion | Push, Pull, Slide |
| Split | Split H, Split V, Slice |
| Wipe | Wipe Left, Wipe Right, Wipe Up, Wipe Down |
| Zoom | Zoom In, Zoom Out, Zoom Punch |

Controls per transition: duration, speed (slow/normal/fast), intensity (0–100), direction, blur amount, motion strength, easing, mode (in/out/both).
Live animated preview card. AI smart suggestion chip.

#### Brand Outro Builder
- 4 presets: Classic (dark), White Minimal, Brand Purple, Energetic
- Logo SVG slot, brand name, tagline
- Entry animation per element: fade-in, scale-in, slide-up, slide-left
- Platform variant (affects sizing)
- Previews in the canvas on the designated outro scene

#### Autosave
- 2-second debounced autosave on any timeline, caption, or brand change
- Calls PATCH `/api/drafts/:id` silently — no manual save required
- Draft version number increments on every save

---

### Dashboard

**Continue Editing:**
- Horizontal scrollable row of the most recent in-progress drafts
- Click any card to open in the editor immediately

**Recent Drafts:**
- Responsive auto-fill grid
- Status filter tabs: All · Draft · In Progress · Completed
- Sort: Date (newest first) · Name (A–Z)
- Each DraftCard shows:
  - Thumbnail — AI cover image if available, otherwise color-coded scene strip, otherwise gradient placeholder
  - Name and relative date
  - Scene count badge
  - Three-dot context menu:
    - **Rename** — inline input; commit on Enter or blur; optimistic update
    - **Duplicate** — creates a copy via API; refreshes list
    - **Archive** — removes from list; sets status to "archived" in DB
    - **Delete** — permanent removal

**Quick Tools:** AI Image Gen · AI Video Gen · Vibe AI · Brand Kit

**Header:**
- Global search bar — real-time filter by draft name or prompt text
- Notification bell
- Avatar menu — profile settings, billing, keyboard shortcuts

---

### Authentication
- Email + password sign up and login
- Password strength meter on signup (4 segments: weak to strong)
- Show/hide password toggle on both forms
- "Remember me" checkbox — 30-day vs 7-day session cookie
- Animated error states per error type (no account / wrong password)
- HTTP-only, SameSite=lax JWT session cookie
- Auto-redirect: logged-in users hitting /login go to home; unauthenticated users go to /login

---

### Export and Render
- **Export plan:** sends timeline JSON to `/api/export`, returns an FFmpeg command string for reference
- **Local render:** `/api/render` invokes FFmpeg on the server and writes MP4 to `/public/exports/`
- **Cloud render:** if `GCS_BUCKET` is set, `/api/render` calls the Google Cloud Video Transcoder API instead

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Inline styles + CSS custom properties |
| Database | SQLite via `better-sqlite3` (WAL mode, FK enforcement) |
| Auth | `jose` (JWT HS256), `bcryptjs` (cost 12) |
| AI text/multimodal | Gemini 2.5 Pro + Flash via Vertex AI |
| AI images | Imagen 3 via Vertex AI |
| AI video | Veo 3.0 / 2.0 via Vertex AI |
| Video processing | FFmpeg (local) / Google Cloud Video Transcoder (cloud) |
| Keyframe extraction | Browser-side canvas (`<video>` + `<canvas>`) — 3 frames per clip at 15%/45%/75% |
| Animations | Web Animations API (transitions), CSS keyframes (UI) |
| Testing | Vitest + jsdom |

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Google Cloud credentials and session secret

# 3. Run development server
npm run dev
```

Open http://localhost:3000. SQLite databases are created automatically in `./data/` on first run.

---

## Environment Variables

```env
# Google Cloud Project
GOOGLE_PROJECT_ID=your-gcp-project-id
GOOGLE_LOCATION=us-central1

# Service account (Vertex AI + Cloud Storage)
GOOGLE_CLIENT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# Session signing secret — MUST be set in production (32+ characters)
SESSION_SECRET=replace-with-a-strong-random-string-32-chars-min

# Optional: fallback Gemini API key for file uploads
GEMINI_API_KEY=

# Optional: cloud render (leave blank to use local FFmpeg)
GCS_BUCKET=
GCS_RENDER_PREFIX=renders
```

**Google Cloud APIs to enable:**
- Vertex AI API
- Cloud Storage JSON API (required if Veo outputs GCS URIs, or for cloud render)
- Video Transcoder API (only if `GCS_BUCKET` is set)

**Vertex AI model access to request in GCP Console:**
- Gemini 2.5 Pro
- Gemini 2.5 Flash
- Imagen 3 (`imagen-3.0-generate-001`)
- Veo 2 (`veo-2.0-generate-001`)

**Service account IAM roles:**
- `roles/aiplatform.user` — all Vertex AI calls
- `roles/storage.objectViewer` — downloading Veo video output from GCS
- `roles/storage.objectCreator` — cloud render uploads (only if `GCS_BUCKET` set)
- `roles/transcoder.admin` — cloud render (only if `GCS_BUCKET` set)

---

## Architecture Overview

```
Browser
  └── Next.js 14 App Router
        ├── /api/lineup ─── AI pipeline (maxDuration: 300s)
        │     ├── Planner (gemini-2.5-pro)
        │     ├── Brief Interpreter (gemini-2.5-flash) ─┐ parallel
        │     ├── Hook Detector                          │
        │     ├── Timeline Generator (pro or flash)      │
        │     │     └── multimodal: keyframes from clips │
        │     │           + clip analysis → ordered      │
        │     │           clipAssignments[]              │
        │     ├── Transition Planner ────────────────────┘
        │     ├── Caption Generator
        │     ├── Music Selector
        │     └── Evaluator (scores 0–100)
        │
        ├── /api/generate-image ─── Imagen 3 via Vertex AI
        ├── /api/generate-video ─── Veo 3→2 via Vertex AI
        │     └── polls fetchPredictOperation every 5s, up to 3 min
        │
        ├── /api/render ─────────── FFmpeg or Cloud Transcoder (maxDuration: 300s)
        └── /api/drafts/* ────────── SQLite CRUD (session required)
```

**Clip analysis flow:** When the user attaches videos in Storyboard mode, the browser extracts 3 JPEG keyframes per clip (15%/45%/75%) via canvas and sends them inline as base64 to `/api/lineup`. Gemini 2.5 Pro receives both the text brief and all keyframes, identifies the person or content in each clip from the visual evidence, and emits a `clipAssignments` array that maps `clipIndex → sceneId` in the order the brief requests. The cross-check rule in the timeline generator verifies the first scene maps to the "start" person and the last scene maps to the "end" person before returning.

**Memory/learning loop:** Every completed generation is written to `frameai.db`. On the next generation for the same workspace, top past examples (by eval score) are injected as few-shot context — quality improves automatically over time.

---

## AI Models

| Model | Role |
|---|---|
| `gemini-2.5-pro` | Workflow planner, multimodal clip analysis, timeline generation, evaluator |
| `gemini-2.5-flash` | Brief interpreter, hook detection, transition planner, caption generator, music selector, clarifying questions |
| `imagen-3.0-generate-001` | Image generation; img2img with reference image |
| `veo-3.0-generate-preview` | Video clip generation (primary) |
| `veo-2.0-generate-001` | Video clip generation (automatic fallback) |

All AI calls authenticate via self-signed RS256 JWTs (`createVertexJWT`) — no OAuth token-exchange roundtrip required.

---

## Pages

| URL | Description |
|---|---|
| `/` | Dashboard — recent drafts, quick tools, Vibe AI |
| `/editor` | Full video editor (load draft via `?draft=UUID` param) |
| `/login` | Login |
| `/signup` | Sign up |
| `/ai-tools` | AI tools overview |

---

## API Routes

| Route | Method | Session required | Description |
|---|---|---|---|
| `/api/auth/login` | POST | No | Authenticate, issue session cookie |
| `/api/auth/signup` | POST | No | Create account, issue session cookie |
| `/api/auth/me` | GET | Yes | Get current user from session |
| `/api/auth/logout` | POST | No | Clear session cookie |
| `/api/lineup` | POST | No | Generate AI video timeline; accepts keyframes for clip analysis |
| `/api/lineup/clarify` | POST | No | Pre-generation clarifying questions |
| `/api/generate-image` | POST | No | Generate image via Imagen 3 |
| `/api/generate-video` | POST | No | Generate video clip via Veo |
| `/api/render` | POST | No | Render video (FFmpeg or Cloud Transcoder) |
| `/api/export` | POST | No | Generate FFmpeg command string for a timeline |
| `/api/upload-clip` | POST | No | Upload clip to Gemini File API |
| `/api/drafts` | GET / POST | Yes | List or create drafts |
| `/api/drafts/[id]` | GET / PATCH / DELETE | Yes | Get, update, or delete a draft |
| `/api/projects` | GET / POST | Yes | List or create projects |
| `/api/projects/[id]` | PATCH / DELETE | Yes | Update or delete a project |
| `/api/audio-proxy` | GET | No | CORS proxy for royalty-free music URLs |
| `/api/evaluate` | POST | No | Score a timeline against a workflow rubric |
| `/api/generations` | GET | No | List past AI generations from memory DB |
| `/api/check-models` | GET | No | Check which Vertex AI models are reachable |

---

## Database

Two SQLite databases auto-created in `./data/` on first run. Both use WAL journal mode and foreign key enforcement.

**`vydeo_users.db`** — user-facing data

| Table | Key columns |
|---|---|
| `users` | id, first_name, last_name, email (unique), password_hash, plan, timestamps |
| `projects` | id, user_id (FK), name, thumbnail, project_type, status |
| `drafts` | id, project_id (nullable FK), user_id (FK), name, prompt, timeline_data (JSON), captions_data (JSON), transitions_data (JSON), effects_data (JSON), brand_settings (JSON), aspect_ratio, current_playhead, status, version, last_updated |

**`frameai.db`** — AI generation memory

| Table | Purpose |
|---|---|
| `generations` | Full timeline JSON + metadata per run |
| `workflow_runs` | Planner decision, cluster, timing |
| `tool_executions` | Per-tool trace (model, duration, errors) |
| `evaluation_results` | QA score, per-criteria breakdown |
| `prompt_refinements` | Prompt quality learning |
| `workspace_preferences` | Aggregate stats per workspace |

---

## Key Types

**`UploadedAudio`** — represents a music track added to the timeline:
```typescript
interface UploadedAudio {
  id: string;
  name: string;
  objectUrl: string;
  file?: File;        // present for uploaded files; absent for library tracks
  size: number;
  duration?: number;
  trimStart?: number; // seconds into the audio to start playback
  trimEnd?: number;   // seconds into the audio to stop (undefined = play to end)
}
```

**`clipAssignments`** — returned by `/api/lineup` when video files are attached:
```typescript
Array<{ sceneId: string; clipIndex: number; trimStart: number; trimEnd?: number }>
```
Maps each AI-identified clip to its target scene, in the order the brief requested.

---

## Known Limitations

- **Forgot password** — the link on the login page goes to `/forgot-password` which is not implemented
- **Terms / Privacy pages** — linked from signup but not built
- **Avatar menu items** — Profile Settings, Billing, and Keyboard Shortcuts are not wired to routes
- **Export button** — generates a reference FFmpeg command string; actual MP4 render goes through `/api/render`
- **Veo availability** — requires Veo to be enabled in your Vertex AI project; Veo 3.0 may require allowlisting in your region
- **Cloud render** — inactive unless `GCS_BUCKET` is set; local FFmpeg writes to `public/exports/` with no file cleanup
- **Single workspace** — only the Asaya brand workspace is built in; multi-workspace support is not yet available
- **Music licensing** — the bundled Bensound tracks require a commercial license for production use
- **Library tracks in render** — library tracks added from the Music Tab use the preview CDN URL; the FFmpeg render uses this URL directly, so an internet connection is required during render for these tracks. Uploaded audio files render from local disk.
- **Generation API auth** — `/api/lineup`, `/api/generate-image`, `/api/generate-video` do not require a session; add rate limiting or auth middleware before public deployment
