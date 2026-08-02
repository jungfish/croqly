import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Copy, LogOut, UtensilsCrossed, RefreshCw, Share2, Pencil, Check, X } from "lucide-react";
import RecipeImage from "@/components/RecipeImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchMyHousehold,
  fetchHouseholdRecipes,
  createHousehold,
  joinHousehold,
  leaveHousehold,
  renameHousehold,
  regenerateInviteCode,
  type Household,
  type HouseholdRecipe,
} from "@/services/householdService";
import { useAuth } from "@/hooks/use-auth";
import { getFirstName } from "@/lib/getFirstName";

// Shows a member's email prefix rather than the full address — enough to
// recognize "who's who" in a family-sized group without spelling out emails.
function memberLabel(email: string | null, isMe: boolean): string {
  if (isMe) return "Toi";
  if (!email) return "Membre";
  return email.split("@")[0];
}

const CreateOrJoinPanel = ({ onDone, initialCode }: { onDone: () => void; initialCode?: string }) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode ?? "");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createHousehold(name.trim() || undefined);
      toast.success("Foyer créé !");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer le foyer.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    try {
      await joinHousehold(code.trim());
      toast.success("Tu as rejoint le foyer !");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de rejoindre ce foyer.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
      <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm p-6 shadow-lg">
        <h2 className="text-lg font-display font-semibold mb-1">Créer un foyer</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Invite ensuite les autres avec un code à partager.
        </p>
        <Label htmlFor="household-name" className="sr-only">
          Nom du foyer
        </Label>
        <Input
          id="household-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du foyer (optionnel)"
          className="mb-3"
        />
        <Button onClick={handleCreate} disabled={creating} className="w-full">
          {creating ? "Création…" : "Créer mon foyer"}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm p-6 shadow-lg">
        <h2 className="text-lg font-display font-semibold mb-1">Rejoindre un foyer</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Demande le code à un membre du foyer.
        </p>
        <Label htmlFor="household-code" className="sr-only">
          Code d'invitation
        </Label>
        <Input
          id="household-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ex. AB3D9K"
          className="mb-3 uppercase tracking-widest"
          maxLength={6}
        />
        <Button onClick={handleJoin} disabled={joining || !code.trim()} variant="outline" className="w-full">
          {joining ? "Connexion…" : "Rejoindre"}
        </Button>
      </div>
    </div>
  );
};

