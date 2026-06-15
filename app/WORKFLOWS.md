# FrameAI — Workflow Documentation

> Every workflow must document: purpose, inputs, outputs, models, tools, evaluation criteria,
> example inputs, example outputs, failure cases, known limitations.

---

## Architecture Overview

```
User Request
      ↓
Planner Agent          ← selects workflow + tool execution plan
      ↓
Workflow Registry      ← looks up registered workflow by cluster
      ↓
Tool Executor          ← runs each tool in plan order, passes results forward
      ↓
Evaluator Agent        ← scores output against workflow criteria
      ↓
SQLite Memory          ← persists run, tool trace, evaluation, generation
      ↓
Response               ← timeline + trace + evaluation + music spec
```

---

## Workflow Clusters

| Cluster | ID | Content Types | Pacing | Caption Style |
|---|---|---|---|---|
| UGC / Ads | `ugc-ads-standard` | Instagram ads, product videos, TikTok, Reels, UGC | Fast-cuts (2–5s) | Punchy ALL-CAPS |
| Travel / Cinematic | `travel-cinematic-standard` | Travel vlogs, cinematic edits, lifestyle films | Cinematic-slow (4–8s) | Storytelling narrative |

---

## Registered Tools

| Tool | Purpose | Model | Input | Output |
|---|---|---|---|---|
| `video-analysis` | Understand footage before editing | gemini-2.5-pro | Clips (base64) | Per-clip quality, scenes, usability, hook candidates |
| `hook-detection` | Find highest-engagement opening segment | gemini-2.5-flash | Video analysis + brief | Ranked hook candidates with engagement scores |
| `timeline-generator` | Generate the full edit plan | gemini-2.5-pro (editorial) / gemini-2.5-flash (concept) | Brief + cluster config + hook | Timeline JSON + clip assignments + suggestions |
| `transition-planner` | Improve transition choices for pacing | gemini-2.5-flash | Timeline + cluster pacing | Per-scene transition type + flow score |
| `caption-generator` | Refine captions per cluster style | gemini-2.5-flash | Timeline + brand limits | Updated captions per scene |
| `music-selector` | Recommend music spec for the video | gemini-2.5-flash | Cluster + tone + duration | Primary + alternative music specs with search keywords |

---

## Workflow: UGC / Ads Standard

**ID:** `ugc-ads-standard`
**Cluster:** `ugc-ads`
**Supported modes:** editorial (has footage), concept (no footage)

### Purpose
Generate performance marketing video that hooks in 0.3s and converts. Every second counts.

### Tool Execution Plan

```
[editorial mode]                    [concept mode]
video-analysis                      hook-detection
hook-detection                      timeline-generator
timeline-generator          →       transition-planner
transition-planner                  caption-generator
caption-generator                   music-selector (if >20s)
music-selector (if >20s)
```

### Model Strategy

| Stage | Model | Reason |
|---|---|---|
| Planner | gemini-2.5-flash | Fast intent parsing |
| Video analysis | gemini-2.5-pro | Multimodal vision required |
| Timeline generation (editorial) | gemini-2.5-pro | Deep clip understanding |
| Timeline generation (concept) | gemini-2.5-flash | Text-only creative directions |
| All other tools | gemini-2.5-flash | Fast, sufficient for these tasks |

### Evaluation Criteria

| Criterion | Weight | What it measures |
|---|---|---|
| `hook-quality` | 30% | First 3s creates immediate engagement |
| `pacing` | 20% | Fast enough cuts for platform |
| `cta-clarity` | 20% | Clear call-to-action in final scene |
| `caption-quality` | 15% | Punchy, on-brand, within char limit |
| `brand-adherence` | 15% | Matches style keywords, no prohibited elements |

**Pass threshold:** ≥60/100

### Example Inputs
- `"Create a 15-second Instagram Reel ad for Asaya featuring the new summer collection — energetic, product-forward"`
- `"30-second TikTok ad for Asaya skincare — UGC style, human testimony, warm tones, clear CTA"`

### Expected Output Shape
4–7 scenes, first scene = product close-up or person reacting, captions ALL-CAPS max 3 words, final scene = "SHOP NOW. ASAYA.", transitions = cuts

### Failure Cases
- Brief has no product/brand info → clarify before generating
- Target duration <5s → minimum 5s enforced
- Clips show wrong product → flag mismatch, generate concept directions

### Known Limitations
- Cannot generate actual video — produces edit plan for rendering engine
- Music selection is specification-only (no licensed tracks)
- Platform algorithm changes may affect engagement score accuracy

---

## Workflow: Travel / Cinematic Standard

**ID:** `travel-cinematic-standard`
**Cluster:** `travel-cinematic`
**Supported modes:** editorial (has footage), concept (no footage)

### Purpose
Tell a visual story that transports the viewer. Emotion over conversion.

### Tool Execution Plan

```
[editorial mode]                    [concept mode]
video-analysis                      timeline-generator
hook-detection                      transition-planner
timeline-generator          →       caption-generator
transition-planner                  music-selector (if >20s)
caption-generator
music-selector (if >20s)
```

### Model Strategy
Same as UGC/Ads but concept generator uses Flash with a cinematic storytelling system prompt.

### Evaluation Criteria

