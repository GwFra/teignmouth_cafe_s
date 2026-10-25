"use client";

import { useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/utils";

// Milk spiral for the latte art: semicircles that alternate between two
// centres 5 apart, (47.5, 50) below and (52.5, 50) above, so each half turn
// widens by 5 and the whole reads as one smooth spiral. pathLength="1" lets
// the CSS draw it with a 1 → 0 dash offset whatever its real length.
const SPIRAL_PATH = [
  "M53 50",
  "A5.5 5.5 0 0 1 42 50",
  "A10.5 10.5 0 0 1 63 50",
  "A15.5 15.5 0 0 1 32 50",
  "A20.5 20.5 0 0 1 73 50",
  "A25.5 25.5 0 0 1 22 50",
  "A30.5 30.5 0 0 1 83 50",
  // A last 72° to trail off below the spiral.
  "A35.5 35.5 0 0 1 58.5 83.8",
].join(" ");

// A cup of espresso that starts out filling its card, draws its latte art,
// then glides and shrinks into its resting place as a badge (styles
// are the .swirl-* rules in globals.css). It sits in normal flow, so place
// it with layout classes. It plays once on mount, so key the card on what it
// shows to replay it. The card must be the nearest positioned ancestor and
// clip its overflow, as the cup starts out larger than the badge.
export function LatteBadge({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // Before first paint, work out how far the badge is from the card's centre
  // and how much to scale it so the cup fills the card. Uses offset* rather
  // than getBoundingClientRect, which would include the animation's
  // scale(0) starting frame.
  useLayoutEffect(() => {
    const latte = ref.current;
    const card = latte?.offsetParent;
    if (!latte || !card) return;
    const size = latte.offsetWidth;
    const dx = card.clientWidth / 2 - (latte.offsetLeft + size / 2);
    const dy = card.clientHeight / 2 - (latte.offsetTop + size / 2);
    const s = (Math.min(card.clientWidth, card.clientHeight) * 0.62) / size;
    latte.style.setProperty("--dx", `${dx}px`);
    latte.style.setProperty("--dy", `${dy}px`);
    latte.style.setProperty("--s", s.toFixed(2));
  }, []);

  return (
    <div ref={ref} className={cn("swirl-latte", className)} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <circle className="cup" cx="50" cy="50" r="46" />
        <circle className="rim" cx="50" cy="50" r="46" />
        <path className="art" pathLength="1" d={SPIRAL_PATH} />
      </svg>
    </div>
  );
}
