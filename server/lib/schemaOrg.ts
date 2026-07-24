import { toIsoDuration } from './isoDuration.js';

type Platform = 'instagram' | 'tiktok';

type CreatorLike = {
  platform: Platform;
  handle: string;
  displayName?: string | null;
  avatarUrl?: string | null;
} | null | undefined;

type RecipeLike = {
  id: string;
  title: string;
  illustration?: string | null;
  ingredients: string[];
  instructions: string[];
  prepTime?: string | null;
  cookTime?: string | null;
  totalTime?: string | null;
  servings?: number | null;
  creator?: CreatorLike;
};

function creatorHubUrl(siteUrl: string, platform: Platform, handle: string) {
  return `${siteUrl}/createurs/${platform}/${encodeURIComponent(handle)}`;
}

function creatorProfileUrl(platform: Platform, handle: string) {
  return platform === 'instagram'
    ? `https://www.instagram.com/${handle}/`
    : `https://www.tiktok.com/@${handle}`;
}

// Never invent an author — only attach one when we actually captured a
// source Instagram/TikTok account for this recipe (see server/routes/recipes.ts).
function buildAuthor(siteUrl: string, creator: CreatorLike) {
  if (!creator) return undefined;
  return {
    '@type': 'Person',
    name: creator.displayName || `@${creator.handle}`,
    url: creatorHubUrl(siteUrl, creator.platform, creator.handle),
    sameAs: [creatorProfileUrl(creator.platform, creator.handle)],
  };
}

export function buildRecipeJsonLd(siteUrl: string, recipeUrl: string, recipe: RecipeLike) {
  const prepTime = toIsoDuration(recipe.prepTime);
  const cookTime = toIsoDuration(recipe.cookTime);
  const totalTime = toIsoDuration(recipe.totalTime);
  const author = buildAuthor(siteUrl, recipe.creator);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    recipeIngredient: recipe.ingredients,
    recipeInstructions: recipe.instructions.map((step) => ({
      '@type': 'HowToStep',
      text: step,
    })),
  };

  if (recipe.illustration) jsonLd.image = [recipe.illustration];
  if (author) jsonLd.author = author;
  if (prepTime) jsonLd.prepTime = prepTime;
  if (cookTime) jsonLd.cookTime = cookTime;
  if (totalTime) jsonLd.totalTime = totalTime;
  if (recipe.servings) jsonLd.recipeYield = `${recipe.servings} portions`;

  const breadcrumbItems = [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: siteUrl }];
  if (recipe.creator) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: recipe.creator.displayName || `@${recipe.creator.handle}`,
      item: creatorHubUrl(siteUrl, recipe.creator.platform, recipe.creator.handle),
    });
  }
  breadcrumbItems.push({ '@type': 'ListItem', position: breadcrumbItems.length + 1, name: recipe.title, item: recipeUrl });

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  return [jsonLd, breadcrumbJsonLd];
}

export function buildCreatorHubJsonLd(
  siteUrl: string,
  hubUrl: string,
  creator: { platform: Platform; handle: string; displayName?: string | null; avatarUrl?: string | null },
  recipes: Array<{ id: string; title: string }>
) {
  const displayName = creator.displayName || `@${creator.handle}`;

  const personJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: displayName,
    url: hubUrl,
    sameAs: [creatorProfileUrl(creator.platform, creator.handle)],
  };
  if (creator.avatarUrl) personJsonLd.image = creator.avatarUrl;

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: recipes.map((recipe, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${siteUrl}/recipe/${recipe.id}`,
      name: recipe.title,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: displayName, item: hubUrl },
    ],
  };

  return [personJsonLd, itemListJsonLd, breadcrumbJsonLd];
}
