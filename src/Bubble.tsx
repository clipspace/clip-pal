import type { CSSProperties, ReactNode } from "react";

// The speech bubble both pals talk through. It pops in (`pal-say`), shows the
// typing dots first, then the line; `hidden` fades it away again. The box can
// be given an explicit size so it morphs smoothly from the dots into the
// full line — the content inside is always rendered at its natural size and
// is what the caller measures.
export type BubbleProps = {
  /** which way the bubble grows — the side its tail is on */
  side: "left" | "right" | "center";
  hidden: boolean;
  typing: boolean;
  line: string;
  /** measured box size, or undefined to let it size naturally */
  box?: { w: number; h: number } | null;
  contentStyle?: CSSProperties;
  contentRef?: React.Ref<HTMLDivElement>;
  /** offset of the tail from the near edge, in px (ignored for "center") */
  tailInset?: number;
  children?: ReactNode;
};

export function Bubble({
  side,
  hidden,
  typing,
  line,
  box,
  contentStyle,
  contentRef,
  tailInset = 10,
}: BubbleProps) {
  const tailStyle: CSSProperties | undefined =
    side === "left"
      ? { right: tailInset }
      : side === "right"
        ? { left: tailInset }
        : undefined;
  return (
    <div
      className={`clip-pal-bubble is-${side} ${hidden ? "pal-bubble-hide" : "pal-say"}`}
    >
      <div
        className="clip-pal-bubble-box"
        style={box ? { width: box.w, height: box.h } : undefined}
      >
        <div ref={contentRef} className="clip-pal-bubble-content" style={contentStyle}>
          {typing ? (
            <span className="clip-pal-dots">
              <span className="clip-pal-dot" />
              <span className="clip-pal-dot" />
              <span className="clip-pal-dot" />
            </span>
          ) : (
            <span className="pal-line-in">{line}</span>
          )}
        </div>
      </div>
      <span className="clip-pal-tail" style={tailStyle} />
    </div>
  );
}
