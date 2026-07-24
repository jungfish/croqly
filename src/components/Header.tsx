import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu, Download } from 'lucide-react';
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

  const showInstall = !isStandalone && (canInstall || isIOS);
  const handleInstallClick = () => {
    if (isIOS) {
      toast("Installer Croqly", {
        description: "Appuyez sur Partager puis « Sur l'écran d'accueil ».",
      });
      return;
    }
    promptInstall();
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

  const navLinks = (
    <>
      <Link to="/" className={linkClass}>
        Accueil
      </Link>
      <Link to="/decouvrir" className={linkClass}>
        Découvrir
      </Link>
      <Link to="/assistant" className={linkClass}>
        Assistant
      </Link>
      <Link to="/recipes" className={linkClass}>
        Mes Recettes
      </Link>
      <Link to="/shopping-list" className={`${linkClass} relative inline-flex items-center gap-1.5`}>
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
      {user ? (
        <button onClick={() => signOut()} className={linkClass}>
          Déconnexion
        </button>
      ) : (
        <Link to="/login" className={linkClass}>
          Connexion
        </Link>
      )}
    </>
  );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 transition-colors duration-300 ${
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

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks}
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

        {/* Mobile nav — a real drawer instead of squeezing links into the bar */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Menu"
              className={shouldBeLight ? 'text-white hover:text-white/80 hover:bg-white/10' : ''}
            >
              <Menu className="w-6 h-6" />
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
              <Link to="/assistant" className="text-lg text-foreground/80 hover:text-foreground">
                Assistant
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link to="/recipes" className="text-lg text-foreground/80 hover:text-foreground">
                Mes Recettes
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
            {user ? (
              <SheetClose asChild>
                <button onClick={() => signOut()} className="text-lg text-left text-foreground/80 hover:text-foreground">
                  Déconnexion
                </button>
              </SheetClose>
            ) : (
              <SheetClose asChild>
                <Link to="/login" className="text-lg text-foreground/80 hover:text-foreground">
                  Connexion
                </Link>
              </SheetClose>
            )}
            {showInstall && (
              <Button onClick={handleInstallClick} className="mt-2">
                <Download className="w-4 h-4" />
                Installer l'app
              </Button>
            )}
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
};

export default Header;
