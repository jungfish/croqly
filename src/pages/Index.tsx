import URLInput from "@/components/URLInput";
import RecipePreview from "@/components/RecipePreview";
import HowItWorks from "@/components/home/HowItWorks";
import Features from "@/components/home/Features";
import Faq from "@/components/home/Faq";
import type { Recipe } from "@/types/recipe";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const Index = () => {
  const { data: recentRecipes = [] } = useQuery<Recipe[]>({
    queryKey: ['recipes', 'recent'],
    queryFn: async () => {
      const res = await fetch('/api/db');
      if (!res.ok) throw new Error('Failed to fetch recipes');
      const all: Recipe[] = await res.json();
      return all.slice(0, 4);
    },
  });

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section — pt clears the fixed header, which has no backdrop
          on this route and would otherwise sit on top of the logo/title. */}
      <div className="flex items-center justify-center px-4 pb-4 pt-24 sm:pt-4 min-h-[70vh]">
        <URLInput />
      </div>

      {/* Recent Recipes Section */}
      {recentRecipes.length > 0 && (
        <div className="container mx-auto px-4 pb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-semibold text-foreground mb-2">Fraîchement croquées</h2>
            <p className="text-muted-foreground">Les derniers reels transformés en recettes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentRecipes.map((recipe) => (
              <RecipePreview key={recipe.id} recipe={recipe} />
            ))}
          </div>

          <div className="text-center mt-8">
            {/* This feed is everyone's recent recipes, not the visitor's own —
                so "more of this" points to the public /decouvrir catalog,
                not the auth-gated /recipes, which would bounce anonymous
                visitors to login. */}
            <Link
              to="/decouvrir"
              className="inline-block px-6 py-3 bg-card rounded-xl shadow-md hover:shadow-lg transition-all text-foreground font-medium"
            >
              Découvrir toutes les recettes
            </Link>
          </div>
        </div>
      )}

      <div className="bg-card/40">
        <HowItWorks />
      </div>
      <Features />
      <div className="bg-card/40">
        <Faq />
      </div>
    </main>
  );
};

export default Index;
