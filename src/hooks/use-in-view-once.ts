import { useEffect, useRef, useState } from "react";

// Fires once (and only once) the observed element first scrolls into the
// viewport — used to replay Laser Croq's reaction burst "when the card is
// seen" rather than immediately on mount, so scrolling through the feed
// feels like each dressage reveals itself as you reach it.
export function useInViewOnce<T extends HTMLElement>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView]);

  return [ref, inView];
}
