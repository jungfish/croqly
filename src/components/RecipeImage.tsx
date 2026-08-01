import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import type { Recipe } from "@/types/recipe";

const categoryColors = {
  "Dessert": "bg-pink-100",
  "Soupe": "bg-amber-100",
  "Plat principal": "bg-emerald-100",
  "Entrée": "bg-blue-100",
  "Salade": "bg-lime-100",
  "Bébé": "bg-purple-100",
} as const;

// server/lib/storage.ts always resizes from a fixed 1536x1024 (3:2) source
// into these two widths, so we can hardcode them for the srcset/width/height
// attributes instead of storing dimensions in the DB.
const THUMB_WIDTH = 480;
const THUMB_HEIGHT = 320;
const FULL_WIDTH = 1600;

interface RecipeImageProps {
  recipe: Recipe;
  sizes: string;
  className?: string;
}

// Shared illustration renderer for recipe cards (grid/preview contexts) —
// centralizes the lazy-loading, srcset, dimensions, and skeleton behavior
// that RecipePreview.tsx and recipes.tsx previously duplicated.
const RecipeImage = ({ recipe, sizes, className }: RecipeImageProps) => {
  const [loaded, setLoaded] = useState(false);

  if (!recipe.illustration) {
    return (
      <div className={`h-full w-full flex items-center justify-center ${categoryColors[recipe.category] || 'bg-muted'}`}>
        <div className="text-center p-4">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{recipe.category}</span>
        </div>
      </div>
    );
  }

  const thumbUrl = recipe.illustrationThumb || recipe.illustration;
  // Before AI generation completes, illustration/illustrationThumb are both
  // set to the same raw platform placeholder — only build a srcset once we
  // actually have two distinct, differently-sized variants to offer.
  const hasDistinctFull = Boolean(recipe.illustrationThumb) && recipe.illustration !== recipe.illustrationThumb;

  return (
    <div className="relative h-full w-full bg-muted">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />}
      <img
        src={thumbUrl}
        srcSet={hasDistinctFull ? `${thumbUrl} ${THUMB_WIDTH}w, ${recipe.illustration} ${FULL_WIDTH}w` : undefined}
        sizes={hasDistinctFull ? sizes : undefined}
        width={THUMB_WIDTH}
        height={THUMB_HEIGHT}
        alt={recipe.title}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className ?? ''}`}
      />
    </div>
  );
};

export default RecipeImage;
