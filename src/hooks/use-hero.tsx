import { createContext, useContext, useState, ReactNode } from 'react';

interface HeroContextValue {
  hasHero: boolean;
  setHasHero: (value: boolean) => void;
}

const HeroContext = createContext<HeroContextValue | undefined>(undefined);

// Whether a ParallaxHero is currently mounted anywhere on the page — Header
// reads this to decide its light/dark styling instead of guessing from the
// route. A route-based guess is wrong whenever the hero is conditional on
// data (e.g. a recipe with no illustration yet), leaving white nav text over
// a plain background.
export function HeroProvider({ children }: { children: ReactNode }) {
  const [hasHero, setHasHero] = useState(false);
  return <HeroContext.Provider value={{ hasHero, setHasHero }}>{children}</HeroContext.Provider>;
}

export function useHero() {
  const context = useContext(HeroContext);
  if (!context) throw new Error('useHero must be used within a HeroProvider');
  return context;
}
