import { useState } from "react";
import { toast } from "sonner";
import {
  PLATING_REACTIONS,
  togglePlatingReaction,
  type PlatingReactionSummary,
  type PlatingReactionType,
} from "@/services/platingChallengeService";

// All 7 curated reactions shown as compact emoji pills — unlike the bande
// recipe feed's ReactionBar (which hides unpicked emoji behind a "+"
// picker), the whole set is small enough to show at once, and showing it
// always is the point: it invites everyone to drop one, not just the first
// person to open the picker.
const PlatingReactionBar = ({
  submissionId,
  reactions,
  onChange,
}: {
  submissionId: string;
  reactions: PlatingReactionSummary[];
  onChange: (reactions: PlatingReactionSummary[]) => void;
}) => {
  const [pending, setPending] = useState<PlatingReactionType | null>(null);

  const handlePick = async (type: PlatingReactionType) => {
    if (pending) return;
    setPending(type);
    try {
      onChange(await togglePlatingReaction(submissionId, type));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer ta réaction.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PLATING_REACTIONS.map(({ type, emoji, label }) => {
        const entry = reactions.find((r) => r.type === type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => handlePick(type)}
            disabled={pending === type}
            title={label}
            aria-label={label}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-transform active:scale-90 disabled:opacity-50 ${
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
