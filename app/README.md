# VydeoAI — AI-First Creative Operating System

> The world's most intuitive AI-first video creation platform for marketing teams, agencies, startups, and content creators.

---

## Philosophy

**AI is the primary interaction. Timeline is the refinement interface.**

- Users describe an idea in natural language
- AI builds a complete, professional storyboard in seconds
- Users refine through conversation, then fine-tune in the editor
- Every UI action has a natural language equivalent

---

## User Flow

```
Login → Home → AI Workspace → Generation → Version Selection → Professional Editor → Export
```

The Editor is **never** the first experience. AI Workspace **always** comes first.

---

## What's New (June 2026)

### AI Workspace (NEW)
The heart of VydeoAI. A dedicated creative space at `/workspace` where:
- **Prompt input** is always visible — never disappears
- **Multiple versions** can be generated and compared side-by-side
- **Storyboard view** shows every scene with captions, transitions, and mood
- **AI Plan panel** explains the narrative structure and reasoning
- **Prompt history** for quick reuse
- **Reference file uploads** for visual inspiration
- **Refinement bar** — type follow-up instructions to iterate

### Rebuilt Home Page
A guide-first experience with 12 sections:
- Continue Editing, Create with AI, Recent AI Generations, Recent Drafts
- Trending Templates, Prompt Library, Brand Kit, Learn VydeoAI
- Community Inspiration, Latest Updates, Quick Actions
- **First-time user walkthrough** — interactive 4-step onboarding

### Projects Page
Dedicated project management (not the home page):
- Folder sidebar (Marketing, Branding, Social Media, etc.)
- Tabs: Recent, Drafts, Versions, Archived, Shared
- Search, sort (last edited / name / scenes), status filter
- Grid + List view toggle
- Per-project context menu (Open, Duplicate, Archive, Delete)
- Autosave indicator on every project

### Professional Timeline
- **Vertical resize** — drag the top edge to resize the panel
- **Fullscreen mode** — expand timeline for detailed editing
- **Dock / Undock** toggle
- **Timeline Minimap** — birds-eye view with viewport window
- **Track Lock / Hide / Collapse / Rename** per track
- **Track Colors** with mood-based clip colors
- **Timeline Markers** — add named markers at current time
- **Horizontal zoom** (0.1× to 10×) with FIT button
- **Waveforms** on audio tracks with type-based colors (BGM/Voice/SFX)
- **Clip thumbnails** strip on video scenes
- **Caption dots** on scene clips showing how many captions exist
- **Playhead** with glowing circle indicator
- **Ruler** with click-to-seek

### Template Marketplace
- **Product cards** with full metadata (duration, scenes, platform, difficulty, etc.)
- **Hover overlay** with Preview + Use buttons
- **Scene breakdown** modal preview
- **Star ratings** with review counts
- **AI Recommended** section
- Filters: Category, Platform, Format, Difficulty
- 8 fully designed templates (Luxury Product Reveal, Brand Story, TikTok Hook, Corporate Explainer, Fashion Lookbook, App Demo, Event Hype, Wellness)

### Design System v2
- Complete CSS variable overhaul for consistent tokens
- New animation classes: `animate-fade-in`, `animate-fade-up`, `animate-scale-in`, `animate-pulse-ai`
- `ai-thinking` dot animation component
- `gen-progress` gradient progress bar
- `scene-card`, `version-card` shared UI primitives
- `glass` utility for backdrop blur panels
- Skeleton shimmer for loading states
- Stagger animation for lists

---

## Features

### AI Layer
- **Gemini 2.5 Flash** for scene generation via `/api/lineup`
- **Demo fallback** — works without API key using sample content
- **AI Creative Director personality** — explains decisions, suggests alternatives
- **Prompt refinement** — iterate via conversation
- Multiple version generation with comparison

### Editor (editor2)
- Multi-track timeline (Video, Audio, Captions)
- Left panel with 6 studio tabs: Media, Text, Music, Transitions, Brand, AI
- Center canvas with scene preview and transport controls
- Right panel: AI assistant + inspector
- Zustand global state (`editorStore.ts`)
- Aspect ratios: 9:16, 16:9, 1:1, 4:5

### Other Pages
- `/brand-kit` — Multi-kit management with color presets and typography
- `/assets` — Media library with upload, filter, grid/list view
- `/music` — Royalty-free track library + custom uploads
- `/ai-tools` — Batch AI operations (captions, transitions, pacing, music match)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Custom CSS variables (no Tailwind) |
| Animations | Framer Motion + CSS keyframes |
| AI | Google Gemini 2.5 Flash |
| State | Zustand (`editorStore`) |
| Auth | JWT (`jose`) + Next.js middleware |
| Database | MongoDB |
| Video | FFmpeg (server-side render) |
| Testing | Vitest + Testing Library |

---

## Project Structure

```
app/src/
├── app/
│   ├── (auth)/login/         Login page
│   ├── (auth)/signup/        Signup page
│   ├── (protected)/
│   │   ├── page.tsx          Home (guide-first, 12 sections)
│   │   ├── workspace/        AI Workspace (create flow)
│   │   │   └── [id]/         Project-specific workspace
│   │   ├── editor/[id]/      Professional Editor
│   │   ├── projects/         Project management
│   │   ├── templates/        Template marketplace
│   │   ├── brand-kit/        Brand identity management
│   │   ├── assets/           Media library
│   │   ├── music/            Music library
│   │   └── ai-tools/         Batch AI operations
│   ├── api/
│   │   ├── lineup/           AI scene generation
│   │   ├── projects/         Project CRUD
│   │   ├── render/           Server-side FFmpeg render
│   │   └── auth/             Auth endpoints
│   └── globals.css           Design system tokens + utilities
├── components/
│   ├── layout/AppShell.tsx   Sidebar + topbar shell
│   ├── workspace/            AI Workspace components
│   │   └── AIWorkspace.tsx   Full workspace UI
│   ├── editor2/              Professional editor components
│   │   ├── EditorShell.tsx   Main editor layout
│   │   ├── TopBar.tsx        Editor toolbar
│   │   ├── panels/           Left panel studio tabs
│   │   ├── canvas/           Preview + playback
│   │   ├── timeline/         Professional timeline
│   │   └── inspector/        Contextual inspector
│   └── ui/icons.tsx          Icon system
├── store/
│   └── editorStore.ts        Zustand global state
└── __tests__/                Vitest test suite
```

---

## Getting Started

```bash
# Install
cd app && npm install

# Environment
cp .env.example .env.local
# Set GEMINI_API_KEY, MONGODB_URI, JWT_SECRET

# Dev
npm run dev

# Build
npm run build

# Test
npm test
```

---

## Environment Variables

```env
GEMINI_API_KEY=           # Google Gemini API key
MONGODB_URI=              # MongoDB connection string
JWT_SECRET=               # JWT signing secret (32+ chars)
N8N_WEBHOOK_URL=          # n8n webhook (optional, backend only)
```

---

## Design Principles

1. **AI first, UI second** — every feature accessible via natural language
2. **Never overwhelm** — progressive disclosure, contextual panels
3. **No dead ends** — every page educates or creates value
4. **First-time success** — any user can go from idea to export without help
5. **Performance** — lazy loading, virtualized timeline, autosave, 60fps
