/**
 * Slidelang — Deck Spec Schema
 * ============================
 *
 * This file is the KEYSTONE of the system. One schema, four jobs:
 *
 *   1. AI planner   — used as the structured-output / tool-input constraint so the
 *                     model emits a *spec*, never raw slides.
 *   2. Compiler     — the input contract the renderer reads to produce slides.
 *   3. Validator    — the geometry it measures and the repairs it writes back.
 *   4. Editor       — the React state model; z.infer<> gives exhaustive TS types.
 *
 * Design decisions (these drive the rest of the architecture):
 *
 *   - NORMALIZED COORDINATES. Every box is expressed in 0..100 percent of the
 *     canvas, not pixels. Layout validation then works identically for 16:9 and
 *     4:3; the compiler maps normalized -> pixels only at the final render step.
 *
 *   - DISCRIMINATED UNION on `type`. Gives the AI a clean target shape and gives
 *     the editor compile-time exhaustiveness when narrowing block kinds.
 *
 *   - GEOMETRY IS FIRST-CLASS. Each block carries an explicit box. Without real
 *     boxes there is nothing to measure, and validate/repair is the depth area.
 *     A layout template auto-fills boxes the AI omits (see resolveLayout, compiler).
 */

import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** A single axis value as a percentage of the canvas (0 = left/top, 100 = right/bottom). */
const Percent = z.number().min(0).max(100);

/**
 * A block's bounding box in normalized canvas space.
 * Invariant enforced below: the box must not run off the right/bottom edge.
 * The validator relies on this being the authoritative geometry.
 */
export const BoxSchema = z
  .object({
    x: Percent, // left edge
    y: Percent, // top edge
    w: z.number().min(1).max(100), // width  (>0 so a box is always measurable)
    h: z.number().min(1).max(100), // height
  })
  .refine((b) => b.x + b.w <= 100, { message: "box overflows right edge" })
  .refine((b) => b.y + b.h <= 100, { message: "box overflows bottom edge" });

export type Box = z.infer<typeof BoxSchema>;

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

const HexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, "expected #rrggbb hex color");

/**
 * Theme is intentionally small. The compiler reads these tokens; the validator
 * uses `palette` + `fontScale` to check contrast and estimate text height.
 */
export const ThemeSchema = z.object({
  palette: z.object({
    background: HexColor,
    surface: HexColor, // card / content-block fills
    text: HexColor,
    accent: HexColor,
    muted: HexColor,
  }),
  fontFamily: z.string().default("Inter, system-ui, sans-serif"),
  /** Base body size in pt at the reference canvas size; roles scale off this. */
  baseFontPt: z.number().min(8).max(48).default(18),
});

export type Theme = z.infer<typeof ThemeSchema>;

/* ------------------------------------------------------------------ */
/* Blocks (the four primitives)                                        */
/* ------------------------------------------------------------------ */

/** Fields shared by every block. `box` is optional in *authored* specs and is */
/** filled in by the compiler's layout pass; the validator then treats it as required. */
const BlockBase = z.object({
  id: z.string().min(1),
  box: BoxSchema.optional(),
  z: z.number().int().default(0), // paint order; higher = on top
});

/* --- Text -------------------------------------------------------- */

/** One line of text. `level` drives bullet indentation; line count + level let */
/** the validator estimate rendered height and detect overflow before painting. */
const TextLineSchema = z.object({
  text: z.string(),
  level: z.number().int().min(0).max(4).default(0),
  bullet: z.boolean().default(false),
});

const TextBlockSchema = BlockBase.extend({
  type: z.literal("text"),
  /** Drives default sizing/weight in the compiler and the height estimate in the validator. */
  role: z.enum(["title", "subtitle", "heading", "body", "caption"]).default("body"),
  align: z.enum(["left", "center", "right"]).default("left"),
  lines: z.array(TextLineSchema).min(1),
});

/* --- Chart ------------------------------------------------------- */

const ChartSeriesSchema = z.object({
  name: z.string(),
  /** Parallel to `categories` for bar/line/area; pie uses the first series. */
  values: z.array(z.number()),
});

const ChartBlockSchema = BlockBase.extend({
  type: z.literal("chart"),
  chartType: z.enum(["bar", "line", "area", "pie", "scatter"]),
  title: z.string().optional(),
  /** X-axis / slice labels. Validated against series length below. */
  categories: z.array(z.string()).min(1),
  series: z.array(ChartSeriesSchema).min(1),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
});

/* --- Math -------------------------------------------------------- */

