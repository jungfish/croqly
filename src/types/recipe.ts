export type Recipe = {
  id?: string;
  title: string;
  category: "Dessert" | "Soupe" | "Plat principal" | "Entrée" | "Bébé";
  ingredients: string[];
  instructions: string[];
  illustration?: string;
  url?: string;
  videoUrl?: string;
  servings: number;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // True while illustration generation is still running in the background.
  illustrationPending?: boolean;
}; 