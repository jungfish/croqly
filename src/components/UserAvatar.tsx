import { avatarSrc } from '@/lib/avatars';

// Renders one of the 11 curated kitchen-character avatars, or a plain
// initial-letter circle for accounts that haven't picked one yet (e.g. a
// stale cache, or a request that raced the lazy self-heal in
// GET /api/profile/me) — same fallback shape as Creator's plain <img>
// elsewhere, so it never leaves a broken image icon in the UI.
const UserAvatar = ({
  avatarKey,
  pseudo,
  className = 'w-8 h-8',
}: {
  avatarKey: string | null | undefined;
  pseudo?: string | null;
  className?: string;
}) => {
  if (!avatarKey) {
    return (
      <div
        className={`${className} rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-semibold shrink-0`}
        aria-hidden="true"
      >
        {pseudo?.trim()?.[0]?.toUpperCase() ?? '?'}
      </div>
    );
  }
  return (
    <img
      src={avatarSrc(avatarKey)}
      alt={pseudo ? `Avatar de ${pseudo}` : 'Avatar'}
      className={`${className} rounded-full object-cover shrink-0 bg-muted shadow-sm`}
    />
  );
};

export default UserAvatar;
