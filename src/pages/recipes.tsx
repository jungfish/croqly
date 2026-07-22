import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import ParallaxHero from "@/components/ParallaxHero";
import { UtensilsCrossed, Search, Check } from "lucide-react";
import type { Recipe } from "@/types/recipe";
import { authFetch } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addRecipesToShoppingList } from "@/services/shoppingListService";
import { useAuth } from "@/hooks/use-auth";
import { getFirstName } from "@/lib/getFirstName";

const categoryColors = {
  "Dessert": "bg-pink-100",
  "Soupe": "bg-amber-100",
  "Plat principal": "bg-emerald-100",
  "Entrée": "bg-blue-100",
  "Bébé": "bg-purple-100",
} as const;

const categories = ["Toutes", "Dessert", "Soupe", "Plat principal", "Entrée", "Bébé"] as const;

const RecipesPage = () => {
  const { user } = useAuth();
  const firstName = getFirstName(user);
  const [selectedCategory, setSelectedCategory] = useState<string>("Toutes");
  const [search, setSearch] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addingToList, setAddingToList] = useState(false);

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

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelectedToShoppingList = async () => {
    setAddingToList(true);
    try {
      await addRecipesToShoppingList(Array.from(selectedIds));
      toast.success('Ingrédients ajoutés à ta liste de courses.');
      setSelectMode(false);
      setSelectedIds(new Set());
    } catch {
      toast.error("Impossible d'ajouter ces ingrédients. Réessaie dans un instant.");
    } finally {
      setAddingToList(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ParallaxHero
        imageUrl="https://images.unsplash.com/photo-1495521821757-a1efb6729352"
        title="Mes Recettes"
        height="h-[200px] sm:h-[240px] lg:h-[300px]"
      />

      <div className="container mx-auto p-8 -mt-8 relative z-10">
        <p className="text-center text-muted-foreground mb-8">
          {firstName ? `Prête à cuisiner, ${firstName} ?` : 'Prête à cuisiner ?'} Voici toutes tes recettes croquées.
        </p>

        {/* Search */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher une recette…"
              className="pl-9 bg-card"
            />
          </div>
          {recipes.length > 0 && (
            <Button variant="outline" className="bg-card shrink-0" onClick={toggleSelectMode}>
              {selectMode ? 'Annuler' : 'Sélectionner'}
            </Button>
          )}
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
              onClick={(e) => {
                if (!selectMode || !recipe.id) return;
                e.preventDefault();
                toggleSelected(recipe.id);
              }}
              className="group relative block overflow-hidden rounded-xl bg-card/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-border"
            >
              {selectMode && (
                <div
                  className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    recipe.id && selectedIds.has(recipe.id)
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-white/80 border-white'
                  }`}
                >
                  {recipe.id && selectedIds.has(recipe.id) && <Check className="w-4 h-4" />}
                </div>
              )}
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

      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-background/95 backdrop-blur-sm border-t border-border flex justify-center">
          <Button onClick={handleAddSelectedToShoppingList} disabled={addingToList} className="gap-2">
            {addingToList
              ? `Ajout de ${selectedIds.size} recette(s)…`
              : `Ajouter ${selectedIds.size} recette(s) à la liste`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default RecipesPage;
