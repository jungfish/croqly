import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Sparkles } from "lucide-react";
import ParallaxHero from "@/components/ParallaxHero";
import RecipePreview from "@/components/RecipePreview";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/apiClient";
import type { Recipe } from "@/types/recipe";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  recipes?: Recipe[];
};

const SUGGESTIONS = [
  "un truc rapide avec du poulet",
  "un dessert sans four",
  "une recette végé pour ce soir",
];

// Semantic-search-backed recipe recommender: describe what you feel like
// eating, get back a short suggestion grounded in recipes that actually
// exist in the database (see POST /api/chat / server/routes/chat.ts).
const ChatPage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  const sendMessage = async (message: string) => {
    if (!message || isSending) return;

    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setIsSending(true);

    try {
      const res = await authFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Impossible de contacter l'assistant. Réessaie dans un instant.");
      }
      const { reply, recipes } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: reply, recipes }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de contacter l'assistant. Réessaie dans un instant.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input.trim());
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-background">
      <ParallaxHero
        imageUrl="https://images.unsplash.com/photo-1495521821757-a1efb6729352"
        title="Assistant recettes"
        height="h-[200px] sm:h-[240px] lg:h-[300px]"
      />

      <div className="flex-1 min-h-0 flex flex-col container mx-auto px-8 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] -mt-8 relative z-10 max-w-2xl">
        <p className="text-center text-muted-foreground mb-8 shrink-0">
          Dis-moi ce dont tu as envie, je te propose des recettes déjà croquées par la communauté.
        </p>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 mb-4 pr-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 text-center py-12 text-muted-foreground">
              <Sparkles className="w-8 h-8" />
              <p>Essaie par exemple :</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestion(suggestion)}
                    className="px-3 py-1.5 rounded-full border border-border bg-card text-sm text-foreground hover:bg-accent hover:border-primary/40 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, i) => (
            <div key={i} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "max-w-[85%] bg-primary text-primary-foreground"
                    : "w-full bg-card border border-border"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.recipes && message.recipes.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    {message.recipes.map((recipe) => (
                      <RecipePreview key={recipe.id} recipe={recipe} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-card border border-border flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 shrink-0 pt-4">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Qu'est-ce qui te ferait plaisir ?"
            disabled={isSending}
            className="bg-card"
          />
          <Button type="submit" disabled={isSending || !input.trim()} size="icon" aria-label="Envoyer">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
