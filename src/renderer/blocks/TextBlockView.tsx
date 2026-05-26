import { useEffect, useRef, useState } from "react";
import type { CompiledBlock } from "../../compiler";
import type { TextBlock, Theme } from "../../deck-spec";

/** Font size in px per text role, scaled off the theme base. */
function roleSize(role: TextBlock["role"], baseFontPt: number): number {
  const scale: Record<TextBlock["role"], number> = {
    title: 2.4,
    subtitle: 1.4,
    heading: 1.6,
    body: 1.0,
    caption: 0.8,
  };
  // pt -> px at 96dpi reference, then scale by role.
  return baseFontPt * (96 / 72) * scale[role];
}

export function TextBlockView({
  cb,
  theme,
  editable,
  onEditText,
}: {
  cb: CompiledBlock;
  theme: Theme;
  editable: boolean;
  /** Commit edited plain text back to the spec (one string per line). */
  onEditText?: (lines: string[]) => void;
}) {
  const block = cb.block as TextBlock;
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // When entering edit mode, focus and select the text.
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  const size = roleSize(block.role, theme.baseFontPt);
  const weight = block.role === "title" || block.role === "heading" ? 600 : 400;

  const commit = () => {
    if (!ref.current) return;
    const text = ref.current.innerText;
    const lines = text.split("\n").filter((l) => l.length > 0);
    onEditText?.(lines.length ? lines : [""]);
    setEditing(false);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        color: theme.palette.text,
        fontFamily: theme.fontFamily,
        textAlign: block.align,
        overflow: "hidden",
      }}
      onDoubleClick={() => editable && setEditing(true)}
    >
      {editing ? (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          style={{
            fontSize: size,
            fontWeight: weight,
            lineHeight: 1.25,
            outline: `2px solid ${theme.palette.accent}`,
            borderRadius: 4,
            padding: "2px 4px",
            whiteSpace: "pre-wrap",
          }}
        >
          {block.lines.map((l) => l.text).join("\n")}
        </div>
      ) : (
        block.lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: size,
              fontWeight: weight,
              lineHeight: 1.25,
              paddingLeft: line.bullet ? 24 + line.level * 20 : line.level * 20,
              position: "relative",
            }}
          >
            {line.bullet && (
              <span style={{ position: "absolute", left: line.level * 20, color: theme.palette.accent }}>
                •
              </span>
            )}
            {line.text}
          </div>
        ))
      )}
    </div>
  );
}
