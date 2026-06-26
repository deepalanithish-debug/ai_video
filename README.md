# VydeoAI

AI-powered video editor for marketing teams, agencies, and content creators.

## Overview

VydeoAI is a full-stack Next.js application that combines AI-assisted video production with a professional non-linear editing interface. Describe your video in plain English and get a complete scene-by-scene timeline in seconds.

## Features

### AI
- **AI Lineup Generator** — Describe your video; Gemini generates a full scene timeline (labels, descriptions, durations, transitions, mood)
- **AI Chat Assistant** — Floating chat that understands intent: "add transitions", "make it faster", "generate captions"
- **Quick Actions** — One-click AI actions for captions, pacing, transitions, mood
- **Script to Video** — Paste a script and get a full video structure

### Editor
- **Multi-track Timeline** — Video, audio, and caption tracks with zoom (0.25×–8×) and drag-resize clips
- **Canvas Preview** — Live playback with RAF-based ticker, transport controls, volume
- **Scene Inspector** — Aspect ratio, duration, label, mood, add/delete per scene
- **Caption Overlay** — Animated captions with font, size, color, alignment, timing

### Studios (Left Panel Tabs)
| Tab | Features |
|-----|----------|
| **Media** | Drag & drop upload, video/image thumbnails, auto-fill scenes |
| **Text** | Per-scene captions, 9 fonts, animations (fade, slide, typewriter), color/style controls |
| **Music** | Upload tracks + royalty-free library, volume/fade controls per track |
| **Transitions** | 14 transition types across 5 categories, duration slider, apply-to-all |
| **Brand Kit** | Logo upload, color palette presets, typography, live preview |
| **AI Tools** | Inline AI with quick prompts, runs against Gemini API |

### Pages
- **Home** — Project dashboard with stats, filters, grid/list view, new project modal
- **Templates** — 8 ready-to-use templates (Fashion, Marketing, Social, Branding, Real Estate, Events) with real pre-built scenes and captions
- **Assets** — Media library with upload, filter by type, grid and list views
- **Music** — Royalty-free library with mood/genre filters + custom upload
- **Brand Kit** — Full brand identity manager with multiple kit support and live preview
- **AI Tools** — Dedicated AI tools hub

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Custom CSS design system (CSS variables) |
| State | Zustand |
| AI | Google Gemini 2.5 Flash (REST API) |
| Auth | JWT sessions (`jose`) + MongoDB |
| Database | MongoDB |
| Video Render | FFmpeg (server-side) |
| Testing | Vitest + jsdom |

## Project Structure

```
app/
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login, signup pages
│   │   ├── (protected)/       # All authenticated pages
│   │   │   ├── page.tsx       # Home dashboard
│   │   │   ├── editor/[id]/   # Editor route
│   │   │   ├── templates/     # Template gallery
│   │   │   ├── assets/        # Asset manager
│   │   │   ├── music/         # Music library
│   │   │   ├── brand-kit/     # Brand identity
│   │   │   └── ai-tools/      # AI tools hub
│   │   ├── api/               # API routes
│   │   │   ├── lineup/        # AI scene generation
│   │   │   ├── render/        # FFmpeg video export
│   │   │   ├── projects/      # Project CRUD
│   │   │   └── auth/          # Login/signup/logout
│   │   └── globals.css        # Design system
│   ├── components/
│   │   ├── editor2/           # Full editor (new)
│   │   │   ├── EditorShell.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── AIChat.tsx
│   │   │   ├── panels/        # Media, Text, Music, Transitions, Brand, AI tabs
│   │   │   ├── canvas/        # CanvasPreview + SceneVisual
│   │   │   ├── timeline/      # Multi-track timeline
│   │   │   └── inspector/     # Contextual inspector
│   │   └── layout/
│   │       └── AppShell.tsx   # Sidebar + topbar layout
│   ├── store/
│   │   └── editorStore.ts     # Zustand store (all editor state)
│   └── __tests__/             # Vitest tests
│       ├── editorStore.test.ts
│       └── utils.test.ts
└── vitest.config.ts
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- FFmpeg (`brew install ffmpeg` on macOS)
- Google Gemini API key

### Setup

```bash
# Clone and install
cd app
npm install

# Create environment file
cp .env.example .env.local
```

Edit `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/vydeoai
JWT_SECRET=your-secret-key-min-32-chars
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_SERVICE_ACCOUNT_EMAIL=optional
GOOGLE_PRIVATE_KEY=optional
```

### Run

```bash
npm run dev      # Development server → http://localhost:3000
npm run build    # Production build
npm start        # Production server
```

### Test

```bash
npm test          # Run all tests once
npm run test:watch  # Watch mode
```

## Design System

The app uses a custom CSS variable–based design system (see `globals.css`):

- **Theme**: Dark, neutral background (`#0C0C0F`) with soft indigo accent (`#6366F1`)
- **Typography**: Inter, system-ui
- **Spacing**: 4px base grid (`--sp-1` through `--sp-16`)
- **Radii**: `--r-xs` (4px) → `--r-xl` (20px)
- **Shadows**: 5 elevation levels
- **Motion**: Spring-eased transitions, RAF playback

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/login` | POST | Authenticate user, return JWT |
| `/api/auth/signup` | POST | Create account |
| `/api/auth/logout` | POST | Clear session cookie |
| `/api/projects` | GET | List projects |
| `/api/projects` | POST | Create project |
| `/api/projects/[id]` | GET/PATCH/DELETE | Project CRUD |
| `/api/lineup` | POST | AI scene generation via Gemini |
| `/api/render` | POST | FFmpeg video export |

## n8n Workflows (Backend)

Automation workflows are handled server-side via n8n webhooks. Set these environment variables to enable:

```env
N8N_WEBHOOK_URL=https://your-n8n-instance/webhook
N8N_API_KEY=your-n8n-api-key
```

Supported automations: auto-caption, brand-check, multi-platform resize, Slack notifications, scheduled regeneration, auto-publish.

## Testing

Tests cover:
- **Editor store** — all CRUD operations (scenes, clips, audio, captions, brand kit, playback, zoom)
- **Utilities** — duration formatting, file size formatting, time-ago, aspect ratio calculator, clamp

```
✓ 196 tests passing across 13 test files
```

## Changelog

### Latest
- Rebranded FRAMEAI → **VydeoAI**
- New simple & elegant theme (indigo accent, clean dark surfaces)
- Removed n8n from UI — moved to backend-only
- Rebuilt AI Tools page with consistent UI
- Fixed Templates — real pre-built scenes load into editor
- Added Vitest test suite (196 tests)
- `/projects`, `/assets`, `/music`, `/templates` pages
- Fixed redirect loop at root `/`
