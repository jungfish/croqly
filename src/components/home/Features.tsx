import { Instagram, ImageDown, Sparkles, ShoppingCart, Globe, Users, Smartphone, Trash2 } from "lucide-react";

const features = [
  {
    icon: Instagram,
    title: "Import Instagram & TikTok",
    description: "Colle le lien d'un reel ou d'une vidéo : Croqly repère la recette, même quand elle n'est dite qu'à l'oral.",
  },
  {
    icon: ImageDown,
    title: "Import photo",
    description: "Pas de lien sous la main ? Glisse, colle ou importe une photo — livre de cuisine, capture d'écran, note manuscrite.",
  },
  {
    icon: Sparkles,
    title: "Illustration générée par IA",
    description: "Une image de la recette est générée automatiquement quand la vidéo n'en fournit pas une nette.",
  },
  {
    icon: ShoppingCart,
    title: "Liste de courses intelligente",
    description: "Ajoute plusieurs recettes à ta liste : les ingrédients en commun se fusionnent en une seule ligne.",
  },
  {
    icon: Globe,
    title: "Découvrir & partager",
    description: "Chaque recette rejoint le catalogue public Découvrir, consultable et partageable sans compte.",
  },
  {
    icon: Users,
    title: "Hub créateur",
    description: "Les recettes d'un même compte se retrouvent sur une page publique dédiée, que le créateur peut réclamer.",
  },
  {
    icon: Smartphone,
    title: "Installable comme une app",
    description: "Ajoute Croqly à ton écran d'accueil pour un accès rapide, sans passer par le navigateur.",
  },
];

const shoppingListMockup = [
  { emoji: "🥚", label: "Œufs", detail: "6 · 2 recettes" },
  { emoji: "🧈", label: "Beurre", detail: "250 g" },
  { emoji: "🌾", label: "Farine", detail: "400 g · 2 recettes" },
  { emoji: "🍫", label: "Chocolat noir", detail: "200 g" },
];

const creatorRecipes = ["bg-crunch/30", "bg-basil/30", "bg-yolk/30", "bg-accent/40"];

const Features = () => {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-2">Tout ce que Croqly sait faire</h2>
        <p className="text-muted-foreground">Une seule app, du reel jusqu'au repas.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {features.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-2xl bg-card shadow-sm border border-border p-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-1.5">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spotlight: shopping list ingredient merging */}
        <div className="rounded-2xl bg-card shadow-sm border border-border p-6 lg:p-8 flex flex-col justify-center">
          <h3 className="font-display font-semibold text-xl text-foreground mb-2">
            Une liste de courses qui fait le tri
          </h3>
          <p className="text-muted-foreground mb-6">
            Ajoute plusieurs recettes à ta liste : les ingrédients communs — farine, œufs, beurre — sont
            automatiquement fusionnés en une seule ligne, quantités additionnées.
          </p>
          <div className="rounded-xl bg-muted border border-border divide-y divide-border overflow-hidden">
            {shoppingListMockup.map((item) => (
              <div key={item.label} className="flex items-center gap-3 px-4 py-3">
                <span className="w-4 h-4 rounded border border-border shrink-0" aria-hidden="true" />
                <span className="text-base leading-none">{item.emoji}</span>
                <span className="text-sm text-foreground flex-1">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.detail}</span>
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Spotlight: creator hub */}
        <div className="rounded-2xl bg-card shadow-sm border border-border p-6 lg:p-8 flex flex-col justify-center">
          <h3 className="font-display font-semibold text-xl text-foreground mb-2">
            Chaque créateur a sa vitrine
          </h3>
          <p className="text-muted-foreground mb-6">
            Toutes les recettes extraites d'un même compte Instagram ou TikTok se retrouvent automatiquement
            sur une page publique dédiée, que le créateur peut réclamer.
          </p>
          <div className="rounded-xl bg-muted border border-border p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-crunch to-yolk shrink-0" />
              <div>
                <div className="text-sm font-medium text-foreground">@cuisine.de.mona</div>
                <div className="text-xs text-muted-foreground">12 recettes croquées</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {creatorRecipes.map((color, i) => (
                <div key={i} className={`aspect-square rounded-md ${color}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;
