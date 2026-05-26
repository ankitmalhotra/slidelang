import { useMemo, useState, useEffect } from "react";
import { compileDeck } from "../compiler";
import { parseDeck, type Deck } from "../deck-spec";
import { sampleDeck } from "../sampleDeck";
import { SlideView } from "../renderer/SlideView";
import "./styles.css";

export default function App() {
  /**
   * SINGLE SOURCE OF TRUTH. The whole app is a pure function of this spec.
   * Every edit produces a new Deck; the compiled view is derived, never stored.
   */
  const [deck, setDeck] = useState<Deck>(sampleDeck);
  const [slideIdx, setSlideIdx] = useState(0);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showSpec, setShowSpec] = useState(true);
  const [presenting, setPresenting] = useState(false);

  // Prompt bar state
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genInfo, setGenInfo] = useState<string | null>(null);

  const generate = async () => {
    const p = prompt.trim();
    if (!p || generating) return;
    setGenerating(true);
    setGenInfo(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setDeck(data.deck); // the spec is already validated server-side
      setSlideIdx(0);
      setSelectedBlockId(null);
      const warn = data.warnings?.length ? ` · ${data.warnings.length} warning(s)` : "";
      setGenInfo(`via ${data.provider} · ${data.attempts} attempt(s)${warn}`);
    } catch (e) {
      setGenInfo(`error: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Derived: recompiles whenever the spec changes. This is the heart of the
  // "deck as code" model — the visual is always a compile of the source.
  const compiled = useMemo(() => {
    try {
      return { ok: true as const, deck: compileDeck(deck) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [deck]);

  // Raw spec text mirror for the code panel; re-parsed on edit.
  const [specText, setSpecText] = useState(() => JSON.stringify(deck, null, 2));
  const [specError, setSpecError] = useState<string[] | null>(null);

  // Keep the spec panel in sync when the deck changes via the canvas.
  useEffect(() => {
    setSpecText(JSON.stringify(deck, null, 2));
  }, [deck]);

  const applySpecText = (text: string) => {
    setSpecText(text);
    try {
      const json = JSON.parse(text);
      const res = parseDeck(json);
      if (res.ok) {
        setSpecError(null);
        setDeck(res.deck);
      } else {
        setSpecError(res.errors);
      }
    } catch (e) {
      setSpecError([`JSON syntax: ${(e as Error).message}`]);
    }
  };

  // Commit edited text from a block back into the spec (immutably).
  const editBlockText = (blockId: string, lines: string[]) => {
    setDeck((prev) => ({
      ...prev,
      slides: prev.slides.map((s, i) =>
        i !== slideIdx
          ? s
          : {
              ...s,
              blocks: s.blocks.map((b) =>
                b.id === blockId && b.type === "text"
                  ? { ...b, lines: lines.map((t) => ({ text: t, level: 0, bullet: b.lines[0]?.bullet ?? false })) }
                  : b
              ),
            }
      ),
    }));
  };

  // Present mode: fullscreen stage, arrow keys to navigate.
  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setSlideIdx((i) => Math.min(i + 1, deck.slides.length - 1));
      if (e.key === "ArrowLeft") setSlideIdx((i) => Math.max(i - 1, 0));
      if (e.key === "Escape") setPresenting(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, deck.slides.length]);

  if (!compiled.ok) {
    return <div className="fatal">Compile error: {compiled.error}</div>;
  }

  const cdeck = compiled.deck;
  const cslide = cdeck.slides[slideIdx];

  // ---- Present mode ----
  if (presenting) {
    const scale = Math.min(window.innerWidth / cdeck.canvas.w, window.innerHeight / cdeck.canvas.h);
    return (
      <div className="present-stage" onClick={() => setSlideIdx((i) => Math.min(i + 1, deck.slides.length - 1))}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
          <SlideView deck={cdeck} slide={cslide} />
        </div>
        <div className="present-hint">← → to navigate · Esc to exit · {slideIdx + 1}/{deck.slides.length}</div>
      </div>
    );
  }

  // ---- Editor ----
  const stageScale = showSpec ? 0.52 : 0.72;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◆</span> Slidelang
          <span className="brand-sub">deck as code</span>
        </div>
        <div className="actions">
          <button className={showSpec ? "btn active" : "btn"} onClick={() => setShowSpec((v) => !v)}>
            {showSpec ? "Hide spec" : "Show spec"}
          </button>
          <button className="btn primary" onClick={() => setPresenting(true)}>
            Present
          </button>
        </div>
      </header>

      <div className="promptbar">
        <span className="prompt-label">prompt</span>
        <input
          className="prompt-input"
          placeholder="e.g. A 4-slide deck on Q3 revenue growth vs. plan, with a chart"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          disabled={generating}
        />
        <button className="btn primary" onClick={generate} disabled={generating || !prompt.trim()}>
          {generating ? "Generating…" : "Generate"}
        </button>
        {genInfo && <span className={genInfo.startsWith("error") ? "gen-info bad" : "gen-info"}>{genInfo}</span>}
      </div>

      <div className="body">
        {/* Slide rail */}
        <nav className="rail">
          {cdeck.slides.map((s, i) => (
            <button
              key={s.id}
              className={i === slideIdx ? "thumb active" : "thumb"}
              onClick={() => {
                setSlideIdx(i);
                setSelectedBlockId(null);
              }}
            >
              <div className="thumb-num">{i + 1}</div>
              <div className="thumb-stage">
                <div
                  style={{
                    transform: `scale(${152 / cdeck.canvas.w})`,
                    transformOrigin: "top left",
                    width: cdeck.canvas.w,
                    height: cdeck.canvas.h,
                  }}
                >
                  <SlideView deck={cdeck} slide={s} />
                </div>
              </div>
            </button>
          ))}
        </nav>

        {/* Stage */}
        <main className="stage" onClick={() => setSelectedBlockId(null)}>
          <div
            className="slide-frame"
            style={{ width: cdeck.canvas.w * stageScale, height: cdeck.canvas.h * stageScale }}
          >
            <div style={{ transform: `scale(${stageScale})`, transformOrigin: "top left" }}>
              <SlideView
                deck={cdeck}
                slide={cslide}
                editable
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                onEditText={editBlockText}
              />
            </div>
          </div>
          <div className="stage-hint">
            Click a block to select · double-click text to edit · {slideIdx + 1}/{deck.slides.length}
          </div>
        </main>

        {/* Spec panel */}
        {showSpec && (
          <aside className="spec">
            <div className="spec-head">
              deck spec
              {specError ? <span className="spec-bad">{specError.length} error(s)</span> : <span className="spec-ok">valid</span>}
            </div>
            <textarea
              className="spec-text"
              spellCheck={false}
              value={specText}
              onChange={(e) => applySpecText(e.target.value)}
            />
            {specError && (
              <div className="spec-errors">
                {specError.map((er, i) => (
                  <div key={i}>• {er}</div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
