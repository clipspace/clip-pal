import {
  type CSSProperties,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Bubble } from "./Bubble";
import { useGaze } from "./gaze";
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
} from "./types";

// The standing pal, for phones and narrower desktops where the walking guide
// never runs — or for anywhere you just want him around. Every so often a
// bubble appears over his head, he says one line and acts it out, and it
// goes away again. He only talks while he is actually on screen.

export type PalCompanionHandle = {
  /** interrupt and say this, optionally acting it out */
  say: (text: string, emote?: PalEmote | null) => void;
  /** play a gesture or fold into a pose without saying anything */
  emote: (name: PalEmote) => void;
  /** put the bubble away and unfold any held pose */
  hush: () => void;
};

export type PalCompanionProps = {
  /** what he says — a line and the emote that goes with it */
  lines: readonly PalLine[];
  /** rendered width in px (default 90) */
  width?: number;
  /** rendered height — set it to squash or stretch him */
  height?: number;
  /** how long a bubble stays up, ms (default 10 000) */
  showMs?: number;
  /** silence between bubbles, ms (default 20 000) */
  gapMs?: number;
  /** beat after he scrolls into view before the first line, ms (default 1 500) */
  firstMs?: number;
  /** typing dots before the line lands, ms (default 850) */
  typingMs?: number;
  /** beat between the bubble and the trick, ms (default 500) */
  emoteDelayMs?: number;
  /** widest the bubble grows (default "15rem") */
  bubbleMaxWidth?: number | string;
  /** pick lines at random (default) or in order */
  random?: boolean;
  /** show the bubble at all (default true) */
  speak?: boolean;
  /** act lines out (default true); or a whitelist of the emotes he may use */
  emotes?: boolean | readonly PalEmote[];
  /** react to `data-pal-say` elements under the pointer (default true) */
  hover?: boolean;
  /** minimum gap between two hover lines, ms (default 1 200) */
  hoverCooldownMs?: number;
  /** look at the text field being typed into (default true) */
  watch?: boolean;
  /** something to say when a text field gets focus (one at random, once per focus) */
  watchLines?: readonly PalLine[];
  /** the gentle up-and-down float (default true) */
  float?: boolean;
  /** the idle sway (default true) */
  sway?: boolean;
  /** only talk while at least this much of him is on screen (default 0.4) */
  visibleThreshold?: number;

  /** a preset name or your own wire */
  shape?: PalShapeName | PalShape;
  /** wire thickness in viewBox units (default 5) */
  strokeWidth?: number;
  /** "dots" (default) or "none" */
  eyes?: "dots" | "none";
  /** colours as props — the same --pal-* variables, set inline */
  colors?: PalColors;
  /** tempo, stride, sway, blink, float — the same --pal-* variables, set inline */
  motion?: PalMotion;

  onSpeak?: (text: string, emote: PalEmote | null) => void;

  className?: string;
  style?: CSSProperties;
};

