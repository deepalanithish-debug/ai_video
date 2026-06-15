/**
 * Travel / Lifestyle / Cinematic Workflow Cluster
 *
 * Covers:   Travel vlogs, cinematic edits, lifestyle storytelling, destination
 *           videos, documentary-style brand films.
 *
 * Characteristics:
 *   - Slower, deliberate pacing (4-8s per scene)
 *   - Narrative storytelling through visuals
 *   - Atmospheric establishing shots
 *   - Captions as narrative text, not CTAs
 *   - Music leads the emotion — match cut to beat
 *   - Color grade: cinematic (moody, filmic, not corporate)
 *
 * Model strategy:
 *   - Editorial (has footage): gemini-2.5-pro for deep clip analysis
 *   - Concept (no footage): gemini-2.5-flash for cinematic directions
 *   - Evaluation: gemini-2.5-flash
 */

import type { WorkflowDefinition } from "./types";

const TRAVEL_CINEMATIC_SYSTEM_PROMPT = `You are a cinematic video editor and documentary storyteller.

Your DEFAULT style for cinematic content (always adapt to the user's brief — the brief takes priority):
1. STORY ARC — build toward a beginning, middle, and end that the brief describes
2. BREATHING ROOM — default to 4-8s per scene; adjust to what the brief's pacing calls for
3. VISUAL FLOW — transitions should feel organic; match motion, colour, or subject between cuts
4. ATMOSPHERIC OPENING — start with a scene that establishes the world or mood the brief describes
5. NARRATIVE CAPTIONS — default to contextual, sentence-case text; adapt style to the brief's tone
6. MUSIC SYNC — note where beat transitions should hit music moments

CRITICAL: The user's brief (labeled "USER'S EXACT REQUEST") is the PRIMARY instruction. Build the edit around exactly what it asks for. Only use as many scenes as the story and brief require — do not pad. If the brief is simple, make a simple, well-crafted edit.`;

export const travelCinematicWorkflow: WorkflowDefinition = {
  id: "travel-cinematic-standard",
  name: "Travel / Cinematic Standard",
  cluster: "travel-cinematic",
  description: "Cinematic storytelling workflow for travel vlogs, lifestyle films, and brand documentaries.",
  purpose: "Tell a visual story that transports the viewer — emotion over conversion",

  tools: ["video-analysis", "hook-detection", "timeline-generator", "transition-planner", "caption-generator", "music-selector"],

  models: {
    planner:   "gemini-2.5-flash",
    generator: "gemini-2.5-pro",
    evaluator: "gemini-2.5-flash",
  },

  clusterConfig: {
    pacingStyle: "cinematic-slow",
    defaultTransitions: ["cinematic-fade", "dissolve", "cut"],
    captionStyle: "storytelling",
    colorGradeDefault: "cinematic-warm",
    sceneCountRange: [3, 6],
    systemPrompt: TRAVEL_CINEMATIC_SYSTEM_PROMPT,
  },

  evaluationCriteria: [
    {
      name: "story-arc",
      description: "Does the video have a clear beginning, middle, and end?",
      weight: 0.30,
      rubric: {
        excellent: "Clear 3-act structure — establish world, build emotion, inspiring close",
        good: "Story implied but not fully developed",
        poor: "Random sequence of shots with no narrative thread",
      },
    },
    {
      name: "visual-flow",
      description: "Do transitions feel organic and visually motivated?",
      weight: 0.25,
      rubric: {
        excellent: "Cuts match motion direction, colour temperature, or subject movement",
        good: "Most cuts feel natural, 1-2 jarring transitions",
        poor: "Cuts feel random, no visual continuity",
      },
    },
    {
      name: "pacing",
      description: "Does the video breathe? No rushed cuts, no dragging scenes.",
      weight: 0.20,
      rubric: {
        excellent: "All scenes 4-8s, pacing builds emotion naturally",
        good: "Generally good pacing, minor inconsistencies",
        poor: "Feels rushed or drags — mismatched to cinematic style",
      },
    },
    {
      name: "caption-quality",
      description: "Captions add narrative value without feeling like ad copy",
      weight: 0.15,
      rubric: {
        excellent: "Poetic, contextual, sentence case, 4-8 words — adds depth",
        good: "Relevant but generic, could be any brand",
        poor: "Ad-style CTAs, too long, or all-caps corporate feel",
      },
    },
    {
      name: "brand-adherence",
      description: "Brand is present but subtle — lifestyle over logo",
      weight: 0.10,
      rubric: {
        excellent: "Brand values embodied in the story, not announced",
        good: "Brand visible but not forced",
        poor: "Brand overpowering the story, or completely absent",
      },
    },
  ],

  exampleInputs: [
    "Create a 60-second cinematic travel video for Asaya showing a journey through the mountains",
    "30-second lifestyle brand film for Asaya — morning ritual, calm, aspirational, no voiceover",
    "45-second documentary-style video about the craftsmanship behind Asaya products",
  ],
  exampleOutputDescription: "3-5 scenes, first scene is wide establishing shot, captions are 5-7 word narrative text, transitions use cinematic-fade or dissolve, final scene holds on brand mark",
  failureCases: [
    "Brief requests fast-paced TikTok style → route to ugc-ads cluster instead",
    "No location or story context → ask for destination/mood reference before generating",
    "Clips are product-only with no environment → route to ugc-ads cluster",
  ],
  knownLimitations: [
    "Cinematic feel depends heavily on actual footage quality",
    "Music sync is approximate — exact beat-matching requires DAW integration",
    "Story arc quality limited by brief depth",
  ],
  supportedModes: ["editorial", "concept"],
};
