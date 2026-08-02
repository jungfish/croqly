import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShoppingCart, Trash2, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  fetchShoppingList,
  addManualItemToShoppingList,
  toggleShoppingListItem,
  deleteShoppingListItem,
  clearCheckedItems,
  clearAllItems,
  fetchShoppingListShareStatus,
  shareShoppingListWith,
  unshareShoppingList,
  type ShoppingListItem,
  type ShoppingListShareStatus,
} from '@/services/shoppingListService';
import { fetchMyHousehold, type Household } from '@/services/householdService';
import { useAuth } from '@/hooks/use-auth';
import { getFirstName } from '@/lib/getFirstName';
import { emojiForIngredient } from '@/lib/ingredientEmoji';
import { iconForCategory, sortByCategory } from '@/lib/shoppingListCategories';

// Shows a member's email prefix rather than the full address — matches
// memberLabel in bande.tsx, enough to recognize "who's who" here too.
function memberLabel(email: string | null): string {
  return email ? email.split('@')[0] : 'Ce membre';
}

// Only rendered once the caller has a bande with at least one other member —
// solo bandes have nobody to share with. Shows either "you're viewing X's
// shared list" (nothing to configure here) or the sharing controls for the
// caller's own list.
const ShareListPanel = ({ household }: { household: Household }) => {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const { data: shareStatus } = useQuery<ShoppingListShareStatus>({
    queryKey: ['shopping-list', 'share'],
    queryFn: fetchShoppingListShareStatus,
  });

  const otherMembers = household.members.filter((m) => !m.isMe);
  if (otherMembers.length === 0) return null;

  const handleShare = async (userId: string) => {
    setPending(true);
    try {
      await shareShoppingListWith(userId);
      await queryClient.invalidateQueries({ queryKey: ['shopping-list', 'share'] });
      toast.success('Liste partagée !');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de partager la liste.');
    } finally {
      setPending(false);
    }
  };

  const handleUnshare = async () => {
    setPending(true);
    try {
      await unshareShoppingList();
      await queryClient.invalidateQueries({ queryKey: ['shopping-list', 'share'] });
      toast.success('Liste de courses redevenue privée.');
    } catch {
      toast.error('Impossible de retirer le partage.');
    } finally {
      setPending(false);
    }
  };

  if (shareStatus?.viewingSharedFrom) {
    return (
      <div className="mb-6 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground flex items-center gap-2">
        <Share2 className="w-4 h-4 shrink-0 text-primary" />
        Tu vois la liste partagée par {memberLabel(shareStatus.viewingSharedFrom.email)}.
      </div>
    );
  }

  if (shareStatus?.sharedWith) {
    return (
      <div className="mb-6 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between gap-3 flex-wrap text-sm">
        <span className="flex items-center gap-2 text-foreground">
          <Share2 className="w-4 h-4 shrink-0 text-primary" />
          Partagée avec {memberLabel(shareStatus.sharedWith.email)}
        </span>
        <Button variant="ghost" size="sm" onClick={handleUnshare} disabled={pending} className="gap-1.5 text-muted-foreground">
          <X className="w-3.5 h-3.5" />
          Ne plus partager
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-center gap-2 flex-wrap text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Share2 className="w-4 h-4 shrink-0" />
        Partager avec :
      </span>
      {otherMembers.map((member) => (
        <Button
          key={member.userId}
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => handleShare(member.userId)}
        >
          {memberLabel(member.email)}
        </Button>
      ))}
    </div>
  );
};

