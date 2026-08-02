import { Skeleton } from "@/components/ui/skeleton";

// Facebook-style placeholder card shown while a grid's data is (re)loading,
// e.g. right after switching bandes — mirrors the real card shape
// (rounded-xl, bg-card/70, border) so the layout doesn't jump once data arrives.
const GridCardSkeleton = ({ imageHeight = "h-48" }: { imageHeight?: string }) => (
  <div className="overflow-hidden rounded-xl bg-card/70 backdrop-blur-sm shadow-lg border border-border">
    <Skeleton className={`${imageHeight} w-full rounded-none`} />
    <div className="p-4 space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

export default GridCardSkeleton;
