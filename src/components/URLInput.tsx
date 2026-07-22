import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Instagram } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { processRecipeFromInstagram, processRecipeFromUrl } from "@/services/recipeService";

const INSTAGRAM_URL_REGEX = /^https?:\/\/(www\.)?instagram\.com\/(reel|p)\//;

const URLInput = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');

  const processingSteps = {
    EXTRACT: "Extraction du texte...",
    TRANSCRIBE: "Transcription de la vidéo...",
    ANALYZE: "Analyse de la recette...",
    GENERATE: "Génération de l'illustration...",
    SAVE: "Sauvegarde de la recette..."
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!INSTAGRAM_URL_REGEX.test(url)) {
      toast.error("Ce lien ne vient pas d'Instagram. Colle un lien de reel ou de post Instagram.");
      return;
    }

    setLoading(true);
    try {
      // One backend call does the cache lookup, scrape, transcription,
      // interpretation, illustration, and save — see server/routes/recipes.ts.
      setCurrentStep(processingSteps.ANALYZE);
      const recipe = await processRecipeFromUrl(url);

      if (recipe.cached) {
        toast.success("Cette recette a déjà été extraite — résultat instantané.");
      }

      // Pre-populate the detail page's query so it doesn't refetch something
      // that was just created/looked up. A client-side navigate (not a full
      // page reload) is what makes this pre-population actually useful.
      queryClient.setQueryData(['recipe', recipe.id], recipe);

      setCurrentStep(processingSteps.SAVE);
      navigate(`/recipe/${recipe.id}`);
    } catch (error) {
      console.error('Error processing URL:', error);
      if (error instanceof Error && error.message.includes('limit')) {
        toast.error("Limite quotidienne atteinte — crée un compte pour continuer.");
      } else {
        toast.error("Pas de recette repérable dans ce lien. Réessaie avec un reel de cuisine.");
      }
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const handleImageUpload = async (files: FileList) => {
    setLoading(true);
    try {
      setCurrentStep(processingSteps.EXTRACT);

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('image', file);
      });

      const response = await fetch('/api/ai/ocr', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();

      setCurrentStep(processingSteps.ANALYZE);
      const recipe = await processRecipeFromInstagram('', data.text);

      queryClient.setQueryData(['recipe', recipe.id], recipe);

      setCurrentStep(processingSteps.SAVE);
      navigate(`/recipe/${recipe.id}`);
    } catch (error) {
      console.error('Error processing images:', error);
      toast.error("Ces photos ne laissent pas voir de recette. Réessaie avec des photos plus nettes.");
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      <div className="mb-12">
        <img src="/croqly-mark.svg" alt="Croqly" className="w-32 h-32 mx-auto mb-4" />
        <h1 className="text-4xl font-display font-semibold text-foreground mb-2">Croqly</h1>
        <p className="text-xl text-muted-foreground">Le reel devient recette — prête à croquer.</p>
      </div>

      <div className="glass-card rounded-2xl shadow-xl p-8">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Colle le lien de ta recette Instagram ici…"
              className="w-full px-12 py-4 rounded-xl bg-card/90 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Instagram className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
          <button
            type="submit"
            disabled={loading || !url}
            className="mt-4 w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Transformer en recette
          </button>
        </form>

        <div className="mt-4 text-muted-foreground font-medium">ou</div>

        <label className="mt-4 block w-full px-12 py-4 rounded-xl border-2 border-dashed border-border bg-muted cursor-pointer hover:bg-accent/20 transition-colors">
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
            disabled={loading}
          />
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Upload className="w-5 h-5" />
            <span>Importe tes photos de recette</span>
          </div>
        </label>

        {loading && (
          <div className="mt-4 flex items-center justify-center gap-3 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary/40 border-t-transparent rounded-full animate-spin" />
            <span>{currentStep}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default URLInput;
