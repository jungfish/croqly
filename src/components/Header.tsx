import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu, Download, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useHero } from '@/hooks/use-hero';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { fetchShoppingList, type ShoppingListItem } from '@/services/shoppingListService';
import { fetchMyHouseholds, shareInviteLink, type Household } from '@/services/householdService';
import { isAdminUser } from '@/lib/admin';

// Below this scroll offset the hero image is still filling the header's
// backdrop, so the "light" (white) styling stays legible without a
// background. Past it, the header sits over plain page content and needs
// to flip to the normal foreground styling plus an opaque backdrop.
const HERO_SCROLL_THRESHOLD = 180;

const Header = () => {
  const { user, signOut } = useAuth();
  const { hasHero } = useHero();
  const { canInstall, isIOS, isStandalone, promptInstall } = usePwaInstall();
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  // Same query key as the shopping-list page, so this badge stays in sync
  // with any add/check/delete done there without extra polling.
  const { data: shoppingListItems = [] } = useQuery<ShoppingListItem[]>({
    queryKey: ['shopping-list'],
    queryFn: fetchShoppingList,
    enabled: !!user,
  });
  const remainingCount = shoppingListItems.filter((item) => !item.checked).length;
  const showAdminLink = isAdminUser(user);

  const { data: households = [] } = useQuery<Household[]>({
    queryKey: ['households'],
    queryFn: fetchMyHouseholds,
    enabled: !!user,
  });

  // Standing growth-loop entry point (distinct from the nudges on /bande
  // itself, see bande.tsx) — surfaces the invite action wherever the user
  // happens to be in the app, not just when they land on the Bande page.
  // Only fires the one-tap share when there's exactly one bande to invite
  // to; with several, the link below routes to /bande instead so the
  // caller picks which one (see the Link/Button branch further down).
  const handleInviteClick = async () => {
    if (households.length !== 1) return;
    try {
      const result = await shareInviteLink(households[0].inviteCode, households[0].name);
      if (result === 'copied') toast.success("Lien d'invitation copié !");
    } catch {
      toast.error('Impossible de partager. Réessaie dans un instant.');
    }
  };

  const showInstall = !isStandalone && (canInstall || isIOS);
  const handleInstallClick = async () => {
    if (isIOS) {
      toast("Installer Croqly", {
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

  useEffect(() => {
    if (!hasHero) {
      setScrolledPastHero(false);
      return;
    }
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolledPastHero(window.scrollY > HERO_SCROLL_THRESHOLD);
        ticking = false;
      });
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasHero]);

  const shouldBeLight = hasHero && !scrolledPastHero;
  const linkClass = `${shouldBeLight ? 'text-white hover:text-white/80' : 'text-foreground/70 hover:text-foreground'} transition-colors`;

  // Signed-out visitors only get the pages they can actually use without an
  // account — the auth-gated links (Mes Recettes, Bande, Liste de courses)
  // would just bounce them to /login, so they're clutter here and are
  // reserved for the signed-in nav below.
  const publicNavLinks = (
    <>
      <Link to="/" className={linkClass}>
        Accueil
      </Link>
      <Link to="/decouvrir" className={linkClass}>
        Découvrir
      </Link>
      <Link to="/assistant" className={`${linkClass} inline-flex items-center gap-1.5`}>
        Croq
        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none">
          IA
        </span>
      </Link>
    </>
  );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 transition-colors duration-300 ${
        user ? 'md:hidden' : ''
      } ${
        hasHero && scrolledPastHero
          ? 'bg-background/90 backdrop-blur-sm border-b border-border'
          : ''
      }`}
    >
      <nav className="container mx-auto flex items-center justify-between">
        <Link to="/">
          <Logo
            variant={shouldBeLight ? 'paper' : 'color'}
            wordmarkClassName={shouldBeLight ? 'text-white' : 'text-foreground'}
          />
        </Link>

        {/* Desktop nav — logged-in users get the AppSidebar instead, so this
            (and the header itself) is md:hidden once a session exists; only
            the signed-out, account-creation-focused version ever shows. */}
        {!user && (
          <div className="hidden md:flex items-center gap-6">
            {publicNavLinks}
            <Link to="/login" className={linkClass}>
              Connexion
            </Link>
            <Button asChild size="sm">
              <Link to="/signup">Créer un compte</Link>
            </Button>
            {showInstall && (
              <Button
                variant={shouldBeLight ? 'outline' : 'default'}
                size="sm"
                onClick={handleInstallClick}
                className={shouldBeLight ? 'border-white/40 text-white hover:bg-white/10 hover:text-white' : ''}
              >
                <Download className="w-4 h-4" />
                Installer l'app
              </Button>
            )}
          </div>
        )}

        {/* Mobile nav — a real drawer instead of squeezing links into the bar */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label={remainingCount > 0 ? `Menu, ${remainingCount} article${remainingCount > 1 ? 's' : ''} à acheter` : 'Menu'}
              className={`relative ${shouldBeLight ? 'text-white hover:text-white/80 hover:bg-white/10' : ''}`}
            >
              <Menu className="w-6 h-6" />
              {remainingCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-0.5 right-0.5 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-primary text-primary-foreground text-[0.65rem] font-semibold leading-none"
                >
                  {remainingCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col gap-6 pt-[max(3rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]">
            <SheetClose asChild>
              <Link to="/" className="text-lg text-foreground/80 hover:text-foreground">
                Accueil
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link to="/decouvrir" className="text-lg text-foreground/80 hover:text-foreground">
                Découvrir
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link to="/assistant" className="text-lg text-foreground/80 hover:text-foreground inline-flex items-center gap-2">
                Croq
                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  IA
                </span>
              </Link>
            </SheetClose>

            {user ? (
              <>
                <SheetClose asChild>
                  <Link to="/recipes" className="text-lg text-foreground/80 hover:text-foreground">
                    Mes Recettes
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/bande" className="text-lg text-foreground/80 hover:text-foreground">
                    Bande
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/laser-croq" className="text-lg text-foreground/80 hover:text-foreground">
                    Laser Croq
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/shopping-list" className="text-lg text-foreground/80 hover:text-foreground inline-flex items-center gap-2">
                    Liste de courses
                    {remainingCount > 0 && (
                      <span
                        className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
                        aria-label={`${remainingCount} article${remainingCount > 1 ? 's' : ''} à acheter`}
                      >
                        {remainingCount}
                      </span>
                    )}
                  </Link>
                </SheetClose>
                {showAdminLink && (
                  <SheetClose asChild>
                    <Link to="/admin" className="text-lg text-foreground/80 hover:text-foreground">
                      Admin
                    </Link>
                  </SheetClose>
                )}
                <SheetClose asChild>
                  <button onClick={handleSignOut} className="text-lg text-left text-foreground/80 hover:text-foreground">
                    Déconnexion
                  </button>
                </SheetClose>
              </>
            ) : (
              <>
                <SheetClose asChild>
                  <Link to="/login" className="text-lg text-foreground/80 hover:text-foreground">
                    Connexion
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild size="lg" className="w-full">
                    <Link to="/signup">Créer un compte</Link>
                  </Button>
                </SheetClose>
              </>
            )}

            {showInstall && (
              <Button
                variant={user ? 'default' : 'outline'}
                onClick={handleInstallClick}
                className="mt-2"
              >
                <Download className="w-4 h-4" />
                Installer l'app
              </Button>
            )}

            {households.length === 1 && (
              <SheetClose asChild>
                <Button onClick={handleInviteClick} className="mt-auto gap-2">
                  <UserPlus className="w-4 h-4" />
                  Inviter à la bande
                </Button>
              </SheetClose>
            )}
            {households.length > 1 && (
              <SheetClose asChild>
                <Button asChild className="mt-auto gap-2">
                  <Link to="/bande">
                    <UserPlus className="w-4 h-4" />
                    Inviter à une bande
                  </Link>
                </Button>
              </SheetClose>
            )}
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
};

export default Header;
