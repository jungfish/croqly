import { useMemo } from "react";
import { PLATING_REACTIONS, type PlatingReactionSummary } from "@/services/platingChallengeService";

// Caps how many pieces a single reaction type spawns — with a very lively
// bande leaving dozens of the same reaction, animating literally all of
// them would stutter the browser; 8 is already a proper flood.
const MAX_PIECES_PER_TYPE = 8;

// Replays every reaction left on a dressage as a burst of floating emoji —
// see the plating-reaction-float keyframe in index.css. Meant to be
// remounted (via a changing `key` prop from the caller) each time it should
// play again: once when the card first scrolls into view, and again right
// after the caller adds their own reaction, so "everyone's reactions play
// when you see the card" actually feels true every time, not just once.
const ReactionBurst = ({ reactions }: { reactions: PlatingReactionSummary[] }) => {
  const pieces = useMemo(() => {
    const items: { key: string; emoji: string }[] = [];
    for (const reaction of reactions) {
      const emoji = PLATING_REACTIONS.find((r) => r.type === reaction.type)?.emoji ?? "✨";
      for (let i = 0; i < Math.min(reaction.count, MAX_PIECES_PER_TYPE); i++) {
        items.push({ key: `${reaction.type}-${i}`, emoji });
      }
    }
    return items.map((item, index) => {
      // Mostly a normal size range, but roughly one in six pieces goes
      // jumbo — a bit of size chaos reads as livelier than a uniform burst.
      const isJumbo = Math.random() < 0.16;
      return {
        ...item,
        left: `${10 + Math.random() * 80}%`,
        drift: `${(Math.random() - 0.5) * 70}px`,
        wobble: `${-14 + Math.random() * 28}deg`,
        size: isJumbo ? `${4 + Math.random() * 1.5}rem` : `${1.8 + Math.random() * 1.2}rem`,
        duration: `${1.5 + Math.random() * 0.7}s`,
        delay: `${index * 0.06}s`,
      };
    });
  }, [reactions]);

  if (pieces.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.key}
          className="plating-reaction-piece"
          style={
            {
              "--reaction-left": piece.left,
              "--reaction-drift": piece.drift,
              "--reaction-wobble": piece.wobble,
              "--reaction-size": piece.size,
              "--reaction-duration": piece.duration,
              "--reaction-delay": piece.delay,
            } as React.CSSProperties
          }
        >
          {piece.emoji}
        </span>
      ))}
    </div>
  );
};

export default ReactionBurst;
