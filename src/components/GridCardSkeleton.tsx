import { Skeleton } from "@/components/ui/skeleton";

// Facebook-style placeholder card shown while a grid's data is (re)loading,
// e.g. right after switching bandes or a filter — mirrors the real card
// shape so the layout doesn't jump once data arrives. `imageHeight` (a fixed
// height class like "h-48") and `aspectRatio` (a Tailwind aspect class like
// "aspect-[4/3]") are mutually exclusive — pass whichever the real card uses.
const GridCardSkeleton = ({
  imageHeight = "h-48",
  aspectRatio,
  wrapperClassName = "rounded-xl bg-card/70 backdrop-blur-sm shadow-lg border border-border",
  showContent = true,
}: {
  imageHeight?: string;
  aspectRatio?: string;
  wrapperClassName?: string;
  showContent?: boolean;
}) => (
  <div className={`overflow-hidden ${wrapperClassName}`}>
    <Skeleton className={`${aspectRatio ?? imageHeight} w-full rounded-none`} />
    {showContent && (
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    )}
  </div>
);

export default GridCardSkeleton;
