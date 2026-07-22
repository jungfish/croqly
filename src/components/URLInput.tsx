import { useState, useEffect, FormEvent, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, ImageDown, Instagram } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { processRecipeFromInstagram, processRecipeFromUrl } from "@/services/recipeService";
import { useAuth } from "@/hooks/use-auth";
import { recordAnonRecipeView, getAnonRecipeIds } from "@/lib/anonRecipes";

// lucide-react has no TikTok mark — inlined from Simple Icons (CC0).
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const SOCIAL_URL_REGEX = /^https?:\/\/(www\.)?(instagram\.com\/(reel|p)\/|(vm\.|vt\.|m\.)?tiktok\.com\/)/;

const URLInput = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const processingSteps = {
    EXTRACT: "Extraction du texte...",
    TRANSCRIBE: "Transcription de la vidéo...",
    ANALYZE: "Analyse de la recette...",
    GENERATE: "Génération de l'illustration...",
    SAVE: "Sauvegarde de la recette..."
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!SOCIAL_URL_REGEX.test(url)) {
      toast.error("Colle un lien de reel/post Instagram ou de vidéo TikTok.");
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

      // Anonymous visitors can hit the daily import limit before ever
      // clicking "Save" on a given recipe — track the id client-side so it
      // can still be recovered (see the 429 branch below and Signup/Login).
      if (!user && recipe.id) recordAnonRecipeView(recipe.id);

      // Pre-populate the detail page's query so it doesn't refetch something
      // that was just created/looked up. A client-side navigate (not a full
      // page reload) is what makes this pre-population actually useful.
      queryClient.setQueryData(['recipe', recipe.id], recipe);

      setCurrentStep(processingSteps.SAVE);
      navigate(`/recipe/${recipe.id}`);
    } catch (error) {
      console.error('Error processing URL:', error);
      if (error instanceof Error && error.message.includes('limit')) {
        const pendingSaveRecipeIds = getAnonRecipeIds();
        toast.error("Limite quotidienne atteinte — crée un compte pour continuer.", {
          action: {
            label: 'Créer un compte',
            onClick: () => navigate('/signup', { state: { pendingSaveRecipeIds } }),
          },
        });
      } else {
        toast.error("Pas de recette repérable dans ce lien. Réessaie avec un reel de cuisine, ou importe des photos de la recette ci-dessous.");
      }
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const handleImageUpload = async (files: File[]) => {
    if (!files.length) return;
    setLoading(true);
    try {
      setCurrentStep(processingSteps.EXTRACT);

      const formData = new FormData();
      files.forEach((file) => {
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

      if (!user && recipe.id) recordAnonRecipeView(recipe.id);

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

  // Global listener so a copied screenshot can be pasted anywhere on the
  // page, not just while a specific input is focused.
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (loading) return;
      const imageFiles = Array.from(e.clipboardData?.items ?? [])
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      if (imageFiles.length) {
        e.preventDefault();
        handleImageUpload(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [loading, handleImageUpload]);

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (!loading) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (loading) return;
    const imageFiles = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length) handleImageUpload(imageFiles);
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
              placeholder="Colle le lien de ta recette Instagram ou TikTok ici…"
              className="w-full pl-20 pr-12 py-4 rounded-xl bg-card/90 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
              <Instagram className="w-5 h-5" />
              <TikTokIcon className="w-5 h-5" />
            </div>
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

        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mt-4 block w-full px-12 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            isDragging ? "border-primary bg-accent/20" : "border-border bg-muted hover:bg-accent/20"
          }`}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleImageUpload(Array.from(e.target.files))}
            disabled={loading}
          />
          <div className={`flex items-center justify-center gap-2 ${isDragging ? "text-primary" : "text-muted-foreground"}`}>
            {isDragging ? <ImageDown className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            <span>{isDragging ? "Lâche l'image ici" : "Importe, colle (Ctrl+V) ou glisse tes photos de recette ici"}</span>
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
