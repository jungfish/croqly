import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Check, Crown, MessageCircle, Plus, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import BandeSwitcher from "@/components/bande/BandeSwitcher";
import ReactionBurst from "@/components/ReactionBurst";
import PlatingReactionBar from "@/components/PlatingReactionBar";
import { useInViewOnce } from "@/hooks/use-in-view-once";
import { fetchMyHouseholds, fetchHouseholdRecipes, type Household, type HouseholdRecipe } from "@/services/householdService";
import {
  fetchChallenges,
  fetchDressageFeed,
  createChallenge,
  toggleVote,
  type PlatingChallengeCard,
  type PlatingFeedItem,
  type PlatingReactionSummary,
} from "@/services/platingChallengeService";
import { useAuth } from "@/hooks/use-auth";

// Sentinel value (no real duration is ever this large) marking the
// "Personnaliser" option — picking it swaps the duration buttons for a
// datetime-local input so a challenge doesn't have to wait for the next
// Sunday (or whatever preset) to reveal.
const CUSTOM_DAYS = -1;

const DURATIONS = [
  { label: "1 jour", days: 1 },
  { label: "3 jours", days: 3 },
  { label: "1 semaine", days: 7 },
  { label: "Personnaliser", days: CUSTOM_DAYS },
];

// yyyy-MM-ddTHH:mm in the browser's local timezone — datetime-local inputs
// need this exact format and don't accept an ISO string with seconds/Z.
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function memberLabel(email: string | null, isMe: boolean): string {
  if (isMe) return "Toi";
  return email ? email.split("@")[0] : "Membre";
}

function timeLeftLabel(endsAt: string): string {
  const msLeft = new Date(endsAt).getTime() - Date.now();
  if (msLeft <= 0) return "Terminé";
  const hours = Math.round(msLeft / (60 * 60 * 1000));
  if (hours < 24) return `${hours}h restantes`;
  return `${Math.round(hours / 24)}j restants`;
}

