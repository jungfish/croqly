export type Platform = "instagram" | "tiktok";

export type Creator = {
  id?: string;
  platform: Platform;
  handle: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  claimed?: boolean;
};

export type Recipe = {
  id?: string;
  title: string;
  category: "Dessert" | "Soupe" | "Plat principal" | "Entrée" | "Bébé";
  ingredients: string[];
  instructions: string[];
  illustration?: string;
  // The platform this recipe was imported from — undefined for recipes with
  // no captured source (e.g. the photo/OCR upload path).
  platform?: Platform;
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
  // The Instagram/TikTok account this recipe was scraped from — null for
  // recipes with no captured source (e.g. the photo/OCR upload path).
  creator?: {
    platform: Platform;
    handle: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  // Whether the current caller already has this recipe in "Mes recettes" —
  // only meaningful when the request carried an auth token.
  savedByMe?: boolean;
}; 