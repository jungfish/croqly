import { useState, useEffect, useRef, FormEvent, DragEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Upload, ImageDown, Instagram, Mic, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { processRecipeFromInstagram, processRecipeFromUrl } from "@/services/recipeService";
import { useAuth } from "@/hooks/use-auth";
import { recordAnonRecipeView, getAnonRecipeIds } from "@/lib/anonRecipes";
import { authFetch } from "@/lib/apiClient";

// lucide-react has no TikTok mark — inlined from Simple Icons (CC0).
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const SOCIAL_URL_REGEX = /^https?:\/\/(www\.)?(instagram\.com\/(reel|p)\/|(vm\.|vt\.|m\.)?tiktok\.com\/)/;

const URLInput = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState<'link' | 'photo' | 'audio'>('link');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const micSupported = typeof window !== 'undefined' && 'MediaRecorder' in window && Boolean(navigator.mediaDevices?.getUserMedia);

  const processingSteps = {
    EXTRACT: "Extraction du texte...",
    ANALYZE: "Analyse de la recette...",
    SAVE: "Sauvegarde de la recette..."
  };

  // The URL flow is one blocking backend call (see server/routes/recipes.ts)
  // with no real progress events, so these steps advance on an estimated
  // timeline rather than actual backend state — a rough approximation of
  // where the request likely is, not a guarantee.
  const URL_STEPS = [
    { label: "Récupération de la vidéo...", atMs: 0 },
    { label: "Transcription de l'audio...", atMs: 2500 },
    { label: "Analyse de la recette...", atMs: 8500 },
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!SOCIAL_URL_REGEX.test(url)) {
      toast.error("Colle un lien de reel/post Instagram ou de vidéo TikTok.");
      return;
    }

    setLoading(true);
    const timers: ReturnType<typeof setTimeout>[] = [];
    // The toast (not local state) is what tracks progress across navigation —
    // Toaster lives above <Routes> in App.tsx, so it keeps updating by id even
    // after this component unmounts.
    const toastId = toast.loading(URL_STEPS[0].label);
    try {
      setCurrentStep(URL_STEPS[0].label);
      URL_STEPS.slice(1).forEach(({ label, atMs }) => {
        timers.push(setTimeout(() => {
          setCurrentStep(label);
          toast.loading(label, { id: toastId });
        }, atMs));
      });

      const recipe = await processRecipeFromUrl(url);
      timers.forEach(clearTimeout);

      // Anonymous visitors can hit the daily import limit before ever
      // clicking "Save" on a given recipe — track the id client-side so it
      // can still be recovered (see the 429 branch below and Signup/Login).
      if (!user && recipe.id) recordAnonRecipeView(recipe.id);

      // Pre-populate the detail page's query so it doesn't refetch something
      // that was just created/looked up — useful whether the user clicks
      // through from the toast now or later.
      queryClient.setQueryData(['recipe', recipe.id], recipe);

      toast.success(
        recipe.cached ? "Cette recette a déjà été extraite — résultat instantané." : "Recette prête !",
        {
          id: toastId,
          duration: 10000,
          action: {
            label: 'Voir la recette',
            onClick: () => navigate(`/recipe/${recipe.id}`),
          },
        }
      );
    } catch (error) {
      console.error('Error processing URL:', error);
      if (error instanceof Error && error.message.includes('limit')) {
        const pendingSaveRecipeIds = getAnonRecipeIds();
        toast.error("Limite quotidienne atteinte — crée un compte pour continuer.", {
          id: toastId,
          action: {
            label: 'Créer un compte',
            onClick: () => navigate('/signup', { state: { pendingSaveRecipeIds } }),
          },
        });
      } else {
        toast.error("Pas de recette repérable dans ce lien. Réessaie avec un reel de cuisine, ou importe des photos de la recette ci-dessous.", { id: toastId });
      }
    } finally {
      timers.forEach(clearTimeout);
      setLoading(false);
      setCurrentStep('');
    }
  };

  const handleImageUpload = async (files: File[]) => {
    if (!files.length) return;
    // Importing from a photo ties the recipe to an account for attribution
    // (see server/routes/ai.ts, server/routes/db.ts) — unlike the URL flow,
    // it's never anonymous.
    if (!user) {
      toast.error("Connecte-toi pour importer une recette depuis une photo.");
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setLoading(true);
    const toastId = toast.loading(processingSteps.EXTRACT);
    try {
      setCurrentStep(processingSteps.EXTRACT);

      const formData = new FormData();
      files.forEach((file) => {
        formData.append('image', file);
      });

      const response = await authFetch('/api/ai/ocr', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();

      setCurrentStep(processingSteps.ANALYZE);
      toast.loading(processingSteps.ANALYZE, { id: toastId });
      const recipe = await processRecipeFromInstagram('', data.text, undefined, undefined, undefined, source.trim() || undefined);

      queryClient.setQueryData(['recipe', recipe.id], recipe);

      toast.success("Recette prête !", {
        id: toastId,
        duration: 10000,
        action: {
          label: 'Voir la recette',
          onClick: () => navigate(`/recipe/${recipe.id}`),
        },
      });
    } catch (error) {
      console.error('Error processing images:', error);
      toast.error("Ces photos ne laissent pas voir de recette. Réessaie avec des photos plus nettes.", { id: toastId });
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  // Dictated-recipe flow: transcribe the recording with the same whisper-1
  // model used for Instagram/TikTok videos, then hand the transcript to the
  // same interpretation pipeline as the photo/OCR path (caption left empty,
  // transcript standing in for it).
  const handleAudioUpload = async (blob: Blob) => {
    setLoading(true);
    const toastId = toast.loading("Transcription de ta dictée...");
    try {
      setCurrentStep("Transcription de ta dictée...");

      const formData = new FormData();
      formData.append('audio', blob, 'recette.webm');

      const response = await authFetch('/api/ai/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const { text } = await response.json();

      setCurrentStep(processingSteps.ANALYZE);
      toast.loading(processingSteps.ANALYZE, { id: toastId });
      const recipe = await processRecipeFromInstagram('', text, undefined, undefined, undefined, source.trim() || undefined);

      queryClient.setQueryData(['recipe', recipe.id], recipe);

      toast.success("Recette prête !", {
        id: toastId,
        duration: 10000,
        action: {
          label: 'Voir la recette',
          onClick: () => navigate(`/recipe/${recipe.id}`),
        },
      });
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error("Cette dictée n'est pas assez claire. Réessaie en énonçant les ingrédients et les étapes une par une.", { id: toastId });
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const handleToggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    // Tied to an account for the same reason as the photo/OCR path — see
    // handleImageUpload above.
    if (!user) {
      toast.error("Connecte-toi pour dicter une recette au micro.");
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setRecording(false);
        handleAudioUpload(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (error) {
      console.error('Error starting microphone recording:', error);
      toast.error("Impossible d'accéder au micro. Vérifie les autorisations de ton navigateur.");
    }
  };

  // Stop covers a component unmount mid-recording — otherwise the mic stays
  // hot after the user navigates away.
  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

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

  // Optional attribution for a photo or dictation sourced from a book/
  // magazine — lets us credit the original author and identify these
  // recipes if a rights holder ever asks for one to be taken down. Shared
  // by the photo and audio tabs; irrelevant to the link tab, which doesn't
  // use it. Rendered ABOVE the dropzone/record trigger in both, not below:
  // selecting a photo or stopping a recording kicks off the import
  // immediately, so a source field placed after it was unreachable in
  // practice — by the time it was visible, the value it'd feed into had
  // already been read. A persistent label (not just placeholder text) also
  // keeps it visible once filled in, instead of disappearing into the input.
  const sourceField = (
    <div className="mb-3 text-left">
      <label htmlFor="recipe-source" className="block text-sm font-medium text-foreground mb-1">
        Source <span className="font-normal text-muted-foreground">(optionnel)</span>
      </label>
      <input
        id="recipe-source"
        type="text"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="ex. Ottolenghi, Simple"
        disabled={loading}
        className="w-full px-4 py-2.5 rounded-xl bg-card/90 border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
    </div>
  );

  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
      active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      <div className="mb-12">
        <img src="/croqly-mark.svg" alt="Croqly" className="w-32 h-32 mx-auto mb-4" />
        <h1 className="text-4xl font-display font-semibold text-foreground mb-2">Croqly</h1>
        <p className="text-xl text-muted-foreground">Le reel devient recette — prête à croquer.</p>
      </div>

      <div className="glass-card rounded-2xl shadow-xl p-8">
        {/* One import method visible at a time instead of stacking all
            three — the URL field, photo dropzone, and mic recorder were
            competing for attention in a single tall block. */}
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted mb-6">
          <button type="button" onClick={() => setMode('link')} className={tabClass(mode === 'link')}>
            <Link2 className="w-4 h-4" />
            Lien
          </button>
          <button type="button" onClick={() => setMode('photo')} className={tabClass(mode === 'photo')}>
            <Upload className="w-4 h-4" />
            Photo
          </button>
          {micSupported && (
            <button type="button" onClick={() => setMode('audio')} className={tabClass(mode === 'audio')}>
              <Mic className="w-4 h-4" />
              Micro
            </button>
          )}
        </div>

        {mode === 'link' && (
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
        )}

        {mode === 'photo' && (
          <div>
            {sourceField}
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-2 px-4 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors text-center ${
                isDragging ? "border-primary bg-accent/20 text-primary" : "border-border bg-muted hover:bg-accent/20 text-muted-foreground"
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
              {isDragging ? <ImageDown className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
              <span className="text-sm">
                {isDragging ? "Lâche l'image ici" : "Glisse une photo, colle-la (Ctrl+V), ou clique ici"}
              </span>
            </label>
            {!user && (
              <p className="mt-2 text-xs text-muted-foreground">Connexion requise pour importer une photo.</p>
            )}
          </div>
        )}

        {mode === 'audio' && (
          <div>
            {sourceField}
            <button
              type="button"
              onClick={handleToggleRecording}
              disabled={loading && !recording}
              className={`w-full flex flex-col items-center justify-center gap-2 px-4 py-10 rounded-xl border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                recording
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-dashed border-border bg-muted hover:bg-accent/20 text-muted-foreground"
              }`}
            >
              {recording ? (
                <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" aria-hidden="true" />
              ) : (
                <Mic className="w-7 h-7" />
              )}
              <span className="text-sm">
                {recording ? "Arrêter l'enregistrement" : "Dicte ta recette au micro"}
              </span>
            </button>
            {!user && (
              <p className="mt-2 text-xs text-muted-foreground">Connexion requise pour dicter une recette.</p>
            )}
          </div>
        )}

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
