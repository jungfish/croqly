import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ParallaxHero from "@/components/ParallaxHero";
import RecipePreview from "@/components/RecipePreview";
import { UtensilsCrossed, Search } from "lucide-react";
import type { Recipe } from "@/types/recipe";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { getFirstName } from "@/lib/getFirstName";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const categories = ["Toutes", "Dessert", "Soupe", "Plat principal", "Entrée", "Bébé"] as const;

// The public counterpart to /recipes ("Mes Recettes") — every recipe ever
// croquée by anyone, browsable with no account. Gives a visitor who lands
// without a specific Instagram link in hand (SEO, social, word of mouth) a
// reason to explore instead of bouncing off an empty paste box.
const DecouvrirPage = () => {
  const { user } = useAuth();
  const firstName = getFirstName(user);
  const [selectedCategory, setSelectedCategory] = useState<string>("Toutes");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const hasActiveFilter = selectedCategory !== "Toutes" || debouncedSearch.trim().length > 0;

  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ['recipes', 'all', debouncedSearch, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (selectedCategory !== "Toutes") params.set('category', selectedCategory);
      const res = await fetch(`/api/db?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch recipes');
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <ParallaxHero
        imageUrl="https://images.unsplash.com/photo-1495521821757-a1efb6729352"
        title="Découvrir"
        height="h-[200px] sm:h-[240px] lg:h-[300px]"
      />

      <div className="container mx-auto p-8 -mt-8 relative z-10">
        <p className="text-center text-muted-foreground mb-8">
          {firstName ? `Salut ${firstName} ! Voici` : 'Voici'} toutes les recettes croquées par la communauté.
        </p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher une recette…"
            className="pl-9 bg-card"
          />
        </div>

        {/* Category Filter — horizontal scroll on mobile, wraps on larger screens */}
        <div className="mb-8 flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${selectedCategory === category
                  ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                  : 'bg-card text-muted-foreground hover:bg-muted'}`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Recipes Grid — same card component as the home page's "Fraîchement
            croquées" feed, so the hover treatment (zoom + gradient overlay)
            is identical between the two. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {recipes.map((recipe) => (
            <RecipePreview key={recipe.id} recipe={recipe} />
          ))}
        </div>

        {recipes.length === 0 && !hasActiveFilter && (
          <div className="flex flex-col items-center gap-4 text-center py-16 text-muted-foreground">
            <UtensilsCrossed className="w-10 h-10" />
            <p>Aucune recette n'a encore été croquée.</p>
            <Link
              to="/"
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg hover:bg-primary/90 transition-colors"
            >
              Colle le premier lien Instagram
            </Link>
          </div>
        )}

        {recipes.length === 0 && hasActiveFilter && (
          <div className="text-center py-12 text-muted-foreground">
            Rien ne correspond à cette recherche — essaie une autre catégorie ou un autre mot-clé.
          </div>
        )}
      </div>
    </div>
  );
};

export default DecouvrirPage;
