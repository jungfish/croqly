import { useMemo } from "react";

const COLORS = ["bg-crunch", "bg-basil", "bg-yolk", "bg-primary", "bg-secondary"];
const PIECE_COUNT = 48;

// Hand-rolled confetti burst (no canvas/animation dependency, just a
// handful of absolutely-positioned divs animating via the confetti-fall
// keyframe in index.css) — fired once when a Laser Croq challenge closes
// and reveals its winner. Purely decorative: safe to unmount immediately
// after, so callers just render it conditionally for a few seconds.
const ConfettiBurst = () => {
  // Randomized once per mount, not per render, so the burst doesn't
  // reshuffle mid-animation on an unrelated re-render of the parent card.
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => {
        // Each piece pops outward from a tight origin near center-top (not
        // a random spot across the full width) at its own angle/distance,
        // then keeps drifting the same direction as it falls — that's what
        // reads as a "burst" instead of confetti raining down uniformly.
        const angle = (Math.random() - 0.5) * Math.PI; // ~-90deg..+90deg from straight up
        const burst = 40 + Math.random() * 70;
        return {
          id: i,
          left: `${45 + Math.random() * 10}%`,
          xMid: `${Math.sin(angle) * burst}px`,
          xEnd: `${Math.sin(angle) * burst * (1.8 + Math.random())}px`,
          yPeak: `${-(20 + Math.random() * 50)}px`,
          yEnd: `${180 + Math.random() * 70}px`,
          rotMid: `${(Math.random() - 0.5) * 180}deg`,
          rotEnd: `${360 + Math.random() * 360}deg`,
          duration: `${1.2 + Math.random() * 0.8}s`,
          delay: `${Math.random() * 0.25}s`,
          color: COLORS[i % COLORS.length],
          rounded: i % 2 === 0,
        };
      }),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={`confetti-piece w-3.5 h-3.5 ${piece.color} ${piece.rounded ? "rounded-full" : "rounded-sm"}`}
          style={
            {
              "--confetti-left": piece.left,
              "--confetti-x-mid": piece.xMid,
              "--confetti-x-end": piece.xEnd,
              "--confetti-y-peak": piece.yPeak,
              "--confetti-y-end": piece.yEnd,
              "--confetti-rot-mid": piece.rotMid,
              "--confetti-rot-end": piece.rotEnd,
              "--confetti-duration": piece.duration,
              "--confetti-delay": piece.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default ConfettiBurst;
