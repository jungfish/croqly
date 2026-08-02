import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Copy, LogOut, UtensilsCrossed, RefreshCw, Share2, Pencil, Check, X, Smile, UserPlus } from "lucide-react";
import RecipeImage from "@/components/RecipeImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import {
  fetchMyHousehold,
  fetchHouseholdRecipes,
  createHousehold,
  joinHousehold,
  leaveHousehold,
  renameHousehold,
  regenerateInviteCode,
  shareInviteLink,
  toggleReaction,
  REACTION_EMOJIS,
  type Household,
  type HouseholdRecipe,
  type ReactionSummary,
} from "@/services/householdService";
import { useAuth } from "@/hooks/use-auth";
import { getFirstName } from "@/lib/getFirstName";

// Shows a member's email prefix rather than the full address — enough to
// recognize "who's who" in a small group without spelling out emails.
function memberLabel(email: string | null, isMe: boolean): string {
  if (isMe) return "Toi";
  if (!email) return "Membre";
  return email.split("@")[0];
}

// Recipes list is already ordered by savedAt desc (see /api/recipes/household),
// so newest-first is a given — this badge just makes "someone in the bande
// just added this" visible at a glance instead of requiring a mental diff
// against the last visit.
const NEW_BADGE_WINDOW_MS = 48 * 60 * 60 * 1000;
function isRecentlySaved(savedAt: string): boolean {
  return Date.now() - new Date(savedAt).getTime() < NEW_BADGE_WINDOW_MS;
}

// Shared by every "Inviter" entry point (the panel button, the solo-bande
// nudge, the empty-recipes CTA) so the toast/error handling only lives once.
async function handleInviteClick(inviteCode: string) {
  try {
    const result = await shareInviteLink(inviteCode);
    if (result === "copied") toast.success("Lien d'invitation copié !");
  } catch {
    toast.error("Impossible de partager. Réessaie dans un instant.");
  }
}

