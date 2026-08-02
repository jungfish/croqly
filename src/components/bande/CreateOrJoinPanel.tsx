import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createHousehold, joinHousehold, type Household } from "@/services/householdService";

// Used both as the full-page "get started" screen (no bande yet) and inside
// the switcher's "+" sheet (adding another bande on top of existing ones) —
// callers tell the two apart via layout/context, not this component's props.
const CreateOrJoinPanel = ({
  onDone,
  initialCode,
}: {
  onDone: (household: Household) => void;
  initialCode?: string;
}) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode ?? "");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const household = await createHousehold(name.trim() || undefined);
      toast.success("Bande créée !");
      onDone(household);
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
      const household = await joinHousehold(code.trim());
      toast.success("Tu as rejoint la bande !");
      onDone(household);
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

export default CreateOrJoinPanel;
