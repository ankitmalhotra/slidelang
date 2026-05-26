/**
 * Slidelang — Compiler Core (layout resolution + pixel mapping)
 * ============================================================
 *
 * INPUT:  a validated Deck (the spec — what parseDeck() returns).
 * OUTPUT: a CompiledDeck — every block has a CONCRETE pixel box, ready to paint.
 *
 * The compiler has two stages, both deterministic (no LLM, no DOM):
 *
 *   1. resolveLayout  — fill in boxes the spec OMITTED, using the slide's
 *                       `layout` template. This is the "compile" step: a loose,
 *                       partially-specified spec becomes fully-resolved geometry,
 *                       the same way every time.
 *   2. toPixels       — map normalized 0..100 boxes onto the reference pixel
 *                       canvas for the deck's aspect ratio.
 *
 * Keeping this independent of React means the deterministic core is provably
 * independent of both the model AND the renderer — you can unit-test the entire
 * layout engine in Node, which is exactly what test-compiler.ts does.
 */

import {
  type Deck,
  type Slide,
  type Block,
  type Box,
  REFERENCE_CANVAS,
} from "./deck-spec";

/* ------------------------------------------------------------------ */
/* Output types                                                        */
/* ------------------------------------------------------------------ */

/** A box in absolute pixels (origin top-left), produced by toPixels(). */
export interface PixelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A block after compilation: original block data + resolved geometry. */
export interface CompiledBlock {
  block: Block;
  /** Normalized box after layout resolution (every block has one now). */
  box: Box;
  /** Same box mapped to the pixel canvas — what the renderer positions with. */
  pixels: PixelBox;
}

export interface CompiledSlide {
  id: string;
  background?: string;
  notes?: string;
  blocks: CompiledBlock[];
}

export interface CompiledDeck {
  id: string;
  title: string;
  canvas: { w: number; h: number }; // pixel canvas for this aspect ratio
  theme: Deck["theme"];
  slides: CompiledSlide[];
}

/* ------------------------------------------------------------------ */
/* Stage 1: layout resolution                                          */
/* ------------------------------------------------------------------ */

/**
 * Small margin (in normalized %) kept clear around the canvas edge and between
 * auto-placed regions, so templates don't paint flush to the bezel.
 */
const PAD = 5;
const GUTTER = 4;

/** Roles that a template treats as "header" material vs. "content" material. */
const HEADER_ROLES = new Set(["title", "subtitle", "heading"]);

function isHeader(b: Block): boolean {
  return b.type === "text" && HEADER_ROLES.has((b as any).role);
}

/**
 * Resolve boxes for every block on a slide.
 *
 * Rule: a block that already carries an explicit `box` is RESPECTED as-is
 * (human or AI placed it on purpose). Only blocks missing a box get auto-placed
 * by the template. This is what makes the spec forgiving — the AI can specify
 * geometry when it wants control, or omit it and trust the template.
 */
export function resolveLayout(slide: Slide): CompiledBlock[] {
  const placed = new Map<string, Box>();

  // Blocks needing auto-placement, split by whether the template treats them
  // as header or content, preserving authored order within each group.
  const needsBox = slide.blocks.filter((b) => !b.box);
  const headers = needsBox.filter(isHeader);
  const contents = needsBox.filter((b) => !isHeader(b));

  switch (slide.layout) {
    case "title": {
      // Centered stack in the vertical middle: title, then any subtitles below.
      const total = headers.length + contents.length || 1;
      const blockH = 12;
      const startY = 50 - (total * blockH) / 2;
      [...headers, ...contents].forEach((b, i) => {
        placed.set(b.id, { x: PAD, y: startY + i * blockH, w: 100 - 2 * PAD, h: blockH });
      });
      break;
    }

    case "title-content": {
      // Header bar on top; remaining content stacked in the region below it.
      let cursorY = PAD;
      const headerH = 14;
      headers.forEach((b) => {
        placed.set(b.id, { x: PAD, y: cursorY, w: 100 - 2 * PAD, h: headerH });
        cursorY += headerH + GUTTER;
      });
      const regionTop = headers.length ? cursorY : PAD;
      const regionH = 100 - PAD - regionTop;
      const each = contents.length ? (regionH - GUTTER * (contents.length - 1)) / contents.length : regionH;
      contents.forEach((b, i) => {
        placed.set(b.id, { x: PAD, y: regionTop + i * (each + GUTTER), w: 100 - 2 * PAD, h: each });
      });
      break;
    }

    case "two-column": {
      // Header bar spans the top; content blocks alternate left / right columns.
      let cursorY = PAD;
      const headerH = 14;
      headers.forEach((b) => {
        placed.set(b.id, { x: PAD, y: cursorY, w: 100 - 2 * PAD, h: headerH });
        cursorY += headerH + GUTTER;
      });
      const top = headers.length ? cursorY : PAD;
      const h = 100 - PAD - top;
      const colW = (100 - 2 * PAD - GUTTER) / 2;
      contents.forEach((b, i) => {
        const left = i % 2 === 0;
        placed.set(b.id, {
          x: left ? PAD : PAD + colW + GUTTER,
          y: top,
          w: colW,
          h,
        });
      });
      break;
    }

    case "full-bleed": {
      // First content block fills the entire canvas; extras stack centered.
      [...contents, ...headers].forEach((b, i) => {
        placed.set(b.id, i === 0 ? { x: 0, y: 0, w: 100, h: 100 } : { x: PAD, y: PAD + i * 12, w: 100 - 2 * PAD, h: 12 });
      });
      break;
    }

    case "free": {
      // No auto-placement: every block must have brought its own box.
      if (needsBox.length) {
        throw new Error(
          `slide "${slide.id}" uses layout "free" but blocks [${needsBox
            .map((b) => b.id)
            .join(", ")}] have no box`
        );
      }
      break;
    }
  }

  // Assemble in original order, using the explicit box if present else the placed one.
  return slide.blocks.map((b) => {
    const box = b.box ?? placed.get(b.id);
    if (!box) {
      throw new Error(`could not resolve a box for block "${b.id}" on slide "${slide.id}"`);
    }
    return { block: b, box, pixels: { x: 0, y: 0, w: 0, h: 0 } }; // pixels filled in stage 2
  });
}

/* ------------------------------------------------------------------ */
/* Stage 2: pixel mapping                                              */
/* ------------------------------------------------------------------ */

/** Map a normalized 0..100 box onto a concrete pixel canvas. */
export function toPixels(box: Box, canvas: { w: number; h: number }): PixelBox {
  return {
    x: (box.x / 100) * canvas.w,
    y: (box.y / 100) * canvas.h,
    w: (box.w / 100) * canvas.w,
    h: (box.h / 100) * canvas.h,
  };
}

/* ------------------------------------------------------------------ */
/* Top-level compile                                                   */
/* ------------------------------------------------------------------ */

/** Compile a validated Deck into a fully-resolved CompiledDeck. */
export function compileDeck(deck: Deck): CompiledDeck {
  const canvas = REFERENCE_CANVAS[deck.aspectRatio];
  const slides: CompiledSlide[] = deck.slides.map((slide) => {
    const resolved = resolveLayout(slide).map((cb) => ({
      ...cb,
      pixels: toPixels(cb.box, canvas),
    }));
    return { id: slide.id, background: slide.background, notes: slide.notes, blocks: resolved };
  });
  return { id: deck.id, title: deck.title, canvas, theme: deck.theme, slides };
}
