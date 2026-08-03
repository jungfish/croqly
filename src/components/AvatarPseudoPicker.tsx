import { Check } from 'lucide-react';
import { AVATAR_OPTIONS, type AvatarKey, avatarSrc } from '@/lib/avatars';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// The pseudo + avatar step shown right after account creation (Signup.tsx)
// — also reusable for a future "modifier mon profil" settings page, since
// nothing here is signup-specific.
const AvatarPseudoPicker = ({
  pseudo,
  onPseudoChange,
  avatarKey,
  onAvatarKeyChange,
}: {
  pseudo: string;
  onPseudoChange: (value: string) => void;
  avatarKey: AvatarKey | null;
  onAvatarKeyChange: (key: AvatarKey) => void;
}) => {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="pseudo">Pseudo</Label>
        <Input
          id="pseudo"
          type="text"
          required
          maxLength={24}
          value={pseudo}
          onChange={(e) => onPseudoChange(e.target.value)}
          placeholder="Ex. CroqMonster"
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label>Choisis ton avatar</Label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {AVATAR_OPTIONS.map((option) => {
            const selected = option.key === avatarKey;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onAvatarKeyChange(option.key)}
                title={option.name}
                aria-label={option.name}
                aria-pressed={selected}
                className="relative flex flex-col items-center gap-1 group"
              >
                <span
                  className={`relative w-full aspect-square rounded-full overflow-hidden border-2 shadow-sm transition-colors ${
                    selected ? 'border-primary ring-2 ring-primary/30' : 'border-border group-hover:border-primary/50'
                  }`}
                >
                  <img src={avatarSrc(option.key)} alt="" className="w-full h-full object-cover" />
                  {selected && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        {avatarKey && (
          <p className="text-xs text-muted-foreground">
            {AVATAR_OPTIONS.find((o) => o.key === avatarKey)?.name} — {AVATAR_OPTIONS.find((o) => o.key === avatarKey)?.role}
          </p>
        )}
      </div>
    </div>
  );
};

export default AvatarPseudoPicker;
