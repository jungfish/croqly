import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqItems = [
  {
    question: "Quels liens puis-je utiliser ?",
    answer:
      "Les reels et posts Instagram, ainsi que les vidéos TikTok. Pas de lien sous la main ? Tu peux aussi importer une photo — livre de cuisine, capture d'écran, note manuscrite.",
  },
  {
    question: "Dois-je créer un compte pour essayer ?",
    answer:
      "Non, tu peux transformer un lien en recette sans compte. Un compte devient utile pour sauvegarder tes recettes dans « Mes recettes », gérer ta liste de courses, et continuer au-delà de la limite quotidienne d'imports anonymes.",
  },
  {
    question: "Que se passe-t-il si la vidéo n'a pas d'image nette de la recette ?",
    answer:
      "Croqly génère automatiquement une illustration à partir du titre et des ingrédients de la recette.",
  },
  {
    question: "Comment fonctionne la liste de courses ?",
    answer:
      "Ajoute une ou plusieurs recettes à ta liste : les ingrédients en commun sont automatiquement fusionnés en une seule ligne, quantités comprises.",
  },
  {
    question: "Le créateur du reel est-il crédité ?",
    answer:
      "Oui. Chaque recette garde le lien vers le contenu d'origine, et les créateurs peuvent réclamer leur propre page publique regroupant toutes leurs recettes extraites.",
  },
  {
    question: "Puis-je installer Croqly comme une application ?",
    answer:
      "Oui, Croqly est installable comme une PWA : ajoute-la à ton écran d'accueil pour un accès rapide, sans passer par un navigateur.",
  },
  {
    question: "Mes recettes sont-elles publiques ?",
    answer:
      "Toutes les recettes croquées apparaissent dans Découvrir et sont consultables par n'importe qui, avec ou sans compte.",
  },
];

const Faq = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-2">Questions fréquentes</h2>
        <p className="text-muted-foreground">Tout ce qu'il faut savoir avant de croquer.</p>
      </div>

      <div className="max-w-2xl mx-auto rounded-2xl bg-card border border-border shadow-sm divide-y divide-border overflow-hidden">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={item.question}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium text-foreground">{item.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 text-sm text-muted-foreground">{item.answer}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Faq;
