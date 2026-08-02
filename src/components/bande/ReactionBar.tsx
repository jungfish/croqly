import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Smile } from "lucide-react";
import { toggleReaction, REACTION_EMOJIS, type HouseholdRecipe, type ReactionSummary } from "@/services/householdService";

// Slack-style reactions on a bande's shared recipes: existing reaction pills
// (highlighted if the caller already picked that emoji) plus a "+" opening
// the curated picker. Rendered outside the recipe card's <Link> so tapping a
// pill/emoji never triggers navigation.
const ReactionBar = ({
  householdId,
  savedRecipeId,
  reactions,
}: {
  householdId: string;
  savedRecipeId: string;
  reactions: ReactionSummary[];
}) => {
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handlePick = async (emoji: string) => {
    setPickerOpen(false);
    setPending(true);
    try {
      const updated = await toggleReaction(householdId, savedRecipeId, emoji);
      queryClient.setQueryData<HouseholdRecipe[]>(["recipes", "household", householdId], (current) =>
        current?.map((r) => (r.savedRecipeId === savedRecipeId ? { ...r, reactions: updated } : r))
      );
    } catch {
      toast.error("Impossible d'enregistrer ta réaction. Réessaie dans un instant.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => handlePick(r.emoji)}
          disabled={pending}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
            r.reactedByMe
              ? "bg-primary/10 border-primary/40 text-primary"
              : "bg-card border-border text-foreground hover:bg-muted"
          }`}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
      <div className="relative">
        <button
          onClick={() => setPickerOpen((prev) => !prev)}
          disabled={pending}
          aria-label="Ajouter une réaction"
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>
        {pickerOpen && (
          <div className="absolute z-10 bottom-full left-0 mb-1 flex gap-0.5 p-1.5 rounded-full bg-popover border border-border shadow-lg">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handlePick(emoji)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted text-base"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReactionBar;
