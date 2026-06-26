/**
 * AI Model Router — central model config for VydeoAI.
 * Change models here; no other file needs to know model IDs.
 */

export const AI_MODELS = {
  // Planning & structured reasoning
  planning: 'gemini-2.5-pro',
  // Fast conversational turns
  chat: 'gemini-2.5-flash',
  // Storyboard / script generation (needs full reasoning)
  storyboard: 'gemini-2.5-pro',
  // Clarifying questions (fast, cheap)
  clarify: 'gemini-2.5-flash',
  // Video evaluation
  evaluate: 'gemini-2.5-pro',
  // Image generation
  imageGen: 'imagen-4.0-generate-preview-05-20',
  // Video generation
  videoGen: 'veo-3.0-generate-preview',
  // Video generation fallback
  videoGenFallback: 'veo-2.0-generate-001',
  // Embeddings / semantic search
  embeddings: 'text-embedding-005',
  // Vision / multimodal analysis
  vision: 'gemini-2.5-pro',
} as const

export type AITask = keyof typeof AI_MODELS
export type AIModel = typeof AI_MODELS[AITask]

/** Get the model ID for a given task. */
export function getModel(task: AITask): string {
  return AI_MODELS[task]
}

/** Veo model preference list (primary → fallback). */
export const VEO_MODELS = [
  AI_MODELS.videoGen,
  AI_MODELS.videoGenFallback,
] as const

/**
 * Gemini generation config presets.
 * Import these in route handlers for consistent behavior.
 */
export const GEN_CONFIG = {
  planning: {
    temperature: 1.0,
    maxOutputTokens: 8192,
    thinkingConfig: { thinkingBudget: 8000 },
  },
  chat: {
    temperature: 0.9,
    maxOutputTokens: 2048,
  },
  storyboard: {
    temperature: 1.0,
    maxOutputTokens: 16384,
    thinkingConfig: { thinkingBudget: 12000 },
  },
  clarify: {
    temperature: 1.0,
    maxOutputTokens: 1024,
    thinkingConfig: { thinkingBudget: 1000 },
  },
  evaluate: {
    temperature: 0.7,
    maxOutputTokens: 4096,
    thinkingConfig: { thinkingBudget: 4000 },
  },
  json: {
    responseMimeType: 'application/json' as const,
  },
} as const
