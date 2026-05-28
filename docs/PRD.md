# Slidelang — Product Requirements Document (PRD)

**One-line:** A deck-as-code platform where humans and AI agents author a structured *deck spec* that compiles into editable, reviewable, presentable slides.

---

## 1. Target user and workflow

**Primary user:** the recurring business/technical deck creator — someone who builds the *same kinds* of decks repeatedly (quarterly business reviews, architecture proposals, research updates, sales narratives) and is tired of fighting freeform slide tools.

**Today's broken workflow:** they prompt an AI chat tool for slide content, get back prose or a static export, then spend more time fixing layout, re-typing into a slide editor, and re-doing it next quarter from scratch. The AI output is *static* (can't be re-run), *brittle* (no structure to safely edit), and *hard to review* (no diff, no source of truth).

**Slidelang's workflow:** the user types a prompt (or hands over a structured brief). An AI planner produces a **deck spec** — structured JSON describing slides, blocks, and content. A deterministic compiler turns that spec into laid-out slides. The user reviews and edits in the browser; every edit flows back through the spec. They present in-browser or share the result. The spec is reusable: next quarter, edit the data, recompile.

## 2. Why structured authoring beats prompt-to-static slides

The wedge is a single architectural decision: **put a structured spec between the prompt and the slides.** The AI's job is to produce the *spec*, never the slides directly. This is the difference between generating an image of a chart and generating the data behind it.

| Prompt → static slides | Slidelang (deck-as-code) |
|---|---|
| Output is final pixels — can't safely edit | Output is data — every element is addressable and editable |
| No source of truth to diff or version | Spec is JSON: diffable, versionable, reviewable like code |
| Re-running = starting over | Re-running = editing the spec and recompiling |
| Layout quality depends on the model | Layout is guaranteed by a deterministic compiler, not the LLM |
| An AI agent can't reliably modify it | An agent edits structured fields, validated on every change |

## 3. What makes the generated deck trustworthy and editable

Trust comes from **determinism and validation**, not from the model behaving well:

- **The compiler, not the LLM, guarantees layout.** The same spec always compiles to the same slides. The model can only influence *content*, never whether the deck is well-formed.
- **A validation gate sits between the AI and the compiler.** Every spec — whether AI-generated, human-edited, or uploaded — must pass schema validation (`parseDeck`) before it can render. Invalid specs are rejected with precise, field-level errors.
- **A repair loop closes the gap.** When the AI emits an invalid spec, the validation errors are fed back to it automatically (up to N attempts); if it still fails, the system degrades to a deterministic template planner rather than failing.
- **Editing can't break the deck.** In the browser editor, the spec is the single source of truth; every edit round-trips through validation, so the user is shown "valid" or the exact error in real time — they can never edit a deck into a broken state.

This is what makes it *editable*: because slides are structured data, the user (or an agent) can change one bullet, swap a chart type, or restyle the theme without touching anything else.

## 4. The wedge → platform map

**Wedge (now):** recurring business and technical decks — QBRs, architecture proposals, research updates. These are high-frequency, high-structure, and painful today, which makes the deck-as-code value obvious immediately.

**Expansion path:**
- *Templates & reuse* — saved deck specs become parameterized templates ("our QBR format"); next period just swaps the data.
- *Agent & CLI authoring* — because the spec is the API, decks can be generated programmatically (CI pipelines, data-driven reports, `slidelang build report.json`).
- *Collaboration & review* — spec diffs enable PR-style review of decks; comments attach to blocks.
- *Broader platform* — any structured document that benefits from "generate → validate → edit → publish": pitch decks, reports, one-pagers, dashboards.

The through-line: once decks are code, everything software teams already do well — version, review, automate, template — becomes available to presentations.

## 5. Scope of the current prototype

**In scope (built & working):** prompt/spec intake → AI planner (Claude, with OpenAI/Ollama/template fallbacks) → deterministic compiler → browser editor with inline + raw-spec editing → present mode → four primitives (text, chart, math, image) → schema validation with a repair loop.

**Deliberately out of scope (this prototype):** persistence/hosted publishing URLs, drag-to-move block editing, multi-user collaboration, the deeper rendered-geometry validation/repair pass (overlap/overflow auto-fix) — designed for, not yet built.

## 6. Success criteria

A user can go from a one-line prompt to an editable, presentable, factually-substantive multi-slide deck in under a minute; can edit any element without breaking the deck; and the system runs end-to-end with **no API key at all** (template planner) so any reviewer can verify it.