| Criterion | Weight | What it measures |
|---|---|---|
| `story-arc` | 30% | Clear beginning / middle / end |
| `visual-flow` | 25% | Organic, visually-motivated transitions |
| `pacing` | 20% | Scenes breathe at 4–8s |
| `caption-quality` | 15% | Narrative, not sales copy |
| `brand-adherence` | 10% | Brand present but subtle |

**Pass threshold:** ≥60/100

### Example Inputs
- `"Create a 60-second cinematic travel video for Asaya showing a journey through the mountains"`
- `"30-second lifestyle brand film for Asaya — morning ritual, calm, aspirational, no voiceover"`

### Expected Output Shape
3–5 scenes, first = wide establishing shot, captions 5–7 word narrative text, transitions = cinematic-fade or dissolve, final scene holds on brand mark

### Failure Cases
- Brief requests fast-paced TikTok style → route to `ugc-ads` cluster
- No location or story context → ask for destination/mood reference
- Clips are product-only with no environment → route to `ugc-ads`

---

## Planner Agent

**Model:** gemini-2.5-flash
**File:** `src/lib/agents/planner.ts`

The Planner receives the user brief and outputs a complete execution plan — **no hardcoded routing logic anywhere else.**

### Inputs
- User prompt
- `hasClips` boolean + clip count
- Brand name + style keywords
- Available workflow list (from registry)

### Outputs
```typescript
{
  cluster: "ugc-ads" | "travel-cinematic",
  mode: "editorial" | "concept",
  workflowId: string,
  intent: string,
  tone: string,
  platform: string,
  tools: [{ toolName: string, reason: string }],
  clarifyingQuestions: string[],
  isComplete: boolean,
  confidence: number,
  planningNotes: string
}
```

### Safety Rules (enforced in code, not just prompt)
- `hasClips=true` → `mode` always corrected to `"editorial"`
- `timeline-generator` always in tool plan (it's the core)
- Unknown tool names filtered against `TOOL_NAMES` registry

---

## Evaluator Agent

**Model:** gemini-2.5-flash
**File:** `src/lib/agents/evaluator.ts`

Runs on every generated timeline before the response is returned. Score is persisted to SQLite.

### Inputs
- Timeline JSON
- Brand workspace
- Workflow definition (determines evaluation criteria + weights)
- Original prompt
- Target duration (optional)

### Outputs
```typescript
{
  overallScore: number,      // 0-100 weighted average
  criteriaScores: [...],     // per-criterion score + rating + notes
  passedQA: boolean,         // score >= 60
  issues: string[],
  improvements: string[],
  compliments: string[]
}
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `generations` | Every successful generation (learning corpus for future prompts) |
| `workflow_runs` | One record per API call — workflow, cluster, mode, tools, score |
| `tool_executions` | Per-tool timing and success within a run |
| `evaluation_results` | Detailed scores per run |
| `prompt_refinements` | Original → refined prompt pairs with outcome scores |
| `workspace_preferences` | Workspace-level aggregate stats |

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `POST /api/lineup` | POST | Generate a video lineup (main entry point) |
| `POST /api/lineup/clarify` | POST | Pre-generation brief gap detection |
| `POST /api/evaluate` | POST | Standalone evaluation of any timeline |
| `POST /api/render` | POST | Render timeline to video (cloud or local) |

---

## Multi-Model Strategy

| Task | Model | Why |
|---|---|---|
| Intent planning | gemini-2.5-flash | Fast, doesn't need vision |
| Video clip analysis | gemini-2.5-pro | Multimodal vision required |
| Editorial timeline (has footage) | gemini-2.5-pro | Deep clip understanding |
| Concept timeline (no footage) | gemini-2.5-flash | Text-only, fast |
| Hook detection | gemini-2.5-flash | Reasoning, not vision |
| Transition planning | gemini-2.5-flash | Lightweight reasoning |
| Caption generation | gemini-2.5-flash | Creative text, no vision |
| Music selection | gemini-2.5-flash | Lightweight matching |
| Evaluation / QA | gemini-2.5-flash | Structured scoring |
| Clarifying questions | gemini-2.5-flash | Fast gap detection |

Models are **explicitly named per task** and **replaceable without changing workflow logic.**

---

## Adding a New Workflow

1. Create `src/lib/workflows/my-workflow.ts` implementing `WorkflowDefinition`
2. Register it in `src/lib/workflows/registry.ts`
3. The Planner agent discovers it automatically — no routing changes needed
4. Add documentation section to this file

---

## Adding a New Tool

1. Create `src/lib/tools/my-tool.ts` implementing `Tool<TIn, TOut>`
2. Export it from `src/lib/tools/index.ts` and add to `TOOL_NAMES`
3. Handle it in the tool executor loop in `src/lib/agent-pipeline.ts`
4. Add documentation to this file

---

## Success Criteria

The rebuild is successful only if:

- [x] Workflow matches professional editor workflow (analyze → hook → edit → transitions → captions → music → evaluate)
- [x] Output quality evaluated on every generation with workflow-specific criteria
- [x] Workflows are modular — each is a self-contained registered definition
- [x] New video types can be added by registering a new workflow (no core changes)
- [x] Models can be swapped per-tool without changing orchestration logic
- [x] Documentation synchronized with implementation (this file)
- [x] System learns from previous generations (SQLite learning layer)

**Priority order: workflow parity → output quality → automation speed → UI**
