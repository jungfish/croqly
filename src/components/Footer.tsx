import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full pt-10 pb-[max(1.5rem,env(safe-area-inset-bottom))] px-4 border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 pb-8">
        <div className="col-span-2 sm:col-span-2">
          <Logo markClassName="w-8 h-8" wordmarkClassName="text-foreground" />
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            Colle un lien Instagram, Croqly transforme le reel en recette prête à cuisiner — ingrédients, quantités et étapes, sans repasser la vidéo dix fois.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Recettes</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/decouvrir" className="hover:text-foreground transition-colors">Découvrir des recettes</Link></li>
            <li><Link to="/recipes" className="hover:text-foreground transition-colors">Mes recettes</Link></li>
            <li><Link to="/shopping-list" className="hover:text-foreground transition-colors">Liste de courses</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Compte</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground transition-colors">Importer une recette</Link></li>
            <li><Link to="/signup" className="hover:text-foreground transition-colors">Créer un compte</Link></li>
            <li><Link to="/login" className="hover:text-foreground transition-colors">Connexion</Link></li>
          </ul>
        </div>
      </div>

      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 pt-6 border-t border-border text-sm text-muted-foreground">
        <span>© {year} Croqly</span>
        <span className="inline-flex items-center gap-2">
          Fait avec <Heart className="w-4 h-4 text-primary animate-pulse" /> par Matthieu Jungfer
        </span>
      </div>
    </footer>
  );
};

export default Footer;
