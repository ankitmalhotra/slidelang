import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { CompiledBlock } from "../../compiler";
import type { MathBlock, Theme } from "../../deck-spec";

export function MathBlockView({ cb, theme }: { cb: CompiledBlock; theme: Theme }) {
  const block = cb.block as MathBlock;

  // Render LaTeX to HTML. If KaTeX throws (invalid LaTeX), fall back to a
  // visible error rather than crashing — the validator will also flag this.
  const { html, error } = useMemo(() => {
    try {
      return {
        html: katex.renderToString(block.latex, {
          displayMode: block.display,
          throwOnError: true,
        }),
        error: null as string | null,
      };
    } catch (e) {
      return { html: "", error: (e as Error).message };
    }
  }, [block.latex, block.display]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: theme.palette.text,
        fontSize: 22,
        overflow: "hidden",
      }}
    >
      {error ? (
        <span style={{ color: theme.palette.accent, fontSize: 13, fontFamily: "monospace" }}>
          ⚠ invalid LaTeX: {error}
        </span>
      ) : (
        <span dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}
