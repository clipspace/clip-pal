import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Bubble } from "./Bubble";
import { useHoverSay } from "./hover";
import PalSvg from "./PalSvg";
import {
  gestureMs,
  isPose,
  palVars,
  PAL_POSE_OUT_MS,
  type PalColors,
  type PalEmote,
  type PalLine,
  type PalMotion,
  type PalShape,
  type PalShapeName,
  type PalStop,
} from "./types";

// The scroll guide, for wide screens.
//
// Every stop is ANCHORED to a real element on the page — he stands next to a
// headline, beside a card, in the gutter by a paragraph — and rides along
// with it as the page scrolls. Walking from one anchor to the next is what
// gives the run a reason: he's off to the next thing worth pointing at.
//
// He only ever *targets* a resting spot (never a point in between), so
// stopping mid-scroll can't strand him on top of content. The bubble sits
// above his head and grows away from whatever he's standing next to.
//
// He needs a gutter to stand in: the space between the edge of the screen
// and the content column. Below `minViewport` — or when the gutter is too
// narrow to hold him — he is not rendered at all, and a PalCompanion placed
// in the page is the usual stand-in.
//
// Everything that was a magic number is a prop; the defaults are the values
// the ClipSpace site was tuned with.

export type ScrollPalHandle = {
  /** interrupt and say this, optionally acting it out */
  say: (text: string, emote?: PalEmote | null) => void;
  /** play a gesture or fold into a pose without saying anything */
  emote: (name: PalEmote) => void;
  /** put the bubble away and unfold any held pose */
  hush: () => void;
  /** the stop he is currently at (or "idle" while wandering) */
  current: () => string;
};

export type ScrollPalProps = {
  /** where he stops, top to bottom */
  stops: readonly PalStop[];
  /**
   * Lines for when the page sits still. After `idleAfterMs` without any
   * input he wanders to the far side of the screen and says one of these;
   * omit (or set `idle={false}`) to keep him at his post.
   */
  idleLines?: readonly PalLine[];
  /** wander when the page sits still (default true when idleLines given) */
  idle?: boolean;
  /** stillness before he wanders off, ms (default 12 000) */
  idleAfterMs?: number;
  /** pause between idle wanders, ms (default 20 000) */
  idleWanderMs?: number;

  /** narrowest viewport he appears on, px (default 1600) */
  minViewport?: number;
  /**
   * Width of the content column he must stay clear of. A number in px, a
   * function returning px, or omitted: then the CSS custom property named by
   * `contentVar` on <html> is read (in rem or px), falling back to 72rem.
   */
  contentWidth?: number | (() => number);
  /** custom property that holds the content width (default "--content-w") */
  contentVar?: string;
  /** his smallest rendered width — narrower gutters hide him (default 46) */
  minWidth?: number;
  /** his largest rendered width, px (default 92) */
  maxWidth?: number;
  /** clearance between him and the content column, px (default 12) */
  gap?: number;
  /** clearance from the screen edge, px (default 8) */
  edge?: number;
  /** force a gutter for every stop instead of following `place` */
  side?: "auto" | "left" | "right";
  /** shift his resting height, px (positive = lower) */
  offsetY?: number;
  /** how close to the top/bottom edge he may stand, px (default 150) */
  yLimitPad?: number;
  /** z-index of the fixed wrapper (default 40) */
  zIndex?: number;

  /** walking speed, px per second (default 480) */
  speed?: number;
  /** vertical catch-up speed, px per second (default 540) */
  speedY?: number;
  /** ease rate toward the target — bigger snaps, smaller drifts (default 6.32) */
  ease?: number;
  /** how far he leans into a stride, degrees (default 9) */
  leanMax?: number;
  /** px/s above which he counts as walking (default 27) */
  walkThreshold?: number;
  /** how often the anchors are re-measured, ms (default 330) */
  retargetMs?: number;

  /** typing dots before the line lands, ms (default 850) */
  typingMs?: number;
  /** beat between the bubble and the trick, ms (default 500) */
  emoteDelayMs?: number;
  /** widest the bubble grows, px (default 260) */
  bubbleMaxWidth?: number;
  /** narrowest the bubble is allowed, px (default 150) */
  bubbleMinWidth?: number;
  /** pick lines at random (default) or in order */
  random?: boolean;
  /** show the bubble at all (default true) — false makes him mime */
  speak?: boolean;
  /** act lines out (default true); or a whitelist of the emotes he may use */
  emotes?: boolean | readonly PalEmote[];
  /** react to `data-pal-say` elements under the pointer (default true) */
  hover?: boolean;
  /** minimum gap between two hover lines, ms (default 1 200) */
  hoverCooldownMs?: number;
  /** let visitors pick him up and drop him (default true) */
  draggable?: boolean;

  /** a preset name or your own wire */
  shape?: PalShapeName | PalShape;
  /** wire thickness in viewBox units (default 5) */
  strokeWidth?: number;
  /** "dots" (default) or "none" */
  eyes?: "dots" | "none";
  /** colours as props — the same --pal-* variables, set inline */
  colors?: PalColors;
  /** tempo, stride, sway, blink — the same --pal-* variables, set inline */
  motion?: PalMotion;

  onArrive?: (stopId: string) => void;
  onLeave?: (stopId: string) => void;
  onSpeak?: (text: string, emote: PalEmote | null) => void;
  onIdle?: () => void;

  className?: string;
  style?: CSSProperties;
};

