import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  PLATING_REACTIONS,
  sendPlatingReaction,
  type PlatingReactionSummary,
  type PlatingReactionType,
} from "@/services/platingChallengeService";

// How many little emoji fly up per tap — a single one felt stingy; a small
// cluster reads as a proper "burst" even from one click, Google Meet-style.
const PIECES_PER_CLICK = 4;
const PIECE_LIFETIME_MS = 1600;

type FlyingPiece = { id: number; emoji: string; left: string; drift: string; wobble: string; size: string; delay: string };

// All 7 curated reactions shown as compact emoji pills. Unlike a typical
// "reaction toggle", tapping never removes anything and never locks the
// button while a request is in flight — every tap immediately fires its own
// mini flying-emoji burst and optimistically bumps the count, Google
// Meet-style: mash the same button and it just keeps piling up.
const PlatingReactionBar = ({
  submissionId,
  reactions,
  onChange,
}: {
  submissionId: string;
  reactions: PlatingReactionSummary[];
  onChange: (reactions: PlatingReactionSummary[]) => void;
}) => {
  const [pieces, setPieces] = useState<FlyingPiece[]>([]);
  const nextPieceId = useRef(0);

  const handlePick = (type: PlatingReactionType, emoji: string) => {
    const newPieces: FlyingPiece[] = Array.from({ length: PIECES_PER_CLICK }, () => {
      const id = nextPieceId.current++;
      const isJumbo = Math.random() < 0.25;
      return {
        id,
        emoji,
        left: `${15 + Math.random() * 70}%`,
        drift: `${(Math.random() - 0.5) * 60}px`,
        wobble: `${-14 + Math.random() * 28}deg`,
        size: isJumbo ? `${3 + Math.random() * 1.2}rem` : `${1.5 + Math.random() * 0.8}rem`,
        delay: `${Math.random() * 0.15}s`,
      };
    });
    setPieces((prev) => [...prev, ...newPieces]);
    const ids = new Set(newPieces.map((p) => p.id));
    setTimeout(() => setPieces((prev) => prev.filter((p) => !ids.has(p.id))), PIECE_LIFETIME_MS);

    const existing = reactions.find((r) => r.type === type);
    onChange(
      existing
        ? reactions.map((r) => (r.type === type ? { ...r, count: r.count + 1, reactedByMe: true } : r))
        : [...reactions, { type, count: 1, reactedByMe: true }]
    );

    // Fire-and-forget: don't await or disable the button on this — the whole
    // point is that spamming the same reaction keeps landing immediately.
    sendPlatingReaction(submissionId, type).catch(() => {
      toast.error("Impossible d'enregistrer ta réaction.");
    });
  };

  return (
    <div className="relative flex items-center gap-1 flex-wrap">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {pieces.map((piece) => (
          <span
            key={piece.id}
            className="plating-reaction-piece"
            style={
              {
                "--reaction-left": piece.left,
                "--reaction-drift": piece.drift,
                "--reaction-wobble": piece.wobble,
                "--reaction-size": piece.size,
                "--reaction-duration": "1.4s",
                "--reaction-delay": piece.delay,
              } as React.CSSProperties
            }
          >
            {piece.emoji}
          </span>
        ))}
      </div>
      {PLATING_REACTIONS.map(({ type, emoji, label }) => {
        const entry = reactions.find((r) => r.type === type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => handlePick(type, emoji)}
            title={label}
            aria-label={label}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-transform active:scale-90 ${
              entry?.reactedByMe ? "bg-primary/10 border-primary/50" : "bg-card border-border hover:bg-muted"
            }`}
          >
            <span className="text-sm leading-none">{emoji}</span>
            {Boolean(entry?.count) && <span className="text-[10px] text-muted-foreground">{entry!.count}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default PlatingReactionBar;
