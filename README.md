# Slidelang — prototype

Deck-as-code authoring: a structured spec compiles into editable, presentable
slides. A prompt is turned into a *spec* by a swappable planner; everything after
the spec is deterministic (compiler, validation, render).

## Submission artifacts
- **PRD:** [docs/PRD.md](docs/PRD.md)
- **TDD:** [docs/TDD.md](docs/TDD.md)
- **Build / authorship note:** [docs/BUILD_NOTE.md](docs/BUILD_NOTE.md)
- **Demo script:** [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)
- **Submission index & access notes:** [docs/SUBMISSION.md](docs/SUBMISSION.md)
- **Demo video:** see SUBMISSION.md for the link.


## Run

Frontend only (editor, compiler, renderer — no AI needed):
```bash
npm install
npm run dev            # http://localhost:5173
```

Full stack (adds the prompt -> deck planner):
```bash
npm run dev:all        # Vite (5173) + API backend (8787) together
```
Requires Node 18+.

## Configuring AI generation (the `.env` file)

The backend picks a provider automatically based on which environment variable is
set. **No configuration is needed to run** — with nothing set, it uses a
deterministic template planner so the full workflow works at zero cost.

To enable a real model, create a `.env` file in the project root (same folder as
`package.json`) with **one** of the following. The variable name tells the backend
which provider to use:

**Anthropic / Claude:**
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```
Optionally pin a model (defaults to the cheapest, `claude-haiku-4-5`):
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-haiku-4-5
```
Get a key at console.anthropic.com (new accounts include free starter credit).

**OpenAI:**
```
OPENAI_API_KEY=sk-your-key-here
```
Get a key at platform.openai.com. (Defaults to `gpt-4o-mini`.)

**Ollama (fully local, free, no API key):**
```
OLLAMA_HOST=http://localhost:11434
```
Requires Ollama installed with a model pulled, e.g. `ollama pull llama3.1`.

**No key at all (template planner):** leave `.env` empty or don't create it.

### Quick start with a key
```bash
cp .env.example .env     # then edit .env and uncomment/fill ONE line above
npm run dev:all
```
On startup the backend prints which provider it selected, e.g.
`Slidelang backend on http://localhost:8787  (provider: claude)`.

### Selection rules & notes
- If multiple keys are set, priority is: Anthropic → OpenAI → Ollama → template.
- Force a specific provider with `SLIDELANG_PROVIDER=template|claude|openai|ollama`.
- The `.env` file is **git-ignored** — never commit real keys. Keys stay
  server-side and are never sent to the browser.
- No matter the provider, output passes `parseDeck` + a validate-and-repair loop
  before reaching the compiler; if a model keeps emitting invalid specs it falls
  back to the template planner automatically.
- A Claude *Pro* subscription (claude.ai) does **not** include an API key — the
  API is a separate, usage-billed product at console.anthropic.com.

## Layout
- `src/deck-spec.ts`   — deck spec schema (Zod). Single source of truth.
- `src/compiler.ts`    — deterministic layout resolution + pixel mapping.
- `src/renderer/`      — paints a CompiledDeck (text, chart, math, image).
- `src/editor/`        — browser editor: spec-as-source-of-truth, inline edit,
                         live JSON panel, prompt bar, present mode.
- `src/planner/`       — prompt -> spec: provider adapters + orchestrator
                         (validate-and-retry loop, template fallback).
- `server/index.ts`    — Express API (POST /api/generate) keeping keys server-side.

## Editor controls
- Type a prompt, hit Generate (needs `npm run dev:all`).
- Click a block to select; double-click text to edit.
- Edit the JSON spec on the right — valid edits re-compile live.
- "Present" for fullscreen; arrow keys navigate, Esc exits.

## Tests (no network)
```bash
npx tsx test-schema.ts     # schema: valid + broken decks
npx tsx test-compiler.ts   # compiler: auto-layout of a box-less deck
npx tsx test-planner.ts    # planner: template path, heuristics, validation
```
