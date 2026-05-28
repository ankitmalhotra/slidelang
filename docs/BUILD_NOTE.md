# Slidelang — Build & Authorship Note

## What I personally built

- **The deck spec schema** (`src/deck-spec.ts`) — the Zod schema and type hierarchy that is the system's single source of truth: normalized-coordinate geometry, the discriminated-union block model (text/chart/math/image), `parseDeck` (validation returning field-level errors), and `lintDeck` (cross-field checks).
- **The compiler** (`src/compiler.ts`) — the deterministic layout engine: `resolveLayout` (auto-places blocks the spec omits, per layout template) and `toPixels` (normalized → pixel mapping). Pure TypeScript, independently unit-tested.
- **The renderer** (`src/renderer/`) — `SlideView` plus the four per-primitive React components, including the contenteditable inline text editing, KaTeX error fallback, and broken-image fallback.
- **The browser editor** (`src/editor/App.tsx`) — the spec-as-single-source-of-truth state model, the live raw-spec JSON editor with real-time validation, slide navigation, block selection, and present mode.
- **The AI planner layer** (`src/planner/`) — the provider-agnostic `DeckPlanner` interface, the Claude/OpenAI/Ollama/template adapters, the shared system prompt with hard constraints + worked example, and the orchestrator's validate-and-repair loop with graceful fallback.
- **The backend** (`server/index.ts`) — the Express API that keeps keys server-side.
- **Tests** — `test-schema.ts`, `test-compiler.ts`, `test-planner.ts`, `test-claude-shapes.ts`.

## What I reused

- **Libraries:** Zod (schema/validation), React + Vite (frontend/build), Express (API), Recharts (chart rendering), KaTeX (math typesetting), dotenv (env loading). These are off-the-shelf; the design work was in how they compose around the spec.
- **The model APIs:** Anthropic / OpenAI / Ollama for generation — but only as swappable backends behind the planner interface. The system's value (schema, compiler, validation, editor) is independent of any of them, which is why it also runs with no model at all.
- I did **not** reuse any deck/presentation framework — the deck-as-code model, compiler, and layout engine are original to this project.

## What broke

1. **AI output failed validation and silently fell back to template.** Generations kept returning the prompt echoed back (the template planner's behavior) instead of real content.
2. **Wrong/retired model ID.** The root cause turned out to be a hardcoded model string (`claude-sonnet-4-20250514`) that Anthropic had **retired**, so every API call returned `404 not_found_error` — three failed attempts, then fallback.
3. **`.env` not being read.** An earlier copy of `server/index.ts` was missing `import "dotenv/config";`, so the API key was never loaded and the planner defaulted to template regardless of the key being present.
4. **Schema-vs-model mismatch risk.** Concern that the model would emit block types (`list`, `table`) or chart types (`column`) outside the schema's vocabulary.

## How I debugged it

1. **Made the failure observable.** The orchestrator was swallowing errors, so I added per-attempt `console.warn` logging *and* surfaced the failed attempts' validation errors in the API response as a `lastErrors` field. This turned "it silently fell back" into a precise error message.
2. **Read the actual error.** With `lastErrors` exposed, a direct `curl` to `/api/generate` returned the real cause: `Claude API 404: model: claude-sonnet-4-20250514`. That immediately ruled out the schema, the key, and the retry loop, and pointed at the model name.
3. **Verified against ground truth.** Confirmed via Anthropic's docs that Sonnet 4 was retired April 2026, then verified the replacement (`claude-haiku-4-5`) was valid on the account with a direct metadata call to `GET /v1/models/claude-haiku-4-5` *before* spending generation credits — which returned the model with `structured_outputs: supported`.
4. **Isolated the dotenv issue** by checking the first import line of the running server file and confirming `.env` contents (no quotes, no `#`, correct name).
5. **Pre-empted the schema mismatch** by writing `test-claude-shapes.ts`, which runs realistic model outputs (and deliberate mistakes like `chartType: "column"` and an invented `list` type) through the real validator to confirm exactly which shapes pass/fail — then hardened the system prompt with explicit allowed-value constraints and a complete worked example.

**Net:** the bugs were integration/config issues (model lifecycle, env loading, observability), not design flaws. The deterministic core (schema, compiler, validation, editor) worked on first verification and never regressed — which was the point of building and testing it independently of the model.