const MathBlockSchema = BlockBase.extend({
  type: z.literal("math"),
  /** Raw LaTeX. Rendered with KaTeX in the compiler; validity checked in the pipeline. */
  latex: z.string().min(1),
  display: z.boolean().default(true), // block (true) vs inline (false)
});

/* --- Image ------------------------------------------------------- */

const ImageBlockSchema = BlockBase.extend({
  type: z.literal("image"),
  src: z.string().url(),
  alt: z.string().min(1), // required: accessibility + a fallback the validator can show
  fit: z.enum(["contain", "cover"]).default("contain"),
});

/** The discriminated union the AI targets and the editor narrows on. */
export const BlockSchema = z.discriminatedUnion("type", [
  TextBlockSchema,
  ChartBlockSchema,
  MathBlockSchema,
  ImageBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;
export type TextBlock = z.infer<typeof TextBlockSchema>;
export type ChartBlock = z.infer<typeof ChartBlockSchema>;
export type MathBlock = z.infer<typeof MathBlockSchema>;
export type ImageBlock = z.infer<typeof ImageBlockSchema>;

/* ------------------------------------------------------------------ */
/* Slide                                                               */
/* ------------------------------------------------------------------ */

/**
 * Layout templates are named placement strategies. The compiler's layout pass
 * uses the template to auto-fill any block whose `box` was omitted by the AI.
 * "free" means every block MUST carry its own box (no auto-placement).
 */
export const SlideLayout = z.enum([
  "title", // centered title + subtitle
  "title-content", // title bar on top, one content region below
  "two-column", // title bar + left/right content regions
  "full-bleed", // single block fills the canvas (e.g. a cover image)
  "free", // explicit boxes only
]);

export const SlideSchema = z
  .object({
    id: z.string().min(1),
    layout: SlideLayout.default("title-content"),
    blocks: z.array(BlockSchema).min(1),
    background: HexColor.optional(), // overrides theme.palette.background
    notes: z.string().optional(), // speaker notes
  })
  .refine((s) => new Set(s.blocks.map((b) => b.id)).size === s.blocks.length, {
    message: "block ids must be unique within a slide",
  });

export type Slide = z.infer<typeof SlideSchema>;

/* ------------------------------------------------------------------ */
/* Deck (top level)                                                    */
/* ------------------------------------------------------------------ */

export const AspectRatio = z.enum(["16:9", "4:3"]);

/** Reference pixel canvas the compiler renders into (normalized coords map onto this). */
export const REFERENCE_CANVAS: Record<z.infer<typeof AspectRatio>, { w: number; h: number }> = {
  "16:9": { w: 1280, h: 720 },
  "4:3": { w: 1024, h: 768 },
};

export const DeckSchema = z
  .object({
    /** Bump when the schema shape changes so the compiler can migrate old specs. */
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    title: z.string().min(1),
    aspectRatio: AspectRatio.default("16:9"),
    theme: ThemeSchema,
    slides: z.array(SlideSchema).min(1),
  })
  .refine((d) => new Set(d.slides.map((s) => s.id)).size === d.slides.length, {
    message: "slide ids must be unique within a deck",
  });

export type Deck = z.infer<typeof DeckSchema>;

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Parse + validate an untrusted spec (AI output, an uploaded file, an API body).
 * Returns a typed result rather than throwing, so the AI planner can feed the
 * error list straight back into a re-prompt (the planner's repair loop).
 */
export function parseDeck(
  input: unknown
): { ok: true; deck: Deck } | { ok: false; errors: string[] } {
  const result = DeckSchema.safeParse(input);
  if (result.success) return { ok: true, deck: result.data };
  const errors = result.error.issues.map(
    (i) => `${i.path.join(".") || "(root)"}: ${i.message}`
  );
  return { ok: false, errors };
}

/**
 * Cross-field checks that are awkward to express inside Zod refinements but cheap
 * here. These are spec-level sanity checks; geometric overflow/overlap checks that
 * need rendered measurements live in the validate/repair pipeline, not here.
 */
export function lintDeck(deck: Deck): string[] {
  const warnings: string[] = [];
  for (const slide of deck.slides) {
    for (const block of slide.blocks) {
      if (block.type === "chart") {
        for (const s of block.series) {
          if (s.values.length !== block.categories.length) {
            warnings.push(
              `slide ${slide.id} / ${block.id}: series "${s.name}" has ${s.values.length} values but ${block.categories.length} categories`
            );
          }
        }
      }
    }
  }
  return warnings;
}
