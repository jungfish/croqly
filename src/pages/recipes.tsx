import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ParallaxHero from "@/components/ParallaxHero";
import { UtensilsCrossed, Search } from "lucide-react";
import type { Recipe } from "@/types/recipe";
import { authFetch } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";

const categoryColors = {
  "Dessert": "bg-pink-100",
  "Soupe": "bg-amber-100",
  "Plat principal": "bg-emerald-100",
  "Entrée": "bg-blue-100",
  "Bébé": "bg-purple-100",
} as const;

const categories = ["Toutes", "Dessert", "Soupe", "Plat principal", "Entrée", "Bébé"] as const;

const RecipesPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("Toutes");
  const [search, setSearch] = useState("");

  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ['recipes', 'mine'],
    queryFn: async () => {
      const res = await authFetch('/api/recipes/mine');
      if (!res.ok) throw new Error('Failed to fetch recipes');
      return res.json();
    },
  });

  const filteredRecipes = recipes
    .filter((recipe) => selectedCategory === "Toutes" || recipe.category === selectedCategory)
    .filter((recipe) => recipe.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <ParallaxHero
        imageUrl="https://images.unsplash.com/photo-1495521821757-a1efb6729352"
        title="Mes Recettes"
        height="h-[250px]"
      />

      <div className="container mx-auto p-8 -mt-8 relative z-10">
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

        {/* Recipes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <Link
              key={recipe.id}
              to={`/recipe/${recipe.id}`}
              className="group block overflow-hidden rounded-xl bg-card/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-border"
            >
              <div className="h-48 overflow-hidden">
                {recipe.illustration ? (
                  <img
                    src={recipe.illustration}
                    alt={recipe.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className={`h-full w-full flex items-center justify-center ${categoryColors[recipe.category] || 'bg-muted'}`}>
                    <div className="text-center p-4">
                      <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{recipe.category}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 bg-card/50 backdrop-blur-sm">
                <h2 className="text-xl font-display font-semibold mb-2 text-foreground">{recipe.title}</h2>
                <span className="inline-block px-3 py-1 bg-card/70 backdrop-blur-sm rounded-full text-sm text-foreground shadow-sm">
                  {recipe.category}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {recipes.length === 0 && (
          <div className="flex flex-col items-center gap-4 text-center py-16 text-muted-foreground">
            <UtensilsCrossed className="w-10 h-10" />
            <p>Tu n'as encore sauvegardé aucune recette.</p>
            <Link
              to="/"
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg hover:bg-primary/90 transition-colors"
            >
              Colle ton premier lien Instagram
            </Link>
          </div>
        )}

        {recipes.length > 0 && filteredRecipes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Rien ne correspond à cette recherche — essaie une autre catégorie ou un autre mot-clé.
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipesPage;
