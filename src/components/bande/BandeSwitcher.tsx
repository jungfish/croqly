import { useState } from "react";
import { Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import CreateOrJoinPanel from "@/components/bande/CreateOrJoinPanel";
import type { Household } from "@/services/householdService";

// Pill row for moving between the caller's bandes (family, friends, ...),
// plus a dashed "+" pill that opens the same create/join flow used for a
// brand-new caller, but for adding one more bande on top of existing ones.
const BandeSwitcher = ({
  households,
  selectedId,
  onSelect,
  onAdded,
}: {
  households: Household[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdded: (household: Household) => void;
}) => {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar max-w-4xl mx-auto">
      {households.map((household) => (
        <button
          key={household.id}
          onClick={() => onSelect(household.id)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            household.id === selectedId
              ? "bg-primary text-primary-foreground shadow-lg"
              : "bg-card border border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {household.name || "Bande"}
        </button>
      ))}

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <button
          onClick={() => setAddOpen(true)}
          aria-label="Nouvelle bande"
          className="shrink-0 px-4 py-2 rounded-full text-sm font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Nouvelle bande
        </button>
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Nouvelle bande</SheetTitle>
            <SheetDescription>
              Crée une bande pour un autre groupe (famille, potes...) ou rejoins-en une avec un code.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <CreateOrJoinPanel
              onDone={(household) => {
                setAddOpen(false);
                onAdded(household);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default BandeSwitcher;