// Recipe picker for the "Nouveau défi" sheet — a bande can have dozens of
// saved recipes, so this is a search-filtered scrollable list of buttons
// rather than a native <select>; there's no Select primitive in this app's
// component kit yet (see src/components/ui/), and a filter input plus a
// handful of styled buttons is enough. The selected recipe always stays
// pinned at the top so picking one and then typing a different search
// doesn't make it look like the selection was lost.
const RecipePicker = ({
  recipes,
  selectedId,
  onSelect,
}: {
  recipes: HouseholdRecipe[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) => {
  const [search, setSearch] = useState("");
  const selected = recipes.find((r) => r.savedRecipeId === selectedId);
  const filtered = recipes.filter(
    (r) => r.savedRecipeId !== selectedId && r.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {recipes.length > 5 && (
        <div className="p-2 border-b border-border">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher une recette…"
            className="h-8 text-sm"
          />
        </div>
      )}
      <div className="max-h-56 overflow-y-auto divide-y divide-border">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
            selectedId === null ? "bg-primary/10 text-primary" : "hover:bg-muted"
          }`}
        >
          {selectedId === null && <Check className="w-4 h-4 shrink-0" />}
          <span className={selectedId === null ? "" : "pl-6"}>Dressage libre (pas de recette précise)</span>
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(selected.savedRecipeId)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left bg-primary/10 text-primary"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span className="truncate">{selected.title}</span>
          </button>
        )}
        {filtered.length === 0 && search.trim() ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">Aucune recette ne correspond.</p>
        ) : (
          filtered.map((recipe) => (
            <button
              key={recipe.savedRecipeId}
              type="button"
              onClick={() => onSelect(recipe.savedRecipeId)}
              className="w-full flex items-center gap-2 px-3 py-2 pl-9 text-sm text-left transition-colors hover:bg-muted truncate"
            >
              {recipe.title}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

const NewChallengeSheet = ({ householdId, onCreated }: { householdId: string; onCreated: (id: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [days, setDays] = useState(3);
  const [customDateTime, setCustomDateTime] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: recipes = [] } = useQuery<HouseholdRecipe[]>({
    queryKey: ["recipes", "household", householdId],
    queryFn: () => fetchHouseholdRecipes(householdId),
    enabled: open,
  });

  const handleCreate = async () => {
    if (!title.trim() || creating) return;
    if (days === CUSTOM_DAYS && !customDateTime) return;
    setCreating(true);
    try {
      const { id } = await createChallenge(householdId, {
        title: title.trim(),
        savedRecipeId: recipeId ?? undefined,
        ...(days === CUSTOM_DAYS
          ? { endsAt: new Date(customDateTime).toISOString() }
          : { durationDays: days }),
      });
      toast.success("Défi lancé !");
      setOpen(false);
      setTitle("");
      setRecipeId(null);
      setCustomDateTime("");
      onCreated(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de lancer le défi.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau défi
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Nouveau défi Laser Croq
          </SheetTitle>
          <SheetDescription>Lance un défi de dressage à ta bande — avec ou sans recette précise.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Nom du défi</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Dressage du dimanche"
              maxLength={80}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Basé sur une recette ? (optionnel)</label>
            <RecipePicker recipes={recipes} selectedId={recipeId} onSelect={setRecipeId} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Reveal</label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => {
                    setDays(d.days);
                    if (d.days === CUSTOM_DAYS && !customDateTime) {
                      setCustomDateTime(toDatetimeLocalValue(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)));
                    }
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    days === d.days
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {days === CUSTOM_DAYS && (
              <input
                type="datetime-local"
                value={customDateTime}
                min={toDatetimeLocalValue(new Date())}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            )}
          </div>

          <Button
            onClick={handleCreate}
            disabled={!title.trim() || creating || (days === CUSTOM_DAYS && !customDateTime)}
            className="w-full gap-2"
          >
            <Zap className="w-4 h-4" />
            {creating ? "Lancement…" : "Lancer le défi"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const ChallengeCard = ({ challenge }: { challenge: PlatingChallengeCard }) => {
  const [ref, inView] = useInViewOnce<HTMLAnchorElement>();

  return (
    <Link
      ref={ref}
      to={`/laser-croq/${challenge.id}`}
      className="group relative overflow-hidden rounded-xl bg-card/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-border block"
    >
      <div className="h-36 overflow-hidden relative bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 flex items-center justify-center">
        {challenge.recipe?.thumb ? (
          <img
            src={challenge.recipe.thumb}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Camera className="w-10 h-10 text-primary/50" />
        )}
        <span
          className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm ${
            challenge.isOpen ? "bg-primary text-primary-foreground" : "bg-foreground/80 text-background"
          }`}
        >
          {challenge.isOpen ? timeLeftLabel(challenge.endsAt) : "Terminé"}
        </span>
        {challenge.hasSubmittedByMe && challenge.isOpen && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-background/90 text-foreground text-xs font-semibold shadow-sm flex items-center gap-1">
            <Check className="w-3 h-3" /> Envoyé
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display font-semibold text-foreground mb-1 truncate">{challenge.title}</h3>
        {challenge.recipe && <p className="text-xs text-muted-foreground truncate mb-2">{challenge.recipe.title}</p>}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {challenge.submissionsCount} dressage{challenge.submissionsCount > 1 ? "s" : ""}
          </span>
          {challenge.winner && (
            <span className={`flex items-center gap-1 font-medium text-foreground ${inView ? "winner-pop" : "opacity-0"}`}>
              <Trophy className="w-3.5 h-3.5 text-yolk" />
              {memberLabel(challenge.winner.email, false)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

const DressageFeedCard = ({ item, isMine }: { item: PlatingFeedItem; isMine: boolean }) => {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [reactions, setReactions] = useState<PlatingReactionSummary[]>(item.reactions);
  const [burstKey, setBurstKey] = useState(0);
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  // Replays the whole reaction burst once the card scrolls into view (if
  // anyone's already reacted) — the "chacun voit toutes les réactions
  // quand la card est vue" ask.
  useEffect(() => {
    if (inView && reactions.some((r) => r.count > 0)) setBurstKey((k) => k + 1);
  }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVote = async () => {
    if (isMine || pending) return;
    setPending(true);
    try {
      const updated = await toggleVote(item.id);
      queryClient.setQueryData<PlatingFeedItem[]>(["laser-croq", "feed", item.challengeId], (current) =>
        current?.map((f) => (f.id === item.id ? { ...f, votesCount: updated.votesCount, votedByMe: updated.votedByMe } : f))
      );
      queryClient.invalidateQueries({ queryKey: ["laser-croq", "feed"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer ton vote.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div ref={ref} className="group relative overflow-hidden rounded-xl bg-card/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-border">
      <Link to={`/laser-croq/${item.challengeId}`} className="block">
        <div className="h-48 overflow-hidden relative">
          <img
            src={item.photoThumbUrl}
            alt={item.caption ?? item.challengeTitle}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <ReactionBurst key={burstKey} reactions={reactions} />
        </div>
        <div className="p-4 pb-3">
          <p className="text-xs text-muted-foreground mb-1 truncate">{item.challengeTitle}</p>
          {item.caption && <p className="text-sm text-foreground truncate">{item.caption}</p>}
          <p className="text-xs text-muted-foreground mt-1">Par {memberLabel(item.email, isMine)}</p>
        </div>
      </Link>
      <div className="px-4 pb-3 flex items-center gap-3">
        <button
          onClick={handleVote}
          disabled={isMine || pending}
          title={isMine ? "Tu ne peux pas voter pour ton propre dressage" : "Couronner ce dressage"}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
            item.votedByMe
              ? "bg-yolk/20 border-yolk text-yolk-deep"
              : "bg-card border-border text-foreground hover:bg-muted disabled:opacity-50"
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          {item.votesCount}
        </button>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MessageCircle className="w-3.5 h-3.5" />
          {item.commentsCount}
        </span>
      </div>
      <div className="px-4 pb-4">
        <PlatingReactionBar
          submissionId={item.id}
          reactions={reactions}
          onChange={(updated) => {
            setReactions(updated);
            setBurstKey((k) => k + 1);
          }}
        />
      </div>
    </div>
  );
};

const LaserCroqPage = () => {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: households = [], isLoading: householdsLoading } = useQuery<Household[]>({
    queryKey: ["households"],
    queryFn: fetchMyHouseholds,
  });

  const activeId = useMemo(
    () => (selectedId && households.some((h) => h.id === selectedId) ? selectedId : households[0]?.id ?? null),
    [selectedId, households]
  );

  const { data: challenges = [] } = useQuery<PlatingChallengeCard[]>({
    queryKey: ["laser-croq", "challenges", activeId],
    queryFn: () => fetchChallenges(activeId!),
    enabled: Boolean(activeId),
  });

  const { data: feed = [] } = useQuery<PlatingFeedItem[]>({
    queryKey: ["laser-croq", "feed", activeId],
    queryFn: () => fetchDressageFeed(activeId!),
    enabled: Boolean(activeId),
  });

  if (!householdsLoading && households.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-8 pt-28 text-center">
          <Zap className="w-10 h-10 mx-auto mb-4 text-primary" />
          <h1 className="font-display text-3xl text-foreground mb-2">Laser Croq</h1>
          <p className="text-muted-foreground mb-6">Rejoins ou crée une bande pour lancer ton premier défi de dressage.</p>
          <Button asChild>
            <Link to="/bande">Aller à Ma Bande</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8 pt-28">
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-2">Laser Croq</h1>
            <p className="text-muted-foreground">Des défis de dressage rigolos, à voter et commenter en bande.</p>
          </div>
        </div>

        {households.length > 0 && (
          <BandeSwitcher
            households={households}
            selectedId={activeId}
            onSelect={setSelectedId}
            onAdded={(household) => {
              setSelectedId(household.id);
              queryClient.invalidateQueries({ queryKey: ["households"] });
            }}
          />
        )}

        {activeId && (
          <>
            <div className="flex items-center justify-between mb-4 max-w-4xl mx-auto">
              <h2 className="font-display text-xl font-semibold text-foreground">Défis en cours</h2>
              <NewChallengeSheet householdId={activeId} onCreated={() => queryClient.invalidateQueries({ queryKey: ["laser-croq", "challenges", activeId] })} />
            </div>

            {challenges.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 mb-8">Aucun défi pour l'instant — lance le premier !</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
                {challenges.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </div>
            )}

            <h2 className="font-display text-xl font-semibold text-foreground mb-4">Feed des dressages</h2>
            {feed.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Camera className="w-10 h-10 mx-auto mb-3" />
                Aucun dressage réalisé pour l'instant.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {feed.map((item) => (
                  <DressageFeedCard key={item.id} item={item} isMine={item.userId === user?.id} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LaserCroqPage;
