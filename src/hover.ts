import { useEffect, useRef } from "react";
import { PAL_EMOTES, type PalEmote } from "./types";

// Hover comments. Any element on the page can carry
//   data-pal-say="what he says"  data-pal-emote="nod"
// and when the pointer lands on it he says that line. The listener is one
// `pointerover` on the document, so the page can add and remove such
// elements freely. A cooldown keeps a busy mouse from making him stutter,
// and the same element doesn't re-trigger until the pointer has left it.
export const HOVER_ATTR = "data-pal-say";
export const HOVER_EMOTE_ATTR = "data-pal-emote";

export type HoverLine = { text: string; emote: PalEmote | null; el: Element };

export function useHoverSay(
  enabled: boolean,
  cooldownMs: number,
  onSay: (line: HoverLine) => void,
) {
  const cb = useRef(onSay);
  cb.current = onSay;
  useEffect(() => {
    if (!enabled) return;
    let last = 0;
    let lastEl: Element | null = null;
    const over = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const el = t.closest(`[${HOVER_ATTR}]`);
      if (!el) {
        lastEl = null;
        return;
      }
      if (el === lastEl) return;
      const now = performance.now();
      if (now - last < cooldownMs) return;
      const text = el.getAttribute(HOVER_ATTR);
      if (!text) return;
      last = now;
      lastEl = el;
      const raw = el.getAttribute(HOVER_EMOTE_ATTR);
      const emote =
        raw && (PAL_EMOTES as readonly string[]).includes(raw)
          ? (raw as PalEmote)
          : null;
      cb.current({ text, emote, el });
    };
    document.addEventListener("pointerover", over, { passive: true });
    return () => document.removeEventListener("pointerover", over);
  }, [enabled, cooldownMs]);
}