const PalCompanion = forwardRef<PalCompanionHandle, PalCompanionProps>(
  function PalCompanion(
    {
      lines,
      width = 90,
      height,
      showMs = 10_000,
      gapMs = 20_000,
      firstMs = 1_500,
      typingMs = 850,
      emoteDelayMs = 500,
      bubbleMaxWidth = "15rem",
      random = true,
      speak = true,
      emotes = true,
      hover = true,
      hoverCooldownMs = 1200,
      watch = true,
      watchLines,
      float = true,
      sway = true,
      visibleThreshold = 0.4,
      shape,
      strokeWidth,
      eyes,
      colors,
      motion,
      onSpeak,
      className,
      style,
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [line, setLine] = useState<string>(lines[0]?.[0] ?? "");
    const [shown, setShown] = useState(false);
    const [typing, setTyping] = useState(true);
    const [emote, setEmote] = useState<{ name: PalEmote; out: boolean } | null>(
      null,
    );
    const pose = useRef<PalEmote | null>(null);
    // remounts the bubble so its entrance animation replays each time
    const [turn, setTurn] = useState(0);
    const lastLine = useRef(-1);
    const onScreen = useRef(false);

    const p = useRef({
      lines,
      random,
      speak,
      emotes,
      typingMs,
      emoteDelayMs,
      tempo: motion?.tempo ?? 1,
      onSpeak,
      showMs,
      gapMs,
    });
    p.current = {
      lines,
      random,
      speak,
      emotes,
      typingMs,
      emoteDelayMs,
      tempo: motion?.tempo ?? 1,
      onSpeak,
      showMs,
      gapMs,
    };

    // Two handles rather than a list: the typing timer and the phase timer
    // are the only two that can ever be pending at once, and reusing the
    // slots keeps the cycle from accumulating handles as it runs.
    const timers = useRef<{
      type?: ReturnType<typeof setTimeout>;
      phase?: ReturnType<typeof setTimeout>;
      emote?: ReturnType<typeof setTimeout>;
      emoteEnd?: ReturnType<typeof setTimeout>;
    }>({});
    const reduced = useRef(false);

    const allowed = (name: PalEmote | null): PalEmote | null => {
      const e = p.current.emotes;
      if (!name || e === false) return null;
      if (e === true) return name;
      return e.includes(name) ? name : null;
    };

    const unfold = () => {
      const t = timers.current;
      if (pose.current) {
        setEmote({ name: pose.current, out: true });
        pose.current = null;
        t.emoteEnd = setTimeout(() => setEmote(null), PAL_POSE_OUT_MS);
      } else {
        setEmote(null);
      }
    };

    // Say a line now: bubble types, the text lands, then the trick. Under
    // reduced motion the line just appears and he stays still.
    const sayNow = (text: string, acts: PalEmote | null) => {
      const t = timers.current;
      clearTimeout(t.type);
      clearTimeout(t.emote);
      clearTimeout(t.emoteEnd);
      if (p.current.speak) {
        setLine(text);
        setTyping(!reduced.current);
        setTurn((n) => n + 1);
        setShown(true);
        if (!reduced.current) {
          t.type = setTimeout(() => setTyping(false), p.current.typingMs);
        }
      }
      p.current.onSpeak?.(text, acts);
      const name = reduced.current ? null : allowed(acts);
      const begin = () => {
        if (!name) return;
        setEmote({ name, out: false });
        if (isPose(name)) {
          // a pose stays until the bubble goes away again
          pose.current = name;
        } else {
          t.emoteEnd = setTimeout(() => setEmote(null), gestureMs(name, p.current.tempo));
        }
      };
      if (pose.current) {
        unfold();
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
      setShown(false);
      unfold();
    };

    // the regular cycle: a line, a pause, the next line — restarted after an
    // interruption (hover, say()) so the gap is measured from that instead
    const schedule = (delay: number) => {
      const t = timers.current;
      clearTimeout(t.phase);
      t.phase = setTimeout(cycle, delay);
    };
    const cycle = () => {
      if (!onScreen.current) return;
      const all = p.current.lines;
      if (all.length === 0) return;
      let i: number;
      if (p.current.random) {
        i = Math.floor(Math.random() * all.length);
        if (all.length > 1 && i === lastLine.current) i = (i + 1) % all.length;
      } else {
        i = (lastLine.current + 1) % all.length;
      }
      lastLine.current = i;
      const [text, acts] = all[i];
      sayNow(text, acts);
      const t = timers.current;
      clearTimeout(t.phase);
      t.phase = setTimeout(() => {
        // he comes out of the shape as the bubble goes, never by cutting to
        // a paperclip
        hushNow();
        schedule(p.current.gapMs);
      }, p.current.showMs);
    };
    const interrupt = (text: string, acts: PalEmote | null) => {
      sayNow(text, acts);
      const t = timers.current;
      clearTimeout(t.phase);
      t.phase = setTimeout(() => {
        hushNow();
        schedule(p.current.gapMs);
      }, p.current.showMs);
    };

    useImperativeHandle(ref, () => ({
      say: (text, e = null) => interrupt(text, e),
      emote: (name) => {
        const t = timers.current;
        clearTimeout(t.emote);
        clearTimeout(t.emoteEnd);
        const n = allowed(name);
        if (!n) return;
        const go = () => {
          setEmote({ name: n, out: false });
          if (isPose(n)) pose.current = n;
          else t.emoteEnd = setTimeout(() => setEmote(null), gestureMs(n, p.current.tempo));
        };
        if (pose.current) {
          unfold();
          t.emote = setTimeout(go, PAL_POSE_OUT_MS);
        } else {
          setEmote(null);
          requestAnimationFrame(go);
        }
      },
      hush: () => {
        hushNow();
        schedule(p.current.gapMs);
      },
    }));

    const watchRef = useRef(watchLines);
    watchRef.current = watchLines;
    useGaze(
      rootRef,
      watch,
      () => 1,
      () => {
        const lines = watchRef.current;
        if (!lines?.length || !onScreen.current) return;
        const [text, acts] = lines[Math.floor(Math.random() * lines.length)];
        interrupt(text, acts);
      },
    );

    useHoverSay(hover, hoverCooldownMs, ({ text, emote: e }) => {
      if (!onScreen.current) return;
      interrupt(text, e);
    });

    useEffect(() => {
      const el = rootRef.current;
      if (!el) return;
      // The dots are the only motion here; without them the line just appears.
      reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // He only talks while he's actually on screen — otherwise the cycle
      // burns through lines in a part of the page nobody is looking at.
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            if (onScreen.current) return;
            onScreen.current = true;
            schedule(firstMs);
          } else {
            onScreen.current = false;
            clearTimeout(timers.current.phase);
            hushNow();
          }
        },
        { threshold: visibleThreshold },
      );
      observer.observe(el);

      return () => {
        observer.disconnect();
        onScreen.current = false;
        const t = timers.current;
        clearTimeout(t.phase);
        clearTimeout(t.type);
        clearTimeout(t.emote);
        clearTimeout(t.emoteEnd);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firstMs, visibleThreshold]);

    const vars = palVars(colors, motion) as CSSProperties;

    return (
      <div
        ref={rootRef}
        className={`clip-pal-companion${className ? ` ${className}` : ""}`}
        style={{ ...vars, ...style }}
      >
        {/* Absolutely positioned so the layout never shifts when he starts or
            stops talking. */}
        {speak && (
          <div className="clip-pal-companion-bubble">
            <div key={turn}>
              <Bubble
                side="center"
                hidden={!shown}
                typing={typing}
                line={line}
                contentStyle={{ maxWidth: bubbleMaxWidth }}
              />
            </div>
          </div>
        )}

        <div className={float ? "pal-float" : undefined}>
          <div className={sway ? "pal-idle" : undefined}>
            <PalSvg
              width={width}
              height={height}
              emote={emote?.name ?? null}
              emoteOut={emote?.out ?? false}
              shape={shape}
              strokeWidth={strokeWidth}
              eyes={eyes}
            />
          </div>
        </div>
      </div>
    );
  },
);

export default PalCompanion;
