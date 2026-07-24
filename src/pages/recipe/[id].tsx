import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Recipe, Creator } from '@/types/recipe';
import { UtensilsCrossed, ListOrdered, Clock, Instagram, Music2, Bookmark, BookmarkCheck, ImageIcon, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import ParallaxHero from '@/components/ParallaxHero';
import InstagramEmbed from '@/components/InstagramEmbed';
import RecipePreview from '@/components/RecipePreview';
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

  // Internal linking for SEO and discovery: recipes in the same category
  // (shares the ['recipes', 'all'] cache key with /decouvrir, so visiting
  // one after the other doesn't refetch), plus the rest of this creator's
  // catalogue when the recipe has one.
  const { data: allRecipes = [] } = useQuery<Recipe[]>({
    queryKey: ['recipes', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/db');
      if (!res.ok) throw new Error('Failed to fetch recipes');
      return res.json();
    },
    enabled: Boolean(recipe),
  });
  const relatedRecipes = allRecipes
    .filter((r) => r.id !== recipe?.id && r.category === recipe?.category)
    .slice(0, 4);

  const creatorPlatform = recipe?.creator?.platform;
  const creatorHandle = recipe?.creator?.handle;
  const { data: creatorHub } = useQuery<{ creator: Creator; recipes: Recipe[] }>({
    queryKey: ['creator', creatorPlatform, creatorHandle],
    queryFn: async () => {
      const res = await fetch(`/api/creators/${creatorPlatform}/${creatorHandle}`);
      if (!res.ok) throw new Error('Failed to fetch creator');
      return res.json();
    },
    enabled: Boolean(creatorPlatform && creatorHandle),
  });
  const creatorRecipes = (creatorHub?.recipes ?? []).filter((r) => r.id !== recipe?.id).slice(0, 4);

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

    generateIllustrationForRecipe(recipe.id).then((result) => {
      if (cancelled) return;
      queryClient.setQueryData<Recipe>(['recipe', recipe.id], (current) =>
        current && {
          ...current,
          illustration: result?.illustration ?? current.illustration,
          illustrationThumb: result?.illustrationThumb ?? current.illustrationThumb,
          illustrationPending: false,
        }
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

  // Falls back to recipe.platform (always set for an imported recipe) since
  // recipe.creator can be null even for a valid Instagram/TikTok recipe —
  // e.g. when the scraper didn't return an owner username.
  const sourcePlatform = recipe.creator?.platform ?? recipe.platform;
  const SourceIcon = sourcePlatform === 'tiktok' ? Music2 : Instagram;

  const creatorAndReelLinks = (recipe.creator || recipe.url) && (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {recipe.creator && (
        <Link
          to={`/createurs/${recipe.creator.platform}/${recipe.creator.handle}`}
          className="flex items-center gap-2 p-3 rounded-xl bg-card/70 backdrop-blur-sm border border-border shadow-lg hover:bg-card/90 transition-colors"
        >
          {recipe.creator.avatarUrl && (
            <img
              src={recipe.creator.avatarUrl}
              alt={recipe.creator.displayName || recipe.creator.handle}
              loading="lazy"
              decoding="async"
              className="w-8 h-8 rounded-full object-cover"
            />
          )}
          <span className="text-sm text-foreground">
            Recette de @{recipe.creator.handle}
          </span>
        </Link>
      )}
      {recipe.url && (
        <a
          href={recipe.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-3 rounded-xl bg-card/70 backdrop-blur-sm border border-border shadow-lg text-foreground hover:bg-card/90 transition-colors"
        >
          <SourceIcon className="w-5 h-5" />
          <span className="text-sm">
            {sourcePlatform === 'tiktok' ? 'Revoir la vidéo TikTok originale' : 'Revoir le reel original'}
          </span>
        </a>
      )}
    </div>
  );

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

      {/* Main content — when neither hero branch above rendered (no
          illustration, none pending), nothing pushes content below the
          fixed header, so it would otherwise sit right under it. */}
      <div className={`container mx-auto px-4 pb-4 ${recipe.illustration || recipe.illustrationPending ? 'pt-4' : 'pt-24'}`}>
        <p className="text-center text-muted-foreground mb-4">
          {firstName ? `${firstName}, on la cuisine ensemble ?` : 'On la cuisine ensemble ?'}
        </p>

        <div className="sticky top-16 z-30 flex flex-nowrap items-center justify-end gap-2 mb-4 py-2 -mx-4 px-4 bg-background/80 backdrop-blur-sm overflow-x-auto">
          <ShareButton title={recipe.title} text={`La recette "${recipe.title}" sur Croqly`} className="shrink-0" />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddToShoppingList}
            disabled={addingToList}
            aria-label="Ajouter à la liste de courses"
            className="gap-2 shrink-0"
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            {/* Both labels are always laid out (stacked in the same grid
                cell) so the button's width is fixed to the widest one and
                never shrinks/grows when the label swaps on click — that
                shift was pushing the other buttons in this row around. */}
            <span className="hidden sm:grid">
              <span className={`col-start-1 row-start-1 ${addingToList ? 'invisible' : ''}`}>Ajouter à la liste de courses</span>
              <span className={`col-start-1 row-start-1 ${addingToList ? '' : 'invisible'}`}>Ajout…</span>
            </span>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saved}
            aria-label={saved ? 'Dans mes recettes' : 'Ajouter à mes recettes'}
            className="gap-2 shrink-0"
          >
            {saved ? <BookmarkCheck className="w-4 h-4 shrink-0" /> : <Bookmark className="w-4 h-4 shrink-0" />}
            <span className="hidden sm:grid">
              <span className={`col-start-1 row-start-1 ${saved ? 'invisible' : ''}`}>Ajouter à mes recettes</span>
              <span className={`col-start-1 row-start-1 ${saved ? '' : 'invisible'}`}>Dans mes recettes</span>
            </span>
          </Button>
        </div>

        {/* Creator credit and "see the original reel" live together — they're
            both just "where this recipe came from". Rendered right under the
            video when there is one (mobile and desktop alike); otherwise
            shown up here since there's no video to anchor them to. */}
        {!recipe.videoUrl && creatorAndReelLinks}

        <div className={`flex flex-col gap-6 ${recipe.videoUrl ? 'lg:grid lg:grid-cols-3' : ''}`}>
          {/* Video column — full width and first on mobile; becomes a sticky
              sidebar only at lg: and up, where there's room for it beside
              the content instead of squeezing a 3-column layout on a phone. */}
          {recipe.videoUrl && (
            <div className="order-first lg:order-last lg:col-span-1">
              <div className="lg:sticky lg:top-24">
                {sourcePlatform === 'instagram' && recipe.url ? (
                  // Instagram's official embed widget — see InstagramEmbed for
                  // why this replaces playing our own downloaded copy of the Reel.
                  // Framed to match the card treatment used everywhere else on
                  // this page (the video box included) instead of dropping
                  // Instagram's default white embed straight onto the page.
                  // Cropped via instagram-embed-crop (see index.css) — only
                  // the likes count / comment row is hidden; the header and
                  // action icons stay so this is still visibly a real
                  // Instagram embed. Uncropped, the box was internally
                  // scrollable. The gradient overlay fades whatever sliver
                  // is left uncropped into the card background rather than
                  // ending on a hard, awkward-looking cut. Since the embed's
                  // own header/footer already show the creator and link
                  // back to the reel, creatorAndReelLinks below is skipped
                  // here — it'd just repeat what's already on screen.
                  // max-w-sm, not max-w-xs: Instagram's embed.js enforces its
                  // own 326px min-width on the widget regardless of the
                  // container. At max-w-xs (320px minus this padding), the
                  // widget was wider than its box and overflow: hidden clipped
                  // the right edge instead of just the bottom.
                  <div className="instagram-embed-crop relative w-full max-w-sm mx-auto bg-card/70 backdrop-blur-sm rounded-xl shadow-lg border border-border p-3 pb-6 mb-4">
                    <InstagramEmbed url={recipe.url} />
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent rounded-b-xl pointer-events-none" />
                  </div>
                ) : (
                  <div className="aspect-[9/16] w-full max-w-xs mx-auto max-h-[70vh] bg-card/70 backdrop-blur-sm rounded-xl shadow-lg border border-border p-3 mb-4">
                    <video
                      controls
                      className="w-full h-full rounded-lg"
                      src={recipe.videoUrl}
                      playsInline
                    />
                  </div>
                )}
                {!(sourcePlatform === 'instagram' && recipe.url) && (
                  <div className="max-w-xs">{creatorAndReelLinks}</div>
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

        {/* SEO content + internal mesh: a single ingredients/steps card gives
            search engines and readers almost nothing to link through to —
            this adds real text about the recipe plus a way back to the home
            import flow and onward to related/same-creator recipes. */}
        <div className="mt-4 p-6 rounded-xl bg-card/70 backdrop-blur-sm border border-border shadow-lg">
          <h2 className="text-xl font-display font-semibold text-foreground mb-3">
            À propos de "{recipe.title}"
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Cette recette de {recipe.category.toLowerCase()}
            {recipe.creator && (
              <>
                {' '}vient du compte {recipe.creator.platform === 'tiktok' ? 'TikTok' : 'Instagram'}{' '}
                <Link
                  to={`/createurs/${recipe.creator.platform}/${recipe.creator.handle}`}
                  className="text-primary underline underline-offset-4"
                >
                  @{recipe.creator.handle}
                </Link>
              </>
            )}
            {recipe.totalTime && ` et se prépare en ${recipe.totalTime}`}, pour {getServings()} personne{getServings() > 1 ? 's' : ''}.
            {' '}Ajuste les portions ci-dessus, ajoute les ingrédients à ta liste de courses en un clic, et retrouve-la à tout moment dans « Mes recettes ».
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg hover:bg-primary/90 transition-colors"
          >
            Colle un lien Instagram pour croquer une nouvelle recette
          </Link>
        </div>

        {relatedRecipes.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">
              D'autres recettes qui pourraient te plaire
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedRecipes.map((r) => (
                <RecipePreview key={r.id} recipe={r} />
              ))}
            </div>
          </div>
        )}

        {recipe.creator && creatorRecipes.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-xl font-display font-semibold text-foreground">
                D'autres recettes de @{recipe.creator.handle}
              </h2>
              <Link
                to={`/createurs/${recipe.creator.platform}/${recipe.creator.handle}`}
                className="text-sm text-primary hover:underline underline-offset-4 shrink-0"
              >
                Voir tout
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {creatorRecipes.map((r) => (
                <RecipePreview key={r.id} recipe={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipePage;