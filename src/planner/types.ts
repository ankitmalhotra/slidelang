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
- Output ONLY the JSON object.

HARD CONSTRAINTS — violating any of these makes the output invalid:
- "type" MUST be exactly one of: "text", "chart", "math", "image". There is NO
  "list", "bullets", "table", "code", or "quote" type. Bullet lists are just a
  "text" block whose lines each have "bullet": true.
- "chartType" MUST be exactly one of: "bar", "line", "area", "pie", "scatter".
  Never "column", "donut", "histogram", etc.
- "layout" MUST be exactly one of: "title", "title-content", "two-column", "full-bleed".
- "schemaVersion" MUST be the number 1 (not a string).
- For charts, every series.values array MUST have the same length as categories.
- Write SUBSTANTIVE content — real sentences and facts about the topic, not the
  user's prompt echoed back. A bullet like "benefits" is bad; "Increases rainfall
  by 10-15% in arid regions" is good.

Complete example of a VALID deck (follow this shape exactly):
{"schemaVersion":1,"id":"photosynthesis","title":"Photosynthesis","aspectRatio":"16:9","theme":{"palette":{"background":"#0d1b2a","surface":"#1b263b","text":"#e0e1dd","accent":"#52b788","muted":"#778da9"},"fontFamily":"'Hanken Grotesk', system-ui, sans-serif","baseFontPt":18},"slides":[{"id":"cover","layout":"title","blocks":[{"id":"t1","type":"text","role":"title","align":"center","lines":[{"text":"Photosynthesis","level":0,"bullet":false}]},{"id":"t2","type":"text","role":"subtitle","align":"center","lines":[{"text":"How plants turn light into energy","level":0,"bullet":false}]}]},{"id":"how","layout":"title-content","blocks":[{"id":"h","type":"text","role":"title","align":"left","lines":[{"text":"The process","level":0,"bullet":false}]},{"id":"b","type":"text","role":"body","align":"left","lines":[{"text":"Chloroplasts absorb sunlight via chlorophyll","level":0,"bullet":true},{"text":"Water and CO2 are converted to glucose and oxygen","level":0,"bullet":true}]}]},{"id":"eq","layout":"two-column","blocks":[{"id":"h2","type":"text","role":"title","align":"left","lines":[{"text":"The equation","level":0,"bullet":false}]},{"id":"m","type":"math","latex":"6CO_2 + 6H_2O \\rightarrow C_6H_{12}O_6 + 6O_2","display":true}]}]}`;

/** Build the user-facing instruction, optionally appending repair feedback. */
export function buildUserMessage(prompt: string, repairContext?: string): string {
  if (!repairContext) return prompt;
  return `${prompt}

Your previous output failed validation with these errors:
${repairContext}

Output a corrected JSON deck that fixes ALL of these errors. Output ONLY the JSON.`;
}

export type { Deck };
