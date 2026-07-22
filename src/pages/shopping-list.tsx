import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShoppingCart, Trash2 } from 'lucide-react';
import ParallaxHero from '@/components/ParallaxHero';
import { Button } from '@/components/ui/button';
import {
  fetchShoppingList,
  toggleShoppingListItem,
  deleteShoppingListItem,
  clearCheckedItems,
  type ShoppingListItem,
} from '@/services/shoppingListService';
import { useAuth } from '@/hooks/use-auth';
import { getFirstName } from '@/lib/getFirstName';
import { emojiForIngredient } from '@/lib/ingredientEmoji';

const ShoppingListPage = () => {
  const { user } = useAuth();
  const firstName = getFirstName(user);
  const queryClient = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const { data: items = [] } = useQuery<ShoppingListItem[]>({
    queryKey: ['shopping-list'],
    queryFn: fetchShoppingList,
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
      toast.error("Impossible de mettre à jour cet article.");
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
    } catch {
      toast.error("Impossible de supprimer cet article.");
    } finally {
      setPending(id, false);
    }
  };

  const handleClearChecked = async () => {
    try {
      await clearCheckedItems();
      queryClient.setQueryData<ShoppingListItem[]>(['shopping-list'], (current) =>
        current?.filter((i) => !i.checked)
      );
    } catch {
      toast.error("Impossible de vider les articles cochés.");
    }
  };

  const hasChecked = items.some((item) => item.checked);

  return (
    <div className="min-h-screen bg-background">
      <ParallaxHero
        imageUrl="https://images.unsplash.com/photo-1542838132-92c53300491e"
        title="Liste de courses"
        height="h-[200px] sm:h-[240px] lg:h-[300px]"
      />

      <div className="container mx-auto p-8 -mt-8 relative z-10 max-w-2xl">
        <p className="text-center text-muted-foreground mb-8">
          {firstName ? `${firstName}, voici` : 'Voici'} tout ce qu'il te faut pour tes prochaines recettes !
        </p>

        {hasChecked && (
          <div className="mb-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={handleClearChecked}>
              Vider les articles cochés
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
          <ul className="space-y-2">
            {items.map((item) => (
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
        )}
      </div>
    </div>
  );
};

export default ShoppingListPage;
