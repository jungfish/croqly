import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, UtensilsCrossed, Share2, Zap } from "lucide-react";
import RecipeImage from "@/components/RecipeImage";
import { Button } from "@/components/ui/button";
import GridCardSkeleton from "@/components/GridCardSkeleton";
import BandeSwitcher from "@/components/bande/BandeSwitcher";
import HouseholdPanel from "@/components/bande/HouseholdPanel";
import CreateOrJoinPanel from "@/components/bande/CreateOrJoinPanel";
import ReactionBar from "@/components/bande/ReactionBar";
import {
  fetchMyHouseholds,
  fetchHouseholdRecipes,
  joinHousehold,
  type Household,
  type HouseholdRecipe,
} from "@/services/householdService";
import { createChallenge } from "@/services/platingChallengeService";
import { useAuth } from "@/hooks/use-auth";
import { getFirstName } from "@/lib/getFirstName";
import { memberLabel, isRecentlySaved, handleInviteClick } from "@/lib/bandeUtils";

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

const BandePage = () => {
  const { user } = useAuth();
  const firstName = getFirstName(user);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  // Joining via an invite link shared from HouseholdPanel's "Inviter" sheet
  // (/bande?join=CODE) — see shareInviteLink in householdService.ts.
  const joinCodeFromLink = searchParams.get("join")?.toUpperCase();
  const idFromUrl = searchParams.get("id");

  const [selectedId, setSelectedId] = useState<string | null>(idFromUrl);
  // Auto-joins instead of just prefilling a field: leaving it as a manual
  // step meant people landing on this page via the link would see "Créer
  // une bande" sitting right next to it and tap that instead, ending up
  // with a brand new bande rather than the one they were invited to.
  const [joiningViaLink, setJoiningViaLink] = useState(Boolean(joinCodeFromLink));
  const linkJoinAttempted = useRef(false);

  const { data: households, isLoading: householdsLoading } = useQuery<Household[]>({
    queryKey: ["households"],
    queryFn: fetchMyHouseholds,
  });

  const refreshHouseholds = () => queryClient.invalidateQueries({ queryKey: ["households"] });

  const selectHousehold = (id: string) => {
    setSelectedId(id);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("id", id);
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    if (householdsLoading || !joinCodeFromLink || linkJoinAttempted.current) return;
    linkJoinAttempted.current = true;
    joinHousehold(joinCodeFromLink)
      .then((household) => {
        toast.success("Tu as rejoint la bande !");
        setSelectedId(household.id);
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete("join");
            next.set("id", household.id);
            return next;
          },
          { replace: true }
        );
        refreshHouseholds();
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Impossible de rejoindre cette bande.");
      })
      .finally(() => setJoiningViaLink(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdsLoading, joinCodeFromLink]);

  // Keeps selectedId valid once households load/change: defaults to the
  // first bande, and falls back to another one if the selected bande was
  // just left (or never existed, e.g. a stale ?id= from an old bookmark).
  useEffect(() => {
    if (!households || joiningViaLink) return;
    if (selectedId && households.some((h) => h.id === selectedId)) return;
    setSelectedId(households[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [households, joiningViaLink]);

  const selected = households?.find((h) => h.id === selectedId) ?? null;

  const {
    data: recipes = [],
    isPending: recipesLoading,
    isError: isRecipesError,
  } = useQuery<HouseholdRecipe[]>({
    queryKey: ["recipes", "household", selectedId],
    queryFn: () => fetchHouseholdRecipes(selectedId!),
    enabled: Boolean(selectedId),
  });

  const showLoading = householdsLoading || joiningViaLink;
  const showEmptyState = !showLoading && (!households || households.length === 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8 pt-28">
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-2">Mes Bandes</h1>
            <p className="text-muted-foreground">
              {firstName ? `Salut ${firstName}, ` : ""}
              voici les recettes croquées par tes bandes.
            </p>
          </div>
        </div>

        {showLoading && (
          <div className="text-center text-muted-foreground py-12">
            {householdsLoading ? "Chargement…" : "Connexion à ta bande…"}
          </div>
        )}

        {showEmptyState && (
          <CreateOrJoinPanel
            onDone={(household) => {
              refreshHouseholds();
              setSelectedId(household.id);
            }}
            initialCode={joinCodeFromLink}
          />
        )}

        {!showLoading && households && households.length > 0 && (
          <>
            <BandeSwitcher
              households={households}
              selectedId={selectedId}
              onSelect={selectHousehold}
              onAdded={(household) => {
                refreshHouseholds();
                selectHousehold(household.id);
              }}
            />

            {selected && (
              <>
                <HouseholdPanel household={selected} onLeft={refreshHouseholds} onRenamed={refreshHouseholds} />

                {recipesLoading && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <GridCardSkeleton key={i} imageHeight="h-48" />
                    ))}
                  </div>
                )}

                {!recipesLoading && isRecipesError && (
                  <div className="text-center text-muted-foreground py-8">
                    Impossible de charger les recettes de la bande. Réessaie dans un instant.
                  </div>
                )}

                {!recipesLoading && !isRecipesError && recipes.length === 0 && (
                  <div className="flex flex-col items-center gap-4 text-center py-16 text-muted-foreground">
                    <UtensilsCrossed className="w-10 h-10" />
                    <p>Personne n'a encore ajouté de recette dans cette bande.</p>
                    {/* Growth loop trigger: same nudge as HouseholdPanel's
                        "Inviter" button, surfaced again where the emptiness
                        is most visible — the recipe grid itself. */}
                    {selected.members.length === 1 && (
                      <Button onClick={() => handleInviteClick(selected.inviteCode, selected.name)} className="gap-2">
                        <Share2 className="w-4 h-4" />
                        Inviter du monde
                      </Button>
                    )}
                  </div>
                )}

                {!recipesLoading && recipes.length > 0 && (
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
                            <span className="text-xs text-muted-foreground">
                              Ajouté par {memberLabel(recipe.savedByEmail, recipe.savedByUserId === user?.id)}
                            </span>
                          </div>
                        </Link>
                        <div className="px-4 pb-4 bg-card/50 backdrop-blur-sm flex items-center justify-between gap-2 flex-wrap mt-auto">
                          <ReactionBar householdId={selected.id} savedRecipeId={recipe.savedRecipeId} reactions={recipe.reactions} />
                          <DefyButton householdId={selected.id} recipe={recipe} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BandePage;
