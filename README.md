# Slidelang — prototype

Deck-as-code authoring: a structured spec compiles into editable, presentable slides.

## Run locally
```bash
npm install
npm run dev      # http://localhost:5173
```
Requires Node 18+.

## What's here
- `src/deck-spec.ts` — the deck spec schema (Zod). Single source of truth.
- `src/compiler.ts`  — deterministic layout resolution + pixel mapping.
- `src/renderer/`    — paints a CompiledDeck (text, chart, math, image blocks).
- `src/editor/`      — the browser editor: spec-as-source-of-truth state model,
                       inline text editing, live JSON spec editor, present mode.

## Editor controls
- Click a block to select it.
- Double-click a text block to edit; click away to commit.
- Edit the JSON in the right-hand spec panel — valid edits re-compile live.
- "Present" for fullscreen; arrow keys navigate, Esc exits.
