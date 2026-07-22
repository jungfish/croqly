import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

// Below this scroll offset the hero image is still filling the header's
// backdrop, so the "light" (white) styling stays legible without a
// background. Past it, the header sits over plain page content and needs
// to flip to the normal foreground styling plus an opaque backdrop.
const HERO_SCROLL_THRESHOLD = 180;

const Header = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const isRecipePage = location.pathname.includes('/recipe/');
  const isRecipeListPage = location.pathname === '/recipes' || location.pathname === '/decouvrir';
  const isShoppingListPage = location.pathname === '/shopping-list';
  const hasHero = isRecipePage || isRecipeListPage || isShoppingListPage;

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
      <Link to="/recipes" className={linkClass}>
        Mes Recettes
      </Link>
      <Link to="/shopping-list" className={linkClass}>
        Liste de courses
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
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 transition-colors duration-300 ${
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
        <div className="hidden md:flex items-center gap-6">{navLinks}</div>

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
          <SheetContent side="right" className="flex flex-col gap-6 pt-12">
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
              <Link to="/recipes" className="text-lg text-foreground/80 hover:text-foreground">
                Mes Recettes
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link to="/shopping-list" className="text-lg text-foreground/80 hover:text-foreground">
                Liste de courses
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
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
};

export default Header;
