import { useEffect, useRef, type RefObject } from "react";

// He watches what you type. When a text field gets focus, his eyes turn
// toward it — the direction from him to the field, scaled into the little
// room the head loop has — and every keystroke gives them a small nudge, so
// he reads along rather than staring. Focus leaves, eyes come back.
//
// The eyes sit in a <g class="pal-gaze"> whose transform reads the two
// custom properties set here on `root`; nothing else about him changes, so
// this composes with every emote and with the blink.
const MAX_X = 3; // viewBox units the eyes may travel sideways
const MAX_Y = 2.2; // ...and up/down
const NUDGE = 0.7;

const FIELD =
  'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]):not([type=range]):not([type=color]):not([type=file]), textarea, [contenteditable=""], [contenteditable="true"]';

export function isTextField(el: EventTarget | null): el is HTMLElement {
  return el instanceof HTMLElement && el.matches(FIELD);
}

export function useGaze(
  root: RefObject<HTMLElement | null>,
  enabled: boolean,
  /** 1 or -1: the pal is mirrored, so sideways gaze must flip too */
  facing: () => 1 | -1,
  onFocus?: (field: HTMLElement) => void,
  onBlur?: (field: HTMLElement) => void,
) {
  const cb = useRef(onFocus);
  cb.current = onFocus;
  const cbBlur = useRef(onBlur);
  cbBlur.current = onBlur;
  const face = useRef(facing);
  face.current = facing;

  useEffect(() => {
    if (!enabled) return;
    let field: HTMLElement | null = null;
    let raf = 0;
    let nudge = { x: 0, y: 0 };

    const clear = () => {
      const el = root.current;
      if (!el) return;
      el.style.removeProperty("--pal-gaze-x");
      el.style.removeProperty("--pal-gaze-y");
    };

    const aim = () => {
      raf = 0;
      const el = root.current;
      if (!el || !field) return;
      const me = el.getBoundingClientRect();
      const it = field.getBoundingClientRect();
      // from the eyes (upper part of him) to the middle of the field
      const dx = it.left + it.width / 2 - (me.left + me.width / 2);
      const dy = it.top + Math.min(it.height / 2, 40) - (me.top + me.height * 0.2);
      const len = Math.hypot(dx, dy) || 1;
      // full deflection once the field is more than ~300px away
      const k = Math.min(1, len / 300);
      const x = ((dx / len) * MAX_X * k + nudge.x) * face.current();
      const y = (dy / len) * MAX_Y * k + nudge.y;
      el.style.setProperty("--pal-gaze-x", `${x.toFixed(2)}px`);
      el.style.setProperty("--pal-gaze-y", `${y.toFixed(2)}px`);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(aim);
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!isTextField(e.target)) return;
      field = e.target;
      nudge = { x: 0, y: 0 };
      schedule();
      cb.current?.(field);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!field || e.target !== field) return;
      const was = field;
      field = null;
      clear();
      cbBlur.current?.(was);
    };
    // a keystroke: the eyes flick a little, as if following the caret
    const onInput = (e: Event) => {
      if (e.target !== field) return;
      nudge = {
        x: (Math.random() * 2 - 1) * NUDGE,
        y: (Math.random() * 2 - 1) * NUDGE * 0.5,
      };
      schedule();
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("input", onInput, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // a field may already be focused when we mount
    if (isTextField(document.activeElement)) {
      field = document.activeElement;
      schedule();
    }
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("input", onInput);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      clear();
    };
  }, [enabled, root]);
}
