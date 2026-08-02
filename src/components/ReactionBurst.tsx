import { useMemo } from "react";
import { PLATING_REACTIONS, type PlatingReactionSummary } from "@/services/platingChallengeService";

// Caps how many pieces a single reaction type spawns — with a lively bande
// leaving 10+ of the same reaction, animating all of them would just be
// visual noise; 3 already reads as "lots of people did this".
const MAX_PIECES_PER_TYPE = 3;

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
    return items.map((item, index) => ({
      ...item,
      left: `${10 + Math.random() * 80}%`,
      drift: `${(Math.random() - 0.5) * 50}px`,
      wobble: `${-12 + Math.random() * 24}deg`,
      size: `${1.4 + Math.random() * 0.7}rem`,
      duration: `${1.4 + Math.random() * 0.6}s`,
      delay: `${index * 0.07}s`,
    }));
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
