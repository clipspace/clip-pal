# clip-pal 🖇️

A one-legged paperclip who walks along the side of your page as you scroll,
keeps you company, and acts out what he says. He is the mascot of
[ClipSpace](https://clipspace.djt-group.com); this is him as a React
component, so he can hold other pages together too.

- **One SVG, one wire.** The body and the leg are separate paths, so the leg
  can step, wave, point, kick a ball and knock on the glass.
- **Twenty-one emotes.** Gestures that play once (`wave`, `nod`, `kick`,
  `backflip`, …) and poses he bends into and holds (`heart`, `question`,
  `key`, …) — the poses morph the wire itself with CSS `d: path()`.
- **Two ways to use him.** `ScrollPal` walks from anchor to anchor on wide
  screens; `PalCompanion` stands in one place and talks now and then.
- **Everything is a knob.** Shape presets or your own wire, stroke width,
  every colour, tempo, walking speed, sway, blink, bubble size, what he may
  say and do — props or CSS variables, your pick. Hover comments via
  `data-pal-say`, and a `ref` to make him say or do things on demand.
- **No dependencies** beyond React. ~25 KB of JS, one CSS file, themeable
  with custom properties. Respects `prefers-reduced-motion`.

## Install

```bash
npm i clip-pal
```

```tsx
import { PalCompanion } from "clip-pal";
import "clip-pal/styles.css";

<PalCompanion
  width={90}
  lines={[
    ["hey — i'm clip pal. i hold this whole thing together.", "wave"],
    ["it looks like you're trying to leave big tech. want a hand?", "question"],
  ]}
/>
```

Every line comes with the emote he acts out when he says it — a
`[text, emote]` pair. Keep them together: a question turns him into a
question mark, "no ads" gets a head shake.

## The walking guide

```tsx
import { ScrollPal, type PalStop } from "clip-pal";

const STOPS: PalStop[] = [
  { id: "hero",     anchor: "hero-title",   place: "beside",       lines: [["hello.", "wave"]] },
  { id: "features", anchor: "features-h2",  place: "gutter-left",  lines: [["look at all this.", "look"]] },
  { id: "footer",   anchor: "footer-title", place: "gutter-right", lines: [["that's the lot.", "bow"]] },
];

<ScrollPal stops={STOPS} idleLines={[["quiet in here.", "doze"]]} />
```

- `id` — the element whose vertical span "owns" him. He belongs to whichever
  stop's element the middle of the viewport is inside, so the switch point
  is deterministic and the same in both scroll directions.
- `anchor` — the element he stands next to and rides along with as it
  scrolls. `place` puts him right beside it, or parks him in the left or
  right gutter at its height.
- He needs a gutter: the space between the screen edge and your content
  column. By default he reads its width from the `--content-w` custom
  property on `<html>` (rem or px; falls back to 72rem); pass
  `contentWidth={1152}` or a function instead. When the gutter is narrower
  than 46 px, or the viewport is under `minViewport` (1600), he is not
  rendered — put a `PalCompanion` in the page for those screens.
- He is draggable. Drop him somewhere and he stays until the next scroll.
- After `idleAfterMs` (12 s) with no input he wanders to the far side of the
  screen and says one of `idleLines`; any input sends him back.

### Props

Every number that used to be hardcoded is a prop; the defaults are what the
ClipSpace site was tuned with.

| prop | default | |
|---|---|---|
| `stops` | — | the stops, top to bottom |
| `idleLines` | — | lines for when the page sits still; omit to disable wandering |
| `idle` | true | wander at all |
| `idleAfterMs` / `idleWanderMs` | 12000 / 20000 | stillness before he wanders, pause between wanders |
| `minViewport` | 1600 | narrowest viewport he appears on |
| `contentWidth` | reads `--content-w` | px, or `() => px` |
| `contentVar` | `"--content-w"` | the custom property to read |
| `minWidth` / `maxWidth` | 46 / 92 | his rendered width range; narrower gutters hide him |
| `gap` / `edge` | 12 / 8 | clearance from the content column / the screen edge |
| `side` | `"auto"` | `"left"` or `"right"` forces one gutter for every stop |
| `offsetY` | 0 | shift his resting height, px |
| `yLimitPad` | 150 | how close to the top/bottom edge he may stand |
| `speed` / `speedY` | 480 / 540 | walking and vertical catch-up speed, px/s |
| `ease` | 6.32 | ease rate toward the target — bigger snaps, smaller drifts |
| `leanMax` | 9 | how far he leans into a stride, degrees |
| `walkThreshold` | 27 | px/s above which he counts as walking |
| `retargetMs` | 330 | how often the anchors are re-measured |
| `typingMs` / `emoteDelayMs` | 850 / 500 | typing dots; beat before the trick |
| `bubbleMaxWidth` / `bubbleMinWidth` | 260 / 150 | px |
| `random` | true | random lines, or in order |
| `speak` | true | false makes him mime |
| `emotes` | true | false = never acts out; or a whitelist array |
| `hover` / `hoverCooldownMs` | true / 1200 | react to `data-pal-say` elements |
| `draggable` | true | |
| `watch` / `watchLines` | true / — | look at the focused text field; lines to say when one gets focus |
| `approach` / `approachStayMs` | true / 5000 | walk over to hovered/focused things; how long he stays after a hover |
| `shape` | `"gem"` | `"round"`, `"square"`, `"long"` or a `PalShape` |
| `strokeWidth` | 5 | wire thickness |
| `eyes` | `"dots"` | `"none"` |
| `colors` | — | `{ wire, face, ink, bubbleBg, bubbleBorder, bubbleText, bubbleDot }` |
| `motion` | — | `{ tempo, stepMs, swayMs, swayDeg, blinkMs, floatMs, floatPx }` |
| `zIndex` | 40 | |
| `onArrive(stopId)` / `onLeave(stopId)` / `onSpeak(text, emote)` / `onIdle()` | — | callbacks |

`PalCompanion`: `lines` (required), `width` (90), `height`, `showMs`
(10000), `gapMs` (20000), `firstMs` (1500), `typingMs`, `emoteDelayMs`,
`bubbleMaxWidth` ("15rem"), `random`, `speak`, `emotes`, `hover`,
`hoverCooldownMs`, `watch`, `watchLines`, `float` (true), `sway` (true), `visibleThreshold` (0.4),
`shape`, `strokeWidth`, `eyes`, `colors`, `motion`, `onSpeak`.

`PalSvg`: the bare drawing — `width`, `height`, `walking`, `emote`,
`emoteOut`, `shape`, `strokeWidth`, `eyes`, `colors`, `motion`. Use it to
drive him yourself; `gestureMs(name, tempo)` gives each gesture's duration,
and a pose holds until you render it again with `emoteOut`.

### Control from outside

Both `ScrollPal` and `PalCompanion` take a `ref`:

```tsx
const pal = useRef<ScrollPalHandle>(null);
<ScrollPal ref={pal} stops={STOPS} />
pal.current?.say("you clicked the thing.", "nod");
pal.current?.emote("backflip");
pal.current?.hush();
```

### He comes over

Hover something with `data-pal-say`, or focus a text field, and the
walking guide walks over — he parks in the gutter nearest to it, at its
height — and says his line there, instead of shouting from the other side
of the page. He goes back to his stop when the field loses focus, or
`approachStayMs` (5 s) after a hover. `approach={false}` keeps him put.

### He watches you type

Focus any text field and his eyes turn toward it; every keystroke gives
them a flick, like he is reading along. On by default (`watch={false}`
turns it off). Give him `watchLines` and he also says one of them when a
field gets focus:

```tsx
<ScrollPal stops={STOPS} watchLines={[["i'm not reading. okay, a bit.", "look"]]} />
```

### Hover comments

Put `data-pal-say` on anything and he comments when the pointer lands on
it; `data-pal-emote` picks the trick.

```html
<article data-pal-say="ooh, a card. fancy." data-pal-emote="spin">…</article>
```

One `pointerover` listener on the document handles all of them, so add and
remove such elements freely. `hover={false}` turns it off.

### Your own shape

```tsx
<PalCompanion shape="round" strokeWidth={6} lines={LINES} />

<PalCompanion
  shape={{
    body: "M15 62 L15 14 C15 7 19 3 25 3 C31 3 35 7 35 14 L35 50 C35 55 32 58 28 58 C24 58 21 55 21 50 L21 20",
    leg: "M15 63 C15 70 20 73 27 73 C34 73 41 69 41 61 L41 54",
    hip: [15, 63],
    eyes: [{ cx: 22, cy: 12, r: 2.4 }, { cx: 30, cy: 12, r: 2.4 }],
  }}
  lines={LINES}
/>
```

The viewBox is `0 0 50 80`. Keep the body as `M L C C L C C L` and the leg
as `M C C L` and every morphing pose still tweens from your shape; break
the sequence and he cuts to the pose instead (a dev warning says so).

## Emotes

Gestures (play once, land back where they started):
`lean` `look` `knock` `kick` `crack` `dance` `wave` `hop` `spin` `nod`
`shake` `bow` `backflip` `shiver` `doze`

Poses (bend in, hold, unfold when he moves on):
`unbend` `curl` `heart` `question` `exclaim` `key`

## Theming

Set on `:root` or any ancestor — or pass `colors` / `motion` props, which
set the same variables inline. Defaults are the ClipSpace desk set.

```css
:root {
  /* colours */
  --pal-wire: #d9a441;           /* the paperclip */
  --pal-face: #f2ede0;           /* eyes, ball, crack, rings, sleep bubbles */
  --pal-ink: #131f1a;            /* the ball's panel */
  --pal-bubble-bg: #1b2a23;
  --pal-bubble-border: rgba(242, 237, 224, 0.1);
  --pal-bubble-text: #f2ede0;
  --pal-bubble-dot: #9daa9f;
  --pal-bubble-radius: 1rem;
  --pal-bubble-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  --pal-bubble-padding: 0.625rem 1rem;
  --pal-bubble-font-size: 0.875rem;
  --pal-font: inherit;
  /* motion */
  --pal-tempo: 1;                /* multiplies every emote's duration */
  --pal-step: 0.36s;             /* one stride while walking */
  --pal-sway: 5s;                /* idle sway period */
  --pal-sway-deg: 2.5deg;        /* idle sway amplitude */
  --pal-blink: 5s;
  --pal-float: 6s;               /* the companion's float */
  --pal-float-px: 8px;
}
```

## Frameworks

The bundle is marked `"use client"`, so in Next.js you can import it
straight into a server component. Import the stylesheet once, in your root
layout.

## Development

```bash
npm i
npm run demo    # every emote on a button grid + the walking guide
npm run build   # dist/ via tsup
```

## License

MIT · made for [ClipSpace](https://clipspace.djt-group.com) by
[Jáchym Šolta](https://jachym.djt-group.com)
