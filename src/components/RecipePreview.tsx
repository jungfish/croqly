import { Recipe } from "@/types/recipe";
import { Clock, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";

const categoryColors = {
  "Dessert": "bg-pink-100",
  "Soupe": "bg-amber-100",
  "Plat principal": "bg-emerald-100",
  "Entrée": "bg-blue-100",
  "Bébé": "bg-purple-100",
} as const;

const RecipePreview = ({ recipe }: { recipe: Recipe }) => {
  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className="group relative block overflow-hidden rounded-xl bg-card shadow-md transition-all hover:shadow-xl"
    >
      <div className="aspect-[4/3] overflow-hidden">
        {recipe.illustration ? (
          <img
            src={recipe.illustration}
            alt={recipe.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
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

      {/* Title/time bar is always visible — hover-only reveal left touch
          devices with no way to see it (or the "Voir la recette" link it
          contained) before tapping. Hover still adds the fuller gradient. */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-3 px-4 text-white transition-opacity group-hover:from-black/90">
        <h3 className="text-base sm:text-lg font-semibold leading-snug line-clamp-2">{recipe.title}</h3>
        <div className="flex items-center gap-2 text-sm mt-1 text-white/90">
          <Clock className="w-4 h-4" />
          <span>{recipe.totalTime || recipe.prepTime || "Durée non spécifiée"}</span>
        </div>
      </div>
    </Link>
  );
};

export default RecipePreview; 