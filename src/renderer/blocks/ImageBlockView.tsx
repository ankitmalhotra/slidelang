import { useState } from "react";
import type { CompiledBlock } from "../../compiler";
import type { ImageBlock, Theme } from "../../deck-spec";

export function ImageBlockView({ cb, theme }: { cb: CompiledBlock; theme: Theme }) {
  const block = cb.block as ImageBlock;
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px dashed ${theme.palette.muted}`,
          borderRadius: 6,
          color: theme.palette.muted,
          fontFamily: theme.fontFamily,
          fontSize: 13,
          textAlign: "center",
          padding: 8,
        }}
      >
        ⚠ image failed to load — {block.alt}
      </div>
    );
  }

  return (
    <img
      src={block.src}
      alt={block.alt}
      onError={() => setBroken(true)}
      style={{ width: "100%", height: "100%", objectFit: block.fit, borderRadius: 6 }}
    />
  );
}
