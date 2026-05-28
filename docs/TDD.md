# Slidelang — Technical Design Document (TDD)

**Stack:** TypeScript end-to-end · React + Vite (frontend) · Express (API) · Zod (schema) · Recharts (charts) · KaTeX (math).

**Core principle:** the deck spec is the single source of truth. The AI produces the spec; everything after the spec is deterministic. One Zod schema serves four consumers: it constrains AI output, is the compiler's input contract, is what the validator checks, and types the editor.

---

## 1. Deck spec schema (`src/deck-spec.ts`)

A `Deck` is `{ schemaVersion, id, title, aspectRatio, theme, slides[] }`. A `Slide` is `{ id, layout, blocks[] }`. A `Block` is a **discriminated union on `type`**: `text | chart | math | image`.

Key design decisions:
- **Normalized coordinates (0–100% of canvas), not pixels.** Layout validation is then aspect-ratio-independent; the compiler maps to pixels only at the final step.
- **Geometry is first-class.** Each block carries an optional `box`; the compiler fills omitted boxes via the layout template. Explicit geometry is what makes downstream layout validation possible.
- **Zod gives runtime validation + static types from one definition.** `z.infer<>` produces the TS types; `parseDeck()` validates untrusted input (AI output, edits, API bodies) and returns either a typed deck or a flat list of field-level errors — the exact shape the repair loop needs.

## 2. Compiler architecture (`src/compiler.ts`)

Two deterministic stages, both pure (no React, no LLM, no DOM):

1. **`resolveLayout`** — fills boxes the spec omitted, using the slide's layout template (`title`, `title-content`, `two-column`, `full-bleed`, `free`). Blocks with an explicit box are respected as-is. This is the "compile" step: a loosely-specified spec becomes fully-resolved geometry, identically every time.
2. **`toPixels`** — maps each normalized box onto the reference pixel canvas for the deck's aspect ratio (1280×720 for 16:9).

Output is a `CompiledDeck` where every block has a concrete pixel box. This is the renderer's input and the validator's measurement target. Because it's pure TS, the entire layout engine is unit-testable in Node.

## 3. AI planning: prompt → deck spec (`src/planner/`)

A provider-agnostic `DeckPlanner` interface (`generate(prompt) → unknown`). Adapters:
- **Claude** (`api.anthropic.com`, default model `claude-haiku-4-5`)
- **OpenAI** (JSON mode)
- **Ollama** (local, `localhost:11434`)
- **Template** — a deterministic, no-model planner using keyword heuristics; always produces a valid deck.

A shared **system prompt** describes the schema, enumerates hard constraints (exact allowed `type`/`chartType`/`layout` values), and includes a complete worked example to stop the model inventing fields.

**Orchestrator (`orchestrator.ts`):** selects a provider by availability (`ANTHROPIC_API_KEY` → `OPENAI_API_KEY` → `OLLAMA_HOST` → template), then runs a **validate-and-repair loop**: generate → `parseDeck` → if invalid, feed the errors back to the same provider as repair context (up to 3 attempts) → if all fail, fall back to the template planner. The LLM can never put an invalid spec in front of the compiler.

## 4. Browser editor state model (`src/editor/App.tsx`)

The entire app is a pure function of one piece of state: `deck: Deck`. The compiled view is **derived** via `useMemo(() => compileDeck(deck))`, never stored. Every edit produces a new `Deck` and triggers recompile + rerender.

Three edit surfaces, all routing through the same spec:
- **Canvas:** click to select a block, double-click text to edit (commits edited lines back into the spec immutably).
- **Raw spec panel:** a live JSON editor; on each change it `JSON.parse` + `parseDeck`, showing "valid" or precise errors, and applies valid edits to state.
- **Prompt bar:** calls the backend, loads the returned (already-validated) deck.

Present mode is the same `SlideView` scaled to viewport with arrow-key navigation.

## 5. Validation & repair pipeline

Two layers, by cost:
- **Structural (Zod, in `parseDeck`):** types, enums, required fields, normalized-box bounds (a box can't exceed the canvas), unique block/slide ids. Hard gate.
- **Cross-field lint (`lintDeck`):** e.g. chart `series.values` length must equal `categories` length. Surfaced as warnings.

The AI repair loop (§3) consumes these errors. *Designed next:* a rendered-geometry pass that measures real DOM boxes (`getBoundingClientRect`) to detect text overflow / element overlap / off-canvas and auto-repair (autosize, reflow, swap to a roomier layout) — the schema already carries the geometry needed for this.

## 6. Chart / math / image rendering (`src/renderer/`)

`SlideView` absolutely-positions each block at its compiled pixel box. Per-primitive renderers:
- **Text** — role-scaled type, bullet/indent levels, inline contenteditable.
- **Chart** — Recharts; bar/line/area/pie/scatter; themed from the palette.
- **Math** — KaTeX; invalid LaTeX renders a visible error rather than crashing.
- **Image** — `objectFit` cover/contain; broken-URL fallback shows alt text.

## 7. Hosted API & publishing (`server/index.ts`)

Express backend keeps API keys server-side (the browser never sees them). Endpoints:
- `POST /api/generate { prompt }` → `{ deck, provider, attempts, warnings, usedFallback, lastErrors? }`
- `GET /api/health` → `{ ok, provider }`

Vite proxies `/api` → `localhost:8787` in dev. Model and provider are configurable via env (`ANTHROPIC_MODEL`, `SLIDELANG_PROVIDER`). *Publishing* (persist a spec → shareable read-only URL) is the next backend addition; the spec being plain JSON makes this a storage concern, not a rearchitecture.

## 8. CLI / plugin integration

The spec-as-contract design means non-UI authoring is a thin wrapper over the same orchestrator + compiler: a `slidelang build deck.json` CLI (validate + compile + export) and `slidelang generate "<prompt>"` (planner → spec) reuse the exact code paths the UI uses. This is the agent/automation surface — decks generated from CI or data pipelines.

## 9. Reliability & verifiability

The system runs end-to-end with **no API key** via the template planner, so reviewers verify it at zero cost. Determinism (schema + compiler) means the verifiable core does not depend on any model. Tests (`test-schema.ts`, `test-compiler.ts`, `test-planner.ts`) exercise the schema, layout engine, and planner offline.
