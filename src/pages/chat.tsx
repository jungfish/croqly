import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Refrigerator, X } from "lucide-react";
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

const CroqMark = ({ className = "w-5 h-5" }: { className?: string }) => (
  <img src="/croqly-mark.svg" alt="" className={className} />
);

const SUGGESTIONS = [
  "un truc rapide avec du poulet",
  "un dessert sans four",
  "une recette végé pour ce soir",
];

// "Mode frigo": instead of a separate matching system, the ingredients the
// user has on hand are folded into a normal chat message and go through the
// exact same semantic-search-backed flow as any other request (see
// server/routes/chat.ts) — one entry point, one behavior to reason about.
function composeFridgeMessage(ingredients: string[]): string {
  return `Voici ce que j'ai dans mon frigo : ${ingredients.join(", ")}. Qu'est-ce que je peux cuisiner avec ça ?`;
}

// Semantic-search-backed recipe recommender: describe what you feel like
// eating, get back a short suggestion grounded in recipes that actually
// exist in the database (see POST /api/chat / server/routes/chat.ts).
const ChatPage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [fridgeMode, setFridgeMode] = useState(false);
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>([]);
  const [fridgeInput, setFridgeInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fridgeInputRef = useRef<HTMLInputElement>(null);
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
        throw new Error(body?.error || "Impossible de contacter Croq. Réessaie dans un instant.");
      }
      const { reply, recipes } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: reply, recipes }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de contacter Croq. Réessaie dans un instant.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input.trim());
  };

  const openFridgeMode = () => {
    setFridgeMode(true);
    setTimeout(() => fridgeInputRef.current?.focus(), 0);
  };

  const closeFridgeMode = () => {
    setFridgeMode(false);
    setFridgeIngredients([]);
    setFridgeInput("");
  };

  const addFridgeIngredient = () => {
    const value = fridgeInput.trim();
    if (!value || fridgeIngredients.includes(value)) {
      setFridgeInput("");
      return;
    }
    setFridgeIngredients((prev) => [...prev, value]);
    setFridgeInput("");
  };

  const removeFridgeIngredient = (value: string) => {
    setFridgeIngredients((prev) => prev.filter((i) => i !== value));
  };

  const handleFridgeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addFridgeIngredient();
    } else if (e.key === "Backspace" && !fridgeInput && fridgeIngredients.length > 0) {
      setFridgeIngredients((prev) => prev.slice(0, -1));
    }
  };

  const handleFridgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = fridgeInput.trim();
    const finalIngredients = value && !fridgeIngredients.includes(value) ? [...fridgeIngredients, value] : fridgeIngredients;
    if (finalIngredients.length === 0) return;
    closeFridgeMode();
    sendMessage(composeFridgeMessage(finalIngredients));
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-background">
      <div className="flex-1 min-h-0 flex flex-col container mx-auto px-8 pt-28 pb-[max(2rem,env(safe-area-inset-bottom))] max-w-2xl">
        <div className="flex flex-col items-center text-center gap-2 mb-6 shrink-0">
          <CroqMark className="w-10 h-10" />
          <div>
            <h1 className="font-display text-2xl text-foreground">Croq</h1>
            <p className="text-muted-foreground">
              Dis-moi ce dont tu as envie, je te propose des recettes déjà croquées par la communauté.
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 mb-4 pr-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 text-center py-12 text-muted-foreground">
              <p>Essaie par exemple :</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="px-3 py-1.5 rounded-full border border-border bg-card text-sm text-foreground hover:bg-accent hover:border-primary/40 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={openFridgeMode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-sm text-primary font-medium hover:bg-primary/20 transition-colors"
                >
                  <Refrigerator className="w-3.5 h-3.5" />
                  Mode frigo — dis-moi ce que tu as
                </button>
              </div>
            </div>
          )}

          {messages.map((message, i) => (
            <div key={i} className={`flex flex-col gap-1 ${message.role === "user" ? "items-end" : "items-start"}`}>
              {message.role === "assistant" && (
                <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                  <CroqMark className="w-3.5 h-3.5" />
                  Croq
                </div>
              )}
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
            <div className="flex flex-col gap-1 items-start">
              <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                <CroqMark className="w-3.5 h-3.5" />
                Croq
              </div>
              <div className="rounded-2xl px-4 py-3 bg-card border border-border flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {fridgeMode ? (
          <form onSubmit={handleFridgeSubmit} className="shrink-0 pt-4">
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-card border border-border">
              <Refrigerator className="w-4 h-4 ml-1 text-primary shrink-0" />
              {fridgeIngredients.map((ingredient) => (
                <span
                  key={ingredient}
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
                >
                  {ingredient}
                  <button
                    type="button"
                    onClick={() => removeFridgeIngredient(ingredient)}
                    aria-label={`Retirer ${ingredient}`}
                    className="rounded-full hover:bg-primary/20 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              <Input
                ref={fridgeInputRef}
                value={fridgeInput}
                onChange={(e) => setFridgeInput(e.target.value)}
                onKeyDown={handleFridgeKeyDown}
                onBlur={addFridgeIngredient}
                placeholder={fridgeIngredients.length === 0 ? "Ex : œufs, farine, lait…" : "Ajouter un ingrédient"}
                disabled={isSending}
                className="flex-1 min-w-[140px] border-none shadow-none focus-visible:ring-0 h-8 px-2"
              />
              <Button type="button" variant="ghost" size="icon" onClick={closeFridgeMode} aria-label="Annuler le mode frigo">
                <X className="w-4 h-4" />
              </Button>
              <Button
                type="submit"
                disabled={isSending || (fridgeIngredients.length === 0 && !fridgeInput.trim())}
                size="icon"
                aria-label="Chercher des recettes"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2 shrink-0 pt-4">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Qu'est-ce qui te ferait plaisir ?"
              disabled={isSending}
              className="bg-card"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={openFridgeMode}
              disabled={isSending}
              aria-label="Mode frigo"
              title="Mode frigo"
            >
              <Refrigerator className="w-4 h-4" />
            </Button>
            <Button type="submit" disabled={isSending || !input.trim()} size="icon" aria-label="Envoyer">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
