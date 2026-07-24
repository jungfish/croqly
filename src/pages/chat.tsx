import { useState } from "react";
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

// Semantic-search-backed recipe recommender: describe what you feel like
// eating, get back a short suggestion grounded in recipes that actually
// exist in the database (see POST /api/chat / server/routes/chat.ts).
const ChatPage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = input.trim();
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
        throw new Error(body?.error || "Failed to get recommendation");
      }
      const { reply, recipes } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: reply, recipes }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de contacter l'assistant.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ParallaxHero
        imageUrl="https://images.unsplash.com/photo-1495521821757-a1efb6729352"
        title="Assistant recettes"
        height="h-[200px] sm:h-[240px] lg:h-[300px]"
      />

      <div className="container mx-auto p-8 -mt-8 relative z-10 max-w-2xl">
        <p className="text-center text-muted-foreground mb-8">
          Dis-moi ce dont tu as envie, je te propose des recettes déjà croquées par la communauté.
        </p>

        <div className="space-y-4 mb-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 text-center py-12 text-muted-foreground">
              <Sparkles className="w-8 h-8" />
              <p>Essaie par exemple « un truc rapide avec du poulet » ou « un dessert sans four ».</p>
            </div>
          )}

          {messages.map((message, i) => (
            <div key={i} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
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
              <div className="rounded-2xl px-4 py-3 bg-card border border-border text-muted-foreground">
                …
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 sticky bottom-4">
          <Input
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
