import { useId } from 'react';

interface ScallopDividerProps {
  className?: string;
}

// The brand's "ruban croqué" motif (see docs/design-system.md) — the same
// bite silhouette as the Croqly mark, repeated as a border rather than a
// full texture. `currentColor` is meant to be set to whatever surface sits
// below/behind, so the scallops read as bites taken out of what's above.
const ScallopDivider = ({ className = '' }: ScallopDividerProps) => {
  const patternId = useId();

  return (
    <svg aria-hidden="true" className={`block w-full ${className}`} height="16">
      <pattern id={patternId} width="28" height="16" patternUnits="userSpaceOnUse">
        <circle cx="14" cy="16" r="14" fill="currentColor" />
      </pattern>
      <rect width="100%" height="16" fill={`url(#${patternId})`} />
    </svg>
  );
};

export default ScallopDivider;
