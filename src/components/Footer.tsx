import { Heart, Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] px-4 border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Fait avec</span>
        <Heart className="w-4 h-4 text-primary animate-pulse" />
        <span>par Matthieu Jungfer</span>
        <a 
          href="https://github.com/jungfish/croqly"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-foreground/70 hover:text-foreground transition-colors ml-2"
        >
          <Github className="w-4 h-4" />
          <span>GitHub</span>
        </a>
      </div>
    </footer>
  );
};

export default Footer; 