# Slidelang — Demo Video Script (target 3–4 min)

**Setup before recording:** `npm run dev:all` running, browser at `localhost:5173`, terminal visible in a second window (you'll show one log moment). Have your cloud-seeding prompt ready to paste. Keep it tight — reviewers watch this first and fast.

---

### 0:00–0:25 — The problem (talk over the editor on screen)
> "Teams prompt AI for slides and get back something static and brittle — you can't really edit it, version it, or trust the layout. Slidelang's bet is to put a structured *spec* between the prompt and the slides. The AI writes the spec; a deterministic compiler — not the model — builds the slides. That's what makes them editable, reviewable, and trustworthy."

Show the editor: dark slide stage, slide rail, spec panel on the right.

### 0:25–1:10 — Core workflow: prompt → deck
> "I'll start from a prompt."

Type: *"A deck on cloud seeding and its benefits in hotter, polluted cities."* Hit **Generate**.

When it loads, point to the label: **"via claude · 1 attempt"**.
> "That came from Claude — but notice it didn't return slides. It returned a structured spec, which our compiler just turned into these slides."

Click through the rail: cover, "what is cloud seeding," the benefits slide with the chart.
> "Real content, a real chart, math support — four primitives: text, chart, math, image."

### 1:10–1:55 — The spec is the source of truth (the key idea)
Point to the right panel.
> "This is the actual deck spec — structured JSON. The slides are a *compile* of this. Watch."

In the spec panel, edit one value live — e.g. change a chart value or a title string. The slide updates immediately.
> "Every edit flows through the spec. And it's validated on every keystroke —"

Now deliberately break it: change `"chartType": "bar"` to `"chartType": "column"`. Show the panel flip to the error state with the precise message.
> "— invalid values are caught instantly with a field-level error. You literally cannot edit the deck into a broken state. Let me fix that."

Revert it; show "valid" return.

### 1:55–2:30 — Direct editing + present
Double-click a text block on the canvas, edit it inline, click away.
> "You can also edit directly on the slide — it commits straight back to the spec."

Hit **Present**. Arrow through 2–3 slides fullscreen. Esc out.
> "And present in-browser."

### 2:30–3:10 — The depth: it runs anywhere, deterministically
> "Two things make this trustworthy rather than a thin LLM wrapper. First — the compiler and validation are deterministic and don't depend on the model. Same spec, same slides, every time."

(Optional, if you have a second to show the terminal) point to a `provider:` line.
> "Second — it's provider-agnostic with graceful fallback. With an API key it uses Claude. With *no key at all*, it falls back to a deterministic template planner —"

If time: quickly show it works with `SLIDELANG_PROVIDER=template` (or just say it).
> "— so anyone can run and verify the whole prompt-to-deck-to-edit-to-present loop at zero cost. The intelligence is a swappable upgrade, not a dependency."

### 3:10–3:30 — Close
> "So: prompt in, structured spec out, compiled to editable slides, validated end to end, presentable and reusable. That's deck-as-code. The spec design, the compiler, and the validation pipeline are the engineering — the model just fills in content."

---

## Recording tips
- **Lead with the generate → real deck moment** — that's the hook; don't spend 40s on preamble if you're tight.
- The **break-and-catch moment** (invalid chartType → instant error) is your single most important shot — it proves validation is real, not described. Don't skip it.
- If you over-run, cut the terminal/provider section (2:30–3:10) to a single spoken sentence.
- Keep total under 5:00 hard. 3:30 is ideal.
