import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Recipe } from '@/types/recipe';
import { UtensilsCrossed, ListOrdered, Clock, Instagram, Bookmark, BookmarkCheck, ImageIcon, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import ParallaxHero from '@/components/ParallaxHero';
import { Button } from '@/components/ui/button';
import ShareButton from '@/components/ShareButton';
import { useAuth } from '@/hooks/use-auth';
import { authFetch } from '@/lib/apiClient';
import { generateIllustrationForRecipe } from '@/services/recipeService';
import { addRecipeToShoppingList } from '@/services/shoppingListService';
import { emojiForIngredient } from '@/lib/ingredientEmoji';
import { getFirstName } from '@/lib/getFirstName';

const RecipePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const firstName = getFirstName(user);
  const queryClient = useQueryClient();
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [saved, setSaved] = useState(false);
  const [addingToList, setAddingToList] = useState(false);

  const { data: recipe, isLoading: loading, isError } = useQuery<Recipe>({
    // A recipe just created via processRecipeFromUrl is pre-populated under
    // this same key (see URLInput.tsx), so this page never refetches it.
    queryKey: ['recipe', id],
    queryFn: async () => {
      // authFetch (not plain fetch) so a logged-in visitor's token reaches
      // the backend — that's what lets it report savedByMe accurately below.
      const response = await authFetch(`/api/db/${id}`);
      if (!response.ok) throw new Error('Failed to fetch recipe');
      return response.json();
    },
    enabled: Boolean(id),
  });
  const error = isError ? 'Failed to fetch recipe' : null;

  // Reflect the real "already saved" state once it's known, instead of
  // always defaulting to false — otherwise a returning visitor (or one who
  // just signed up via the pending-save flow) sees an inaccurate button.
  useEffect(() => {
    if (recipe?.savedByMe) setSaved(true);
  }, [recipe?.savedByMe]);

  // A freshly-imported recipe arrives with its illustration still pending
  // (see server/routes/recipes.ts) — fetch the real one in the background
  // and swap it in once it's ready, instead of blocking the import on it.
  useEffect(() => {
    if (!recipe?.id || !recipe.illustrationPending) return;
    let cancelled = false;

    generateIllustrationForRecipe(recipe.id).then((illustration) => {
      if (cancelled) return;
      queryClient.setQueryData<Recipe>(['recipe', recipe.id], (current) =>
        current && { ...current, illustration: illustration ?? current.illustration, illustrationPending: false }
      );
    });

    return () => {
      cancelled = true;
    };
  }, [recipe?.id, recipe?.illustrationPending, queryClient]);

  // Function to adjust ingredient quantities
  const adjustIngredient = (ingredient: string, multiplier: number) => {
    const regex = /^(\d+(?:[,.]\d+)?)\s*(.+)$/;
    const match = ingredient.match(regex);
    
    if (match) {
      const [_, quantity, rest] = match;
      const adjustedQuantity = parseFloat(quantity.replace(',', '.')) * multiplier;
      return `${adjustedQuantity.toFixed(1).replace('.0', '')} ${rest}`;
    }
    return ingredient;
  };

  // Add this function to safely get servings
  const getServings = () => {
    if (!recipe) return 4;
    const servings = Number(recipe.servings);
    return isNaN(servings) ? 4 : servings;
  };

  const handleSave = async () => {
    if (!recipe) return;
    if (!user) {
      // Anonymous "Save" click: route through auth, carrying the pending
      // recipe id so it's saved automatically once signed in (never make
      // the visitor redo the action that triggered signup).
      navigate('/login', {
        state: { from: location.pathname, pendingSaveRecipeIds: [recipe.id] },
      });
      return;
    }
    try {
      const response = await authFetch(`/api/recipes/${recipe.id}/save`, { method: 'POST' });
      if (!response.ok) throw new Error('save failed');
      setSaved(true);
      toast.success('Ajoutée à tes recettes.');
    } catch {
      toast.error("Impossible d'ajouter cette recette. Réessaie dans un instant.");
    }
  };

  const handleAddToShoppingList = async () => {
    if (!recipe) return;
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setAddingToList(true);
    try {
      await addRecipeToShoppingList(recipe.id!);
      toast.success('Ingrédients ajoutés à ta liste de courses.');
    } catch {
      toast.error("Impossible d'ajouter ces ingrédients. Réessaie dans un instant.");
    } finally {
      setAddingToList(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Chargement de la recette…
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Impossible de charger cette recette. Réessaie dans un instant.
      </div>
    );
  }
  if (!recipe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-muted-foreground">
        <p>Cette recette n'existe pas ou plus.</p>
        <Link to="/recipes" className="text-primary underline underline-offset-4">
          Retour aux recettes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      {recipe.illustration ? (
        <ParallaxHero imageUrl={recipe.illustration} title={recipe.title}>
          {recipe.illustrationPending && (
            <div className="mt-3 flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-sm px-4 py-1.5 text-sm text-white">
              <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
              Génération de l'illustration…
            </div>
          )}
        </ParallaxHero>
      ) : recipe.illustrationPending ? (
        <div className="w-full h-[220px] sm:h-[280px] lg:h-[360px] mb-16 flex flex-col items-center justify-center gap-3 bg-muted text-muted-foreground">
          <ImageIcon className="w-8 h-8 animate-pulse" />
          <span className="flex items-center gap-2 text-sm">
            <div className="w-3.5 h-3.5 border-2 border-muted-foreground/40 border-t-transparent rounded-full animate-spin" />
            Génération de l'illustration…
          </span>
        </div>
      ) : null}

      {/* Main content */}
      <div className="container mx-auto p-4">
        <p className="text-center text-muted-foreground mb-4">
          {firstName ? `${firstName}, on la cuisine ensemble ?` : 'On la cuisine ensemble ?'}
        </p>

        <div className="sticky top-16 z-30 flex justify-end gap-2 mb-4 py-2 -mx-4 px-4 bg-background/80 backdrop-blur-sm">
          <ShareButton title={recipe.title} text={`La recette "${recipe.title}" sur Croqly`} />
          <Button size="sm" variant="outline" onClick={handleAddToShoppingList} disabled={addingToList} className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            {addingToList ? 'Ajout…' : 'Ajouter à la liste de courses'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saved} className="gap-2">
            {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {saved ? 'Dans mes recettes' : 'Ajouter à mes recettes'}
          </Button>
        </div>

        {recipe.creator && (
          <Link
            to={`/createurs/${recipe.creator.instagramHandle}`}
            className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-card/70 backdrop-blur-sm border border-border shadow-lg w-fit hover:bg-card/90 transition-colors"
          >
            {recipe.creator.avatarUrl && (
              <img
                src={recipe.creator.avatarUrl}
                alt={recipe.creator.displayName || recipe.creator.instagramHandle}
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <span className="text-sm text-foreground">
              Recette de @{recipe.creator.instagramHandle}
            </span>
          </Link>
        )}

        <div className={`flex flex-col gap-6 ${recipe.videoUrl ? 'lg:grid lg:grid-cols-3' : ''}`}>
          {/* Video column — full width and first on mobile; becomes a sticky
              sidebar only at lg: and up, where there's room for it beside
              the content instead of squeezing a 3-column layout on a phone. */}
          {recipe.videoUrl && (
            <div className="order-first lg:order-last lg:col-span-1">
              <div className="lg:sticky lg:top-24">
                <div className="aspect-[9/16] w-full max-w-xs mx-auto max-h-[70vh] bg-card/70 backdrop-blur-sm rounded-xl shadow-lg border border-border p-3 mb-4">
                  <video
                    controls
                    className="w-full h-full rounded-lg"
                    src={recipe.videoUrl}
                    playsInline
                  />
                </div>

                {recipe.url && (
                  <a
                    href={recipe.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full max-w-xs mx-auto flex items-center gap-2 p-3 bg-card/70 backdrop-blur-sm rounded-xl shadow-lg border border-border text-foreground hover:bg-card/90 transition-colors"
                  >
                    <Instagram className="w-5 h-5 text-foreground" />
                    <span>Revoir le reel original</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Left/Main column */}
          <div className={recipe.videoUrl ? 'lg:col-span-2' : ''}>
            {/* Serving size adjuster */}
            <div className="mb-4 p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border shadow-lg">
              <div className={`flex items-center gap-4 ${!recipe.videoUrl ? 'justify-center' : ''}`}>
                <span className="text-foreground">On cuisine pour combien ?</span>
                <button
                  className="w-11 h-11 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/70"
                  onClick={() => setServingMultiplier(prev => Math.max(0.5, prev - 0.5))}
                  aria-label="Réduire le nombre de portions"
                >
                  -
                </button>
                <span className="w-12 text-center">
                  {Math.round(getServings() * servingMultiplier)}
                </span>
                <button
                  className="w-11 h-11 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/70"
                  onClick={() => setServingMultiplier(prev => prev + 0.5)}
                  aria-label="Augmenter le nombre de portions"
                >
                  +
                </button>
              </div>
            </div>

            {/* Timing information - only show if we have any timing data */}
            {(recipe.prepTime || recipe.cookTime || recipe.totalTime) && (
              <div className="mb-4 p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border shadow-lg">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {recipe.prepTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Préparation</div>
                        <div className="font-medium">{recipe.prepTime}</div>
                      </div>
                    </div>
                  )}
                  {recipe.cookTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Cuisson</div>
                        <div className="font-medium">{recipe.cookTime}</div>
                      </div>
                    </div>
                  )}
                  {recipe.totalTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Temps total</div>
                        <div className="font-medium">{recipe.totalTime}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ingredients section with adjusted quantities */}
            <div className="mb-8 p-6 rounded-xl bg-card/70 backdrop-blur-sm border border-border shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <UtensilsCrossed className="w-6 h-6 text-foreground" />
                <h2 className="text-xl font-display font-semibold text-foreground">Ce qu'il te faut</h2>
              </div>
              <ul className="list-none space-y-2 text-muted-foreground">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span aria-hidden="true">{emojiForIngredient(ingredient)}</span>
                    {adjustIngredient(ingredient, servingMultiplier)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-8 p-6 rounded-xl bg-card/70 backdrop-blur-sm border border-border shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <ListOrdered className="w-6 h-6 text-foreground" />
                <h2 className="text-xl font-display font-semibold text-foreground">Comment tu fais</h2>
              </div>
              <ol className="list-decimal pl-5 space-y-3 text-muted-foreground">
                {recipe.instructions.map((step, index) => (
                  <li key={index} className="leading-relaxed">{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipePage; 