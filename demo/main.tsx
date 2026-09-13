import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  isPose,
  PAL_EMOTES,
  PAL_GESTURES,
  PAL_POSE_OUT_MS,
  PAL_SHAPES,
  PalCompanion,
  PalSvg,
  ScrollPal,
  gestureMs,
  type PalEmote,
  type PalLine,
  type PalShapeName,
  type PalStop,
} from "../src";
import "../src/styles.css";

// exposed for the frame-capture harness
(window as unknown as { __PAL_GESTURES: unknown }).__PAL_GESTURES = PAL_GESTURES;

// Demo page. `?emote=kick` plays that emote on the big pal as soon as the
// page loads (and `&loop` keeps replaying it) — used for frame captures.
const LINES: readonly PalLine[] = [
  ["hey — i'm clip pal. one wire, many opinions.", "wave"],
  ["your keys, your lock, your call.", "key"],
  ["wait. did i leave the crypto on?", "exclaim"],
  ["one-legged backflip. don't tell my insurer.", "backflip"],
  ["brr. cold storage.", "shiver"],
  ["...zzz. oh. you're back.", "doze"],
  ["thank you, thank you. no autographs.", "bow"],
];

const STOPS: readonly PalStop[] = [
  { id: "s1", anchor: "a1", place: "beside", lines: [["first stop. i stand beside the heading.", "wave"]] },
  { id: "s2", anchor: "a2", place: "gutter-left", lines: [["left gutter. roomy.", "look"], ["your keys.", "key"]] },
  { id: "s3", anchor: "a3", place: "gutter-right", lines: [["and over here on the right.", "spin"]] },
  { id: "s4", anchor: "a4", place: "beside", lines: [["last one. thanks for scrolling.", "bow"]] },
];

const IDLE: readonly PalLine[] = [["quiet in here.", "doze"], ["still here.", "curl"]];

