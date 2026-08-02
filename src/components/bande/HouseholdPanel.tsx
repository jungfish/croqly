import { useState } from "react";
import { toast } from "sonner";
import { Users, Copy, LogOut, RefreshCw, Share2, Pencil, Check, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { renameHousehold, leaveHousehold, regenerateInviteCode, type Household } from "@/services/householdService";
import { memberLabel, handleInviteClick } from "@/lib/bandeUtils";
import UserAvatar from "@/components/UserAvatar";

// Condensed header bar for the currently-selected bande: name (editable),
// member count, an "Inviter" sheet (code + share link + member list), and
// leave. The bande switcher above this handles moving between bandes.
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
      await renameHousehold(household.id, nameDraft.trim());
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
      await leaveHousehold(household.id);
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
      const newCode = await regenerateInviteCode(household.id);
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
        {/* Growth loop trigger: a solo bande has zero value (nobody else's
            recipes to see), so this stays the primary action — right after
            creating it, and every time the creator comes back before
            anyone's joined — but as a single button rather than a
            standalone panel. */}
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
              <Button onClick={() => handleInviteClick(inviteCode, household.name)} className="gap-2 w-full mt-3">
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
                    className="flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full bg-muted text-sm text-foreground"
                  >
                    <UserAvatar avatarKey={member.avatarKey} pseudo={member.pseudo} className="w-7 h-7" />
                    {memberLabel(member.pseudo, member.email, member.isMe)}
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

export default HouseholdPanel;
