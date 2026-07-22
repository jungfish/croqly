import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-display font-semibold text-foreground mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Oups, cette page n'est pas au menu.</p>
        <a href="/" className="text-primary hover:text-primary/80 underline underline-offset-4">
          Retourner à l'accueil
        </a>
      </div>
    </div>
  );
};

export default NotFound;
