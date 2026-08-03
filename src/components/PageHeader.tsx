import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import ScallopDivider from '@/components/ScallopDivider';
import { useHero } from '@/hooks/use-hero';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

// A flat-color stand-in for ParallaxHero on pages with no photo to anchor
// one — same crunch band + scallop-divider transition, just without an
// image behind it. Keep this a single fixed color (not one that rotates
// per page) so it reads as a layout convention rather than decoration.
const PageHeader = ({ icon: Icon, title, subtitle }: PageHeaderProps) => {
  // Header reads this to switch its logo/text to the light (white) variant —
  // without it, Header assumes a plain paper background and stays dark,
  // unreadable against this band's crunch red (see ParallaxHero, which sets
  // the same flag for photo heroes).
  const { setHasHero } = useHero();
  useEffect(() => {
    setHasHero(true);
    return () => setHasHero(false);
  }, [setHasHero]);

  return (
    <div className="relative w-full bg-gradient-to-br from-primary to-crunch-deep pt-28 pb-10 px-4">
      <div className="container mx-auto flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center text-primary-foreground">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-primary-foreground mb-2">{title}</h1>
          {subtitle && <p className="text-primary-foreground/85">{subtitle}</p>}
        </div>
      </div>
      <ScallopDivider className="absolute bottom-0 left-0 right-0 text-background" />
    </div>
  );
};

export default PageHeader;
