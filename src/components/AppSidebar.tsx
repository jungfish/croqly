import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Compass, MessageCircle, BookOpen, Users, ShoppingCart, ShieldCheck, LogOut, Download, UserPlus, Zap, Bell, BellOff, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { fetchShoppingList, type ShoppingListItem } from '@/services/shoppingListService';
import { fetchMyHouseholds, shareInviteLink, type Household } from '@/services/householdService';
import { fetchPendingChallengeCount } from '@/services/platingChallengeService';
import { fetchMyProfile, type Profile } from '@/services/profileService';
import { isAdminUser } from '@/lib/admin';
import UserAvatar from '@/components/UserAvatar';
import ProfileSheet from '@/components/ProfileSheet';

const NAV_ITEMS = [
  { to: '/decouvrir', label: 'Découvrir', icon: Compass },
  { to: '/assistant', label: 'Croq', icon: MessageCircle, badge: 'IA' },
  { to: '/recipes', label: 'Mes Recettes', icon: BookOpen },
];

// Desktop-only app shell nav (Notion/Linear style) shown once a session
// exists — Header still handles the mobile drawer, so this never renders
// below md and doesn't duplicate its own trigger.
const AppSidebar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { canInstall, isIOS, isStandalone, promptInstall } = usePwaInstall();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: subscribeToPush, unsubscribe: unsubscribeFromPush } = usePushNotifications();

  const { data: shoppingListItems = [] } = useQuery<ShoppingListItem[]>({
    queryKey: ['shopping-list'],
    queryFn: fetchShoppingList,
    enabled: !!user,
  });
  const remainingCount = shoppingListItems.filter((item) => !item.checked).length;

  const { data: households = [] } = useQuery<Household[]>({
    queryKey: ['households'],
    queryFn: fetchMyHouseholds,
    enabled: !!user,
  });

  // Number of open Laser Croq défis the caller hasn't submitted a dressage
  // to yet, across every bande they're in — surfaced as a badge so "you owe
  // the bande a photo" is visible without opening Laser Croq to check.
  const { data: pendingChallengeCount = 0 } = useQuery<number>({
    queryKey: ['laser-croq', 'pending-count'],
    queryFn: fetchPendingChallengeCount,
    enabled: !!user,
  });

  const { data: profile } = useQuery<Profile>({
    queryKey: ['profile', 'me'],
    queryFn: fetchMyProfile,
    enabled: !!user,
  });

  const showAdminLink = isAdminUser(user);
  const showInstall = !isStandalone && (canInstall || isIOS);

  // Standing growth-loop entry point (distinct from the nudges on /bande
  // itself, see bande.tsx) — surfaces the invite action wherever the user
  // happens to be in the app, not just when they land on the Bande page.
  // Only fires the one-tap share when there's exactly one bande to invite
  // to; with several, the button below links to /bande instead so the
  // caller picks which one.
  const handleInviteClick = async () => {
    if (households.length !== 1) return;
    try {
      const result = await shareInviteLink(households[0].inviteCode, households[0].name);
      if (result === 'copied') toast.success("Lien d'invitation copié !");
    } catch {
      toast.error('Impossible de partager. Réessaie dans un instant.');
    }
  };

  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  const navClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active ? 'bg-primary/10 text-primary' : 'text-foreground/70 hover:bg-accent hover:text-foreground'
    }`;

  const linkClass = (to: string) => navClass(isActive(to));

  // Bande and Laser Croq now live on the same route (see bande.tsx's tabs),
  // so the plain pathname check above can't tell them apart — both would
  // otherwise light up together whichever tab is open.
  const isLaserCroqTab = location.pathname === '/bande' && new URLSearchParams(location.search).get('tab') === 'laser';
  const isBandeTab = location.pathname === '/bande' && !isLaserCroqTab;

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

  const handleTogglePush = async () => {
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush();
        toast('Notifications désactivées');
      } else {
        await subscribeToPush();
        toast.success('Notifications activées !');
      }
    } catch {
      toast.error('Impossible de mettre à jour les notifications. Réessaie dans un instant.');
    }
  };

  return (
    <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-64 md:flex-col md:border-r md:border-border md:bg-card">
      <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4">
        <Link to="/">
          <Logo markClassName="w-8 h-8" wordmarkClassName="text-foreground" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        <Button asChild className="w-full justify-start gap-3 mb-2">
          <Link to="/">
            <Plus className="w-4 h-4 shrink-0" />
            Ajouter une recette
          </Link>
        </Button>
        {NAV_ITEMS.map(({ to, label, icon: Icon, badge }) => (
          <Link key={to} to={to} className={linkClass(to)}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
            {badge && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                <Sparkles className="w-2.5 h-2.5" />
                {badge}
              </span>
            )}
          </Link>
        ))}
        <Link to="/bande" className={navClass(isBandeTab)}>
          <Users className="w-4 h-4 shrink-0" />
          Mes Bandes
        </Link>
        <Link to="/bande?tab=laser" className={`${navClass(isLaserCroqTab)} justify-between`}>
          <span className="flex items-center gap-3">
            <Zap className="w-4 h-4 shrink-0" />
            Laser Croq
          </span>
          {pendingChallengeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold animate-pulse">
              {pendingChallengeCount}
            </span>
          )}
        </Link>
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
        {households.length === 1 && (
          <Button onClick={handleInviteClick} className="w-full justify-start gap-3">
            <UserPlus className="w-4 h-4 shrink-0" />
            Inviter à la bande
          </Button>
        )}
        {households.length > 1 && (
          <Button asChild className="w-full justify-start gap-3">
            <Link to="/bande">
              <UserPlus className="w-4 h-4 shrink-0" />
              Inviter à une bande
            </Link>
          </Button>
        )}
        {showInstall && (
          <Button variant="outline" size="sm" onClick={handleInstallClick} className="w-full justify-start gap-3">
            <Download className="w-4 h-4" />
            Installer l'app
          </Button>
        )}
        {pushSupported && (
          <Button variant="outline" size="sm" onClick={handleTogglePush} disabled={pushLoading} className="w-full justify-start gap-3">
            {pushSubscribed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            {pushSubscribed ? 'Désactiver les notifs' : 'Activer les notifs'}
          </Button>
        )}
        <ProfileSheet
          profile={profile}
          trigger={
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 pt-1 pb-1 rounded-lg hover:bg-accent transition-colors"
              title={user?.email ?? ''}
            >
              <UserAvatar avatarKey={profile?.avatarKey} pseudo={profile?.pseudo} className="w-8 h-8" />
              <p className="truncate text-xs text-muted-foreground">{profile?.pseudo ?? user?.email}</p>
            </button>
          }
        />
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
