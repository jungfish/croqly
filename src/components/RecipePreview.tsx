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
    <div className="group relative overflow-hidden rounded-xl bg-card shadow-md transition-all hover:shadow-xl">
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
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
        <div className="absolute bottom-0 w-full p-4 text-white">
          <h3 className="text-lg font-semibold mb-2">{recipe.title}</h3>
          <div className="flex items-center gap-2 text-sm mb-3">
            <Clock className="w-4 h-4" />
            <span>{recipe.totalTime || recipe.prepTime || "Durée non spécifiée"}</span>
          </div>
          <Link 
            to={`/recipe/${recipe.id}`}
            className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
          >
            Voir la recette
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RecipePreview; 