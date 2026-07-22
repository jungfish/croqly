import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Instagram } from 'lucide-react';
import type { Recipe, Creator } from '@/types/recipe';
import RecipePreview from '@/components/RecipePreview';
import ShareButton from '@/components/ShareButton';
import { useAuth } from '@/hooks/use-auth';
import { authFetch } from '@/lib/apiClient';

interface CreatorHubResponse {
  creator: Creator;
  recipes: Recipe[];
}

// Handles the three states of the claim flow: not logged in, logged in with
// no pending request yet, and logged in with a code waiting to be posted in
// the Instagram bio. The mailto stays as a low-friction fallback for anyone
// who can't easily edit their bio.
const ClaimBanner = ({ creator }: { creator: Creator }) => {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestMutation = useMutation({
    mutationFn: async () => {
      const response = await authFetch(`/api/creators/${creator.instagramHandle}/claim/request`, { method: 'POST' });
      if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error ?? 'Échec de la demande');
      return response.json() as Promise<{ code: string }>;
    },
    onSuccess: (data) => {
      setCode(data.code);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await authFetch(`/api/creators/${creator.instagramHandle}/claim/verify`, { method: 'POST' });
      if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error ?? 'Échec de la vérification');
      return response.json() as Promise<{ claimed: boolean }>;
    },
    onError: (err: Error) => setError(err.message),
  });

  if (creator.claimed) {
    return (
      <div className="mb-8 p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border shadow-lg text-center">
        <p className="text-foreground font-medium">✅ Compte revendiqué</p>
      </div>
    );
  }

  if (verifyMutation.isSuccess) {
    return (
      <div className="mb-8 p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border shadow-lg text-center">
        <p className="text-foreground font-medium">🎉 Ta page est bien revendiquée !</p>
      </div>
    );
  }

  return (
    <div className="mb-8 p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border shadow-lg text-center">
      <p className="text-foreground">
        C'est toi, {creator.displayName || `@${creator.instagramHandle}`} ? 👋 Cette page est faite pour toi — viens la faire tienne.
      </p>

      {!user && (
        <Link to="/login" className="inline-block mt-2 text-sm font-medium text-primary underline underline-offset-4">
          Je gère ce compte
        </Link>
      )}

      {user && !code && (
        <button
          type="button"
          onClick={() => requestMutation.mutate()}
          disabled={requestMutation.isPending}
          className="inline-block mt-2 text-sm font-medium text-primary underline underline-offset-4 disabled:opacity-50"
        >
          {requestMutation.isPending ? 'Génération du code…' : 'Je gère ce compte'}
        </button>
      )}

      {user && code && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Colle ce code dans ta bio Instagram, puis clique sur "Vérifier" :
          </p>
          <code className="px-3 py-1 rounded-md bg-muted text-foreground font-mono text-sm">{code}</code>
          <button
            type="button"
            onClick={() => verifyMutation.mutate()}
            disabled={verifyMutation.isPending}
            className="text-sm font-medium text-primary underline underline-offset-4 disabled:opacity-50"
          >
            {verifyMutation.isPending ? 'Vérification…' : "J'ai mis à jour ma bio, vérifier"}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <a
        href={`mailto:hello@croqly.app?subject=${encodeURIComponent(`Je gère ma page — @${creator.instagramHandle}`)}`}
        className="block mt-3 text-xs text-muted-foreground underline underline-offset-4"
      >
        Un souci ? Contacte-nous directement
      </a>
    </div>
  );
};

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

        <ClaimBanner creator={creator} />

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
