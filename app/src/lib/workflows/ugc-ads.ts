/**
 * UGC / Ads / Human Videos Workflow Cluster
 *
 * Covers:   Instagram ads, product videos, brand content, user-generated content,
 *           TikTok ads, Reels, short-form promotional content.
 *
 * Characteristics:
 *   - Fast-paced cuts (every 2-4s)
 *   - Punchy ALL-CAPS captions
 *   - Strong hook in first 0.3s
 *   - Product or human face visible early
 *   - Clear CTA in final scene
 *   - Music: upbeat, trend-forward, modern electronic or pop
 *
 * Model strategy:
 *   - Editorial (has footage): gemini-2.5-pro for clip analysis
 *   - Concept (no footage): gemini-2.5-flash for directions
 *   - Evaluation: gemini-2.5-flash
 */

import type { WorkflowDefinition } from "./types";

const UGC_ADS_SYSTEM_PROMPT = `You are a high-performance social media video editor specializing in UGC ads and branded content.

Your DEFAULT style for social/ad content (always adapt to the user's brief — the brief overrides every default below):
1. HOOK FIRST — opening should engage quickly; how quickly depends on the brief's energy level
2. PACING — default to punchy cuts (2-5s) for ads; if the brief asks for slower/narrative/cinematic pacing, honor that exactly
3. CAPTIONS — default to short and direct; if the brief specifies a different caption style or tone, match it
4. CTA — include a call-to-action if the brief is promotional; omit if it's brand storytelling
5. MOBILE-FIRST — design for vertical viewing, text in lower 40% of frame

CRITICAL: The user's brief (labeled "USER'S EXACT REQUEST") is the PRIMARY instruction. Read it carefully and build the edit around what it actually asks for. Do not force fast cuts if the brief wants breathing room. Do not use ALL CAPS if the brief asks for a different tone. Do not add more scenes than the brief and content require — unnecessary cuts make the video worse, not better.`;

export const ugcAdsWorkflow: WorkflowDefinition = {
  id: "ugc-ads-standard",
  name: "UGC / Ads Standard",
  cluster: "ugc-ads",
  description: "Fast-paced ad workflow for Instagram, TikTok, and Reels. Product-first, hook-driven, CTA-focused.",
  purpose: "Generate performance marketing video that hooks in 0.3s and converts",

  tools: ["video-analysis", "hook-detection", "timeline-generator", "transition-planner", "caption-generator", "music-selector"],

  models: {
    planner:   "gemini-2.5-flash",
    generator: "gemini-2.5-pro",    // Pro for editorial; Flash for concept
    evaluator: "gemini-2.5-flash",
  },

  clusterConfig: {
    pacingStyle: "fast-cuts",
    defaultTransitions: ["cut", "zoom-in", "dissolve"],
    captionStyle: "punchy",
    colorGradeDefault: "vibrant",
    sceneCountRange: [4, 8],
    systemPrompt: UGC_ADS_SYSTEM_PROMPT,
  },

  evaluationCriteria: [
    {
      name: "hook-quality",
      description: "Does the first 3 seconds create immediate engagement?",
      weight: 0.30,
      rubric: {
        excellent: "Product or face visible in first 0.5s, strong visual intrigue",
        good: "Engaging opener but slow start (>1s to main subject)",
        poor: "Generic intro, no immediate hook",
      },
    },
    {
      name: "pacing",
      description: "Are cuts fast enough for the platform? No scene should drag.",
      weight: 0.20,
      rubric: {
        excellent: "All scenes 2–5s, energy builds through video",
        good: "Most scenes fast, 1-2 longer scenes acceptable",
        poor: "Multiple scenes over 6s, energy sags in middle",
      },
    },
    {
      name: "cta-clarity",
      description: "Is the call-to-action clear and prominent in the final scene?",
      weight: 0.20,
      rubric: {
        excellent: "Final scene has clear CTA text + brand name visible",
        good: "Brand visible but CTA implicit",
        poor: "No CTA, ends on product shot with no direction",
      },
    },
    {
      name: "caption-quality",
      description: "Are captions punchy, on-brand, and within character limits?",
      weight: 0.15,
      rubric: {
        excellent: "Short, bold, all caps where needed, each caption adds new info",
        good: "Generally good but some captions too long or generic",
        poor: "Captions too long, lowercase, or missing entirely",
      },
    },
    {
      name: "brand-adherence",
      description: "Does the output match brand style keywords and avoid prohibited elements?",
      weight: 0.15,
      rubric: {
        excellent: "All style keywords present, no prohibited elements",
        good: "Mostly on-brand, 1-2 minor deviations",
        poor: "Off-brand tone or prohibited elements present",
      },
    },
  ],

  exampleInputs: [
    "Create a 15-second Instagram Reel ad for Asaya featuring the new summer collection — energetic, product-forward",
    "30-second TikTok ad for Asaya skincare — UGC style, human testimony, warm tones, clear CTA",
    "Make a 20-second brand video showing Asaya's product in use — lifestyle focus, fast cuts",
  ],
  exampleOutputDescription: "4-7 scenes, first scene is product close-up or person reacting, captions in ALL CAPS max 3 words, final scene = 'SHOP NOW. ASAYA.', transitions mostly cuts",
  failureCases: [
    "Brief has no product/brand information → clarify before generating",
    "Target duration <5s → minimum 5s enforced",
    "Clips show wrong product → flag as mismatch, generate concept directions instead",
  ],
  knownLimitations: [
    "Cannot generate actual video — produces edit plan for human execution or rendering engine",
    "Music selection is specification-only, not licensed track",
    "Platform algorithm changes may affect engagement score accuracy",
  ],
  supportedModes: ["editorial", "concept"],
};
