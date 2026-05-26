/**
 * Slidelang — Planner layer (prompt -> deck spec)
 * ===============================================
 *
 * The planner ONLY produces a deck spec (JSON). It never produces slides.
 * Whatever provider is used (Claude / OpenAI / Ollama / template), the output
 * runs through parseDeck + a retry loop before it can reach the compiler.
 *
 * This file holds the provider-agnostic pieces:
 *   - DeckPlanner interface
 *   - the system prompt (shared by all LLM providers)
 *   - a compact JSON-schema description of the spec for the model
 */

import type { Deck } from "../deck-spec";

/** Every provider implements this one method. */
export interface DeckPlanner {
  readonly name: string;
  /** Turn a natural-language prompt into a deck spec (unvalidated JSON). */
  generate(prompt: string, repairContext?: string): Promise<unknown>;
}

/**
 * The instruction every LLM provider shares. It is deliberately strict about
 * "emit only JSON" because the parseDeck gate downstream is unforgiving — and
 * that strictness is what keeps first-pass validation rates high.
 */
export const SYSTEM_PROMPT = `You are a deck planner for Slidelang, a deck-as-code system.
Given a user's request, you output a SINGLE JSON object describing a slide deck.
You output ONLY the JSON — no markdown fences, no commentary, no explanation.

The deck has this shape:
{
  "schemaVersion": 1,
  "id": "<short-kebab-id>",
  "title": "<deck title>",
  "aspectRatio": "16:9",
  "theme": {
    "palette": {
      "background": "#rrggbb", "surface": "#rrggbb", "text": "#rrggbb",
      "accent": "#rrggbb", "muted": "#rrggbb"
    },
    "fontFamily": "'Hanken Grotesk', system-ui, sans-serif",
    "baseFontPt": 18
  },
  "slides": [
    {
      "id": "<slide-id>",
      "layout": "title" | "title-content" | "two-column" | "full-bleed",
      "blocks": [ <block>, ... ]
    }
  ]
}

Block types (omit "box" — the compiler will place blocks via the layout):
- text:  { "id","type":"text","role":"title"|"subtitle"|"heading"|"body"|"caption",
           "align":"left"|"center"|"right",
           "lines":[{"text":"...","level":0,"bullet":false}] }
- chart: { "id","type":"chart","chartType":"bar"|"line"|"area"|"pie"|"scatter",
           "title":"...","categories":["..."],
           "series":[{"name":"...","values":[1,2,3]}] }
           IMPORTANT: each series.values length MUST equal categories length.
- math:  { "id","type":"math","latex":"...","display":true }
- image: { "id","type":"image","src":"https://...","alt":"...","fit":"contain"|"cover" }

Rules:
- 3 to 6 slides unless asked otherwise.
- Every block needs a unique "id" within its slide.
- First slide is usually a "title" layout cover.
- Use a "two-column" layout when pairing a chart or math with explanatory text.
- Choose a cohesive, readable color palette (dark or light).
- Output ONLY the JSON object.`;

/** Build the user-facing instruction, optionally appending repair feedback. */
export function buildUserMessage(prompt: string, repairContext?: string): string {
  if (!repairContext) return prompt;
  return `${prompt}

Your previous output failed validation with these errors:
${repairContext}

Output a corrected JSON deck that fixes ALL of these errors. Output ONLY the JSON.`;
}

export type { Deck };
