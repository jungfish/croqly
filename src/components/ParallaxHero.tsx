import { useEffect, useState } from 'react';
import { useHero } from '@/hooks/use-hero';

interface ParallaxHeroProps {
  imageUrl: string;
  title: string;
  children?: React.ReactNode;
  height?: string;
  overlay?: boolean;
}

const ParallaxHero = ({
  imageUrl,
  title,
  children,
  height = "h-[220px] sm:h-[280px] lg:h-[360px]",
  overlay = true
}: ParallaxHeroProps) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const { setHasHero } = useHero();

  useEffect(() => {
    setHasHero(true);
    return () => setHasHero(false);
  }, [setHasHero]);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrollPosition(window.scrollY);
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`relative w-full ${height} mb-16 overflow-hidden`}>
      <div className="absolute inset-0 w-full h-[120%] -top-10">
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          className="w-full h-full object-cover"
          style={{
            transform: `translateY(${scrollPosition * 0.5}px)`,
            willChange: 'transform'
          }}
        />
      </div>
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/70" />
      )}
      <div className="relative z-10 h-full flex flex-col justify-end items-center pb-12">
        <div className="bg-white/10 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/20">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-center w-full max-w-4xl">
            {title}
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
};

export default ParallaxHero; 