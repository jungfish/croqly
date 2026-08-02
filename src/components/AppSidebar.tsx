import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Home, Compass, MessageCircle, BookOpen, Users, ShoppingCart, ShieldCheck, LogOut, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { fetchShoppingList, type ShoppingListItem } from '@/services/shoppingListService';
import { isAdminUser } from '@/lib/admin';

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/decouvrir', label: 'Découvrir', icon: Compass },
  { to: '/assistant', label: 'Croq', icon: MessageCircle },
  { to: '/recipes', label: 'Mes Recettes', icon: BookOpen },
  { to: '/bande', label: 'Bande', icon: Users },
];

// Desktop-only app shell nav (Notion/Linear style) shown once a session
// exists — Header still handles the mobile drawer, so this never renders
// below md and doesn't duplicate its own trigger.
const AppSidebar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { canInstall, isIOS, isStandalone, promptInstall } = usePwaInstall();

  const { data: shoppingListItems = [] } = useQuery<ShoppingListItem[]>({
    queryKey: ['shopping-list'],
    queryFn: fetchShoppingList,
    enabled: !!user,
  });
  const remainingCount = shoppingListItems.filter((item) => !item.checked).length;
  const showAdminLink = isAdminUser(user);
  const showInstall = !isStandalone && (canInstall || isIOS);

  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  const linkClass = (to: string) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive(to) ? 'bg-primary/10 text-primary' : 'text-foreground/70 hover:bg-accent hover:text-foreground'
    }`;

  const handleInstallClick = async () => {
    if (isIOS) {
      toast('Installer Croqly', {
        description: "Appuyez sur Partager puis « Sur l'écran d'accueil ».",
      });
      return;
    }
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      toast.success('Croqly installée !');
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Impossible de se déconnecter. Réessaie dans un instant.');
      return;
    }
    toast.success('À bientôt !');
  };

  return (
    <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-64 md:flex-col md:border-r md:border-border md:bg-card">
      <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4">
        <Link to="/">
          <Logo markClassName="w-8 h-8" wordmarkClassName="text-foreground" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className={linkClass(to)}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
        <Link to="/shopping-list" className={`${linkClass('/shopping-list')} justify-between`}>
          <span className="flex items-center gap-3">
            <ShoppingCart className="w-4 h-4 shrink-0" />
            Liste de courses
          </span>
          {remainingCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {remainingCount}
            </span>
          )}
        </Link>
        {showAdminLink && (
          <Link to="/admin" className={linkClass('/admin')}>
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Admin
          </Link>
        )}
      </nav>

      <div className="px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 space-y-1 border-t border-border">
        {showInstall && (
          <Button variant="outline" size="sm" onClick={handleInstallClick} className="w-full justify-start gap-3">
            <Download className="w-4 h-4" />
            Installer l'app
          </Button>
        )}
        <p className="truncate px-3 pt-1 text-xs text-muted-foreground" title={user?.email ?? ''}>
          {user?.email}
        </p>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-accent hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
