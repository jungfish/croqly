import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Instagram } from 'lucide-react';
import type { Recipe, Creator } from '@/types/recipe';
import RecipePreview from '@/components/RecipePreview';
import ShareButton from '@/components/ShareButton';

interface CreatorHubResponse {
  creator: Creator;
  recipes: Recipe[];
}

const CreatorHubPage = () => {
  const { handle } = useParams<{ handle: string }>();

  const { data, isLoading, isError } = useQuery<CreatorHubResponse>({
    queryKey: ['creator', handle],
    queryFn: async () => {
      const response = await fetch(`/api/creators/${handle}`);
      if (!response.ok) throw new Error('Failed to fetch creator');
      return response.json();
    },
    enabled: Boolean(handle),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Chargement de la page…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-muted-foreground">
        <p>Ce créateur n'a pas encore de page chez nous.</p>
        <Link to="/" className="text-primary underline underline-offset-4">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const { creator, recipes } = data;
  const displayName = creator.displayName || `@${creator.instagramHandle}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 pt-28">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-4 mb-8">
          {creator.avatarUrl && (
            <img
              src={creator.avatarUrl}
              alt={displayName}
              className="w-24 h-24 rounded-full object-cover shadow-lg border border-border"
            />
          )}
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground mb-2">
              Toutes les recettes de {displayName}
            </h1>
            <p className="text-muted-foreground">
              On a croqué {recipes.length} recette{recipes.length > 1 ? 's' : ''} du compte{' '}
              <a
                href={`https://www.instagram.com/${creator.instagramHandle}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground hover:underline"
              >
                <Instagram className="w-4 h-4" />@{creator.instagramHandle}
              </a>
              , prêtes à cuisiner.
            </p>
          </div>
          <ShareButton title={`Recettes de ${displayName}`} text={`Toutes les recettes de ${displayName} sur Croqly`} />
        </div>

        {/* Claim banner — real OAuth claim flow is a later pass, this just
            opens the door so a creator who lands here isn't left with only
            a takedown request as their option (see the de-risking plan). */}
        <div className="mb-8 p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border shadow-lg text-center">
          <p className="text-foreground">
            C'est toi, {displayName} ? 👋 Cette page est faite pour toi — viens la faire tienne.
          </p>
          <a
            href={`mailto:hello@croqly.app?subject=${encodeURIComponent(`Je gère ma page — @${creator.instagramHandle}`)}`}
            className="inline-block mt-2 text-sm font-medium text-primary underline underline-offset-4"
          >
            Je gère ma page
          </a>
        </div>

        {/* Recipe grid */}
        {recipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recipes.map((recipe) => (
              <RecipePreview key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            Pas encore de recette croquée pour ce compte.
          </p>
        )}
      </div>
    </div>
  );
};

export default CreatorHubPage;
