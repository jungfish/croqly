import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, UtensilsCrossed, Zap } from "lucide-react";
import BandeSwitcher from "@/components/bande/BandeSwitcher";
import HouseholdPanel from "@/components/bande/HouseholdPanel";
import CreateOrJoinPanel from "@/components/bande/CreateOrJoinPanel";
import BandeRecipesTab from "@/components/bande/BandeRecipesTab";
import BandeLaserCroqTab from "@/components/bande/BandeLaserCroqTab";
import { fetchMyHouseholds, joinHousehold, type Household } from "@/services/householdService";
import { useAuth } from "@/hooks/use-auth";
import { getFirstName } from "@/lib/getFirstName";

const TABS = [
  { key: "recettes", label: "Recettes", icon: UtensilsCrossed },
  { key: "laser", label: "Laser Croq", icon: Zap },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const BandePage = () => {
  const { user } = useAuth();
  const firstName = getFirstName(user);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  // Joining via an invite link shared from HouseholdPanel's "Inviter" sheet
  // (/bande?join=CODE) — see shareInviteLink in householdService.ts.
  const joinCodeFromLink = searchParams.get("join")?.toUpperCase();
  const idFromUrl = searchParams.get("id");
  const activeTab: TabKey = searchParams.get("tab") === "laser" ? "laser" : "recettes";

  const [selectedId, setSelectedId] = useState<string | null>(idFromUrl);
  // Auto-joins instead of just prefilling a field: leaving it as a manual
  // step meant people landing on this page via the link would see "Créer
  // une bande" sitting right next to it and tap that instead, ending up
  // with a brand new bande rather than the one they were invited to.
  const [joiningViaLink, setJoiningViaLink] = useState(Boolean(joinCodeFromLink));
  const linkJoinAttempted = useRef(false);

  const { data: households, isLoading: householdsLoading } = useQuery<Household[]>({
    queryKey: ["households"],
    queryFn: fetchMyHouseholds,
  });

  const refreshHouseholds = () => queryClient.invalidateQueries({ queryKey: ["households"] });

  const selectHousehold = (id: string) => {
    setSelectedId(id);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("id", id);
        return next;
      },
      { replace: true }
    );
  };

  const selectTab = (tab: TabKey) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === "recettes") next.delete("tab");
        else next.set("tab", tab);
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    if (householdsLoading || !joinCodeFromLink || linkJoinAttempted.current) return;
    linkJoinAttempted.current = true;
    joinHousehold(joinCodeFromLink)
      .then((household) => {
        toast.success("Tu as rejoint la bande !");
        setSelectedId(household.id);
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete("join");
            next.set("id", household.id);
            return next;
          },
          { replace: true }
        );
        refreshHouseholds();
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Impossible de rejoindre cette bande.");
      })
      .finally(() => setJoiningViaLink(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdsLoading, joinCodeFromLink]);

  // Keeps selectedId valid once households load/change: defaults to the
  // first bande, and falls back to another one if the selected bande was
  // just left (or never existed, e.g. a stale ?id= from an old bookmark).
  useEffect(() => {
    if (!households || joiningViaLink) return;
    if (selectedId && households.some((h) => h.id === selectedId)) return;
    setSelectedId(households[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [households, joiningViaLink]);

  const selected = households?.find((h) => h.id === selectedId) ?? null;

  const showLoading = householdsLoading || joiningViaLink;
  const showEmptyState = !showLoading && (!households || households.length === 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8 pt-28">
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {activeTab === "laser" ? <Zap className="w-6 h-6" /> : <Users className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-2">Mes Bandes</h1>
            <p className="text-muted-foreground">
              {activeTab === "laser"
                ? "Des défis de dressage rigolos, à voter et commenter en bande."
                : `${firstName ? `Salut ${firstName}, ` : ""}voici les recettes croquées par tes bandes.`}
            </p>
          </div>
        </div>

        {showLoading && (
          <div className="text-center text-muted-foreground py-12">
            {householdsLoading ? "Chargement…" : "Connexion à ta bande…"}
          </div>
        )}

        {showEmptyState && (
          <CreateOrJoinPanel
            onDone={(household) => {
              refreshHouseholds();
              setSelectedId(household.id);
            }}
            initialCode={joinCodeFromLink}
          />
        )}

        {!showLoading && households && households.length > 0 && (
          <>
            <BandeSwitcher
              households={households}
              selectedId={selectedId}
              onSelect={selectHousehold}
              onAdded={(household) => {
                refreshHouseholds();
                selectHousehold(household.id);
              }}
            />

            {selected && (
              <>
                <HouseholdPanel household={selected} onLeft={refreshHouseholds} onRenamed={refreshHouseholds} />

                <div className="flex gap-2 max-w-4xl mx-auto mb-6">
                  {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => selectTab(key)}
                      className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        activeTab === key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {activeTab === "recettes" ? (
                  <BandeRecipesTab household={selected} />
                ) : (
                  <BandeLaserCroqTab householdId={selected.id} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BandePage;
