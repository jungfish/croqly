import { Instagram, Sparkles, ChefHat, Check } from "lucide-react";

// lucide-react has no TikTok mark — inlined from Simple Icons (CC0), same as URLInput.
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const analysisSteps = ["Extraction du texte", "Transcription de la vidéo", "Analyse de la recette", "Génération de l'illustration"];

const steps = [
  {
    icon: <><Instagram className="w-5 h-5" /><TikTokIcon className="w-4 h-4" /></>,
    title: "Colle ton lien",
    description: "Un reel Instagram, une vidéo TikTok, ou une photo de recette glissée, collée (Ctrl+V) ou importée.",
    mockup: (
      <div className="rounded-xl bg-card border border-border p-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          <Instagram className="w-4 h-4 shrink-0" />
          <span className="truncate">instagram.com/reel/Cx7f...</span>
        </div>
        <div className="mt-2 rounded-lg bg-primary/90 text-primary-foreground text-xs font-medium text-center py-2">
          Transformer en recette
        </div>
      </div>
    ),
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Croqly transcrit et analyse",
    description: "Extraction du texte, transcription de la vidéo, analyse de la recette et illustration — tout est automatique.",
    mockup: (
      <div className="rounded-xl bg-card border border-border p-3 space-y-1.5">
        {analysisSteps.map((step) => (
          <div key={step} className="flex items-center gap-2 text-xs text-foreground">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-secondary text-secondary-foreground shrink-0">
              <Check className="w-2.5 h-2.5" />
            </span>
            {step}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: <ChefHat className="w-5 h-5" />,
    title: "Ta recette est prête",
    description: "Ingrédients, étapes et temps de préparation, prête à croquer et à rejoindre ta liste de courses.",
    mockup: (
      <div className="rounded-xl bg-card border border-border p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-accent/40 flex items-center justify-center shrink-0">
            <ChefHat className="w-4 h-4 text-accent-foreground" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-foreground truncate">Cookies moelleux</div>
            <div className="text-[11px] text-muted-foreground">25 min · 4 parts</div>
          </div>
        </div>
        <div className="mt-2 rounded-lg bg-secondary/90 text-secondary-foreground text-[11px] font-medium text-center py-1.5">
          Ajouter à la liste de courses
        </div>
      </div>
    ),
  },
];

const HowItWorks = () => {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-2">Comment ça marche</h2>
        <p className="text-muted-foreground">De la vidéo à l'assiette, en trois étapes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-2xl bg-card/50 border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-display font-semibold text-sm shrink-0">
                {index + 1}
              </span>
              <div className="flex items-center gap-1.5 text-foreground">{step.icon}</div>
            </div>
            <h3 className="font-display font-semibold text-foreground mb-1.5">{step.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
            {step.mockup}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HowItWorks;