const ShoppingListPage = () => {
  const { user } = useAuth();
  const firstName = getFirstName(user);
  const queryClient = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [newItemText, setNewItemText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { data: items = [] } = useQuery<ShoppingListItem[]>({
    queryKey: ['shopping-list'],
    queryFn: fetchShoppingList,
  });

  const { data: household } = useQuery<Household | null>({
    queryKey: ['household', 'me'],
    queryFn: fetchMyHousehold,
  });

  const setPending = (id: string, pending: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // Optimistic: toggling a checkbox is pure local state, no need to wait on
  // the network round-trip before reflecting it.
  const handleToggle = async (item: ShoppingListItem) => {
    queryClient.setQueryData<ShoppingListItem[]>(['shopping-list'], (current) =>
      current?.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i))
    );
    try {
      await toggleShoppingListItem(item.id, !item.checked);
    } catch {
      toast.error("Impossible de mettre à jour cet article. Réessaie dans un instant.");
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    }
  };

  const handleDelete = async (id: string) => {
    setPending(id, true);
    try {
      await deleteShoppingListItem(id);
      queryClient.setQueryData<ShoppingListItem[]>(['shopping-list'], (current) =>
        current?.filter((i) => i.id !== id)
      );
      toast.success('Article retiré de ta liste.');
    } catch {
      toast.error("Impossible de supprimer cet article. Réessaie dans un instant.");
    } finally {
      setPending(id, false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newItemText.trim();
    if (!text || isAdding) return;
    setIsAdding(true);
    try {
      const updated = await addManualItemToShoppingList(text);
      queryClient.setQueryData(['shopping-list'], updated);
      setNewItemText('');
      toast.success('Article ajouté à ta liste de courses.');
    } catch {
      toast.error("Impossible d'ajouter cet article. Réessaie dans un instant.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleClearChecked = async () => {
    try {
      await clearCheckedItems();
      queryClient.setQueryData<ShoppingListItem[]>(['shopping-list'], (current) =>
        current?.filter((i) => !i.checked)
      );
      toast.success('Articles cochés retirés de ta liste.');
    } catch {
      toast.error("Impossible de vider les articles cochés. Réessaie dans un instant.");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Supprimer toute la liste de courses ?')) return;
    try {
      await clearAllItems();
      queryClient.setQueryData<ShoppingListItem[]>(['shopping-list'], []);
      toast.success('Ta liste de courses est vidée !');
    } catch {
      toast.error('Impossible de vider la liste de courses. Réessaie dans un instant.');
    }
  };

  const hasChecked = items.some((item) => item.checked);
  const groupedItems = sortByCategory(items);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8 pt-28 max-w-2xl">
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-2">Liste de courses</h1>
            <p className="text-muted-foreground">
              {firstName ? `${firstName}, voici` : 'Voici'} tout ce qu'il te faut pour tes prochaines recettes !
            </p>
          </div>
        </div>

        {household && <ShareListPanel household={household} />}

        <form onSubmit={handleAddItem} className="mb-1 flex gap-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Ajouter un article"
            aria-label="Ajouter un article"
            disabled={isAdding}
          />
          <Button type="submit" disabled={isAdding || !newItemText.trim()}>
            Ajouter
          </Button>
        </form>
        <p className="mb-6 text-xs text-muted-foreground">Ex : 2 sacs poubelle</p>

        {items.length > 0 && (
          <div className="mb-4 flex justify-end gap-2">
            {hasChecked && (
              <Button variant="outline" size="sm" onClick={handleClearChecked}>
                Vider les articles cochés
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              Tout supprimer
            </Button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 text-center py-16 text-muted-foreground">
            <ShoppingCart className="w-10 h-10" />
            <p>Ta liste de courses est vide pour l'instant.</p>
            <Link
              to="/recipes"
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg hover:bg-primary/90 transition-colors"
            >
              Voir mes recettes
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedItems.map(([category, categoryItems]) => (
              <div key={category}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  <span aria-hidden="true">{iconForCategory(category)}</span>
                  {category}
                </h2>
                <ul className="space-y-2">
                  {categoryItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card/70 backdrop-blur-sm border border-border shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleToggle(item)}
                        className="w-5 h-5 rounded border-input accent-primary shrink-0"
                        aria-label={`Cocher ${item.label}`}
                      />
                      <span className={`flex-1 flex items-center gap-2 ${item.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        <span aria-hidden="true">{emojiForIngredient(item.name)}</span>
                        {item.label}
                      </span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={pendingIds.has(item.id)}
                        aria-label={`Supprimer ${item.label}`}
                        className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingListPage;