const HouseholdPanel = ({
  household,
  onLeft,
  onRenamed,
}: {
  household: Household;
  onLeft: () => void;
  onRenamed: () => void;
}) => {
  const [leaving, setLeaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [inviteCode, setInviteCode] = useState(household.inviteCode);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(household.name ?? "");
  const [savingName, setSavingName] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      toast.success("Code copié !");
    } catch {
      toast.error("Impossible de copier le code.");
    }
  };

  // navigator.share opens the native share sheet (WhatsApp, Messages...) so
  // inviting someone doesn't require reading a code aloud — same pattern as
  // ShareButton.tsx. Falls back to a plain clipboard copy on desktop.
  const handleInvite = async () => {
    const url = `${window.location.origin}/foyer?join=${inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Rejoins mon foyer sur Croqly",
          text: `Rejoins mon foyer sur Croqly avec le code ${inviteCode}`,
          url,
        });
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          toast.error("Impossible de partager. Réessaie dans un instant.");
        }
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Lien d'invitation copié !");
  };

  const startEditingName = () => {
    setNameDraft(household.name ?? "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    setSavingName(true);
    try {
      await renameHousehold(nameDraft.trim());
      toast.success("Nom du foyer mis à jour.");
      setEditingName(false);
      onRenamed();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de renommer le foyer.");
    } finally {
      setSavingName(false);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await leaveHousehold();
      toast.success("Tu as quitté le foyer.");
      onLeft();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de quitter le foyer.");
    } finally {
      setLeaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const newCode = await regenerateInviteCode();
      setInviteCode(newCode);
      toast.success("Nouveau code généré.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de régénérer le code.");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm p-6 shadow-lg max-w-2xl mx-auto mb-10">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        {editingName ? (
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Users className="w-5 h-5 shrink-0" />
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Nom du foyer"
              className="h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") setEditingName(false);
              }}
            />
            <Button variant="ghost" size="icon" onClick={handleSaveName} disabled={savingName} aria-label="Enregistrer">
              <Check className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setEditingName(false)} disabled={savingName} aria-label="Annuler">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <h2 className="text-lg font-display font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            {household.name || "Mon foyer"}
            <button
              onClick={startEditingName}
              aria-label="Renommer le foyer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </h2>
        )}
        <Button variant="ghost" size="sm" onClick={handleLeave} disabled={leaving} className="text-muted-foreground">
          <LogOut className="w-4 h-4" />
          {leaving ? "..." : "Quitter"}
        </Button>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">Code d'invitation — partage-le pour ajouter du monde</p>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="px-3 py-2 rounded-lg bg-muted font-mono text-lg tracking-widest">{inviteCode}</code>
          <Button variant="outline" size="icon" onClick={handleCopyCode} aria-label="Copier le code">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleRegenerate} disabled={regenerating} aria-label="Régénérer le code">
            <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleInvite} className="gap-2">
            <Share2 className="w-4 h-4" />
            Inviter
          </Button>
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">
          {household.members.length} membre{household.members.length > 1 ? "s" : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {household.members.map((member) => (
            <span
              key={member.userId}
              className="px-3 py-1 rounded-full bg-card border border-border text-sm text-foreground"
            >
              {memberLabel(member.email, member.isMe)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const FoyerPage = () => {
  const { user } = useAuth();
  const firstName = getFirstName(user);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  // Prefills the join code when arriving via an invite link shared from
  // HouseholdPanel's "Inviter" button (/foyer?join=CODE) — see handleInvite.
  const joinCodeFromLink = searchParams.get("join")?.toUpperCase();

  const { data: household, isLoading: householdLoading } = useQuery<Household | null>({
    queryKey: ["household", "me"],
    queryFn: fetchMyHousehold,
  });

  const { data: recipes = [], isError: isRecipesError } = useQuery<HouseholdRecipe[]>({
    queryKey: ["recipes", "household"],
    queryFn: fetchHouseholdRecipes,
    enabled: Boolean(household),
  });

  const refreshHousehold = () => {
    queryClient.invalidateQueries({ queryKey: ["household", "me"] });
    queryClient.invalidateQueries({ queryKey: ["recipes", "household"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8 pt-28">
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-2">Mon Foyer</h1>
            <p className="text-muted-foreground">
              {firstName ? `Salut ${firstName}, ` : ""}
              voici les recettes croquées par ton foyer.
            </p>
          </div>
        </div>

        {householdLoading && <div className="text-center text-muted-foreground py-12">Chargement…</div>}

        {!householdLoading && !household && (
          <CreateOrJoinPanel onDone={refreshHousehold} initialCode={joinCodeFromLink} />
        )}

        {!householdLoading && household && (
          <>
            <HouseholdPanel household={household} onLeft={refreshHousehold} onRenamed={refreshHousehold} />

            {isRecipesError && (
              <div className="text-center text-muted-foreground py-8">
                Impossible de charger les recettes du foyer. Réessaie dans un instant.
              </div>
            )}

            {!isRecipesError && recipes.length === 0 && (
              <div className="flex flex-col items-center gap-4 text-center py-16 text-muted-foreground">
                <UtensilsCrossed className="w-10 h-10" />
                <p>Personne n'a encore ajouté de recette dans ce foyer.</p>
              </div>
            )}

            {recipes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map((recipe) => (
                  <Link
                    key={`${recipe.id}-${recipe.savedByUserId}`}
                    to={`/recipe/${recipe.id}`}
                    className="group relative block overflow-hidden rounded-xl bg-card/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-border"
                  >
                    <div className="h-48 overflow-hidden">
                      <RecipeImage
                        recipe={recipe}
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4 bg-card/50 backdrop-blur-sm">
                      <h2 className="text-xl font-display font-semibold mb-2 text-foreground">{recipe.title}</h2>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="inline-block px-3 py-1 bg-card/70 backdrop-blur-sm rounded-full text-sm text-foreground shadow-sm">
                          {recipe.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Ajouté par {memberLabel(recipe.savedByEmail, recipe.savedByUserId === user?.id)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FoyerPage;
