import { useMemo } from "react";

const COLORS = ["bg-crunch", "bg-basil", "bg-yolk", "bg-primary", "bg-secondary"];
const PIECE_COUNT = 24;

// Hand-rolled confetti burst (no canvas/animation dependency, just a
// handful of absolutely-positioned divs falling via the confetti-fall
// keyframe in index.css) — fired once when a Laser Croq challenge closes
// and reveals its winner. Purely decorative: safe to unmount immediately
// after, so callers just render it conditionally for a few seconds.
const ConfettiBurst = () => {
  // Randomized once per mount, not per render, so the burst doesn't
  // reshuffle mid-animation on an unrelated re-render of the parent card.
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        drift: `${(Math.random() - 0.5) * 120}px`,
        spin: `${360 + Math.random() * 360}deg`,
        duration: `${1.2 + Math.random() * 0.8}s`,
        delay: `${Math.random() * 0.3}s`,
        color: COLORS[i % COLORS.length],
        rounded: i % 2 === 0,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={`confetti-piece w-2 h-2 ${piece.color} ${piece.rounded ? "rounded-full" : "rounded-sm"}`}
          style={
            {
              "--confetti-left": piece.left,
              "--confetti-drift": piece.drift,
              "--confetti-spin": piece.spin,
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
