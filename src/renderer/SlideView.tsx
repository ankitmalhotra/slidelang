import type { CompiledDeck, CompiledSlide } from "../compiler";
import { TextBlockView } from "./blocks/TextBlockView";
import { ChartBlockView } from "./blocks/ChartBlockView";
import { MathBlockView } from "./blocks/MathBlockView";
import { ImageBlockView } from "./blocks/ImageBlockView";

/**
 * Paints one compiled slide. The compiler already resolved every block into a
 * pixel box; here we just absolutely-position each block at those coordinates.
 * The slide is rendered at native canvas pixels and scaled by the parent via
 * CSS transform, so geometry stays exact regardless of display size.
 */
export function SlideView({
  deck,
  slide,
  editable = false,
  selectedBlockId,
  onSelectBlock,
  onEditText,
}: {
  deck: CompiledDeck;
  slide: CompiledSlide;
  editable?: boolean;
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string) => void;
  onEditText?: (blockId: string, lines: string[]) => void;
}) {
  const bg = slide.background ?? deck.theme.palette.background;

  return (
    <div
      style={{
        position: "relative",
        width: deck.canvas.w,
        height: deck.canvas.h,
        background: bg,
        overflow: "hidden",
      }}
    >
      {slide.blocks.map((cb) => {
        const selected = editable && selectedBlockId === cb.block.id;
        return (
          <div
            key={cb.block.id}
            onClick={(e) => {
              if (!editable) return;
              e.stopPropagation();
              onSelectBlock?.(cb.block.id);
            }}
            style={{
              position: "absolute",
              left: cb.pixels.x,
              top: cb.pixels.y,
              width: cb.pixels.w,
              height: cb.pixels.h,
              zIndex: cb.block.z,
              outline: selected ? `2px solid ${deck.theme.palette.accent}` : "none",
              outlineOffset: 2,
              cursor: editable ? "pointer" : "default",
            }}
          >
            {cb.block.type === "text" && (
              <TextBlockView
                cb={cb}
                theme={deck.theme}
                editable={editable}
                onEditText={(lines) => onEditText?.(cb.block.id, lines)}
              />
            )}
            {cb.block.type === "chart" && <ChartBlockView cb={cb} theme={deck.theme} />}
            {cb.block.type === "math" && <MathBlockView cb={cb} theme={deck.theme} />}
            {cb.block.type === "image" && <ImageBlockView cb={cb} theme={deck.theme} />}
          </div>
        );
      })}
    </div>
  );
}