// Slack-style reactions on a bande's shared recipes: existing reaction pills
// (highlighted if the caller already picked that emoji) plus a "+" opening
// the curated picker. Lives outside the card's <Link> (see recipes.map
// below) so tapping a pill/emoji never triggers navigation.
const ReactionBar = ({ savedRecipeId, reactions }: { savedRecipeId: string; reactions: ReactionSummary[] }) => {
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handlePick = async (emoji: string) => {
    setPickerOpen(false);
    setPending(true);
    try {
      const updated = await toggleReaction(savedRecipeId, emoji);
      queryClient.setQueryData<HouseholdRecipe[]>(["recipes", "household"], (current) =>
        current?.map((r) => (r.savedRecipeId === savedRecipeId ? { ...r, reactions: updated } : r))
      );
    } catch {
      toast.error("Impossible d'enregistrer ta réaction. Réessaie dans un instant.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => handlePick(r.emoji)}
          disabled={pending}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
            r.reactedByMe
              ? "bg-primary/10 border-primary/40 text-primary"
              : "bg-card border-border text-foreground hover:bg-muted"
          }`}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
      <div className="relative">
        <button
          onClick={() => setPickerOpen((prev) => !prev)}
          disabled={pending}
          aria-label="Ajouter une réaction"
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>
        {pickerOpen && (
          <div className="absolute z-10 bottom-full left-0 mb-1 flex gap-0.5 p-1.5 rounded-full bg-popover border border-border shadow-lg">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handlePick(emoji)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted text-base"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CreateOrJoinPanel = ({ onDone, initialCode }: { onDone: () => void; initialCode?: string }) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode ?? "");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createHousehold(name.trim() || undefined);
      toast.success("Bande créée !");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer la bande.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    try {
      await joinHousehold(code.trim());
      toast.success("Tu as rejoint la bande !");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de rejoindre cette bande.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
      <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm p-6 shadow-lg">
        <h2 className="text-lg font-display font-semibold mb-1">Créer une bande</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Invite ensuite les autres avec un code à partager.
        </p>
        <Label htmlFor="bande-name" className="sr-only">
          Nom de la bande
        </Label>
        <Input
          id="bande-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la bande (optionnel)"
          className="mb-3"
        />
        <Button onClick={handleCreate} disabled={creating} className="w-full">
          {creating ? "Création…" : "Créer ma bande"}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm p-6 shadow-lg">
        <h2 className="text-lg font-display font-semibold mb-1">Rejoindre une bande</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Demande le code à un membre de la bande.
        </p>
        <Label htmlFor="bande-code" className="sr-only">
          Code d'invitation
        </Label>
        <Input
          id="bande-code"
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

  const startEditingName = () => {
    setNameDraft(household.name ?? "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    setSavingName(true);
    try {
      await renameHousehold(nameDraft.trim());
      toast.success("Nom de la bande mis à jour.");
      setEditingName(false);
      onRenamed();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de renommer la bande.");
    } finally {
      setSavingName(false);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await leaveHousehold();
      toast.success("Tu as quitté la bande.");
      onLeft();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de quitter la bande.");
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

  const isSolo = household.members.length === 1;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 max-w-4xl mx-auto mb-6 px-4 py-3 rounded-xl border border-border bg-card/70 backdrop-blur-sm shadow-sm">
      {editingName ? (
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Users className="w-5 h-5 shrink-0 text-muted-foreground" />
          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Nom de la bande"
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
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-display font-semibold flex items-center gap-2 truncate">
            <Users className="w-5 h-5 text-muted-foreground shrink-0" />
            {household.name || "Ma bande"}
          </h2>
          <button
            onClick={startEditingName}
            aria-label="Renommer la bande"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground shrink-0">
            · {household.members.length} membre{household.members.length > 1 ? "s" : ""}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 shrink-0">
        {/* Growth loop trigger #1: a solo bande has zero value (nobody else's
            recipes to see), so this stays the primary action — right after
            creating it, and every time the creator comes back before anyone's
            joined — but as a single button rather than a standalone panel. */}
        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" variant={isSolo ? "default" : "outline"} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Inviter
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Inviter dans "{household.name || "Ma bande"}"</SheetTitle>
              <SheetDescription>
                Partage le code ou le lien ci-dessous pour ajouter quelqu'un à ta bande.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-2">Code d'invitation</p>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="px-3 py-2 rounded-lg bg-muted font-mono text-lg tracking-widest">{inviteCode}</code>
                <Button variant="outline" size="icon" onClick={handleCopyCode} aria-label="Copier le code">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleRegenerate} disabled={regenerating} aria-label="Régénérer le code">
                  <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <Button onClick={() => handleInviteClick(inviteCode)} className="gap-2 w-full mt-3">
                <Share2 className="w-4 h-4" />
                Partager le lien d'invitation
              </Button>
            </div>

            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-2">
                {household.members.length} membre{household.members.length > 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {household.members.map((member) => (
                  <span
                    key={member.userId}
                    className="px-3 py-1 rounded-full bg-muted text-sm text-foreground"
                  >
                    {memberLabel(member.email, member.isMe)}
                  </span>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Button variant="ghost" size="sm" onClick={handleLeave} disabled={leaving} className="text-muted-foreground">
          <LogOut className="w-4 h-4" />
          {leaving ? "..." : "Quitter"}
        </Button>
      </div>
    </div>
  );
};

const BandePage = () => {
  const { user } = useAuth();
  const firstName = getFirstName(user);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  // Joining via an invite link shared from HouseholdPanel's "Inviter" button
  // (/bande?join=CODE) — see shareInviteLink in householdService.ts.
  const joinCodeFromLink = searchParams.get("join")?.toUpperCase();
  // Auto-joins instead of just prefilling the "Rejoindre" field: leaving it
  // as a manual step meant people landing on this page via the link would
  // see "Créer une bande" sitting right next to it and tap that instead,
  // ending up with a brand new bande rather than the one they were invited to.
  const [linkJoinState, setLinkJoinState] = useState<"idle" | "joining" | "failed">(
    joinCodeFromLink ? "joining" : "idle"
  );
  const linkJoinAttempted = useRef(false);

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

  useEffect(() => {
    if (householdLoading || household || !joinCodeFromLink || linkJoinAttempted.current) return;
    linkJoinAttempted.current = true;
    joinHousehold(joinCodeFromLink)
      .then(() => {
        toast.success("Tu as rejoint la bande !");
        setSearchParams({}, { replace: true });
        refreshHousehold();
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Impossible de rejoindre cette bande.");
        setLinkJoinState("failed");
      });
  }, [householdLoading, household, joinCodeFromLink]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8 pt-28">
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-2">Ma Bande</h1>
            <p className="text-muted-foreground">
              {firstName ? `Salut ${firstName}, ` : ""}
              voici les recettes croquées par ta bande.
            </p>
          </div>
        </div>

        {(householdLoading || (!household && linkJoinState === "joining")) && (
          <div className="text-center text-muted-foreground py-12">
            {householdLoading ? "Chargement…" : "Connexion à ta bande…"}
          </div>
        )}

        {!householdLoading && !household && linkJoinState !== "joining" && (
          <CreateOrJoinPanel onDone={refreshHousehold} initialCode={joinCodeFromLink} />
        )}

        {!householdLoading && household && (
          <>
            <HouseholdPanel household={household} onLeft={refreshHousehold} onRenamed={refreshHousehold} />

            {isRecipesError && (
              <div className="text-center text-muted-foreground py-8">
                Impossible de charger les recettes de la bande. Réessaie dans un instant.
              </div>
            )}

            {!isRecipesError && recipes.length === 0 && (
              <div className="flex flex-col items-center gap-4 text-center py-16 text-muted-foreground">
                <UtensilsCrossed className="w-10 h-10" />
                <p>Personne n'a encore ajouté de recette dans cette bande.</p>
                {/* Growth loop trigger #2: same nudge, surfaced again at the
                    point where the emptiness is most visible — the recipe
                    grid itself, not just the panel above it. */}
                {household.members.length === 1 && (
                  <Button onClick={() => handleInviteClick(household.inviteCode)} className="gap-2">
                    <Share2 className="w-4 h-4" />
                    Inviter du monde
                  </Button>
                )}
              </div>
            )}

            {recipes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map((recipe) => (
                  <div
                    key={`${recipe.id}-${recipe.savedByUserId}`}
                    className="group relative overflow-hidden rounded-xl bg-card/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-border"
                  >
                    <Link to={`/recipe/${recipe.id}`} className="block">
                      <div className="h-48 overflow-hidden relative">
                        <RecipeImage
                          recipe={recipe}
                          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                          className="group-hover:scale-105"
                        />
                        {isRecentlySaved(recipe.savedAt) && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-sm">
                            Nouveau
                          </span>
                        )}
                      </div>
                      <div className="p-4 pb-3 bg-card/50 backdrop-blur-sm">
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
                    <div className="px-4 pb-4 bg-card/50 backdrop-blur-sm">
                      <ReactionBar savedRecipeId={recipe.savedRecipeId} reactions={recipe.reactions} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BandePage;