function Stage() {
  const params = new URLSearchParams(location.search);
  const initial = params.get("emote") as PalEmote | null;
  const loop = params.has("loop");
  const size = Number(params.get("size") ?? 220);
  const [emote, setEmote] = useState<{ name: PalEmote; out: boolean } | null>(
    null,
  );
  const [walking, setWalking] = useState(false);
  const [held, setHeld] = useState<PalEmote | null>(null);
  // the playground: everything a host page can change, live
  const [shape, setShape] = useState<PalShapeName>("gem");
  const [tempo, setTempo] = useState(1);
  const [stroke, setStroke] = useState(5);
  const [wire, setWire] = useState("#d9a441");
  const [face, setFace] = useState("#f2ede0");
  const [eyes, setEyes] = useState<"dots" | "none">("dots");
  const [big, setBig] = useState(size);
  const common = {
    walking,
    emote: emote?.name ?? null,
    emoteOut: emote?.out ?? false,
    shape,
    strokeWidth: stroke,
    eyes,
    colors: { wire, face },
    motion: { tempo },
  };

  // play: for a pose, fold in and hold; a second click unfolds it
  const play = (name: PalEmote) => {
    if (isPose(name)) {
      if (held === name) {
        setEmote({ name, out: true });
        setHeld(null);
        setTimeout(() => setEmote(null), PAL_POSE_OUT_MS);
      } else {
        setEmote({ name, out: false });
        setHeld(name);
      }
      return;
    }
    setHeld(null);
    setEmote(null);
    // force a restart even for the same gesture twice
    requestAnimationFrame(() => {
      setEmote({ name, out: false });
      setTimeout(() => setEmote(null), gestureMs(name, tempo));
    });
  };

  useEffect(() => {
    if (!initial || !PAL_EMOTES.includes(initial)) return;
    const run = () => play(initial);
    const t = setTimeout(run, 300);
    let iv: ReturnType<typeof setInterval> | undefined;
    if (loop && !isPose(initial)) iv = setInterval(run, PAL_GESTURES[initial] + 600);
    return () => {
      clearTimeout(t);
      if (iv) clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="grid">
        {PAL_EMOTES.map((e) => (
          <button key={e} className={held === e ? "on" : ""} onClick={() => play(e)}>
            {e}
            {isPose(e) ? " ·" : ""}
          </button>
        ))}
        <button className={walking ? "on" : ""} onClick={() => setWalking((w) => !w)}>
          walking
        </button>
      </div>
      <p className="muted">
        current: <code>{emote ? `${emote.name}${emote.out ? " (out)" : ""}` : "—"}</code>
        {" · "}poses (·) hold until clicked again
      </p>
      <div className="panel">
        <label>
          shape
          <select value={shape} onChange={(e) => setShape(e.target.value as PalShapeName)}>
            {Object.keys(PAL_SHAPES).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label>
          tempo {tempo.toFixed(2)}×
          <input type="range" min={0.25} max={3} step={0.05} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} />
        </label>
        <label>
          wire {stroke}
          <input type="range" min={2} max={9} step={0.5} value={stroke} onChange={(e) => setStroke(Number(e.target.value))} />
        </label>
        <label>
          size {big}px
          <input type="range" min={40} max={360} step={4} value={big} onChange={(e) => setBig(Number(e.target.value))} />
        </label>
        <label>
          wire colour <input type="color" value={wire} onChange={(e) => setWire(e.target.value)} />
        </label>
        <label>
          face colour <input type="color" value={face} onChange={(e) => setFace(e.target.value)} />
        </label>
        <label>
          eyes
          <select value={eyes} onChange={(e) => setEyes(e.target.value as "dots" | "none")}>
            <option>dots</option>
            <option>none</option>
          </select>
        </label>
      </div>
      <div className="stage">
        <div id="stage-big" className={walking ? "pal-walk" : "pal-idle"}>
          <PalSvg width={big} {...common} />
        </div>
        <div>
          <PalSvg width={88} {...common} />
        </div>
        <div>
          <PalSvg width={46} {...common} />
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <main>
      <section id="s1">
        <h1 id="a1">clip-pal</h1>
        <p>
          A one-legged paperclip. <code>npm i clip-pal</code>. Below: every
          emote on demand; further down, the walking guide and the standing
          companion.
        </p>
        <Stage />
      </section>
      <section id="s2">
        <h2 id="a2">The walking guide</h2>
        <p className="muted">
          On screens at least 1600px wide he walks along the side of the
          page from anchor to anchor. Try scrolling, or leaving the page
          alone for a while.
        </p>
        <p className="muted">
          Anything with <code>data-pal-say</code> makes him comment when you
          hover it:{" "}
          <span className="hoverable" data-pal-say="that's a link. i'd click it." data-pal-emote="nod">
            this
          </span>
          ,{" "}
          <span className="hoverable" data-pal-say="ooh, a card. fancy." data-pal-emote="spin">
            this
          </span>{" "}
          or{" "}
          <span className="hoverable" data-pal-say="careful, that one bites." data-pal-emote="shiver">
            this
          </span>
          .
        </p>
        <div style={{ height: "40vh" }} />
      </section>
      <section id="s3">
        <h2 id="a3">The standing companion</h2>
        <div style={{ display: "flex", gap: "3rem", alignItems: "center", marginTop: "3rem" }}>
          <PalCompanion
            width={90}
            lines={LINES}
            showMs={6000}
            gapMs={4000}
            watchLines={[["i'm not reading. okay, i'm reading a bit.", "look"]]}
          />
          <div className="muted">
            <p>
              He speaks now and then while he is on screen, and acts out what
              he says. And he watches you type:
            </p>
            <input id="demo-input" placeholder="type something…" style={{ width: "16rem" }} />
          </div>
        </div>
        <div style={{ height: "40vh" }} />
      </section>
      <section id="s4">
        <h2 id="a4">That's it</h2>
        <p className="muted">MIT. Made for ClipSpace.</p>
        <div style={{ height: "30vh" }} />
      </section>
      <ScrollPal stops={STOPS} idleLines={IDLE} idleAfterMs={8000} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
