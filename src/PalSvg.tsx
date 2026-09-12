import type { CSSProperties } from "react";
import {
  isMorphable,
  palVars,
  resolveShape,
  type PalColors,
  type PalEmote,
  type PalMotion,
  type PalShape,
  type PalShapeName,
} from "./types";

// The clip pal as one reusable SVG. The body and the leg are separate paths
// so the leg can swing on its own — its pivot sits at the hip, where the leg
// wire leaves the body (15,63 in viewBox units). `walking` turns the step on.
//
// `emote` plays one of his party tricks. The morphing ones rewrite the body
// and leg paths from styles.css; every target shape there keeps the exact
// command sequence of the paths below (M L C C L C C L for the body, M C C L
// for the leg), because same commands in the same order is what lets the
// browser tween one shape into the other instead of cutting between them.
//
// The ball, the crack, the tap rings and the sleep bubbles are props:
// invisible until an emote calls for them, and kept inside the viewBox so
// nothing ever paints over the page.
//
// Colours come from CSS custom properties so a host page can restyle him
// without touching the markup; the defaults are the ClipSpace desk set.
const wire: CSSProperties = { stroke: "var(--pal-wire, #d9a441)" };
const face: CSSProperties = { fill: "var(--pal-face, #f2ede0)" };
const faceLine: CSSProperties = { stroke: "var(--pal-face, #f2ede0)" };
const ink: CSSProperties = { fill: "var(--pal-ink, #131f1a)" };
const inkLine: CSSProperties = { stroke: "var(--pal-ink, #131f1a)" };

export type PalSvgProps = {
  /** rendered width in px; the height follows the 50:80 viewBox unless given */
  width?: number;
  /** rendered height in px — set it to squash or stretch him */
  height?: number;
  /** swing the leg as if walking */
  walking?: boolean;
  /** the gesture or pose to play */
  emote?: PalEmote | null;
  /** play the pose's unfolding half rather than holding it */
  emoteOut?: boolean;
  /** a preset name or your own wire (see PalShape) */
  shape?: PalShapeName | PalShape;
  /** wire thickness in viewBox units (default 5) */
  strokeWidth?: number;
  /** "dots" (default) or "none" for a faceless clip */
  eyes?: "dots" | "none";
  /** colours as props — the same --pal-* variables, set inline */
  colors?: PalColors;
  /** tempo, stride, sway, blink — the same --pal-* variables, set inline */
  motion?: PalMotion;
  className?: string;
  style?: CSSProperties;
};

let warned = false;

export default function PalSvg({
  width = 88,
  height,
  walking = false,
  emote = null,
  emoteOut = false,
  shape,
  strokeWidth = 5,
  eyes = "dots",
  colors,
  motion,
  className,
  style,
}: PalSvgProps) {
  const h = height ?? Math.round((width * 80) / 50);
  const sh = resolveShape(shape);
  if (!warned && !isMorphable(sh)) {
    warned = true;
    console.warn(
      "[clip-pal] custom shape does not keep the M L C C L C C L / M C C L command sequence — the morphing poses will cut instead of tween.",
    );
  }
  const classes = [
    "pal",
    walking ? "pal-walking" : "",
    emote ? `pal-em-${emote}${emoteOut ? "-out" : ""}` : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  const vars = palVars(colors, motion);
  return (
    <svg
      width={width}
      height={h}
      viewBox="0 0 50 80"
      preserveAspectRatio={height ? "none" : undefined}
      fill="none"
      aria-hidden
      className={classes}
      style={{ ...(vars as CSSProperties), ...style }}
    >
      {/* The crack he leaves in the screen. It radiates from (42,30) — the
          exact point his leg reaches on the strike — and is drawn behind him,
          so he stands in front of the damage. */}
      <g
        className="pal-crack"
        style={faceLine}
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M42 30 L48.5 30.0 M42 30 L48.5 22.2 M42 30 L42.0 19.0 M42 30 L34.2 22.2 M42 30 L31.0 30.0 M42 30 L34.2 37.8 M42 30 L42.0 41.0 M42 30 L48.5 37.8 M46.5 30.0 L45.2 26.8 L42.0 25.5 L38.8 26.8 L37.5 30.0 L38.8 33.2 L42.0 34.5 L45.2 33.2 Z M48.5 30.0 L48.0 24.0 L42.0 21.5 L36.0 24.0 L33.5 30.0 L36.0 36.0 L42.0 38.5 L48.0 36.0 Z" />
      </g>

      <g
        style={wire}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path className="pal-body" d={sh.body} />
        <path
          className="pal-leg"
          d={sh.leg}
          style={{ transformOrigin: `${sh.hip[0]}px ${sh.hip[1]}px` }}
        />
      </g>
      {eyes === "dots" &&
        sh.eyes.map((e, i) => (
          <circle key={i} className="pal-eye" cx={e.cx} cy={e.cy} r={e.r} style={face} />
        ))}

      {/* Impact rings where his fingertip meets the glass. Without these a tap
          toward the viewer has no direction to move in and just reads as
          pointing sideways — the rings are what say there is a surface there. */}
      <g className="pal-tap" style={faceLine} fill="none" strokeLinecap="round">
        <circle cx="45" cy="45" r="3.8" strokeWidth="1.9" />
        <circle cx="45" cy="45" r="6.2" strokeWidth="1.3" />
      </g>

      {/* The football. Parked clear of the leg loop — it used to sit underneath
          the leg, which is why the kick never read. Solid with a dark panel; a
          bare ring looked like a hoop. */}
      <g className="pal-ball">
        <circle cx="42" cy="71" r="6.6" style={face} />
        <path d="M42 68 L44.8 70 L43.7 73.4 L40.3 73.4 L39.2 70 Z" style={ink} />
        <path
          d="M42 68 L42 64.4 M44.8 70 L48.3 68.9 M43.7 73.4 L45.9 76.3 M40.3 73.4 L38.1 76.3 M39.2 70 L35.7 68.9"
          style={inkLine}
          strokeWidth="1"
          fill="none"
        />
      </g>

      {/* Sleep bubbles: three dots that drift up from his head while he dozes,
          each a little bigger than the one below. */}
      <g className="pal-zzz" style={face}>
        <circle className="pal-zzz-1" cx="39" cy="16" r="1.6" />
        <circle className="pal-zzz-2" cx="43" cy="11" r="2.2" />
        <circle className="pal-zzz-3" cx="46.5" cy="5.5" r="2.7" />
      </g>
    </svg>
  );
}
