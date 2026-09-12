// How long each gesture runs, in milliseconds — must match the animation
// shorthands in styles.css. The POSES below are absent on purpose: they have
// no duration because they hold until something tells them to unfold.
export const PAL_GESTURES = {
  lean: 4000, // steps up close and stays there while the line is read
  look: 3200, // glances left and right, with a beat on each side
  knock: 3400, // walks up, points a finger and taps on the glass
  kick: 4200, // a ball rolls in, he boots it away
  crack: 3000, // thumps the screen hard enough to crack it
  dance: 3000, // sways with the leg kicking out
  wave: 2400, // waves with his leg
  hop: 2200, // a decaying bounce on the spot
  spin: 1400, // one pirouette
  nod: 1600, // yes
  shake: 1600, // no
  bow: 2200, // a bow from the foot, held a moment
  backflip: 1600, // crouch, one full turn in the air, land
  shiver: 1400, // a quick shudder with the eyes squeezed shut
  doze: 3200, // eyes close, he droops, then jolts awake
} as const;

// Shapes he bends into and stays in. They fold in, hold for as long as he is
// standing there, and only unfold when he sets off again — which is why they
// are timed by the caller rather than by a fixed duration.
export const PAL_POSES = [
  "unbend",
  "curl",
  "heart",
  "question",
  "exclaim",
  "key",
] as const;

export const PAL_POSE_IN_MS = 900; // matches the -in animations
export const PAL_POSE_OUT_MS = 700; // matches the -out animations

export type PalGesture = keyof typeof PAL_GESTURES;
export type PalPose = (typeof PAL_POSES)[number];
export type PalEmote = PalGesture | PalPose;

export const PAL_EMOTES: readonly PalEmote[] = [
  ...(Object.keys(PAL_GESTURES) as PalGesture[]),
  ...PAL_POSES,
];

export function isPose(emote: PalEmote): emote is PalPose {
  return (PAL_POSES as readonly string[]).includes(emote);
}

// A line and the trick that goes with it. Pairing them rather than keeping a
// separate lookup is deliberate: an emote is part of how a line reads, so the
// two have to be written together and can never drift apart.
export type PalLine = readonly [text: string, emote: PalEmote];

// A place the walking pal stops at. `id` is the element whose vertical span
// owns him (he belongs to whichever stop's element the middle of the screen
// is inside); `anchor` is the element he stands next to and rides along with.
export type PalStop = {
  id: string;
  anchor: string;
  /** beside the anchor, or parked in one of the gutters either side of the content column */
  place: "beside" | "gutter-left" | "gutter-right";
  /** horizontal clearance from the anchor when `place` is "beside" (default 26) */
  gap?: number;
  lines: readonly PalLine[];
};

// ---------- shape ----------

export type PalEye = { cx: number; cy: number; r: number };

// The wire itself. `body` must be M L C C L C C L and `leg` M C C L — the
// same command sequence as the default — or the morphing poses cut instead
// of tweening. `hip` is where the leg leaves the body: the leg pivots there.
export type PalShape = {
  body: string;
  leg: string;
  hip: readonly [x: number, y: number];
  eyes: readonly [PalEye, PalEye];
};

export const PAL_SHAPES = {
  /** the everyday Gem clip — the default */
  gem: {
    body: "M15 62 L15 14 C15 7 19 3 25 3 C31 3 35 7 35 14 L35 50 C35 55 32 58 28 58 C24 58 21 55 21 50 L21 20",
    leg: "M15 63 C15 70 20 73 27 73 C34 73 41 69 41 61 L41 54",
    hip: [15, 63],
    eyes: [
      { cx: 22, cy: 12, r: 2.4 },
      { cx: 30, cy: 12, r: 2.4 },
    ],
  },
  /** rounder, chubbier loops */
  round: {
    body: "M13 60 L13 18 C13 8 18 3 25 3 C32 3 37 8 37 18 L37 48 C37 55 33 59 28 59 C23 59 20 55 20 49 L20 24",
    leg: "M13 61 C13 70 19 74 27 74 C35 74 42 69 42 61 L42 55",
    hip: [13, 61],
    eyes: [
      { cx: 21, cy: 13, r: 2.7 },
      { cx: 29, cy: 13, r: 2.7 },
    ],
  },
  /** a boxy office clip with squared corners */
  square: {
    body: "M14 62 L14 8 C14 5 15 4 18 4 C28 4 32 4 32 4 L36 4 C36 20 36 40 36 54 C36 58 34 59 30 59 C22 59 20 58 20 54 L20 18",
    leg: "M14 63 C14 72 18 74 26 74 C34 74 42 72 42 64 L42 56",
    hip: [14, 63],
    eyes: [
      { cx: 21, cy: 12, r: 2.4 },
      { cx: 29, cy: 12, r: 2.4 },
    ],
  },
  /** stretched tall and thin */
  long: {
    body: "M17 64 L17 12 C17 6 20 2 25 2 C30 2 33 6 33 12 L33 52 C33 56 31 59 28 59 C25 59 23 56 23 52 L23 18",
    leg: "M17 65 C17 71 21 74 27 74 C33 74 39 70 39 63 L39 56",
    hip: [17, 65],
    eyes: [
      { cx: 22.5, cy: 10, r: 2 },
      { cx: 27.5, cy: 10, r: 2 },
    ],
  },
} as const satisfies Record<string, PalShape>;

