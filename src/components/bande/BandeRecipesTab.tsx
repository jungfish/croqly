import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { UtensilsCrossed, Share2, Zap } from "lucide-react";
import RecipeImage from "@/components/RecipeImage";
import { Button } from "@/components/ui/button";
import GridCardSkeleton from "@/components/GridCardSkeleton";
import ReactionBar from "@/components/bande/ReactionBar";
import { fetchHouseholdRecipes, type Household, type HouseholdRecipe } from "@/services/householdService";
import { createChallenge } from "@/services/platingChallengeService";
import { useAuth } from "@/hooks/use-auth";
import { memberLabel, isRecentlySaved, handleInviteClick } from "@/lib/bandeUtils";
import UserAvatar from "@/components/UserAvatar";

// Quick "défier en dressage" shortcut from a recipe card — skips the
// Laser Croq creation sheet entirely by launching a 3-day challenge
// straight from the recipe the caller is already looking at.
const DefyButton = ({ householdId, recipe }: { householdId: string; recipe: HouseholdRecipe }) => {
  const navigate = useNavigate();
  const [launching, setLaunching] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (launching) return;
    setLaunching(true);
    try {
      const { id } = await createChallenge(householdId, {
        title: `Dressage — ${recipe.title}`,
        savedRecipeId: recipe.savedRecipeId,
        durationDays: 3,
      });
      navigate(`/laser-croq/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de lancer le défi.");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={launching}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
    >
      <Zap className="w-3.5 h-3.5" />
      Défier en dressage
    </button>
  );
};

const BandeRecipesTab = ({ household }: { household: Household }) => {
  const { user } = useAuth();

  const {
    data: recipes = [],
    isPending: recipesLoading,
    isError: isRecipesError,
  } = useQuery<HouseholdRecipe[]>({
    queryKey: ["recipes", "household", household.id],
    queryFn: () => fetchHouseholdRecipes(household.id),
  });

  if (recipesLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <GridCardSkeleton key={i} imageHeight="h-48" />
        ))}
      </div>
    );
  }

  if (isRecipesError) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Impossible de charger les recettes de la bande. Réessaie dans un instant.
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-16 text-muted-foreground">
        <UtensilsCrossed className="w-10 h-10" />
        <p>Personne n'a encore ajouté de recette dans cette bande.</p>
        {/* Growth loop trigger: same nudge as HouseholdPanel's "Inviter"
            button, surfaced again where the emptiness is most visible — the
            recipe grid itself. */}
        {household.members.length === 1 && (
          <Button onClick={() => handleInviteClick(household.inviteCode, household.name)} className="gap-2">
            <Share2 className="w-4 h-4" />
            Inviter du monde
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {recipes.map((recipe) => (
        <div
          key={`${recipe.id}-${recipe.savedByUserId}`}
          className="group relative overflow-hidden rounded-xl bg-card/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-border flex flex-col h-full"
        >
          <Link to={`/recipe/${recipe.id}`} className="block">
            <div className="h-48 overflow-hidden relative">
              <RecipeImage
                recipe={recipe}
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="group-hover:scale-105"
              />
            </div>
            <div className="p-4 pb-3 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {isRecentlySaved(recipe.savedAt) && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-sm">
                    Nouveau
                  </span>
                )}
                <span className="inline-block px-3 py-1 bg-card/70 backdrop-blur-sm rounded-full text-sm text-foreground shadow-sm">
                  {recipe.category}
                </span>
              </div>
              <h2 className="text-xl font-display font-semibold mb-2 text-foreground">{recipe.title}</h2>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserAvatar avatarKey={recipe.savedByAvatarKey} pseudo={recipe.savedByPseudo} className="w-6 h-6" />
                Ajouté par {memberLabel(recipe.savedByPseudo, recipe.savedByEmail, recipe.savedByUserId === user?.id)}
              </span>
            </div>
          </Link>
          <div className="px-4 pb-4 bg-card/50 backdrop-blur-sm flex items-center justify-between gap-2 flex-wrap mt-auto">
            <ReactionBar householdId={household.id} savedRecipeId={recipe.savedRecipeId} reactions={recipe.reactions} />
            <DefyButton householdId={household.id} recipe={recipe} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default BandeRecipesTab;