type Near = { id: string; lines: readonly PalLine[] };

const ScrollPal = forwardRef<ScrollPalHandle, ScrollPalProps>(function ScrollPal(
  {
    stops,
    idleLines,
    idle: idleOn = true,
    idleAfterMs = 12_000,
    idleWanderMs = 20_000,
    minViewport = 1600,
    contentWidth,
    contentVar = "--content-w",
    minWidth = 46,
    maxWidth = 92,
    gap = 12,
    edge = 8,
    side = "auto",
    offsetY = 0,
    yLimitPad = 150,
    zIndex = 40,
    speed = 480,
    speedY = 540,
    ease: easeRate = 6.32,
    leanMax = 9,
    walkThreshold = 27,
    retargetMs = 330,
    typingMs = 850,
    emoteDelayMs = 500,
    bubbleMaxWidth = 260,
    bubbleMinWidth = 150,
    random = true,
    speak = true,
    emotes = true,
    hover = true,
    hoverCooldownMs = 1200,
    draggable = true,
    shape,
    strokeWidth,
    eyes,
    colors,
    motion,
    onArrive,
    onLeave,
    onSpeak,
    onIdle,
    className,
    style,
  },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const palRef = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState(stops[0]?.lines[0]?.[0] ?? "");
  const [leftGutter, setLeftGutter] = useState(true);
  const [bubbleOn, setBubbleOn] = useState(true);
  const [typing, setTyping] = useState(true);
  const [arrivalId, setArrivalId] = useState(0);
  const [walking, setWalking] = useState(false);
  // `out` flips a held pose into its unfolding half, so he never snaps back
  // into a paperclip mid-shape
  const [emote, setEmote] = useState<{ name: PalEmote; out: boolean } | null>(
    null,
  );
  // the pose he is currently holding, tracked synchronously so the walk
  // handler can unfold it without waiting on a render
  const pose = useRef<PalEmote | null>(null);
  const [palW, setPalW] = useState(88);
  const [bubbleW, setBubbleW] = useState(240);
  const [bubSize, setBubSize] = useState<{ w: number; h: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const target = useRef({ x: 40, y: 0 });
  const cur = useRef({ x: 40, y: 0, lean: 0, facing: 1 as 1 | -1 });
  const palWRef = useRef(88);
  const nearRef = useRef<Near>(stops[0] ?? { id: "", lines: [] });
  const idle = useRef(false);
  // drag state: while `dragging` he follows the pointer instead of his target,
  // and `dropped` keeps him where he was let go until the next scroll
  const dragging = useRef(false);
  const dropped = useRef(false);
  const grab = useRef({ x: 0, y: 0 });
  const [grabbed, setGrabbed] = useState(false);
  // false when the side gutter is too narrow to hold him — better to hide
  // him entirely than to have him stand on top of the text
  const [roomy, setRoomy] = useState(false);
  const [wide, setWide] = useState(false);
  // the line last played at each stop, so a random pick can avoid repeating it
  const lineIdx = useRef<Record<string, number>>({});
  const isWalkingRef = useRef(false);

  // props the animation loop reads — kept in refs so the loop is set up once
  const p = useRef({
    stops,
    idleLines,
    random,
    speak,
    emotes,
    tempo: motion?.tempo ?? 1,
    typingMs,
    emoteDelayMs,
    bubbleMaxWidth,
    bubbleMinWidth,
    onArrive,
    onLeave,
    onSpeak,
    onIdle,
  });
  p.current = {
    stops,
    idleLines,
    random,
    speak,
    emotes,
    tempo: motion?.tempo ?? 1,
    typingMs,
    emoteDelayMs,
    bubbleMaxWidth,
    bubbleMinWidth,
    onArrive,
    onLeave,
    onSpeak,
    onIdle,
  };

  // timers shared by the loop and the imperative handle
  const timers = useRef<{
    type?: ReturnType<typeof setTimeout>;
    emote?: ReturnType<typeof setTimeout>;
    emoteEnd?: ReturnType<typeof setTimeout>;
  }>({});

  const allowed = (name: PalEmote | null): PalEmote | null => {
    const e = p.current.emotes;
    if (!name || e === false) return null;
    if (e === true) return name;
    return e.includes(name) ? name : null;
  };

  // Say a line now: bubble types, then the text lands, then the trick. Any
  // held pose unfolds first so he never cuts from one shape to another.
  const sayNow = (text: string, acts: PalEmote | null) => {
    const t = timers.current;
    clearTimeout(t.type);
    clearTimeout(t.emote);
    clearTimeout(t.emoteEnd);
    if (p.current.speak) {
      setLine(text);
      setBubbleOn(true);
      setTyping(true);
      setBubSize(null); // fresh bubble starts at the dots' natural size
      setArrivalId((n) => n + 1);
      t.type = setTimeout(() => setTyping(false), p.current.typingMs);
    }
    p.current.onSpeak?.(text, acts);
    const name = allowed(acts);
    const begin = () => {
      if (!name) return;
      setEmote({ name, out: false });
      if (isPose(name)) {
        pose.current = name;
      } else {
        t.emoteEnd = setTimeout(() => setEmote(null), gestureMs(name, p.current.tempo));
      }
    };
    if (pose.current) {
      setEmote({ name: pose.current, out: true });
      pose.current = null;
      t.emote = setTimeout(begin, PAL_POSE_OUT_MS);
    } else {
      setEmote(null);
      t.emote = setTimeout(begin, p.current.emoteDelayMs);
    }
  };

  const hushNow = () => {
    const t = timers.current;
    clearTimeout(t.type);
    clearTimeout(t.emote);
    clearTimeout(t.emoteEnd);
    if (pose.current) {
      setEmote({ name: pose.current, out: true });
      pose.current = null;
      t.emoteEnd = setTimeout(() => setEmote(null), PAL_POSE_OUT_MS);
    } else {
      setEmote(null);
    }
    setBubbleOn(false);
  };

  useImperativeHandle(ref, () => ({
    say: (text, e = null) => sayNow(text, e),
    emote: (name) => {
      const t = timers.current;
      clearTimeout(t.emote);
      clearTimeout(t.emoteEnd);
      const n = allowed(name);
      if (!n) return;
      if (pose.current) {
        setEmote({ name: pose.current, out: true });
        pose.current = null;
        t.emote = setTimeout(() => {
          setEmote({ name: n, out: false });
          if (isPose(n)) pose.current = n;
          else t.emoteEnd = setTimeout(() => setEmote(null), gestureMs(n, p.current.tempo));
        }, PAL_POSE_OUT_MS);
        return;
      }
      setEmote(null);
      requestAnimationFrame(() => {
        setEmote({ name: n, out: false });
        if (isPose(n)) pose.current = n;
        else t.emoteEnd = setTimeout(() => setEmote(null), gestureMs(n, p.current.tempo));
      });
    },
    hush: hushNow,
    current: () => nearRef.current.id,
  }));

  // hover comments: only while he is standing still and on screen
  useHoverSay(hover && wide && roomy, hoverCooldownMs, ({ text, emote: e }) => {
    if (isWalkingRef.current || dragging.current) return;
    sayNow(text, e);
  });

  // measure the bubble's content so the box itself can smoothly grow from
  // the little typing bubble into the full line (width/height transition)
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setBubSize({ w: el.offsetWidth + 2, h: el.offsetHeight + 2 }); // +2 for the border
  }, [typing, line, bubbleW, palW, arrivalId]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (p.current.stops.length === 0) return;

    const mq = window.matchMedia(`(min-width: ${minViewport}px)`);
    const onMq = () => setWide(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);

    // The content column's width and the root font size can both change
    // across breakpoints, so read them each time rather than caching.
    const contentW = () => {
      if (typeof contentWidth === "number") return contentWidth;
      if (typeof contentWidth === "function") return contentWidth();
      const root = getComputedStyle(document.documentElement);
      const raw = root.getPropertyValue(contentVar).trim();
      const n = parseFloat(raw);
      if (!Number.isFinite(n)) return 72 * parseFloat(root.fontSize);
      return raw.endsWith("px") ? n : n * parseFloat(root.fontSize);
    };
    const gutter = () => Math.max(0, (window.innerWidth - contentW()) / 2);

    const sizePal = () => {
      // as big as the gutter can hold, within a sensible range
      const room = gutter() - gap - edge;
      // Below his minimum width there is no gutter left to stand in, and
      // clamping would park him on top of the content instead.
      setRoomy(room >= minWidth);
      const w = Math.max(minWidth, Math.min(maxWidth, Math.floor(room)));
      if (w !== palWRef.current) {
        palWRef.current = w;
        setPalW(w);
      }
    };

    // park just outside the content box: his content-facing edge stops a
    // gap short of it, so text and buttons are never covered
    const parkLeft = () => Math.max(edge, gutter() - gap - palWRef.current);
    const parkRight = () =>
      Math.min(
        window.innerWidth - edge - palWRef.current,
        window.innerWidth - gutter() + gap,
      );

    const fitBubble = (x: number, onLeft: boolean) => {
      const pw = palWRef.current;
      // the bubble grows away from whatever he stands next to
      const space = onLeft ? x + pw - edge : window.innerWidth - x - pw - edge;
      const { bubbleMinWidth: lo, bubbleMaxWidth: hi } = p.current;
      setBubbleW(Math.round(Math.max(lo, Math.min(hi, space))));
    };

    const computeTarget = () => {
      sizePal();
      const all = p.current.stops;
      const h = window.innerHeight;
      const vc = h / 2;

      // deterministic: he belongs to whichever section the middle of the
      // screen is inside — the divider between two sections is the exact
      // switch point, the same in both scroll directions, no in-between zone
      let near: PalStop | null = null;
      let fallback = all[0];
      let bestD = Infinity;
      for (const s of all) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (vc >= r.top && vc <= r.bottom) {
          near = s;
          break;
        }
        // center sits in a gap or past the ends — nearest section edge wins
        const d = Math.min(Math.abs(r.top - vc), Math.abs(r.bottom - vc));
        if (d < bestD) {
          bestD = d;
          fallback = s;
        }
      }
      if (near === null) near = fallback;
      // the footer can never reach the viewport center, so treat "scrolled
      // to the bottom" as arriving at the last stop
      const atBottom =
        h + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) near = all[all.length - 1];

      const pw = palWRef.current;
      const a = document.getElementById(near.anchor)?.getBoundingClientRect();

      // where he stands: next to his anchor element, or in a gutter beside it
      const place =
        side === "left" ? "gutter-left" : side === "right" ? "gutter-right" : near.place;
      let x: number;
      if (place === "gutter-left") x = parkLeft();
      else if (place === "gutter-right") x = parkRight();
      else if (a) x = Math.min(window.innerWidth - edge - pw, a.right + (near.gap ?? 26));
      else x = parkLeft();

      // ...and at his anchor's height, riding along as the page scrolls,
      // but never drifting off screen
      const yCenter = a ? a.top + a.height / 2 : vc;
      const yLimit = h / 2 - yLimitPad;
      const y = Math.max(-yLimit, Math.min(yLimit, yCenter - vc + offsetY));

      target.current = { x, y };
      nearRef.current = near;
      const onLeft = place === "gutter-left";
      setLeftGutter(onLeft);
      fitBubble(x, onLeft);
    };

    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    // pick a resting spot on the far side of the screen from where he stands,
    // at a random height, and grow the bubble toward the near screen edge
    const wanderSpot = () => {
      sizePal();
      const onLeftNow = cur.current.x < window.innerWidth / 2;
      const x = onLeftNow ? parkRight() : parkLeft();
      const yLimit = window.innerHeight / 2 - yLimitPad - 30;
      target.current = {
        x,
        y: Math.round((Math.random() * 2 - 1) * Math.max(0, yLimit)),
      };
      const left = !onLeftNow; // ends up in the left gutter?
      setLeftGutter(left);
      fitBubble(x, left);
      nearRef.current = { id: "idle", lines: p.current.idleLines ?? [] };
    };

    const idleTick = () => {
      if (!idle.current) return;
      wanderSpot();
      idleTimer = setTimeout(idleTick, idleWanderMs);
    };
    const enterIdle = () => {
      if (idle.current || !idleOn || !p.current.idleLines?.length) return;
      idle.current = true;
      p.current.onIdle?.();
      wanderSpot();
      idleTimer = setTimeout(idleTick, idleWanderMs);
    };
    const exitIdle = () => {
      if (!idle.current) return;
      idle.current = false;
      computeTarget(); // straight back to his scroll anchor
    };
    // any interaction wakes him and restarts the stillness countdown
    const activity = () => {
      clearTimeout(idleTimer);
      exitIdle();
      idleTimer = setTimeout(enterIdle, idleAfterMs);
    };

    let raf = 0;
    let wasWalking = false;
    let shownStop: string | null = null; // stop whose line the bubble shows
    let last = performance.now();
    let lastRetarget = 0;

    const loop = (now: number) => {
      const c = cur.current;
      // Seconds since the previous frame, floored at 20fps: coming back to a
      // backgrounded tab hands us one enormous gap, and without the clamp he
      // would teleport across the screen on the first frame back.
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;

      // being dragged: he goes exactly where the pointer puts him, and his
      // target follows so he doesn't snap back the instant he's released
      if (dragging.current) {
        target.current.x = c.x;
        target.current.y = c.y;
        if (wrapRef.current) {
          wrapRef.current.style.transform = `translate(${c.x}px, calc(-50% + ${c.y}px))`;
        }
        raf = requestAnimationFrame(loop);
        return;
      }

      // re-measure a few times a second: reveal animations and layout
      // shifts move the anchors without firing a scroll event. Skipped while
      // he's been dropped somewhere, so he stays put until the next scroll.
      if (now - lastRetarget > retargetMs) {
        lastRetarget = now;
        if (!idle.current && !dropped.current) computeTarget();
      }

      // Ease toward the target, then cap the result — so he sets off at a
      // steady walk and slows down as he arrives, at the same pace on any
      // refresh rate. Velocities are px/s; multiplying by dt gives the step.
      const ease = 1 - Math.exp(-easeRate * dt);
      const dx = target.current.x - c.x;
      let vx = (dx * ease) / dt;
      if (vx > speed) vx = speed;
      if (vx < -speed) vx = -speed;
      if (Math.abs(dx) > 0.4) c.x += vx * dt;
      // vertical follow is a touch quicker: he lags behind fast scrolls and
      // catches up, like he's actually running after his anchor
      let vy = ((target.current.y - c.y) * ease) / dt;
      if (vy > speedY) vy = speedY;
      if (vy < -speedY) vy = -speedY;
      c.y += vy * dt;

      // lean into the stride, straighten out when idle
      const leanTarget = Math.max(-leanMax, Math.min(leanMax, (vx / speed) * leanMax * 1.42));
      c.lean += (leanTarget - c.lean) * (1 - Math.exp(-(easeRate * 1.21) * dt));
      if (Math.abs(vx) > walkThreshold * 1.33) c.facing = vx > 0 ? 1 : -1;

      const isWalking = Math.abs(vx) > walkThreshold;
      isWalkingRef.current = isWalking;
      if (isWalking !== wasWalking) {
        wasWalking = isWalking;
        setWalking(isWalking);
        if (isWalking) {
          // he sets off — put the bubble away until he arrives. A held pose
          // unfolds on the way out; cutting the class here is what used to
          // make him teleport back into a paperclip.
          hushNow();
          if (shownStop) p.current.onLeave?.(shownStop);
          shownStop = null;
        }
      }
      // speak whenever he's standing at a stop he hasn't announced yet —
      // this also covers two same-side stops, where there's no walk at all
      if (!isWalking && shownStop !== nearRef.current.id) {
        const s = nearRef.current;
        shownStop = s.id;
        p.current.onArrive?.(s.id);
        if (s.lines.length > 0) {
          // random line, but never the same one twice running — with this
          // many per stop an immediate repeat is the only ordering that
          // reads as a bug. Or in order, when asked.
          const prev = lineIdx.current[s.id];
          let i: number;
          if (p.current.random) {
            i = Math.floor(Math.random() * s.lines.length);
            if (s.lines.length > 1 && i === prev) i = (i + 1) % s.lines.length;
          } else {
            i = prev === undefined ? 0 : (prev + 1) % s.lines.length;
          }
          lineIdx.current[s.id] = i;
          const [text, acts] = s.lines[i];
          sayNow(text, acts);
        }
      }

      if (wrapRef.current) {
        wrapRef.current.style.transform = `translate(${c.x}px, calc(-50% + ${c.y}px))`;
      }
      if (palRef.current) {
        // rotate first (screen space) so the lean isn't mirrored by the flip
        palRef.current.style.transform = `rotate(${c.lean}deg) scaleX(${c.facing})`;
      }
      raf = requestAnimationFrame(loop);
    };

    computeTarget();
    cur.current.x = target.current.x;
    cur.current.y = target.current.y;
    raf = requestAnimationFrame(loop);

    const onScroll = () => {
      activity();
      dropped.current = false; // scrolling sends him back to his post
      computeTarget();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", computeTarget);
    window.addEventListener("mousemove", activity, { passive: true });
    window.addEventListener("keydown", activity);
    window.addEventListener("pointerdown", activity, { passive: true });
    window.addEventListener("touchstart", activity, { passive: true });
    window.addEventListener("wheel", activity, { passive: true });
    idleTimer = setTimeout(enterIdle, idleAfterMs); // start the countdown

    return () => {
      cancelAnimationFrame(raf);
      const t = timers.current;
      clearTimeout(t.type);
      clearTimeout(idleTimer);
      clearTimeout(t.emote);
      clearTimeout(t.emoteEnd);
      mq.removeEventListener("change", onMq);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", computeTarget);
      window.removeEventListener("mousemove", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("touchstart", activity);
      window.removeEventListener("wheel", activity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    minViewport,
    contentWidth,
    contentVar,
    minWidth,
    maxWidth,
    gap,
    edge,
    side,
    offsetY,
    yLimitPad,
    speed,
    speedY,
    easeRate,
    leanMax,
    walkThreshold,
    retargetMs,
    idleOn,
    idleAfterMs,
    idleWanderMs,
  ]);

  // Drag handlers live outside the animation effect because they only touch
  // refs the loop already reads. Pointer capture means a fast drag can't
  // outrun the element and drop him mid-flight.
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    grab.current = {
      x: e.clientX - cur.current.x,
      y: e.clientY - (window.innerHeight / 2 + cur.current.y),
    };
    dragging.current = true;
    dropped.current = true;
    setGrabbed(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    cur.current.x = e.clientX - grab.current.x;
    cur.current.y = e.clientY - grab.current.y - window.innerHeight / 2;
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragging.current = false;
    setGrabbed(false);
  };

  const bubbleSide = leftGutter ? "left" : "right";
  const vars = palVars(colors, motion) as CSSProperties;

  return (
    <div
      ref={wrapRef}
      className={`clip-pal-scroll${className ? ` ${className}` : ""}`}
      data-on={wide && roomy ? "" : undefined}
      style={{ ...vars, transform: "translate(40px, -50%)", zIndex, ...style }}
      aria-hidden
    >
      <div className="clip-pal-anchor">
        {/* above his head, growing toward the screen edge — it stays in the
            gutter, so it can never cover text. types on arrival (key
            remount), then holds the line until he walks off */}
        {speak && (
          <div
            className="clip-pal-bubble-wrap"
            style={leftGutter ? { right: 0 } : { left: 0 }}
          >
            <div key={arrivalId}>
              <Bubble
                side={bubbleSide}
                hidden={!bubbleOn}
                typing={typing}
                line={line}
                box={bubSize}
                contentRef={contentRef}
                contentStyle={{
                  maxWidth: bubbleW,
                  // never narrower than the pal — keeps the tail well inside
                  // the bubble even with just the typing dots
                  minWidth: palW + 8,
                }}
                tailInset={Math.max(10, palW / 2 - 7)}
              />
            </div>
          </div>
        )}
        {/* the only interactive part — the wrapper stays click-through so he
            never steals a click from the page behind him */}
        <div
          ref={palRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`clip-pal-grab${grabbed ? " is-grabbed" : ""}`}
          style={draggable ? undefined : { cursor: "default" }}
        >
          <div className={walking ? "pal-walk" : "pal-idle"}>
            <PalSvg
              width={palW}
              walking={walking}
              emote={emote?.name ?? null}
              emoteOut={emote?.out ?? false}
              shape={shape}
              strokeWidth={strokeWidth}
              eyes={eyes}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default ScrollPal;