export type PalShapeName = keyof typeof PAL_SHAPES;

export function resolveShape(shape?: PalShapeName | PalShape): PalShape {
  if (!shape) return PAL_SHAPES.gem;
  if (typeof shape === "string") return PAL_SHAPES[shape] ?? PAL_SHAPES.gem;
  return shape;
}

const commands = (d: string) => d.replace(/[^MLCQSTAHVZmlcqstahvz]/g, "");

/** true when a custom shape keeps the command sequence the morphs need */
export function isMorphable(shape: PalShape): boolean {
  return (
    commands(shape.body) === commands(PAL_SHAPES.gem.body) &&
    commands(shape.leg) === commands(PAL_SHAPES.gem.leg)
  );
}

// ---------- colours & motion ----------

export type PalColors = {
  /** the paperclip wire */
  wire?: string;
  /** eyes, ball, crack, rings, sleep bubbles */
  face?: string;
  /** the ball's dark panel */
  ink?: string;
  bubbleBg?: string;
  bubbleBorder?: string;
  bubbleText?: string;
  bubbleDot?: string;
};

export type PalMotion = {
  /** multiplies every emote's duration; 1 = as authored, 2 = half speed */
  tempo?: number;
  /** one stride while walking, ms (default 360) */
  stepMs?: number;
  /** idle sway period, ms (default 5000) */
  swayMs?: number;
  /** idle sway amplitude, degrees (default 2.5) */
  swayDeg?: number;
  /** blink period, ms (default 5000) */
  blinkMs?: number;
  /** the companion's float period, ms (default 6000) */
  floatMs?: number;
  /** the companion's float height, px (default 8) */
  floatPx?: number;
};

/** a gesture's duration in ms at the given tempo */
export function gestureMs(gesture: PalGesture, tempo = 1): number {
  return Math.round(PAL_GESTURES[gesture] * tempo);
}

/** inline style carrying the --pal-* variables for the given colours/motion */
export function palVars(
  colors?: PalColors,
  motion?: PalMotion,
): Record<string, string> {
  const v: Record<string, string> = {};
  if (colors?.wire) v["--pal-wire"] = colors.wire;
  if (colors?.face) v["--pal-face"] = colors.face;
  if (colors?.ink) v["--pal-ink"] = colors.ink;
  if (colors?.bubbleBg) v["--pal-bubble-bg"] = colors.bubbleBg;
  if (colors?.bubbleBorder) v["--pal-bubble-border"] = colors.bubbleBorder;
  if (colors?.bubbleText) v["--pal-bubble-text"] = colors.bubbleText;
  if (colors?.bubbleDot) v["--pal-bubble-dot"] = colors.bubbleDot;
  if (motion?.tempo !== undefined) v["--pal-tempo"] = String(motion.tempo);
  if (motion?.stepMs !== undefined) v["--pal-step"] = `${motion.stepMs}ms`;
  if (motion?.swayMs !== undefined) v["--pal-sway"] = `${motion.swayMs}ms`;
  if (motion?.swayDeg !== undefined) v["--pal-sway-deg"] = `${motion.swayDeg}deg`;
  if (motion?.blinkMs !== undefined) v["--pal-blink"] = `${motion.blinkMs}ms`;
  if (motion?.floatMs !== undefined) v["--pal-float"] = `${motion.floatMs}ms`;
  if (motion?.floatPx !== undefined) v["--pal-float-px"] = `${motion.floatPx}px`;
  return v;
}
